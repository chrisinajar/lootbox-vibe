# config-schema-sources

- purpose: Prevent editing generated artifacts; clarify schema vs. generated types and how to validate.
- when: Any changes to `config/schema`, adding new config domains, or when seeing schema files overwritten.

## Summary

Config JSON Schemas in `config/schema/*.schema.json` are the source of truth. TypeScript types are generated from these schemas into `src/backend/config/types.d.ts` via `yarn config:types`. Never edit generated outputs or pipe generators to overwrite the schema files.

## Triggers

- Adding a new config domain (e.g., `economy`).
- Updating existing schemas (boxes/modifiers/unlocks/idle/items).
- Failing tests mentioning JSON.parse on schema files or stray TypeScript content in `config/schema`.

## Do this

- Edit schemas under `config/schema/*.schema.json` only.
- Generate TS types from schemas:
  - `yarn config:types`
- Validate repo configs:
  - `yarn config:check`
- Wire new schema in loader (`src/backend/config/index.ts`) and in `scripts/config-check.ts`.

## Never do this

- Do not hand-edit `src/backend/config/types.d.ts` (generated).
- Do not overwrite `config/schema/*.schema.json` with TypeScript or generator output.
- Do not point generators at `config/schema` as an output path.

## Gotchas

- If you see a schema file containing TS (e.g., `/* auto-generated ... */` or `export interface ...`), it was overwritten. Restore the JSON Schema from Git and re-run `yarn config:types` to regenerate types instead.
- Ensure `scripts/config-check.ts` includes any newly added schema (e.g., `economy`) so CI fails fast when files drift or shape is wrong.

## Related

- scripts: `config:types`, `config:check`
- loader: `src/backend/config/index.ts`
