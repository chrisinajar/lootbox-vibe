# config-authoring-guide

- purpose: Help authors provide correct, ready-to-ingest content; avoid back-and-forth on shape/semantics.
- when: Any time you add or change content under `config/` (boxes, modifiers, unlocks, economy, idle, items).

## Philosophy

- single evolving schema: We maintain one set of JSON Schemas under `config/schema/*.schema.json`. There are no versioned forks.
- schema as code: If incoming data does not fit, either (a) fix the data to match schema or (b) evolve the schema (prefer additive/optional fields) and update validation/tests.
- correctness first: Schemas are strict (Ajv 2020 + formats, `strict: true`); configs must validate in CI via `yarn config:check`.

## File layout (authorable content)

- boxes: `config/boxes/*.json` (one file per box). Schema: `config/schema/box.schema.json`.
- modifiers:
  - static: `config/modifiers.static.json` (for COSMETIC/MECHANICAL; COSMETIC cannot have `effect`).
  - dynamic: `config/modifiers.dynamic.json`.
- unlocks: `config/unlocks.json` (milestones + rngUnlocks).
- economy: `config/economy.json` (currencies, rarity salvage, box costs, exchanges, limits).
- idle: `config/idle.json` (flavor + variables).
- items catalog: `config/items.catalog.json` (sample set for UI/seed scripts).

Each JSON file should include a `$schema` pointing to the corresponding schema’s `$id` (non-versioned), for example:

```
{
  "$schema": "https://lootboxsim/schemas/box.json",
  "id": "box_cardboard",
  ...
}
```

## Authoring rules of thumb

- ids and naming:
  - use snake case for ids: `box_cardboard`, `itm_rusty_spoon`, `m_scrap_boost_1`.
  - keep ids stable once shipped; prefer adding new ids over renaming.
- additive changes:
  - add new optional fields rather than repurposing existing ones.
  - when adding enumerations, prefer extending enums; avoid breaking existing enum values.
- drop tables:
  - `entries[].type` is one of: `ITEM`, `CURRENCY`, `BOX`, `MATERIAL`.
  - use numeric `weight` and keep totals reasonably scaled (no requirement to sum to 100).
  - ranges: provide `{ "min": X, "max": Y }` for `amount`/`count` when variable; use an integer for fixed values.
- modifiers:
  - COSMETIC must not include `effect` (enforced by schema); MECHANICAL may include `effect` payloads.
  - dynamic modifiers specify `appliesOn`, `formula`, and optional `payout` (e.g., Lucky).
- unlocks:
  - express milestone requirements explicitly (e.g., `OPEN_COUNT` with `boxId` and `count`).
  - encode RNG pity with `baseChanceBp`, `softPity`, `hardPity`, and `resetOnHit`.
- economy:
  - keep box open caps and exchange daily caps in `economy.json`.
  - prefer whole-number precision unless a domain requires decimals (e.g., `GLITTER` with precision 1).

## Evolving the schema

- small additions (preferred):
  - add optional fields with clear names; document intent in the schema `description`.
  - extend enums only when confident the new values are broadly applicable.
- structural changes:
  - if a breaking change is unavoidable, coordinate updates to content and code in the same PR and update tests.
  - keep legacy support out of schema; perform data migration instead.

## Validation workflow (pre‑PR)

1. add/update JSON under `config/` with `$schema` set correctly.
2. run `yarn config:check` to validate all config files against schemas.
3. run `yarn typecheck && yarn test` to ensure code/tests remain green.
4. if schema changed, run `yarn config:types` to refresh generated types used by the backend.

## Examples

- adding a new BOX entry with a variable count:
```
{ "type": "BOX", "weight": 200, "boxId": "box_cardboard", "count": { "min": 2, "max": 5 } }
```

- adding a MECHANICAL static modifier with an effect payload:
```
{ "id": "m_key_boost_2", "name": "KeyBoost2", "category": "MECHANICAL", "effect": { "type": "BONUS_KEY_CHANCE_BP", "valueBp": 20 } }
```

- extending the schema with an optional field (authoring suggestion):
  - propose adding `tag?: string` to `box.entries[].ITEM` for UI filters.
  - update `config/schema/box.schema.json` with an optional `tag` property and description.
  - validate configs and update the loader/tests if used server‑side.

## PR checklist

- config JSONs include `$schema` and validate (`yarn config:check`).
- tests pass and new fields are covered where applicable.
- runbooks/docs updated if semantics or authoring rules changed.
- commit message follows Conventional Commits with a clear body.

