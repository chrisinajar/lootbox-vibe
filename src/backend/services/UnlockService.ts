import { StorageProvider, BatchOp } from '../storage/StorageProvider';
import { ConfigLoader } from '../config';

export type RngRule = { unlockId: string; sourceBoxId: string; chance: number };

type Profile = { unlockedBoxIds: string[] };

export class UnlockService {
  private unlocks: Array<{ id: string; requires?: { boxesOpened?: number } }> = [];
  constructor(
    private storage: StorageProvider,
    loader = new ConfigLoader(),
    private rngRules: RngRule[] = [],
  ) {
    const cfg = loader.load();
    this.unlocks = (cfg.unlocks as any[]) || [];
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
  ): Promise<{ ops: BatchOp[]; unlocked: string[] }> {
    const ops: BatchOp[] = [];
    const profile = await this.loadProfile(uid);
    const unlockedSet = new Set(profile.unlockedBoxIds);
    const newly: string[] = [];

    // Milestone unlocks
    for (const u of this.unlocks) {
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
      // soft pity: Unstable from Cardboard on 5000-step boundaries if not unlocked
      if (sourceBoxId === 'box.cardboard' && nextBoxesOpened % 5000n === 0n) {
        const target = 'box.unstable';
        if (!unlockedSet.has(target)) {
          unlockedSet.add(target);
          newly.push(target);
        }
      }
    }

    const updated: Profile = { unlockedBoxIds: Array.from(unlockedSet) };
    ops.push({ type: 'put', key: `ppro:${uid}`, value: JSON.stringify(updated) });
    return { ops, unlocked: newly };
  }
}
