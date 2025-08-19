# Game Configuration Reference (Generated)

Generated at: 2025-08-19T21:47:26.126Z
This document is generated from files in the `config/` directory. Do not edit by hand.

## Economy

### Currencies

| id      | display | precision |
| ------- | ------- | --------: |
| KEYS    | Keys    |         0 |
| SCRAP   | Scrap   |         0 |
| GLITTER | Glitter |         1 |

### Rarity Salvage

- COMMON: 1
- UNCOMMON: 2
- RARE: 5
- EPIC: 10

### Box Costs

- box_cardboard: 0
- box_wooden: 5
- box_iron: 20
- box_unstable: 50

### Exchanges

- ex_scrap_to_keys: SCRAP -> KEYS at 100:1 (daily cap to = 10)

### Batch Open Limits

- maxPerRequest: 1000

## Boxes

### Cardboard Box (box_cardboard)

- tier: 1
- keyCost: 0
- forbidSelfDrop: false
- selfDropCap: 1

Entries:

| type     | weight | details                                 |
| -------- | -----: | --------------------------------------- |
| ITEM     |   4500 | itemId=itm_rusty_spoon rarity=COMMON    |
| ITEM     |   3500 | itemId=itm_bent_nail rarity=COMMON      |
| ITEM     |    800 | itemId=itm_cat_figurine rarity=UNCOMMON |
| ITEM     |    150 | itemId=itm_mini_anvil rarity=RARE       |
| ITEM     |     30 | itemId=itm_echoing_coin rarity=EPIC     |
| CURRENCY |    400 | currency=KEYS amount=1–1                |
| CURRENCY |     50 | currency=KEYS amount=2–2                |
| BOX      |    500 | boxId=box_cardboard count=1             |
| MATERIAL |    540 | materialId=mat_scrap_chunk amount=1–2   |

### Wooden Crate (box_wooden)

- tier: 2
- keyCost: 5
- forbidSelfDrop: true

Entries:

| type     | weight | details                                 |
| -------- | -----: | --------------------------------------- |
| ITEM     |   4200 | itemId=itm_polished_stone rarity=COMMON |
| ITEM     |   3000 | itemId=itm_tiny_gear rarity=UNCOMMON    |
| ITEM     |    600 | itemId=itm_clockwork_mouse rarity=RARE  |
| ITEM     |    140 | itemId=itm_jester_hat rarity=EPIC       |
| CURRENCY |    700 | currency=KEYS amount=1–2                |
| MATERIAL |    360 | materialId=mat_scrap_chunk amount=2–4   |
| BOX      |    200 | boxId=box_cardboard count=2–5           |

### Iron Chest (box_iron)

- tier: 3
- keyCost: 20
- forbidSelfDrop: true

Entries:

| type     | weight | details                                 |
| -------- | -----: | --------------------------------------- |
| ITEM     |   3800 | itemId=itm_gilded_spoon rarity=UNCOMMON |
| ITEM     |    900 | itemId=itm_pocket_portal rarity=RARE    |
| ITEM     |    180 | itemId=itm_heroic_sticker rarity=EPIC   |
| CURRENCY |    800 | currency=KEYS amount=2–3                |
| MATERIAL |    320 | materialId=mat_scrap_chunk amount=4–8   |
| BOX      |    200 | boxId=box_wooden count=1–2              |

### Dimensionally Unstable Box (box_unstable)

- tier: 4
- keyCost: 50
- forbidSelfDrop: true

Entries:

| type     | weight | details                                 |
| -------- | -----: | --------------------------------------- |
| BOX      |   2500 | boxId=box_cardboard count=5–20          |
| BOX      |   2000 | boxId=box_wooden count=2–6              |
| BOX      |   1200 | boxId=box_iron count=1–3                |
| ITEM     |   1800 | itemId=itm_glitch_crystal rarity=EPIC   |
| CURRENCY |   1500 | currency=KEYS amount=5–10               |
| MATERIAL |   1000 | materialId=mat_scrap_chunk amount=10–25 |

## Unlocks

### Milestones

- ms_wooden_from_cardboard:
  - requirements: OPEN_COUNT(box_cardboard):50
  - unlocks: BOX_TYPE:box_wooden
  - rewards: CURRENCY:KEYS+3
- ms_iron_from_wooden:
  - requirements: OPEN_COUNT(box_wooden):250
  - unlocks: BOX_TYPE:box_iron
  - rewards: CURRENCY:KEYS+10

### RNG Unlocks

- rng_unstable_from_cardboard: scope=box_cardboard baseChanceBp=5
  - softPity: startAt=2000 deltaBpPerTry=2 capBp=100
  - hardPity: guaranteeAt=5000
  - resetOnHit: true

## Modifiers

### Static

#### COSMETIC

