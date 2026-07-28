# SwanStudios — "Fable Vision" Rebuild · DEEP AUDIT (Ground Truth)
**Date:** 2026-07-05 · **Author:** Opus 4.8 · **Method:** 11 parallel read-only surface auditors (1.86M tokens, 344 tool calls, 0 errors) over the live working tree
**Purpose:** This is **Step 1 of Sean's pipeline** — the Opus deep audit that grounds the Fable Master Brief before AI Village + Fable synthesis. Everything here carries `file:line` evidence and a confidence tag. Companion doc: `docs/ai-workflow/brainstorms/FABLE-VISION-MASTER-BRIEF-2026-07-05.md` (the brief this audit hardens).

**Pipeline position:**
```
[THIS DEEP AUDIT] → enhanced Master Brief (companion) → AI Village (paid, Sean-gated) → Fable synthesis → worker-bot slices (recursive hostile review) → Render → Hermes Learning Packet
```

---

## 0. How to read this
- **Confidence tags** (Rule 51): `[VERIFIED]` = confirmed by file read / git; `[LIKELY]` = strong evidence, not directly run; `[HYPOTHESIS]` = reasoned, must verify; `[UNKNOWN]` = not checked.
- **Surface classification** (Rules 26–27): `canonical` (proven mounted/consumed), `legacy` (not in live path), `dormant` (exists, no consumer), `competing` (2+ may be active).
- Per-surface sections give: verdict · canonical files · dedup verdict · data truth · mobile · top gaps · top Fable recs · open questions.

---

## 1. CROSS-CUTTING CRITICAL FINDINGS (read before any build)

### 1.1 ⚠ The working branch is 132 commits behind origin/main — REBASE IS A PRE-FLIGHT, NOT AN OPTION
`[VERIFIED]` Active branch `wip/comms-notifications-2026-07-05` is **132 behind / 1 ahead** of `origin/main` (`git rev-list --left-right --count origin/main...HEAD = 132 1`). The single commit ahead is the unpushed pain-chart WIP (§1.2).
- Frontend chart-grid files are byte-identical to origin/main, but `backend/controllers/chartDataController.mjs` has **drifted** (origin/main ~46 lines leaner).
- **Every workstream must be re-based onto current `origin/main` before Fable plans against line numbers.** Line-level facts in this audit are true for the working tree; treat backend line numbers as "verify-on-rebase."

### 1.2 ⚠ The pain-chart upgrade is UNPUSHED, UNREVIEWED, on a stale base — and a naive rebase DELETES two live features
`[VERIFIED]` Commit `d7e501559` "chore(bodymap): preserve staged pain-chart upgrade WIP (unreviewed)" is the only unpushed commit (1294 insertions, 10 files). It is a real, valuable **pain→workout constraint engine** (`painChartInsights.ts`, `PainChartInsightPanel.tsx`, `PainChartTrendFollowUp.tsx`, `BodyMapClientTargetSelector.tsx`).
- **MERGE REGRESSION #1:** the WIP `BodyMap/index.tsx` omits `BodyMapEvidenceSection` (evidence gallery/review) — a feature that shipped to production on origin/main AFTER the fork (`f0fdb3d33`). Cherry-picking the WIP `index.tsx` **deletes that live feature.**
- **MERGE REGRESSION #2:** the WIP dropped `resolveAnatomyGender()` (per-client gender auto-detect, live on origin/main) and hardcodes `'male'`.
- **Mandate:** reconcile via a **3-way merge onto current origin/main**, never a straight cherry-pick. Preserve the WIP first (it is at risk of loss on a stale, un-upstreamed branch).

