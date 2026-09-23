**Direction decision**

Two concepts were evaluated:

| Concept | Decision |
|---|---|
| Existing SwanMark emerging from a crystalline composition | Selected: brand-specific, reuses existing geometry, one bounded moment. |
| Generic geode/particle field | Rejected: weaker brand connection and additional scene/asset work. |

**Exact new Act-1 copy**

- Eyebrow: `SWANSTUDIOS`
- H1: `Build strength.` / `See your progress.`
- Body: `Personal training built around your goals, your workouts, and your next step.`
- Primary CTA: `Book an orientation`

No secondary hero CTA, invented statistics, autoplay control, loading message, or technical error copy.

Existing site navigation and the existing orientation form retain their current copy. They are not redesigned by this package.

**Exact palette bindings**

| Role | CSS value |
|---|---|
| Page base | `var(--bg-base, #030712)` |
| Hero depth | `var(--obsidian-black, #0A0A0F)` |
| Sapphire composition | `var(--midnight-sapphire, #002060)` |
| Raised composition plane | `var(--royal-depth, #003080)` |
| Primary text | `var(--frost-white, #E0ECF4)` |
| Static mark highlight | `var(--ice-wing, #60C0F0)` |
| Small decorative seam | `var(--gilded-fern, #C6A84B)` |
| Button background | `var(--midnight-sapphire, #002060)` |
| Button border | `var(--ice-wing, #60C0F0)` |
| Button glow | `var(--wing-purple, #8B5CF6)` |
| Focus outline | `var(--ice-wing, #60C0F0)` |

Frost White text is placed over an opaque dark text plane; the decorative glow never sits directly behind body copy. Canvas colors come from resolved CSS tokens, then use the installed Three.js color-management convention. Raw `var(...)` strings are not passed as Three.js colors.

**Desktop — 1440px reference**

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Existing site navigation; preserve current labels and behavior          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   SWANSTUDIOS                                                           │
│                                                                        │
│   Build strength.                    ┌────────────────────────────┐     │
│   See your progress.                 │                            │     │
│                                      │    Crystalline SwanMark    │     │
│   Personal training built around     │    Same final composition  │     │
│   your goals, your workouts, and      │    for poster and scene    │     │
│   your next step.                    │                            │     │
│                                      └────────────────────────────┘     │
│   ┌──────────────────────────┐                                         │
│   │ Book an orientation      │                                         │
│   └──────────────────────────┘                                         │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ Existing MissionSection begins in normal document flow                 │
└────────────────────────────────────────────────────────────────────────┘
```

Desktop contract:

- Content maximum width: 1440px; centered container with 48px horizontal gutters.
- Two columns: `minmax(0, 1.05fr) minmax(0, 0.95fr)`; 48px gap.
- H1: Plus Jakarta Sans, weight 700, `clamp(48px, 4.5vw, 76px)`, line-height 1.06.
- Body/UI: Sora; body 18px, line-height 1.6; body maximum width 48ch.
- CTA: minimum height 48px, horizontal padding 24px.
- Decorative square: width 100%, maximum 560px, stable `aspect-ratio: 1`.
- Content controls height. No fixed-height crop or pinned viewport.
- At QHD and 4K, retain the width and type caps.

**Mobile — 375px reference**

```text
┌─────────────────────────────────────┐
│ Existing mobile navigation          │
├─────────────────────────────────────┤
│  SWANSTUDIOS                        │
│                                     │
│  Build strength.                    │
│  See your progress.                 │
│                                     │
│  Personal training built around     │
│  your goals, your workouts, and      │
│  your next step.                    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Book an orientation           │  │
│  └───────────────────────────────┘  │
│                                     │
│       ┌─────────────────────┐       │
│       │                     │       │
│       │ Crystalline         │       │
│       │ SwanMark            │       │
│       │                     │       │
│       └─────────────────────┘       │
│                                     │
├─────────────────────────────────────┤
│ Existing MissionSection             │
└─────────────────────────────────────┘
```

Mobile contract:

- Single column below 768px; 20px horizontal gutters.
- H1: 38px, line-height 1.08 at 375px; permit natural wrapping under text zoom.
- Body: 16px, line-height 1.6.
- CTA: full content width, minimum 48px height.
- Mark: centered, maximum width 280px; stable square.
- Copy and CTA precede decoration in DOM and visual order.
- No horizontal overflow, negative-margin breakout, or fixed hero height.

**Full, lean, reduced, and failure states**

| State | Desktop | 375px | Behavior |
|---|---|---|---|
| Initial render | Desktop composition with static mark | Mobile composition with static mark | All copy and CTA immediately visible. |
| Eligible import pending | Same | Same | No spinner or placeholder gap. |
| Full signature | Same layout; mark rotates into final pose | Same if device qualifies | One 720ms beat; copy remains still. |
| Full settled | Final mark pose | Final mark pose | No ambient loop. |
| Lean | Static mark | Static mark | No R3F request. |
| Reduced motion | Static mark | Static mark | No R3F, parallax, count-up, or reveal transition. |
| Import/render/context failure | Static mark | Static mark | Conversion path remains available. |
| Keyboard focus | 2px Ice Wing outline, 3px offset | Same | Visible immediately; no animated focus glow. |

**Reduced-motion static composition**

```text
Desktop                              375px
┌──────────────────────────────┐     ┌────────────────────────┐
│ SWANSTUDIOS                  │     │ SWANSTUDIOS            │
│ Build strength.     STATIC   │     │ Build strength.        │
│ See your progress.  SWANMARK │     │ See your progress.     │
│ Body copy unchanged          │     │ Body copy unchanged    │
│ [Book an orientation]        │     │ [Book an orientation]  │
└──────────────────────────────┘     │     STATIC SWANMARK    │
                                    └────────────────────────┘
```

The mark is decorative: `aria-hidden`, no tab stop, no pointer interception. The orientation dialog remains the existing screen; intake records its current states for regression testing without inventing a replacement wireframe.
