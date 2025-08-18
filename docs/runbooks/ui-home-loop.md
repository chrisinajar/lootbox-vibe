# ui-home-loop

- purpose: Implement and maintain the Home (Main Loop) UI — open box CTA, currencies bar, and results panel.
- when: Changing box selection behavior, currencies display, or result list logic.

## Summary

Home screen shows a big Open action for the last used box (fallback to highest unlocked), a currencies bar with KEYS/SCRAP/GLITTER, and a results panel with recent pulls and an expandable virtualized list.

## Key decisions

- Last used box: persisted to `localStorage` under `lastBoxId`. On load, if not set or not unlocked, pick the highest unlocked from `BOX_ORDER`.
- Unlocked boxes: served by `unlockedBoxes` GraphQL query. Backend defaults to `['box.cardboard']` when profile empty (key `ppro:{uid}`).
- Currencies: fetched from `currencies` GraphQL query (balances for KEYS, SCRAP, GLITTER). Refetched after open.
- Virtualization: custom light-weight list (no extra deps) with fixed row height and overscan; capped to 5,000 rows.
- Grouping: client-side toggles for rarity grouping and collapsing duplicates.
- Juice: placeholder Framer Motion animations per box type; confetti on rare (≥ Rare).

## Checklist

- [ ] Keep queries in `.graphql` files; run `yarn codegen` after schema changes.
- [ ] After adding open behavior, refetch `InventorySummary` and `Currencies`.
- [ ] Avoid functional React state updaters due to shim; compute next state directly.
- [ ] Ensure `VITE_ENABLE_DEV_UI` is respected; Home remains non-dev.

## Gotchas

- React type shims do not support functional setState — use direct values.
- If `framer-motion` typings cause issues in CI typecheck, fallback to `any` shim (`src/frontend/types/framer-motion-shim.d.ts`).
- Schema updates require regenerating GraphQL client and restarting dev server in local runs.

## Related

- files: `src/frontend/ui/home/Home.tsx`, `src/frontend/queries/*.graphql`
- schema: `src/backend/api/schema.graphql`
- resolvers: `src/backend/init.ts`
- runbook: `graphql-codegen-hooks`, `graphql-codegen-execution`, `env-dotenv`
