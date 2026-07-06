# 02 — Client Progress + Charts Data-Truth Audit (7-Star Upgrade)

**Domain:** User/client-facing progress & charts data truth (the CLIENT's own view — NOT the admin grid)
**Baseline:** origin/main @ 87680741e, audited 2026-07-06 in read-only worktree `c:/tmp/ss-audit-20260706`
**Complements:** `FABLE-VISION-REBUILD-DEEP-AUDIT-2026-07-05.md` §1.5 + §I (chart modal/density) — this doc adds the per-chart data-truth table, the mock inventory, the proof-point algorithm spec, and the tier-gating activation gap. It does NOT re-argue the density/modal findings.

---

## 1. Canonical Surface Receipt

| # | Layer | Evidence |
|---|-------|----------|
| a | Route def | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:185` — client role `{ path: '/progress', component: ClientProgressDashboardPage }`; `:186` — `/progress/detailed` → `ClientProgressWrapper`. Role config consumed at `UniversalDashboardLayout.tsx:158`. [VERIFIED] |
| b | Mounted JSX | `ClientProgressDashboardPage.tsx:231` renders `<CanonicalProgressChartsGrid />` (lazy decl :51-53, JSX proof :228-246, Guardian-gated :229). `CanonicalProgressChartsGrid.tsx:64-100` renders 6 intelligence boards + 12 chart cards. [VERIFIED] |
| c | Consumer hook | `hooks/analytics/useClientProgressCharts.ts:41-49` → shared state machine `useCanonicalProgressChartsFetch.ts:49-80`. [VERIFIED] |
| d | Frontend API strings | `useClientProgressCharts.ts:30` — `` authAxios.get(`/api/client/analytics/${suffix}`) ``; 12 suffixes in `useClientProgressCharts.types.ts:30-43` (`chart-workout-frequency` … `chart-recovery-signal`). [VERIFIED] |
| e | Backend mount | `backend/core/routes.mjs:411` — `app.use('/api/client/analytics', clientAnalyticsRoutes)`. `clientAnalyticsRoutes.mjs:67` (`protect`), `:75-80` (JWT-derived `injectUserId`, no IDOR), `:168-201` (12 chart routes, all `requireGuardianAnalytics` = `requireFeature('analytics.advanced')`, `:61`). [VERIFIED] |
| f | Model truth | `chartDataController.mjs:22-54` header + grep of every `FROM`: only real snake_case tables — `workout_sessions` (:140,:173,:301,:344), `workout_logs` (:222,:260,:395,:437,:451,:500,:540,:651,:715), `body_measurements` (:769,:792), `daily_macro_logs` (:816). [VERIFIED] |

**Companion canonical endpoints on the same page:** `/api/client/analytics/progress-pulse` + `workout-day` + `workout-week` (`clientAnalyticsRoutes.mjs:159-165`) → `progressPulseController.mjs:28-51` → `progressPulseService.mjs` (`FROM workout_sessions/workout_logs` :134-164) with `computeNextBestAction` embedded in the same response (`progressPulseController.mjs:38`). [VERIFIED]

---

## 2. Current-State Map

### Canonical (mounted, live)
| Surface | Files (file:line) | Notes |
|---|---|---|
| Progress page shell | `ClientProgressDashboardPage.tsx:58-268` | Stats strip (level/tier/XP/wk-workouts/streak/PRs), XP bar, Coach Compass, companion pet, weekly recap, PR card, chart grid, detailed-analytics link |
| Coach Compass | `ProgressPulsePanel.tsx:71-190` ← `useProgressPulse` ← `/progress-pulse` | Client-voiced next-best-action + streak/push-pull/variety tiles. Self-hides on error (:78) — never fakes zero-progress |
| 12-chart grid | `CanonicalProgressChartsGrid.tsx:47-104` + `primaryCards` / `interactiveCards` / `detailCards` / `primitives` / `victoryProps` | Victory-only ✓; refetches on `WORKOUT_LOGGED_EVENT` (:51-54) — the log→proof loop closes live |
| 6 intelligence boards | `CanonicalProgressChartsGrid.tsx:66-85`: ProgressProofCockpit, ProgressChartCube, WarRoomBoard, RecoveryObservatory, ExerciseCodexMatrix, ClientExerciseMegaStats | All compute from the same fetched real bundle; stack ABOVE the 12 charts (density issue owned by deep-audit §I) |
| Per-chart action shell | `ProgressChartActionBar.tsx:52-128` — range picker, legend toggles, CSV, PNG, Share, Details accordion; 44px locked by `ProgressChartActionBar.touchTarget.test.ts` | `drilldownRows` structure already exists per card |
| Share studio | `ProgressChartStudio.tsx:85-…` — aria-modal share/proof-card preview (ESC+backdrop close); `progressShareCard.ts` (PII-scrubs email/phone :38-47); `progressSocialShare.ts:33` → `POST /api/social/posts` | Share-only — NOT a zoom/expand modal (deep-audit §1.5 agrees) |
| Week/day drill-down | `ChartWeekDrillTrigger.tsx:18-53` + `WorkoutDayDrilldown.tsx` ← `/workout-day`, `/workout-week` ← `workoutDayDetailService.mjs` (`FROM workout_sessions/workout_logs` :22-92) | Only wired on Workout Frequency + Weekly Volume cards |
| Weekly recap + PRs | recap: `ClientProgressDashboardPage.recap.ts:42-50` → `/api/gamification/users/:id/weekly-recap` → `gamificationV1Routes.mjs:746` (mounted `/api/gamification`, `core/routes.mjs:417-418`) ✓ no drift. PRs: `ClientProgressDashboardPage.tsx:106` → `/api/client/analytics/personal-records` (Brzycki via `oneRepMaxService.mjs:70`) | [VERIFIED] |
| Detailed analytics page | `/progress/detailed` → `ClientProgressWrapper` (`UniversalDashboardLayout.routeComponents.tsx:90-133`) → `NASMProgressCharts` = `components/ClientProgressCharts/ClientProgressCharts.tsx` (:43) → `/api/workout-forms/client/:id/progress-detailed` (:513) → `dailyWorkoutFormRoutes.mjs:1732-1811` (DailyWorkoutForm + BodyMeasurement, self/trainer/admin access control :1750-1765) | **Second engine** — real data, different backbone (see §3) |
| Profile charts (3rd engine) | ClientProfilePage `/profile` → `ProfileChartsGrid.tsx:125` → `pages/Social/components/ProfileChartsSection.tsx:79-101` registry → `components/Charts/charts/live/*` → `hooks/useAnalytics.ts:100` `GET /api/analytics/:userId/chart-*` (staff namespace; self allowed via `requireOwnershipOrTrainer` + `requireTier('pro','charts.full')`, `analyticsRoutes.mjs:166-190`) | Also mounted on Social `UserProfilePage.tsx:783` |

### Dormant / legacy
| Surface | Evidence | Class |
|---|---|---|
| `components/Charts/ChartGallery.tsx` ("50-chart gallery") | zero consumers (repo grep) | **dormant** — archive-or-resurrect decision open (deep-audit §I) |
| 13 of 15 `DEMO_DATA` chart files (see §3 inventory) | no mounted consumer | **dormant + mock** |
| `WorkoutHeatmapCalendar` + `GoalProgressBullet` | MOUNTED via `ProfileChartsSection.tsx:99-100` but receive only `userId` (:156) and accept only `data` prop → prod renders permanent empty state (`GoalProgressBullet.tsx:29-44`, demo gated to `import.meta.env.DEV` :31) | **mounted-but-permanently-empty** |
| Deprecated chart aliases | `clientAnalyticsRoutes.mjs:231-243` — 5 endpoints intentionally return `[]` | **legacy, truthfully empty** |
| `ClientAnalyticsPanel.tsx` (components/ClientProgressCharts) | consumed by trainer `ClientProgressView.tsx:8` + admin view — staff surfaces, out of this domain | legacy-adjacent; name-collision flagged in deep-audit §1.3 |

---

## 3. Data-Truth Check

### The good news: the canonical client surface is REAL end-to-end [VERIFIED]
All 12 grid charts + pulse + drill-downs + PRs + weekly recap read `workout_logs` / `workout_sessions` / `body_measurements` / gamification tables (receipts in §1). Every fact/insight layer (`progressChartFacts.ts:5-6`, `progressChartPulse.ts:5`, `progressShareCard.ts:5`) declares and honors a "never fabricate; [] when empty" policy. Empty/loading/error states exist at page, grid, and card levels (`LoadingStrip`/`ErrorLoadingStrip` `CanonicalProgressChartsGrid.tsx:56-62`; per-card `EmptyCard` with truthful hints e.g. `interactiveCards.tsx:216`; recap-failure + malformed-metrics regression tests exist).

### Mock inventory — every DEMO_DATA file, named [VERIFIED]
All under `frontend/src/components/Charts/charts/` (grep `DEMO_DATA`, 15 hits, 14 components):
`bar/ExerciseComparisonBar.tsx:5`, `bar/TrainerWorkloadBar.tsx:5`, `bullet/GoalProgressBullet.tsx:7`, `funnel/ClientOnboardingFunnel.tsx:39`, `funnel/CompletionFunnel.tsx:39`, `funnel/GoalAchievementFunnel.tsx:39`, `funnel/SalesConversionFunnel.tsx:39`, `funnel/SessionBookingFunnel.tsx:39`, `heatmap/WorkoutHeatmapCalendar.tsx:8`, `line/BodyFatTrendLine.tsx`, `line/CardioEnduranceLine.tsx`, `line/SessionFrequencyLine.tsx`, `line/WeightProgressionLine.tsx`, `radar/MuscleGroupRadar.tsx`.
Only two reach a mounted client surface (heatmap + bullet via profile registry) and both fail closed to empty in prod. **No mock data renders as real progress anywhere on the client progress surface.** The risk is the inverse: two permanently-empty cards ("Workout Calendar", "Goal Progress") ship on the live profile — dead proof surface.

### Schema/consistency drift flags
1. **Two 1RM formulas on adjacent client surfaces.** `/progress` PR list uses **Brzycki** (`oneRepMaxService.mjs:70`, `weight * 36/(37-reps)` form `1.0278-0.0278*reps`); `/progress/detailed` computes **Epley** inline (`dailyWorkoutFormRoutes.mjs:1848-1906`). Same set → two different "1RM" numbers one click apart. [VERIFIED]
2. **Two chart engines, two backbones.** Canonical 12 aggregate `workout_logs`; `/progress/detailed` re-derives volume/1RM/consistency from `daily_workout_forms.formData` JSON (`dailyWorkoutFormRoutes.mjs:1804-1811`). The unified write path persists both in one txn (known truth #2), so raw data aligns, but the computations differ → weekly-volume/consistency numbers can disagree between the two pages. [LIKELY — computations read; numeric divergence not executed] Deep-audit open-Q #4 already proposes `/api/client/analytics` as the one canonical engine; this audit seconds it.
3. **Two streak definitions, unlabeled.** Stats-strip "Streak Nd" = gamification day-streak (`ClientProgressDashboardPage.metrics.ts:59` — `weeklyRecap.current.streak ?? profile.streakDays`); Coach Compass "Weekly Streak N wks" = weeks-hitting-target from `workout_sessions` (`progressPulseService`). Both real, semantically different, shown ~200px apart with no disambiguation. [VERIFIED]
4. **Rest-compliance chart correctly killed.** `ExerciseSet` has `restTime` (goal) but no actual-rest column; chart removed + locked false (`ClientProgressCharts.tsx:476-486`). Do not resurrect without writer schema change. [VERIFIED]
5. **Bootcamp/group sessions invisible in client charts** (deep-audit §C data-loop gap) — group records don't land in per-client `workout_logs`, so a bootcamp-only client's canonical grid reads empty. [LIKELY — inherited from deep audit, not re-proven here]
6. **No body-composition proof in the canonical 12.** `chart-weight-progression` / `chart-body-fat-trend` exist and are truthful (`chartDataController.mjs:769-792` ← `body_measurements`) but are only reachable via profile settings registry — the progress page itself never shows before/after composition. [VERIFIED]

---

## 4. Vision Gap Analysis (7-star vs today)

Core Loop grade for this domain: **log → diary → charts** is genuinely closed (live event refetch, real tables, truthful facts). The breaks are in **proof → next action → shareable milestone** and in **who is allowed to see proof at all**:

1. **Progress proof is paywalled at activation time.** The entire 12-chart grid AND Coach Compass are Guardian-gated frontend (`ClientProgressDashboardPage.tsx:188,229-243`) and backend (`clientAnalyticsRoutes.mjs:61`). Vision demands "first visible progress proof within 7 days"; a Starter who logs workout #1 sees a lock overlay where their proof should be. A 30-day premium trial softens this ([VERIFIED] comment `clientAnalyticsRoutes.mjs:155`) but whether every new client actually receives a trial is [UNKNOWN]. 7-star: proof of YOUR OWN first workout is never behind glass — gate depth, not existence.
2. **No milestone/proof-event system.** PRs are recomputed on read (`chart-pr-timeline` running-max) but nothing DETECTS "you just set a PR" at log time and turns it into a celebration + one-tap share. The share studio exists per chart but is buried behind scroll + 2 taps and shares a generic card, not a milestone.
3. **Facts ≠ insights.** `progressChartFacts` = latest/best/avg/count; `progressChartPulse` = latest vs previous delta + record tone. Missing: week-over-week volume delta as a headline, 30-day trend direction per lift, before/after composition, "N sessions to next milestone." The compass covers behavior (streak/balance/variety) but not strength-proof storytelling.
4. **Chart-expand modal absent** (deep-audit §1.5 — foundation exists: Studio shell + `drilldownRows`). Not re-argued here.
5. **Three engines, three namespaces** (`/api/client/analytics`, `/api/workout-forms/.../progress-detailed`, `/api/analytics/:userId`) serving one human question ("am I progressing?") with two 1RM formulas. 7-star = one engine, one number.

**Click reality today** (client role): Home → "View Progress" quick action (`ClientDashboardHomeTab.tsx:159`) = **1 tap** to Coach Compass insight (top of page) — already good. To a specific chart's detail rows = 1 tap + long scroll past 6 boards + Details tap = **2 taps + scroll hunt**. To share proof to feed = **3 taps + scroll**. For a Starter (no trial): **∞ (locked)**.

---

## 5. Ranked Upgrades

**P0-A — Starter "proof teaser" tier** (unlock `chart-workout-frequency` + `chart-weekly-volume` + a de-scoped compass for Starter; keep the other 10 + drill-downs Guardian).
Why: activation = first visible proof in 7 days; today proof is the paywall. Serves adherence + revenue (teaser sells the full cockpit better than a lock screen). Effort **M** (new `requireFeature('analytics.teaser')` tier map + frontend gate split). Acceptance: Starter with 1 logged workout sees 2 real charts + compass primary action; remaining cards render as locked previews with real fact counts; server still 403s the gated 10. Click delta: Starter proof ∞ → **1 tap**.

**P0-B — Milestone proof-event engine ("Proof Points")** — see §6 spec. Detect PR / streak-week / volume-record at write time on the unified path, persist, surface as a "Latest Proof" card at the very top of `/progress`, one-tap share via existing `progressShareCard` + `POST /api/social/posts`.
Why: this is the missing "shareable milestone" leg of the Core Loop. Effort **M-L**. Acceptance: logging a set whose Brzycki 1RM exceeds the prior running max creates exactly one idempotent proof event; card shows within one refetch (`WORKOUT_LOGGED_EVENT`); share posts the milestone card. Click delta: share a PR 3 taps + scroll → **2 taps, zero scroll**; celebrate-worthy insight 1 tap + scroll → **1 tap (top of page)**.

**P0-C — One 1RM formula.** Export Brzycki from `oneRepMaxService.mjs` and use it in `dailyWorkoutFormRoutes.mjs:1848` (delete inline Epley); or vice-versa — one function, one number. Effort **S**. Acceptance: same set yields identical est-1RM on `/progress`, `/progress/detailed`, and PR card; regression test comparing both endpoints for a fixture client.

**P1-A — Chart-expand modal** (deep-audit §1.5 owns the design: reuse Studio shell + `drilldownRows` → `<ChartExpandModal>`). Effort **M**. Click delta: chart detail 2 taps + scroll → 1 tap on card.
**P1-B — Retire or wire the two permanently-empty profile cards.** Wire `WorkoutHeatmapCalendar` to `chart-workout-frequency` day-level data and remove `GoalProgressBullet` from `CHART_REGISTRY` until a real goals source exists (`ProfileChartsSection.tsx:99-100`). Effort **S**. Acceptance: no mounted client card can render an eternal empty state.
**P1-C — Canonical-engine convergence.** Point `/progress/detailed` charts at `/api/client/analytics` bundles (or explicitly re-scope the page to what only `formData` can show: form quality, NASM categories). Kills engine-drift class permanently. Effort **L** (deep-audit open-Q #4 — get Sean's call first).

**P2-A — Streak disambiguation.** Rename stat-strip label to "Day Streak" and compass tile to "Week Streak" (copy-only). Effort **S**.
**P2-B — Body-comp proof card on `/progress`.** Reuse truthful `chart-weight-progression`/`chart-body-fat-trend` (+ measurements) as an optional "Body" lens in `progressChartLens`. Effort **S-M**. Serves proof for weight-goal clients whose lifting charts move slowly.
**P2-C — 36px `ShareIconBtn` on `/progress/detailed`** (`ClientProgressCharts.tsx:379-411`) → 44px (rule 2). Effort **S**.

**P3 — Archive decision on `ChartGallery.tsx` + the 13 dormant DEMO_DATA charts** (repo-hygiene pass, rule 34: propose-only). Effort **S**.

---

## 6. Algorithm Specs

### 6.1 What already exists (EXTEND — do not rebuild)
- **`progressChartFacts.ts`** (client+admin shared): `buildSeriesFacts` (latest/best/avg/count :40-58), `buildCategoryFacts` (top/share%/total :65-82), `buildPrFacts` (heaviest/latest-PR/lifts-with-PRs :84-96), `buildRecoveryFacts` (pain/redline flags :98-110), `buildAnchorFacts`, `buildAttendanceFacts` (show-rate :136-147). Pure, truthful, empty-safe.
- **`progressChartPulse.ts`**: latest-vs-previous delta %, `record` tone when latest is all-time best in range, `new baseline` handling (:30-50).
- **`nextBestActionService.mjs`**: 8-rule deterministic priority ladder (:19-28), dual voice (client CTA / `coachify` :154-183), consumed by `/progress-pulse` (client) and `/api/analytics/:userId/next-best-action` (coach, `analyticsRoutes.mjs:164`, consumer `ClientNextBestActionCard.tsx:107`). No LLM, zero PII.
- **`progressShareCard.ts`**: share copy with email/phone redaction (:38-47) + shareability gate on verified row count.

### 6.2 Missing piece: Proof-Point (milestone) engine — spec
**Inputs:** the just-committed workout write (unified path: `WorkoutSession` + per-set `WorkoutLog` + `DailyWorkoutForm` in one txn — known truth #2), prior running-max per exercise (`workout_logs` running max, same SQL family as `chart-pr-timeline`, `chartDataController.mjs:395-455`), pulse streak/volume aggregates (`progressPulseService.mjs`).
**Where it runs:** a sibling step next to `workoutXpAwardStep.mjs` in the unified write pipeline (reuse its form-id idempotency pattern — known truth #2). NOT a new write path.
**Detection rules (deterministic, ordered):**
```
onWorkoutCommitted(formId, userId, txn):
  if proof_events has formId-derived key -> return          # idempotent
  for each (exercise, bestSet) in committed sets:
      est1RM = brzycki(bestSet.weight, bestSet.reps)         # ONE formula (P0-C)
      if est1RM > priorRunningMax(exercise): emit PR_SET {exercise, est1RM, delta}
  weekVol = volumeThisIsoWeek(userId)
  if weekVol > maxPriorWeekVolume: emit WEEK_VOLUME_RECORD {weekVol, prior}
  if pulse.streak.weeklyCurrent crossed {4, 8, 12, 26}: emit STREAK_MILESTONE {weeks}
  if firstEverCompletedWorkout: emit FIRST_WORKOUT
  persist at most the single highest-ranked event per form (rank: FIRST > PR > STREAK > VOLUME)
```
**Output/storage:** `proof_events(id, userId, formId UNIQUE, type, payload JSONB, createdAt, sharedPostId NULL)` — one row per form, FK to `"Users"` (dual-table gotcha). **Read API:** extend the existing `/progress-pulse` payload with `latestProofEvent` (zero new round trips — same pattern as `nextBestAction` embedding, `progressPulseController.mjs:36-39`). **Frontend:** "Latest Proof" card at top of `/progress` reusing `progressShareCard` + `ProgressChartStudio`; share writes `sharedPostId` so a milestone is shared at most once by default.
**Extend-don't-rebuild notes:** reuse Brzycki from `oneRepMaxService.mjs`; reuse `MOVEMENT_PATTERN_CASE_SQL`; add `celebrate_pr` to the nextBestAction ladder between priorities 2 and 3 rather than forking a second recommender; gamification XP bonus for PRs goes through the existing `workoutXpAwardStep` idempotency, never a second award write.

---

## 7. Cross-Domain Dependencies & Sequencing

- **Workout logger lane (active Phase-1, OUT OF SCOPE):** Proof-Point engine hooks the unified write pipeline that lane owns — land P0-B only as an additive step AFTER their pipeline stabilizes; coordinate the step-registration point (`workoutXpAwardStep.mjs` sibling).
- **Gamification domain:** PR/streak proof events should award XP through the existing idempotent step; streak label unification (P2-A) touches gamification copy. Weekly recap endpoint is v1-mounted and healthy (`core/routes.mjs:417-418`).
- **Social/community domain:** one-tap milestone share depends on `POST /api/social/posts` (already used by `progressSocialShare.ts:33`); the single-social-auto-post rule (known truth #2) must arbitrate so a PR doesn't double-post (auto-post + manual share).
- **Admin/trainer command center:** `coachify` voice + `ClientNextBestActionCard` already consume the same ladder — any new `celebrate_pr` rule automatically surfaces to trainers; add coach copy in the same PR.
- **Monetization/ascension:** P0-A teaser tier changes the Guardian pitch — Ascension page copy and `requireTier.mjs` feature map must move together.
- **Sequencing:** P0-C (one formula, S) → P0-A (teaser gate, M) → P1-B (dead cards, S) → P0-B (proof events, M-L, after logger lane stabilizes) → P1-A (expand modal, with deep-audit §I relayout) → P1-C (engine convergence, needs Sean's canonical-engine ruling).

## 8. Do-Not-Touch

- **Workout logger UI/flow + exercise-picker** — active Phase-1 build lane. Integration point only (§6.2 hook).
- **Stripe/storefront checkout internals** — Codex lane (P0-A touches tier *checks*, not checkout).
- **Pain-chart WIP** (`painChartInsights.ts`, `PainChartInsightPanel.tsx` etc.) — unpushed unreviewed commit `d7e501559` on the stale local branch; NOT in this baseline; deep-audit §1.2 warns a naive rebase deletes live features. Recovery-signal chart is its integration point later.
- **`nextBestActionService.mjs` / `progressPulseService.mjs`** — extend via new rules/fields only; never fork a parallel recommender.
- **Deprecated chart aliases** (`clientAnalyticsRoutes.mjs:231-243`) — intentionally empty for cached bundles; removal is a separate approved cleanup pass (rule 34/37).
- **`restCompliance` chart** — locked false by design + source-level regression tests (`ClientProgressCharts.tsx:476-486`); requires writer schema change first.
