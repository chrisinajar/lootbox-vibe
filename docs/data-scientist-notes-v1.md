# Lootbox Simulator — Data Scientist Notes v1

Author: Data Scientist
Date: 2025-08-16

## Context
We are building a lootbox/incremental style game where players may acquire and hoard millions of items. Each item may have modifiers (rarity, affixes, skins, passive effects). Some items must remain unique, but most can be stored as duplicates. Performance must remain fast for both new and long-term accounts.

Constraints:
- Storage: in-process DB only (LevelDB preferred, SQLite acceptable, Postgres/MySQL not allowed).
- Runtime: single Node.js server process.
- Client: browser/mobile; no large memory use, no native code, minimal payload sizes.
- Goal: O(1) loot ingestion, efficient bulk ops, fast filters, scalable to millions of items.

## Strategy Overview
We avoid per-item storage for everything. Instead we:
1. Group items by a **Canonical Fingerprint (CFP)** of their stackable attributes.
2. Store **stack counts** per CFP.
3. Materialize individual instances only when needed (equipping, nicknames, durability, etc.).
4. Maintain lightweight indexes and summaries for fast queries and bulk operations.

## Canonical Fingerprint (CFP)
- Deterministic hash (128-bit, e.g. xxHash128/BLAKE3).
- Input attributes: baseItemId, rarityTier, sorted modifiers, optional skin/set IDs.
- Exclude volatile fields (durability, XP, nickname). These force materialization.
- Numeric rolls bucketed (e.g. 0.5% steps) to keep CFP cardinality manageable.
- Hash collisions mitigated by including a small plaintext header in the key.

## Storage Schema (LevelDB)
Key namespaces (per userId):
- inv:{userId}:{CFP} → {count:uint32, headerBits:uint8, exemplar?}
- inst:{userId}:{itemUid} → {CFP, volatileState, flags}
- idx:type:{userId}:{typeId}:{CFP} → 1
- idx:rarity:{userId}:{rarityTier}:{CFP} → 1
- idx:mod:{userId}:{modTag}:{CFP} → 1 (only curated set of tags)
- sum:rarity:{userId}:{tier} → totalCount:uint64
- sum:type:{userId}:{typeId} → totalCount:uint64
- elog:{userId}:{timestamp}:{nonce} → {delta list of (CFP, +N/-N), reason}

Notes:
- Distinct CFP count is expected << total items (e.g. 100k CFPs vs 10M items).
- Indexes and summaries allow fast filter queries and bulk ops.
- elog provides audit trail and rebuild capability.

## Operations
All performed with atomic LevelDB batches.

1. Add loot:
   - Compute CFP, increment inv count.
   - Maintain index if transitioning 0→>0.
   - Update summaries.

2. Expand (materialize instances):
   - Decrement inv count, create inst rows with volatile state.
   - Reverse with condense when uniqueness no longer needed.

3. Bulk ops (sell all commons, disenchant duplicates):
   - Scan relevant index (rarity/type/mod).
   - Apply op per CFP, zero/remove if needed.
   - Update summaries and elog.

4. Query & pagination:
   - List inventory: range scan inv prefix with pagination by last CFP.
   - Filters: scan relevant index then fetch inv rows.
   - Sorting: by rarity/type via index; value/recent via small metadata fields.

## Client Representation
- Send stacks, not individual items:
  {cfp, count, baseItemId, rarity, compactModsDescriptor}
- Exemplar payloads <150 bytes typical.
- Inventory UI is virtualized list, paged from server.
- Summaries for quick display (rarity/type counts).
- Expansion endpoint for when individual item UIDs are required.

## Performance Estimates
- inv row size: ~64–96 bytes including LSM overhead.
- 100k CFPs per whale → ~6–10MB on disk.
- Indexes add a few MB.
- "List commons" query: scan index rows + batch get → <100ms.
- Bulk sell/disenchant: one batched write of thousands of keys → milliseconds.

## Optional SQLite Fallback
- Same schema as tables with stack/instance, plus indexes.
- WAL mode, mmap optimization.
- Easier for ad-hoc queries but larger footprint. Not strictly necessary given LevelDB suffices.

## API Sketch
- GET /inv/summary → {byRarity, byType, totalStacks, totalItems}
- GET /inv/list?filter=rarity:common&type=paperclip&cursor=CFP&limit=100
- POST /inv/expand {cfp, count}
- POST /inv/condense {itemUids:[...]}
- POST /inv/bulk {op:"sell", filter:{...}}
- POST /inv/mutate {...} for equip/rename/lock/etc.

All endpoints support cursors, are idempotent with requestId dedupe.

## Implementation Checklist
1. CFP library (hashing, canonicalization, exemplar encoder).
2. LevelDB schema utilities (prefixed range, batch).
3. Materialization manager (UID minting, expand/condense).
4. Bulk operator (index-driven, atomic batch).
5. Client integration (paged lists, summaries).
6. Guardrails (limit expand size, enforce bucketing at generation).

