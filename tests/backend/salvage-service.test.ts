import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, it, expect } from '@jest/globals';

import { SalvageService } from '../../src/backend/services/SalvageService';
import { LevelStorage } from '../../src/backend/storage/LevelStorage';

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

describe('SalvageService', () => {
  it('filters by maxRarity and typeIds and updates inv/idx/sum and credits SCRAP', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();
    const uid = 'u1';
    // Seed two stacks: Banana COMMON (3), Paperclip UNCOMMON (5), Apple RARE (7)
    await db.batch([
      { type: 'put', key: `inv:${uid}:Banana_COMMON_base`, value: u32be(3) },
      { type: 'put', key: `idx:rarity:${uid}:COMMON:Banana_COMMON_base`, value: '1' },
      { type: 'put', key: `idx:type:${uid}:Banana:Banana_COMMON_base`, value: '1' },
      { type: 'put', key: `sum:rarity:${uid}:COMMON`, value: u64be(3n) },
      { type: 'put', key: `sum:type:${uid}:Banana`, value: u64be(3n) },

      { type: 'put', key: `inv:${uid}:Paperclip_UNCOMMON_base`, value: u32be(5) },
      { type: 'put', key: `idx:rarity:${uid}:UNCOMMON:Paperclip_UNCOMMON_base`, value: '1' },
      { type: 'put', key: `idx:type:${uid}:Paperclip:Paperclip_UNCOMMON_base`, value: '1' },
      { type: 'put', key: `sum:rarity:${uid}:UNCOMMON`, value: u64be(5n) },
      { type: 'put', key: `sum:type:${uid}:Paperclip`, value: u64be(5n) },

      { type: 'put', key: `inv:${uid}:Apple_RARE_base`, value: u32be(7) },
      { type: 'put', key: `idx:rarity:${uid}:RARE:Apple_RARE_base`, value: '1' },
      { type: 'put', key: `idx:type:${uid}:Apple:Apple_RARE_base`, value: '1' },
      { type: 'put', key: `sum:rarity:${uid}:RARE`, value: u64be(7n) },
      { type: 'put', key: `sum:type:${uid}:Apple`, value: u64be(7n) },

      { type: 'put', key: `cur:${uid}:SCRAP`, value: u64be(0n) },
    ]);

    const svc = new SalvageService(db);
    // Salvage up to UNCOMMON but only typeIds [Banana]
    const res = await svc.salvage(uid, { maxRarity: 'UNCOMMON', typeIds: ['Banana'] });
    expect(Array.isArray(res.currencies)).toBe(true);
    const cur = res.currencies[0] as any;
    expect(cur.currency).toBe('SCRAP');
    expect(cur.amount).toBe(3n); // only Banana_COMMON_base

    const bananaInv = await db.get(`inv:${uid}:Banana_COMMON_base`);
    expect(bananaInv && (bananaInv as Buffer).readUInt32BE(0)).toBe(0);
    const bananaIdxR = await db.get(`idx:rarity:${uid}:COMMON:Banana_COMMON_base`);
    expect(bananaIdxR).toBeUndefined();
    const bananaSumR = await db.get(`sum:rarity:${uid}:COMMON`);
    let v = 0n;
    if (bananaSumR) {
      for (const by of (bananaSumR as Buffer).values()) v = (v << 8n) | BigInt(by);
    }
    expect(v).toBe(0n);

    // Paperclip (UNCOMMON) untouched (filtered out by type)
    const paperInv = await db.get(`inv:${uid}:Paperclip_UNCOMMON_base`);
    expect(paperInv && (paperInv as Buffer).readUInt32BE(0)).toBe(5);

    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
