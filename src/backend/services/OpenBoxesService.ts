import { StorageProvider } from '../storage/StorageProvider';
import { ConfigLoader } from '../config';
import { keys } from '../storage/keys';
import { u64 } from '../storage/codec';
import { Rng, DefaultRng } from './Rng';
import { UnlockService } from './UnlockService';
import { prepareStackOps } from './txnHelpers';

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
    if (input.count > 1000) throw new Error('batch too large: max 1000');

    // basic unlock validation and key cost
    const box = (this.config.boxes as any[]).find((b) => b.id === input.boxId);
    if (!box) throw new Error('unknown box');
    const keyCost: number = typeof (box as any).keyCost === 'number' ? (box as any).keyCost : 1;
    // balance check
    const curKey = keys.cur(uid, 'KEYS');
    const keysBal = u64.decodeBE(await this.storage.get(curKey));
    const totalCost = BigInt(keyCost) * BigInt(input.count);
    if (keysBal < totalCost) throw new Error('insufficient KEYS');
    const entries = (box.entries as any[]).map((e) => ({
      itemId: String(e.itemId),
      weight: Number(e.weight),
    }));

    const rolls = new Map<string, { count: number; itemId: string; rarity: string }>();
    for (let i = 0; i < input.count; i++) {
      const pick = this.chooseWeighted(entries);
      const itemId = pick.itemId;
      const rarity = 'COMMON';
      const stackId = `${itemId}_${rarity}_base`;
      const cur = rolls.get(stackId) ?? { count: 0, itemId, rarity };
      cur.count += 1;
      rolls.set(stackId, cur);
    }

    const ops: any[] = [];
    // KEYS cost and Lucky dynamic bonus
    const lifetimeKey = `pstat:${uid}.lifetimeBoxesOpened`;
    const prevOpens = u64.decodeBE(await this.storage.get(lifetimeKey));
    const luckySteps = Number(prevOpens / 1000n); // floor steps of 1000 opens
    const luckyChance = Math.min(luckySteps * 0.001, 0.05); // +0.1% per 1000, cap 5%
    let bonusKeys = 0;
    for (let i = 0; i < input.count; i++) {
      if (this.rng.next() < luckyChance) bonusKeys += 1;
    }
    const nextBal = keysBal - totalCost + BigInt(bonusKeys);
    ops.push({ type: 'put', key: curKey, value: u64.encodeBE(nextBal) });

    // stack ops
    const stackAdjs = Array.from(rolls.values()).map((r) => ({
      uid,
      stackId: `${r.itemId}_${r.rarity}_base`,
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
