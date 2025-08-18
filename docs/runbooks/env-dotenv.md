# env-dotenv

- purpose: Standardize environment configuration via dotenv.
- when: Adding new env vars, integrating scripts, or debugging env loading.

## Summary

Env vars are defined in `.env.example` and loaded via `dotenv`. Copy to `.env` for local dev.
The backend (`src/backend/index.ts`) and scripts (e.g., `scripts/seed-dev.ts`) import `dotenv/config`.
Always document new env vars in `.env.example` and reference them in relevant runbooks.

## Do this

- Copy `.env.example` to `.env` and customize values locally.
- Load env at entry points with `import 'dotenv/config'`.
- Keep `.env` gitignored (see `.gitignore`).
- Use env to gate telemetry (`ELOG_ENABLED`, `ELOG_PATH`) and other behavior.

## Gotchas

- Keep `.env.example` updated as the single source of truth for supported env vars.
- Avoid reading env deep in utility functions; prefer reading once at boundaries and passing options.
- In CI, set vars via the runner (do not commit secrets).

## Related

- file: `.env.example`
- files: `src/backend/index.ts`, `scripts/seed-dev.ts`
