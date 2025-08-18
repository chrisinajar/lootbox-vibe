# Lootbox Simulator — Product Spec v1

**Author:** Game Design  
**Audience:** Technical Lead, Developers, Data Science  
**Last Updated:** 2025-08-16

---

## 🎯 Vision & Hook

Lootbox Simulator is a browser-based idle/gacha/collection game about **opening lootboxes to unlock more lootboxes to open more lootboxes.**

It’s a simple clicker at its core, but layered with:

- Surprise & humor (silly item drops, meta jokes, escalating absurdity).
- Compulsion mechanics (collection logs, rare unlocks, modifiers).
- Progression systems (currencies, upgrades, idle automation).

The game is about **clicking buttons, watching numbers go up, and always chasing “one more unlock.”**

---

## 🌀 Core Gameplay Loop

1. **Open Lootbox**
   - Player spends currency (key/ticket) to open.
   - Box explodes → items, currencies, chance of unlock.

2. **Process Rewards**
   - Items: collectible, salvageable, or cosmetic.
   - Salvage converts junk → crafting resources.

3. **Progression Actions**
   - Buy/open more lootboxes.
   - Unlock new lootbox types (branching tree).
   - Upgrade systems (faster opening, better odds).

4. **Repeat Forever**
   - Each loop produces either **quantity** (more openings) or **novelty** (new/funnier outcomes).

---

## 📈 Progression Systems

### 1. Lootbox Unlock Tree

- Starting point: **Cardboard Box**.
- Unlocks new types as you play (Wooden Crate, Glittering Chest, Spooky Box, etc).
- Each box has:
  - **Theme** (mundane → absurd).
  - **Drop Table** (items, currencies, modifiers).
  - Unlock condition (milestone, RNG, or behavior-based).

### 2. Collection System

- Every item has rarity + modifiers.
- Pokédex-style log tracks completion.
- Achievement hooks: “Collect 10 cursed bananas.”

### 3. Affixes / Modifiers

- Items can roll random traits:
  - Mechanical: _“+10% currency yield,” “Duplicates itself once.”_
  - Cosmetic: _“Shiny,” “Rainbow Text,” “Annoying Pop-up.”_
  - Joke/meta: _“Does Nothing,” “Requires 3 extra clicks.”_

### 4. Currency & Economy

- **Keys/Tickets** = primary fuel.
- **Scraps** = salvage currency.
- **Dust/Glitter** = rare cosmetic currency.
- Loop → spend keys, salvage junk, reinvest in more boxes.

### 5. Upgrades & Idle Layer

- Speed multipliers: boxes open faster or in batches.
- Auto-openers: idle progression when offline.
- RNG manipulation: “+5% shiny chance.”

---

## ⚙️ Core Requirements for Engineering

1. **Scalable Inventory System**
   - Must handle millions of items per user without performance loss.
   - Items are lightweight records with:
     - `id`, `type`, `rarity`, `modifiers[]`, `metadata`.
   - Bulk operations (salvage all junk, open 1000 boxes).

2. **Drop Table System**
   - Flexible config for each box type:
     - Probability weights.
     - Nested loot (lootboxes inside lootboxes).
     - Conditional unlocks (e.g. only after X milestone).
   - Support for rarity rolls + modifier rolls.

3. **Progression/Unlock System**
   - Track what lootboxes are unlocked per player.
   - Allow branching unlocks and hidden/unexpected ones.
   - Tie unlocks to milestones (count, % chance, or achievements).

4. **Modifier / Affix Framework**
   - Modifiers applied to any item instance.
   - Support both **mechanical effects** (affecting currencies) and **cosmetic/joke-only** effects.
   - Examples:
     - Stat-based (`+10% scrap yield`).
     - Cosmetic tags (`shiny`, `rainbow text`).
     - Behavior-altering (`pop-up item`, `explodes with confetti`).

5. **Currency / Resource Management**
   - Multiple currencies per account.
   - Transactions must be atomic to prevent exploits.
   - Flexible enough to add new currency types later.

6. **Offline/Idle Support**
   - Time-based auto-openers.
   - Catch-up calculation when a player logs in.

7. **Frontend Requirements**
   - Must feel **juicy** (animations, sound, confetti).
   - Support bulk openings (e.g. “Open 100 Boxes”).
   - Collection log and upgrade menus.

---

## 🔮 Future-Proofing / Phase 2 (Not Needed for MVP)

- **Prestige / Reset Loop:** Sacrifice progress for multipliers.
- **Trading / Social Layer:** Show off rare finds or meme items.
- **Events:** Limited-time lootboxes (holiday, memes).

---

## ❓ Open Questions for Tech / Data Science

1. **Inventory Storage Model**
   - Data scientist: what’s your plan for lightweight, infinite-scaling item storage?
   - Technical lead: do we prefer `LevelDB`/`SQLite` embedded storage, or abstracted system for future migration?

2. **Modifier Calculations**
   - Should modifiers apply on item generation (static) or dynamically at runtime (recalculated on use)?

3. **Idle Systems**
   - Should idle auto-openers be time-simulated on login (deterministic catch-up), or run in background (requires server tick)?

4. **Frontend-Backend Split**
   - How much RNG should we push client-side vs. server-side for performance/security?

---

## 🧭 MVP Scope

**What must exist for a playable loop?**

- Cardboard Box loot table.
- Salvage → scrap → upgrade loop.
- Unlock 2–3 additional box types.
- Inventory + collection log.
- Random modifiers (at least cosmetic).
- Currency & upgrade menu.

**What can wait until later?**

- Idle/offline progression.
- Prestige/reset loop.
- Advanced affix effects.
- Events & meta content.

---

## 📌 Summary

Lootbox Simulator must feel **endlessly rewarding and surprising.**  
Technically, the backbone is:

- Scalable inventory.
- Flexible loot/modifier system.
- Config-driven progression.

From there, we’ll layer on humor, novelty, and compulsion until opening lootboxes is as addictive as scratching lottery tickets.
