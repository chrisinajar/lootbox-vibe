# graphql-inventory-summary

- purpose: Add and maintain the inventorySummary GraphQL endpoint
- when: Updating schema/resolvers or debugging counts

Schema:
- `scalar BigInt`
- `InventorySummary { totalStacks: Int!, totalItems: BigInt!, byRarity, byType }`
- Enum `Rarity` with COMMON..MYTHIC

Backend:
- Resolver uses `InventorySummaryService` over `SummariesRepo`.
- Repo reads `sum:*` keys; falls back to `idx:*` + `inv:*` scans when missing.
- Counts use BigInt end-to-end; never cast to JS number.

Testing:
- Smoke test uses Apollo `executeOperation` (no HTTP binding).
- Config validation covers Ajv 2020-12 loader.
- Batch atomicity covers LevelDB `batch()` all-or-nothing.
- Fallback test deletes `sum:*` and verifies index-scan path still returns correct totals.

Dev tips:
- Seed with `yarn seed:dev` (with or without sums) and switch users via the dev badge.
- Use header `X-User-Id` (set by FE link and badge) to target different accounts.
