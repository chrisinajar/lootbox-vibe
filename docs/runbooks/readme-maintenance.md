id: readme-maintenance
description: Keep README accurate with docs-first changes and Yarn workflow
owner: maintainers
triggers:

- README.md
- package.json
- docs/\*_/_
- scripts/\*_/_
  checklist:
- README reflects docs-first structure and links to `docs/runbooks/index.md`
- Getting started is correct: `nvm use`, `yarn verify`
- Commands and paths use backticks and relative links
- Sections updated when structure/scripts change (project structure, contributing, scripts)
- `yarn verify` passes; README links resolve
  source: runbook

---

Summary: Keep the top-level README current as the single entry point to docs and workflow.

When to use:

- You change `docs/` structure, add/remove scripts, or alter Node/Yarn setup.
- You touch onboarding instructions or contribution process.

Steps:

1. Review current onboarding: ensure `nvm use` and `yarn verify` are present and accurate.
2. Sync sections:
   - Project structure: reflect `docs/`, `scripts/`, and any `src/`/`tests/` additions.
   - Contributing: reference `CONTRIBUTING.md` and runbooks index.
   - Scripts: mention key Yarn scripts from `package.json`.
3. Validate links:
   - Prefer relative links (e.g., `docs/runbooks/index.md`).
   - Run `yarn verify` to lint Markdown and check links.
4. Style pass:
   - Sentence case headings, ~100-char wrap, `-` bullets, code/paths in backticks.
5. Land the change with a Conventional Commit (e.g., `docs: update readme onboarding`).

Gotchas:

- Do not reference `npm`; use Yarn commands (see `package-manager` runbook).
- Keep README concise; deep details belong in `docs/`.
- Preserve Markdown hard breaks where intentional; `.editorconfig` already disables trimming in `*.md`.
