import { StorageProvider, BatchOp } from '../storage/StorageProvider';
import { u32, u64 } from '../storage/codec';
import { keys } from '../storage/keys';
import { UnderflowError, StackAdjust } from './TransactionManager';

export async function prepareStackOps(storage: StorageProvider, adjs: StackAdjust[]): Promise<BatchOp[]> {
  if (adjs.length === 0) return [];
  const ops: BatchOp[] = [];
  const rarityDelta = new Map<string, bigint>();
  const typeDelta = new Map<string, bigint>();
  const uid = adjs[0]!.uid;
  for (const a of adjs) {
    const invKey = keys.inv(a.uid, a.stackId);
    const prev = BigInt(u32.decodeBE(await storage.get(invKey)));
    const next = prev + BigInt(a.delta);
    if (next < 0n) throw new UnderflowError(`inventory underflow: ${a.stackId}`);
    ops.push({ type: 'put', key: invKey, value: u32.encodeBE(Number(next)) });
    const idxRKey = keys.idxRarity(a.uid, a.rarity, a.stackId);
    const idxTKey = keys.idxType(a.uid, a.typeId, a.stackId);
    if (prev === 0n && next > 0n) {
      ops.push({ type: 'put', key: idxRKey, value: '1' });
      ops.push({ type: 'put', key: idxTKey, value: '1' });
    } else if (prev > 0n && next === 0n) {
      ops.push({ type: 'del', key: idxRKey });
      ops.push({ type: 'del', key: idxTKey });
    }
    rarityDelta.set(a.rarity, (rarityDelta.get(a.rarity) ?? 0n) + BigInt(a.delta));
    typeDelta.set(a.typeId, (typeDelta.get(a.typeId) ?? 0n) + BigInt(a.delta));
  }
  for (const [tier, delta] of rarityDelta.entries()) {
    const key = keys.sumRarity(uid, tier);
    const cur = u64.decodeBE(await storage.get(key));
    const next = cur + delta;
    if (next < 0n) throw new UnderflowError(`sum underflow: rarity ${tier}`);
    ops.push({ type: 'put', key, value: u64.encodeBE(next) });
  }
  for (const [typeId, delta] of typeDelta.entries()) {
    const key = keys.sumType(uid, typeId);
    const cur = u64.decodeBE(await storage.get(key));
    const next = cur + delta;
    if (next < 0n) throw new UnderflowError(`sum underflow: type ${typeId}`);
    ops.push({ type: 'put', key, value: u64.encodeBE(next) });
  }
  return ops;
}
