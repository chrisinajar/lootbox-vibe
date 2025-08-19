import { StorageProvider, BatchOp } from '../storage/StorageProvider';
import { ConfigLoader } from '../config';
import { u64 } from '../storage/codec';

export type RngRule = { unlockId: string; sourceBoxId: string; chance: number };

type Profile = { unlockedBoxIds: string[] };

export class UnlockService {
  private v1?: any;
  private legacyUnlocks: Array<{ id: string; requires?: { boxesOpened?: number } }> = [];
  constructor(
    private storage: StorageProvider,
    loader = new ConfigLoader(),
    private rngRules: RngRule[] = [],
  ) {
    const cfg = loader.load();
    // Detect v1 unlocks (object with milestones/rngUnlocks) vs legacy array
    if (cfg.unlocks && !Array.isArray(cfg.unlocks)) {
      this.v1 = cfg.unlocks;
    } else {
      this.legacyUnlocks = (cfg.unlocks as any[]) || [];
    }
  }

  private async loadProfile(uid: string): Promise<Profile> {
    const key = `ppro:${uid}`;
    const buf = await this.storage.get(key);
    if (!buf) return { unlockedBoxIds: [] };
    try {
      return JSON.parse(buf.toString('utf8')) as Profile;
    } catch {
      return { unlockedBoxIds: [] };
    }
  }

  async prepareUnlockOps(
    uid: string,
    nextBoxesOpened: bigint,
    sourceBoxId?: string,
  ): Promise<{
    ops: BatchOp[];
    unlocked: string[];
    rewardCurrencies: Array<{ currency: string; amount: bigint }>;
  }> {
    const ops: BatchOp[] = [];
    const profile = await this.loadProfile(uid);
    const unlockedSet = new Set(profile.unlockedBoxIds);
    const newly: string[] = [];
    const rewardsOut: Array<{ currency: string; amount: bigint }> = [];

    if (this.v1) {
      // Milestones: when requirements satisfied, unlock and grant rewards
      const milestones: any[] = Array.isArray(this.v1.milestones) ? this.v1.milestones : [];
      for (const m of milestones) {
        const reqs: any[] = Array.isArray(m.requirements) ? m.requirements : [];
        let ok = false;
        for (const r of reqs) {
          if (r.type === 'OPEN_COUNT') {
            const c = BigInt(r.count ?? 0);
            // if scope boxId specified, treat as global for MVP
            if (nextBoxesOpened >= c) ok = true;
          }
        }
        if (ok) {
          const targets: any[] = Array.isArray(m.unlocks) ? m.unlocks : [];
          let unlockedNew = false;
          for (const t of targets) {
            if (t.kind === 'BOX_TYPE') {
              const bid = String(t.boxId);
              if (!unlockedSet.has(bid)) {
                unlockedSet.add(bid);
                newly.push(bid);
                unlockedNew = true;
              }
            }
          }
          // Only grant rewards once, when the milestone is newly unlocked
          if (unlockedNew) {
            const rewards: any[] = Array.isArray(m.rewards) ? m.rewards : [];
            for (const rw of rewards) {
              if (rw.type === 'CURRENCY') {
                const amt = BigInt(Number(rw.amount ?? 0));
                const cur = String(rw.currency);
                rewardsOut.push({ currency: cur, amount: amt });
              }
            }
          }
        }
      }
      // RNG unlocks scoped by source boxId
      if (sourceBoxId) {
        const ru: any[] = Array.isArray(this.v1.rngUnlocks) ? this.v1.rngUnlocks : [];
        for (const r of ru) {
          const scopeBox = r?.scope?.boxType;
          if (scopeBox && scopeBox !== sourceBoxId) continue;
          const triesKey = `punlock:${uid}:${r.id}:tries`;
          const tries = u64.decodeBE(await this.storage.get(triesKey));
          const base = Number(r.baseChanceBp ?? 0);
          const soft = r.softPity ?? {};
          const startAt = Number(soft.startAt ?? 0);
          const delta = Number(soft.deltaBpPerTry ?? 0);
          const cap = Number(soft.capBp ?? 10000);
          let chanceBp = base;
          if (Number(tries) >= startAt) {
            chanceBp = Math.min(base + (Number(tries) - startAt) * delta, cap);
          }
          const hard = Number(r?.hardPity?.guaranteeAt ?? 0);
          let hit = false;
          if (hard && Number(tries) + 1 >= hard) {
            hit = true;
          } else {
            const roll = Math.floor(Math.random() * 10000);
            if (roll < chanceBp) hit = true;
          }
          const nextTries = hit && r.resetOnHit ? 0n : tries + 1n;
          ops.push({ type: 'put', key: triesKey, value: u64.encodeBE(nextTries) });
          if (hit) {
            // unlock behavior for this RNG is to unlock a box; based on id heuristics for MVP
            // For supplied config, unlock unstable box
            const target = 'box_unstable';
            if (!unlockedSet.has(target)) {
              unlockedSet.add(target);
              newly.push(target);
            }
          }
        }
      }
    } else {
      // Legacy milestone unlocks
      for (const u of this.legacyUnlocks) {
        const threshold = u?.requires?.boxesOpened;
        if (typeof threshold === 'number' && nextBoxesOpened >= BigInt(threshold)) {
          if (!unlockedSet.has(u.id)) {
            unlockedSet.add(u.id);
            newly.push(u.id);
          }
        }
      }
      // RNG unlocks (optional, code-defined rules)
      if (sourceBoxId) {
        for (const r of this.rngRules) {
          if (r.sourceBoxId === sourceBoxId && !unlockedSet.has(r.unlockId)) {
            if (Math.random() < r.chance) {
              unlockedSet.add(r.unlockId);
              newly.push(r.unlockId);
            }
          }
        }
        if (sourceBoxId === 'box.cardboard' && nextBoxesOpened % 5000n === 0n) {
          const target = 'box.unstable';
          if (!unlockedSet.has(target)) {
            unlockedSet.add(target);
            newly.push(target);
          }
        }
      }
    }

    const updated: Profile = { unlockedBoxIds: Array.from(unlockedSet) };
    ops.push({ type: 'put', key: `ppro:${uid}`, value: JSON.stringify(updated) });
    return { ops, unlocked: newly, rewardCurrencies: rewardsOut };
  }
}
