# Repository Guidelines

## Project Structure & Module Organization
- Primary content lives in `docs/` (specs, architecture, references). See: `docs/product-spec-v1.md`, `docs/inventory-architecture-tech-brief.md`, `docs/technical-reference.md`.
- Node version is pinned via `.nvmrc`. Future code layout: `src/` (impl), `tests/` (unit/integration), `scripts/` (tooling), `docs/` (docs).

## Runbooks
- Always consult runbooks before changes: open `docs/runbooks/` and identify 1–3 relevant runbooks by topic or file globs.
- Start with the index: see `docs/runbooks/index.md` for a concise list of runbooks with summaries and when to use them. From the index, choose those whose globs/area/owner match your change.
- During planning, add a step to consult runbooks and name which ones you used (by `id`/filename). If none apply, state that explicitly.
- During implementation, reference runbooks by `id` and follow their checklists. If a runbook contradicts a general guideline, prefer the runbook.
- Create/update runbooks when you discover repeatable workflows or gotchas: `yarn agent:runbook:new <id> "Title"` (e.g., `yarn agent:runbook:new config-dotenv "Load .env correctly"`). Then add a brief entry to `docs/runbooks/index.md`.

## Build, Test, and Development Commands
- Node setup: `nvm use` (respects `.nvmrc`).
- Docs lint: `yarn lint:md` (Markdown style) and `yarn lint:links` (broken links). Run both: `yarn verify`.
- No build step exists yet; wire tooling into CI as it’s introduced.

## Coding Style & Naming Conventions
- Markdown: sentence case headings, single `#` H1, ~100‑char line wrap, `-` bullets, code/paths in backticks.
- Filenames: `kebab-case.md` (e.g., `data-scientist-notes-v1.md`). Group by subfolder when needed.
- JS/TS (when added): 2‑space indent, single quotes, trailing commas where valid; Prettier + ESLint defaults.

## Testing Guidelines
- Docs: keep examples copy‑pastable; prefer relative links; validate with link checker.
- Code (when added): tests in `tests/`; name `*.test.{ts,js}`; focus on core logic.

## Commit & Pull Request Guidelines
- Commits: use Conventional Commits (e.g., `docs: refine technical reference`, `feat: add inventory schema draft`). Keep changes focused; reference issues with `#123`.
- PRs: include purpose, summary of changes, and affected areas. Add screenshots or before/after snippets for significant doc updates. Require at least one review and resolve comments before merge.

## Security & Configuration Tips
- Do not commit secrets or tokens. When code is added, store local config in env files excluded by `.gitignore`.
- Prefer internal references; vet external links in `docs/` for accuracy and longevity.
