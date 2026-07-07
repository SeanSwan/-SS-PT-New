# Blueprint 03 — Signature Charts + Workout Rolodex + PR Engine (Phase 4 / 4h)

**Status:** blueprint / executable. Charter Phase 4 (crown jewel).
**Evidence base:** dedicated read-only recon on `claude/launch-charter-20260706` (file:line verified 2026-07-07).
**Correction to charter/lane memory:** expand-modal coverage is **4 client + 3 admin cards (7)**, not 6+3 — client census: WorkoutFrequency (`primaryCards.tsx:98`), WeeklyVolume (`interactiveCards.tsx:192`), SetsRepsTrend (`:252`), PRTimeline (`detailCards.tsx:60`).

---

## 1. Current state (baseline that must not regress)

- 12 canonical client cards (`CanonicalProgressChartsGrid.tsx:88-101`, per-card SafeChart from P1-4) fed by `useClientProgressCharts` → 12 `/api/client/analytics/chart-*` endpoints. 12 admin twins. Tier gates: 2 teaser charts free (`requireTeaserAnalytics`), rest Guardian (`clientAnalyticsRoutes.mjs:161-206`).
- Full interactivity toolbar EXISTS but is wired to only 2 cards: `ProgressChartActionBar` (range/CSV/PNG/legend/drilldown, `progressChartActions.ts`) on WeeklyVolume + SetsRepsTrend only.
- PR truth: `chart-pr-timeline` renders running-best per exercise/day, `/progress-detailed` recomputes Brzycki PRs per request (`dailyWorkoutFormRoutes.mjs:2168-2173`), `analyticsService.getPersonalRecords` serves max-weight PRs — but **no PR event is ever detected at write time, persisted, awarded, or celebrated** (`awardWorkoutXPSupport.mjs:161-213` = count/streak/duration only).
- Share pipelines (3): ProgressChartStudio milestone share (source-locked untouchable), ChartExpandModal share (`canShareToFeed`), SaveSuccessPanel workout share (`shareWorkoutPost.ts`).
- Dead: `ChartGallery.tsx` 50-chart demo registry (0 importers); profile `GoalProgressBullet` + `WorkoutHeatmapCalendar` render blank in prod (demo-data gated, `ProfileChartsSection.tsx:99-100`).

## 2. Slice 4a — PR Engine (the signature moment) (M/L)

**Server-side detection at the unified write path, single writer, idempotent.**

