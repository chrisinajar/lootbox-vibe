import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from '@jest/globals';
import { LevelStorage } from '../../src/backend/storage/LevelStorage';
import { CurrencyService } from '../../src/backend/services/CurrencyService';

describe('CurrencyService', () => {
  it('credits and debits atomically with underflow protection', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();
    const svc = new CurrencyService(db);
    const uid = 'u1';

    // initial zero
    expect(await svc.getBalance(uid, 'KEYS')).toBe(0n);

    // credit 100
    await svc.credit(uid, 'KEYS', 100n);
    expect(await svc.getBalance(uid, 'KEYS')).toBe(100n);

    // debit 40
    await svc.debit(uid, 'KEYS', 40n);
    expect(await svc.getBalance(uid, 'KEYS')).toBe(60n);

    // underflow
    await expect(svc.debit(uid, 'KEYS', 100n)).rejects.toThrow();
    // balance unchanged
    expect(await svc.getBalance(uid, 'KEYS')).toBe(60n);

    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

