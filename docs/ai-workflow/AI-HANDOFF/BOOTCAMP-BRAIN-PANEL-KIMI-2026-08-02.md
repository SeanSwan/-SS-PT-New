# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/BOOTCAMP-BRAIN-PANEL-BRIEF-2026-08-02.md
**Seed:** (none)
**Tokens:** 3430 in / 6721 out | **Cost:** ~$0.1111 | **Wall:** 223.8s | **finish_reason:** stop

---

# Kimi K3 — Hostile Design & Implementation Review
## "Bootcamp Rolodex Brain" Panel Brief

---

## Executive Thesis

This brief is algorithmically ambitious and **front-end bankrupt**. It specifies a transition-cost optimizer, a treatment-rotation brain, and a situation library — and then allocates exactly one sentence of UI contract ("closed-enum chips, max 2 per row, one class-level line") to the surface where every one of those decisions becomes visible to a tired trainer holding a phone at 6am. Under the brief's own ruling — *Qwen builds, Qwen does not decide* — the current document **fails its own test on the entire presentation layer**: a builder handed this brief would be forced to invent chip colors, enum keys, chart choices, breakpoint behavior, touch targets, loading states, and error states. That is dozens of unmade decisions in the exact layer the SwanStudios design system governs. I would build, before any algorithm slice ships a pixel: **(1)** a frozen `ExplainabilityChip` contract with a closed key enum and tokenized tone map, **(2)** a `TransitionCostMatrix` Victory heatmap spec that makes the rig-transition model *legible* rather than hidden, and **(3)** a dark-first, 44px, reduced-motion-safe `ClassPlanView` shell at 375px-first. Everything in sections 1–6 of this brief is invisible to the trainer unless these exist; chips that can't render the brain's choices are a brain that doesn't exist.

---

## Severity-Ranked Weaknesses