### 1.3 The fragmentation is NOT where Sean fears it — it's at the backend/nav layer, not the logger UI
Sean's stated fear ("all kinds of different workout loggers") is **already solved at the UI layer** `[VERIFIED]`: there is exactly ONE `WorkoutLogger.tsx`, mounted everywhere via thin wrappers. The real duplication clusters are:
| Cluster | Reality | Verdict |
|---|---|---|
| **Exercise pickers** | 1 canonical (`NASMExerciseRolodex`) + **5 competing** UIs over the SAME `useExerciseSearch`/`/api/exercises/library` | Consolidate to one shared `<ExerciseRolodex>` |
| **Backend workout write paths** | 2 implementations: `dailyWorkoutFormRoutes` POST (creates `DailyWorkoutForm`) vs `workoutLogService.logWorkoutForClient` (PLAUD/admin, no form row) | Consolidate onto one service |
| **Chart engines** | 3 real-data engines coexist (`CanonicalProgressChartsGrid` `/api/client/analytics` · `ClientProgressCharts` `/api/workout-forms` · `ProfileChartsSection` live) + name-collision on two `ClientAnalyticsPanel.tsx` | Pick one canonical, retire others |
| **"Session" concept** | 3 meanings collide: scheduled `Session` · logged `WorkoutSession` · offline `SessionContext` (localStorage, dead endpoints) | Name/separate the three |
| **Bootcamp nav** | 1 page, **3 route registrations** (`/dashboard/{role}/bootcamp` · `main-routes 'bootcamp-builder'` · `/dashboard/workouts/bootcamp`) | One canonical nav |
| **Program models** | `WorkoutPlan` (executable, client-visible) vs `LongTermProgramPlan`+`ProgramMesocycleBlock` (macro, coach-only, unintegrated) | Decide strategy-vs-execution relationship |

### 1.4 The single biggest PRODUCT gap: no data-derived "next best workout between sessions"
`[VERIFIED]` No surface reads logged history and proactively suggests a specific between-session workout. The client "Today's assignment" card is trainer-plan **day-sequencing** (`clientTrainingReadModelService.buildTodayAssignment`, reads `currentWeek/currentDay`), **not** adaptive to the client's own performance. The ingredients exist but are unassembled: `GET /api/exercises/recommended`, `GET /api/analytics/nasm-recommendations/:level`, `variationEngine.mjs`, `correctiveExerciseService.mjs`, `clientIntelligenceService.mjs`, the plan `/advance` cursor. **This is the keystone of the Product Core Loop** ("help decide the next training action") and it is missing.

### 1.5 The chart "modal" Sean wants does not exist — but the scaffolding for it does
`[VERIFIED]` There is NO click-to-expand/fullscreen anywhere. The only chart modal (`ProgressChartStudio`) is a **share/proof-card** studio (aria-modal dialog), not a zoom. "Details" is an inline text-row accordion. The existing `ProgressChartStudio` shell (ESC + backdrop close) + the `drilldownRows` data structure are the **perfect foundation** for a reusable `<ChartExpandModal>`.

### 1.6 Two artifacts authored today are UNTRACKED and at risk
`[VERIFIED]` `docs/ai-workflow/brainstorms/FABLE-VISION-MASTER-BRIEF-2026-07-05.md` (git `??`) holds the Workstream-K spec; a staged `.claude/skills/swan-design-router/SKILL.md` (M) is uncommitted. Preserve before the stale branch loses them.

---

## 2. PER-SURFACE FINDINGS

### A. Theme system + Theme Picker — *P1*
**Verdict `[VERIFIED]`:** ONE canonical engine, **28 themes**, and the live control is **already a 44px click-to-cycle button** (`UniversalThemeToggle.tsx`, `onClick=toggleTheme`, mounted `ActionIcons.tsx:243` + `ClientDashboardHome.sections.tsx:128`). **There is NO dropdown in the live UI** — Sean's "click to change" memory IS the current behavior; what's missing is direct-select.
- **Canonical:** `context/ThemeContext/UniversalThemeContext.tsx` (1735ln, over cap) · `UniversalThemePremiumThemes.ts` (10 premium colorways) · `UniversalThemeToggle.tsx` (641ln) · `utils/theme/themeUtils.ts` (the single-point contrast home: `getReadableAccentText`/`contrastRatio`/`relativeLuminance`).
- **Dormant asset:** `components/ThemeShowcase.tsx` — a **ready-made direct-select grid picker** calling `setTheme(id)`, zero consumers. This is the "picker" to resurrect.
- **Data truth:** theme choice persists to `localStorage['swanstudios-theme']` only — **not** the user DB record (no cross-device sync).
- **Mobile:** toggle is 44px-compliant, but (1) the "next theme" preview is a **hover tooltip — invisible on touch**; (2) reaching a target theme takes **up to 27 taps**.
- **Contrast:** enforced at runtime for **button text only**; all 28 themes' body/muted/label text are hand-authored, unchecked. `[LIKELY]` failures: `crystalline-mono` muted `#666` on `#000` (~3.9:1), `frozen-aurora` 0.45-alpha muted on light, premium 0.62-alpha muted.
- **Cleanup:** dead Redux `store/themeSlice.ts` (registered, zero dispatch); toggle chrome only styles 13/28 themes (rest fall through to default blue — cosmetic).
- **Top Fable recs:** build a mobile bottom-sheet / desktop popover picker on `ThemeShowcase` (grouped Signature/Dark/Light/Premium); derive toggle chrome from active-theme tokens (kills the 13-theme switch); **table-driven WCAG pass across all 28 themes** via the existing luminance helper (clamp `--text-muted/--text-label/--text-secondary`); optionally persist theme to DB.
- **Open Qs:** expose all 28 or curate + gate "premium"? · per-user DB sync or stay local? · keep cycle + add picker, or replace? · canonical brand default per context (`crystalline-dark` in-app vs `crystalline-default`)?

