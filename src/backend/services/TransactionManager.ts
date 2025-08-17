import { StorageProvider, BatchOp } from '../storage/StorageProvider';
import { u32, u64 } from '../storage/codec';
import { keys } from '../storage/keys';

export class UnderflowError extends Error {}

export type StackAdjust = { uid: string; stackId: string; rarity: string; typeId: string; delta: number };
export type CurrencyAdjust = { uid: string; currency: string; delta: bigint };

export class TransactionManager {
  constructor(private storage: StorageProvider) {}

  async adjustCurrencies(adjs: CurrencyAdjust[]): Promise<void> {
    const ops: BatchOp[] = [];
    for (const a of adjs) {
      const key = keys.cur(a.uid, a.currency);
      const cur = u64.decodeBE(await this.storage.get(key));
      const next = cur + a.delta;
      if (next < 0n) throw new UnderflowError(`currency underflow: ${a.currency}`);
      ops.push({ type: 'put', key, value: u64.encodeBE(next) });
    }
    await this.storage.batch(ops);
  }

  async adjustStacks(adjs: StackAdjust[]): Promise<void> {
    if (adjs.length === 0) return;
    const ops: BatchOp[] = [];
    // Maintain maps for sum deltas
    const rarityDelta = new Map<string, bigint>();
    const typeDelta = new Map<string, bigint>();

    for (const a of adjs) {
      const invKey = keys.inv(a.uid, a.stackId);
      const prev = BigInt(u32.decodeBE(await this.storage.get(invKey)));
      const next = prev + BigInt(a.delta);
      if (next < 0n) throw new UnderflowError(`inventory underflow: ${a.stackId}`);

      // inv count
      ops.push({ type: 'put', key: invKey, value: u32.encodeBE(Number(next)) });

      // idx maintenance
      const idxRKey = keys.idxRarity(a.uid, a.rarity, a.stackId);
      const idxTKey = keys.idxType(a.uid, a.typeId, a.stackId);
      if (prev === 0n && next > 0n) {
        ops.push({ type: 'put', key: idxRKey, value: '1' });
        ops.push({ type: 'put', key: idxTKey, value: '1' });
      } else if (prev > 0n && next === 0n) {
        ops.push({ type: 'del', key: idxRKey });
        ops.push({ type: 'del', key: idxTKey });
      }

      // sum deltas
      rarityDelta.set(a.rarity, (rarityDelta.get(a.rarity) ?? 0n) + BigInt(a.delta));
      typeDelta.set(a.typeId, (typeDelta.get(a.typeId) ?? 0n) + BigInt(a.delta));
    }

    // apply sums
    const uid = adjs[0]!.uid;
    for (const [tier, delta] of rarityDelta.entries()) {
      const key = keys.sumRarity(uid, tier);
      const cur = u64.decodeBE(await this.storage.get(key));
      const next = cur + delta;
      if (next < 0n) throw new UnderflowError(`sum underflow: rarity ${tier}`);
      ops.push({ type: 'put', key, value: u64.encodeBE(next) });
    }
    for (const [typeId, delta] of typeDelta.entries()) {
      const key = keys.sumType(uid, typeId);
      const cur = u64.decodeBE(await this.storage.get(key));
      const next = cur + delta;
      if (next < 0n) throw new UnderflowError(`sum underflow: type ${typeId}`);
      ops.push({ type: 'put', key, value: u64.encodeBE(next) });
    }

    await this.storage.batch(ops);
  }
}
