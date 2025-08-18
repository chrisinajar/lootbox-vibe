# inventory-list-readpath

- purpose: Implement and extend the inventory list read path with cursor + facet filtering.
- when: Adding new facets, debugging pagination, or improving performance.

## Summary

`inventoryList(filter, limit, cursor)` paginates by `stackId` and filters by curated facets.
Pick the smallest index for the initial scan (rarity/type/source), apply remaining filters by
checking index membership, then read counts from `inv:` and return `nextCursor`.

## Facets (curated)

- `rarity`: filters by rarity via `idx:rarity:{uid}:{tier}:{stackId}`.
- `typeId`: filters by item type via `idx:type:{uid}:{typeId}:{stackId}`.
- `sourceBoxId`: filters by source box via `idx:src:{uid}:{source}:{stackId}`.
- `curatedTags`: accepted in API; add `idx:tag` if/when curated tags are introduced.

## Cursor

- Cursor is the `stackId` of the last row from previous page.
- Scan skips `<= cursor` and collects until `limit` rows; `nextCursor` equals the last row’s `stackId`.
- Cursor stability depends on index key ordering; using `stackId` keeps it deterministic.

## Implementation notes

- Service: `src/backend/services/InventoryListService.ts`.
- Resolver: wires telemetry and timing in `src/backend/init.ts`.
- Deriving metadata: current stackId pattern is `{typeId}_{rarity}_...`; update parser if pattern evolves.

## Performance

- Use the most selective (smallest) index as the primary scan to minimize candidate rows.
- Keep per-candidate work constant: check remaining index memberships (existence), then a single `inv:` read.
- For very large pages, consider batching `get` calls if the storage API supports it.

## Tests

- See `tests/backend/inventory-list.test.ts` for filters + cursor behavior using an in-memory store.
- Seed larger datasets when doing perf exploration (goal: 100 rows ≤100ms on ~20k stacks).

## Future work

- Add `idx:tag` for curated static mod tags and include in filter selection order.
- Consider returning lightweight fields first, with an optional detail fetch.
