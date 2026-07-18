# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** .ai-workflow/fusion/kimi-design-skill-redo.md
**Seed:** (none)
**Tokens:** 1345 in / 8856 out · **Cost:** ~$0.1369 · **Wall:** 221.8s

---

---
name: swan-design-router
description: >-
  The SwanStudios design brain and taste law. Load for ANY SwanStudios UI or
  front-end work — pages, components, dashboards, marketing surfaces, themes,
  motion, charts, generated assets, redesigns, or visual audits — and before
  writing any styled-component, choosing a color, or approving a pixel.
  Encodes the Enchantment Ratio, the gold allowlist, optics-not-creatures,
  the Crystallize signature moment, two-speed motion law, Dual-Button Glow
  protocol, world/lens token contract, build-exact / full-stack-real /
  reversible discipline, the responsive matrix, and the kill-list. This skill
  is the law; the reference docs are the library.
---

# SWAN DESIGN BRAIN

You are not decorating software. You are building a crystalline training
universe that happens to ship as a web app. Every surface either proves that
or betrays it.

**North star:** realism as substrate, exactly one impossible phenomenon per
surface, zero decoration without meaning. If a screen could pass for a
template screenshot, it fails.

---

## LAW 1 — The Enchantment Ratio

Every surface = **believable substrate + exactly ONE impossible phenomenon.**

- Substrate: physics-honest light, plausible depth, real material behavior.
  Nothing glows, floats, or drifts without cause.
- The ONE impossible phenomenon must be **load-bearing** — it encodes state
  or meaning (a PR, an executed action, a living world). Never confetti.
- Zero impossible phenomena → engineer-built. Reject.
- Two or more → AI slop. Reject.
- Taste is **exclusion, ratio, and pairing** — what you refuse, in what
  proportion, beside what. It is never a noun list of "premium" adjectives.

## LAW 2 — Gold is an allowlist, not a palette member

Gold renders ONLY as:

1. PR numeral + its delta
2. Filigree line ≤ 1px
3. Focus ring
4. One badge per scene, maximum

Gold anywhere else is a defect — not "used sparingly," **nowhere else.**
Scarcity is the entire mechanism: every unearned gold pixel devalues the PR
bloom.

## LAW 3 — Kill-list (reject on sight)

- Iridescent unicorn gradients, including purple→cyan diagonal washes
- Lens flare
- Star-bokeh soup / causeless particle fields
- Glass-on-glass (frosted panel stacked on frosted panel)
- "AI fantasy wallpaper" energy
- Literal creature silhouettes (see LAW 4)
- Generic dark-mode glassmorphism-plus-gradient — the #1 failure mode
- Glow on everything (glow is allocated, per LAW 7)

If you catch yourself reaching for one of these, stop. That is not direction;
that is defaults wearing a costume.

## LAW 4 — Optics, not creatures

Nature enters this product as **light behavior only**: refraction, caustics,
dispersion, interference, sonar rings. Never as literal animal form.

- **Structural basis:** the system has no arbitrary-geometry primitive. A
  creature silhouette is therefore unauthorable. Do not add one.
- Whale = sonar light-rings expanding through depth.
- Rainbow = real dispersion physics: red outside, violet inside, ~40–42°
  antisolar geometry. Never a striped arc graphic.
- The swan lives in the Crystallize and nowhere else. Facets imply the bird;
  you never draw the bird.

## LAW 5 — The Crystallize (the one ownable signature)

When a member **executes** — logs a set, finishes a workout, sets a PR — the
action condenses into a **faceted crystalline record artifact.**

Spec once, reuse everywhere:

- **States:** `pending → forming → formed → resting`
- **Motion:** FLIP only (transform + opacity), ~400ms total
- **Numerals:** `font-variant-numeric: tabular-nums`, always
- **PR:** gold bloom on numeral + delta (allowlist slot 1)
- **Reduced motion:** instant swap, no transition

Never invent a second celebration pattern — no confetti, no badge rain, no
one-off success animations. Everything records through the Crystallize: sets,
PRs, streaks, achievements, history.

## LAW 6 — Two-speed motion

| Surface class | Motion budget |
|---|---|
| PUBLIC (marketing, landing, scroll-story) | Cinematic, alive, full enchantment budget |
| IN-APP (dashboards, tables, charts, tools) | Calm atmosphere. GPU-safe. Honors reduced-motion. **Never motion under data surfaces.** |

In-app distraction caps — mechanized, testable, not vibes:

- Per-layer luminance oscillation: OKLCH ΔL ≤ 0.05
- Drift cycle ≥ 20s
- Particulate speed ≤ 10px/s
- Opacity oscillation Δ ≤ 0.03

A layer exceeding any cap is a bug, not an aesthetic.

## LAW 7 — Dual-Button Glow protocol

Glow is **allocated per surface and re-validated every time** — never
inherited:

- Blue background → wing-purple glow
- Purple background → ice-cyan glow
- Label vs fill ≥ 4.5:1
- Glow boundary vs scene ≥ 3:1
- Boundary unreachable → add a 1px border. **Never change the hue.**

## LAW 8 — World/Lens token contract

Every surface binds to the Swan lens through tokens so the Appearance Studio
can switch palette + lens + world and re-skin everything with zero code
change.

- Consume `--world-*` and `--lens-*` tokens. Never hardcode a look.
- Worlds are **data, not code** — a world is a token map, not a branch in a
  component.
- **Fail-closed:** missing token → fall back to base Swan tokens. Never raw
  hex, never silent wrongness.
- `var(--token, fallback)` where the fallback is a Crystalline value only.

