# SwanStudios — "Fable Vision" Master Build Brief · v2 (Opus-audited)
**Date:** 2026-07-05 · **Author:** Opus 4.8 (grounded from live repo + 11-surface deep audit) · **Recipient:** Fable 5 (Final Decider / Master Architect) · **Executor:** worker-bot (Opus 4.8 / Codex) following Fable's plan to the letter
**Status:** ENHANCED master prompt — Step 1 (Opus deep audit) COMPLETE. Pending: (2) AI Village 15-brain synthesis (paid, Sean-gated), (3) Fable synthesis → final locked plan.
**Companion (ground truth):** `docs/ai-workflow/AI-HANDOFF/FABLE-VISION-REBUILD-DEEP-AUDIT-2026-07-05.md` — read it alongside this brief; it carries the `file:line` evidence and confidence tags behind every claim here.

---

## 0. What this document is (read first)

This is the **master prompt Fable receives.** Sean's constraint: Fable is expensive, so Fable's job is **not** to hand-write every line — Fable's job is to produce a build plan so complete, so wireframed, so broken-down-to-the-tiniest-data-set that a **lower-tier worker-bot can execute it and produce exactly what Fable would have built**, in Fable's exact vision, with zero ambiguity.

Everything below is **grounded against the real, current repository** (11 parallel surface auditors, 2026-07-05, 1.86M tokens). Where Sean's mental model differed from the live code, the correction is called out — so Fable plans against reality, not a guess. Fable treats "current state" as verified starting points and elevates from there.

**The pipeline this brief feeds:**
```
[THIS BRIEF v2] + [DEEP AUDIT]  →  AI Village 15-brain synthesis (paid, Sean-gated)  →  Fable synthesis (FINAL plan)
                →  worker-bot builds slice-by-slice with recursive hostile review until zero errors  →  push to Render
                →  Hermes Learning Packet generated from Fable-tier output so Hermes evolves
```

**Fable's remit (Sean's words):** be the head designer/orchestrator of the site. Do anything and everything you want — *as long as you keep every working feature and add features* — to take the UI/UX to **professional, award-winning status**, specifically the best award-winning experience for **workout logging and charts.** Where you change direction, say why, and preserve the mandatory-working core.

---

## 0.5 ⚠ PRE-FLIGHT (P0-minus — before ANY workstream) — from the deep audit

These two facts gate everything. Fable's plan must open with them.

1. **REBASE FIRST.** The working branch `wip/comms-notifications-2026-07-05` is **132 commits behind `origin/main`** (`git rev-list --left-right --count origin/main...HEAD = 132 1`). Frontend chart files match origin/main but `backend/controllers/chartDataController.mjs` has drifted. **Re-base every workstream onto current origin/main before planning against line numbers.** Backend line numbers in this brief are working-tree-true; verify on rebase.
2. **PRESERVE THE PAIN WIP SAFELY.** The only unpushed commit `d7e501559` is a real, valuable pain→workout constraint engine on a stale base — and a naive cherry-pick of its `BodyMap/index.tsx` **DELETES two live production features** (`BodyMapEvidenceSection` evidence gallery + `resolveAnatomyGender` gender auto-detect, both added to origin/main after the fork). **Reconcile via a 3-way merge onto current origin/main, never overwrite.** (Full detail: Workstream D + Deep Audit §1.2.)

---

## 1. Global mandate (applies to EVERY workstream)

