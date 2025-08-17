# Lootbox Simulator — Inventory & Data Architecture (Tech Lead Brief) v2
Author: Data Science
Date: 2025-08-16

## 0) Executive Summary
We will store player inventory as aggregated stacks keyed by a canonical fingerprint (CFP), materializing unique instances only when necessary. Storage is LevelDB (prod) behind a small provider abstraction; SQLite optional for tooling. Hot summaries are maintained transactionally; exotic metrics computed on-demand. The client receives opaque `stackId` values (currently equal to CFP) and paginates by cursor.

The design targets millions of items per account with sub-100ms filtered reads and millisecond-scale bulk ops, under a single Node.js server process.

---

## 1) Finalized Product Decisions (from Design)
- **Modifier probability granularity:** 0.1% buckets (basis-point precision).
- **Stat magnitudes:** 4–6 discrete **tiers**; **integer steps** within each tier (e.g., +1…+3%, +4…+6%).
- **Cosmetic flags:** binary, also rolled at 0.1% resolution; do not explode combo space.
- **Dynamic/scaling affixes:** read **account-level counters** at runtime (no per-item floats).
- **Filtering (MVP):** **curated facets only** — rarity, item type, source box, has-mechanical, has-cosmetic, user flags (favorite/locked), time-buckets (recent), value sorts. No arbitrary predicate builder in MVP.
- **Volatile states:** **rare**; ≥99% of items immutable. Evolution is “consume and mint new” rather than mutate-in-place.

These choices cap distinct stack variants and keep UI/server paths fast.

---

## 2) Finalized Technical Decisions (from TL)
- **Storage engine:** **LevelDB (prod)** via `StorageProvider` abstraction; **SQLite optional** for dev/analytics.
- **Summaries:** **Hybrid favoring transactional** maintenance for hot aggregates (`sum:*` for rarity/type, core counters). Compute niche aggregates on demand; provide rebuild from event log.
- **Client-facing IDs:** Expose **`stackId`** (opaque). It equals CFP internally today but may change; FE must not parse.

---

## 3) Data Model

### 3.1 Canonical Fingerprint (CFP) → `stackId`
Deterministic digest of **stackable** attributes:
```

inputs = {
  baseItemId,          // uint32
  rarityTier,          // enum
  mods\[]: \[modId, tier, step], // sorted by (modId, tier, step); steps are integers within tier
  cosmeticFlagsBitset, // small bitset
  skinId?, setId?,     // optional small ints
  configVersion        // bumps on balancing changes affecting canonicalization
}
stackId = BLAKE3-128(encodeCanonical(inputs))  // 16 bytes → hex string

```
Exclude **volatile** fields (favorite/locked, charges, cooldown, nicknames, binds). Any item needing such fields becomes a **materialized instance**.

**Cardinality control**
- Limit simultaneous affixes (e.g., ≤4).
- Sorted, de-duplicated modifiers.
- Drop “no-op” modifiers.
- Integer steps in bounded ranges.

### 3.2 Logical Entities
- **ItemTemplate** (static): allowed affixes, cosmetic pools, type, base rarity.
- **AffixTemplate** (static): id, category, allowed tiers, integer step bounds, resolver (static vs account-scaling).
- **Stack** (derived by `stackId`): immutable definition + **count**.
- **Instance** (rare): `{ itemUid, stackId, volatileState, flags }`.
- **AccountCounters**: lifetime_opens, prestige, event flags, etc.
- **Economy Event**: append-only deltas for auditing/rebuilds.

---

## 4) LevelDB Schema (per userId)

**Primary**
- `inv:{uid}:{stackId}` → `count:uint32 | headerBits:uint8 | exemplarBlob?`
  - `headerBits` for quick UI labels (new-tag, tradable, etc).
  - `exemplarBlob` is a tiny cached preview for UI (icon id, short stats); not authoritative.

- `inst:{uid}:{itemUid}` → `{ stackId(16B), volatileState, flags }`
  - `volatileState` only if present (charges, cooldownUntil, nickname, bind target).

**Secondary Indexes (stack-level)**
- `idx:rarity:{uid}:{tier}:{stackId}` → 1
- `idx:type:{uid}:{typeId}:{stackId}` → 1
- `idx:mod:{uid}:{tag}:{stackId}` → 1   // limited curated tags only
- `idx:src:{uid}:{boxType}:{stackId}` → 1

**Hot Summaries**
- `sum:rarity:{uid}:{tier}` → `uint64`
- `sum:type:{uid}:{typeId}` → `uint64`
- `pstat:{uid}:lifetimeBoxesOpened` → `uint64` (and similar core counters)

**Append-only Event Log**
- `elog:{uid}:{epochMillis}:{nonce}` → `{ [ {stackId, delta:int32}... ], reason:uint16 }`

Notes:
- Use LevelDB batch for atomic mutation of `inv`, `idx:*`, `sum:*`, `elog`.
- Range scans over prefixes back inventory pages and filtered views.

