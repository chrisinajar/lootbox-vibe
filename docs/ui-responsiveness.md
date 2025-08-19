# ui responsiveness

Responsive layout targets desktop and mobile with tailored navigation and list performance.

## desktop

- multi-panel view with the home open loop as the primary panel and a sidebar inventory.
- virtualized lists keep performance high for large inventories.

## mobile

- bottom tab navigation with: home, inventory, collection, shop.
- inventory uses virtualized infinite scroll; keep per-stack payloads light (<150b) and rows fixed-height.

See `docs/runbooks/ui-home-loop.md` and `docs/runbooks/ui-inventory.md` for implementation details.