1. **Uniformity is the prime directive.** ONE canonical workout logger, ONE canonical exercise Rolodex, ONE theming system, ONE card/button language across the whole app. No parallel implementations of the same surface. Every remake **consolidates** competing surfaces — it never adds another. *(Deep audit: the real duplication is at the backend/nav layer, not the logger UI — see §1.3 of the audit.)*
2. **Mobile-first for live-session surfaces** (workout logger, exercise Rolodex, nutrition logging, pain chart, "train a client now") — Sean trains clients on a phone. Desktop must also be marvelous. Plan BOTH explicitly; never ship a surface tuned for one.
3. **Data truth.** Charts, progress, and next-best-action come from real logged data (`workout_logs`, `workout_sessions`, `body_measurements`, `daily_macro_logs`). Mock data is a gap to replace, never a feature. Truthful empty states must survive every remake — never fall back to `DEMO_DATA` on a live surface.
4. **Core loop first.** log the workout → save → turn into chart/progress proof → decide the next training action → make milestones shareable. The mandatory-working core (logger, program creation, cross-dashboard "what's next", session/credit clarity) outranks every remake.
5. **Slice discipline.** Every workstream decomposes into numbered, independently-shippable slices. Each slice: failing regression test first (or explicit why-not), build, **recursive hostile review + fix until zero errors/zero fixes remain**, verify from the real caller path, only then move on. Push to Render only when the whole set is clean.
6. **House rules are non-negotiable** (CLAUDE.md): styled-components only (no MUI); Crystalline Swan palette via `var(--token, #fallback)`; Dual-Button Glow (blue bg → purple glow / purple bg → cyan glow); 44px min touch targets; dark-first (`crystalline-dark` default); WCAG 4.5:1 contrast minimum; ≤300 lines/file (extract hooks/utils/styles/types); blueprint header on components >100 lines; Victory charts only; zero PII to LLMs (IDs only); no yoga/meditation language ("stretching"/"flexibility"); 7-star documentation on new files.
7. **Credentials framing:** "26+ years training experience" + "NASM-protocol / NASM workshop-trained" — NEVER "NASM-certified."
8. **Schema-drift vigilance (Rule 58).** The two named landmines: `WorkoutPlan` hybrid camelCase/snake_case columns need explicit `field:` mappings; `ClientTrainerAssignment.isActive()` is a METHOD, the DB column is `status` (STRING) — never read `.isActive` as a property.

---

## 2. Output contract — what Fable must produce for EVERY workstream

For each workstream (A–L), Fable's final plan must contain **all** of:

1. **Vision statement** — what it is, what it's for, where it sits (parent surface vs child), why it matters to the core loop / next-best-action / revenue / retention.
2. **Grounded current state** — with real `file:line` (seeded below + in the Deep Audit; Fable extends).
3. **Desired end state** — Fable's elevated vision: spectacularly beautiful + maximally easy + maximally functional, fewest clicks / least time.
4. **Gap analysis** — absence-first: what's missing that should exist, ranked by value / money left on the table.
5. **Mermaid diagrams** — minimum an architecture/flow diagram + a data-flow diagram; a state machine where the surface has modes.
6. **Wireframes** — desktop AND mobile, for every distinct state (loading / empty / populated / error). ASCII or precise structured description is fine.
7. **Data & API contract** — every model field (type + nullability), every endpoint (method, path, auth role, request/response shape), every drift risk (real column vs caller field).
8. **Component breakdown** — exact files to create/modify, each ≤300 lines with a blueprint header, mapped to styled-components + token rules.
9. **Slice plan** — numbered, independently shippable; each: goal, files touched, failing-test-first, acceptance criteria, hostile-review checklist, responsive-matrix targets, rollback step.
10. **Uniformity/consolidation note** — which competing/legacy/dormant surfaces this workstream retires, with evidence they're safe to retire (grep + mount check per Rule 34).
11. **Hermes Learning hook** — the one-paragraph "what Hermes should learn from this" seed (Workstream K).

