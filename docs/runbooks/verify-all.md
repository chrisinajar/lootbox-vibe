# verify-all

- purpose: Run the full project verification locally and in CI to catch issues across code, docs, schema, and generation steps.
- when: Before commits on larger changes; always before opening a PR; when CI fails with type, codegen, or docs errors.

## Summary

`yarn verify-all` runs a superset of checks in a deterministic order:

1. `yarn docs:config:wiki` — regenerate `docs/config-wiki.md` from `config/` files.
2. `yarn config:types` — regenerate config TypeScript types.
3. `yarn codegen` — regenerate GraphQL client documents and types.
4. `yarn format` — Prettier format all tracked files.
5. `yarn lint` — ESLint across `src`, `scripts`, and `tests` (zero warnings).
6. `yarn config:check` — schema-validate all config JSON against Ajv 2020.
7. `yarn typecheck` — compile TypeScript (no emit) across repo.
8. `yarn test` — run Jest suites.
9. `yarn verify` — Markdown lint and link checks for docs.

## Gotchas

- Node types: TS scripts that import `node:fs`/`node:path` require `@types/node` and `"node"` in `tsconfig.json` `types`.
- GraphQL codegen concurrency: in sandboxes, set `CODEGEN_CONCURRENCY=1` (already in script). If still failing, check for filesystem/network restrictions.
- Sandbox restrictions: When running in a restricted environment, request elevated permissions for `yarn verify-all` so codegen/tests can access the filesystem and subprocesses. If the run fails due to sandboxing, re-run with approval.
- Markdown lint rules: Headings and tables must have blank lines above and below. Generators should insert spacing; if not, fix the generator rather than the output file.
- Link check: External links can be flaky; prefer stable references and relative links. If link checks fail, validate the URL or add a more stable source.
- Long runs/timeouts: `verify-all` aggregates many steps; allow extra time locally/CI. Avoid running separate ad-hoc commands unless debugging a specific failure.

## Do this

- Ensure you ran `nvm use` (respects `.nvmrc`).
- Run `yarn` once to install dependencies.
- Run `yarn verify-all` and fix failures in-place (not by disabling checks).
- When codegen/schema changes: re-run `yarn codegen` before pushing to reduce CI churn.

## Related

- scripts: `scripts/generate-config-wiki.ts`, `scripts/config-check.ts`, `scripts/generate-types.ts`
- config: `config/schema/*.json`, `config/*.json`
- graphql: `codegen.ts`, `src/frontend/queries/*.graphql`, `src/backend/api/schema.graphql`
- runbooks: `docs-verify`, `graphql-codegen-execution`, `config-check`
