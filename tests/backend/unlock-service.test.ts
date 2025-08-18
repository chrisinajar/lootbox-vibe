import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from '@jest/globals';
import { LevelStorage } from '../../src/backend/storage/LevelStorage';
import { UnlockService } from '../../src/backend/services/UnlockService';

function u64be(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  let v = n;
  for (let i = 7; i >= 0; i--) {
    b[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return b;
}

describe('UnlockService', () => {
  it('milestone unlocks when threshold crossed', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();
    const uid = 'u1';
    // v1: set boxes opened to 49 then compute with next=50
    await db.put(`pstat:${uid}.lifetimeBoxesOpened`, u64be(49n));
    const svc = new UnlockService(db);
    const { ops, unlocked } = await svc.prepareUnlockOps(uid, 50n);
    expect(Array.isArray(unlocked)).toBe(true);
    // v1 config milestone unlocks box_wooden at 50
    expect(unlocked.includes('box_wooden')).toBe(true);
    await db.batch(ops);
    const prof = await db.get(`ppro:${uid}`);
    expect(prof?.toString('utf8')).toContain('box_wooden');
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rng unlock only triggers when source matches rule', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();
    const uid = 'u2';
    // v1 RNG unlock: scope box_cardboard unlocks box_unstable with pity
    // Preload tries to one before hard pity guarantee
    await db.put(`punlock:${uid}:rng_unstable_from_cardboard:tries`, u64be(4999n));
    const svc = new UnlockService(db);
    const a = await svc.prepareUnlockOps(uid, 0n, 'box_cardboard');
    const b = await svc.prepareUnlockOps(uid, 0n, 'box_other');
    expect(a.unlocked.includes('box_unstable')).toBe(true);
    expect(b.unlocked.includes('box_unstable')).toBe(false);
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
