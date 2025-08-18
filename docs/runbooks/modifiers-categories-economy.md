# modifiers-categories-economy

- purpose: Define COSMETIC vs MECHANICAL static modifiers and enforce economy rules.
- when: Adding new static modifiers, adjusting economy fields, or touching validation.

## Summary

Static modifiers must declare a `category` of either `COSMETIC` or `MECHANICAL`.
Only MECHANICAL mods may carry economic effect fields (e.g., scrap yield or key bonus chance).
Schema validation (config:check) rejects COSMETIC mods that attempt to set `economic`.

## Schema

- file: `config/schema/modifiers.schema.json`
- static items:
  - required: `id`, `category` (`COSMETIC` | `MECHANICAL`)
  - optional: `desc`, `economic` (object)
  - rule: if `category == COSMETIC`, `economic` must not be present

## Examples

- Good:
  - `{ "id": "skin.sparkle", "category": "COSMETIC", "desc": "blue glow" }`
  - `{ "id": "greedy.plus1", "category": "MECHANICAL", "economic": { "scrapYieldMult": 0.01 } }`
- Bad (rejected):
  - `{ "id": "skin.bad", "category": "COSMETIC", "economic": { "scrapYieldMult": 0.1 } }`

## Validation

- Run `yarn config:check` to validate repo configs.
- Unit test: `tests/backend/config-modifiers-validation.test.ts` covers the rule.

## Gotchas

- Keep `config/modifiers/static.json` updated with `category` for every entry.
- Economic fields schema is intentionally narrow; extend carefully and update tests.