## LAW 9 — Hard build rules (non-negotiable)

- **styled-components only.** No MUI, no Tailwind, no CSS modules, no inline
  styles.
- **Tokens-with-fallback.** No raw hex anywhere.
- **RETIRED Galaxy-Swan is banned** — `#0a0a1a`, `#00FFFF`, `#7851A9` —
  including inside `var()` fallbacks. Scan fallbacks, not just declarations.
- 300-line cap per file. Split or compose.
- 44px minimum touch targets.
- WCAG AA everywhere.
- Victory renders all charts. Nothing else touches data visualization.
- **Zero PII** in code, fixtures, stories, and screenshots. IDs and roles
  only.

## LAW 10 — Content law

- "Stretching" / "flexibility" — never "yoga" / "meditation."
- "26+ years" / "NASM-protocol" — never "NASM-certified."

## LAW 11 — Anti-generic

The default failure is "engineer-built, not designed." Every surface MUST
have, written down before code:

1. A **named visual direction** (one sentence)
2. **One signature moment** (usually the Crystallize — if not, justify)
3. IA that narrates the **member's journey**, not the component's
   capabilities

Nav labels, empty states, and section order tell the story of a member
getting stronger. "Modules" and "features" are how engineers talk. Members
have a journey.

---

## Decision procedure — every UI task

**Step 0 — Classify:** NET-NEW / REDESIGN / AUDIT / ASSET.

**Step 1 — Locate:** surface class (public vs in-app), route, and data
contract — real API + model, or flag **NEW BACKEND**.

**Step 2 — Direction (Gate 0):** write one sentence naming the direction,
the ONE impossible phenomenon, and the signature moment. If you cannot write
it, do not build. Ask.

**Step 3 — Bind:** world/lens tokens, palette slots, type scale, spacing.
Confirm zero kill-list material in the plan.

**Step 4 — Blueprint:** BUILD-EXACT spec (below).

**Step 5 — Build, then pass Gates 1–3.**

### Task-type notes

- **NET-NEW:** full procedure. Direction sentence mandatory.
- **REDESIGN:** name which law the current surface violates. Ship as
  next-version component + feature flag.
- **AUDIT:** findings cite laws, not taste. Format:
  `[LAW n] violation — evidence — fix`. No "consider," no "maybe."
- **ASSET:** load SWAN-ASSET-STORYBOARDING.md. Optics-not-creatures and the
  two-speed law bind generated media too.

## BUILD-EXACT blueprint format

A builder must make **zero decisions.** Specify:

- File paths + names (next-version naming: `ThingV2.tsx`)
- styled-component names, props, token bindings with fallbacks
- Every state: default / hover / focus / active / disabled / loading /
  empty / error / reduced-motion
- Behavior at each responsive row that applies (matrix below)
- Copy verbatim, respecting LAW 10
- Data: exact API endpoint + model fields; flag **NEW BACKEND** if absent
- Feature flag name + kill path

If the builder can ask a question, the blueprint is incomplete.

## FULL-STACK REAL

- No mocks, no lorem, no invented data shapes.
- Every pixel of data traces to a named API and model.
- New backend work is additive only: new endpoints, new nullable columns.
  No destructive migrations, no renames.

## REVERSIBLE

- Next-version component + feature flag, always.
- The old path survives until the new one ships clean.
- Backend changes additive-only.

---

## Responsive matrix

| px | Role | Rules |
|---|---|---|
| 320 | Floor | Nothing breaks. No horizontal scroll. Minimums hold. |
| 375 / 414 | Primary phone | One column. 44px targets. Primary action in thumb reach. |
| 768 | Tablet | Two-column only where earned. Atmosphere layers reduced. |
| 1024 | Small desktop | Full nav. Data surfaces get air. |
| 1440 | Reference desktop | Design in-app surfaces here first. |
| 2560 | Wide | Content max-widths engage. No stretched soup. |
| 3840 | 4K | Type and atmosphere scale; max-widths hold; motion cost capped. |

Never changes at any width: contrast ratios, 44px targets, token discipline,
reduced-motion path.

---

## Gates

**Gate 0 — Direction (pre-code):** direction sentence? one impossible
phenomenon? signature moment? surface class? Missing any → stop.

**Gate 1 — Taste (in build):**
- Gold only in allowlist slots
- Kill-list scan: zero hits
- No creature geometry
- No raw hex; no Galaxy-Swan values (fallbacks scanned too)
- No glass-on-glass

**Gate 2 — Contrast & motion:**
- Dual-Button Glow re-validated on THIS surface: 4.5:1 label, 3:1 boundary,
  1px border fallback, hue unchanged
- In-app layers within distraction caps
- Reduced-motion path exists (Crystallize = instant swap)
- AA pass

**Gate 3 — Ship:**
- Builder made zero decisions — blueprint was exact
- Every datum traces to a named API/model; NEW BACKEND flagged
- Feature flag + next-version naming + additive-only backend
- 300-line cap, 44px, zero PII, Victory-only charts
- Matrix spot-checked at 320 / 375 / 768 / 1440 minimum

---

## References — load on demand

This skill is the law. These are the library.

| Doc | Load when |
|---|---|
| SWAN-CINEMATIC-DESIGN-SYSTEM.md | Cinematic/public builds; deep palette + motion values |
| SWAN-ASSET-STORYBOARDING.md | Any generated or commissioned media: video, image, loop, storyboard |
| design.md (legacy Design Brain) | Historical context only |

**Precedence on conflict:** this skill > reference docs > existing
components > library defaults. Old components are not precedent — most
predate the law.

---

Hold the line: scarcity, physics, one miracle per screen.
