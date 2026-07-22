---
decision: Arc C blueprint — client charts "on another level": every element clickable with truthful drill-down, lens-connected, worker-executable in Fable+Kimi's vision
status: open
supersedes: none
---

# ELEGANCE BLUEPRINT — Arc C: Interactive Client Charts

**Sean's contract:** "every single element clickable… information and data that would explain
something… deeper." No dead one-box-of-words charts. Beautiful AND usable. Everything rides the Swan
Lens (theme changer) seamlessly.

**Worker contract:** execute exactly this; do not re-decide. Victory ONLY. Colors ONLY through
`lensChartPalette.tsx` / `chartTheme.ts` (lens-connected — extending those files is allowed, bypassing
them is BANNED). Real-log data-truth: a drill-down shows real underlying entries or an honest
"unlocks after N sessions" cold-start line (W0.1 contract) — never fabricated numbers.

## Verified current state (do not re-audit)
- 9 Victory chart files, ZERO interaction events today (grep-verified).
- `charts/live/`: BodyFatTrendLine, IntensityRpeTrendLine, MacroSplitDonut, MuscleGroupBalanceBars,
  RecoverySignalBars, WeightProgressionLive, WorkoutFrequencyBar. Plus `heatmap/WorkoutHeatmapCalendar`,
  `pie/MacroDonut`, `ExerciseHistoryChart.tsx` (473 ln — over cap; interaction lands via the shared
  system, NOT by growing this file), SafeChart error boundary, `victoryStyleProps.ts`.

## Architecture (ONE shared system, not 9 bespoke hacks)
```mermaid
flowchart LR
  V[Victory chart] -->|events: onClick/onFocus datum| H[useChartDrill]
  H --> S[ChartDrillSheet — portal bottom sheet]
  S --> T[Title + value + delta chip]
  S --> W[Why-it-matters line — plain language, per-chart copy map]
  S --> E[Underlying entries list — real rows, max 8 + View all →]
  S --> C[CTA → owning surface: logger / history / restore]
  V --> A[DataTable toggle — accessible mirror of every datum]
```

### New shared files (each ≤300 ln, in `frontend/src/components/Charts/drill/`)
1. `useChartDrill.ts` — state `{ open, datum: DrillDatum | null }`; `openDrill(datum)`, `closeDrill()`.
2. `ChartDrillSheet.tsx` + `.styles.ts` — portal bottom sheet (mobile) / side panel ≥1024px; focus-trap,
   Esc closes, 44px close; sections per mermaid; lens tokens only; reduced-motion = fade only.
3. `drillContracts.ts` — `interface DrillDatum { chartId; label; value; unit; deltaText?; whyText;
   entries: DrillEntry[]; entriesTitle; cta?: { label; href } }` + per-chart `WHY_COPY` map (plain
   language, NO clinical/syndrome words client-side — two-tier copy law) + `buildDrillDatum` helpers
   per chart transforming the datum Victory hands back.
4. `victoryDrillEvents.ts` — factory returning Victory `events` array wiring `onClick` (+`onFocusIn`)
   on data components to `openDrill(buildDrillDatum(chartId, props))`; enlarges hit area via
   `size`/`barWidth` bump on active + invisible hit-strokes ≥44px equivalent.
5. `ChartDataTable.tsx` — the a11y mirror: toggle button ("View as table", 44px) under every drilled
   chart rendering the series as a real `<table>` with row buttons opening the same drill sheet
   (keyboard-first path; Victory SVG a11y is not sufficient — this is the accessible truth).

