import fs from 'node:fs';
import path from 'node:path';

import { describe, it, expect } from '@jest/globals';

import { OpenBoxesService } from '../../src/backend/services/OpenBoxesService';
import { SeededRng } from '../../src/backend/services/Rng';
import { u64 } from '../../src/backend/storage/codec';
import { keys as kv } from '../../src/backend/storage/keys';
import { LevelStorage } from '../../src/backend/storage/LevelStorage';

describe('Unlock milestones – rewards credited once and do not overwrite deductions', () => {
  const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'data/test-leveldb-milestones-'));
  const uid = 'test-user-milestones';

  beforeAll(() => {
    // temp dir is created above via mkdtemp
  });

  it('credits milestone currency only once upon first unlock', async () => {
    const storage = new LevelStorage(tmpDir);
    await storage.open();
    // Start with 100 keys, just below first milestone threshold for cardboard (50)
    await storage.put(kv.cur(uid, 'KEYS'), u64.encodeBE(100n));
    await storage.put(`pstat:${uid}.lifetimeBoxesOpened`, u64.encodeBE(49n));

    const svc = new OpenBoxesService(storage, undefined as any, new SeededRng(1));

    // Cross milestone: open 1 cardboard (cost 0), expect +3 keys once
    const first = await svc.open(uid, {
      boxId: 'box_cardboard',
      count: 1,
      requestId: 'req-ms-1',
    });
    const afterFirst = u64.decodeBE(await storage.get(kv.cur(uid, 'KEYS')));
    expect(afterFirst).toBe(103n);
    // Should include a +3 KEYS reward in currencies list
    const keyDeltas = (first.currencies || []).filter((c: any) => c.currency === 'KEYS');
    expect(keyDeltas.some((c: any) => BigInt(c.amount) === 3n)).toBe(true);

    // Open again (still cardboard, cost 0). Reward should NOT re-apply
    const second = await svc.open(uid, {
      boxId: 'box_cardboard',
      count: 1,
      requestId: 'req-ms-2',
    });
    const afterSecond = u64.decodeBE(await storage.get(kv.cur(uid, 'KEYS')));
    expect(afterSecond).toBe(103n);
    const keyDeltas2 = (second.currencies || []).filter((c: any) => c.currency === 'KEYS');
    expect(keyDeltas2.some((c: any) => BigInt(c.amount) === 3n)).toBe(false);

    await storage.close();
  });
});
