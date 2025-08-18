import { InventoryListService } from '../../src/backend/services/InventoryListService';
import { StorageProvider, BatchOp } from '../../src/backend/storage/StorageProvider';

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

function u32(n: number) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

describe('InventoryListService', () => {
  test('lists with filters and cursor', async () => {
    const s = new MemStore();
    const uid = 'u';
    // Seed three stacks
    const A = 'item.apple_COMMON_base';
    const B = 'item.banana_COMMON_base';
    const C = 'item.cherry_UNCOMMON_base';
    await s.put(`inv:${uid}:${A}`, u32(2));
    await s.put(`inv:${uid}:${B}`, u32(5));
    await s.put(`inv:${uid}:${C}`, u32(7));
    await s.put(`idx:rarity:${uid}:COMMON:${A}`, '1');
    await s.put(`idx:rarity:${uid}:COMMON:${B}`, '1');
    await s.put(`idx:rarity:${uid}:UNCOMMON:${C}`, '1');
    await s.put(`idx:type:${uid}:item.apple:${A}`, '1');
    await s.put(`idx:type:${uid}:item.banana:${B}`, '1');
    await s.put(`idx:type:${uid}:item.cherry:${C}`, '1');
    await s.put(`idx:src:${uid}:box.cardboard:${A}`, '1');
    await s.put(`idx:src:${uid}:box.cardboard:${B}`, '1');
    await s.put(`idx:src:${uid}:box.wood:${C}`, '1');

    const svc = new InventoryListService(s);
    // Unfiltered limit 2
    const p1 = await svc.list(uid, {}, 2);
    expect(p1.rows.length).toBe(2);
    expect(p1.nextCursor).toBe(p1.rows[1]!.stackId);
    // Cursor fetch next
    const p2 = await svc.list(uid, {}, 5, p1.nextCursor || undefined);
    expect(p2.rows.length).toBe(1);
    // Rarity filter
    const commons = await svc.list(uid, { rarity: 'COMMON' }, 10);
    expect(commons.rows.every((r) => r.rarity === 'COMMON')).toBe(true);
    // Type filter
    const apples = await svc.list(uid, { typeId: 'item.apple' }, 10);
    expect(apples.rows.length).toBe(1);
    expect(apples.rows[0]!.typeId).toBe('item.apple');
    // Source filter
    const fromCard = await svc.list(uid, { sourceBoxId: 'box.cardboard' }, 10);
    const ids = new Set(fromCard.rows.map((r) => r.stackId));
    expect(ids.has(A)).toBe(true);
    expect(ids.has(B)).toBe(true);
    expect(ids.has(C)).toBe(false);
  });
});
