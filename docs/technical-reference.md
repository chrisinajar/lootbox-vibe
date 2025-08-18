# Lootbox Simulator — Technical Reference v1

**Audience:** Developers  
**Author:** Technical Lead  
**Date:** 2025-08-16  
**Scope:** Baseline technical reference for Lootbox Simulator MVP implementation.

---

## 🧰 Tech Stack & Tooling

### Languages

- **Backend:** Node.js + **TypeScript**
- **Frontend:** React + **TypeScript**

### Frameworks / Libraries

- **Frontend**
  - React (hooks, function components only)
  - Apollo Client (GraphQL)
  - GraphQL Code Generator (`graphql-codegen`) to auto-generate typed React hooks
  - TailwindCSS (styling)
  - Framer Motion (animations / juice)

- **Backend**
  - Apollo Server (GraphQL API)
  - LevelDB (player state persistence)
  - SQLite (optional fallback for dev/analytics)
  - `uuid` (unique ID generation)
  - `xxhash` or `blake3` (Canonical Fingerprint hashing)
  - Jest (unit + integration testing)
  - Supertest (HTTP-level testing)

### Tooling

- ESLint + Prettier (lint/format)
- Jest + ts-jest (tests)
- Husky + lint-staged (pre-commit hooks)
- Nodemon (dev auto-reload)
- Chokidar (dev hot reload for config files)
- json-schema-to-typescript (for config type generation)
- Dockerfile + docker-compose (standardized environment)
- CI: GitHub Actions (build, lint, test)

---

## 🗂 Project Structure

```text
/docs
  technical-reference.md     → this file
  ...                        → future technical docs

/src
  /backend
    /api                     → Apollo Server resolvers + schema
    /services                → InventorySvc, DropTableSvc, ModifierSvc, etc.
    /storage                 → StorageProvider (LevelDB/SQLite abstraction)
    /config                  → ConfigService (JSON loaders, schemas)
    /models                  → shared domain types (CFP, ItemStack, etc.)
    /util                    → hashing, rng, batching, logging

  /frontend
    /components              → React components
    /graphql                 → generated hooks (via GraphQL Codegen)
    /pages                   → UI screens
    /styles                  → TailwindCSS configs

/config
  /boxes                     → loot box drop tables
  /items                     → item definitions
  /modifiers                 → static + dynamic modifier catalogs
  /unlocks                   → unlock rules
  /idle                      → idle flavor text
  /schema                    → JSON Schemas for validation

/tests
  /unit                      → Jest unit tests
  /integration               → API & service integration tests
```

---

## 📦 Storage & Persistence

### Database

- **Primary:** LevelDB (in-process, append-optimized, suitable for millions of keys)
- **Fallback (optional):** SQLite in WAL mode (for dev/analytics)

### Namespacing (per-user)

```text
inv:{uid}:{CFP}              → { count, exemplar? }
inst:{uid}:{itemUid}         → { CFP, volatileState, flags }
idx:type:{uid}:{id}:{CFP}    → 1
idx:rarity:{uid}:{tier}:{CFP}→ 1
idx:mod:{uid}:{tag}:{CFP}    → 1 (only static mods)
sum:rarity:{uid}:{tier}      → u64
sum:type:{uid}:{id}          → u64
elog:{uid}:{ts}:{nonce}      → { deltas[], reason }
ppro:{uid}                   → { unlockedBoxIds:[], milestones:{}, achievements:[] }
pstat:{uid}                  → { lifetimeBoxesOpened, lastLoginMs, openerRate, ... }
cur:{uid}:{currency}         → balance:u64
```

### Canonical Fingerprint (CFP)

- Deterministic hash of: `baseItemId + rarity + sortedStaticMods + skin/setId`
- Excludes volatile or dynamic properties
- Hash function: xxHash128 or BLAKE3
- Used as key for stacking and bulk operations

---

## 📑 Configuration System

### Philosophy

- **All game config lives in version-controlled JSON** under `/config/`
- Never seed/mutate DB for configuration
- Validated at startup with **JSON Schema**
- **Hot reload** in dev (via Chokidar); prod loads only at process start

### Directory Layout

```text
/config
  /boxes                     → JSON drop tables
  /items                     → item definitions
  /modifiers                 → static & dynamic catalogs
  /unlocks                   → unlock rules
  /idle                      → idle flavor text
  /schema                    → JSON Schemas
```

### Example: Box Config

```json
{
  "$schema": "./schema/box.schema.json",
  "id": "Cardboard",
  "name": "Cardboard Box",
  "batch": { "min": 1, "max": 1 },
  "weights": [
    { "w": 50, "pick": { "type": "CURRENCY", "currency": "SCRAP", "min": 1, "max": 5 } },
    {
      "w": 45,
      "pick": {
        "type": "ITEM",
        "itemId": "Banana",
        "rarity": "COMMON",
        "staticMods": ["Shiny?5%"],
        "dynamicMods": ["Greedy"]
      }
    },
    { "w": 5, "pick": { "type": "ITEM", "itemId": "CardboardBox", "rarity": "COMMON" } }
  ]
}
```

### Example: Unlock Config (Milestone)

```json
{
  "$schema": "./schema/unlock.schema.json",
  "boxId": "WoodenCrate",
  "method": "MILESTONE",
  "params": { "counter": "Cardboard:opened", "threshold": 100 }
}
```

### Example: Unlock Config (RNG)

```json
{
  "$schema": "./schema/unlock.schema.json",
  "boxId": "DimensionallyUnstable",
  "method": "RNG",
  "params": { "sourceBoxId": "Cardboard", "chance": 0.0001 }
}
```

