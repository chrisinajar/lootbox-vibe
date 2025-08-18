# config-check

- purpose: Validate repo configs against JSON Schemas and align schema dialects.
- when: Adding new config domains or seeing `JSON.parse`/AJV errors.

## Summary

`yarn config:check` validates all config files under `config/` using Ajv 2020. Keep loader and
the script aligned on the same schema dialect. Ensure new schemas and folders are included.

## Do this

- Use Ajv 2020 in both places:
  - loader: `src/backend/config/index.ts`
  - script: `scripts/config-check.ts`
- Add new schema files to `config/schema/` and commit them.
- Add new config folders (e.g., `economy/`) and include in the script.
- Run `yarn config:check` locally and in CI.

## Gotchas

- Do not edit compiled artifacts. Schemas live in `config/schema/*.json` and are inputs only.
- Generated types live in `src/backend/config/types.d.ts` (see `config-schema-sources`).
- Mismatched schema dialects cause `no schema with key or ref` errors.

## Related

- command: `yarn config:check`
- file: `scripts/config-check.ts`