### B. Exercise Rolodex — *P1*
**Verdict `[VERIFIED]`:** unified DATA layer, fragmented PRESENTATION. De-facto canonical = `WorkoutLogger/NASMExerciseRolodex.tsx` (virtualized `react-window`, preview split-view, keyboard nav, real mobile tuning). **6 pickers total, all reading `GET /api/exercises/library`.**
- **Shared spine:** `useExerciseSearch.ts` (fetches library once, Web-Worker fuzzy cache) → `exerciseRoutes.mjs:480` (`/library`, protect-only) → `Exercise.mjs` model (~736 rows; route copy says "840+" — **count drift**).
- **Competing:** `WorkoutPlannerRolodexPanel` (planner, own UI), `BootcampBuilder/ExerciseRolodexPanel` (own UI), `WorkoutManagement/ExerciseLibrary` + `ExerciseSelectionStep` (in plan-builder), `pages/workout/ExerciseSelector` (card grid). **Dormant + wrong-endpoint:** `Shared/ExercisePickerPanel.tsx` (zero consumers, points at trainer-only `/search` → would 403 clients).
- **Mobile:** only `NASMExerciseRolodex` is deliberately mobile-tuned but is an **anchored dropdown overlay** (fights the keyboard); recent commits fixed "rolodex row overlap"/"responsive scrolling" — active pain area.
- **Data truth:** REAL catalog; two heuristic layers ride on top — `getExerciseTips()` hardcoded keyword cues when DB `description` empty, and sparse `catalogVideoSample` media.
- **Top Fable recs:** extract ONE shared `<SwanExercisePicker>` from `NASMExerciseRolodex`, unify filter vocab, have planner + bootcamp consume it; **mobile bottom-sheet** (not overlay); delete/rewire `Shared/ExercisePickerPanel`; promote real `coachingCues`/`instructions` over the keyword heuristic; Rule-58 schema cross-check on `exerciseLibraryContract.mjs` before trusting counts.
- **Open Qs:** in-logger dropdown vs dedicated full-screen picker as THE canonical? · keep planner/bootcamp richer filters or converge? · retire `/dashboard/workout` (ExerciseSelector)? · delete dormant `ExercisePickerPanel` now?

### C. Bootcamp Creator — *P1*
**Verdict `[VERIFIED]`:** large, LIVE, actively-developed (~40 files, own backend service dir). Dual/tri-mode (AI/manual/hybrid) station builder with real differentiators: pain-aware flagging (reads `ClientPainEntry`), Board 2 (joint-friendly)/Board 3 (low-impact) swaps, overflow lap-rotation, 2-week freshness (reads `BootcampClassLog`), floor/demo presentation mode, PDF export.
- **Canonical:** `BootcampBuilder/BootcampBuilderPage.tsx` (300ln) · `hooks/useBootcampAPI.ts` · `backend/routes/bootcampRoutes.mjs` (`/api/bootcamp`, admin+trainer) · `backend/services/bootcamp/bootcampGenerator.mjs` (657ln, **over cap**) · `models/BootcampClassLog.mjs`. Sibling: Sprint Planner (`SprintPlanner/`, 3-month, `/api/bootcamp/sprints`) — same product family.
- **🔑 HIGHEST-VALUE GAP `[VERIFIED]`:** the "**Log class as taught**" UI does NOT exist. Backend + `useBootcampAPI.logClass/getHistory` exist but **no component in `BootcampBuilder/` consumes them** (grep = 0). Consequence: the freshness engine is **starved** (no way to write `BootcampClassLog`). This is the single change that activates freshness + history + future group analytics.
- **Data-loop gap:** bootcamp classes log as GROUP records, **not** into individual client workout logs → invisible in per-client progress charts.
- **Nav:** 3 route registrations for one page (§1.3).
- **Mobile:** desktop-first 3-pane "command deck"; collapses at ≤1024px but stacked panes squeeze inside `overflow:hidden` FourPane at 375px — needs rework to a tabbed/step mobile flow.
- **Top Fable recs:** ship "Mark as Taught" UI; bridge group participation into per-client progress (optional attribution); mobile-first stepped flow; consolidate 3 nav paths to one; split the 657-line generator; **showcase** the buried differentiators (pain-aware, Board 2/3, overflow) as premium UI moments.
- **Open Qs:** canonical nav (sidebar vs Workouts workspace)? · group participation → client logs, yes/no? · is "log as taught" mandatory after floor mode? · build-on-phone vs desktop-pre-plan? · multi-trainer pain-entry visibility scope?

