import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, it, expect } from '@jest/globals';

import { OpenBoxesService } from '../../src/backend/services/OpenBoxesService';
import { SeededRng } from '../../src/backend/services/Rng';
import { LevelStorage } from '../../src/backend/storage/LevelStorage';

function u64be(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  let v = n;
  for (let i = 7; i >= 0; i--) {
    b[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return b;
}

describe('openBoxes idempotency', () => {
  it('same requestId returns same result and only writes once', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();
    const uid = 'u1';
    // seed KEYS=10
    await db.put(`cur:${uid}:KEYS`, u64be(10n));

    const svc = new OpenBoxesService(db, undefined as any, new SeededRng(42));
    const input = { boxId: 'box_cardboard', count: 3, requestId: 'req-abc' } as any;

    const r1 = await svc.open(uid, input);
    const r2 = await svc.open(uid, input);
    expect(r1.stacks).toEqual(r2.stacks);
    expect(r1.unlocks).toEqual(r2.unlocks);
    expect(r1.currencies.map((c: any) => ({ ...c, amount: String(c.amount) }))).toEqual(
      r2.currencies.map((c: any) => ({ ...c, amount: String(c.amount) })),
    );

    // KEYS reduced only once (cardboard keyCost = 0 in v1)
    const keysAfter = await db.get(`cur:${uid}:KEYS`);
    let bal = 0n;
    if (keysAfter) {
      for (const by of (keysAfter as Buffer).values()) bal = (bal << 8n) | BigInt(by);
    }
    expect(bal).toBe(10n);

    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
