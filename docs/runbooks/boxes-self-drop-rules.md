# boxes-self-drop-rules

- purpose: Configure and enforce self-drop behavior for boxes.
- when: Adding new boxes or changing how boxes can drop themselves.

## Summary

Box JSON supports:

- `selfDropCap: number >= 0` — per-roll cap on how many of the same box may appear inside itself (e.g., Cardboard -> Cardboard max 1).
- `forbidSelfDrop: boolean` — higher tiers cannot drop themselves; Unstable drops anything except itself.

Schema validation accepts these fields; runtime enforcement should happen in the loot roll path.

## Runtime enforcement (guidance)

- In `OpenBoxesService`, before finalizing awarded stacks:
  - If `forbidSelfDrop` is true, filter out entries matching `box.id`.
  - If `selfDropCap` is set (>= 0), clamp self-box occurrences per roll to the cap.
- Consider exposing self-drop fields to content authors via comments/examples in `config/boxes/*`.

## Validation

- `config/schema/boxes.schema.json` includes these fields; `yarn config:check` ensures shape.
- Add content tests for per-box cap behavior when runtime enforcement is implemented.
