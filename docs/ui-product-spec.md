# Lootbox Simulator — UI/UX Product Spec & Design Doc v1

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

- **Primary CTA:** Big “Open Box” button (context-sensitive: opens the highest available tier).
- **Current Box Preview:** Shows selected box type, cost in keys, and unlock progress.
- **Currencies Bar:** Always visible (Keys, Scrap, Glitter). Updates animate smoothly.
- **Result Panel (bottom slide-up):**
  - Recent rewards (last 3–5 items).
  - Expandable to see **full batch results** (1000+).
- **Juice:**
  - Confetti, shake, screen flash on rare pulls.
  - Distinct FX per rarity tier.

### 2. **Inventory Screen**

- **Virtualized scrolling list** (paged, GraphQL cursor-based).
- **Stack representation** (not per-item, aligns with CFP storage:contentReference[oaicite:4]{index=4}).
- **Filters (curated facets only:contentReference[oaicite:5]{index=5}):**
  - Rarity (Common → Epic).
  - Item Type (trinket, cosmetic, material, box).
  - Source Box (Cardboard, Wooden, etc.).
  - Static Mods (Shiny, ScrapBoost, etc. — ≤8 curated tags).
  - Toggles: _Has Cosmetic_, _Has Mechanical_.
- **Sort options:**
  - Newest, Rarity, Value (scrap), Alphabetical.
- **Stack Row Design:**
  - Icon + name + rarity color frame.
  - Count badge.
  - Modifiers shown as small inline tags (rainbow text, shiny glow, etc.).
- **Actions (contextual menu):**
  - Salvage, Lock/Favorite, Expand (materialize instances).

### 3. **Collection Log (Pokédex)**

- Grid of all possible items discovered so far.
- Unknowns show as silhouettes / “???” with hint text.
- Completion meters by rarity/type.
- Highlight items with rare modifiers (e.g., “Shiny Rusty Spoon”).

### 4. **Upgrades & Shop**

- Scrap-based upgrades (auto-opener, bulk opener, shiny chance).
- Scrap → Keys exchange (bad rate, unbrick path).
- Clear upgrade tree with prices & lock icons.

### 5. **Unlock/Progression Screen**

- Shows unlocked boxes and upcoming milestones.
- Progress bars (e.g., “Open 250 Wooden → Unlock Iron”).
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
  - Response handled in **summary mode** (server returns full payload once:contentReference[oaicite:6]{index=6}).
  - UI stages reveal in chunks (e.g., 50 at a time with skip button).
- **Salvage:**
  - “Salvage All Junk” button.
  - Bulk ops trigger confirmation toast with results.
- **Favoriting/Locking:**
  - Star icon toggle. Prevents salvage/sell.

---

## 📡 API Integration (GraphQL)

Frontend must consume GraphQL hooks (via `graphql-codegen`):contentReference[oaicite:7]{index=7}.

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
- Inventory uses virtualized infinite scroll; keep payloads light (<150B per stack:contentReference[oaicite:8]{index=8}).

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
