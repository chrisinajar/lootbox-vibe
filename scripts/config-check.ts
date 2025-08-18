import path from 'node:path';
import fs from 'node:fs';
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
    boxes: readJson(path.join(schemaDir, 'boxes.schema.json')),
    items: readJson(path.join(schemaDir, 'items.schema.json')),
    modifiers: readJson(path.join(schemaDir, 'modifiers.schema.json')),
    unlocks: readJson(path.join(schemaDir, 'unlocks.schema.json')),
    idle: readJson(path.join(schemaDir, 'flavor.schema.json')),
    economy: readJson(path.join(schemaDir, 'economy.schema.json')),
  } as const;

  const validators = {
    box: ajv.compile(schemas.boxes.definitions.box),
    items: ajv.compile(schemas.items),
    modifiers: ajv.compile(schemas.modifiers),
    unlock: ajv.compile(schemas.unlocks.definitions.unlock),
    idle: ajv.compile(schemas.idle),
    economy: ajv.compile(schemas.economy),
  } as const;

  // Validate boxes
  const boxesDir = path.join(configDir, 'boxes');
  for (const f of fs.readdirSync(boxesDir).filter((f) => f.endsWith('.json'))) {
    const data = readJson(path.join(boxesDir, f));
    if (!validators.box(data)) {
      throw new Error(`Invalid box ${f}: ${ajv.errorsText(validators.box.errors)}`);
    }
  }

  // Validate modifiers
  const modifiersDir = path.join(configDir, 'modifiers');
  const mods = {
    static: readJson(path.join(modifiersDir, 'static.json')),
    dynamic: readJson(path.join(modifiersDir, 'dynamic.json')),
  };
  if (!validators.modifiers(mods)) {
    throw new Error(`Invalid modifiers: ${ajv.errorsText(validators.modifiers.errors)}`);
  }

  // Validate unlocks
  const unlocksDir = path.join(configDir, 'unlocks');
  for (const f of fs.readdirSync(unlocksDir).filter((f) => f.endsWith('.json'))) {
    const data = readJson(path.join(unlocksDir, f));
    if (!validators.unlock(data)) {
      throw new Error(`Invalid unlock ${f}: ${ajv.errorsText(validators.unlock.errors)}`);
    }
  }

  // Validate idle
  const idleDir = path.join(configDir, 'idle');
  const idle = readJson(path.join(idleDir, 'flavor.json'));
  if (!validators.idle(idle)) {
    throw new Error(`Invalid idle: ${ajv.errorsText(validators.idle.errors)}`);
  }

  // Validate economy
  const economyDir = path.join(configDir, 'economy');
  const economy = readJson(path.join(economyDir, 'economy.json'));
  if (!validators.economy(economy)) {
    throw new Error(`Invalid economy: ${ajv.errorsText(validators.economy.errors)}`);
  }

  // eslint-disable-next-line no-console
  console.log('Config validation passed');
}

main();