### D. Pain charts / Body-map — *P1 (⚠ preserve first)*
**Verdict `[VERIFIED]`:** live 42-region body map + pain CRUD (`/api/pain-entries`, `ClientPainEntry`) is on origin/main. The **WIP upgrade (`d7e501559`) is unpushed, unreviewed, on a 132-behind base** — see §1.2 for the two merge regressions.
- **New (WIP):** `painChartInsights.ts` (301ln pure engine: risk band, avoid/modify/warmup movement constraints, severity trend, follow-up reminders, Coach `promptSnippet`), `PainChartInsightPanel.tsx`, `PainChartTrendFollowUp.tsx` (Victory), `BodyMapClientTargetSelector.tsx`.
- **Data truth:** REAL — all insights derived from actual pain-entry rows; `DEFAULT_MOVEMENT_RULES` is a fixed clinical ruleset, not fabricated data.
- **🔑 LOOP NOT CLOSED `[VERIFIED]`:** the pain→workout `promptSnippet`/`workoutConstraints` are **display-only** — no verified wiring into Coach/bootcamp generation. Wiring this is the highest product value in the WIP.
- **Hygiene:** dead `getContrastColor()` at `index.tsx:70`; brittle source-string test `BodyMap.clientTarget.test.ts`.
- **Top Fable recs:** 3-way merge onto origin/main (compose alongside `BodyMapEvidenceSection` + `resolveAnatomyGender`, never overwrite); **close the pain→workout loop**; promote Pain Intelligence into dashboard next-best-action; decide client-vs-staff exposure (injury guidance = liability call); unify severity colors to Crystalline tokens.
- **Open Qs:** keep/reconcile the WIP or abandon? · client sees pain guidance or trainer/admin only? · does this outrank the current Marketing/comms focus? · one canonical surface or standalone + 3 embedded?

