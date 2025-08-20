import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, it, expect } from '@jest/globals';

import { OpenBoxesService } from '../../src/backend/services/OpenBoxesService';
import { LevelStorage } from '../../src/backend/storage/LevelStorage';

class SeqRng {
  private i = 0;
  constructor(private seq: number[]) {}
  next(): number {
    const v = this.seq[this.i] ?? 0;
    this.i++;
    return v;
  }
}

describe('Inventory tags indexing (shiny)', () => {
  it('indexes shiny tag when a shiny cosmetic drops', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lvl-'));
    const db = new LevelStorage(dir);
    await db.open();

    // Sequence: pick first ITEM (Rusty Spoon), pass cosmetic chance, pick last eligible mod (m_shiny)
    const svc = new OpenBoxesService(db, undefined as any, new SeqRng([0, 0, 0.999]) as any);
    const uid = 'u_test';
    // Open a box with items that can roll shiny (Cardboard Box has m_shiny in pools)
    const res = await svc.open(uid, { boxId: 'box_cardboard', count: 1, requestId: 'r1' });
    expect(res.stacks.length).toBeGreaterThan(0);

    // Scan idx:tag for any curated tag entries for this user
    const tagKeys: string[] = [];
    await db.scanPrefix(`idx:tag:${uid}:`, (k) => tagKeys.push(k));
    expect(tagKeys.length).toBeGreaterThan(0);

    await db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