- m_shiny — Shiny
- m_rainbow_text — Rainbow Text
- m_confetti_burst — Confetti Burst
- m_glitter_border — Glittering Border
- m_meme_text — Meme Flavor Text
- m_annoying_popup — Annoying Pop-Up
- m_screams — Screams When Opened
- m_useless — Useless

#### MECHANICAL

- m_scrap_boost_1 — ScrapBoost1 (effect: SCRAP_MULTIPLIER)
- m_scrap_boost_3 — ScrapBoost3 (effect: SCRAP_MULTIPLIER)
- m_scrap_boost_5 — ScrapBoost5 (effect: SCRAP_MULTIPLIER)
- m_scrap_boost_10 — ScrapBoost10 (effect: SCRAP_MULTIPLIER)
- m_key_boost_1 — KeyBoost1 (effect: BONUS_KEY_CHANCE_BP)
- m_key_boost_2 — KeyBoost2 (effect: BONUS_KEY_CHANCE_BP)
- m_key_boost_3 — KeyBoost3 (effect: BONUS_KEY_CHANCE_BP)
- m_duplicate_self_1 — DuplicateSelf1 (effect: DUPLICATE_ON_SALVAGE)
- m_bulk_opener — BulkOpener (effect: MILESTONE_PROGRESS_MULT)
- m_tiny_chance_rare — TinyChanceRare (effect: RARITY_UPGRADE_CHANCE_BP)
- m_salvage_discount — SalvageDiscount (effect: SALVAGE_FLAT_BONUS)
- m_glitter_drip — GlitterDrip (effect: GLITTER_PER_SALVAGES)

### Dynamic

- d_greedy — Greedy
  - appliesOn: SALVAGE_VALUE_PRE_CREDIT, UI_VALUE_PREVIEW
  - formula: LINEAR_PER_COUNTER
- d_lucky — Lucky
  - appliesOn: OPEN_BOXES_CURRENCY_STEP
  - formula: LINEAR_PER_COUNTER
  - payout: BONUS_KEYS (maxPerRequest=1)

## Items Catalog

### COMMON

| id                 | name           | type     | scrap | mods                            |
| ------------------ | -------------- | -------- | ----: | ------------------------------- |
| itm_rusty_spoon    | Rusty Spoon    | trinket  |     1 | m_useless, m_meme_text, m_shiny |
| itm_bent_nail      | Bent Nail      | material |     1 | m_shiny, m_rainbow_text         |
| itm_polished_stone | Polished Stone | trinket  |     1 | m_shiny, m_meme_text            |

### UNCOMMON

| id               | name         | type     | scrap | mods                                                |
| ---------------- | ------------ | -------- | ----: | --------------------------------------------------- |
| itm_cat_figurine | Cat Figurine | trinket  |     2 | m_confetti_burst, m_glitter_border, m_scrap_boost_1 |
| itm_tiny_gear    | Tiny Gear    | material |     2 | m_scrap_boost_1, m_glitter_border                   |
| itm_gilded_spoon | Gilded Spoon | trinket  |     2 | m_shiny, m_rainbow_text, m_scrap_boost_3            |

### RARE

| id                  | name            | type    | scrap | mods                                |
| ------------------- | --------------- | ------- | ----: | ----------------------------------- |
| itm_mini_anvil      | Mini Anvil      | trinket |     5 | m_scrap_boost_3, m_duplicate_self_1 |
| itm_clockwork_mouse | Clockwork Mouse | trinket |     5 | m_scrap_boost_3, m_key_boost_1      |
| itm_pocket_portal   | Pocket Portal   | trinket |     5 | m_key_boost_2, m_duplicate_self_1   |

### EPIC

| id                 | name           | type     | scrap | mods                                 |
| ------------------ | -------------- | -------- | ----: | ------------------------------------ |
| itm_echoing_coin   | Echoing Coin   | trinket  |    10 | m_tiny_chance_rare, m_glitter_border |
| itm_jester_hat     | Jester's Hat   | cosmetic |    10 | m_confetti_burst, m_tiny_chance_rare |
| itm_heroic_sticker | Heroic Sticker | cosmetic |    10 | m_tiny_chance_rare, m_glitter_border |
| itm_glitch_crystal | Glitch Crystal | trinket  |    10 | m_confetti_burst, m_rainbow_text     |

## Materials Catalog

| id              | name        | rarity | scrapValue |
| --------------- | ----------- | ------ | ---------: |
| mat_scrap_chunk | Scrap Chunk | COMMON |          0 |

## Idle Flavor

- catchUp.enabled: false
- catchUp.capHours: 8
- catchUp.strategy: DETERMINISTIC_ON_LOGIN

### Flavor lines

- While you were gone, your cat opened {boxes} boxes and knocked over {cups} cups of water.
- Gremlins broke in and opened {boxes} boxes. They only stole {percent}% of the loot this time.
- Your cardboard golem tirelessly opened {boxes} boxes. It now demands a name.

_End of generated content._
