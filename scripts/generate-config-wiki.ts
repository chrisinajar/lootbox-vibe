import fs from 'node:fs';
import path from 'node:path';

type Json = any;

function readJson(p: string): Json {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function exists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function fmtRange(v: any): string {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object' && typeof v.min !== 'undefined' && typeof v.max !== 'undefined') {
    return `${v.min}–${v.max}`;
  }
  return String(v);
}

function h(n: number, text: string) {
  return `${'#'.repeat(n)} ${text}`;
}

function main() {
  const root = process.cwd();
  const cfgDir = path.join(root, 'config');

  // Load content files
  const boxesDir = path.join(cfgDir, 'boxes');
  const boxesJson = path.join(cfgDir, 'boxes.json');
  let boxes: any[] = [];
  if (exists(boxesDir)) {
    const files = fs.readdirSync(boxesDir).filter((f) => f.endsWith('.json'));
    boxes = files.map((f) => readJson(path.join(boxesDir, f)));
  } else if (exists(boxesJson)) {
    const blob = readJson(boxesJson);
    boxes = Array.isArray(blob?.boxes) ? blob.boxes : [];
  }
  const economy = exists(path.join(cfgDir, 'economy.json')) ? readJson(path.join(cfgDir, 'economy.json')) : {};
  const unlocks = exists(path.join(cfgDir, 'unlocks.json')) ? readJson(path.join(cfgDir, 'unlocks.json')) : {};
  const modsStatic = exists(path.join(cfgDir, 'modifiers.static.json'))
    ? readJson(path.join(cfgDir, 'modifiers.static.json'))
    : { modifiers: [] };
  const modsDynamic = exists(path.join(cfgDir, 'modifiers.dynamic.json'))
    ? readJson(path.join(cfgDir, 'modifiers.dynamic.json'))
    : { modifiers: [] };
  const idle = exists(path.join(cfgDir, 'idle.json')) ? readJson(path.join(cfgDir, 'idle.json')) : {};
  const items = exists(path.join(cfgDir, 'items.catalog.json')) ? readJson(path.join(cfgDir, 'items.catalog.json')) : { items: [] };

  // Build markdown
  const out: string[] = [];
  out.push(h(1, 'Game Configuration Reference (Generated)'));
  out.push('');
  out.push(`Generated at: ${new Date().toISOString()}`);
  out.push('This document is generated from files in the `config/` directory. Do not edit by hand.');
  out.push('');

  // Economy
  out.push(h(2, 'Economy'));
  if (Array.isArray(economy.currencies)) {
    out.push(h(3, 'Currencies'));
    out.push('| id | display | precision |');
    out.push('|---|---|---:|');
    for (const c of economy.currencies) out.push(`| ${c.id} | ${c.display} | ${c.precision ?? 0} |`);
    out.push('');
  }
  if (economy.raritySalvage) {
    out.push(h(3, 'Rarity Salvage'));
    out.push('');
    for (const [r, v] of Object.entries(economy.raritySalvage)) out.push(`- ${r}: ${v}`);
    out.push('');
  }
  if (economy.boxCosts) {
    out.push(h(3, 'Box Costs'));
    out.push('');
    for (const [b, v] of Object.entries(economy.boxCosts)) out.push(`- ${b}: ${v}`);
    out.push('');
  }
  if (Array.isArray(economy.exchanges)) {
    out.push(h(3, 'Exchanges'));
    for (const ex of economy.exchanges) {
      out.push(`- ${ex.id}: ${ex.from} -> ${ex.to} at ${ex.rate?.from}:${ex.rate?.to} (daily cap to = ${ex.dailyCapTo ?? 0})`);
    }
    out.push('');
  }
  if (economy.batchOpenLimits) {
    out.push(h(3, 'Batch Open Limits'));
    out.push(`- maxPerRequest: ${economy.batchOpenLimits.maxPerRequest}`);
    out.push('');
  }

  // Boxes
  out.push(h(2, 'Boxes'));
  const boxesSorted = [...boxes].sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0) || String(a.name).localeCompare(String(b.name)));
  for (const b of boxesSorted) {
    out.push(h(3, `${b.name} (${b.id})`));
    out.push(`- tier: ${b.tier}`);
    out.push(`- keyCost: ${b.keyCost}`);
    if (typeof b.forbidSelfDrop === 'boolean') out.push(`- forbidSelfDrop: ${b.forbidSelfDrop}`);
    if (typeof b.selfDropCap === 'number') out.push(`- selfDropCap: ${b.selfDropCap}`);
    const dt = b.dropTable;
    if (dt && Array.isArray(dt.entries)) {
      out.push('');
      out.push('Entries:');
      out.push('| type | weight | details |');
      out.push('|---|---:|---|');
      for (const e of dt.entries) {
        let details = '';
        if (e.type === 'ITEM') details = `itemId=${e.itemId} rarity=${e.rarity}`;
        else if (e.type === 'CURRENCY') details = `currency=${e.currency} amount=${fmtRange(e.amount)}`;
        else if (e.type === 'BOX') details = `boxId=${e.boxId} count=${fmtRange(e.count)}`;
        else if (e.type === 'MATERIAL') details = `materialId=${e.materialId} amount=${fmtRange(e.amount)}`;
        out.push(`| ${e.type} | ${e.weight} | ${details} |`);
      }
      out.push('');
    }
  }

  // Unlocks
  out.push(h(2, 'Unlocks'));
  if (Array.isArray(unlocks.milestones)) {
    out.push(h(3, 'Milestones'));
    for (const m of unlocks.milestones) {
      out.push(`- ${m.id}:`);
      if (Array.isArray(m.requirements)) out.push(`  - requirements: ${m.requirements.map((r: any) => `${r.type}${r.boxId ? `(${r.boxId})` : ''}:${r.count ?? ''}`).join(', ')}`);
      if (Array.isArray(m.unlocks)) out.push(`  - unlocks: ${m.unlocks.map((u: any) => `${u.kind}:${u.boxId ?? ''}`).join(', ')}`);
      if (Array.isArray(m.rewards)) out.push(`  - rewards: ${m.rewards.map((r: any) => `${r.type}:${r.currency ?? ''}+${r.amount ?? ''}`).join(', ')}`);
    }
    out.push('');
  }
  if (Array.isArray(unlocks.rngUnlocks)) {
    out.push(h(3, 'RNG Unlocks'));
    for (const r of unlocks.rngUnlocks) {
      out.push(`- ${r.id}: scope=${r.scope?.boxType ?? 'global'} baseChanceBp=${r.baseChanceBp}`);
      if (r.softPity) out.push(`  - softPity: startAt=${r.softPity.startAt} deltaBpPerTry=${r.softPity.deltaBpPerTry} capBp=${r.softPity.capBp}`);
      if (r.hardPity) out.push(`  - hardPity: guaranteeAt=${r.hardPity.guaranteeAt}`);
      out.push(`  - resetOnHit: ${r.resetOnHit ? 'true' : 'false'}`);
    }
    out.push('');
  }

  // Modifiers
  out.push(h(2, 'Modifiers'));
  if (Array.isArray(modsStatic.modifiers)) {
    out.push(h(3, 'Static'));
    const byCat = new Map<string, any[]>();
    for (const m of modsStatic.modifiers) {
      const k = m.category ?? 'UNKNOWN';
      byCat.set(k, [...(byCat.get(k) ?? []), m]);
    }
    for (const [cat, list] of byCat.entries()) {
      out.push(h(4, cat));
      for (const m of list) {
        out.push(`- ${m.id} — ${m.name}${m.effect ? ` (effect: ${m.effect.type})` : ''}`);
      }
    }
    out.push('');
  }
  if (Array.isArray(modsDynamic.modifiers)) {
    out.push(h(3, 'Dynamic'));
    for (const m of modsDynamic.modifiers) {
      out.push(`- ${m.id} — ${m.name}`);
      if (Array.isArray(m.appliesOn)) out.push(`  - appliesOn: ${m.appliesOn.join(', ')}`);
      if (m.formula) out.push(`  - formula: ${m.formula.type}`);
      if (m.payout) out.push(`  - payout: ${m.payout.type}${m.payout.maxPerRequest ? ` (maxPerRequest=${m.payout.maxPerRequest})` : ''}`);
    }
    out.push('');
  }

  // Items
  if (Array.isArray(items.items)) {
    out.push(h(2, 'Items Catalog'));
    const byRarity = new Map<string, any[]>();
    for (const it of items.items) byRarity.set(it.rarity ?? 'UNKNOWN', [...(byRarity.get(it.rarity ?? 'UNKNOWN') ?? []), it]);
    const order = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
    for (const rare of order) {
      const list = byRarity.get(rare) ?? [];
      if (list.length === 0) continue;
      out.push(h(3, rare));
      out.push('| id | name | type | scrap | mods |');
      out.push('|---|---|---|---:|---|');
      for (const it of list) {
        const mods = Array.isArray(it.allowedStaticMods) ? it.allowedStaticMods.join(', ') : '';
        out.push(`| ${it.id} | ${it.name} | ${it.typeId} | ${it.scrap ?? 0} | ${mods} |`);
      }
      out.push('');
    }
  }

  // Idle flavor
  out.push(h(2, 'Idle Flavor'));
  if (idle.catchUp) {
    out.push(`- catchUp.enabled: ${Boolean(idle.catchUp.enabled)}`);
    if (typeof idle.catchUp.capHours === 'number') out.push(`- catchUp.capHours: ${idle.catchUp.capHours}`);
    if (idle.catchUp.strategy) out.push(`- catchUp.strategy: ${idle.catchUp.strategy}`);
  }
  if (Array.isArray(idle.flavor)) {
    out.push(h(3, 'Flavor lines'));
    for (const s of idle.flavor) out.push(`- ${s}`);
  }

  out.push('');
  out.push('_End of generated content._');

  const outPath = path.join(root, 'docs', 'config-wiki.md');
  fs.writeFileSync(outPath, out.join('\n'), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath}`);
}

main();

