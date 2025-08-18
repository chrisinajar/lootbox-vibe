# storage-index-keys

- purpose: Document index key shapes and 0↔>0 maintenance for inventory.
- when: Adding new indexes/facets, debugging index drift, or updating transaction flows.

## Keys

- Inventory counts: `inv:{uid}:{stackId}` → u32 count.
- Rarity index: `idx:rarity:{uid}:{tier}:{stackId}` → presence key.
- Type index: `idx:type:{uid}:{typeId}:{stackId}` → presence key.
- Source index: `idx:src:{uid}:{sourceBoxId}:{stackId}` → presence key.
- Source map: `srcmap:{uid}:{stackId}` → single-owner source string.
- Sums: `sum:rarity:{uid}:{tier}`, `sum:type:{uid}:{typeId}`, `sum:src:{uid}:{source}` → u64 totals.
- Totals: `sum:totalItems:{uid}`, `sum:totalStacks:{uid}` → u64 totals (optional, forward-compat).

## Maintenance (0↔>0)

- On a stack delta, write `inv:` then:
  - If prev==0 and next>0: `put` relevant `idx:*` presence keys; set `srcmap` if absent.
  - If prev>0 and next==0: `del` relevant `idx:*` presence keys; delete `srcmap` if present.
- Update sums by rarity/type/source and totals by applying batch deltas.
- Only create totals when key exists or delta>0 to avoid underflow on older datasets.

## Source ownership

- `srcmap` records the first source for a stack; it persists until the stack goes to zero.
- Index membership for `idx:src` uses `srcmap` to ensure consistent attribution.

## Related

- Code: `src/backend/services/TransactionManager.ts`, `src/backend/services/txnHelpers.ts`.
- Keys: `src/backend/storage/keys.ts`.
