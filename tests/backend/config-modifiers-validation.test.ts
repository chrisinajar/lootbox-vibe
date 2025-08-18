import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

function readJson(p: string) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

describe('Modifiers schema validation', () => {
  test('COSMETIC static mod cannot include economic fields', () => {
    const schemaDir = path.resolve(process.cwd(), 'config/schema');
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const schema = readJson(path.join(schemaDir, 'modifiers.static.schema.json'));
    const validate = ajv.compile(schema);

    const good = { version: 1, modifiers: [{ id: 'm.cos', name: 'Cos', category: 'COSMETIC' }] };
    expect(validate(good)).toBe(true);

    const bad = {
      version: 1,
      modifiers: [
        {
          id: 'm.bad',
          name: 'Bad',
          category: 'COSMETIC',
          effect: { type: 'SCRAP_MULTIPLIER', valuePct: 1 },
        },
      ],
    };
    expect(ajv.validate(schema, bad)).toBe(false);
  });
});
