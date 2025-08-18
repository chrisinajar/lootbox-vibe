import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

function readJson(p: string) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

describe('Modifiers schema validation', () => {
  test('COSMETIC static mod cannot include economic fields', () => {
    const schemaDir = path.resolve(process.cwd(), 'config/schema');
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const schema = readJson(path.join(schemaDir, 'modifiers.schema.json'));
    const validate = ajv.compile(schema);

    const good = { static: [{ id: 'm.cos', category: 'COSMETIC', desc: 'skin' }], dynamic: [] };
    expect(validate(good)).toBe(true);

    const bad = { static: [{ id: 'm.bad', category: 'COSMETIC', economic: { scrapYieldMult: 0.1 } }], dynamic: [] };
    expect(ajv.validate(schema, bad)).toBe(false);
  });
});

