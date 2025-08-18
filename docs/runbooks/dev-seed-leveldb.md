# dev-seed-leveldb

- purpose: Seed LevelDB with demo keys for quick FE validation
- when: Setting up dev data or demonstrating fallback vs. maintained summaries

Steps:

- Run `yarn seed:dev` to write `inv:*`, `idx:*`, and `sum:*` for `seed-user`.
- Run `yarn seed:dev --no-sum` to write only `inv:*` and `idx:*` (tests fallback paths).
- Optionally set `SEED_UID=your-user` to target a different user.

Notes:

- Script logs totals and per-dimension summaries; use the UI user badge to switch to `seed-user`.
- To clear data quickly, delete the `data/leveldb` folder (app will recreate it).

Related:

- dev-user-switcher, graphql-inventory-summary
