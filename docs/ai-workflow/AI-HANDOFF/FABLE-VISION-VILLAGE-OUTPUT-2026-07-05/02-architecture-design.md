# Architecture & Component Design — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 91.8s
> **Files:** FABLE-BRIEF-TO-REVIEW.md
> **Generated:** 7/5/2026, 8:28:03 PM

---

# Architectural Review: FABLE-VISION-REBUILD-DEEP-AUDIT Master Brief

**Reviewer:** Senior React/TypeScript Architect
**Date:** 2026-07-05
**Scope:** Reviewing the plan document as a plan — evaluating architectural soundness of what is *proposed*, flagging gaps that would cause implementation problems before a worker-bot touches code.

---

> **Meta-note before findings:** This is a *brief-to-Fable*, not a final implementation plan. It explicitly states the worker-bot-executable plan comes *after* Fable synthesis. Therefore many findings below are **gaps in the brief itself** — things Fable's output plan must address that this document leaves ambiguous or architecturally unsound. Severity ratings reflect risk to the final implementation, not criticism of the brief's prose.

---

## 1. Component Decomposition

### Finding 1.1 — CRITICAL | Workstream B | `SwanExercisePicker` scope is under-specified

**Issue:** The brief proposes extracting ONE shared `<SwanExercisePicker>` from `NASMExerciseRolodex` but the current component is described as "virtualized + preview split-view + keyboard nav + real mobile tuning." Collapsing all six picker contexts (logger, planner, bootcamp, library, selection step, page) into one component with all those capabilities will almost certainly exceed 300 lines — likely 600–900 lines — before adding the mobile bottom-sheet, filter unification, and coaching-cue promotion the brief also requires.

**Recommended Fix:** Fable's plan must decompose `SwanExercisePicker` into at minimum:

```
SwanExercisePicker/
  index.tsx                  # orchestrator + context provider (~150 lines)
  ExerciseSearchBar.tsx      # input + filter chips (~120 lines)
  ExerciseVirtualList.tsx    # react-window list + row renderer (~180 lines)
  ExercisePreviewPanel.tsx   # split-view detail pane (~200 lines)
  ExerciseMobileSheet.tsx    # bottom-sheet wrapper (~150 lines)
  useExercisePickerState.ts  # UI state hook (open/selected/preview) (~100 lines)
  exercisePicker.styles.ts   # all styled-components (~150 lines)
  exercisePicker.types.ts    # shared types/interfaces (~60 lines)
```

The brief must specify which props the orchestrator exposes so all six callers can adopt it without modification to their own files.

---

### Finding 1.2 — HIGH | Workstream C | Bootcamp generator split is mentioned but not designed

**Issue:** The brief flags the 657-line generator as needing to be "split under the cap" but provides no decomposition plan. A worker-bot receiving "split the 657-line file" with no further guidance will make arbitrary cuts that break the component's internal state coherence.

**Recommended Fix:** Fable's plan must specify the exact split boundary — which logical sections become which files, what shared state lives where (local vs lifted vs context), and whether the station-builder's dual/tri-mode logic warrants a state machine (XState or useReducer). Suggested decomposition:

```
BootcampGenerator/
  index.tsx                  # mode router + top-level state (~200 lines)
  StationBuilder.tsx         # station CRUD + drag (~250 lines)
  BoardSwapPanel.tsx         # Board 2/3 joint-friendly logic (~180 lines)
  ClassHistoryPanel.tsx      # NEW: "Mark as Taught" + history (~200 lines)
  useBootcampGeneratorState.ts  # useReducer for mode/stations/overflow (~150 lines)
```

---

### Finding 1.3 — HIGH | Workstream I | `ChartExpandModal` reuse assumption is unverified

**Issue:** The brief says "reuse the `ProgressChartStudio` shell" for the expand modal. But `ProgressChartStudio` is described as a "share/proof-card studio" — its internal layout, aspect ratio constraints, and export-oriented DOM structure are likely incompatible with a fullscreen drill-down viewer without significant rework. Treating it as a free foundation may cost more than building a clean modal.

**Recommended Fix:** Fable's plan must explicitly audit `ProgressChartStudio`'s internal structure and make a binary decision: (a) extract a shared `<ChartModalShell>` that both the share studio and the expand modal consume, or (b) build `ChartExpandModal` independently. The plan must not leave this as an assumption.

---

### Finding 1.4 — MEDIUM | Workstream H | Next-Best-Action "engine" vs "component" conflation

**Issue:** The brief describes the Next-Best-Action feature as both an "engine" (computation) and a "shared component" (rendering) in the same breath. These are different concerns. If the engine lives inside the component, it cannot be tested independently, cannot be consumed by the Coach terminal, and cannot feed the bootcamp generator's pain-aware logic.

**Recommended Fix:** Fable's plan must separate:

```
services/nextBestAction/
  nextBestActionEngine.ts    # pure function: inputs → recommendation object
  useNextBestAction.ts       # data-fetching hook wrapping the engine
components/NextBestActionCard/
  index.tsx                  # role-aware renderer (user/client/trainer/admin variants)
  NextBestActionCard.styles.ts
```

