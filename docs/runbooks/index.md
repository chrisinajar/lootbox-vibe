# Runbooks Index

This index lists all runbooks with brief descriptions and when to use them. Choose 1–3 most relevant for your change.

Format:

- id: short summary — when to use

Runbooks:

- package-manager: Use Yarn for Node tasks; avoid npm — when editing package.json/scripts, installing deps, or writing CI/docs that run Node commands.
- readme-maintenance: Keep README accurate with docs-first structure and Yarn workflow — when changing docs structure, scripts, or onboarding steps.
- dependency-management: Manage dependencies with Yarn; never hand-edit versions — when adding/upgrading/removing packages or resolving advisories.
- commit-messages: Write clean Conventional Commit messages — when composing multi-line messages or amending bad ones.
- dev-user-switcher: Quickly switch API user in dev via badge or storage — when testing FE against multiple accounts.
- dev-seed-leveldb: Seed LevelDB with demo keys to visualize inventory — when bootstrapping dev data or demoing fallback.
- graphql-inventory-summary: Maintain schema/resolver and test strategy — when updating the inventory summary endpoint.
- graphql-codegen-hooks: Enforce typed docs/hooks, no inline gql — when adding/updating frontend GraphQL.
- config-schema-sources: Single evolving schema; fix incoming data or evolve schema (no versioned forks) — when adding/updating config domains or schema fields.
- config-authoring-guide: How to author valid content against our single evolving schema — when creating or modifying JSON under `config/`.
- graphql-codegen-execution: Deterministic, sandbox-friendly codegen — when codegen errors mention concurrency or blocked workers.
- config-check: Validate JSON config using Ajv 2020 — when adding config domains or fixing schema validation errors.
- docs-verify: Keep markdown linters/link checks green — when verify breaks on style or network.
- env-dotenv: Standardize environment configuration via dotenv — when adding env vars or debugging env loading.
- telemetry-elog: Capture per-request telemetry in JSONL — when instrumenting new operations or analyzing performance.
- inventory-list-readpath: Implement and extend inventory list with cursors and facets — when adding filters or debugging pagination.
- storage-index-keys: Index key shapes and 0↔>0 maintenance — when adding new indexes or debugging drift.
- modifiers-categories-economy: COSMETIC vs MECHANICAL rules and economic fields — when adding static modifiers.
- boxes-self-drop-rules: Configure and enforce self-drop behavior — when adding/changing box drop rules.
- ui-home-loop: Home loop UI (open CTA, currencies, results) — when changing box selection, currencies, or results panel.
- ui-inventory: Inventory view (infinite scroll, filters, salvage) — when adding filters/sorts, bulk salvage, or list perf.
- ui-collection-log: Collection Log grid (silhouettes, hints, completion) — when adding discovery logic or adjusting catalog views.
- ui-shop-upgrades: Upgrades & Shop (tree, purchases, scrap→keys cap) — when adding upgrades or wiring purchase flows.
- ui-progression-unlocks: Progression screen (milestones, RNG ???, idle modal) — when changing unlocks display or idle claim UX.
- verify-all: Full project verification across code, docs, schema, codegen — run before PRs and after major changes.
- ui-juice-settings: Animations, SFX, and settings — when adjusting juice, audio, or global toggles.
