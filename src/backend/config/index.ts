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
      // evolving pack
      boxes: readJson(path.join(schemaDir, 'boxes.schema.json')),
      box: readJson(path.join(schemaDir, 'box.schema.json')),
      modifiersStatic: readJson(path.join(schemaDir, 'modifiers.static.schema.json')),
      modifiersDynamic: readJson(path.join(schemaDir, 'modifiers.dynamic.schema.json')),
      unlocks: readJson(path.join(schemaDir, 'unlocks.schema.json')),
      idle: readJson(path.join(schemaDir, 'idle.schema.json')),
      items: readJson(path.join(schemaDir, 'items.schema.json')),
      economy: readJson(path.join(schemaDir, 'economy.schema.json')),
    } as const;

    const validators = {
      boxes: this.ajv.compile(schemas.boxes),
      box: this.ajv.compile(schemas.box),
      modifiersStatic: this.ajv.compile(schemas.modifiersStatic),
      modifiersDynamic: this.ajv.compile(schemas.modifiersDynamic),
      unlocks: this.ajv.compile(schemas.unlocks),
      idle: this.ajv.compile(schemas.idle),
      items: this.ajv.compile(schemas.items),
      economy: this.ajv.compile(schemas.economy),
    } as const;

    // Load data
    // Detect v1 content pack files
    const boxesPath = path.join(this.configDir, 'boxes.json');
    const boxesDir = path.join(this.configDir, 'boxes');
    const unlocksPath = path.join(this.configDir, 'unlocks.json');
    const economyPath = path.join(this.configDir, 'economy.json');
    const idlePath = path.join(this.configDir, 'idle.json');
    const staticModsPath = path.join(this.configDir, 'modifiers.static.json');
    const dynamicModsPath = path.join(this.configDir, 'modifiers.dynamic.json');
    const itemsPath = path.join(this.configDir, 'items.catalog.json');

    const hasConfig =
      (fs.existsSync(boxesPath) || fs.existsSync(boxesDir)) && fs.existsSync(unlocksPath);

    if (hasConfig) {
      type BoxesMany = { version: number; boxes: unknown[] };
      type Unlocks = { version: number } & Record<string, unknown>;
      type Economy = { version: number } & Record<string, unknown>;
      type Idle = { version: number } & Record<string, unknown>;
      type ModsStatic = { version: number; modifiers: unknown[] };
      type ModsDynamic = { version: number; modifiers: unknown[] };
      type Items = { version: number; items: unknown[] };

      const boxesBlob: unknown = fs.existsSync(boxesPath) ? readJson(boxesPath) : undefined;
      const unlocksBlob: unknown = readJson(unlocksPath);
      const economyBlob: unknown = fs.existsSync(economyPath) ? readJson(economyPath) : {};
      const idleBlob: unknown = fs.existsSync(idlePath) ? readJson(idlePath) : {};
      const staticModsBlob: unknown = fs.existsSync(staticModsPath)
        ? readJson(staticModsPath)
        : { version: 1, modifiers: [] };
      const dynamicModsBlob: unknown = fs.existsSync(dynamicModsPath)
        ? readJson(dynamicModsPath)
        : { version: 1, modifiers: [] };
      const itemsBlob: unknown = fs.existsSync(itemsPath)
        ? readJson(itemsPath)
        : { version: 1, items: [] };

      let boxes: unknown[] = [];
      let boxesVersion: number | undefined;
      if (boxesBlob) {
        if (!validators.boxes(boxesBlob))
          throw new Error('Invalid boxes: ' + JSON.stringify(validators.boxes.errors));
        const bb = boxesBlob as BoxesMany;
        boxes = bb.boxes;
        boxesVersion = bb.version;
      } else {
        // folder form
        const files = fs.existsSync(boxesDir)
          ? fs.readdirSync(boxesDir).filter((f) => f.endsWith('.json'))
          : [];
        for (const f of files) {
          const obj = readJson(path.join(boxesDir, f));
          if (!validators.box(obj)) throw new Error('Invalid box in config/boxes: ' + f);
          boxes.push(obj);
        }
        if (boxes.length === 0) throw new Error('No boxes config found');
      }
      if (!validators.unlocks(unlocksBlob))
        throw new Error('Invalid unlocks: ' + JSON.stringify(validators.unlocks.errors));
      if (!validators.economy(economyBlob))
        throw new Error('Invalid economy: ' + JSON.stringify(validators.economy.errors));
      if (!validators.idle(idleBlob))
        throw new Error('Invalid idle: ' + JSON.stringify(validators.idle.errors));
      if (!validators.modifiersStatic(staticModsBlob))
        throw new Error(
          'Invalid static modifiers: ' + JSON.stringify(validators.modifiersStatic.errors),
        );
      if (!validators.modifiersDynamic(dynamicModsBlob))
        throw new Error(
          'Invalid dynamic modifiers: ' + JSON.stringify(validators.modifiersDynamic.errors),
        );
      if (!validators.items(itemsBlob))
        throw new Error('Invalid items: ' + JSON.stringify(validators.items.errors));

      const u = unlocksBlob as Unlocks;
      const e = economyBlob as Economy;
      const i = idleBlob as Idle;
      const ms = staticModsBlob as ModsStatic;
      const md = dynamicModsBlob as ModsDynamic;
      const it = itemsBlob as Items;

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
