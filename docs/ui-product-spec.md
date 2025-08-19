# Lootbox Simulator — UI/UX Product Spec & Design Doc v3

**Author:** Game Design
**Audience:** Frontend Developers, Technical Lead, Data Science
**Date:** 2025-08-18

---

## 🎯 Vision

The UI must make opening lootboxes feel **fun, juicy, and compulsive**, while scaling to inventories with **millions of items**.
Every screen should reinforce the loop: **open → process → progress → repeat**.

---

## 🖼️ Core Screens

### 1. **Main Loop Screen (Home)**

- **Primary CTA:** Big “Open Box” button. Behavior = **last used box type**.
  - First-time users auto-select highest unlocked.
  - Compact selector next to CTA allows quick switching.

- **Current Box Preview:** Shows selected box type, cost in keys, and unlock progress.
- **Currencies Bar:** Always visible (Keys, Scrap, Glitter). Updates animate smoothly.
- **Result Panel (bottom slide-up):**
  - Recent rewards (last 3–5 items).
  - Expandable to see **full batch results** (virtualized up to 5,000 rows).
  - Toggles: per-rarity grouping + “collapse duplicates.”

- **Juice:**
  - Confetti, shake, screen flash on rare pulls.
  - Distinct FX per rarity tier.
  - **Box Preview FX:** Use placeholder animations now (plain cardboard pop, metallic clang, glitch flicker). Upgrade to themed art assets once available.

### 2. **Inventory Screen**

- **Virtualized scrolling list** (paged, GraphQL cursor-based).
- **Stack representation** (not per-item, aligns with CFP storage).
- **Filters (curated facets only):**
  - Rarity (Common → Epic).
  - Item Type (trinket, cosmetic, material, box).
  - Source Box (Cardboard, Wooden, etc.).
  - Static Mods (≤8 curated tags):
    1. Shiny
    2. Rainbow Text
    3. ScrapBoost (all tiers grouped)
    4. KeyBoost (all tiers grouped)
    5. DuplicateSelf
    6. BulkOpener
    7. TinyChanceRare
    8. Useless

  - Toggles: _Has Cosmetic_, _Has Mechanical_ (static mods only).

- **Sort options:**
  - Newest (stack creation time; tie-break by stackId).
  - Rarity.
  - Value (scrap; static modifiers only, excludes Greedy). Tooltip notes Greedy applies at salvage.
  - Alphabetical: **ignore case/locales, simple A–Z ASCII ordering** for predictability across clients.

- **Stack Row Design:**
  - Icon + name + rarity color frame.
  - Count badge.
  - Modifiers shown as small inline tags (rainbow text, shiny glow, etc.).

- **Actions (contextual menu):**
  - Salvage, Lock/Favorite, Expand (materialize instances).

- **Bulk Salvage:** “Salvage All Junk” = rarity ≤ Uncommon.

### 3. **Collection Log (Pokédex)**

- Grid of all possible items discovered so far.
- Unknowns show as silhouettes / “???” with **flavorful hint text** (e.g., “Looks spoon-like…”).
- Completion meters by rarity/type.
- Highlight = any stack with filterable cosmetic or mechanical tags.
  - Cosmetic chrome: shiny glow, rainbow text.
  - Mechanical boosts: icon chip overlay.

### 4. **Upgrades & Shop**

- Scrap-based upgrades: auto-opener, shiny chance, and bulk open sizes (Open 10/100/1000) that permanently unlock extra Home CTAs.
- Scrap → Keys exchange (bad rate, unbrick path). Daily cap from economy config; show progress and disable when capped.
- Clear upgrade tree with prices & lock icons.

### 5. **Unlock/Progression Screen**

- Shows unlocked boxes and upcoming milestones.
- Milestones: bar + numeric X/Y.
- RNG unlocks: shown as ??? until triggered, then revealed.
- Idle summary on login (“Your cat opened 347 boxes while you were gone”).

---

## 🎨 Visual Language

- **Rarity Colors:**
  - Common = Gray, Uncommon = Green, Rare = Blue, Epic = Purple, (future: Legendary = Orange).

- **Modifiers:**
  - Cosmetic-only mods = playful visuals (rainbow text, confetti bursts).
  - Mechanical mods = subtle icons (scrap coin, key icon, arrow for multipliers).

- **Box Themes:**
  - Cardboard = plain brown, Wooden = rustic, Iron = heavy metallic, Unstable = glitch/VFX.

---

## 🎛️ Interaction Patterns

- **Batch Opening:**
  - Client requests `openBoxes(count)` with 1/10/100/1000 preset.
  - Response handled in **summary mode** (server returns full payload once).
  - UI stages reveal in chunks (e.g., 50 at a time with skip button).

- **Salvage:**
  - “Salvage All Junk” = rarity ≤ Uncommon.
  - Bulk ops trigger confirmation toast with results.

- **Favoriting/Locking:**
  - Star icon toggle. Prevents salvage/sell.

- **Settings:**
  - SFX on by default.
  - Global mute toggle persisted in localStorage.

- **Telemetry UI Hooks:**
  - Show **user-friendly error copy** if an op fails (e.g., salvage error → “Something went wrong salvaging your items. Please try again.”).
  - Silent auto-retry for transient network issues; escalate only if repeated.

---

## 📡 API Integration (GraphQL)

Frontend must consume GraphQL hooks (via `graphql-codegen`).

Key queries/mutations:

- `inventorySummary` → summary counts by rarity/type.
- `inventoryList(filter, cursor, limit)` → paginated stacks.
- `openBoxes(input)` → returns Rewards.
- `salvage(filter)` → returns scrap yield + removed items.
- `purchaseUpgrade(upgradeId)` → returns new currency balances.
- `claimIdle()` → returns idle report (with flavored string).

---

## 📱 Responsiveness

- **Desktop:** multi-panel view (open loop + sidebar inventory).
- **Mobile:** bottom tab nav (Home, Inventory, Collection, Shop).
- Inventory uses virtualized infinite scroll; keep payloads light (<150B per stack).

---

## 🧃 Juice & Feedback

- Animations: Framer Motion for box shake, pop-in rewards, currency counters tick up.
- Sound: distinct sfx for open, rare pull, salvage.
- Idle/login messages: humorous copy surfaced as toast or modal.

---

## 🧭 MVP Scope (UI)

- Home screen with working open loop + result panel.
- Inventory with filters/sorts + salvage.
- Collection log basics (discovery silhouettes).
- Upgrades shop with 2–3 upgrades.
- Progression screen with milestones.
- Idle flavor modal on login.

---

## 🔮 Future Enhancements

- Social layer: share rare pulls (screenshot/export).
- Events: special themed boxes with unique UI skins.
- Prestige: reset screen with escalating visuals.
- Customization: choose background skins, box animations.

---

## 📌 Summary

The UI must:

- Make **opening boxes the star.**
- Scale gracefully to **millions of items** with filters + virtualization.
- Celebrate **surprise & humor** with juicy animations and copy.
- Keep players in the loop of **open → process → progress → repeat**.
