**P2 amendment applied 2026-09-21. Superseded sections removed; P1 content preserved in
`/tmp/p1-originals-20260921/02-wireframes.md` (md5-verified). **Correction 2026-09-21:** the earlier “*Not* in git history” note was wrong — this directory is **not** gitignored — the `.gitignore:496` claim was false (line 496 is blank, and the rules target `.ai-workflow/`, not `docs/ai-workflow/`); this packet is tracked in git as of 2026-09-21. Desktop/mobile geometry below is
retained from P1 unless amended.**

**Direction** *(replaces P1 "Direction decision")*

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

**Palette bindings** *(replaces P1 "Exact palette bindings" — role table, not a flat list)*

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

> **A0r hazard, unresolved.** F-Alt assigns `secondary: '#50A0F0'` (Arctic Cyan) and
> `gaming: '#60C0F0'` (Ice Wing). `design.md:53` marks Arctic Cyan **"DATA ONLY — chart series. NOT
> buttons, NOT glow."** The table above deliberately does **not** adopt F-Alt's interactive roles
> verbatim. See `A0r-INTAKE-RECEIPT.md` §3 and §12 item 3.

**Exact copy** *(retained from P1; see conflicts below)*

- Eyebrow: `SWANSTUDIOS`
- H1: `Build strength.` / `See your progress.`
- Body: `Personal training built around your goals, your workouts, and your next step.`
- CTA: `Book an orientation`

> **A0r conflict A.** The shipped hero CTA reads **`Find a Trainer`** (`HeroSection.tsx:136`), wired to
> `onOpenOrientation`. `Book an orientation` appears nowhere in the controller, the model, or the route
> file. **Unresolved — product decision.**
>
> **A0r conflict B.** P1 states *"No secondary hero CTA."* The shipped hero already carries
> `Join the Community` → `navigate('/signup')` at `HeroSection.tsx:135`, and it is the **only** `/signup`
> entry point in the entire HomePage subtree. **Unresolved — does this clause remove it?**

**States** *(replaces P1 "Full, lean, reduced, and failure states")*

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

---

## A7 provenance table — `[NEEDS-VERBATIM]` CLOSED 2026-09-21

The wireframes contract above required a provenance table before A7: *"Exact source keys and selected
variant are **[NEEDS-VERBATIM]**. A0r must fill a provenance table before A7."* This closes that marker.

### Source: `frontend/src/pages/HomePage/cinematic/cinematic-tokens.ts` (359 lines)

**Selected Act-1 composition reference: at most one.** The token preset inspected for the palette is
**`crystallineSwanTokens`**, `id: 'B'`, `name: 'Crystalline Swan'` (lines 123–153). Its header at line 2
declares the file covers *"Preset F (Enchanted Apex) and F-Alt (Crystalline Swan)"*.

| Contract role | Source line | Verbatim source value | Adopted as |
|---|---|---|---|
| Sapphire composition | `:130` | `bg: '#002060'` | Midnight Sapphire `#002060` |
| Raised plane | `:131` | `surface: '#003080'` | Royal Depth `#003080` |
| Decorative seam | `:132` | `accent: '#C6A84B'` | Gilded Fern `#C6A84B` |
| Mark highlight | `:133` | `gaming: '#60C0F0'` | Ice Wing `#60C0F0` |
| **NOT ADOPTED** | `:134` | `secondary: '#50A0F0'` | **Arctic Cyan — DATA ONLY (ruling 3)** |
| Tertiary | `:135` | `tertiary: '#4070C0'` | Swan Lavender `#4070C0` |
| Text | `:136` | `textPrimary: '#E0ECF4'` | Frost White `#E0ECF4` |
| CTA border | `:139` | `border: 'rgba(96, 192, 240, 0.2)'` | Ice Wing at 20% |

**All eight adopted values are byte-identical to the approved Swan palette.** No conflicting retired
colour appears in the selected preset.

### Ruling 3 enforcement — the non-adoption above is deliberate

`design.md:53` marks Arctic Cyan `#50A0F0` **"DATA ONLY — chart series. NOT buttons, NOT glow."** The
source preset assigns it to `secondary`, and the P1 flat palette list would have carried it onto an
interactive CTA. **Per the §12 ruling, the `secondary` binding is NOT adopted.** Interactive accents use
**Gilded Fern `#C6A84B`** or **Ice Wing `#60C0F0`** instead.

### Variant inventory — what exists, and what is NOT imported

Seven presets are declared in this file, not five:

| Line | `id` | Name | Status for this surface |
|---|---|---|---|
| `:95` | `A` | (Preset F — Enchanted Apex) | Reference only |
| `:126` | `B` | **Crystalline Swan** | **Palette source — adopted** |
| `:157` | `C` | Hybrid (F-Alt palette, low motion) | Reference only |
| `:181` | `obsidian-bloom` | — | Not adopted |
| `:216` | `frozen-canopy` | — | Not adopted |
| `:247` | `ember-realm` | — | Not adopted |
| `:281` | `twilight-lagoon` | — | Not adopted |
| `:312` | `nebula-crown` | — | Not adopted |

**A0r's "five named variants" was a count of the adoption candidates, not of the file.** Eight presets
are declared. Recorded here because the provenance table is the place a later reader checks a count.

**No variant's animation module, particle system, perpetual loop, stagger choreography or scroll
choreography is imported.** Only the colour values in the table above are taken, and they are taken as
values — not by importing the module. `frontend/src/pages/HomePage/cinematic/` retains **zero** runtime
importers under the R1/A6 finding, and that remains true after this slice.

### Asset manifest — the poster question, answered

| Candidate | Resolution | Verdict |
|---|---|---|
| `assets/Logo.mark128.png` | 128×128 | **Insufficient for the hero poster.** The contract forbids using this as final hero artwork ("do not upscale the measured 128px placeholder"). It remains correct for the 28–52px header slot. |
| `assets/Logo.png` | 1024×1024 | **Candidate**, but it is the 1.2 MB brand asset the header deliberately stopped using. Reusing it in the hero reintroduces the payload the header shed. |

**Outcome: the poster must be produced as local 560px (and 1120px) exports.** No existing asset is
suitable at hero size without upscaling, and the contract forbids upscaling. **This is an outstanding
production task, not something this receipt can close** — see the A7 status in
`SLICE-RECEIPTS-2026-09-21.md`. Until those exports exist, A7's poster cannot be the *final* artwork.

---

**Retained P1 content below (desktop/mobile geometry)**

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

**Full, lean, reduced, and failure states** — **superseded by "States" above (P2 amendment).** The P1
table is preserved in the backup and git history; it is not reproduced here, because two live state
tables that disagree about "no R3F request" versus "no hero controller construction" is exactly the
kind of split authority that produces a conforming-but-wrong implementation.

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
