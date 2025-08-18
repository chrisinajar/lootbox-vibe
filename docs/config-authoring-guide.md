# Configuration Authoring Guide

Audience: content authors providing game config under `config/`.

Goal: help you deliver correct, ready‑to‑ingest JSON with minimal back‑and‑forth. Our backend validates all configs against a single, evolving JSON Schema set. If your data doesn’t fit, we either (a) adjust the data to match the schema or (b) evolve the schema (prefer optional, additive fields) and update validation/tests.

## Files you author

- Boxes (one file per box): `config/boxes/*.json` — schema `$id`: `https://lootboxsim/schemas/box.json`
- Modifiers (two files):
  - Static: `config/modifiers.static.json` — `$id`: `https://lootboxsim/schemas/modifiers.static.json`
  - Dynamic: `config/modifiers.dynamic.json` — `$id`: `https://lootboxsim/schemas/modifiers.dynamic.json`
- Unlocks: `config/unlocks.json` — `$id`: `https://lootboxsim/schemas/unlocks.json`
- Economy: `config/economy.json` — `$id`: `https://lootboxsim/schemas/economy.json`
- Idle flavor: `config/idle.json` — `$id`: `https://lootboxsim/schemas/idle.json`
- Items catalog: `config/items.catalog.json` — `$id`: `https://lootboxsim/schemas/items.json`

Each file should begin with a `$schema` property pointing to the schema `$id` listed above.

## IDs and naming

- Use snake_case IDs: `box_cardboard`, `itm_rusty_spoon`, `m_scrap_boost_1`.
- IDs are stable once shipped; prefer adding new IDs over renaming.

## Boxes: drop tables

- Entry types: `ITEM`, `CURRENCY`, `BOX`, `MATERIAL`.
- `weight` is an integer; totals need not sum to 100.
- Ranges: use `{ "min": X, "max": Y }` for variable `amount`/`count`, or a single integer for fixed.
- Self‑drop rules per box: `forbidSelfDrop` and `selfDropCap`.

Minimal example (per file in `config/boxes/`):

```
{
  "$schema": "https://lootboxsim/schemas/box.json",
  "id": "box_cardboard",
  "name": "Cardboard Box",
  "tier": 1,
  "keyCost": 0,
  "forbidSelfDrop": false,
  "selfDropCap": 1,
  "dropTable": {
    "rolls": 1,
    "entries": [
      { "type": "ITEM", "weight": 4500, "itemId": "itm_rusty_spoon", "rarity": "COMMON" },
      { "type": "CURRENCY", "weight": 400, "currency": "KEYS", "amount": { "min": 1, "max": 1 } },
      { "type": "BOX", "weight": 500, "boxId": "box_cardboard", "count": 1 }
    ]
  }
}
```

## Modifiers

- Static modifiers:
  - `category` is `COSMETIC` or `MECHANICAL`.
  - COSMETIC must not include `effect`.
  - MECHANICAL may include `effect` payloads (e.g., `SCRAP_MULTIPLIER`, `BONUS_KEY_CHANCE_BP`).
- Dynamic modifiers:
  - Define `appliesOn`, a `formula` (e.g., `LINEAR_PER_COUNTER`), and optional `payout` (e.g., Lucky’s `BONUS_KEYS`).

## Unlocks

- Milestones: explicit requirements like `{ "type": "OPEN_COUNT", "boxId": "box_cardboard", "count": 50 }` and unlocks like `{ "kind": "BOX_TYPE", "boxId": "box_wooden" }`.
- RNG unlocks: configure `baseChanceBp`, `softPity` (start, delta, cap), `hardPity`, and `resetOnHit`.

## Economy

- Define currencies and their precision; rarity salvage values; `boxCosts` overrides; exchange rates and daily caps; `batchOpenLimits`.

## Items catalog

- Small representative set to drive seed scripts and UI previews; includes `id`, `name`, `typeId`, `rarity`, `scrap`, and optional `allowedStaticMods`.

## Evolving the schema

- Prefer additive, optional fields to maintain compatibility.
- If a breaking change is unavoidable, coordinate changes to data + code + tests in one change set.
- Avoid versioned schemas; we keep one authoritative schema per domain and evolve it.

## Quick checklist (before sending data)

- Add `$schema` to every file you edit.
- Use snake_case IDs that match existing conventions.
- Validate locally (we run these in CI):
  - `yarn config:check` (schema validation)
  - `yarn typecheck && yarn test` (code/tests)

If you need new fields or behaviors, propose them; we’ll evolve the schema together (and keep the docs updated).
