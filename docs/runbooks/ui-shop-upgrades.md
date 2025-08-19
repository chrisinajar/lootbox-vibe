# ui-shop-upgrades

- purpose: Implement and maintain the Upgrades & Shop UI — upgrade tree, scrap purchases, and scrap→keys exchange with daily cap.
- when: Adding new upgrades, changing prices/caps, or wiring purchase flows.

## Summary

Shop exposes a simple upgrade tree purchasable with Scrap. Includes a bad-rate Scrap→Keys exchange with a daily cap and progress indicator. Disabled states and lock icons communicate unavailable upgrades.

## Key decisions

- Data: Upgrades and exchange rates come from config-backed GraphQL fields; purchases go through `purchaseUpgrade(upgradeId)` which returns updated currency balances.
- Daily cap: Exposed by backend; UI shows current progress (used/limit), disables exchange when capped, and surfaces helpful tooltip copy.
- Tree: Render as list or simple tree with prices, lock icons, and short descriptions. Bulk open sizes are gated via specific upgrades with progressive reveal:
  - `upg_bulk_10` — Open 10 (≈250 scrap)
  - `upg_bulk_100` — Open 100 (≈1,000 scrap)
  - `upg_bulk_1000` — Open 1000 (≈10,000 scrap)
  - Prereqs: must purchase `10` before `100`, and `100` before `1000`.
  - Shop UI hides locked tiers until their prerequisite is purchased (initially only Open 10 is visible). These permanently unlock the corresponding CTA options in Home.

## Checklist

- [ ] Query available upgrades and player-owned statuses.
- [ ] Hide bulk tiers until prereqs are purchased (10 → 100 → 1000).
- [ ] Show prices in Scrap and disabled state if unaffordable.
- [ ] Wire `purchaseUpgrade(upgradeId)` with idempotent `requestId` and optimistic UI for balances.
- [ ] Implement Scrap→Keys exchange with visible daily cap progress and disable logic.
- [ ] Refresh currencies and any impacted summaries after purchase.

## Gotchas

- Idempotency: Always send a `requestId` and handle duplicate responses gracefully.
- Race conditions: Disable purchase buttons while a request is in flight.
- Copy: Keep exchange copy clear that rate is intentionally unfavorable (unbrick path).

## Related

- files: `src/frontend/ui/shop/Shop.tsx`
- schema: `src/backend/api/schema.graphql`
- runbooks: `graphql-codegen-hooks`, `verify-all`
