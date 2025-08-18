import { StorageProvider, BatchOp } from '../storage/StorageProvider';
import { u32, u64 } from '../storage/codec';
import { keys } from '../storage/keys';
import { ConfigLoader } from '../config';
import { UnderflowError, StackAdjust } from './TransactionManager';

export async function prepareStackOps(
  storage: StorageProvider,
  adjs: StackAdjust[],
): Promise<BatchOp[]> {
  if (adjs.length === 0) return [];
  const ops: BatchOp[] = [];
  const rarityDelta = new Map<string, bigint>();
  const typeDelta = new Map<string, bigint>();
  const srcDelta = new Map<string, bigint>();
  const cfg = new ConfigLoader().load();
  const filterable = new Set<string>();
  for (const m of (cfg.modifiers?.static as any[]) || []) {
    if ((m as any)?.filterable) filterable.add(String((m as any).id));
  }
  let totalItemsDelta = 0n;
  let totalStacksDelta = 0n;
  const uid = adjs[0]!.uid;
  for (const a of adjs) {
    const invKey = keys.inv(a.uid, a.stackId);
    const prev = BigInt(u32.decodeBE(await storage.get(invKey)));
    const next = prev + BigInt(a.delta);
    if (next < 0n) throw new UnderflowError(`inventory underflow: ${a.stackId}`);
    ops.push({ type: 'put', key: invKey, value: u32.encodeBE(Number(next)) });
    const idxRKey = keys.idxRarity(a.uid, a.rarity, a.stackId);
    const idxTKey = keys.idxType(a.uid, a.typeId, a.stackId);
    const srcMapKey = keys.srcMap(a.uid, a.stackId);
    const existingSrcBuf = await storage.get(srcMapKey);
    const existingSrc = existingSrcBuf ? existingSrcBuf.toString('utf8') : undefined;
    const srcForStack = existingSrc ?? a.source;
    if (prev === 0n && next > 0n) {
      ops.push({ type: 'put', key: idxRKey, value: '1' });
      ops.push({ type: 'put', key: idxTKey, value: '1' });
      const tagMapKey = keys.tagMap(a.uid, a.stackId);
      const tags = Array.isArray((a as any).tags) ? ((a as any).tags as string[]) : [];
      const filtTags = tags.filter((t) => filterable.has(t));
      if (filtTags.length > 0) {
        ops.push({ type: 'put', key: tagMapKey, value: JSON.stringify(filtTags) });
        for (const t of filtTags)
          ops.push({ type: 'put', key: keys.idxTag(a.uid, t, a.stackId), value: '1' });
      }
      if (srcForStack) {
        ops.push({ type: 'put', key: keys.idxSrc(a.uid, srcForStack, a.stackId), value: '1' });
        if (!existingSrc) ops.push({ type: 'put', key: srcMapKey, value: srcForStack });
      }
      totalStacksDelta += 1n;
    } else if (prev > 0n && next === 0n) {
      ops.push({ type: 'del', key: idxRKey });
      ops.push({ type: 'del', key: idxTKey });
      const tagMapKey = keys.tagMap(a.uid, a.stackId);
      const tbuf = await storage.get(tagMapKey);
      if (tbuf) {
        try {
          const arr = JSON.parse(tbuf.toString('utf8')) as string[];
          for (const t of arr) ops.push({ type: 'del', key: keys.idxTag(a.uid, t, a.stackId) });
        } catch {}
        ops.push({ type: 'del', key: tagMapKey });
      }
      if (existingSrc) {
        ops.push({ type: 'del', key: keys.idxSrc(a.uid, existingSrc, a.stackId) });
        ops.push({ type: 'del', key: srcMapKey });
      }
      totalStacksDelta -= 1n;
    }
    rarityDelta.set(a.rarity, (rarityDelta.get(a.rarity) ?? 0n) + BigInt(a.delta));
    typeDelta.set(a.typeId, (typeDelta.get(a.typeId) ?? 0n) + BigInt(a.delta));
    if (srcForStack) srcDelta.set(srcForStack, (srcDelta.get(srcForStack) ?? 0n) + BigInt(a.delta));
    totalItemsDelta += BigInt(a.delta);
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
  for (const [source, delta] of srcDelta.entries()) {
    const key = keys.sumSrc(uid, source);
    const cur = u64.decodeBE(await storage.get(key));
    const next = cur + delta;
    if (next < 0n) throw new UnderflowError(`sum underflow: src ${source}`);
    ops.push({ type: 'put', key, value: u64.encodeBE(next) });
  }
  if (totalItemsDelta !== 0n) {
    const k = keys.sumTotalItems(uid);
    const buf = await storage.get(k);
    if (buf || totalItemsDelta > 0n) {
      const cur = u64.decodeBE(buf);
      const next = cur + totalItemsDelta;
      if (next < 0n) throw new UnderflowError('sum underflow: totalItems');
      ops.push({ type: 'put', key: k, value: u64.encodeBE(next) });
    }
  }
  if (totalStacksDelta !== 0n) {
    const k = keys.sumTotalStacks(uid);
    const buf = await storage.get(k);
    if (buf || totalStacksDelta > 0n) {
      const cur = u64.decodeBE(buf);
      const next = cur + totalStacksDelta;
      if (next < 0n) throw new UnderflowError('sum underflow: totalStacks');
      ops.push({ type: 'put', key: k, value: u64.encodeBE(next) });
    }
  }
  return ops;
}
