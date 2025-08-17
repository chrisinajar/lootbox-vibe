---
id: dependency-management
description: Manage dependencies with Yarn (no manual package.json edits)
owner: eng-foundation
triggers:
  - package.json
  - yarn.lock
  - scripts/**
checklist:
  - Use Yarn commands to add/upgrade/remove deps
  - Do not edit versions directly in package.json
  - Commit updated yarn.lock when deps change
  - Keep versions consistent across scripts and docs
source: runbook
---
Summary: Manage dependencies with Yarn; never hand-edit versions in package.json.

When to use:
- Installing new packages, updating versions, or removing packages
- Fixing security advisories by bumping dependency versions
- Aligning docs/scripts with actual installed versions

Steps:
1) Add a new dependency
   - Prod dep: `yarn add <pkg>@<range>` (e.g., `yarn add @as-integrations/express4@^1.1.2`)
   - Dev dep: `yarn add -D <pkg>@<range>`
2) Upgrade existing dependency
   - Latest compatible in range: `yarn upgrade <pkg>`
   - Bump to latest tag ignoring range: `yarn upgrade -L <pkg>`
   - Constrain range style: add `-E` for exact or `-T` for tilde
3) Remove a dependency
   - `yarn remove <pkg>`
4) Validate
   - `yarn why <pkg>` to confirm resolution
   - `yarn dedupe` (optional) to reduce duplicates
   - Run `yarn typecheck && yarn test && yarn dev` locally
5) Commit
   - Include `package.json` and `yarn.lock` in the same commit

Gotchas:
- Do not edit `package.json` versions by hand; always use Yarn commands
- Keep `yarn.lock` in sync; never delete it casually
- Network-restricted envs may require approval to run Yarn
- Prefer caret ranges (`^`) for libraries unless exact pin is justified
- If multiple workspaces are introduced later, use `-W` to force add at root

Related:
- package-manager (use Yarn, not npm)
