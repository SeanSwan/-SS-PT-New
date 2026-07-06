# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 77.1s
> **Files:** FABLE-BRIEF-TO-REVIEW.md
> **Generated:** 7/5/2026, 8:28:03 PM

---

We are given a plan document (FABLE-BRIEF-TO-REVIEW.md) and we are to review the file organization as proposed in the plan.
 However, note that the plan document does not explicitly list the proposed file tree. Instead, it describes the workstreams and their requirements.

 Since the plan does not provide a specific file tree, we must infer the proposed files and folders from the descriptions in the workstreams.

 Steps:
 1. We note that the plan is for the SwanStudios project (React + TypeScript + styled-components frontend).
 2. We must derive the file organization from the plan's descriptions of what needs to be built or modified.

 Approach:
 - We will go through each workstream (A to L) and note the files and folders that are mentioned or implied.
 - We will then consolidate these into a proposed file tree.
 - We will then evaluate the file tree against the constraints (300 lines/file, barrel exports, etc.)

 However, note: the plan does not give a file tree. It gives descriptions of components, hooks, utilities, etc.

 We must create a proposed file tree based on the plan's descriptions.

 Let's break down by workstream:

 A. Theme picker ease-of-use + cross-theme contrast
   - Mentions: `UniversalThemeToggle.tsx`, `ActionIcons.tsx:243`, `ThemeShowcase.tsx`, `utils/theme/themeUtils.ts`
   - Proposed changes: 
        * Resurrect `ThemeShowcase.tsx` (which is currently unmounted) as a theme picker (bottom-sheet/popover)
        * Modify `UniversalThemeToggle.tsx` to have dual affordance (keep 1-tap cycle + add jump-to-theme)
        * Update `utils/theme/themeUtils.ts` to clamp text colors for contrast
        * Retire `store/themeSlice.ts` (Redux, so we are removing it)

 B. Exercise Rolodex remake + consolidation
   - Mentions: 
        * Canonical: `WorkoutLogger/NASMExerciseRolodex.tsx`
        * Shared spine: `useExerciseSearch.ts`
        * Endpoint: `exerciseRoutes.mjs:480` (`/library`)
        * Model: `Exercise` model
        * Competing pickers: 
            - planner `WorkoutPlannerRolodexPanel`
            - bootcamp `ExerciseRolodexPanel`
            - `WorkoutManagement/ExerciseLibrary`
            - `ExerciseSelectionStep`
            - `pages/workout/ExerciseSelector`
        * Dormant: `Shared/ExercisePickerPanel.tsx`
   - Proposed changes:
        * Extract ONE shared `<SwanExercisePicker>` from `NASMExerciseRolodex`
        * Unify filter vocab
        * Have planner, bootcamp, etc. consume the shared picker
        * Replace anchored dropdown overlay with mobile bottom-sheet
        * Retire the 5 competing selectors
        * Promote `coachingCues`/`instructions` over `getExerciseTips()`
        * Surface "no demo video yet" state
        * Rule-58 schema cross-check on `exerciseLibraryContract.mjs`

 C. Bootcamp creator remake
   - Mentions: 
        * Large, LIVE, actively-developed (~40 files + `backend/services/bootcamp/`)
        * Uses its own `ExerciseRolodexPanel` (so will be affected by B)
        * Highest-value gap: missing "Log class as taught" UI
        * Also: `useBootcampAPI.logClass/getHistory` exist but no component
        * Sibling: Sprint Planner (3-month, `/api/bootcamp/sprints`)
   - Proposed changes:
        * Ship "Mark as Taught" + class-history UI
        * Bridge group participation into per-client progress
        * Mobile-first stepped flow (replace clipped 3-pane deck on phone)
        * Consolidate 3 nav paths to one
        * Split the 657-line generator (so we must split a file that is currently 657 lines)
        * Showcase differentiators as premium UI moments
        * Canonical-Rolodex integration (from B)
        * Optional live interval/timer runner

 D. Pain charts upgrade
   - Mentions:
        * Anatomical body-map upgrade + pain-aware generation on origin/main (commit `5db066348`)
        * Upgrade PLAN doc: `docs/ai-workflow/blueprints/BOOTCAMP-SPRINT-PLANNER-AND-PAIN-CHART-UPGRADE-PLAN.md`
        * NEW upgrade CODE (unpushed) on stale branch (commit `d7e501559`):
            - `painChartInsights.ts`
            - `PainChartInsightPanel.tsx`
            - `PainChartTrendFollowUp.tsx` (Victory)
            - `BodyMapClientTargetSelector.tsx`
        * Two merge regressions if cherry-picked naively: deletes `BodyMapEvidenceSection` + `resolveAnatomyGender`
        * Loop not closed: pain→workout `promptSnippet`/`workoutConstraints` are display-only
   - Proposed changes:
        * (a) preserve the WIP (so we keep the unpushed code but merge it properly)
        * (b) 3-way merge onto current origin/main (compose alongside evidence gallery + gender auto-detect)
        * (c) close the pain→workout loop: wire `workoutConstraints`/`promptSnippet` into Coach + bootcamp generator
        * (d) promote Pain Intelligence into dashboard next-best-action (H)
        * (e) decide client-vs-staff exposure of injury guidance
        * hygiene: delete dead `getContrastColor`, replace brittle source-string test

 E. Nutrition ecosystem deepening
   - Mentions:
        * Hub: `NutritionWorkspace.tsx` (13 tabs, subscription-gated)
        * REAL: 
            - meal logger → `DailyMacroLog` via `/api/macros` (USDA FoodData Central + OpenFoodFacts + CalorieNinjas)
            - supplement gap-analysis (reads 7–30d macros)
            - barcode scanner (OpenFoodFacts + FatSecret, caches `FoodProduct`)
            - garden zone lookup (phzmapi.org)
            - ingredient safety
            - AI photo (Gemini)
        * STATIC:
            - garden = 15 hardcoded plants / 1 microgreen
            - supplements = 12 hardcoded, ALL affiliate URLs empty
        * BROKEN/MISLABELED:
            - farm finder on deprecated USDA AMS endpoint
            - restaurant tab is a FatSecret nutrition-FACTS search mislabeled as location finder
        * Meal logger fragmented across 4 surfaces + 2 barcode entry points
        * Draft noted a camera scanner may be orphaned
   - Proposed changes:
        * Consolidate 4 logger surfaces into one "logger mill" (manual/search/voice/photo/barcode as modes)
        * Deep garden module: My Garden model, grow-tracking, microgreen timelines, care reminders, harvest journal, garden→macro bridge
        * Durable farm-finder strategy (paid API vs self-built dataset/API)
        * Split "Menu Nutrition Facts" from true geolocation "Restaurants Near Me" finder
        * Wire supplement affiliate URLs (or self-hosted product/link table)
        * Re-mount/unify the camera barcode scanner
        * Flag orphans for cleanup

 F. Workout logger revamp
   - Mentions:
        * Already ONE canonical logger: `WorkoutLogger.tsx`
        * Mounted on all four surfaces via thin wrappers
        * `QuickLogMode`/`WorkoutLoggerCoachTerminal` are children
        * Write path: `POST /api/workout-forms` → txn persisting `WorkoutSession` + per-set `WorkoutLog` + `DailyWorkoutForm` + XP
        * Mobile: `MobileWorkoutLogger.tsx` = dormant stub
        * Real dedup is BACKEND: second write path (`adminWorkoutLoggerController` → `workoutLogService.logWorkoutForClient`) misses `DailyWorkoutForm`
   - Proposed changes:
        * Do NOT fork a second logger — enhance in place
        * Consolidate the two backend write paths onto one service
        * Next-level UX: fastest set entry, auto-default `QuickLogMode` on phone/live-session, rest timers, PR-detection, superset/circuit support, plan-prefill, voice + coach-terminal parity, visible offline-queue affordance
        * Tight visual uniformity with canonical Rolodex (B)

 G. Client program creation (1-day → 12-month)
   - Mentions:
        * END-TO-END WORKS via `WorkoutPlan`
        * Canonical UI: `admin-workout-planner/WorkoutPlannerPage.tsx` (admin+trainer `/workout-planner`)
        * 7 durations (1 day → 12 months) → `POST /api/workout-plans` (draft) → `PUT /:id/activate`
        * "Assign" == set `userId` + activate
        * Client sees via `GET /api/workouts/:userId/current`
        * Two unintegrated program models:
            - `WorkoutPlan` (day-by-day, client-visible)
            - `LongTermProgramPlan`+`ProgramMesocycleBlock` (3/6/9/12-month MACRO, coach-only, DIFFERENT UI `WorkoutCopilotPanel` "Long-Horizon" + `/api/ai/long-horizon`, DIFFERENT status vocab)
   - Proposed changes:
        * End-to-end VERIFICATION plan for 1-day/1-week/3/6/9/12-month creation
        * Decision on two program systems: either approve-macro-plan auto-seeds executable `WorkoutPlan` mesocycles, OR demote long-horizon to coach-only strategy layer
        * Unify the two builder entry points into one "Program Studio"
        * Make "Assign to [client]" + "Set as current" explicit
        * Guard against `status`/`isActive` drift (Rule 58)

 H. Next-best-action "between sessions" recommender
   - Mentions:
        * Grounded reality: real GAP. No surface reads logged history and proactively suggests a specific between-session workout.
        * Ingredients exist: 
            - `GET /api/exercises/recommended`
            - `GET /api/analytics/nasm-recommendations/:level`
            - `variationEngine.mjs`
            - `correctiveExerciseService.mjs`
            - `clientIntelligenceService.mjs`
            - plan `/advance` cursor
   - Proposed changes:
        * Unified Next-Best-Action engine: inputs (plan cursor + logged history + pain constraints from D + phase rec + variation engine + corrective service), output (specific, dated "do this next between sessions" card)
        * Shared component that renders it on ALL FOUR dashboards (J)
        * Decide trainer-controlled vs adaptive-solo

 I. Chart system — click-to-fullscreen drill-down + new features
   - Mentions:
        * Grounded reality: 
            - Canonical client = `CanonicalProgressChartsGrid` (12 charts, `/api/client/analytics/chart-*` → `chartDataController.mjs`, truthful empty shapes)
            - `AdminProgressChartsGrid`
            - Per-card `ProgressChartActionBar` (range/legend/CSV/PNG/Share/Details)
            - NO expand/zoom — only modal (`ProgressChartStudio`) is a share/proof-card studio
            - Density problem: 2-col grid, hardcoded Victory `height={200}`, heavy action bar, + 6 intelligence boards stack above the 12 charts
            - Dormant `Charts/ChartGallery.tsx` (50-chart gallery) = zero consumers, all DEMO_DATA
            - 3 real-data chart engines coexist
            - name-collision on two `ClientAnalyticsPanel.tsx`
   - Proposed changes:
        * Reusable `<ChartExpandModal>` reusing the `ProgressChartStudio` shell
        * Opened by a maximize icon in `ProgressChartActionBar` (every card gets it free)
        * Clickable drill-down regions from extended `drilldownRows` + on-demand deeper endpoints
        * Raise Victory height in focus mode + a featured 2-col-span hero chart
        * Collapse the action bar into a kebab at ≤430px
        * Move the 6 boards below-the-fold/tabbed
        * Consolidate the 3 chart engines + rename the collision
        * Decide the dormant 50-chart gallery (resurrect w/ real data or archive)
        * Feature-ideation: goal/target overlays, PR markers, compare-mode, session-tied annotations, AI "what this trend means", pinch-zoom/scrub on mobile, milestone export, focus-metric-of-week

 J. Dashboards — assigned/next-workout visibility across all 4 roles
   - Mentions:
        * Grounded reality:
            - Two systems: 
                - `/user-dashboard` (UserDashboard.V3, social-first, role-less landing)
                - `/dashboard/*` (UniversalDashboardLayout, role-detected)
            - Homes are REAL-data.
            - The next-action card exists ONLY on client `/overview`.
            - Absent from user home, trainer's own next-action, and admin overview.
            - Admin lands on `/coach-assistant`, not the proof-of-value overview.
            - Two client homes (`HomeTab` user vs `ClientDashboardHomeTab` client) → role-less "users" who are really clients miss their assigned-workout surface.
            - Dead: `routes/DashboardRoutes.tsx` (unimported)
   - Proposed changes:
        * Shared Next-Best-Action card (H) on all four roles with role framing
        * Resolve the `/user-dashboard` vs `/dashboard/client/overview` canonical-home conflict
        * Make the admin proof-of-value view first-class (who trained / what's stale / who needs intervention above the fold)
        * Kill dead `DashboardRoutes.tsx`
        * 375px QA on trainer session rows + client quick-action pills

 K. Hermes Learning Packet
   - Mentions:
        * Grounded reality: 
            - ~60% plumbing exists: `continuity-append.mjs` (surface gate + two-layer sanitizer + atomic trim) writes `.ai-workflow/continuity/rolling-last-done.md`
            - Pi daemon SSH/cat-reads 3 repo files at session start and prepends them (`HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md`)
        * Missing: 
            - the skill (grep=0)
            - a Fable-tier source gate
            - a durable compounding corpus (closeout log trims at 30KB; Karpathy Wiki corpus BLOCKED on Pi hardware)
            - an auto-after-Fable trigger
        * Shipped this session (v1): 
            - `.claude/skills/hermes-learning-packet/SKILL.md` + CLAUDE.md Rule 68 / AGENTS.md mirror
        * Design: 
            - reuse `continuity-append` plumbing via a sibling emitter writing durable, tracked packets to `docs/ai-workflow/hermes-learning-packets/`
            - Fable-tier source gate via `originating_model` provenance tag + allowlist (sub-Fable → quarantine, never the corpus)
            - deliver via the proven Pi 3-file read path
            - manual trigger by default; IDs/roles only
   - Proposed changes:
        * Fable may refine the ingest format + self-upgrade loop

 L. Sessions & Credits
   - Mentions:
        * Grounded reality:
            - REAL, revenue-bearing, mostly works
            - "session" spans 3 concepts (scheduled `Session` · logged `WorkoutSession` · offline `SessionContext`)
            - "Downgrade" = decrement `User.availableSessions`
            - Canonical trainer-trains-and-logs path works end-to-end (Today schedule → deep-link logger with `clientId+sessionId+sessionCredits` → `POST /api/workout-forms` atomically deducts + completes the session)
            - 5 real deduction paths; robust credit-grant + payment-recovery layer with audit trail; storefront package → balance link REAL
            - Confusion sources:
                - `SessionContext.tsx` (offline localStorage tracker hitting dead endpoints → silent empty)
                - `sessionService.completeSession()` hardcodes `deductSessionCredit:false` (quick "Complete" NEVER downgrades)
                - dormant duplicate `SessionAllocationManager` (generic non-Swan palette) + dead route files
   - Proposed changes:
        * Name/separate the 3 concepts in IA + copy (Appointment / Workout Log / Session Credits)
        * One-tap "Train a client now" flow from the Today schedule → mobile logger with the session pre-linked + a visible "uses 1 of N credits" banner + atomic save (logs AND downgrades)
        * Relabel the never-deducting "Complete" as "Mark done without charge (waived)"
        * First-class always-visible Session Balance chip (real `availableSessions`, low-balance warning ≤2, "buy more" → storefront)
        * Admin allocation as the money command-center (clients-needing-payment + one-click package recovery, mobile-safe)
        * Separate hygiene slice to retire `SessionContext`/dormant duplicates/dead routes

 Now, we must derive the file tree from these descriptions.

 We note that the project is a React + TypeScript frontend with styled-components.

 We will assume the following structure (based on common React projects and the mentions in the plan):

   src/
     components/
     hooks/
     utils/
     styles/   (for styled-components, but note: we are using styled-components so we might have a theme file and global styles)
     pages/
     services/ (for API calls)
     models/   (if we have TypeScript interfaces/models)
     assets/
     ... etc.

 However, the plan does not give the current structure, so we must infer from the mentioned files.

 Let's list all the files and folders mentioned in the plan (frontend only, since we are reviewing the frontend plan? Note: the plan mentions backend but we are a frontend specialist? Actually, the plan is for the whole app but we are reviewing the file organization as proposed in the plan. The plan does mention backend files, but the constraint is about the frontend? The problem says: "Review this plan's file organization." and the plan is for the whole app. However, the user says

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
