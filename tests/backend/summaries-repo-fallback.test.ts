import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from '@jest/globals';
import { LevelStorage } from '../../src/backend/storage/LevelStorage';
import { SummariesRepo } from '../../src/backend/services/SummariesRepo';

function u32be(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

describe('SummariesRepo fallbacks', () => {
  it('computes byType and byRarity from idx + inv when sum:* missing', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();
    const uid = 'u1';

    // seed inv + idx only, no sums
    const stacks = [
      { stackId: 'A_COMMON', count: 2, rarity: 'COMMON', typeId: 'Apple' },
      { stackId: 'B_COMMON', count: 3, rarity: 'COMMON', typeId: 'Banana' },
      { stackId: 'B_UNCOMMON', count: 5, rarity: 'UNCOMMON', typeId: 'Banana' },
    ];
    const ops: any[] = [];
    for (const s of stacks) {
      ops.push({ type: 'put', key: `inv:${uid}:${s.stackId}`, value: u32be(s.count) });
      ops.push({ type: 'put', key: `idx:rarity:${uid}:${s.rarity}:${s.stackId}`, value: '1' });
      ops.push({ type: 'put', key: `idx:type:${uid}:${s.typeId}:${s.stackId}`, value: '1' });
    }
    await db.batch(ops);

    const repo = new SummariesRepo(db);
    const byRarity = await repo.getByRarity(uid);
    const byType = await repo.getByType(uid);
    // COMMON: 2+3=5, UNCOMMON: 5
    const rMap = new Map(byRarity.map((r) => [r.rarity, r.count] as const));
    expect(rMap.get('COMMON')).toBe(5n);
    expect(rMap.get('UNCOMMON')).toBe(5n);
    // Types: Apple=2, Banana=8
    const tMap = new Map(byType.map((t) => [t.typeId, t.count] as const));
    expect(tMap.get('Apple')).toBe(2n);
    expect(tMap.get('Banana')).toBe(8n);

    const totals = await repo.getTotals(uid);
    expect(totals.totalStacks).toBe(3);
    expect(totals.totalItems).toBe(10n);

    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
