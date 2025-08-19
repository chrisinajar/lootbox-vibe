# ui-juice-settings

- purpose: Add and maintain UI juice (animations, sfx) and global settings.
- when: Tweaking animations or audio, adding new sfx, or adjusting settings persistence.

## Summary

- Animations: Framer Motion drives box shake (per box theme), reward pop-ins, and currency counter ticks.
- Sounds: WebAudio oscillator tones for open, rare pull, and salvage (no binary assets). SFX are ON by default and can be toggled.
- Settings: `SettingsProvider` exposes `sfxEnabled` persisted to `localStorage` (`settings.sfxEnabled`). A Settings modal is available from the Home header.

## Decisions

- Audio policy: Use WebAudio to avoid shipping assets; gate playback behind user interaction and a global toggle.
- Accessibility: Respect future reduced-motion—current animations are brief and low amplitude; extendable via a user setting.
- Error UX: Show user-friendly error copy for failed ops (open, salvage, upgrades, idle). Auto-retry once silently for transient issues; surface error only on repeated failure.

## Gotchas

- Autoplay restrictions: Some browsers require user interaction before creating an `AudioContext`. The first button press (Open/Salvage) initializes audio.
- Animated counters: Avoid excessive rerenders; use MotionValue + Spring to smoothly tick to new values.
- Don’t block on audio: SFX should never affect control flow.

## Related

- files: `src/frontend/ui/home/Home.tsx`, `src/frontend/ui/sound/Sound.ts`, `src/frontend/ui/settings/*`
- runbooks: `verify-all`, `docs-verify`