- NEW `backend/services/workout/workoutPrDetectionStep.mjs`, invoked as the THIRD post-commit step in `aiWorkoutDailyFormService.mjs` (after `runWorkoutXpAwardStep` at `:243`; same never-fail-the-write contract as `workoutXpAwardStep.mjs:1-19`).
- Detection: for each exercise in the just-written `workoutRows`, compare best set vs prior max in `workout_logs` (indexed `(sessionId, exerciseName, setNumber)`, `WorkoutLog.mjs:96`) on TWO metrics: max weight and est-1RM (`estimateBrzycki1RM`, valid 1–15 reps). New max → PR event.
- Persistence: NEW `personal_records` table (userId, exerciseName, metric ENUM weight|est1rm, value, reps, sessionId, formId, achievedAt; UNIQUE (userId, exerciseName, metric) — row updated on new PR, history preserved via `workout_logs` truth). Additive migration, follows §4.3 migration contract (idempotent, describeTable-guarded).
- Award: `PointTransaction` via existing ledger with idempotency key `pr:{userId}:{exerciseName}:{metric}:{date}` (unique partial index `(userId, source, idempotencyKey)` already exists, `PointTransaction.mjs:86-95`; source = `achievement_earned`).
- Response contract: the 201 gains additive `prEvents: [{exerciseName, metric, value, previous}]` — SaveSuccessPanel renders the celebration beat (reduced-motion aware), one-tap share via the EXISTING `shareWorkoutPost` path with PR copy. ProgressChartStudio untouched.
- Retro semantics: first-ever log of an exercise is a "first" not a PR (previous=null → celebrate as "New lift unlocked", don't spam 8 PRs on workout #1 — cap celebration at top-1 by % improvement, rest listed quietly).
- **REUSABLE-CORE:** detection math = pure `detectPrEvents(newRows, priorMaxima)`.

## 3. Slice 4b — Universal drill-down (S/M)

Wire `ChartExpandTrigger` (≈4 lines/card + a row-builder) to the remaining 8 client + 9 admin cards. Per-card: parametrize its Victory composition as `renderChart(w,h)` (pattern proven `primaryCards.tsx:64`), write `ProgressChartDrilldownRow[]` builder, mount trigger; client mounts get `canShareToFeed`, staff omit (test-locked `ChartExpandModal.test.tsx:106-124`). Chain: datapoint → that week's sessions → exercise → sets (drilldown rows already carry this shape for the wired 4).

## 4. Slice 4c — New canonical cards (M)

Endpoints already live; ZERO backend work except tier-gate decisions:
1. **Weight progression** — `chart-weight-progression` (`clientAnalyticsRoutes.mjs:216`, currently UNGATED + unmounted on the grid).
2. **Body-fat trend** — `chart-body-fat-trend` (`:219`, same).
3. **Est-1RM projection** — from `/progress-detailed` `strengthProgression` (per-top-5-exercise 1RM over time).
4. **Period-vs-period overlay** — client-side first: extend `sliceChartPointsByRange` to emit current + prior period series on WeeklyVolume/Frequency (no new endpoint).
⚠️ Deliberate tier-gate decision required per card (the two biometrics endpoints being ungated is a today-inconsistency — default: gate at Guardian like siblings, keep the 2 existing teasers as the free hook; flag to Sean).

## 5. Slice 4d — The Workout Rolodex (M/L)

Per-exercise history browser: all-time PR, volume trend, est-1RM curve, last-5 sessions.
- **Gap (receipt):** no per-exercise time-series endpoint exists; `getExerciseHistory` returns one aggregate row/exercise; `getAnchorLiftsChart` is hardcoded top-3/90-days (`chartDataController.mjs:428-457`).
- NEW endpoint `GET /api/client/analytics/exercise-timeline?exercise=<name>` → per-day best set + volume + est-1RM for ONE exercise, all time (cheap on the existing index). Guardian-gated. Additive controller fn in `chartDataController.mjs` family.
- UI: `WorkoutRolodexPage` = `SwanExercisePicker` (shared, already extracted — mode config) to choose exercise → timeline card (Victory line: est-1RM curve + volume bars) + PR badges (from 4a `personal_records`) + last-5 sessions list (reuse drilldown row pattern) + "log this exercise" CTA → logger deep-link.
- Reachable from: logger (exercise card header), charts (ExerciseFrequency drilldown rows), Client Hub. Existing `ExerciseHistoryChart` (profile) stays; Rolodex is the deep view.

## 6. Slice 4e — Toolbar everywhere + truth cleanup (S/M)

- `ProgressChartActionBar` (or its slim subset for CSS-bar cards) to all 12 client cards; CSV/PNG already generic (`[data-chart-export]`).
- Replace CSS-bar cards with real Victory where data warrants (Attendance ring stays — it's a ratio, not a series).
- **Archive `ChartGallery.tsx`** + its 50-chart demo tree (Rule 34: grep-verified 0 importers; Sean approval; the `charts/` primitives that live components import must be kept — verify per-file imports before moving anything).
- **Fix the 2 dead profile charts:** `WorkoutHeatmapCalendar` → feed real session dates (data exists via `/api/workout/sessions`); `GoalProgressBullet` → real targets or retire (BP02 5.1 supersedes its nutrition case — default: retire, keep heatmap).
- 4f: admin detail cards gain expand triggers (part of 4b census).

## 7. Slice 4g — Cross-domain fusion cards (M, after BP02 5.1)

- **Nutrition adherence vs volume** — compose `useNutritionAdherence` (BP02) + weekly-volume series as a comparison overlay card.
- **Hydration weekly** overlay (endpoint wired in BP02 5.2).
- **Biometrics** = 4c cards 1–2. Wearables overlays deferred to Phase 7 per charter.
- One truth per metric: fusion cards CONSUME existing hooks; no second aggregation path.

## 8. Slice 4h — Rank emblem glow-up (Sean ask #14) (M, design-router gated)

Level-1 "First Flight" emblem + rank-emblem system: animated (GPU-safe transform/opacity only), `prefers-reduced-motion` static fallback, rarity treatments per palette (Common=Swan Lavender → Legendary=animated gradient), celebrated on level-up via the 4a celebration pipeline. MUST run the swan-design-router 2–3 concept-direction ideation gate before build (net-new visual identity). Files: gamification emblem components + SaveSuccessPanel/level-up hook-in.

## 9. Acceptance criteria

- [ ] Logging a heavier best set produces exactly ONE persisted PR event + ONE idempotent point award (replay-safe: resubmit/duplicate form does not double-award) + celebration on SaveSuccessPanel + working share.
- [ ] `personal_records` migration idempotent; PR chart endpoints keep serving during/after backfill (backfill = optional read-only script, Sean-gated).
- [ ] Every canonical card (client + admin) opens the expand modal with a populated data table; share only on client mounts.
- [ ] Weight + body-fat + 1RM cards live with deliberate tier gates; period-vs-period on ≥2 cards.
- [ ] Rolodex: pick any logged exercise → timeline renders in <1s from the new endpoint; empty state honest for never-logged exercises.
- [ ] ChartGallery archived; heatmap real-data; bullet resolved; zero blank-in-prod charts remain.
- [ ] tsc 0, build OK, chart family suites green, no new baseline breaks (Rule 56); ProgressChartStudio byte-untouched (source lock passes).

## 10. Sequencing, risk, money-path

4a (PR engine — backend + panel beat) → 4b (drilldown sweep) → 4c (new cards) → 4d (Rolodex: endpoint then UI) → 4e (toolbar + cleanup) → 4g (fusion, needs BP02 5.1) → 4h (emblem, design-gated). 4a touches the unified write path post-commit lane — NOT money-path (no billing code), but it neighbors `workoutXpAwardStep`; keep the never-fail contract and add Codex to the review REQ anyway (gamification double-award class). Migrations: one additive table (4a). Rule 67: logger/charts = Claude lane; Social share endpoints are Codex-adjacent — REQ on 4a share copy.
