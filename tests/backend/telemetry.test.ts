import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { TelemetryService } from '../../src/backend/services/TelemetryService';

describe('TelemetryService', () => {
  test('formats openBoxes entry with aggregates', () => {
    const t = new TelemetryService();
    const res = {
      stacks: [
        { stackId: 'a', typeId: 'i.apple', rarity: 'COMMON', count: 2 },
        { stackId: 'b', typeId: 'i.banana', rarity: 'COMMON', count: 3 },
      ],
      currencies: [{ currency: 'KEYS', amount: -5n }],
      unlocks: ['u1'],
    };
    const entry = t.buildEntry('openBoxes', 'u', 'r', 12, res);
    expect(entry.operationName).toBe('openBoxes');
    expect(entry.uid).toBe('u');
    expect(entry.requestId).toBe('r');
    expect(entry.latencyMs).toBe(12);
    expect(entry.agg.stacks.count).toBe(2);
    expect(entry.agg.stacks.itemsDelta).toBe(5);
    expect(entry.agg.currencies[0].amount).toBe('-5');
    expect(entry.agg.unlocks.count).toBe(1);
  });

  test('smoke: writes a JSONL line when enabled', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'elog-'));
    const out = path.join(tmp, 'elog.jsonl');
    const t = new TelemetryService({ outPath: out, enabled: true });
    const entry = t.buildEntry('salvage', 'u2', 'r2', 5, {
      scrapped: [{ stackId: 'x', typeId: 'i.x', rarity: 'COMMON', count: 1 }],
      currencies: [{ currency: 'SCRAP', amount: 1n }],
    });
    await t.write(entry);
    const txt = fs.readFileSync(out, 'utf8').trim();
    expect(txt.length).toBeGreaterThan(0);
    const obj = JSON.parse(txt);
    expect(obj.operationName).toBe('salvage');
    expect(obj.uid).toBe('u2');
    expect(obj.requestId).toBe('r2');
  });
});
