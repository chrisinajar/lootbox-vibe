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
            const stackId = `${itemId}_${rarity}_v${configVersion}`;
            const cur = rolls.get(stackId) ?? { count: 0, itemId, rarity };
            cur.count += 1;
            rolls.set(stackId, cur);
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
    let nextBal = keysBal - totalCost + BigInt(bonusKeys);

    // stack ops
    const stackAdjs = Array.from(rolls.values()).map((r) => ({
      uid,
      stackId: `${r.itemId}_${r.rarity}_v${configVersion}`,
      rarity: r.rarity,
      typeId: r.itemId,
      delta: r.count,
      source: input.boxId,
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
      nextBal = nextBal + rewardKeys;
    }
    // finally persist keys balance once
    ops.push({ type: 'put', key: curKey, value: u64.encodeBE(nextBal) });

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
    };
    const persistable = {
      stacks: result.stacks,
      currencies: result.currencies.map((c) => ({ ...c, amount: String(c.amount) })),
      unlocks: result.unlocks,
    };
    ops.push({ type: 'put', key: reqKey, value: JSON.stringify(persistable) });

    await this.storage.batch(ops);
    return result;
  }
}