**Detail bar (Sean's explicit ask):** each plan must be executable by a lower-tier worker-bot with **zero further questions** — "to the T, everything mermaid, wireframed, broken into the tiniest data set." If a worker-bot would need to ask Fable a question, the plan is incomplete.

Responsive matrix (CLAUDE.md): `320 · 375 · 414 · 768 · 1024 · 1280 · 1440 · 1920 · 2560×1440 · 3840×2160 · 3440`.

---

## 3. Workstreams (grounded)

> Priority tiers: **P0 = mandatory-working core** · **P1 = high-value remakes** · **P2 = deepening/expansion.** Fable may re-sequence with justification, but P0 ships first.

### A. Theme picker ease-of-use + cross-theme contrast — *P1*
**Sean's ask:** easier theme-switching; keep the newer dropdown but make it mobile-friendly; add a "click to advance to next theme" affordance; tighten text contrast across **every** theme and page (Fable to produce the contrast methodology + plan).
**Grounded correction:** the live control is **already a single 44px click-to-cycle button** (`UniversalThemeToggle.tsx`, mounted `ActionIcons.tsx:243`); **there is NO dropdown in the live UI** — Sean's "click to change" memory IS today's behavior. **28 themes** (18 core + 10 premium). A **dormant, already-built direct-select grid** exists: `components/ThemeShowcase.tsx` (`setTheme(id)`), unmounted — this is the picker to resurrect. Theme persists to `localStorage` only (no DB sync). Contrast is runtime-enforced for **button text only**; 28 themes' body/muted/label text are hand-authored + unchecked. Single-point contrast home: `utils/theme/themeUtils.ts` (`getReadableAccentText`/`contrastRatio`/`relativeLuminance`).
**Fable must design:** dual affordance (keep 1-tap cycle + add a mobile bottom-sheet / desktop popover jump-to-theme picker built on `ThemeShowcase`, grouped Signature/Dark/Light/Premium, live swatches); a table-driven WCAG pass across all 28 themes that **clamps `--text-muted/--text-label/--text-secondary` via the existing luminance helper** (fix-all-28-at-once, not 28 hand-edits); derive toggle chrome from active-theme tokens (kills the 13-theme switch); a touch-visible "next theme" preview (current tooltip is hover-only). Cleanup: retire dead Redux `store/themeSlice.ts`. Decide: expose all 28 vs curate + gate "premium"; DB-sync theme yes/no.

### B. Exercise Rolodex remake + consolidation — *P1 (Sean: "the main thing that chooses our workouts")*
**Sean's ask:** remake it in Fable's vision — spectacularly beautiful, maximally easy (esp. mobile, where it's used most during live sessions), fully functional, add anything missing. Make it THE single canonical exercise chooser used everywhere.
**Grounded reality:** unified DATA, fragmented PRESENTATION. Canonical = `WorkoutLogger/NASMExerciseRolodex.tsx` (virtualized `react-window`, preview split-view, keyboard nav, real mobile tuning). Shared spine `useExerciseSearch.ts` → `exerciseRoutes.mjs:480` (`/library`) → `Exercise` model (~736 rows; route copy says "840+" — **reconcile count**). **6 pickers total, all on the same endpoint** (canonical + planner `WorkoutPlannerRolodexPanel` + bootcamp `ExerciseRolodexPanel` + `WorkoutManagement/ExerciseLibrary` + `ExerciseSelectionStep` + `pages/workout/ExerciseSelector`), plus dormant + wrong-endpoint `Shared/ExercisePickerPanel.tsx` (0 consumers, points at trainer-only `/search` → 403 for clients).
**Fable must design:** extract ONE shared `<SwanExercisePicker>` from `NASMExerciseRolodex` (virtualized + preview + mobile core), unify the divergent filter vocab, have planner + bootcamp consume it; **replace the anchored dropdown overlay with a mobile bottom-sheet** (survives the keyboard, more visible rows, no name truncation); retire the 5 competing/legacy/orphan selectors with grep+mount evidence; promote real `coachingCues`/`instructions` over the `getExerciseTips()` keyword heuristic; surface an honest "no demo video yet" state; Rule-58 schema cross-check on `exerciseLibraryContract.mjs` before trusting counts.

### C. Bootcamp creator remake — *P1*
**Sean's ask:** remake in Fable's vision — take everything, upgrade to the fullest, add what's missing.
**Grounded reality:** large, LIVE, actively-developed (~40 files + `backend/services/bootcamp/`). Dual/tri-mode station builder with genuine differentiators (pain-aware flagging from `ClientPainEntry`, Board 2 joint-friendly / Board 3 low-impact swaps, overflow lap-rotation, 2-week freshness from `BootcampClassLog`, floor/demo mode, PDF export). Sibling: Sprint Planner (3-month, `/api/bootcamp/sprints`). Uses its own `ExerciseRolodexPanel` → Workstream B applies.
**🔑 Highest-value gap:** the "**Log class as taught**" UI does NOT exist — backend + `useBootcampAPI.logClass/getHistory` exist but no component consumes them → the freshness engine is **starved** (no way to write `BootcampClassLog`). Also: group-class data does NOT feed per-client progress charts; 3 nav registrations for one page.
**Fable must design:** ship the "Mark as Taught" + class-history UI (activates freshness + history + analytics); bridge group participation into per-client progress (optional attribution → data-truth loop); mobile-first stepped flow (replace the clipped 3-pane deck on phone); consolidate 3 nav paths to one; split the 657-line generator under the cap; **showcase** the buried differentiators as premium UI moments; canonical-Rolodex integration (B); optional live interval/timer runner.

### D. Pain charts upgrade — *P1 (⚠ preserve first)*
**Sean's ask:** find what happened to the pain-chart upgrade (suspects it wasn't pushed), make it even better.
**Grounded reality — Sean is right:** the anatomical body-map upgrade + pain-aware generation are on origin/main (`5db066348`); the upgrade PLAN doc is on origin/main (`docs/ai-workflow/blueprints/BOOTCAMP-SPRINT-PLANNER-AND-PAIN-CHART-UPGRADE-PLAN.md`); but the **NEW upgrade CODE is unpushed/unreviewed** on the stale branch (commit `d7e501559`): `painChartInsights.ts` (pain→workout constraint engine), `PainChartInsightPanel.tsx`, `PainChartTrendFollowUp.tsx` (Victory), `BodyMapClientTargetSelector.tsx`. All insights are REAL (derived from `ClientPainEntry` rows). **⚠ Two merge regressions** if cherry-picked naively (deletes `BodyMapEvidenceSection` + `resolveAnatomyGender`, both live on origin/main). **🔑 Loop not closed:** the pain→workout `promptSnippet`/`workoutConstraints` are **display-only** — no wiring into Coach/bootcamp generation.
**Fable must design:** (a) preserve the WIP; (b) **3-way merge onto current origin/main** (compose alongside evidence gallery + gender auto-detect, never overwrite); (c) **close the pain→workout loop** — wire `workoutConstraints`/`promptSnippet` into the Coach + bootcamp generator (highest product value); (d) promote Pain Intelligence into the dashboard next-best-action (H); (e) decide client-vs-staff exposure of injury guidance (liability); hygiene: delete dead `getContrastColor`, replace the brittle source-string test.

### E. Nutrition ecosystem deepening — *P2*
**Sean's ask:** upgrade the whole nutrition intelligence in Fable's vision. Meal logger super important. Farm finder (farmers markets) super important. Garden ("just a list" → deeper, microgreens). Restaurant finder deeper. Supplements. Get needed APIs — or **build his own APIs/data** where paid ones are too costly (solo builder; self-hosting is cheaper).
**Grounded reality:** hub `NutritionWorkspace.tsx` (13 tabs, subscription-gated). **REAL:** meal logger → `DailyMacroLog` via `/api/macros` (USDA FoodData Central + OpenFoodFacts + CalorieNinjas); supplement gap-analysis (reads 7–30d macros); barcode scanner (OpenFoodFacts + FatSecret, caches `FoodProduct`); garden zone lookup (phzmapi.org); ingredient safety; AI photo (Gemini). **STATIC (Sean's "just a list"):** garden = 15 hardcoded plants / 1 microgreen, no grow-tracking; supplements = 12 hardcoded, **ALL affiliate URLs empty** (zero revenue). **BROKEN/MISLABELED:** farm finder on **deprecated USDA AMS** endpoint (likely empty in prod); restaurant tab is a **FatSecret nutrition-FACTS search mislabeled as a location finder** (needs `FATSECRET_*` keys). Meal logger **fragmented across 4 surfaces** + 2 barcode entry points. *(Draft noted a camera scanner may be orphaned — reconcile which barcode path is canonical.)*
**Fable must design:** consolidate the 4 logger surfaces into one "logger mill" (manual/search/voice/photo/barcode as modes of ONE flow); a **deep garden module** (My Garden model, grow-tracking, microgreen timelines, care reminders, harvest journal, garden→macro bridge); a durable farm-finder strategy — **spell out paid API vs self-built dataset/API** per Sean's cost constraint (USDA Local Food Portal / self-host + 24h cache + farm/CSA profiles); split "Menu Nutrition Facts" from a true geolocation "Restaurants Near Me" finder; wire supplement affiliate URLs (or a self-hosted product/link table); re-mount/unify the camera barcode scanner. Flag orphans for cleanup (Rule 34).

### F. Workout logger revamp — *P0 (Sean's #1 "most important")*
**Sean's ask:** revamp the logger into Fable's vision — upgraded, enhanced, next-level — ONE uniform logger everywhere, themed consistently with the Rolodex.
**Grounded reality (good news):** there is **already ONE canonical logger** — `WorkoutLogger.tsx` — mounted on all four surfaces via thin wrappers; `QuickLogMode`/`WorkoutLoggerCoachTerminal` are children, not competitors. Write path REAL end-to-end: `POST /api/workout-forms` → txn persisting `WorkoutSession` + per-set `WorkoutLog` + `DailyWorkoutForm` + XP; charts read the same models. Mobile is STRONG (real breakpoints, 44px, `QuickLogMode`, sticky save bar, **offline queue** that re-submits on reconnect). `MobileWorkoutLogger.tsx` = dormant stub. **Sean's fragmentation fear is already solved at the UI layer.**
**🔑 The real dedup is BACKEND:** a SECOND write path (`adminWorkoutLoggerController` → `workoutLogService.logWorkoutForClient`, used by PLAUD voice-merge apply) writes `WorkoutSession`+`WorkoutLog`+XP but **NOT** `DailyWorkoutForm` → different DB footprints.
**Fable must design:** do NOT fork a second logger — enhance in place. **Consolidate the two backend write paths onto one service** (highest-value dedup; make voice-applied and UI-logged workouts identical, incl. `DailyWorkoutForm`). Next-level UX: fastest set entry, auto-default `QuickLogMode` on phone/live-session, rest timers, PR-detection surfacing, superset/circuit support, plan-prefill, voice + coach-terminal parity, visible offline-queue affordance. Tight visual uniformity with the canonical Rolodex (B). QA at 320/375/414 with RestTimer FAB + sticky bar + Coach terminal present (`timerFabClearance` test hints at overlap). Revisit the one-form-per-day 409 for AM/PM sessions.

### G. Client program creation (1-day → 12-month) — *P0 (Sean: "mandatorily working")*
**Sean's ask:** creating client plans (day / week / 3/6/9/12-month) MUST work — non-negotiable revenue/coaching infrastructure.
**Grounded reality:** **END-TO-END WORKS** via `WorkoutPlan`. Canonical UI `admin-workout-planner/WorkoutPlannerPage.tsx` (admin+trainer `/workout-planner`) → 7 durations (1 day → 12 months) → `POST /api/workout-plans` (draft) → `PUT /:id/activate`. **"Assign" == set `userId` + activate** (no separate verb). Client sees it via `GET /api/workouts/:userId/current`. All routes IDOR-mitigated.
**🔑 Two unintegrated program models:** `WorkoutPlan` (day-by-day, client-visible) vs `LongTermProgramPlan`+`ProgramMesocycleBlock` (3/6/9/12-month MACRO, coach-only, DIFFERENT UI `WorkoutCopilotPanel` "Long-Horizon" + `/api/ai/long-horizon`, DIFFERENT status vocab). **A 12-month macro plan never reaches the client.**
**Fable must design:** an end-to-end VERIFICATION plan proving 1-day/1-week/3/6/9/12-month creation works for a real trainer→client flow (failing-test-first per horizon); a **decision on the two program systems** — either approve-macro-plan auto-seeds executable `WorkoutPlan` mesocycles the client sees/logs, OR demote long-horizon to a coach-only strategy layer with all client-visible programming through `WorkoutPlan` (with a migration/compat plan). Unify the two builder entry points into one "Program Studio"; make "Assign to [client]" + "Set as current" explicit; guard against the `status`/`isActive` drift class (Rule 58). This is P0 — it must WORK before remakes.

### H. Next-best-action "between sessions" recommender — *P0 (the strategic keystone)*
**Sean's ask:** every dashboard shows "what workouts you're supposed to be doing in between the workouts you're doing" — suggestions based on everything the user entered. He calls this the most important thing.
**Grounded reality — real GAP.** No surface reads logged history and proactively suggests a specific between-session workout. Today's "assignment" is plan **day-sequencing** (`clientTrainingReadModelService.buildTodayAssignment`), not adaptive. Ingredients exist but are unassembled: `GET /api/exercises/recommended`, `GET /api/analytics/nasm-recommendations/:level`, `variationEngine.mjs`, `correctiveExerciseService.mjs`, `clientIntelligenceService.mjs`, plan `/advance` cursor.
**Fable must design:** a unified **Next-Best-Action engine** — inputs (plan cursor + logged history + pain constraints from D + phase rec + variation engine + corrective service), output (a specific, dated "do this next between sessions" card), and the shared component that renders it on ALL FOUR dashboards (J). Decide trainer-controlled vs adaptive-solo. This is the connective tissue of the whole core loop — plan it as the keystone.

### I. Chart system — click-to-fullscreen drill-down + new features — *P1*
**Sean's ask:** charts are beautiful but cramped. Add a modal: click a chart → fills the screen → clickable areas reveal deeper, more-defined data. Give ideas to make the chart section really cool / next-level.
**Grounded reality:** Victory-only, real-data on mounted surfaces. Canonical client = `CanonicalProgressChartsGrid` (12 charts, `/api/client/analytics/chart-*` → `chartDataController.mjs`, truthful empty shapes) + `AdminProgressChartsGrid`. Per-card `ProgressChartActionBar` (range/legend/CSV/PNG/Share/Details). **NO expand/zoom** — the only modal (`ProgressChartStudio`) is a share/proof-card studio (its shell = the perfect foundation). **Density problem:** 2-col grid, hardcoded Victory `height={200}`, heavy action bar, + **6 intelligence boards stack above the 12 charts** → on 375px the chart gets a sliver. Dormant `Charts/ChartGallery.tsx` (the "50-chart gallery") = zero consumers, all DEMO_DATA; 3 real-data chart engines coexist; name-collision on two `ClientAnalyticsPanel.tsx`.
**Fable must design:** a reusable `<ChartExpandModal>` reusing the `ProgressChartStudio` shell (aria-modal, ESC + backdrop) rendering the live Victory chart at large size, opened by a maximize icon in `ProgressChartActionBar` (every card gets it free), with clickable drill-down regions from extended `drilldownRows` + on-demand deeper endpoints; raise Victory height in focus mode + a featured 2-col-span hero chart; collapse the action bar into a kebab at ≤430px; move the 6 boards below-the-fold/tabbed; consolidate the 3 chart engines + rename the collision; decide the dormant 50-chart gallery (resurrect w/ real data or archive). **Feature-ideation section (expand + rank):** goal/target overlays, PR markers on timelines, compare-mode (period vs period / client vs cohort), session-tied annotations, AI "what this trend means", pinch-zoom/scrub on mobile, milestone export, focus-metric-of-week.

### J. Dashboards — assigned/next-workout visibility across all 4 roles — *P0*
**Sean's ask:** user, client, trainer, AND admin dashboards all show the assigned/suggested "what to do next between sessions."
**Grounded reality:** two systems — `/user-dashboard` (UserDashboard.V3, social-first, role-less landing) + `/dashboard/*` (UniversalDashboardLayout, role-detected). Homes are REAL-data. **The next-action card exists ONLY on client `/overview`.** Absent from user home, trainer's own next-action, and admin overview. **Admin lands on `/coach-assistant`, not the proof-of-value overview.** Two client homes (`HomeTab` user vs `ClientDashboardHomeTab` client) → role-less "users" who are really clients miss their assigned-workout surface. Dead: `routes/DashboardRoutes.tsx` (unimported).
**Fable must design:** the shared Next-Best-Action card (H) on all four roles with role framing (user = my next / client = coach-assigned next / trainer = my next client action / admin = exceptions + stale + celebrate); resolve the `/user-dashboard` vs `/dashboard/client/overview` canonical-home conflict; make the admin proof-of-value view first-class (who trained / what's stale / who needs intervention above the fold); kill dead `DashboardRoutes.tsx`; 375px QA on trainer session rows + client quick-action pills.

### K. Hermes Learning Packet — new skill + CLAUDE.md/AGENTS.md rule — *P1 (Sean explicit; shipped this session)*
**Sean's ask:** after anything substantial — **especially Fable output** — generate a summary fed to Hermes so Hermes learns and self-upgrades **without Sean re-typing.** Hermes learns **only from Fable-tier intelligence** (never Opus 4.8 or below). Make it a **skill** + rule in CLAUDE.md + AGENTS.md. Constraint: Sean has **subscriptions, not API access** for Claude/Codex.
**Grounded reality:** ~60% plumbing exists and the repo→Hermes transport is OPERATIONAL — `continuity-append.mjs` (surface gate + two-layer sanitizer + atomic trim) writes `.ai-workflow/continuity/rolling-last-done.md`; the Pi daemon SSH/cat-reads 3 repo files at session start and prepends them (`HERMES-DAEMON-PHASE-B-PATCH-2026-04-22.md`, smoke-tested PASS). Missing: the skill (grep=0), a Fable-tier source gate, a durable compounding corpus (closeout log trims at 30KB; Karpathy Wiki corpus BLOCKED on Pi hardware), an auto-after-Fable trigger.
**Shipped this session (v1):** `.claude/skills/hermes-learning-packet/SKILL.md` + CLAUDE.md Rule 68 / AGENTS.md mirror. Design: reuse `continuity-append` plumbing via a sibling emitter writing durable, tracked packets to `docs/ai-workflow/hermes-learning-packets/`; Fable-tier source gate via `originating_model` provenance tag + allowlist (sub-Fable → quarantine, never the corpus); deliver via the proven Pi 3-file read path; manual trigger by default; IDs/roles only. **Fable may refine** the ingest format + self-upgrade loop.

### L. Sessions & Credits — "downgrading", trainer-trains-client, session lifecycle — *P0 (NEW — Opus-added from the deep audit)*
**Sean's ask (from the dictation):** "my trainers can train the clients and the sessions are all working well, and downgrading, and making sure that the workout logger is working."
**Grounded reality:** REAL, revenue-bearing, mostly works — but "session" spans **3 concepts** (scheduled `Session` · logged `WorkoutSession` · offline `SessionContext`), which is the confusion Sean feels. "Downgrade" = decrement `User.availableSessions`. Canonical trainer-trains-and-logs path works end-to-end (Today schedule → deep-link logger with `clientId+sessionId+sessionCredits` → `POST /api/workout-forms` atomically deducts + completes the session). 5 real deduction paths; robust credit-grant + payment-recovery layer with audit trail; storefront package → balance link REAL. **Confusion sources:** `SessionContext.tsx` (offline localStorage tracker hitting **dead endpoints** → silent empty); `sessionService.completeSession()` **hardcodes `deductSessionCredit:false`** (quick "Complete" NEVER downgrades); dormant duplicate `SessionAllocationManager` (generic non-Swan palette) + dead route files.
**Fable must design:** **name/separate the 3 concepts** in IA + copy (Appointment / Workout Log / Session Credits) — this alone removes most confusion; a one-tap "**Train a client now**" flow from the Today schedule → mobile logger with the session pre-linked + a visible "uses 1 of N credits" banner + atomic save (logs AND downgrades); relabel the never-deducting "Complete" as "Mark done without charge (waived)"; a first-class always-visible **Session Balance chip** (real `availableSessions`, low-balance warning ≤2, "buy more" → storefront); admin allocation as the money command-center (clients-needing-payment + one-click package recovery, mobile-safe); a separate hygiene slice to retire `SessionContext`/dormant duplicates/dead routes (Rule 37).

---

## 4. Sequencing recommendation (Fable to ratify or override)

**P0-minus (pre-flight):** rebase onto origin/main + preserve the pain WIP via 3-way merge (§0.5).
1. **P0 prove + connect the core:** verify program creation for all horizons (G) → resolve the two program models (G) → build the Next-Best-Action engine (H) → surface it on all 4 dashboards (J) → consolidate the logger's two backend write paths + kill placeholder-zero stats (F/J) → clarify Sessions/credits + the "train a client now" flow (L).
2. **P1 remakes:** canonical Exercise Rolodex consolidation (B) → workout logger next-level (F) → bootcamp creator incl. "log as taught" (C) → chart click-to-fullscreen + features (I) → theme ease + all-28 contrast (A) → pain→workout loop closure (D) → Hermes packet refinement (K).
3. **P2 deepening:** nutrition ecosystem (E).

Rationale: the core loop (log → save → chart → next-best-action → share) must be provably working and visible on every dashboard, with session/credit truth legible, before we invest in remakes; the remakes then all inherit one canonical logger + Rolodex + theming + chart-expand pattern.

## 5. Definition of done (whole initiative)
Every slice: failing-test-first (or explicit why-not) → build → recursive hostile review + fix until zero errors/zero remaining fixes → verify from the real caller path → responsive matrix checked → then next slice. The initiative is done when the mandatory-working core (F/G/H/J/L) is verified end-to-end, the remakes ship on one canonical set of surfaces, competing/legacy/orphan surfaces are retired with evidence, Tier-A is green (baseline disclosed per Rule 56), and a Hermes Learning Packet has been emitted. Only then: push to Render.

---
*Grounded 2026-07-05 from 11 parallel repo surface auditors (Deep Audit companion). Current-state facts carry `file:line`; backend line numbers are working-tree-true (132 behind origin/main) — re-verify on rebase. Step 1 (Opus deep audit) is complete; this brief becomes final after the AI Village + Fable synthesis.*