---

## 5) Core Operations (batched)

### 5.1 Open Boxes (bulk ingest)
```

for drop in drops:
stackId = buildStackId(drop)
inv += k
if transitioned 0→>0: add idx:\* rows
update sum:\* (rarity/type), bump pstat counters
append single elog with aggregated deltas

```
**Cost:** O(1) per distinct `stackId` touched; single batch write.

### 5.2 Expand (materialize K instances)
```

assert inv\[stackId].count >= K
inv -= K
for i in 1..K:
put inst:{uid}:{itemUid} = { stackId, volatile=default, flags }
if count hits 0: drop idx:\* rows

```
**Condense** reverses if item has no volatile state and not equipped/locked.

### 5.3 Bulk Ops (sell/disenchant)
```

targets = scan smallest relevant idx:\* prefix(s)
for stackId in targets:
read inv count → compute payout/effects
batch: zero/adjust inv, drop idx on 0, update sum:\*, append elog

```
No per-instance iteration unless the operation explicitly affects materialized uniques (rare).

### 5.4 Queries & Pagination
- **Unfiltered list:** range scan `inv:{uid}:` with `after=stackId` cursor, `limit=N`.
- **Filtered:** scan `idx:*` prefix, then fetch `inv` rows for those stackIds, page by index key.
- **Sorts:** use index order for rarity/type; maintain small per-stack metadata for “recent/value”.

---

## 6) API Sketch (REST-ish; GraphQL also fine)

- `GET /inv/summary`
  - → `{ byRarity, byType, totalStacks, totalItems }` from `sum:*` + quick aggregation.

- `GET /inv/list?facet=rarity:common&type=trinket&cursor=stackId&limit=100`
  - → `[ { stackId, count, baseItemId, rarity, compactMods, cosmeticFlags, iconId } ]`, `nextCursor`.

- `POST /inv/expand`
  - `{ stackId, count }` → `[ { itemUid, volatile={} } * count ]`.

- `POST /inv/condense`
  - `{ itemUids:[...] }` → `{ updatedStacks:[{stackId, count}] }`.

- `POST /inv/bulk`
  - `{ op:"sell", facet:{...} }` → `{ removed:[{stackId,count}], payout, nextCursor? }`.

- `POST /inv/mutate` (instance)
  - `{ itemUid, set:{favorite?, locked?, consumeCharge?} }` → updated instance/stack snapshots.

- Idempotency header `X-Request-ID` deduped via `req:{uid}:{requestId}` tombstone.

---

## 7) Performance Envelope (targets)

- **Disk footprint:** `inv` row ≈ 64–96B incl. LSM overhead.  
  100k stacks ≈ 6–10 MB; indexes add a few MB.
- **Open 1,000 boxes:** one batch; server-side compute ≪ 50ms on SSD; UX can stream reveals.
- **List “all commons”:** scan `idx:rarity` + batch gets → typically < 100ms for tens of thousands of stacks.
- **Bulk salvage 100k items:** single large batch touching thousands of `inv` keys → milliseconds; compaction amortized.

---

## 8) Versioning & Migrations
- `configVersion` participates in `stackId` derivation. Any balancing change that alters canonicalization increments it, ensuring:
  - Old stacks remain addressable (old stackIds).
  - New drops form new stacks; optional consolidation job can merge compatible stacks off-hours.
- Event-log–backed **rebuild** tools:
  - Verify/repair `sum:*` counters.
  - Re-index `idx:*` if needed.
- Backfill path for migrating `stackId` format (keep `stackIdAlias` map until FE completes pagination across new ids).

---

## 9) Reliability & Integrity
- All write paths are **batched**; summaries and indexes mutate atomically with `inv`.
- **Idempotency** via request tombstones prevents double-apply.
- **Invariant checks** (debug mode):  
  - `Σ inv.count + Σ inst (per stack) == logical total`.  
  - Index coverage: every `inv` present in at least rarity/type index.
- **Background tasks:** periodic sample audits; compaction health metrics.

---

## 10) Telemetry & Analytics (minimal)
- Aggregate `elog` for economy analytics (drop rates, sinks, net inflation).
- Per-request timings for: index scan count, `inv` fetch count, batch size, LevelDB write time.
- Cardinality monitors: stacks-per-user, avg mods-per-stack, hot facet cache hit rate.

---

## 11) Tuning & Ops Defaults
- LevelDB: `write_buffer_size` 64–128MB, `max_file_size` 32–64MB, `block_size` 16KB, `bloom_bits_per_key` ~10.
- WAL enabled; `sync` only for economy-critical checkpoints (batch groups for others).
- Periodic manual compaction for the largest `inv` ranges during off-peak.

---

## 12) Security & Abuse Notes
- Server-authoritative drops; client never supplies `stackId` other than to reference existing stacks.
- Validate `stackId` existence before mutation; forbid creating arbitrary stacks via API.
- Rate-limit bulk ops; respect `locked/favorited` protections on destructive actions.
