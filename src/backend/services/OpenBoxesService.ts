import { ConfigLoader } from '../config';
import { u64 } from '../storage/codec';
import { keys } from '../storage/keys';
import { StorageProvider } from '../storage/StorageProvider';

import { Rng, DefaultRng } from './Rng';
import { prepareStackOps } from './txnHelpers';
import { UnlockService } from './UnlockService';

export type OpenBoxesInput = { boxId: string; count: number; requestId: string };

export class OpenBoxesService {
  private config: ReturnType<ConfigLoader['load']>;
  constructor(
    private storage: StorageProvider,
    loader = new ConfigLoader(),
    private rng: Rng = new DefaultRng(),
    private unlocks = new UnlockService(storage, new ConfigLoader()),
  ) {
    this.config = loader.load();
  }

  private chooseWeighted<T extends { weight: number }>(items: T[]): T {
    const total = items.reduce((a, it) => a + it.weight, 0);
    let r = this.rng.next() * total;
    for (const it of items) {
      r -= it.weight;
      if (r <= 0) return it;
    }
    return items[items.length - 1]!;
  }

  private randint(min: number | { min: number; max: number } | undefined, max?: number): number {
    if (typeof min === 'object' && min !== null) {
      const lo = Math.floor(min.min);
      const hi = Math.floor(min.max);
      return lo + Math.floor(this.rng.next() * (hi - lo + 1));
    }
    if (typeof min === 'number' && typeof max === 'number') {
      return Math.floor(min + this.rng.next() * (max - min + 1));
    }
    if (typeof min === 'number') return Math.floor(min);
    return 0;
  }