### Per-chart wiring order (one slice each, same pattern)
C1 WeightProgressionLive → C2 WorkoutFrequencyBar → C3 IntensityRpeTrendLine → C4
MuscleGroupBalanceBars → C5 RecoverySignalBars → C6 BodyFat/MacroSplit/MacroDonut → C7
WorkoutHeatmapCalendar (day-cell → that day's sessions) → C8 ExerciseHistoryChart (points → that
session's sets; file over cap — wire via drill system imports only, net ≤+20 ln).
Every slice: RED test (datum click → sheet with correct label/value/why/entries), wire, GREEN, guards.

### Drill entries data
Prefer data ALREADY in the chart's props/response. Where a chart only has aggregates, the sheet's
entries section renders the honest line "Tap through to history for the full log" with the CTA —
NO new endpoints in this arc (endpoint additions = separate reviewed slice; log as backlog per chart).

## Wireframe — drill sheet (mobile)
```
┌──────────────────────────────┐
│ ▔▔ drag handle               │
│ Squat e1RM        205 lb ▲+25│  ← title, value, delta chip (Gilded Fern)
│ Built from your logged sets — │
│ heavier than any recent week. │  ← whyText, plain language
│ ────────────────────────────  │
│ ENTRIES (LAST 8)              │
│ • Jul 22 — 3×5 @ 185 lb      │  ← real rows, each 44px, tap → history
│ • Jul 19 — 5×3 @ 175 lb      │
│ [ View full history → ]       │  ← CTA (GlowButton primary)
└──────────────────────────────┘
```

## Acceptance (arc-level)
Every chart in `charts/live/` + heatmap + pies + ExerciseHistoryChart: click ANY datum → sheet with
non-empty why-copy + truthful entries/CTA; table toggle present; keyboard path opens the same sheet;
lens palette only (guards + `lint:swan-lens` clean); reduced-motion compliant; SafeChart boundary
still wraps everything; 320px + 4K checked.

## Do-NOT list
No Recharts. No bypassing lensChartPalette/chartTheme. No fake/placeholder drill data — cold starts
speak honestly. No new endpoints this arc. No syndrome/clinical words client-side. ExerciseHistoryChart
stays ≤493 ln. No flags.

## KIMI CO-SIGN DELTAS (2026-07-22 — BINDING; supersede conflicting lines above)

1. **Panel layout contract — five slots, identical for ALL 9 charts (this kills drift):**
   (1) hero metric (value + delta chip) → (2) context sparkline/mini-viz → (3) WHY copy: plain-language
   first sentence, technical tier behind a "How it's calculated" expander → (4) entries table →
   (5) CTA. Register (verbatim voice): e1RM = "Your estimated one-rep max — the heaviest you could lift
   once, today, based on your recent work. Watch it climb." RecoverySignalBars = "How ready your body is
   to train hard. Tall bars mean go; short bars mean today is a stretching-and-technique day."
   WHY tier-one ≤2 sentences, zero jargon, numbers framed you-vs-you.
2. **Selection-driven persistence (biggest UX law):** the panel NEVER closes between datum taps —
   tapping point B while viewing A swaps content in place (150ms opacity crossfade). Close is explicit only.
3. **Breakpoints:** bottom sheet <768px; persistent side panel ≥768px, max-width 420px; overlay+scrim
   768–1439; layout-PUSH ≥1440. 4K: panel stays 420px — never a billboard.
4. **Hit collision rule:** nearest-datum-wins within radius; on dense series enforce min-separation —
   never overlapping 44px targets on 320px.
5. **Cross-link law: no dead-end panels.** Entry rows jump-link into the owning surface (history/logger
   session). The drill INFORMS and CONNECTS.
6. **Chart empty states:** <2 points → honest cold-start line per W0.1 contract, no drill.
   Aggregate-only charts: CTA line copy "Tap through to your history for the full log" → /dashboard
   history route of that data family.
7. **LENS REACTIVITY LAWS (breakage seams, ban verbatim):** NEVER resolve lensChartPalette at module
   scope (theme frozen at import) — resolve inside the component body/useMemo keyed on the lens version,
   or pass `var(--token, #fallback)` strings straight through Victory style props (inline var() works in
   SVG). React.memo deps MUST include the lens version when colors resolve in JS. BAN getComputedStyle-
   into-constant. Gradient stops must be var() references or re-derived on theme change.
8. **ExerciseHistoryChart extraction named:** drill wiring lives in a NEW sibling `ExerciseHistoryChart.drill.ts`
   (events factory + datum builder); the 473-line render file gains only imports + events prop (net ≤+20).
9. **Dual-Button Glow law on the panel CTA:** blue bg → purple glow; purple bg → cyan glow.
10. ChartDataTable rows: real `<button>` inside `<td>` — never `<tr onClick>`.
