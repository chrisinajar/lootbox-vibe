# Lootbox simulator

Docs‑first repository for a browser‑based lootbox/idle collection game. Primary content lives
in `docs/` (product spec, architecture, and references). Implementation code will be added under
`src/` with tests in `tests/` as we begin building features.

## Getting started

- Use Node version from `.nvmrc`:
  - `nvm use`
- Use Yarn for any Node tasks (see runbook `package-manager`):
  - `yarn --version` to verify Yarn is available
  - `yarn verify` to lint docs and check links

## Project structure

- `docs/`: specs, architecture briefs, technical reference, runbooks (start at
  `docs/runbooks/index.md`).
- `scripts/`: repository tooling (e.g., runbook generator).
- `src/`: application code (to be added).
- `tests/`: unit/integration tests (to be added).
- `.nvmrc`: pinned Node version.
- `package.json`: scripts for docs linting and utilities.

## Contributing

- Start with the runbooks index: `docs/runbooks/index.md`.
- Follow the `package-manager` runbook: use Yarn, avoid npm; prefer `yarn verify`.
- Use Conventional Commits (e.g., `docs: refine technical reference`,
  `feat: add inventory schema draft`).
- Before opening a PR, run: `nvm use` and `yarn verify`.
- See `CONTRIBUTING.md` for the checklist and PR expectations.

## Security and configuration

- Do not commit secrets or tokens; future code should load local config from env files excluded by
  `.gitignore`.

## License

- License to be determined.
