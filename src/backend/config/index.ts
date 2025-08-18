import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export interface LoadedConfig {
  boxes: unknown[];
  items?: unknown[];
  modifiers?: { static?: unknown[]; dynamic?: unknown[] };
  unlocks?: unknown;
  idle?: unknown;
  economy?: unknown;
  configVersion?: number;
}

export class ConfigLoader {
  private ajv: Ajv2020;
  constructor(private configDir = path.resolve(process.cwd(), 'config')) {
    this.ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(this.ajv);
  }

  load(): LoadedConfig {
    const schemaDir = path.join(this.configDir, 'schema');
    const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));

    // Load schemas
    const schemas = {
      // legacy
      boxesLegacy: readJson(path.join(schemaDir, 'boxes.schema.json')),
      modifiersLegacy: readJson(path.join(schemaDir, 'modifiers.schema.json')),
      unlocksLegacy: readJson(path.join(schemaDir, 'unlocks.schema.json')),
      idleLegacy: readJson(path.join(schemaDir, 'flavor.schema.json')),
      itemsLegacy: readJson(path.join(schemaDir, 'items.schema.json')),
      economyLegacy: readJson(path.join(schemaDir, 'economy.schema.json')),
      // v1 pack
      boxesV1: readJson(path.join(schemaDir, 'boxes.v1.schema.json')),
      modifiersStaticV1: readJson(path.join(schemaDir, 'modifiers.static.v1.schema.json')),
      modifiersDynamicV1: readJson(path.join(schemaDir, 'modifiers.dynamic.v1.schema.json')),
      unlocksV1: readJson(path.join(schemaDir, 'unlocks.v1.schema.json')),
      idleV1: readJson(path.join(schemaDir, 'idle.v1.schema.json')),
      itemsV1: readJson(path.join(schemaDir, 'items.v1.schema.json')),
      economyV1: readJson(path.join(schemaDir, 'economy.v1.schema.json')),
    } as const;

    const validators = {
      // legacy
      box: this.ajv.compile(schemas.boxesLegacy.definitions.box),
      modifiers: this.ajv.compile(schemas.modifiersLegacy),
      unlock: this.ajv.compile(schemas.unlocksLegacy.definitions.unlock),
      idle: this.ajv.compile(schemas.idleLegacy),
      items: this.ajv.compile(schemas.itemsLegacy),
      economy: this.ajv.compile(schemas.economyLegacy),
      // v1 pack
      boxesV1: this.ajv.compile(schemas.boxesV1),
      modifiersStaticV1: this.ajv.compile(schemas.modifiersStaticV1),
      modifiersDynamicV1: this.ajv.compile(schemas.modifiersDynamicV1),
      unlocksV1: this.ajv.compile(schemas.unlocksV1),
      idleV1: this.ajv.compile(schemas.idleV1),
      itemsV1: this.ajv.compile(schemas.itemsV1),
      economyV1: this.ajv.compile(schemas.economyV1),
    } as const;

    // Load data
    // Detect v1 content pack files
    const v1BoxesPath = path.join(this.configDir, 'boxes.json');
    const v1UnlocksPath = path.join(this.configDir, 'unlocks.json');
    const v1EconomyPath = path.join(this.configDir, 'economy.json');
    const v1IdlePath = path.join(this.configDir, 'idle.json');
    const v1StaticModsPath = path.join(this.configDir, 'modifiers.static.json');
    const v1DynamicModsPath = path.join(this.configDir, 'modifiers.dynamic.json');
    const v1ItemsPath = path.join(this.configDir, 'items.catalog.json');

    const hasV1 = fs.existsSync(v1BoxesPath) && fs.existsSync(v1UnlocksPath);

    if (hasV1) {
      type BoxesV1 = { version: number; boxes: unknown[] };
      type UnlocksV1 = { version: number } & Record<string, unknown>;
      type EconomyV1 = { version: number } & Record<string, unknown>;
      type IdleV1 = { version: number } & Record<string, unknown>;
      type ModsStaticV1 = { version: number; modifiers: unknown[] };
      type ModsDynamicV1 = { version: number; modifiers: unknown[] };
      type ItemsV1 = { version: number; items: unknown[] };

      const boxesBlob: unknown = readJson(v1BoxesPath);
      const unlocksBlob: unknown = readJson(v1UnlocksPath);
      const economyBlob: unknown = fs.existsSync(v1EconomyPath) ? readJson(v1EconomyPath) : {};
      const idleBlob: unknown = fs.existsSync(v1IdlePath) ? readJson(v1IdlePath) : {};
      const staticModsBlob: unknown = fs.existsSync(v1StaticModsPath)
        ? readJson(v1StaticModsPath)
        : { version: 1, modifiers: [] };
      const dynamicModsBlob: unknown = fs.existsSync(v1DynamicModsPath)
        ? readJson(v1DynamicModsPath)
        : { version: 1, modifiers: [] };
      const itemsBlob: unknown = fs.existsSync(v1ItemsPath)
        ? readJson(v1ItemsPath)
        : { version: 1, items: [] };

      if (!validators.boxesV1(boxesBlob))
        throw new Error('Invalid boxes v1: ' + JSON.stringify(validators.boxesV1.errors));
      if (!validators.unlocksV1(unlocksBlob))
        throw new Error('Invalid unlocks v1: ' + JSON.stringify(validators.unlocksV1.errors));
      if (!validators.economyV1(economyBlob))
        throw new Error('Invalid economy v1: ' + JSON.stringify(validators.economyV1.errors));
      if (!validators.idleV1(idleBlob))
        throw new Error('Invalid idle v1: ' + JSON.stringify(validators.idleV1.errors));
      if (!validators.modifiersStaticV1(staticModsBlob))
        throw new Error(
          'Invalid static modifiers v1: ' + JSON.stringify(validators.modifiersStaticV1.errors),
        );
      if (!validators.modifiersDynamicV1(dynamicModsBlob))
        throw new Error(
          'Invalid dynamic modifiers v1: ' + JSON.stringify(validators.modifiersDynamicV1.errors),
        );
      if (!validators.itemsV1(itemsBlob))
        throw new Error('Invalid items v1: ' + JSON.stringify(validators.itemsV1.errors));

      const b = boxesBlob as BoxesV1;
      const u = unlocksBlob as UnlocksV1;
      const e = economyBlob as EconomyV1;
      const i = idleBlob as IdleV1;
      const ms = staticModsBlob as ModsStaticV1;
      const md = dynamicModsBlob as ModsDynamicV1;
      const it = itemsBlob as ItemsV1;

      const versionNums = [
        b.version,
        (u as any).version,
        (e as any).version,
        (i as any).version,
        ms.version,
        md.version,
        it.version,
      ].filter((v) => typeof v === 'number') as number[];

      return {
        boxes: b.boxes,
        unlocks: u,
        modifiers: { static: ms.modifiers, dynamic: md.modifiers },
        idle: i,
        economy: e,
        items: it.items,
        configVersion: versionNums.length ? Math.max(...versionNums) : 1,
      };
    }

    // Legacy folder-based configs
    const boxesDir = path.join(this.configDir, 'boxes');
    const unlocksDir = path.join(this.configDir, 'unlocks');
    const modifiersDir = path.join(this.configDir, 'modifiers');
    const idleDir = path.join(this.configDir, 'idle');
    const economyDir = path.join(this.configDir, 'economy');

    const boxes = fs
      .readdirSync(boxesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson(path.join(boxesDir, f)));

    const unlocks = fs
      .readdirSync(unlocksDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => readJson(path.join(unlocksDir, f)));

    const modsStatic = readJson(path.join(modifiersDir, 'static.json'));
    const modsDynamic = readJson(path.join(modifiersDir, 'dynamic.json'));
    const modifiers = { static: modsStatic, dynamic: modsDynamic } as any;

    const idle = readJson(path.join(idleDir, 'flavor.json'));
    const economy = readJson(path.join(economyDir, 'economy.json'));

    // Validate legacy
    for (const b of boxes) {
      if (!validators.box(b))
        throw new Error('Invalid box config: ' + JSON.stringify(validators.box.errors));
    }
    for (const u of unlocks) {
      if (!validators.unlock(u))
        throw new Error('Invalid unlock: ' + JSON.stringify(validators.unlock.errors));
    }
    if (!validators.modifiers(modifiers))
      throw new Error('Invalid modifiers: ' + JSON.stringify(validators.modifiers.errors));
    if (!validators.idle(idle))
      throw new Error('Invalid idle config: ' + JSON.stringify(validators.idle.errors));
    if (!validators.economy(economy))
      throw new Error('Invalid economy config: ' + JSON.stringify(validators.economy.errors));

    return {
      boxes,
      unlocks,
      modifiers: modifiers as { static?: unknown[]; dynamic?: unknown[] },
      idle,
      economy,
      configVersion: 1,
    };
  }
}