| # | Severity | Weakness | Evidence in brief | Consequence if shipped |
|---|----------|----------|-------------------|------------------------|
| W1 | **Critical** | Zero UI component contract for explainability. §3.7 names the *concept* of chips but supplies no enum keys, no tone→token map, no max-width/truncation rule, no empty state. | "Specify the chips this new intelligence adds" — the brief *asks the panel* to do the thing the builder needs done. | Builder invents ~15 chip variants with ad-hoc colors; WCAG 4.5:1 failures on `relaxed` tone; fabricated-looking justifications the validator can't catch because the enum isn't closed at the UI layer. |
| W2 | **Critical** | The transition-cost model (§2.4, the brief's own "highest-leverage idea") has **no visualization spec**. A trainer cannot see *why* bands clustered at the front. | §3.3–3.4 specify math only. | The brain's best idea reads as arbitrary ordering; trainer trust collapses; trainer hand-edits the plan and the feedback loop (ratings) records noise. |
| W3 | **High** | "6am floor, tired trainer, phone in one hand" (§2.8) is stated as context and then never operationalized. No touch-target rule, no one-hand reach zone, no dark-first token set, no contrast floor appears anywhere. | §2.8 | Desktop-shaped tables; 32px tap targets; light-mode bleed; a trainer who can't hit Regenerate with a thumb. |
| W4 | **High** | No loading / error / empty-state spec for the Generate press, and §3.4 demands an optimizer that runs "per Generate press." | §3.4 | Builder either blocks the UI with no feedback or invents a spinner with animation that violates reduced-motion. On a 4-person class at 6am on gym Wi-Fi, perceived latency *is* the product. |
| W5 | **High** | Reduced-motion is unmentioned in the entire document. Victory animates by default; any chart or list-reorder transition a builder writes will animate. | Absent globally. | WCAG 2.3.3-adjacent failure; vestibular risk; motion on a screen being glanced at between stations. |
| W6 | **Medium** | 300-line file cap (§2.8) is named as a backend constraint but no front-end file split is planned. A `ClassPlanView` with chips, matrix, station columns, and situation banners is a 600-line file waiting to happen. | §2.8 | Builder dumps everything in one component, or splits arbitrarily mid-slice and breaks reviewability. |
| W7 | **Medium** | No responsive spec for the station-rotation plan view. Stations-as-columns works at 1440px and is unusable at 375px; the brief never says what flips. | Absent globally. | Horizontal scroll on the primary artifact, or columns crushed to 60px with truncated exercise names. |
| W8 | **Medium** | Fact chips are "derived from the FINAL plan (never LLM-narrated)" (§2.7) but there is no stated rule for what the UI renders when the validator *rejects* a plan and the selection is backfilled. The brief explicitly fears "a rejected-then-backfilled selection carrying a fabricated justification" (§3.7) and then provides no UI mechanism preventing it. | §2.7, §3.7 | The exact failure the brief dreads ships silently. |
| W9 | **Low** | Class-size thresholds (§3.6) have no corresponding UI state change — a warning that matters at 24 people is noise at 4. | §3.6 | Alert fatigue; trainer learns to ignore all chips, including the structural ones. |
| W10 | **Low** | No dark-first token table exists in the brief at all; "Crystalline Swan" is never referenced. The design system the output must conform to is assumed, not specified. | Absent globally. | Hex codes in components; un-themable UI; light-mode regressions. |

---

## Single Highest-Impact Improvement

**Freeze the `ExplainabilityChip` contract — closed enum, tokenized tones, rendering rules, and backfill-behavior — as Slice UI-0, before any algorithm slice ships a pixel.**

Every algorithmic decision in this brief (treatment rotation, rig-transition savings, situation mitigation, class-size coupling, ladder relaxation) terminates in one of exactly two UI elements: a chip or the class-level line. If that contract is not frozen first, each of the six subsequent slices invents its own rendering, the validator's "no hidden relaxations" guarantee has no visible surface, and W1/W8 compound. It is also the cheapest slice in the entire program — one enum, one component, one storybook-style fixture page — with the highest blast radius if skipped.

---

## Builder-Exact Corrections (Design System Layer)

### C1 — Token table (Crystalline Swan, dark-first, WCAG-verified)

All values verified against `#0B0F1A` (`--cs-bg-base`) background. **No raw hex outside `theme.ts`.**

| Token | Value | Use | Contrast on base |
|---|---|---|---|
| `--cs-bg-base` | `#0B0F1A` | App background | — |
| `--cs-bg-raised` | `#141A2A` | Cards, station panels | — |
| `--cs-bg-overlay` | `#1C2438` | Chip backgrounds | — |
| `--cs-ink-primary` | `#EDF1F7` | Body text | 15.8:1 |
| `--cs-ink-secondary` | `#A8B3C7` | Metadata, timestamps | 8.1:1 |
| `--cs-ink-muted` | `#7A869E` | Disabled, hints | 5.2:1 — **floor; never go dimmer** |
| `--cs-accent-swan` | `#6EC1E4` | Interactive, focus ring, links | 9.4:1 |
| `--cs-tone-structural` | `#8FB8FF` | `structural` chips | 9.1:1 |
| `--cs-tone-earned` | `#7DDBA3` | `earned` chips | 10.3:1 |
| `--cs-tone-relaxed` | `#F2C14E` | `relaxed` chips — names the bent rule | 11.0:1 |
| `--cs-tone-alert` | `#F26D6D` | Situation banners, infeasibility | 5.9:1 |
| `--cs-border-subtle` | `#2A3350` | 1px card/chip borders | — |
| `--cs-focus-ring` | `#6EC1E4` | 2px outer ring, 2px offset | — |

Chart series (Victory `colorScale`, ordered for deuteranopia safety): `["#6EC1E4", "#F2C14E", "#7DDBA3", "#B48FF2", "#F26D6D"]`.

### C2 — `ExplainabilityChip` component contract (fixes W1, W8)

**File:** `shared/bootcamp-ui/ExplainabilityChip.tsx` (≤ 120 lines)

Closed enum — builder implements **exactly these keys, no others**. Backend emits keys only; UI owns labels. This is the anti-fabrication mechanism: *a backfilled selection can only emit a key from the enum, and the label is a fixed template — there is no slot for invented prose.*

```ts
export type ChipKey =
  // D-A treatment rotation
  | 'treatment.superset'      | 'treatment.dropset'
  | 'treatment.tempo'         | 'treatment.cluster'
  | 'treatment.isometric'     | 'treatment.density'
  | 'treatment.staple_return' // staple back with new treatment
  // D-B rig chaining
  | 'rig.chained'             // shares rig with prior exercise
  | 'rig.band_block'          // inside band-contiguous run
  | 'rig.strip_to_cardio'     // band run exits to no-kit cardio
  | 'rig.transition_saved'    // label template: "saves {n}s at rotation"
  // Ladder (shipped slices 0–2, preserved)
  | 'ladder.relaxed_r1' | 'ladder.relaxed_r2' | 'ladder.relaxed_r3'
  | 'ladder.relaxed_r4' | 'ladder.relaxed_r5' | 'ladder.structural_r6'
  // Situation library (§3.5)
  | 'situation.desync_guard'  | 'situation.kit_contention'
  | 'situation.wall_anchored' | 'situation.adjacency_split'
  | 'situation.late_joiner'   | 'situation.sightline_kept'
  // Class-size coupling (§3.6)
  | 'size.collapsed_stations' | 'size.treatment_capped'
  | 'size.load_ladder_thin';

export type ChipTone = 'structural' | 'earned' | 'relaxed';
```

Rendering rules (hard requirements):

| Rule | Value |
|---|---|
| Max per exercise row | 2 (overflow → `+{n}` affordance, opens bottom sheet, 44px rows) |
| Min height / horizontal padding | 28px visual height, **44px min touch target via `padding-block: 8px` on interactive chips** |
| Border | 1px `--cs-border-subtle`; `relaxed` tone gets 1px `--cs-tone-relaxed` left-accent 3px bar |
| Label template | Fixed string per key with at most one interpolated number (e.g. `rig.transition_saved` → `"Saves 20s at rotation"`). **No free-text interpolation — the type is `number | undefined`, not `string`.** |
| Backfill rule (W8) | Chips derive from the **post-validation plan object only**. If validator rejects and backfills, the backfilled selection emits **no chip** unless the re-validated plan earns one. Implement: chips computed in `deriveChips(finalPlan)`, never from `attemptLog`. |
| Truncation | `max-width: 220px`, `text-overflow: ellipsis`, full label in `title`/`aria-label` |

### C3 — `TransitionCostMatrix` (fixes W2 — the brief's best idea made visible)

**File:** `shared/bootcamp-ui/TransitionCostMatrix.tsx` (≤ 180 lines)

- **Chart:** Victory `VictoryChart` + `VictoryGroup` of `VictoryBar` is wrong here (categorical × categorical). Use a **heatmap rendered as a Victory `VictoryScatter` with square `symbol` and `style.data.fill` from a 5-step sequential scale** (`#141A2A → #1E3A52 → #2E6B8F → #6EC1E4 → #B8E2F5`), or — preferred for a11y — a plain styled-components CSS grid table with the same fill scale. Victory is mandated for *charts*; a matrix with cell values printed is more accessible than any scatter and survives screen readers. **Decision: CSS-grid matrix with numeric cell values, color as redundant encoding. Victory is used only for the per-boundary stall bar chart below.** (Victory heatmaps lose on accessibility; the table wins.)
- Rows = exercises at station boundary *k*, columns = boundary *k+1*, cell = `cost(A→B)` seconds.
- Companion: **one** `VictoryBar` (horizontal, ≤ 8 bars) showing `class_stall_at_boundary_k` per rotation — this is the §2.5 objective made visible. `animate={false}` always (see C6).
- Trainer-facing summary chip on the class header: `rig.transition_saved` with total seconds saved vs. naive ordering.

### C4 — `ClassPlanView` responsive shell (fixes W3, W7)

**File split (fixes W6):** `ClassPlanView.tsx` (≤ 200) → `StationColumn.tsx` (≤ 160) → `ExerciseRow.tsx` (≤ 180) → `SituationBanner.tsx` (≤ 100). No file exceeds 300 lines; if `ExerciseRow` approaches it, extract `ExerciseRowChips.tsx`.

| Breakpoint | Layout |
|---|---|
| **320 / 375 / 414** (primary — phone in one hand) | Stations become **stacked full-width cards**, not columns. Exercises are rows ≥ 44px. Rotation boundaries are full-width dividers labeled "ROTATE — 20s". Regenerate is a sticky bottom bar, thumb-zone, 56px height, full-width, `--cs-accent-swan` text on `--cs-bg-raised`. |
| **768** | 2-column station grid. |
| **1024 / 1440** | Stations-as-columns, max 4 across, then wrap. Transition matrix in right rail at 1440. |
| **2560 / 3840** | Content max-width `1600px`, centered. **Do not stretch station columns past 380px** — line length destroys scanability. Matrix and stall chart side-by-side in rail. |

Typography: exercise name 16px/`--cs-ink-primary`; chips 12px/`--cs-ink-secondary`; **never below 12px anywhere**.

### C5 — Generate-press states (fixes W4)

| State | Spec |
|---|---|
| Idle | Sticky bar, label "Generate plan" |
| Pending | Bar label "Building plan…", **non-animated** progress: step text cycling via text swap only (`"Ordering stations" → "Chaining rigs" → "Checking situations"`), each tied to a real pipeline stage, not a fake timer. No spinner with motion. |
| Error (no feasible plan) | Never blank. Render the R6 structural-out plan with a `--cs-tone-alert` banner: `"Relaxed 2 rules to fill this class — see marked rows."` The `relaxed` chips on affected rows name the bent rules (shipped validator already guarantees this data exists). |
| Empty Rolodex fallback (76-entry registry) | Banner, `--cs-tone-alert`: `"Offline registry active — 76 exercises."` |

### C6 — Reduced-motion safety (fixes W5)

Global, non-negotiable, builder-exact:

```ts
// shared/bootcamp-ui/motion.ts (≤ 30 lines)
export const motionSafe = (css: string) =>
  `@media (prefers-reduced-motion: no-preference) { ${css} }`;
```

- All transitions/animations wrapped in `motionSafe(...)`. Default (reduced) experience has **zero animation** and loses no information.
- Victory: every chart sets `animate={false}` unconditionally — chart *entry* animation is decorative and the 6am glance context means charts must be readable on first paint.
- Station card reorder after Regenerate: no FLIP animation. Instant re-render with a 1s `--cs-bg-overlay` highlight flash on changed rows (color change only, no motion — permitted under reduced-motion).

---

## Answers to Panel Questions 1–9 (Design-Reviewer Scope)

I answer in order, restricted to what a front-end/design reviewer owns: the rendering contracts and the decisions the brief leaves to a builder **in my layer**. Algorithmic internals are for HY3/Opus 5 — but where the algorithm's output shape determines UI feasibility, I pin the shape.

### 1. Treatment model — UI contract

The selection function is backend. What the builder must not invent is the **output shape**:

```ts
interface TreatmentRecord {           // rendered per ExerciseRow
  key: Extract<ChipKey, `treatment.${string}`>;
  loadLadder?: number[];              // dropset only — renders as "32 → 24 → 16"
  unsafe_suppressed?: never;          // FORBIDDEN field: ineligible treatments
}                                     // are absent, never shown as disabled
```

**Decision:** ineligible treatments (drop-set plank) are **omitted from the payload**, not rendered as disabled chips. A disabled chip invites the trainer to ask "why not," and the answer would require prose. The eligibility predicate stays server-side; the UI never sees it. The alternative (showing suppressed options) loses because it creates an explainability surface the closed enum can't serve.

### 2. Repeat-with-variation vs staleness — UI contract

Wherever the backend draws the numerical line, the UI needs exactly one element: a class-header chip `treatment.staple_return` count and the class-level line: `"6 staples returning with new treatment · 4 fresh movements"`. **Decision: render repeat-ratio as text in the class-level line, not a Victory gauge.** A gauge implies a target zone we'd have to defend; the number alone is scannable and honest. The line is capped at 90 chars, truncates with ellipsis, `aria-label` carries the full string.

### 3. Setup as transition function — confirmed, with a UI consequence

I confirm §2.4 from the design side: a per-exercise scalar is not just the wrong model, it's an **unrenderable** model — there is no honest chip for "this exercise costs 15s" when the real cost depends on its neighbor. The transition-function model is what makes `rig.chained` / `rig.transition_saved` chips *true*. **Requirement on the backend payload:** transition costs must be emitted per boundary (`boundaries: { index: number; stallSeconds: number; bottleneckStationId: string }[]`) or the stall chart (C3) cannot be built and the builder will invent per-exercise cost badges that lie.

### 4. Rotation-boundary objective — UI contract

Whatever algorithm wins (backend's call), the UI requires: (a) the per-boundary stall payload above; (b) the bottleneck station row highlighted with a 1px `--cs-tone-alert` left border on its card at that boundary; (c) the one-chip explanation: `rig.transition_saved` with interpolated seconds. **Determinism requirement on the algorithm:** identical inputs must produce identical boundary ordering, because the UI diffs plans across Generate presses and highlights changed rows (C6) — a nondeterministic optimizer makes the diff highlight flicker and destroys trainer trust in the highlight itself.

### 5. Situation library — detection/mitigation is backend; surfacing is mine

Each situation gets: detection (backend) → one enum key (C2) → one rendering rule. Builder-exact:

| Situation | Chip / surface | Rendering rule |
|---|---|---|
| Group desync (one station's work >> others) | `situation.desync_guard` on the padded station | `earned` tone; class line names the equalizer |
| Equipment contention across stations | `situation.kit_contention` + banner if unresolved | Banner `--cs-tone-alert`, top of plan, dismissible (44px close target) |
| Wall/floor/corner anchor | `situation.wall_anchored` on the station card | `structural` tone; station card header icon (SVG, 20px, `--cs-ink-secondary`) |
| Incompatible adjacency (noise/impact) | `situation.adjacency_split` | Both affected rows carry the chip |
| Late joiner | `situation.late_joiner` | Rendered only in the *live* view, never the plan view — plan-time prediction is speculative |
| Sightline to trainer | `situation.sightline_kept` | `structural`; max 1 per class — this is a layout property, not a per-row fact |

**Ranking constraint imposed on the backend:** at most **one** situation banner visible at a time, ordered by the backend's frequency × damage rank. Alert stacking at 6am trains banner-blindness (W9 mechanism).

### 6. Class-size coupling — UI thresholds

The UI does not need the backend's internal thresholds; it needs the **state changes**. Builder-exact rendering rules:

| Headcount | UI change |
|---|---|
| 4 | `size.collapsed_stations` chip on class header; station cards render 2 |
| 8 | Default; no size chips (silence = nominal) |
| 14 | `size.treatment_capped` on rows where a superset/drop-set was suppressed due to kit-per-person; `earned` tone |
| 24 | `size.load_ladder_thin` + one banner if load ladders were degraded; stall chart gets `--cs-tone-alert` bar for any boundary > 30s |

**Decision:** size warnings render only when something was *suppressed or degraded* — never as informational "you have 14 people" noise. Fixes W9.

### 7. Explainability — the full spec is C2/C3/C5 above

One addition: the class-level line has a **fixed grammar**, not free text:
`"{n} staples varied · {n} fresh · rigs chained through station {n} · cardio strips bands"`. Each clause is emitted only if true, joined with ` · `, max 3 clauses, priority order: treatment → rig → size. This is the anti-fabrication guarantee at the sentence level: the line is *assembled from booleans*, never written.

### 8. What the brief got wrong (highest-value section)

1. **The brief violates its own founding constraint.** "Qwen does not decide" — and yet the entire presentation layer is one open question. The brief makes ~40 backend decisions and ~0 frontend ones. W1 is not a gap; it is the brief failing its own acceptance test.
2. **§2.7's "max 2 chips per selection" will collide with the new intelligence.** Treatment + rig + situation + ladder chips on one staple exercise can legitimately reach 4. The brief never says which two win. **Ruling made here:** priority order `relaxed > situation > treatment > rig`, ties broken by enum order in C2. A builder must never pick.
3. **"One class-level line" is undersized** for what §3.5–3.6 ask it to carry. Ruling: the line carries status; situations that need action get the single banner slot (Q5). Two surfaces, fixed priority, no prose.
4. **The brief assumes the trainer reads the plan.** At 6am the trainer *glances*. Every decision above 2 chips deep is invisible. This is why the heatmap (C3) matters more than any chip: it's the only surface that explains rig-chaining at glance speed.
5. **§2.8's 300-line cap is stated without a split strategy.** C4 provides it; the brief should have.
6. **Nothing specifies the validator-rejection path visually** (W8). The brief names the fear and builds no wall. C2's "chips derive from final plan only" is the wall.
7. **A builder would still have to invent:** the enum keys (now frozen in C2), the tone palette (C1), breakpoint behavior (C4), loading copy (C5), chart choice (C3), motion policy (C6), chip priority under overflow (item 2 above), and banner stacking (Q5). After this review, none remain open in the UI layer.

### 9. Slice order — front-end, independently shippable

| Slice | Ships | Acceptance criteria (zero-question executable) |
|---|---|---|
| **UI-0** | `theme.ts` (C1) + `ExplainabilityChip` (C2) + `motion.ts` (C6) | All 23 enum keys render from fixtures; axe-core passes on all three tones at 375px; every chip ≥ 44px touch target; `deriveChips` consumes a mock final plan; a fixture with a rejected-then-backfilled selection renders **zero** chips; all files ≤ 300 lines |
| **UI-1** | `ClassPlanView` shell + `StationColumn` + `ExerciseRow` (C4) | Layout matches C4 table at all 8 breakpoints (screenshot-tested at 320/375/414/768/1024/1440/2560/3840); sticky 56px Generate bar ≤ 414px; no horizontal scroll at 320; content max-width 1600px ≥ 2560 |
| **UI-2** | Generate states (C5) | Pending state advances through 3 stage texts with no animated element; error state renders R6 plan + alert banner; reduced-motion emulation shows zero animation |
| **UI-3** | `TransitionCostMatrix` + stall `VictoryBar` (C3) | Renders `boundaries[]` payload; every Victory chart has `animate={false}`; bottleneck station card shows alert border; matrix cells carry numeric text (not color-only) |
| **UI-4** | `SituationBanner` + situation chips (Q5) | Max 1 banner regardless of payload size, selected by backend rank; banner dismiss target ≥ 44px; `late_joiner` never renders in plan view (unit test) |
| **UI-5** | Size-coupling surfaces (Q6) | Fixtures at 4/8/14/24 render exactly the chips in the Q6 table and no others; 8-headcount fixture renders zero size chips |

Each slice ships behind the existing plan view (UI-0/1/2 are pure additions); none touches slices 0–2's validator or ladder payloads — regression surface is the `deriveChips` input contract, which is read-only.

---

## Bottom Line

The brain this brief designs is only as good as its chips. Freeze the enum, tokenize the tones, render the transition cost as a matrix the trainer can glance at, keep every target 44px and every chart still — then let HY3 and Opus 5 argue about the optimizer. The decisions above are made; a builder needs nothing further from the design layer.
