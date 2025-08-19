# ui-collection-log

- purpose: Build and maintain the Collection Log (Pokédex) — discovery grid, silhouettes, hints, and completion meters.
- when: Adding new item definitions, adjusting discovery logic, or changing log visuals/filters.

## Summary

Collection Log shows a grid of all known item types with discovery state. Unknowns render as silhouettes with flavorful hint text. Supports completion meters by rarity and type, and highlights items that have cosmetic or mechanical tags.

## Key decisions

- Data source: Uses item catalog from config plus `inventorySummary` to mark discovered types. Discovery means the player owns or has ever owned at least one of the type.
- Unknown entries: Render grayscale silhouette/placeholder with `???` name and a short hint string from config (`/config/items` or `/config/idle/flavor.json` style pool).
- Completion: Compute per-rarity and per-type completion percentages client-side from catalog vs discovered set.
- Highlights: Cosmetic chrome (shiny glow, rainbow text) and mechanical chips overlay to indicate special variants; filters can toggle these views.

## Checklist

- [ ] Add catalog query or ship catalog as static JSON for client use.
- [ ] Implement discovery set via `inventorySummary` (type counts > 0 ⇒ discovered).
- [ ] Render unknowns as silhouettes with hints.
- [ ] Show completion bars (rarity, type) and totals.
- [ ] Provide filters for cosmetic/mechanical highlight states.

## Gotchas

- Catalog drift: Ensure the catalog and backend type IDs stay in sync; validate at startup in dev.
- Hints sourcing: Keep hints lightweight and optionally localized later; avoid hardcoding long copy per item in the UI.
- Performance: Virtualize or paginate the grid if the catalog grows large.

## Related

- files: `src/frontend/ui/collection/CollectionLog.tsx`
- schema: `src/backend/api/schema.graphql`
- runbooks: `graphql-codegen-hooks`, `docs-verify`
