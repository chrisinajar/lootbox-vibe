# graphql-codegen-execution

- purpose: Make GraphQL code generation deterministic and sandbox-friendly.
- when: Updating `codegen.ts`, adding documents, or seeing concurrency errors.

## Summary

GraphQL codegen runs with concurrency and filesystem operations that can fail in sandboxes.
Set `concurrency: 1` in `codegen.ts` and, when running in restricted environments, execute
`yarn codegen` with elevated permissions. Keep documents globs narrow for speed.

## Do this

- Set `concurrency: 1` in `codegen.ts`.
- Use `documents: ['src/frontend/**/*.graphql', 'src/frontend/**/*.{ts,tsx}']`.
- Run locally: `yarn codegen`.
- In sandboxed shells, re-run with elevated perms if you see `concurrency ... got 0`.

## Gotchas

- Concurrency zero errors indicate the environment has blocked worker allocation.
- Regenerate after schema changes: `src/backend/api/schema.graphql`.
- Keep generated output under `src/frontend/graphql/` (preset client).

## Related

- file: `codegen.ts`
- command: `yarn codegen`