The engine must be a pure function (or near-pure with injected dependencies) so it can be unit-tested without rendering.

---

### Finding 1.5 — MEDIUM | Workstream L | "Train a client now" flow decomposition absent

**Issue:** The brief describes a "one-tap Train a client now flow" but provides no component breakdown. This flow spans: Today schedule → client selection → session pre-link → mobile logger with credit banner → atomic save. That is at minimum 3–4 new or heavily modified components plus a new API call sequence.

**Recommended Fix:** Fable's plan must produce a component tree for this flow:

```
TrainClientNow/
  TrainClientNowFAB.tsx      # entry point on trainer dashboard
  ClientSessionSelector.tsx  # pick client + session from Today schedule
  SessionCreditBanner.tsx    # "uses 1 of N credits" — reusable chip
  useTrainClientNow.ts       # orchestrates the pre-link + save sequence
```

---

## 2. State Management

### Finding 2.1 — CRITICAL | Workstream H + J | Next-Best-Action state ownership is undefined

**Issue:** The brief requires the Next-Best-Action card on all four dashboards simultaneously. If each dashboard fetches independently, there are four parallel requests for the same data with no cache coordination. If it's lifted to a global store, the brief doesn't specify where (Redux? React Query? Context?). The current stack appears to use a mix — the brief mentions a dead Redux `themeSlice` but doesn't describe the app's primary state management pattern.

**Recommended Fix:** Fable's plan must specify:
1. Whether the app uses React Query / SWR / Redux Toolkit Query for server state (this determines caching strategy)
2. The cache key and stale time for next-best-action data
3. Whether the recommendation is user-scoped (fetch once, share) or surface-scoped (each dashboard fetches independently with its own role framing)

If React Query is not already in the stack, Fable must decide whether to introduce it or implement a custom cache. This decision affects every data-fetching hook in workstreams F, G, H, I, J.

---

### Finding 2.2 — HIGH | Workstream B | Filter state ownership across picker contexts

**Issue:** The brief says "unify the divergent filter vocab" across six pickers. But filter state (selected muscle group, equipment, difficulty, search term) needs different persistence behavior per context: the logger wants filters reset on close; the planner may want filters to persist across sessions; the library wants URL-synced filters for shareability. A single `useExercisePickerState` hook cannot satisfy all three without configuration.

**Recommended Fix:** The hook must accept a `persistenceStrategy: 'ephemeral' | 'session' | 'url'` option, and Fable's plan must specify which strategy each of the six callers uses.

---

### Finding 2.3 — HIGH | Workstream F | Offline queue state + React state interaction

**Issue:** The brief mentions an existing offline queue that "re-submits on reconnect." If this queue lives in `localStorage` (likely, given the description), there is a classic stale-closure risk: a React component that reads the queue on mount will not re-render when the queue updates from a service worker or `online` event listener. The brief proposes enhancing the logger without addressing this.

**Recommended Fix:** Fable's plan must specify the offline queue's state synchronization mechanism. Options: (a) a `useOfflineQueue` hook that subscribes to a `storage` event + `online` event and forces re-render via `useState`; (b) a Zustand/Redux slice that the queue writes to; (c) a BroadcastChannel if service workers are involved. The plan must pick one and specify it.

---

### Finding 2.4 — HIGH | Workstream G | Two-program-model state is a prop-drilling trap

**Issue:** The brief identifies `WorkoutPlan` (day-by-day) and `LongTermProgramPlan` (macro) as two separate systems. If Fable's resolution is "macro plan auto-seeds executable WorkoutPlan mesocycles," the component that triggers this seeding needs to know about both models simultaneously. Without a clear state ownership boundary, this becomes a prop-drilling chain: `ProgramStudio` → `MacroPlanEditor` → `MesocycleBlock` → `WorkoutPlanSeed` all passing both plan objects down.

**Recommended Fix:** Fable's plan must specify a `ProgramContext` (React context or Redux slice) that holds the active macro plan + its seeded workout plans as a unified object, so any component in the tree can read either without prop drilling.

---

### Finding 2.5 — MEDIUM | Workstream A | Theme picker bottom-sheet state

**Issue:** The brief proposes a "mobile bottom-sheet / desktop popover" for theme selection. Bottom-sheets require body scroll-lock, focus trap, and animation state. If this is implemented as local state inside the toggle component, it will conflict with any other bottom-sheet or modal open simultaneously (e.g., exercise picker bottom-sheet from Workstream B).

**Recommended Fix:** Fable's plan must specify a global bottom-sheet/modal manager or confirm that the app already has one. If not, a lightweight `useBottomSheet` hook with a portal renderer should be specified as a shared primitive used by both Workstream A and Workstream B.

---

## 3. Data Flow

### Finding 3.1 — CRITICAL | Workstream F | Two backend write paths → divergent DB footprints

**Issue:** The brief correctly identifies this as the highest-value dedup: the UI logger writes `WorkoutSession + WorkoutLog + DailyWorkoutForm + XP` while the voice-merge path writes `WorkoutSession + WorkoutLog + XP` but **not** `DailyWorkoutForm`. The brief says "consolidate onto one service" but does not specify the migration path for existing voice-applied workouts that are missing `DailyWorkoutForm` rows.

