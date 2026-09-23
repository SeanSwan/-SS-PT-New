**Replace Direction decision, palette corrections and signature-state details. Retain the existing desktop/mobile geometry unless amended below.**

**Direction**

The selected direction is a complete, static crystalline SwanStudios composition with the existing SwanMark as its focal mark. F-Alt/Crystalline Swan is the first existing reference to inspect. It is not declared the visual winner without screenshots and exact tokens.

Do not import a variant, its animation module, or its content model into the live page.

**Reference-mining contract**

| Source | Extract | Bound |
|---|---|---|
| `cinematic-tokens.ts` | Exact F/F-Alt token keys, values, gradients and type roles | Record source lines and selected mappings. Conflicting retired colors are not copied. |
| Five named variants | Static depth composition, focal framing, spacing and section rhythm | Compare at 375px and desktop. Select at most one Act-1 composition reference. |
| Shared content model | Copy hierarchy and grouping patterns | Retain the exact approved hero copy below; no imported claims or statistics. |
| Asset manifest | Candidate existing local assets and their provenance | Verify resolution and references before reuse; no new remote request. |
| Animation module | Reference only | No imported particle, perpetual, stagger or scroll choreography. |

Exact source keys and selected variant are **[NEEDS-VERBATIM]**. A0r must fill a provenance table before A7. Until then, the following bindings are the explicit design contract; they are not represented as values mined from unseen files.

| Role | Exact binding |
|---|---|
| Page | `var(--bg-base, #030712)` |
| Hero depth | `var(--obsidian-black, #0A0A0F)` |
| Sapphire composition / CTA background | `var(--midnight-sapphire, #002060)` |
| Raised plane | `var(--royal-depth, #003080)` |
| Text | `var(--frost-white, #E0ECF4)` |
| Mark highlight / CTA border / focus | `var(--ice-wing, #60C0F0)` |
| Decorative seam | `var(--gilded-fern, #C6A84B)` |
| CTA glow | `var(--wing-purple, #8B5CF6)` |

This replaces the bare CTA/focus hex values. Three.js receives resolved colors, never CSS `var(...)` strings.

**Desktop — 1280px and wider**

```text
┌──────────────────── Existing header ────────────────────┐
│                                                        │
│  SWANSTUDIOS                 ┌──────────────────────┐   │
│                              │                      │   │
│  Build strength.             │ Existing SwanMark    │   │
│  See your progress.          │ in static crystalline│   │
│                              │ composition          │   │
│  Personal training built     │                      │   │
│  around your goals, your     └──────────────────────┘   │
│  workouts, and your next step.                          │
│                                                        │
│  [ Book an orientation ]                               │
│                                                        │
├──────── Remaining eleven sections, existing order ──────┤
```

Max content width 1440px; 48px gutters; columns `1.05fr / 0.95fr`; 48px gap. Decorative square ≤560px. H1: Plus Jakarta Sans 700, `clamp(48px, 4.5vw, 76px) / 1.06`. Body: Sora `18px / 1.6`, ≤48ch. CTA ≥48px high.

**375px mobile**

```text
┌─────────────────────────────┐
│       Existing header       │
│                             │
│  SWANSTUDIOS                │
│                             │
│  Build strength.            │
│  See your progress.         │
│                             │
│  Personal training built    │
│  around your goals, your    │
│  workouts, and your next     │
│  step.                      │
│                             │
│ [   Book an orientation   ] │
│                             │
│     ┌─────────────────┐     │
│     │ Existing        │     │
│     │ SwanMark        │     │
│     │ composition     │     │
│     └─────────────────┘     │
│                             │
│ Remaining eleven sections   │
└─────────────────────────────┘
```

20px gutters; single column below 768px; decorative square ≤280px. H1 `38px / 1.08`; body `16px / 1.6`; CTA full width, ≥48px high. Copy and CTA precede decoration in both DOM and visual order.

**Exact copy**

- Eyebrow: `SWANSTUDIOS`
- H1: `Build strength.` / `See your progress.`
- Body: `Personal training built around your goals, your workouts, and your next step.`
- CTA: `Book an orientation`

**States**

| State | Required presentation |
|---|---|
| Pending detection; initially offscreen | Complete copy, CTA and poster; no loading copy. |
| Loading / preparing | Same poster and dimensions; no spinner or interaction delay. |
| Running | Replace poster only after the first successful blit; no opacity crossfade. |
| Settled | Final scene frame; no continuous scheduling. |
| Lean / reduced | Poster only; no hero controller construction. |
| Failure / timeout / context loss | Restore poster immediately; no technical error text or retry control. |
| Hidden after enhancement starts | Dispose and retain terminal poster state; no replay on return. |
| Keyboard focus | 2px Ice Wing outline, 3px offset; no animated focus glow. |
| 200% text zoom | Content expands vertically; no crop, overlap or reordered CTA. |

**Poster and motion**

- Poster depicts the same geometry, camera, material treatment and starting yaw, `−0.14rad`.
- Use a verified suitable local asset or produce local 560px and 1120px exports. Do not upscale the measured 128px placeholder as the final hero artwork.
- Motion candidate: fixed camera, fixed pitch, Y-axis `−0.14 → 0rad` over 720ms; canonical cubic-bezier easing.
- Capture 0/360/720ms storyboards at mobile and desktop sizes.
- Fallback may return to the starting pose. That deliberate pose change must not move the layout or trigger another animation.
- Decoration remains `aria-hidden`, non-focusable and pointer-transparent.
- New validation, submission, success and denied screens: **N/A — the existing orientation workflow is not redesigned.**
