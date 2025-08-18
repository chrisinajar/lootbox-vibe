import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from '@jest/globals';
import { LevelStorage } from '../../src/backend/storage/LevelStorage';
import { TransactionManager } from '../../src/backend/services/TransactionManager';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

describe('Transaction invariants', () => {
  it('sum:* equals recompute(inv:*) after random deltas', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();
    const tm = new TransactionManager(db);
    const uid = 'u1';
    const tiers = ['COMMON', 'UNCOMMON', 'RARE'] as const;
    const types = ['Apple', 'Banana', 'Paperclip'] as const;

    const stacks: Array<{ stackId: string; rarity: string; typeId: string }> = [];
    for (let i = 0; i < 20; i++) {
      stacks.push({
        stackId: `S${i}`,
        rarity: tiers[i % tiers.length]!,
        typeId: types[i % types.length]!,
      });
    }

    // apply 100 random adjustments
    for (let i = 0; i < 100; i++) {
      const s = stacks[randInt(0, stacks.length - 1)]!;
      const delta = randInt(-2, 5); // small changes, may be negative
      try {
        await tm.adjustStacks([
          { uid, stackId: s.stackId, rarity: s.rarity, typeId: s.typeId, delta },
        ]);
      } catch {
        // underflow is fine; skip
      }
    }

    // recompute totals from inv and idx
    let computedItems = 0n;
    const rarityTotals = new Map<string, bigint>();
    const typeTotals = new Map<string, bigint>();
    // Build maps stackId -> rarity/type via idx
    const stackRarity = new Map<string, string>();
    const stackType = new Map<string, string>();
    for (const t of tiers) {
      await db.scanPrefix(`idx:rarity:${uid}:${t}:`, (k) => {
        const parts = k.split(':');
        const sid = parts[parts.length - 1];
        if (sid) stackRarity.set(sid, t);
      });
    }
    for (const ty of types) {
      await db.scanPrefix(`idx:type:${uid}:${ty}:`, (k) => {
        const parts = k.split(':');
        const sid = parts[parts.length - 1];
        if (sid) stackType.set(sid, ty);
      });
    }

    await db.scanPrefix(`inv:${uid}:`, async (k, v) => {
      const count = BigInt(v.readUInt32BE(0));
      if (count > 0n) {
        computedItems += count;
        const sid = k.split(':').pop() as string;
        const r = stackRarity.get(sid) || 'COMMON';
        const ty = stackType.get(sid) || 'Apple';
        rarityTotals.set(r, (rarityTotals.get(r) ?? 0n) + count);
        typeTotals.set(ty, (typeTotals.get(ty) ?? 0n) + count);
      }
    });

    // read sums
    const sumRarity = new Map<string, bigint>();
    for (const t of tiers) {
      const b = await db.get(`sum:rarity:${uid}:${t}`);
      let val = 0n;
      if (b) {
        for (const by of b.values()) val = (val << 8n) | BigInt(by);
      }
      sumRarity.set(t, val);
    }
    const sumType = new Map<string, bigint>();
    for (const ty of types) {
      const b = await db.get(`sum:type:${uid}:${ty}`);
      let val = 0n;
      if (b) {
        for (const by of b.values()) val = (val << 8n) | BigInt(by);
      }
      sumType.set(ty, val);
    }

    for (const t of tiers) {
      expect(sumRarity.get(t) ?? 0n).toBe(rarityTotals.get(t) ?? 0n);
    }
    for (const ty of types) {
      expect(sumType.get(ty) ?? 0n).toBe(typeTotals.get(ty) ?? 0n);
    }

    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
