import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from '@jest/globals';
import { LevelStorage } from '../../src/backend/storage/LevelStorage';
import { UnlockService } from '../../src/backend/services/UnlockService';

function u64be(n: bigint): Buffer { const b=Buffer.alloc(8); let v=n; for(let i=7;i>=0;i--){ b[i]=Number(v&0xffn); v>>=8n;} return b; }

describe('UnlockService', () => {
  it('milestone unlocks when threshold crossed', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();
    const uid = 'u1';
    // set boxes opened to 24 then compute with next=25
    await db.put(`pstat:${uid}.lifetimeBoxesOpened`, u64be(24n));
    const svc = new UnlockService(db);
    const { ops, unlocked } = await svc.prepareUnlockOps(uid, 25n);
    expect(Array.isArray(unlocked)).toBe(true);
    // Our repo has an unlock config with id unlock.wooden_crate threshold 25
    expect(unlocked.includes('unlock.wooden_crate')).toBe(true);
    await db.batch(ops);
    const prof = await db.get(`ppro:${uid}`);
    expect(prof?.toString('utf8')).toContain('unlock.wooden_crate');
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rng unlock only triggers when source matches rule', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();
    const uid = 'u2';
    const svc = new UnlockService(db, undefined as any, [{ unlockId: 'unlock.dim', sourceBoxId: 'box.cardboard', chance: 1.0 }]);
    const a = await svc.prepareUnlockOps(uid, 0n, 'box.cardboard');
    const b = await svc.prepareUnlockOps(uid, 0n, 'box.other');
    expect(a.unlocked.includes('unlock.dim')).toBe(true);
    expect(b.unlocked.includes('unlock.dim')).toBe(false);
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