This is a data integrity risk. If the chart system reads `DailyWorkoutForm` for any metric, voice-applied workouts will show gaps in charts even after the consolidation — and the consolidation itself may fail if `DailyWorkoutForm` has a unique constraint on `(userId, date)` that the backfill violates.

**Recommended Fix:** Fable's plan must include:
1. A schema audit: does `DailyWorkoutForm` have a unique constraint on `(userId, date)`?
2. A backfill migration for existing voice-applied sessions (or an explicit decision not to backfill with documented chart-gap acceptance)
3. The consolidated service's transaction boundary — specifically whether `DailyWorkoutForm` creation is inside or outside the `WorkoutSession` transaction

---

### Finding 3.2 — CRITICAL | Workstream L | `sessionService.completeSession()` hardcodes `deductSessionCredit:false`

**Issue:** The brief identifies this correctly as a bug: the "Complete" button never downgrades. But the fix path has a race condition risk: if the new "Train a client now" flow calls `POST /api/workout-forms` (which atomically deducts) AND the trainer also clicks "Complete" on the session, the credit could be deducted twice.

**Recommended Fix:** Fable's plan must specify the deduplication guard. Options: (a) the `POST /api/workout-forms` endpoint marks the session as `completed` atomically, and the "Complete" button checks session status before deducting; (b) idempotency key on the deduction endpoint; (c) the "Complete" button is hidden/disabled once a workout log exists for that session. The plan must pick one and specify the DB-level guard (unique constraint or optimistic lock).

---

### Finding 3.3 — HIGH | Workstream D | Pain→workout constraint loop closure

**Issue:** The brief says wire `workoutConstraints`/`promptSnippet` into the Coach + bootcamp generator. But it does not specify the data flow: when does the constraint data load? Is it fetched fresh on each generation request, or cached from the last pain entry? If a client logs new pain between sessions, does the generator automatically use the updated constraints, or does the trainer need to manually refresh?

**Recommended Fix:** Fable's plan must specify:
1. The cache TTL for pain constraints (or "always fresh" with the performance cost acknowledged)
2. Whether constraints are passed as parameters to the generation endpoint or fetched server-side within the generation service
3. The UI affordance when constraints change mid-session (toast? badge on the generator?)

---

### Finding 3.4 — HIGH | Workstream I | Drill-down endpoints are unspecified

**Issue:** The brief says "clickable drill-down regions from extended `drilldownRows` + on-demand deeper endpoints" but names no endpoints. A worker-bot cannot implement drill-down without knowing what data the deeper endpoints return. The brief lists this as a design task for Fable, which is correct — but it must be in Fable's output plan, not deferred.

**Recommended Fix:** Fable's plan must specify for each of the 12 charts: what the drill-down data shape is, whether it requires a new endpoint or a query parameter on the existing `chart-*` endpoints, and what the Victory chart type changes to in expanded mode (e.g., a summary line chart expands to a scatter plot of individual sets).

---

### Finding 3.5 — MEDIUM | Workstream E | Farm finder strategy gap

**Issue:** The brief correctly identifies the deprecated USDA AMS endpoint and says "spell out paid API vs self-built dataset/API per Sean's cost constraint." But it does not provide the decision. A worker-bot cannot build a farm finder without knowing which data source to use.

**Recommended Fix:** This is a product decision that must be in Fable's output. Fable must specify: (a) the chosen data source, (b) the caching strategy (the brief mentions "24h cache" as a hint), (c) the DB schema for cached farm/CSA profiles, and (d) the fallback when the source is unavailable. If self-hosting, Fable must specify the seed data format and the admin UI for maintaining it.

---

### Finding 3.6 — MEDIUM | Workstream G | `clientTrainingReadModelService.buildTodayAssignment` stale-state risk

**Issue:** The brief describes this service as "plan day-sequencing" (not adaptive). If the Next-Best-Action engine (H) runs alongside this service, there are two systems computing "what to do today" from the same underlying data. A client could see conflicting recommendations: the plan cursor says "Day 14: Legs" while the NBA engine says "rest day based on logged fatigue."

**Recommended Fix:** Fable's plan must specify the authority hierarchy: does the plan cursor always win, does the NBA engine override, or are they presented as separate concepts ("Your scheduled workout" vs "Coach's adaptive suggestion")? This is a UX and data-flow decision that affects both G and H.

---

## 4. React Patterns

### Finding 4.1 — HIGH | Workstream I | Victory chart re-render in expand modal

**Issue:** The brief proposes opening a `ChartExpandModal` that renders the "live Victory chart at large size." If the modal receives the chart component as a child (render prop or JSX), the chart will re-render on every modal open/close animation frame because the parent's state change (modal open = true) triggers a re-render of the chart's parent. For Victory charts with real data transforms, this is a visible performance problem.

**Recommended Fix:** Fable's plan must specify:
1. `React.memo` on the chart component with a stable props comparator
2.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
