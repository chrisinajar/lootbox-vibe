# Contributing

Thank you for helping improve Lootbox Simulator. This repository is docs‑first; please align with
the guidelines below to keep contributions consistent and easy to review.

## Before you start

- Read the runbooks index: `docs/runbooks/index.md`.
- Follow `package-manager` runbook: use Yarn for Node tasks; avoid npm.
- Use the pinned Node version: `nvm use`.

## Development workflow

- Lint docs and check links locally:
  - `yarn verify`
- Keep examples copy‑pastable and prefer relative links in docs.
- Follow repository structure: docs in `docs/`; future code in `src/` with tests in `tests/`.

## Commit and PR guidelines

- Use Conventional Commits (e.g., `docs: refine technical reference`,
  `feat: add inventory schema draft`).
- Keep changes focused; reference issues with `#123` when applicable.
- PRs should include purpose, summary of changes, affected areas, and (for significant doc updates)
  before/after snippets or screenshots.
- Run `yarn verify` before opening a PR; address any lint or link issues.

## Security and configuration

- Do not commit secrets or tokens. Store local config in env files excluded by `.gitignore`.

## Need a new runbook?

- If you discover a repeatable workflow or gotcha, add a runbook:
  - `yarn agent:runbook:new <id> "Title"`
  - Then add a brief entry to `docs/runbooks/index.md`.

