import fs from 'node:fs';
import path from 'node:path';

import { OpenBoxesService } from '../src/backend/services/OpenBoxesService';
import { SeededRng } from '../src/backend/services/Rng';
import { u64 } from '../src/backend/storage/codec';
import { keys as kv } from '../src/backend/storage/keys';
import { LevelStorage } from '../src/backend/storage/LevelStorage';

describe('OpenBoxesService key consumption', () => {
  const tmpDir = path.resolve(process.cwd(), 'data/test-leveldb-openboxes');
  const uid = 'test-user';

  beforeAll(async () => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('deducts keys according to keyCost * count', async () => {
    const storage = new LevelStorage(tmpDir);
    await storage.open();
    // seed balances
    await storage.put(kv.cur(uid, 'KEYS'), u64.encodeBE(100n));
    // sanity: lifetime opened starts at 0
    // construct service with seeded RNG to avoid bonus
    const svc = new OpenBoxesService(storage, undefined as any, new SeededRng(1));
    const res = await svc.open(uid, { boxId: 'box_wooden', count: 10, requestId: 'req-1' });
    expect(res).toBeTruthy();
    const after = u64.decodeBE(await storage.get(kv.cur(uid, 'KEYS')));
    // wooden costs 5 each, 10 opens => 50 keys deducted, no bonus expected at 0 lifetime
    expect(after).toBe(50n);
    await storage.close();
  });
});
