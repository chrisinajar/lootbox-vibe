# ui-inventory

- purpose: Build and maintain the Inventory view — infinite scroll, filters, sorts, and salvage actions.
- when: Adding new filters/sorts, wiring modifiers display, or adjusting list performance.

## Summary

Inventory uses a cursor-based GraphQL query (`inventoryList`) to fetch stacks. The UI implements virtualized infinite scroll with fixed-height rows, curated facet filters (rarity, typeId, sourceBox, tags), and a bulk salvage action.

## Key decisions

- Cursor & virtualization: Fetch pages of 100 rows; append while scrolling near bottom. Rows render in a fixed-height container for performance.
- Sorts: NEWEST uses server order; RARITY and ALPHA are client-side on the fetched set. VALUE is present but disabled pending backend exposure of per-stack value metadata.
- Curated tags: UI exposes 8 static tags. These map to `filter.curatedTags` and rely on `idx:tag` in storage. If `idx:tag` is not yet built, results may be sparse — add/maintain the index per `inventory-list-readpath`.
- Actions: Bulk Salvage calls `salvage(maxRarity=UNCOMMON)`. Row menu ‘Salvage’ uses `typeIds=[typeId]`. Lock/Favorite/Expand are placeholders until backend fields and APIs are added.

## Checklist

- [ ] Update `.graphql` docs and `yarn codegen` when schema changes.
- [ ] Keep page size modest (100) to maintain fast UI updates.
- [ ] Reset cursor on any filter or sort change that affects ordering.
- [ ] After salvage, refetch the current page and any dependent summaries.

## Gotchas

- Client-side sorts disrupt cursor semantics across the entire dataset. Reset and refetch when sort changes to avoid inconsistent ordering.
- VALUE sort requires item scrap values per stack (excluding Greedy). Expose minimal metadata server-side to enable true value sorting.
- Modifier tags per row require backend to include compact flags; today only filters are wired.

## Related

- files: `src/frontend/ui/inventory/Inventory.tsx`, `src/frontend/queries/inventoryList.graphql`
- schema: `src/backend/api/schema.graphql`
- service: `src/backend/services/InventoryListService.ts`
- runbooks: `inventory-list-readpath`, `graphql-codegen-hooks`