### E. Nutrition ecosystem — *P2*
**Verdict `[VERIFIED]`:** comprehensive but uneven. Hub = `NutritionWorkspace.tsx` (13 tabs, subscription-gated), mounted at `/meal-planner`. Strong core, thin periphery.
- **REAL:** meal logger writes `DailyMacroLog` via `POST /api/macros` (USDA FoodData Central + OpenFoodFacts + CalorieNinjas); supplement **gap analysis** (`supplementService` reads last 7–30d macros); barcode scanner (`foodScannerService`: OpenFoodFacts + FatSecret fallback, caches `FoodProduct`); garden **zone** lookup (phzmapi.org); ingredient safety (IARC/EU/GMO); AI photo (Gemini Vision).
- **STATIC / list-only (Sean's "just a list"):** garden = **15 hardcoded plants, 1 microgreen**, no grow-tracking; supplements = **12 hardcoded products, ALL affiliate URLs empty** (zero revenue wired).
- **BROKEN/MISLABELED:** farm finder on **deprecated USDA AMS Farmers Market endpoint** (`[HYPOTHESIS]` empty in prod, has `apiDown` branch); restaurant tab is a **FatSecret nutrition-FACTS search mislabeled as a location finder** (needs `FATSECRET_*` keys, likely unset).
- **Fragmentation:** meal logger split across 4 surfaces (`FoodIntakeForm`, `FoodSearchPanel`, `VoiceNutritionPanel`, `MealPlanTab` photo) all → `/api/macros`; barcode split between Food Search tab + standalone `FoodScannerPage`. `[NOTE]` the draft brief says the camera scanner is orphaned/unmounted — reconcile which barcode path is canonical.
- **Top Fable recs:** garden → "grow-your-own OS" (My Garden model, care reminders, harvest countdown, microgreen module, garden→macro bridge); farm finder → durable source (USDA Local Food Portal / self-hosted + 24h cache) + farm/CSA profiles; split restaurant into "Menu Nutrition Facts" vs a real geolocation finder; wire supplement affiliate URLs; consolidate 4 logger surfaces + 2 barcode paths; **self-hosted seeded datasets** (Sean is solo-cost-sensitive).
- **Open Qs:** are `FATSECRET_*`/`USDA_API_KEY` set in Render prod? · restaurant = facts search or true finder? · farm data source (self-host vs Places vs USDA portal)? · supplement affiliate now vs self-host table? · logger consolidation OK? · garden v1 = grow-tracking or marketplace?

### F. Workout Logger — *P0 (Sean's #1)*
**Verdict `[VERIFIED]`:** ONE canonical UI logger — `WorkoutLogger.tsx` (1225ln, over cap) — mounted on all four surfaces via thin wrappers (`AdminPersonalWorkoutLogger` forceSelfMode, `EnhancedWorkoutLogger`, Client-Hub `TrainingTabSectionContent`, direct client `/log-workout`). `QuickLogMode` + `WorkoutLoggerCoachTerminal` are CHILDREN, not competitors. **Sean's fragmentation fear is already solved at the UI layer.**
- **Write path REAL:** `handleSubmit` → `buildWorkoutFormSubmitBody` → `POST /api/workout-forms` → `dailyWorkoutFormRoutes.mjs POST '/'` — production-grade (DB txn; role/permission/assignment auth; billing/session-credit; future-date + 409 dup-per-date guards) persisting `WorkoutSession` + per-set `WorkoutLog` + `DailyWorkoutForm` + XP in one transaction. Charts read the same models.
- **🔑 REAL DEDUP (backend, not UI) `[VERIFIED]`:** a SECOND write path exists — `adminWorkoutLoggerController` → `workoutLogService.logWorkoutForClient` (mounted `/api/admin/clients/:id/workouts`, used by **PLAUD voice-merge apply**). It writes `WorkoutSession`+`WorkoutLog`+XP but **NOT** `DailyWorkoutForm` → voice-applied and UI-logged workouts leave different DB footprints. Consolidate onto one service.
- **Mobile:** STRONG — real breakpoints, 44px targets, `QuickLogMode` fast entry, `StickyLogActionBar`, **offline queue** (`useOfflineQueue`, re-submits on reconnect), 7 touchTarget tests. `MobileWorkoutLogger.tsx` = dormant "coming soon" stub, zero consumers.
- **Top Fable recs:** do NOT fork a second logger — polish + consolidate the two backend write paths (highest-value dedup); QA at 320/375/414 with RestTimer FAB + sticky bar + Coach terminal all present (`timerFabClearance` test hints at overlap); auto-default `QuickLogMode` on phone; make offline-queue state a visible affordance; revisit the one-form-per-day 409 for AM/PM sessions.
- **Open Qs:** consolidate write paths now, which is canonical? · one-form-per-day correct for real training? · QuickLogMode auto-default on phone? · delete `MobileWorkoutLogger` stub? · should voice/PLAUD also write `DailyWorkoutForm` for parity?

### G. Client Program Builder (1-day → 12-month) — *P0*
**Verdict `[VERIFIED]`:** END-TO-END WORKS via `WorkoutPlan`. Trainer/admin CAN create a multi-duration program and it DOES surface on the client dashboard.
- **Canonical:** `admin-workout-planner/WorkoutPlannerPage.tsx` (admin+trainer `/workout-planner`) — 7 durations (single/1/4/12/26/39/52 weeks = 1 day → 12 months), NASM phase, AI+manual gen. Save = `POST /api/workout-plans` (draft) → `PUT /:id/activate`. **"Assign" == set `userId` + activate** (no separate verb). Backend `workoutPlanRoutes.mjs` (818ln): create/activate/duplicate/primary/advance/soft-delete, all `protect+trainerOrAdminOnly+verifyClientAccess` (IDOR-mitigated). Client sees it via `GET /api/workouts/:userId/current` → `ClientWorkoutPlanVaultPanel`.
- **🔑 TWO UNINTEGRATED PROGRAM MODELS `[VERIFIED]`:** `WorkoutPlan` (day-by-day, client-visible, status active/paused/completed/draft) vs `LongTermProgramPlan`+`ProgramMesocycleBlock` (3/6/9/12-month MACRO periodization, coach-only, status draft/approved/active/archived/superseded) via a DIFFERENT UI (`WorkoutCopilotPanel` "Long-Horizon" tab) + API (`/api/ai/long-horizon`). **A 12-month macro plan never reaches the client.** Two live builder entry points with different UX.
- **Schema landmines (Rule 58):** `WorkoutPlan` hybrid camelCase+snake_case columns need explicit `field:` on every column; `id` UUID but `userId`/`trainerId` INTEGER; `ClientTrainerAssignment.isActive()` is a METHOD but the DB column is `status` (STRING) — reading `.isActive` as a property silently breaks (2026-05-01 incident).
- **Top Fable recs:** DECIDE the two-model relationship (auto-seed executable `WorkoutPlan`s from an approved macro plan, OR demote long-horizon to coach-only strategy layer); unify the two builder entry points into one "Program Studio"; make "Assign" explicit in UI; elevate the client "Today / next" hero; real org-level Template Library via `duplicate` (not the dormant `WorkoutTemplate`).
- **Open Qs:** merge macro+executable models or layer them? · which builder is canonical? · client sees whole horizon or current mesocycle? · per-client create vs org templates + bulk-assign? · activate → auto-schedule sessions? · retire `WorkoutTemplate`?

### H. Next-Best-Action recommender — *P0 (the strategic keystone)*
**Verdict `[VERIFIED]`:** the real GAP (see §1.4). Today: static assignment (plan day-sequencing) + "Ask Coach" chat + streak-rescue nudge. No data-derived "do this specific workout next between sessions." Ingredients exist, nothing composes them.
- **Top Fable recs:** design a unified Next-Best-Action engine (inputs: plan cursor + logged history + pain constraints from D + phase rec + variation engine + corrective service; output: a dated "do this next" card) and the shared component that renders on ALL FOUR dashboards (Workstream J). Plan it as the connective tissue of the core loop.
- **Open Qs:** trainer-controlled (respect plan strictly) vs auto-suggest adaptive solo workouts? · what first-party signal powers "adaptive" (logged volume/progressive-overload) before wearables?

### I. Chart system — click-to-fullscreen + features — *P1*
**Verdict `[VERIFIED]`:** mature, real-data, but fragmented (§1.3) and **no expand/zoom** (§1.5).
- **Canonical client:** `CanonicalProgressChartsGrid.tsx` (12 charts, mounted `ClientProgressDashboardPage.tsx:269`) ← `useClientProgressCharts` ← `/api/client/analytics/chart-*` ← `chartDataController.mjs` (real SQL over workout/measurement/macro tables, truthful empty shapes). Admin variant `AdminProgressChartsGrid`. Per-card interaction shell = `ProgressChartActionBar` (range/legend/CSV/PNG/Share/Details drilldown). Only modal = `ProgressChartStudio` (share, not zoom). Shared `SafeChart` boundary + `chartTheme.ts`.
- **Density problem:** 2-col grid, hardcoded Victory `height={200}`, cards `min-height:260px`, heavy action bar competing for space; **6 intelligence boards stack ABOVE the 12 charts**. On 375px the action row wraps and pushes the chart into a sliver — compounds Sean's complaint.
- **Dormant:** `Charts/ChartGallery.tsx` = the "50-chart gallery" from memory — **zero consumers, all DEMO_DATA mock**. The non-`live/` chart folders (line/bar/radar/…) are dormant+mock; only `charts/live/*` are canonical+real.
- **Top Fable recs:** reusable `<ChartExpandModal>` reusing the `ProgressChartStudio` shell + a maximize icon in `ProgressChartActionBar` (every card gets it free); raise Victory height in focus mode + a featured 2-col-span hero chart; collapse the action bar into a kebab at ≤430px; move the 6 boards below-the-fold/tabbed; consolidate the 3 chart engines + rename the colliding `ClientAnalyticsPanel.tsx`; decide fate of the dormant 50-chart gallery; keep truthful empty states (never DEMO_DATA on live). **Feature-ideation seeds:** goal/target overlays, PR markers, compare-mode (period vs period / client vs cohort), session-tied annotations, AI "what this trend means", pinch-zoom/scrub, milestone export, focus-metric-of-week.
- **Open Qs:** canonical chart engine (`/api/client/analytics` vs `/api/workout-forms`)? · expand = modal / in-place enlarge / focus route? · resurrect or archive the 50-chart gallery? · relayout the 6 boards? · fold pain-chart WIP into this or keep separate?

### J. Dashboards — assigned/next-workout across 4 roles — *P0*
**Verdict `[VERIFIED]`:** TWO dashboard systems: `/user-dashboard` (UserDashboard.V3 "Creator Observatory", social-first, role-less landing) and `/dashboard/*` (UniversalDashboardLayout, role-detected admin/trainer/client). Homes are REAL-data (no mock found in any mounted home).
- **The next-action card exists ONLY on client `/overview`** (real `GET /api/workouts/:id/current`). ABSENT from user home, trainer's own next-action, and admin overview. **Admin lands on `/coach-assistant`, not the proof-of-value overview** → "who trained / what's stale" is one click away, not first screen.
- **Two client homes:** `HomeTab.tsx` (user, social-first, no assignment card) vs `ClientDashboardHomeTab.tsx` (client, has assignment/session cards) — role-less "users" who are really clients miss their assigned-workout surface.
- **Dead:** `routes/DashboardRoutes.tsx` (unimported, misleads route-tracing). Wearable metrics (HR/Recovery/Strength) honestly "Not available".
- **Top Fable recs:** place the shared Next-Best-Action card (H) on all four roles with role framing (user=my next / client=coach-assigned / trainer=my next client action / admin=exceptions+stale+celebrate); resolve the `/user-dashboard` vs `/dashboard/client/overview` canonical-home conflict; make admin proof-of-value first-class; kill dead `DashboardRoutes.tsx`; 375px QA on trainer session rows (3 buttons + badge) + client quick-action pills.
- **Open Qs:** next-workout trainer-controlled or auto-suggest? · role-less "users" = prospects or role-missing clients? · admin lands on proof-of-value overview vs coach-assistant? · retire standalone `/workout` dashboard? · what powers empty Strength/Recovery/HR tiles?

### K. Hermes Learning Packet — new skill + rule — *P1 (Sean explicit)*
**Verdict `[VERIFIED]`:** ~60% plumbing exists; the skill does not. See §4 for the build plan (I am shipping the skill this session).
- **Existing & operational:** `scripts/continuity-append.mjs` (636ln: `SWAN_AGENT_SURFACE` gate, two-layer secret/PII sanitizer, atomic trim) writes `.ai-workflow/continuity/rolling-last-done.md`; the Pi Hermes daemon SSH/cat-reads 3 repo files at session start and prepends to Hermes's system prompt (`HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md`, smoke-tested PASS). **The repo→Hermes transport already works.**
- **Missing:** the `hermes-learning-packet` skill (grep = 0); any **Fable-tier source gate** (nothing tags packets by originating model); a **durable compounding corpus** (the closeout log TRIMS at 30KB → learning is lost; the intended Karpathy Wiki corpus is BLOCKED on Pi SSD/power hardware); any auto-emit-after-Fable trigger.
- **Constraint `[VERIFIED]`:** Sean has subscriptions, not API keys, for Claude/Codex → the Fable-tier gate must trust an **agent/human-supplied provenance tag**, not an API call.

### L. Sessions & Credits ("downgrading") — *P0 (NEW workstream — not in draft A–K)*
**Verdict `[VERIFIED]`:** REAL, revenue-bearing, mostly works — but the word "session" spans **3 concepts** (scheduled `Session` · logged `WorkoutSession` · offline `SessionContext`) which is the confusion Sean feels. Sean explicitly named "sessions all working," "downgrading," "trainers can train" — this deserves its own workstream.
- **"Downgrade" = decrement `User.availableSessions`** (INTEGER). Canonical trainer-trains-and-logs path `[VERIFIED]`: `useTrainerTodaySessions` → deep-link to logger with `clientId+sessionId+sessionCredits` → `POST /api/workout-forms` atomically locks client + linked session, verifies assignment + `EDIT_WORKOUTS`, decrements `availableSessions`, completes the scheduled session (`completeAiLinkedScheduledSession`). Swan Coach AI path mirrors it.
- **5 REAL deduction paths:** on booking · on workout-form log · manager no-log completion (requires `completeWithoutLog+deductSessionCredit`) · no-show attendance · batch/cron catch-up. Credit GRANT + payment recovery (`sessionDeductionService.mjs`, 897ln: Order/FinancialTransaction audit, idempotency, advisory locks). Storefront package → balance link REAL. Non-deducting bypass (Move Fitness/external) REAL.
- **🔑 CONFUSION SOURCES `[VERIFIED]`:** `frontend/src/context/SessionContext.tsx` — mounted offline localStorage tracker whose fetches hit **endpoints absent from unified `sessions.mjs`** (`/api/admin/all-sessions`, `/api/trainer/stats`, `/api/admin/session-stats` → `[LIKELY]` 404 → silent empty). `sessionService.completeSession()` **hardcodes `deductSessionCredit:false`** → quick "Complete" NEVER downgrades (a "why didn't it deduct?" trap). Dormant duplicate `UniversalMasterSchedule/SessionAllocationManager.tsx` (1279ln, generic non-Swan palette, no importer) vs canonical `Admin/SessionAllocationManager.tsx`. Dead route files `trainingSessionRoutes.mjs`/`sessionRoutes.mjs` (unmounted).
- **Top Fable recs:** name/separate the 3 concepts (Appointment / Workout Log / Session Credits); one-tap "Train a client now" from Today schedule → mobile logger with session pre-linked + visible "uses 1 of N credits" + atomic save; relabel the never-deducting "Complete" as "Mark done without charge"; first-class always-visible Session Balance chip (low-balance warning + "buy more" → storefront); archive dormant duplicates as a separate hygiene slice.
- **Open Qs:** retire or repair `SessionContext`? · can no-log "Complete" ever deduct, or always waived? · canonical allocation UI, archive the duplicate? · do credits expire (UI references `expiryDate`, model has none)? · trainers grant credits or admin-only?

---

## 3. CONSOLIDATED OPEN QUESTIONS FOR SEAN (decision-gating)
These change plan STRUCTURE; most per-surface Qs are for Fable to propose + Sean to ratify during the build.
1. **Pain WIP (§1.2):** preserve + reconcile onto origin/main, or abandon? (At risk of loss — time-sensitive.)
2. **Priority order:** confirm P0 = {Logger consolidation F · Program-model decision G · Next-Best-Action H · 4-dashboard visibility J · Sessions clarity L} before the P1 remakes? 
3. **Two program models (G):** merge into one, or strategy-layer (macro) vs execution-layer (executable)?
4. **Canonical chart engine (I):** `/api/client/analytics` (Phase-14) as the one, retire `/api/workout-forms` engine?
5. **AI Village:** run the paid 15-brain now, or after you review the enhanced brief? (Rule 16 — your explicit go required.)
6. **Nutrition prod keys:** are `FATSECRET_*` / `USDA_API_KEY` set in Render? (Gates restaurant + quality food search.)

---

## 4. HERMES LEARNING PACKET — build spec (shipped this session as a skill)
See `.claude/skills/hermes-learning-packet/SKILL.md` + CLAUDE.md Rule 68 / AGENTS.md mirror. Design summary:
- **Reuse, don't reinvent:** mirror `continuity-append.mjs` (surface gate, two-layer `scan-secrets.sh` + path/PII scrub, atomic write) via a sibling emitter `scripts/hermes-learning-append.mjs` writing to a **durable** store `docs/ai-workflow/hermes-learning-packets/` (tracked → compounds, does NOT trim like the 30KB closeout log).
- **Fable-tier source gate:** each packet carries `originating_model` + an allowlist; sub-Fable output routes to a quarantine path, never the learning corpus. Because subscriptions ≠ API, provenance is agent/human-stamped and trusted.
- **Delivery:** extend the proven Pi daemon 3-file read list (or add one file Hermes reads the same SSH/cat way). Update `HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md` (the only rollback surface; `run_agent.py` is not in git).
- **Trigger:** manual by default (mirror "log this and close"); auto-after-Fable is opt-in via the `prompt-watcher` hook model.
- **Privacy:** IDs/roles only; reuse the two-layer sanitizer.

---
*Grounded 2026-07-05 from 11 parallel repo surface auditors. Backend line numbers are true for the working tree (132 behind origin/main) — re-verify on rebase. This audit is Step 1; the enhanced Master Brief is the companion, the AI Village + Fable synthesis is Step 2.*
