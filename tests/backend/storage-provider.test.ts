import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, it, expect } from '@jest/globals';

import { LevelStorage } from '../../src/backend/storage/LevelStorage';

describe('StorageProvider batch atomicity', () => {
  it('applies all ops on success', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();
    await db.batch([
      { type: 'put', key: 'a', value: '1' },
      { type: 'put', key: 'b', value: '2' },
    ]);
    const a = await db.get('a');
    const b = await db.get('b');
    expect(String(a)).toBe('1');
    expect(String(b)).toBe('2');
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rolls back on failure', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();
    // Seed initial values
    await db.put('x', 'seed');
    await db.put('y', 'seed');
    // Prepare a batch with an invalid op (missing value for put)
    let err: any;
    try {
      const badOps: any = [
        { type: 'put', key: 'x', value: 'changed' },
        { type: 'put', key: 'y' },
      ];
      await db.batch(badOps as any);
    } catch (e) {
      err = e;
    }
    expect(err).toBeTruthy();
    // Ensure nothing changed
    const x = await db.get('x');
    const y = await db.get('y');
    expect(String(x)).toBe('seed');
    expect(String(y)).toBe('seed');
    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
