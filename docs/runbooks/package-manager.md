---
id: package-manager
description: Use Yarn for Node tasks; avoid npm
owner: maintainers
triggers:
  - package.json
  - .nvmrc
  - scripts/**
  - docs/**/*.md
checklist:
  - Use `yarn` commands (`yarn`, `yarn <script>`, `yarn add`)
  - Do not use `npm` or commit `package-lock.json`
  - Prefer `yarn verify` over `npm run check`
  - Update docs/scripts to reference Yarn equivalents
source: runbook
---

Summary: Enforce Yarn as the package manager for consistency and reproducibility.

When to use:

- Adding/removing dependencies, editing `package.json` scripts, writing docs with command examples, or configuring CI to run Node tasks.

Steps:

1. Initialize and install with Yarn: run `yarn install` at repo root.
   - Validate: `yarn --version` works; a `yarn.lock` exists; no `package-lock.json` is added.
2. Use Yarn scripts: run `yarn verify`, `yarn lint:md`, `yarn lint:links` instead of `npm run ...`.
   - Validate: scripts complete successfully; docs reference Yarn commands.
3. Dependencies: use `yarn add <pkg>` / `yarn remove <pkg>`.
   - Validate: `package.json` updates and lockfile changes are committed; CI uses Yarn.

Gotchas:

- Do not name a script `check`; Yarn reserves `yarn check`. Use `verify` (already configured).
- If `package-lock.json` appears, remove it and use Yarn only.
- For ad-hoc CLIs, `npx` is acceptable; if using Yarn 2+, prefer `yarn dlx`.
