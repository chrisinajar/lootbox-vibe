import { describe, it, expect } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ConfigLoader } from '../../src/backend/config/index';

describe('ConfigService validation', () => {
  it('validates good JSON configs', () => {
    const loader = new ConfigLoader(path.resolve(process.cwd(), 'config'));
    expect(() => loader.load()).not.toThrow();
  });

  it('rejects bad JSON configs', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
    // Create required subdirs
    const dirs = ['boxes', 'unlocks', 'modifiers', 'idle', 'schema'];
    for (const d of dirs) fs.mkdirSync(path.join(tmp, d));
    // Copy schemas from repo so ajv compiles
    const schemaSrc = path.resolve(process.cwd(), 'config/schema');
    for (const f of fs.readdirSync(schemaSrc)) {
      fs.copyFileSync(path.join(schemaSrc, f), path.join(tmp, 'schema', f));
    }
    // Write invalid files: missing required fields / wrong shape
    fs.writeFileSync(
      path.join(tmp, 'boxes', 'bad.json'),
      JSON.stringify({ id: 'box.bad', name: 'Bad box' }),
    );
    fs.writeFileSync(
      path.join(tmp, 'unlocks', 'bad.json'),
      JSON.stringify({ id: 'unlock.bad', name: 'Bad' }),
    );
    fs.writeFileSync(path.join(tmp, 'modifiers', 'static.json'), JSON.stringify({ foo: 'bar' }));
    fs.writeFileSync(path.join(tmp, 'modifiers', 'dynamic.json'), JSON.stringify([]));
    fs.writeFileSync(path.join(tmp, 'idle', 'flavor.json'), JSON.stringify({ flavors: [] }));

    const loader = new ConfigLoader(tmp);
    expect(() => loader.load()).toThrow();
  });
});
