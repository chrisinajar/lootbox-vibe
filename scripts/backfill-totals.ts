import 'dotenv/config';
import path from 'node:path';
import { LevelStorage } from '../src/backend/storage/LevelStorage';
import { keys } from '../src/backend/storage/keys';
import { u32, u64 } from '../src/backend/storage/codec';

async function backfill(uid: string) {
  const dbPath = path.resolve(process.cwd(), 'data/leveldb');
  const db = new LevelStorage(dbPath);
  await db.open();
  let totalStacks = 0;
  let totalItems = 0n;
  await db.scanPrefix(`inv:${uid}:`, (_k, v) => {
    const c = BigInt(u32.decodeBE(v));
    if (c > 0n) {
      totalStacks += 1;
      totalItems += c;
    }
  });
  await db.put(keys.sumTotalStacks(uid), u64.encodeBE(BigInt(totalStacks)));
  await db.put(keys.sumTotalItems(uid), u64.encodeBE(totalItems));
  // eslint-disable-next-line no-console
  console.log(`Backfilled ${uid}: stacks=${totalStacks}, items=${totalItems}`);
  await db.close();
}

async function main() {
  const uid =
    process.argv[2] || (process.env as any).UID || (process.env as any).DEFAULT_UID || 'anonymous';
  await backfill(uid);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