### Example: Modifiers

```json
{
  "$schema": "./schema/modifiers.schema.json",
  "static": [
    { "id": "Shiny", "kind": "FLAG", "display": "Shiny" },
    { "id": "RainbowText", "kind": "FLAG", "display": "Rainbow Text" },
    { "id": "ScrapBoost5", "kind": "MULT", "stat": "SCRAP_YIELD", "value": 0.05 }
  ],
  "dynamic": [
    {
      "id": "Greedy",
      "formula": "GREEDY_V1",
      "displayTemplate": "Greedy +{percent}% (scales)",
      "caps": { "maxPercent": 100 }
    }
  ]
}
```

### Example: Idle Flavor

```json
{
  "$schema": "./schema/flavor.schema.json",
  "entries": [
    {
      "id": "cat",
      "w": 60,
      "text": "While you were gone, your cat opened {count} boxes and knocked over {cups} cups of water."
    },
    {
      "id": "gremlins",
      "w": 40,
      "text": "Gremlins opened {count} boxes in your absence, but stole half the loot."
    }
  ],
  "vars": {
    "cups": { "min": 3, "max": 17 }
  }
}
```

---

## 🔄 Core Services

- **StorageProvider**
  LevelDB/SQLite abstraction, handles prefix scans + batch ops

- **InventorySvc**
  CFP stacking, expansion/condense, bulk salvage

- **DropTableSvc**
  Config-driven RNG for loot rolls (server-side only)

- **ModifierSvc**
  - Static mods: rolled & frozen at creation, part of CFP
  - Dynamic mods: evaluated at runtime via server formula

- **ProgressionSvc**
  Unlock handling (milestone + RNG unlocks)

- **CurrencySvc**
  Atomic balance updates, multi-currency batch ops

- **ConfigService**
  Loads/validates JSON configs, hot reload in dev

- **IdleSvc**
  Deterministic login catch-up, flavored messages

---

## 🎲 Randomness & Idempotency

- RNG: Node `crypto` PRNG
- Seed includes: `{uid, serverTime, nonce}`
- RNG never runs client-side
- All mutations accept a `requestId` for dedupe
- Outcomes stored short-term in DB for replay (`req:{uid}:{requestId}`)

---

## ⚖️ Modifiers

- **Static (MVP majority, \~80%)**
  - Rolled once at item creation
  - Included in CFP, indexed
  - Immutable

- **Dynamic (\~20% MVP)**
  - Not part of CFP
  - Evaluated at runtime
  - Example: Greedy (+1% scrap per 100 boxes lifetime)

### Evaluation Pipeline

```text
Base Item → Static Mods → Dynamic Mods → Global Buffs (events)
```

---

## 🌀 Unlocks

- **Milestone unlocks**: threshold-based progression
- **RNG unlocks**: rare, surprise-based
- Both defined as JSON configs under `/config/unlocks`

---

## ⏳ Idle / Auto-Openers

- Catch-up **on login only** (no server tick)
- Inputs: `lastLogin`, `openerRate`, elapsed time
- Cap: configurable max idle hours
- Flavor messages from `/config/idle/flavor.json`

---

## 📡 GraphQL API

### Tech

- Apollo Server (Node.js + TS)
- Schema-first (SDL in `/src/backend/api/schema.graphql`)
- GraphQL Codegen generates:
  - React hooks
  - Resolver types

### Example Schema (excerpt)

```graphql
type Query {
  inventorySummary: InventorySummary!
  inventoryList(filter: InventoryFilter, limit: Int = 100, cursor: Cursor): PageItemStacks!
  currencies: [CurrencyBalance!]!
  unlocks: [Unlock!]!
}

type Mutation {
  openBoxes(input: OpenBoxesInput!): Rewards!
  salvage(filter: SalvageFilter!, requestId: ID!): Rewards!
  expand(input: ExpandInput!, requestId: ID!): [ID!]!
  condense(input: CondenseInput!, requestId: ID!): ItemStack!
  purchaseUpgrade(upgradeId: ID!, requestId: ID!): [CurrencyBalance!]!
  claimIdle(requestId: ID!): IdleReport!
}
```

---

## 🧪 Testing

- **Unit tests (Jest):**
  - All services (Inventory, DropTable, Modifiers, Currency)
  - RNG mocked for determinism
  - CFP hashing

- **Integration tests:**
  - GraphQL API
  - Player loop flows (open → salvage → unlock)

- **Property-based tests:**
  - Drop table distributions
  - Modifier formulas

- **Golden tests:**
  - Static/dynamic modifier resolution
  - Unlock milestones

- **Load tests:**
  - Whale simulation: 100k CFPs, 10M items

---

## 🔐 Security & Anti-Exploit

- RNG strictly server-side
- Mutations are idempotent via `requestId`
- Currency/item ops atomic (LevelDB batches)
- Input validation on all GraphQL inputs
- Config JSON immutable in prod (reload on deploy only)

---

## 📌 Baseline Assumptions

- All code in **TypeScript**
- All new code covered by **Jest tests**
- **ESLint + Prettier** enforced in CI
- GraphQL schema is the **contract** between FE & BE
- All config in `/config/` JSON (schema validated, version controlled)
- FE uses **GraphQL Codegen** exclusively for hooks (no handwritten queries)
- Dynamic modifiers implemented only as server formulas (no eval, no client logic)
- Idle progression implemented only as deterministic login catch-up for MVP

---
