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
      // v1 pack
      boxesV1: readJson(path.join(schemaDir, 'boxes.v1.schema.json')),
      boxV1: readJson(path.join(schemaDir, 'box.v1.schema.json')),
      modifiersStaticV1: readJson(path.join(schemaDir, 'modifiers.static.v1.schema.json')),
      modifiersDynamicV1: readJson(path.join(schemaDir, 'modifiers.dynamic.v1.schema.json')),
      unlocksV1: readJson(path.join(schemaDir, 'unlocks.v1.schema.json')),
      idleV1: readJson(path.join(schemaDir, 'idle.v1.schema.json')),
      itemsV1: readJson(path.join(schemaDir, 'items.v1.schema.json')),
      economyV1: readJson(path.join(schemaDir, 'economy.v1.schema.json')),
    } as const;

    const validators = {
      // v1 pack
      boxesV1: this.ajv.compile(schemas.boxesV1),
      boxV1: this.ajv.compile(schemas.boxV1),
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
    const v1BoxesDir = path.join(this.configDir, 'boxes');
    const v1UnlocksPath = path.join(this.configDir, 'unlocks.json');
    const v1EconomyPath = path.join(this.configDir, 'economy.json');
    const v1IdlePath = path.join(this.configDir, 'idle.json');
    const v1StaticModsPath = path.join(this.configDir, 'modifiers.static.json');
    const v1DynamicModsPath = path.join(this.configDir, 'modifiers.dynamic.json');
    const v1ItemsPath = path.join(this.configDir, 'items.catalog.json');

    const hasV1 = (fs.existsSync(v1BoxesPath) || fs.existsSync(v1BoxesDir)) && fs.existsSync(v1UnlocksPath);

    if (hasV1) {
      type BoxesV1 = { version: number; boxes: unknown[] };
      type UnlocksV1 = { version: number } & Record<string, unknown>;
      type EconomyV1 = { version: number } & Record<string, unknown>;
      type IdleV1 = { version: number } & Record<string, unknown>;
      type ModsStaticV1 = { version: number; modifiers: unknown[] };
      type ModsDynamicV1 = { version: number; modifiers: unknown[] };
      type ItemsV1 = { version: number; items: unknown[] };

      const boxesBlob: unknown = fs.existsSync(v1BoxesPath) ? readJson(v1BoxesPath) : undefined;
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

      let boxes: unknown[] = [];
      let boxesVersion: number | undefined;
      if (boxesBlob) {
        if (!validators.boxesV1(boxesBlob))
          throw new Error('Invalid boxes v1: ' + JSON.stringify(validators.boxesV1.errors));
        const bb = boxesBlob as { version: number; boxes: unknown[] };
        boxes = bb.boxes;
        boxesVersion = bb.version;
      } else {
        // folder form
        const files = fs.existsSync(v1BoxesDir)
          ? fs.readdirSync(v1BoxesDir).filter((f) => f.endsWith('.json'))
          : [];
        for (const f of files) {
          const obj = readJson(path.join(v1BoxesDir, f));
          if (!validators.boxV1(obj)) throw new Error('Invalid box in config/boxes: ' + f);
          boxes.push(obj);
        }
        if (boxes.length === 0) throw new Error('No boxes config found');
      }
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

      const u = unlocksBlob as UnlocksV1;
      const e = economyBlob as EconomyV1;
      const i = idleBlob as IdleV1;
      const ms = staticModsBlob as ModsStaticV1;
      const md = dynamicModsBlob as ModsDynamicV1;
      const it = itemsBlob as ItemsV1;

      const versionNums = [
        boxesVersion,
        (u as any).version,
        (e as any).version,
        (i as any).version,
        ms.version,
        md.version,
        it.version,
      ].filter((v) => typeof v === 'number') as number[];

      return {
        boxes,
        unlocks: u,
        modifiers: { static: ms.modifiers, dynamic: md.modifiers },
        idle: i,
        economy: e,
        items: it.items,
        configVersion: versionNums.length ? Math.max(...versionNums) : 1,
      };
    }
    throw new Error('v1 configs not found');
  }
}
