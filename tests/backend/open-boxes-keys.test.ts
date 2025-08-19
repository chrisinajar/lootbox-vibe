import path from 'node:path';
import fs from 'node:fs';
import { describe, it, expect } from '@jest/globals';
import { LevelStorage } from '../../src/backend/storage/LevelStorage';
import { u64 } from '../../src/backend/storage/codec';
import { keys as kv } from '../../src/backend/storage/keys';
import { OpenBoxesService } from '../../src/backend/services/OpenBoxesService';
import { SeededRng } from '../../src/backend/services/Rng';

describe('OpenBoxesService – key deduction', () => {
  const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'data/test-leveldb-openboxes-keys-'));
  const uid = 'test-user-keys';

  beforeAll(() => {
    // temp dir is created above via mkdtemp
  });

  it('deducts KEYS by keyCost * count with no overwrite', async () => {
    const storage = new LevelStorage(tmpDir);
    await storage.open();
    // seed balances
    await storage.put(kv.cur(uid, 'KEYS'), u64.encodeBE(100n));
    // deterministic RNG and no lucky bonus (prev opens < 1000)
    const svc = new OpenBoxesService(storage, undefined as any, new SeededRng(1));
    const res = await svc.open(uid, { boxId: 'box_wooden', count: 10, requestId: 'req-keys-1' });
    expect(res).toBeTruthy();
    const after = u64.decodeBE(await storage.get(kv.cur(uid, 'KEYS')));
    expect(after).toBe(50n); // 100 - (5 * 10)
    await storage.close();
  });
});
