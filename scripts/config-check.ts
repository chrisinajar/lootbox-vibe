import fs from 'node:fs';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const projectRoot = process.cwd();
const configDir = path.join(projectRoot, 'config');
const schemaDir = path.join(configDir, 'schema');

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));

function main() {
  const schemas = {
    box: readJson(path.join(schemaDir, 'box.schema.json')),
    items: readJson(path.join(schemaDir, 'items.schema.json')),
    modifiersStatic: readJson(path.join(schemaDir, 'modifiers.static.schema.json')),
    modifiersDynamic: readJson(path.join(schemaDir, 'modifiers.dynamic.schema.json')),
    unlocks: readJson(path.join(schemaDir, 'unlocks.schema.json')),
    idle: readJson(path.join(schemaDir, 'idle.schema.json')),
    economy: readJson(path.join(schemaDir, 'economy.schema.json')),
  } as const;

  const validators = {
    box: ajv.compile(schemas.box),
    items: ajv.compile(schemas.items),
    modifiersStatic: ajv.compile(schemas.modifiersStatic),
    modifiersDynamic: ajv.compile(schemas.modifiersDynamic),
    unlocks: ajv.compile(schemas.unlocks),
    idle: ajv.compile(schemas.idle),
    economy: ajv.compile(schemas.economy),
  } as const;

  // Validate boxes (per-file)
  const boxesDir = path.join(configDir, 'boxes');
  for (const f of fs.readdirSync(boxesDir).filter((f) => f.endsWith('.json'))) {
    const data = readJson(path.join(boxesDir, f));
    if (!validators.box(data)) {
      throw new Error(`Invalid box ${f}: ${ajv.errorsText(validators.box.errors)}`);
    }
  }

  // Validate modifiers
  const modsStatic = readJson(path.join(configDir, 'modifiers.static.json'));
  if (!validators.modifiersStatic(modsStatic)) {
    throw new Error(
      `Invalid modifiers.static: ${ajv.errorsText(validators.modifiersStatic.errors)}`,
    );
  }
  const modsDynamic = readJson(path.join(configDir, 'modifiers.dynamic.json'));
  if (!validators.modifiersDynamic(modsDynamic)) {
    throw new Error(
      `Invalid modifiers.dynamic: ${ajv.errorsText(validators.modifiersDynamic.errors)}`,
    );
  }

  // Validate unlocks (single file)
  const unlocks = readJson(path.join(configDir, 'unlocks.json'));
  if (!validators.unlocks(unlocks)) {
    throw new Error(`Invalid unlocks: ${ajv.errorsText(validators.unlocks.errors)}`);
  }

  // Validate idle
  const idle = readJson(path.join(configDir, 'idle.json'));
  if (!validators.idle(idle)) {
    throw new Error(`Invalid idle: ${ajv.errorsText(validators.idle.errors)}`);
  }

  // Validate economy
  const economy = readJson(path.join(configDir, 'economy.json'));
  if (!validators.economy(economy)) {
    throw new Error(`Invalid economy: ${ajv.errorsText(validators.economy.errors)}`);
  }

  // Validate items catalog
  const items = readJson(path.join(configDir, 'items.catalog.json'));
  if (!validators.items(items)) {
    throw new Error(`Invalid items: ${ajv.errorsText(validators.items.errors)}`);
  }

  console.log('Config validation passed');
}

main();