  async open(uid: string, input: OpenBoxesInput) {
    const reqKey = `req:${uid}:${input.requestId}`;
    const existing = await this.storage.get(reqKey);
    if (existing) {
      const parsed = JSON.parse(existing.toString('utf8'));
      if (Array.isArray(parsed.currencies)) {
        parsed.currencies = parsed.currencies.map((c: any) => ({ ...c, amount: BigInt(c.amount) }));
      }
      return parsed;
    }

    if (input.count <= 0) throw new Error('count must be > 0');
    // batch cap can come from economy config
    const maxPer = (this.config.economy as any)?.batchOpenLimits?.maxPerRequest ?? 1000;
    if (input.count > Number(maxPer)) throw new Error(`batch too large: max ${maxPer}`);

    // Enforce shop-gated bulk sizes (default: 1 always allowed)
    let allowedMax = 1;
    const has10 = await this.storage.get(`pupg:${uid}:upg_bulk_10`);
    const has100 = await this.storage.get(`pupg:${uid}:upg_bulk_100`);
    const has1000 = await this.storage.get(`pupg:${uid}:upg_bulk_1000`);
    if (has10) allowedMax = 10;
    if (has100) allowedMax = 100;
    if (has1000) allowedMax = 1000;
    if (input.count > allowedMax) {
      throw new Error('bulk open locked: purchase upgrade in shop');
    }

    // basic unlock validation and key cost
    const box = (this.config.boxes as any[]).find((b) => String((b as any).id) === input.boxId);
    if (!box) throw new Error('unknown box');
    // prefer economy boxCosts override
    const boxCosts = ((this.config.economy as any)?.boxCosts ?? {}) as Record<string, number>;
    const keyCost: number =
      typeof boxCosts[input.boxId] === 'number'
        ? Number(boxCosts[input.boxId])
        : typeof (box as any).keyCost === 'number'
          ? Number((box as any).keyCost)
          : 1;
    // balance check
    const curKey = keys.cur(uid, 'KEYS');
    const keysBal = u64.decodeBE(await this.storage.get(curKey));
    const totalCost = BigInt(keyCost) * BigInt(input.count);
    if (keysBal < totalCost) throw new Error('insufficient KEYS');
    const forbidSelf = Boolean((box as any).forbidSelfDrop);
    const selfCap =
      typeof (box as any).selfDropCap === 'number'
        ? Math.max(0, Number((box as any).selfDropCap))
        : undefined;

    type StackRoll = { count: number; itemId: string; rarity: string };
    const rolls = new Map<string, StackRoll>();
    const currencies = new Map<string, bigint>();
    let selfCount = 0;
    const configVersion = Number(this.config.configVersion ?? 1);
    // Pre-compute cosmetic eligibility and per-item chance to ensure ≥1% combined chance per box
    const modsStatic: any[] = Array.isArray((this.config as any)?.modifiers?.static)
      ? ((this.config as any).modifiers!.static as any[])
      : [];
    const cosmeticModIds = new Set<string>(
      modsStatic.filter((m: any) => m?.category === 'COSMETIC').map((m: any) => String(m.id)),
    );
    const modNameById = new Map<string, string>(
      modsStatic.map((m: any) => [String(m.id), String(m.name ?? m.id)] as const),
    );
    const itemsCatalog: any[] = Array.isArray((this.config as any)?.items)
      ? ((this.config as any).items as any[])
      : [];
    const allowedModsByItem = new Map<string, Set<string>>();
    for (const it of itemsCatalog) {
      const allow: string[] = Array.isArray((it as any).allowedStaticMods)
        ? ((it as any).allowedStaticMods as string[])
        : [];
      allowedModsByItem.set(String((it as any).id), new Set(allow.map(String)));
    }

    const cosmetics: Array<{ typeId: string; modId: string; modName: string }> = [];
    // Track curated tags per stackId (may include tag in stackId)
    const tagsByStack = new Map<string, Set<string>>();

    const toCuratedTag = (modId: string): string | undefined => {
      switch (modId) {
        case 'm_shiny':
          return 'shiny';
        case 'm_rainbow_text':
          return 'rainbow_text';
        case 'm_confetti_burst':
          return 'confetti_burst';
        case 'm_glitter_border':
          return 'glitter_border';
        case 'm_meme_text':
          return 'meme_text';
        case 'm_annoying_popup':
          return 'annoying_popup';
        case 'm_screams':
          return 'screams';
        case 'm_useless':
          return 'useless';
        default:
          return undefined;
      }
    };

    // Compute eligible item-pick probability for this box
    const dropTable = (box as any).dropTable as any;
    let eligibleWeight = 0;
    let totalWeight = 0;
    if (dropTable && Array.isArray(dropTable.entries)) {
      for (const e of dropTable.entries) {
        const w = Number((e as any).weight ?? 0) || 0;
        totalWeight += w;
        if ((e as any).type === 'ITEM') {
          const itemId = String((e as any).itemId);
          const pool: string[] = Array.isArray((e as any).staticModsPool)
            ? ((e as any).staticModsPool as string[])
            : [];
          const allow = allowedModsByItem.get(itemId) ?? new Set<string>();
          const eligible = pool.map(String).filter((id) => cosmeticModIds.has(id) && allow.has(id));
          if (eligible.length > 0) eligibleWeight += w;
        }
      }
    }
    const eligibleProb = totalWeight > 0 ? eligibleWeight / totalWeight : 0;
    // choose per-item cosmetic application chance so that eligibleProb * p >= 1%
    const perItemCosmeticChance = eligibleProb > 0 ? Math.min(0.1, 0.01 / eligibleProb) : 0; // cap at 10%

    const performRoll = () => {
      // v1 drop table
      const dt = (box as any).dropTable as any;
      if (dt && Array.isArray(dt.entries)) {
        let pick: any = this.chooseWeighted(
          dt.entries.map((e: any) => ({ ...e, weight: Number(e.weight) })),
        );
        // self-drop filter for BOX type
        if (pick.type === 'BOX' && pick.boxId === (box as any).id) {
          if (forbidSelf) {
            for (let k = 0; k < 5 && pick.boxId === (box as any).id; k++) {
              const alt = dt.entries.filter(
                (e: any) => !(e.type === 'BOX' && e.boxId === (box as any).id),
              );
              pick = this.chooseWeighted(alt as any);
            }
            if (pick.type === 'BOX' && pick.boxId === (box as any).id) return; // skip
          } else if (typeof selfCap === 'number') {
            if (selfCount >= selfCap) {
              for (let k = 0; k < 5 && pick.boxId === (box as any).id; k++) {
                const alt = dt.entries.filter(
                  (e: any) => !(e.type === 'BOX' && e.boxId === (box as any).id),
                );
                pick = this.chooseWeighted(alt as any);
              }
              if (pick.type === 'BOX' && pick.boxId === (box as any).id) return;
            } else {
              selfCount += 1;
            }
          }
        }
        switch (pick.type) {
          case 'ITEM': {
            const itemId = String(pick.itemId);
            const rarity = String(pick.rarity ?? 'COMMON');
            // Cosmetic roll: intersect pool ∩ item.allowedStaticMods ∩ COSMETIC
            let appliedTag: string | undefined;
            try {
              const pool: string[] = Array.isArray(pick.staticModsPool)
                ? (pick.staticModsPool as string[])
                : [];
              const allow = allowedModsByItem.get(itemId) ?? new Set<string>();
              const eligible = pool
                .map(String)
                .filter((id) => cosmeticModIds.has(id) && allow.has(id));
              if (eligible.length > 0 && this.rng.next() < perItemCosmeticChance) {
                // pick one eligible cosmetic uniformly
                const idx = Math.floor(this.rng.next() * eligible.length);
                const modId = eligible[Math.max(0, Math.min(idx, eligible.length - 1))]!;
                const modName = modNameById.get(modId) ?? modId;
                cosmetics.push({ typeId: itemId, modId, modName });
                // Capture curated tag for this stack for inventory filtering
                const tag = toCuratedTag(modId);
                if (tag) appliedTag = tag;
              }
            } catch {
              /* cosmetic roll best-effort */
            }
            // Choose stackId including tag signature if present
            const stackId =
              appliedTag && appliedTag.length > 0
                ? `${itemId}_${rarity}_t:${appliedTag}_v${configVersion}`
                : `${itemId}_${rarity}_v${configVersion}`;
            const cur = rolls.get(stackId) ?? { count: 0, itemId, rarity };
            cur.count += 1;
            rolls.set(stackId, cur);
            if (appliedTag) {
              const set = tagsByStack.get(stackId) ?? new Set<string>();
              set.add(appliedTag);
              tagsByStack.set(stackId, set);
            }
            break;
          }
          case 'CURRENCY': {
            const cur = String(pick.currency);
            const amt = this.randint(pick.amount);
            currencies.set(cur, (currencies.get(cur) ?? 0n) + BigInt(amt));
            break;
          }
          case 'BOX': {
            const itemId = String(pick.boxId);
            const rarity = 'COMMON';
            const count = this.randint(pick.count ?? 1);
            const stackId = `${itemId}_${rarity}_v${configVersion}`;
            const cur = rolls.get(stackId) ?? { count: 0, itemId, rarity };
            cur.count += count;
            rolls.set(stackId, cur);
            break;
          }
          case 'MATERIAL': {
            const itemId = String(pick.materialId);
            const rarity = 'COMMON';
            const amt = this.randint(pick.amount ?? 1);
            const stackId = `${itemId}_${rarity}_v${configVersion}`;
            const cur = rolls.get(stackId) ?? { count: 0, itemId, rarity };
            cur.count += amt;
            rolls.set(stackId, cur);
            break;
          }
        }
        return;
      }
      // legacy entries: treat as simple itemId
      const entries = (box as any).entries as any[];
      if (Array.isArray(entries)) {
        let pick = this.chooseWeighted(
          entries.map((e) => ({ itemId: String(e.itemId), weight: Number(e.weight) })),
        );
        if (pick.itemId === (box as any).id) {
          if (forbidSelf) {
            for (let k = 0; k < 5 && pick.itemId === (box as any).id; k++)
              pick = this.chooseWeighted(entries.filter((e) => e.itemId !== (box as any).id));
            if (pick.itemId === (box as any).id) return;
          } else if (typeof selfCap === 'number') {
            if (selfCount >= selfCap) {
              for (let k = 0; k < 5 && pick.itemId === (box as any).id; k++)
                pick = this.chooseWeighted(entries.filter((e) => e.itemId !== (box as any).id));
              if (pick.itemId === (box as any).id) return;
            } else {
              selfCount += 1;
            }
          }
        }
        const itemId = pick.itemId;
        const rarity = 'COMMON';
        const stackId = `${itemId}_${rarity}_v${configVersion}`;
        const cur = rolls.get(stackId) ?? { count: 0, itemId, rarity };
        cur.count += 1;
        rolls.set(stackId, cur);
      }
    };

    for (let i = 0; i < input.count; i++) performRoll();

    const ops: any[] = [];
    // KEYS cost and Lucky dynamic bonus (max 1 per request)
    const lifetimeKey = `pstat:${uid}.lifetimeBoxesOpened`;
    const prevOpens = u64.decodeBE(await this.storage.get(lifetimeKey));
    const luckySteps = Math.floor(Number(prevOpens) / 1000); // per 1000
    const luckyChance = Math.min(luckySteps * 0.001, 0.05);
    const bonusKeys = this.rng.next() < luckyChance ? 1 : 0;
    // Track per-currency deltas to persist in one pass
    const curDelta = new Map<string, bigint>();
    // start with KEYS: cost + lucky bonus
    curDelta.set('KEYS', (curDelta.get('KEYS') ?? 0n) - totalCost + BigInt(bonusKeys));

    // stack ops (preserve exact stackId, including tag signature if present)
    const stackAdjs = Array.from(rolls.entries()).map(([stackId, r]) => ({
      uid,
      stackId,
      rarity: r.rarity,
      typeId: r.itemId,
      delta: r.count,
      source: input.boxId,
      // Pass through any curated tags we observed for this stack in this request
      tags: Array.from(tagsByStack.get(stackId) ?? []),
    }));
    ops.push(...(await prepareStackOps(this.storage, stackAdjs)));

    // pstat increment
    const statKey = lifetimeKey;
    const nextOpened = prevOpens + BigInt(input.count);
    ops.push({ type: 'put', key: statKey, value: u64.encodeBE(nextOpened) });

    // unlocks: milestone + rng
    const unlock = await this.unlocks.prepareUnlockOps(uid, nextOpened, input.boxId);
    ops.push(...unlock.ops);
    // apply any milestone reward currencies (e.g., KEYS) once here to avoid overwrites
    const rewardKeys = unlock.rewardCurrencies
      .filter((r) => r.currency === 'KEYS')
      .reduce((a, r) => a + r.amount, 0n);
    if (rewardKeys !== 0n) {
      curDelta.set('KEYS', (curDelta.get('KEYS') ?? 0n) + rewardKeys);
    }

    // fold in any currency drops from rolls (including KEYS if present)
    for (const [c, amt] of currencies.entries()) {
      curDelta.set(c, (curDelta.get(c) ?? 0n) + amt);
    }

    // persist currency balances atomically in this batch
    for (const [c, delta] of curDelta.entries()) {
      if (delta === 0n) continue;
      const k = keys.cur(uid, c);
      const cur = u64.decodeBE(await this.storage.get(k));
      const next = cur + delta;
      if (next < 0n) throw new Error(`currency underflow: ${c}`);
      ops.push({ type: 'put', key: k, value: u64.encodeBE(next) });
    }

    const result = {
      stacks: Array.from(rolls.entries()).map(([stackId, r]) => ({
        stackId,
        typeId: r.itemId,
        rarity: r.rarity,
        count: r.count,
      })),
      currencies: [
        { currency: 'KEYS', amount: -totalCost },
        ...(bonusKeys > 0 ? [{ currency: 'KEYS', amount: BigInt(bonusKeys) }] : []),
        ...(rewardKeys > 0n ? [{ currency: 'KEYS', amount: rewardKeys }] : []),
        ...Array.from(currencies.entries()).map(([c, amt]) => ({ currency: c, amount: amt })),
      ],
      unlocks: unlock.unlocked,
      cosmetics,
    };
    const persistable = {
      stacks: result.stacks,
      currencies: result.currencies.map((c) => ({ ...c, amount: String(c.amount) })),
      unlocks: result.unlocks,
      cosmetics: result.cosmetics,
    };
    ops.push({ type: 'put', key: reqKey, value: JSON.stringify(persistable) });

    await this.storage.batch(ops);
    return result;
  }
}
