import { OpenBoxesService } from '../../src/backend/services/OpenBoxesService';
import { SalvageService } from '../../src/backend/services/SalvageService';
import { StorageProvider, BatchOp } from '../../src/backend/storage/StorageProvider';
import { u64, u32 } from '../../src/backend/storage/codec';
import { keys } from '../../src/backend/storage/keys';

class MemStore implements StorageProvider {
  private m = new Map<string, Buffer>();
  async open() {}
  async close() {}
  async get(key: string) {
    return this.m.get(key);
  }
  async put(key: string, value: Buffer | string) {
    this.m.set(key, typeof value === 'string' ? Buffer.from(value) : value);
  }
  async del(key: string) {
    this.m.delete(key);
  }
  async batch(ops: BatchOp[]) {
    for (const op of ops) {
      if (op.type === 'put') await this.put(op.key, op.value!);
      else await this.del(op.key);
    }
  }
  async scanPrefix(prefix: string, onItem: (key: string, value: Buffer) => void) {
    for (const [k, v] of this.m.entries()) if (k.startsWith(prefix)) onItem(k, v);
  }
}

class FixedRng {
  constructor(private v = 0.99) {}
  next() {
    return this.v;
  }
}

function seedBasicConfigFiles() {
  // Nothing to do: ConfigLoader reads actual files under /config which already exist in repo.
}

describe('Economy & Unlock logic', () => {
  beforeAll(() => seedBasicConfigFiles());

  test('batch limit enforced at 1000+', async () => {
    const store = new MemStore();
    await store.open();
    const svc = new OpenBoxesService(store as any, undefined as any, new FixedRng() as any);
    const uid = 'u1';
    await store.put(keys.cur(uid, 'KEYS'), u64.encodeBE(10_000n));
    await store.put(`pstat:${uid}.lifetimeBoxesOpened`, u64.encodeBE(0n));
    await expect(
      svc.open(uid, { boxId: 'box_cardboard', count: 1001, requestId: 'r1' } as any),
    ).rejects.toThrow();
  });

  test('key cost debits from config and no lucky bonus with fixed rng', async () => {
    const store = new MemStore();
    await store.open();
    const svc = new OpenBoxesService(store as any, undefined as any, new FixedRng(0.99) as any);
    const uid = 'u2';
    await store.put(keys.cur(uid, 'KEYS'), u64.encodeBE(100n));
    await store.put(`pstat:${uid}.lifetimeBoxesOpened`, u64.encodeBE(0n));
    const res = await svc.open(uid, { boxId: 'box_cardboard', count: 3, requestId: 'r2' } as any);
    // Cardboard keyCost = 0 in v1, lucky=0 with fixed rng
    const bal = u64.decodeBE(await store.get(keys.cur(uid, 'KEYS')));
    expect(bal).toBe(100n);
    const first = (res as any).currencies.find((c: any) => c.currency === 'KEYS');
    expect(first.amount).toBe(0n);
  });

  test('soft pity unlocks unstable on 5000th open from cardboard', async () => {
    const store = new MemStore();
    await store.open();
    const svc = new OpenBoxesService(store as any, undefined as any, new FixedRng(0.99) as any);
    const uid = 'u3';
    await store.put(keys.cur(uid, 'KEYS'), u64.encodeBE(10_000n));
    await store.put(`pstat:${uid}.lifetimeBoxesOpened`, u64.encodeBE(4999n));
    // Preload RNG tries to just before hard pity to deterministically unlock on this open
    await store.put(`punlock:${uid}:rng_unstable_from_cardboard:tries`, u64.encodeBE(4999n));
    const res = await svc.open(uid, { boxId: 'box_cardboard', count: 1, requestId: 'r3' } as any);
    expect(res.unlocks).toContain('box_unstable');
  });

  test('salvage uses scrap per rarity from config and greedy multiplier', async () => {
    const store = new MemStore();
    await store.open();
    const salvage = new SalvageService(store as any);
    const uid = 'u4';
    // setup inv: one COMMON stack with count 2, and indexes
    const stackId = 'item.apple_COMMON_base';
    await store.put(keys.inv(uid, stackId), u32.encodeBE(2));
    await store.put(keys.idxRarity(uid, 'COMMON', stackId), '1');
    await store.put(keys.idxType(uid, 'item.apple', stackId), '1');
    await store.put(keys.sumRarity(uid, 'COMMON'), u64.encodeBE(2n));
    await store.put(keys.sumType(uid, 'item.apple'), u64.encodeBE(2n));
    // economy: COMMON -> 1, lifetime opens 0 => no greedy
    await store.put(keys.cur(uid, 'SCRAP'), u64.encodeBE(0n));
    await store.put(`pstat:${uid}.lifetimeBoxesOpened`, u64.encodeBE(0n));
    const res = await salvage.salvage(uid, { maxRarity: 'COMMON' } as any);
    const scrapBal = u64.decodeBE(await store.get(keys.cur(uid, 'SCRAP')));
    expect(scrapBal).toBe(2n); // 2 items * 1 scrap
    expect((res as any).currencies[0].amount).toBe(2n);
  });
});
