import path from 'node:path';

import { OpenBoxesService } from '../src/backend/services/OpenBoxesService';
import { SeededRng } from '../src/backend/services/Rng';
import { u64 } from '../src/backend/storage/codec';
import { keys } from '../src/backend/storage/keys';
import { LevelStorage } from '../src/backend/storage/LevelStorage';

(async () => {
  const db = path.resolve(process.cwd(), 'data/debug-db');
  const storage = new LevelStorage(db);
  await storage.open();
  const uid = 'debug';
  const curKey = keys.cur(uid, 'KEYS');
  await storage.put(curKey, u64.encodeBE(100n));
  const svc = new OpenBoxesService(storage, undefined as any, new SeededRng(1));
  const before = u64.decodeBE(await storage.get(curKey));
  console.log('before', before.toString());
  const res = await svc.open(uid, { boxId: 'box_wooden', count: 10, requestId: 'r1' });
  console.log(
    'result currencies',
    res.currencies.map((c: any) => `${c.currency}:${c.amount.toString()}`),
  );
  const after = u64.decodeBE(await storage.get(curKey));
  console.log('after', after.toString());
  await storage.close();
})();
