import path from 'node:path';
import { LevelStorage } from '../src/backend/storage/LevelStorage';

type SeedOpts = { uid: string; writeSums: boolean };

function u32be(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function u64be(n: bigint): Buffer {
  const b = Buffer.alloc(8);
  let v = n;
  for (let i = 7; i >= 0; i--) {
    b[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return b;
}

async function seed({ uid, writeSums }: SeedOpts) {
  const dbPath = path.resolve(process.cwd(), 'data/leveldb');
  const db = new LevelStorage(dbPath);
  await db.open();

  const stacks = [
    { stackId: 'Apple_COMMON_base', count: 200, rarity: 'COMMON', typeId: 'Apple' },
    { stackId: 'Banana_COMMON_base', count: 1200, rarity: 'COMMON', typeId: 'Banana' },
    { stackId: 'Paperclip_UNCOMMON_base', count: 300, rarity: 'UNCOMMON', typeId: 'Paperclip' },
  ];

  const ops = [] as { type: 'put' | 'del'; key: string; value?: Buffer | string }[];

  for (const s of stacks) {
    ops.push({ type: 'put', key: `inv:${uid}:${s.stackId}`, value: u32be(s.count) });
    ops.push({ type: 'put', key: `idx:rarity:${uid}:${s.rarity}:${s.stackId}`, value: '1' });
    ops.push({ type: 'put', key: `idx:type:${uid}:${s.typeId}:${s.stackId}`, value: '1' });
  }

  if (writeSums) {
    const byRarity = new Map<string, bigint>();
    const byType = new Map<string, bigint>();
    for (const s of stacks) {
      byRarity.set(s.rarity, (byRarity.get(s.rarity) ?? 0n) + BigInt(s.count));
      byType.set(s.typeId, (byType.get(s.typeId) ?? 0n) + BigInt(s.count));
    }
    for (const [tier, cnt] of byRarity.entries()) {
      ops.push({ type: 'put', key: `sum:rarity:${uid}:${tier}`, value: u64be(cnt) });
    }
    for (const [typeId, cnt] of byType.entries()) {
      ops.push({ type: 'put', key: `sum:type:${uid}:${typeId}`, value: u64be(cnt) });
    }
  }

  await db.batch(ops);
  // seed currencies
  const keysKey = `cur:${uid}:KEYS`;
  const scrapKey = `cur:${uid}:SCRAP`;
  await db.batch([
    { type: 'put', key: keysKey, value: u64be(100n) },
    { type: 'put', key: scrapKey, value: u64be(0n) },
  ]);
  // Logging summary
  const totalStacks = stacks.length;
  const totalItems = stacks.reduce((a, s) => a + s.count, 0);
  const byRaritySummary = Object.entries(
    stacks.reduce<Record<string, number>>((acc, s) => {
      acc[s.rarity] = (acc[s.rarity] || 0) + s.count;
      return acc;
    }, {}),
  )
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  const byTypeSummary = Object.entries(
    stacks.reduce<Record<string, number>>((acc, s) => {
      acc[s.typeId] = (acc[s.typeId] || 0) + s.count;
      return acc;
    }, {}),
  )
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

  const invCount = stacks.length;
  const idxRarityCount = stacks.length;
  const idxTypeCount = stacks.length;
  const sumCount = writeSums ? new Set(stacks.map((s) => s.rarity)).size + new Set(stacks.map((s) => s.typeId)).size : 0;

  // eslint-disable-next-line no-console
  console.log('--- Seed Summary ---');
  // eslint-disable-next-line no-console
  console.log(`DB: ${dbPath}`);
  // eslint-disable-next-line no-console
  console.log(`User: ${uid}`);
  // eslint-disable-next-line no-console
  console.log(`Write sums: ${writeSums ? 'yes' : 'no'}`);
  // eslint-disable-next-line no-console
  console.log(`Totals: stacks=${totalStacks}, items=${totalItems}`);
  // eslint-disable-next-line no-console
  console.log(`By rarity: ${byRaritySummary}`);
  // eslint-disable-next-line no-console
  console.log(`By type:   ${byTypeSummary}`);
  // eslint-disable-next-line no-console
  console.log(`Keys written: inv=${invCount}, idx:rarity=${idxRarityCount}, idx:type=${idxTypeCount}, sum=${sumCount}`);
  console.log(`Currencies: KEYS=100, SCRAP=0`);
  // eslint-disable-next-line no-console
  console.log('Tip: in browser console:');
  // eslint-disable-next-line no-console
  console.log("  sessionStorage.setItem('X-User-Id','seed-user')  // or localStorage");
  // eslint-disable-next-line no-console
  console.log("  sessionStorage.setItem('X-User-Id','anonymous') // switch back");
  await db.close();
}

function parseArgs(): SeedOpts {
  const uid = process.env.SEED_UID || 'seed-user';
  const writeSums = process.argv.includes('--no-sum') ? false : true;
  return { uid, writeSums };
}

seed(parseArgs()).then(
  () => {
    // eslint-disable-next-line no-console
    console.log('Seed complete');
    process.exit(0);
  },
  (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  },
);
