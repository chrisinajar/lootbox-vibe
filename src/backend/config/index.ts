import fs from 'node:fs';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface LoadedConfig {
  boxes: unknown[];
  items?: unknown[];
  modifiers?: { static?: unknown; dynamic?: unknown };
  unlocks?: unknown[];
  idle?: unknown;
}

export class ConfigLoader {
  private ajv: Ajv;
  constructor(private configDir = path.resolve(process.cwd(), 'config')) {
    this.ajv = new Ajv({ allErrors: true, strict: true });
    addFormats(this.ajv);
  }

  load(): LoadedConfig {
    const schemaDir = path.join(this.configDir, 'schema');
    const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));

    // Load schemas
    const schemas = {
      boxes: readJson(path.join(schemaDir, 'boxes.schema.json')),
      modifiers: readJson(path.join(schemaDir, 'modifiers.schema.json')),
      unlocks: readJson(path.join(schemaDir, 'unlocks.schema.json')),
      idle: readJson(path.join(schemaDir, 'idle.schema.json')),
      items: readJson(path.join(schemaDir, 'items.schema.json')),
    } as const;

    const validators = {
      box: this.ajv.compile(schemas.boxes.definitions.box),
      modifiers: this.ajv.compile(schemas.modifiers),
      unlock: this.ajv.compile(schemas.unlocks.definitions.unlock),
      idle: this.ajv.compile(schemas.idle),
      items: this.ajv.compile(schemas.items),
    } as const;

    // Load data
    const boxesDir = path.join(this.configDir, 'boxes');
    const unlocksDir = path.join(this.configDir, 'unlocks');
    const modifiersDir = path.join(this.configDir, 'modifiers');
    const idleDir = path.join(this.configDir, 'idle');

    const boxes = fs
      .readdirSync(boxesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson(path.join(boxesDir, f)));

    const unlocks = fs
      .readdirSync(unlocksDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson(path.join(unlocksDir, f)));

    const modifiers = {
      static: readJson(path.join(modifiersDir, 'static.json')),
      dynamic: readJson(path.join(modifiersDir, 'dynamic.json')),
    };

    const idle = readJson(path.join(idleDir, 'flavor.json'));

    // Validate
    for (const b of boxes) {
      if (!validators.box(b)) throw new Error('Invalid box config: ' + JSON.stringify(validators.box.errors));
    }
    for (const u of unlocks) {
      if (!validators.unlock(u)) throw new Error('Invalid unlock: ' + JSON.stringify(validators.unlock.errors));
    }
    if (!validators.modifiers(modifiers)) throw new Error('Invalid modifiers: ' + JSON.stringify(validators.modifiers.errors));
    if (!validators.idle(idle)) throw new Error('Invalid idle config: ' + JSON.stringify(validators.idle.errors));

    return { boxes, unlocks, modifiers, idle };
  }
}

