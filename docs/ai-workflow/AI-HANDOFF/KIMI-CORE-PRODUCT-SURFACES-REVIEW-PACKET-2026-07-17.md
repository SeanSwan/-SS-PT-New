# KIMI K3 — SwanStudios CORE PRODUCT SURFACES: Review → Upgrade-Blueprint Packet

**Author of packet:** Opus 4.8 (grounded on `origin/main`, 2026-07-17)
**Reviewer / FINAL DECIDER:** OpenRouter `moonshotai/kimi-k3`
**Transport:** `node scripts/consult-kimi.mjs --document <this-or-a-surface-slice> --remit "<§0.5 remit>" --effort medium`
**Privacy:** IDs/roles only — zero PII, zero secrets (Rule 8/44/59). Client references use `#id`, never names.

---

## §0 — WHO YOU ARE, AND WHAT THIS IS

You are **Kimi K3**, and on this work you are the **final decider**. You are not being asked to rubber-stamp Opus's design. You are being asked to look at ten live SwanStudios product surfaces, decide — with your own taste and creativity — **how each one should be upgraded to best serve the vision**, and hand back a build package so complete that Opus (the builder) makes **zero design or architecture decisions**. Every decision is yours.

The failure mode we are explicitly killing: a "blueprint" that delegates the hard calls (typography, the signature moment, exact copy, the CTA, the data flow) back to the builder. You have called this out before — *"a permission slip, not a blueprint."* Do not commission that here. **If a decision can be made, you make it, in numbers and exact strings.**

Your output for each surface must be **how KIMI would build it, not how Opus would build it.** Opus's role after you is stenography → code. Yours is authorship.

> **Authority boundary (Fable ruling, 2026-07-17):** You are final on *design within* Fable's binding rulings (§1.5). Fable's rulings are the frame; you fill it with the best possible design. The rulings themselves are not re-openable.

---

## §0.5 — HOW THIS PACKET IS RUN (read before producing anything)

**Run this ONE SURFACE AT A TIME.** Ten surfaces in a single high-effort call will exhaust your output budget and return empty (a known failure of this transport). Each surface block in §4 is self-contained; Sean pastes **§0–§3 + §5–§7 (the shared law) + ONE surface block from §4** as the `--document` for each run.

**The remit to pass** (`--remit`), which overrides the default hostile-review remit so you *author the upgrade* instead of only critiquing:

> "You are the final design+architecture decider for this SwanStudios surface. First give a one-line VERDICT on the current surface. Then produce the complete UPGRADE BUILD PACKAGE per the packet's §3 Output Contract for THIS surface only: (a) current-state truth check, (b) gap analysis vs the vision, (c) the ONE signature upgrade, (d) a Mermaid flowchart of the upgraded user+data flow, (e) ASCII/HTML wireframes for 375px and 1440px, (f) a file-by-file build order with exact paths, props, signatures, copy strings, design tokens, and per-file acceptance criteria, (g) a Mermaid sequence or ER diagram wherever data is created/changed, (h) what a design-savvy competitor out-builds. Make EVERY decision — leave zero decisions to the builder. Obey the shared brand/implementation law in §2 AND the Fable Final Rulings in §1.5 (binding, not re-openable). Be comprehensive; verdict first."

**Effort:** `--effort medium` with the verdict-first remit (high effort can burn the whole budget on internal reasoning and emit nothing). Escalate a single surface to `high` only if `medium` returns thin.

**Output filename convention:** `docs/ai-workflow/AI-HANDOFF/KIMI-<SURFACE>-UPGRADE-BLUEPRINT-2026-07-17.md`.

---

## §1 — THE VISION YOU ARE ENHANCING TOWARD (non-negotiable frame)

SwanStudios is a **trainer-led B2B2C training operating system** — NOT a generic fitness social app. The moat is: coach-workflow depth + a first-party workout/progress record + paid accountability/community, around **one canonical client record**.

**Product Core Loop:** log the workout → save the diary entry → turn it into charts/progress proof → decide the next training action (user, trainer, admin) → make milestones shareable with the community.

**The north-star question every surface must answer:** *what is the next best action?*
- **User/client:** what is my next best action, and where's my visible progress proof? (Home first, then Progress must be one reach away.)
- **Trainer:** which client needs intervention, what changed, what progress can I show, what's the low-friction plan adjustment?
- **Admin:** who trained, what changed, what's stale, what needs intervention, what can be celebrated/shared — proof-of-value before decoration.

**Trainer-indispensability doctrine (load-bearing for every surface):** clients get **read + do**, they **never decide**. Switching a client's active plan and editing `planData` are **trainer-only**. Design must never hand a client a decision that belongs to the trainer.

**Rule-62 strategy gate — every upgrade must strengthen at least one of:** coaching depth, adherence, progress proof, community belonging, revenue, or trust. If it strengthens none, cut it.

**Minimal-click / minimal-time law (Sean's standing mandate):** fewest clicks, least time, least typing. For every upgrade, state the before→after tap count for the primary action. Dictation-first where a trainer is on the floor.

**Data-truth rule:** charts and proof must come from **real logged data** (real workout logs, real pain entries, real macros). Mock/placeholder data is a gap to be replaced, never a feature.

---

## §1.5 — FABLE FINAL RULINGS — BINDING (Fable 5, 2026-07-17; not re-openable by Kimi)

> These come from the Final Decider's review of this packet (`FABLE-RULING-KIMI-PACKET-2026-07-17.md`). They are binding on every Kimi run and every builder task. Kimi is final on *design within* these rulings; the rulings are frame, not subject.

**R1 — Build base is `origin/main`, never the local branch (HIGHEST RISK).** The local working branch is ~756 commits behind `main`; a builder executing "to the letter" on it would regress ~700 commits of production (incl. the pain chart). **Every build task and every Kimi blueprint's FIRST acceptance criterion:** `branch base = origin/main`, verified by `git merge-base`. Standing builder instruction: start each surface with `git fetch && git checkout -b feat/<surface> origin/main`.

**R2 — Canonical data contract precedes build #1 (Opus task).** Before any blueprint executes, Opus appends to §2 a one-page canonical data contract — exact live shapes + write paths for `WorkoutSession`, `WorkoutPlan`, `ClientPainEntry`, `DailyMacroLog`, and `Session` deduction fields. Binding on every run. Inoculates against schema-drift (Rule 58) across the four loggers + three planners that share these models.

**R3 — Money-path is fail-closed.** Three revenue rails — session deduction (4.7), Stripe reconciliation (4.5), pro-gating (4.10). Any blueprint touching them carries acceptance criteria proving no double-deduct, no fail-open booking, no unreconciled order. A booking that errors must NEVER consume a session credit.

**R4 — Pain chart is CLOSED for redesign; it is NOT missing code.** Verified live in prod (assets 200, merge `c44755d6c` mounted everywhere). Both of Fable's client-side hypotheses were CHECKED and REFUTED by the real code: (1) onLoad-race — refuted, `BodyMapSVG` sets `.onload` before `.src` on a fresh `Image` (safe pattern); (2) service-worker pin — refuted, `frontend/public/spa-sw.js` is a cache-CLEARING self-destruct SW (deletes all caches on activate, passes fetches through, no caching). Residual suspects (direct-to-builder, §4.9): a genuinely stuck *pre-self-destruct* SW on Sean's specific browser (fix: DevTools → unregister SW + clear site data), OR the anatomy image rendering at 0.85 opacity over a 0.3 outline reading as "not that different" (a visual-quality improvement, not a deploy bug). Needs Sean's screenshot + exact URL/role to disambiguate. Do not re-litigate the current chart.

**R5 — Not everything goes through Kimi.**
- *Direct-to-builder NOW (mechanical, no design authorship):* pain-chart client-side fix chain (§4.9); nutrition client-ID picker (reuse Client Hub picker — a bug fix); `UniversalMasterSchedule.tsx` 1025L split + session-deduction fail-closed audit; dormant-file deletion proposals (grep + Sean approval, Rules 32-39).
- *Kimi merged runs:* 4.1+4.3 as ONE consolidation run (R6); 4.10 as a DELTA on the existing `KIMI-COACH-CC-REVIEW-2026-07-17.md` verdict (build on the Crystallize move; don't re-derive).
- *Kimi standard per-surface:* 4.2 → 4.6 → 4.9 (Phase E/F only) → 4.5 → 4.8 → 4.4 → post-split 4.7.

**R6 — 4.1+4.3 is ONE consolidation blueprint, not three parallel upgrades** (see §4.3 ruling).

**R7 — Build-priority order (FINAL):** 1) 4.2 Logger post-save handoff · 2) 4.7 Master Schedule (split + deduction audit) · 3) 4.10 Coach CC Crystallize delta · 4) 4.6 Client & Team · 5) 4.3(+4.1) Planner consolidation · 6) 4.9 Pain Phase E/F · 7) 4.5 Admin Overview · 8) 4.8 Nutrition · 9) 4.4 Bootcamp/Sprint · 10) Dormant deletion sweep. **Single highest-leverage first move: the 4.2 post-save handoff** (real log saved → instant Victory proof + next-best-action + share stub, zero extra taps — it turns the app's most-used moment into the product's thesis).

---

## §2 — SHARED BRAND + IMPLEMENTATION LAW (applies to EVERY surface — do not restate per surface, obey everywhere)

**Palette — Enchanted Apex: Crystalline Swan (dark-first).** Midnight Sapphire `#002060`, Royal Depth `#003080`, Ice Wing `#60C0F0` (glow/XP), Arctic Cyan `#50A0F0` (charts/data ONLY, never buttons), Gilded Fern `#C6A84B` (luxury gold — reserve for PRs/milestones/pro, NOT for warnings), Frost White `#E0ECF4` (text), Wing Purple `#8B5CF6` (glow accent), Obsidian `#0A0A0F`, Carbon `#141419`, Graphite `#1A1A24`.
- **RETIRED — reject on sight, including as `var()` fallbacks or `rgba()` channel literals:** Galaxy-Swan `#0a0a1a` / `#00FFFF` / `#7851A9`. Audit token *values*, not just names.
- **Dual-Button Glow:** blue bg → purple glow; purple bg → cyan glow.
- **Typography:** Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI/gaming). Numerals large + tabular for all fitness data — it's the cheapest luxury cue.

**Engineering law:**
- **styled-components only. NO Material-UI.** Transient props (`$active`), keyframes hoisted to module scope, no `styled()` in render, no inline `style=` escape hatch.
- **Colors:** `var(--token, #crystalline-fallback)` — zero standalone hex.
- **300-line file cap** — split into `*.tsx` / `*.styles.ts` / `*.logic.ts` / `*.types.ts` when approaching. Give the file layout in your build order.
- **44px min touch targets**; **WCAG 4.5:1** text contrast (enumerate approved color pairs with measured ratios for any risky pairing — gold ≥16px, wing-purple body text is the usual failure).
- **Charts = Victory only** (no Recharts, no hand-rolled SVG sparkline as a dodge).
- **Motion:** transform/opacity only, GPU-safe, `prefers-reduced-motion` gets a *designed* static state (not an amputated default).
- **Zero PII to LLMs**; **44px**; no nested interactives (`<button>` in `<a>`/`<button>`); one `<h1>` per view.
- **Lexicon law (compliance, not style):** "stretching"/"flexibility", NEVER "yoga"/"meditation". "26+ years experience", "NASM-protocol" — NEVER "NASM-certified". White-label per client type (a Move-Fitness client must never see SwanStudios branding, and vice-versa).
- **Responsive matrix you must design against:** 320 · 375 · 414 · 768 · 1024 · 1280 · 1440 · 1920 · 2560×1440 · 3840×2160. Hard-cap wide consoles (~1600px) with an intentional backdrop; never a 3840px chat bubble or 90ch prose measure.
- **Known 300-line-cap violators you may touch** (blueprints touching them MUST include a split layout, never assume compliance): `WorkoutLogger.tsx` 855, `UniversalMasterSchedule.tsx` 1025, `EnhancedTrainerDataManagement.tsx` 1347, `adminClientController.mjs` 1926, `aiChatService.mjs` 2342. Dormant heavies (`NASMAdminDashboard` 1132, `EnhancedAdminClientManagementView` 2445) are deletion candidates — never design against them.
- **White-label branding resolves through `frontend/src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerPlanPdfAdapter.ts`** (plan-PDF is the named bleed risk); client-type is set at `admin-clients/CreateClientModal.tsx`. Any PDF/share-image blueprint (4.3/4.4/4.8/4.11) must resolve branding there — a Move-Fitness client must never see SwanStudios branding, or vice-versa.

---

## §3 — THE OUTPUT CONTRACT (produce ALL of this, per surface)

For the one surface in scope, produce, in order:

- **(a) VERDICT** — one line: `SHIP` / `SHIP-WITH-CHANGES` / `SEND-BACK`, plus a one-paragraph why.
- **(b) CURRENT-STATE TRUTH CHECK** — confirm/deny the "current state" I claim in the §4 block; name what's actually good (credit the hard, unglamorous right calls) and what's template/generic/missing.
- **(c) GAP ANALYSIS vs the vision (§1)** — absence-first: what SHOULD exist for this surface to serve the Core Loop / next-best-action / Rule-62, ranked by value or money left on the table. Include the minimal-click before→after for the primary action.
- **(d) THE ONE SIGNATURE UPGRADE** — the single highest-impact, brand-specific move for this surface (your "Crystallize"-class idea). Specced in numbers, not vibes.
- **(e) MERMAID FLOWCHART** — the upgraded user flow AND data flow (```mermaid flowchart```). Show the real API endpoints from the §4 block as nodes.
- **(f) WIREFRAMES** — ASCII or inline-HTML wireframes for **375px (mobile)** and **1440px (desktop)**. Show hierarchy, the primary CTA placement, chrome budget, empty/loading/error states.
- **(g) FILE-BY-FILE BUILD ORDER** — the blueprint Opus executes with zero decisions:
  - exact file paths (respecting the 300-line cap + split layout),
  - exact component props / function signatures / TypeScript types,
  - exact copy strings (lexicon-compliant),
  - exact design tokens/values (type sizes with `clamp()`, spacing scale, the specific `var(--token, #hex)` pairs, motion timings/easings),
  - per-file **acceptance criteria** (executable: "renders X when Y; 375px transcript ≥ 50% viewport; tap count for primary action = N"),
  - explicit **"do NOT"** bans that would break the surface.
- **(h) MERMAID SEQUENCE / ER DIAGRAM** — wherever the upgrade creates or mutates data (```mermaid sequenceDiagram``` or ```erDiagram```), so the backend contract is unambiguous.
- **(i) COMPETITOR OUT-BUILD** — what a well-funded rival ships here that beats the upgrade, and how to pre-empt it.

Diagrams are **mandatory**, not optional. A surface block with no Mermaid and no wireframe is incomplete — send it back to yourself.

---

## §4 — THE SURFACES (grounded on `origin/main`; line counts ≈, paths exact)

> Note on staleness: the local working branch (`wip/comms-notifications`) is ~700 commits behind `main`; all anchors below are read from `origin/main` (the deploy branch). Dormant/legacy files are flagged so you don't design against dead code.

### 4.1 — WORKOUT BUILDER (AI single-workout + long-horizon plan generator)
- **Canonical:** `frontend/src/components/WorkoutBuilder/WorkoutBuilderPage.tsx` (~240) + `WorkoutBuilderContextPanel/ControlsPanel/InsightsPanel/Results/PlanModeFields` + `WorkoutBuilderPage.logic.ts`, `WorkoutBuilderSavePlan.logic.ts`. Hook: `frontend/src/hooks/useWorkoutBuilderAPI.ts`.
- **Mount:** `frontend/src/routes/main-routes.tsx` `path:'workout-builder'` → `<WorkoutBuilder/>`, trainer/admin only. (Not in the dashboard route table — discoverability depends on the Planner, 4.3.)
- **API:** `GET /api/client-intelligence/:clientId`, `POST /api/workout-builder/generate`, `POST /api/workout-builder/plan`, `POST /api/workout-plans`, `PUT /api/workout-plans/:id/activate`.
- **Backend:** `workoutBuilderRoutes.mjs`, `clientIntelligenceRoutes.mjs`, `workoutPlanRoutes.mjs` → `workoutBuilderService.mjs`. **Models:** `WorkoutPlan`, `WorkoutPlanDay`, `WorkoutPlanDayExercise`, `LongTermProgramPlan`, `ProgramMesocycleBlock`.
- **Current state:** working, real data; auth + rate-limit + a client-self-gen kill-switch (`ENABLE_CLIENT_PLAN_SELFGEN`). Pulls live client context (pain, equipment, history).
- **Gaps vs vision:** lives outside the dashboard shell (discoverability); it is ONE of THREE UIs (with 4.3A + 4.3B) over the SAME `/api/workout-builder/*` + `/api/workout-plans` backend — the redundancy is a coherence risk. Trainer-indispensability: confirm the self-gen path can never let a client activate/switch their own plan.

### 4.2 — WORKOUT LOGGER (log completed sessions; sets/reps; the Core-Loop entry point)
- **Canonical (client):** `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` (~855 on main) + ~140 support files (NASM rolodex, rest timer, ghost pre-fill, voice memo, offline queue, corrective panel).
- **Role variants (real, not dupes):** trainer `TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.view.tsx`; admin `WorkoutLogger/AdminPersonalWorkoutLogger.tsx`; admin-client drawer `admin-clients/components/WorkoutLoggerModal.tsx`.
- **Mounts:** client `/log-workout`, trainer `/log-workout`, admin `/log-my-workout` (admin `/log-workout` redirects into the Client Hub logger).
- **API:** `/api/workout-forms/{my|client/:id}/info`, `POST /api/workout-summaries`, `GET /api/workouts/:clientId/current`, `/api/exercises/{library,search}`, ghost `/api/admin/clients/:id/workouts?limit=`, voice `POST /api/workout-logs/upload`, correctives `POST /api/workout-builder/corrective-recommendations`.
- **Backend:** `workoutSummaryRoutes`, `dailyWorkoutFormRoutes`, `clientWorkoutRoutes`, `workoutLogUploadRoutes`, `adminWorkoutLoggerRoutes` → `workoutSessionController`, `adminWorkoutLoggerController`. **Models:** `WorkoutSession`, `WorkoutLog`, `WorkoutExercise`, `DailyWorkoutForm`, `Session`.
- **Current state:** the most complete surface — voice import, offline queue, rest timer, ghost prefill, NASM rolodex, PDF, challenge receipts; heavy test coverage; real data.
- **Gaps vs vision:** FOUR role-specific loggers risk drift (client one is far richer than trainer/admin/modal). This is THE Core-Loop entry — the primary action ("log this set") tap-count and the save→chart→next-action handoff must be ruthless. Does a saved log immediately produce visible progress proof and a next-best-action?
- **⚑ FABLE RULING (binding) — this is BUILD #1; its signature is PRE-ASSIGNED: the POST-SAVE HANDOFF.** The moment after `POST /api/workout-summaries` succeeds must render, in one screen with zero extra taps: (1) a **Victory** chart proving progress from the just-saved real data, (2) a **next-best-action** card, (3) a **share-affordance stub** (§5 item 5). Also deliver: (a) `WorkoutLogger.tsx` is 855L — the blueprint MUST include its split (`WorkoutLoggerCore` engine + `*.styles.ts`/`*.logic.ts`/`*.types.ts` + role-shell adapters for client/trainer/admin/modal, each ≤300); (b) a **logger parity matrix** — every capability (voice, offline queue, ghost prefill, rest timer, NASM rolodex, correctives) × the four role variants, ruled so capabilities live in the core and shells only gate/skin. State before→after tap counts for "log this set" and "save session → see proof."

### 4.3 — WORKOUT PLANNER(S) (programming surface)
- **A. Canonical (dashboard):** `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx` (~298) + ~120 support files (builder panel, rolodex, guided candidates, saved-plan vault, long-horizon schedule, teach mode, PDF). Mounted admin + trainer `/workout-planner`. Most feature-complete planning surface; front-end to 4.1's backend.
- **B. Client-drawer wizard:** `frontend/src/components/WorkoutManagement/WorkoutPlanBuilder.tsx` (~220) + steps; mounted via `workspaces/WorkoutOutletWrapper.tsx`. Overlaps 4.3A (both save `/api/workout-plans`).
- **C. Legacy (active but old):** `frontend/src/pages/workout/components/WorkoutPlanner.tsx` (~298) via `pages/workout/WorkoutDashboard.tsx`, `main-routes` `path:'workout'`. Uses legacy `/api/workout/plans` alias.
- **API:** `/api/workout-builder/{generate,plan,candidates}`, `/api/workout-plans` (+`/activate`,`/primary`,`/duplicate`,`/pdf/upload`), `GET /api/workout/plans?clientId=`, `GET /api/exercises/:id/teach-mode`.
- **☠ DORMANT cleanup candidates (design AROUND, propose deletion):** `frontend/src/components/Admin/WorkoutPlanBuilder.tsx` (628, no importer, negative-assertion tests confirm unmounted); `frontend/src/pages/workout/components/WorkoutPlanner/WorkoutPlanner.tsx` (118, no importer).
- **Gaps vs vision:** three live planners + two dead ones over one backend = the clearest coherence/consolidation target. Trainer-indispensability: the plan-switch/`planData`-edit must be trainer-gated across ALL three.
- **⚑ FABLE RULING (binding) — this is a CONSOLIDATION blueprint, not three upgrades, and it INCLUDES 4.1.** Canonical = 4.3A (`admin-workout-planner`). 4.3B becomes a thin client-drawer shell over 4.3A's panels (shared components, zero duplicated save logic). 4.3C is deprecated: blueprint a propose-only deletion (Rules 32-39 grep + Sean approval) + an adapter redirecting `/api/workout/plans` reads onto `/api/workout-plans` until removal. **4.1 Workout Builder is IN SCOPE OF THIS SAME RUN** — it's the generation front-end to the same backend; decide whether it folds into 4.3A as a mode or stays a route sharing 4.3A's components. ONE backend contract, one save path, one activate path, trainer-gated everywhere. Deliver ONE blueprint covering 4.1 + 4.3A + 4.3B + 4.3C disposition. The two dead files stay dead — never design against them.

### 4.4 — BOOT CAMP CREATOR (group-class builder) + SPRINT PLANNER (3-month programming)
- **A. Canonical:** `frontend/src/components/BootcampBuilder/BootcampBuilderPage.tsx` (~299) + ~60 support files (`BootcampCommandDeck`, `BootcampDemoMode`, `BootcampFloorPresentation`, `ClassPreviewPanel`, `ExerciseRolodexPanel`, PDF, video). Mounted admin + trainer `/bootcamp`; also standalone `/bootcamp-builder` (redundant mount).
- **B. Sprint Planner:** `frontend/src/components/SprintPlanner/SprintPlannerPage.tsx` (~268) + `BootcampCalendar.tsx`, `CreateSprintModal`, `SlotDetailPanel`. Mounted admin + trainer `/sprint-planner`. **SSE streaming generation.**
- **API:** `POST /api/bootcamp/{generate,save,log}`, `GET /api/bootcamp/{templates,history,trends}`, `GET|POST /api/bootcamp/spaces`; sprints `POST|GET /api/bootcamp/sprints`, `…/:id/generate/stream` (SSE), `…/slots/:id/{confirm,regenerate}`.
- **Backend:** `bootcampRoutes.mjs`, `sprintRoutes.mjs` → `bootcampService.mjs`, `backend/services/bootcamp/*` (incl. `bootcampPainAlerts.mjs` — see 4.9). **Models:** `BootcampTemplate`, `BootcampClassLog`, `BootcampStation`, `BootcampSpaceProfile`, `BootcampSprint`, `SprintClassSlot`.
- **Design brief on record:** `docs/ai-workflow/blueprints/BOOTCAMP-SPRINT-PLANNER-AND-PAIN-CHART-UPGRADE-PLAN.md` — the sprint memory (cross-sprint exercise exclusion), progression strategies (linear/undulating/block/random), deload cadence, and the day-by-day calendar are the intended shape. Read it; then decide if it's right.
- **Current state:** polished, real data, AI generation + floor demo mode + templates + history + trends + SSE sprint generation.
- **Gaps vs vision:** the calendar/"was this taught?" confirmation loop and the exercise-memory anti-staleness engine are the differentiators — verify they're complete and low-tap on the gym floor. Mobile month-view at 375px is a known UX risk (tiny day cells).

### 4.5 — ADMIN "HOUSE OVERVIEW" (proof-of-value command center)
- **Canonical:** `frontend/src/components/DashBoard/Pages/admin-dashboard/admin-dashboard-view.tsx` (~52, thin shell → `RevolutionaryAdminDashboard`) → `overview/AdminOverviewPanel.tsx` (~293, bento grid ~25 widgets) + `AdminOverviewMetrics.tsx`, `AdminOverviewData.ts`, ~40 widgets under `admin-dashboard/components/`.
- **Mount:** `/overview` (URL `/dashboard/admin/overview`). ⚠ **Admin's DEFAULT landing is `/coach-assistant`, NOT `/overview`** — the overview isn't the first thing admin sees.
- **API:** `/api/admin/analytics/statistics/{revenue,users,workouts,system-health}` (real `Order.sum/findAll` aggregations, prev-period change %, Stripe reconciliation), `Promise.allSettled` with per-metric graceful fallback.
- **Backend:** `admin/analyticsRevenueRoutes.mjs`, `analyticsUserRoutes.mjs`, `analyticsSystemRoutes.mjs`, `adminDashboardMetricsController.mjs`. **Models:** `Order`, `OrderItem`, `User`, `SessionPackage`, `StorefrontItem`.
- **☠ DORMANT:** `workspaces/DashboardWorkspace.tsx` (orphan `/dashboard/home`); `Admin/NASM/NASMAdminDashboard.tsx` (1132, unrouted).
- **Gaps vs vision:** admin needs "who trained / what changed / what's stale / what needs intervention / what to celebrate" BEFORE decorative widgets — is the bento ranked by proof-of-value and next-best-action, or is it a metric wall? Some change-% is stubbed (`conversion:0`). Should the overview be the landing, or is coach-first correct?

### 4.6 — CLIENT & TEAM (management)
- **Clients (canonical):** `frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx` (~299, "Client Hub") + `.view.tsx`/`.data.ts`/`.logic.ts`/`Tabs.tsx`; detail module `workspaces/clients-team/` (~90 files) — `ClientDetailView.tsx` (~222) + tabs (Overview/Training/Progress/**Nutrition**/**Biometrics**(=pain chart)/Settings).
- **Team/trainers (SEPARATE route):** `admin-trainers/EnhancedTrainerDataManagement.tsx` (1347).
- **Mount:** `/client-management` (+ `/view-as/:userId` impersonation), `/trainer-management`.
- **API:** `GET /api/admin/clients`, `GET /api/admin/clients/:id`, nutrition tab `/api/macros/client-timeline` (+`/verify`). **Controller:** `adminClientController.mjs` (1926). **Models:** `User` (role client/trainer), `Session`, `WorkoutSession`, `ClientTrainerAssignment`.
- **☠ DORMANT debris (heavy):** `admin-clients/EnhancedAdminClientManagementView.tsx` (2445, superseded per redirect test); `AdminClientManagementView.tsx` (1427, self-labeled "V1 — POSSIBLY DEAD"); `ClientManagementDashboard.tsx` (187); `AdminClientsSummary.tsx` (475); `TrainersManagementSection.tsx` (185, `/trainer-management-legacy`).
- **Gaps vs vision:** Sean thinks of this as one "client and team tab" but it's **two separate routes** — decide whether to unify. The Client Hub is the canonical client record (the wedge) — its card language must preserve all useful data without duplicating facts, be 44px-touch, and work at phone width (house Card Standard). Next-best-action ("client #id is stale / missed top set → adjust") should live here.

### 4.7 — UNIVERSAL MASTER SCHEDULE
- **Canonical:** `frontend/src/components/UniversalMasterSchedule/UniversalMasterSchedule.tsx` (~1025) via role-gate `Schedule/UniversalSchedule.tsx` (~68); sub-components `components/{ScheduleCalendar,ScheduleHeader,ScheduleStats,ScheduleModals,BookingDrawer}`, hook `useCalendarData`, Redux `scheduleSlice`. Drag-drop, stats, AI operator dock, density controls, payment modal (`ApplyPaymentModal.*`).
- **Mount:** admin `/master-schedule`, trainer `/schedule`, client `/schedule`.
- **API (`services/universal-master-schedule-service.ts`, ~716):** `/api/sessions` CRUD + `…/book`, `…/cancel|confirm|complete|assign`, `…/stats`, `…/users/{trainers,clients}`, `…/check-conflicts`, `…/:id/reschedule`, `…/health`; `POST /api/schedule-ai/proposals`.
- **Backend:** `sessionsRoutes`, `sessionDeductionRoutes`, `scheduleRoutes`, `scheduleAiRoutes` → `sessionController`, `scheduleController`, `sessionSyncController`. **Models:** `Session`, `SessionPackage`, `SessionType`.
- **☠ DORMANT:** `Schedule/{ScheduleContainer,ScheduleWrapper,EnhancedScheduleWrapper,index}.tsx` (legacy compat shims per `Schedule/README.md`).
- **Gaps vs vision:** 1025-line monolith (maintenance/perf risk — likely violates the 300-line cap; propose a split in the build order). Session-deduction correctness is money-path — flag any place a booking could double-deduct or fail-open. Low-tap booking on mobile is the trainer-floor concern.

### 4.8 — NUTRITION
- **A. Logging workspace:** `frontend/src/components/DashBoard/workspaces/NutritionWorkspace.tsx` (~286) + tabs (`NutritionTodayPanel`, `NutritionHydrationTab`, `NutritionLearnTab`, capture). Mount `/meal-planner`. API `/api/macros` (`?date=`, `POST`, `/weekly`, `/summary`, `/client-timeline`).
- **B. Plan builder:** `frontend/src/components/Admin/NutritionPlanBuilder.tsx` (~193) + `.sections/.logic/.styles/.types`; hook `useNutritionPlan`. Mount `/nutrition/:clientId?`. API `POST /api/nutrition/:clientId`.
- **Also:** per-client `clients-team/tabs/NutritionTabContent.tsx` (with verify action); roster triage `ClientNutritionRosterTriagePanel`, estimate review `ClientNutritionEstimateReviewPanel`. Chart: `Charts/charts/radar/NutritionBalanceRadar.tsx`.
- **Backend:** `dailyMacroRoutes.mjs` (+ roster triage), `clientNutritionRoutes.mjs`. **Models:** `DailyMacroLog`, `DailyHydration`, `ClientNutritionPlan`.
- **☠ DORMANT:** `NutritionPlanning/NutritionPlanning.tsx` (899, retired per mcp-retirement contract test).
- **Gaps vs vision:** TWO entry points (logging `/meal-planner` vs authoring `/nutrition/:clientId`) with no unified surface. **`NutritionPlanBuilder` selects the client via a raw numeric ID input — no picker** (a direct minimal-click / UX violation to fix). Sensitive-data posture: nutrition is consented, exportable, deletable by design. Trainer-indispensability: client logs macros (do) but the trainer authors the plan (decide).

### 4.9 — PAIN CHARTS (the "did the upgrade ship?" surface — READ 4.9-NOTE FIRST)
- **Canonical (the UPGRADE, already on main):** `frontend/src/components/BodyMap/index.tsx` (~398) orchestrates `BodyMapSVG.tsx` (~762, gender selector + muscle/bone label modes + realistic anatomy image layer `/anatomy/{gender}-{view}.png` from Imagen 4.0, SVG outline as fallback), `BodyMapToolbar`, `PainEntryPanel` (~708 log/edit/resolve), and **`PainChartInsightPanel.tsx`** (~328 — risk badge, metric grid, safety alerts, workout constraints, Active/Resolved/Timeline tabs) → **`PainChartTrendFollowUp.tsx`** (~104 — **Victory** severity-trend chart from real history). Engine: `painChartInsights.ts` (~300, pure logic from real `PainEntry[]`). Anatomy assets committed at `frontend/public/anatomy/{male,female}-{front,back}.png`.
- **Mount:** `/body-map` for all three roles (client "Pain Charts", trainer "Client Pain Charts", admin "Pain & Injury Chart"); also rendered in `ClientBodyMapModal`, `MeasurementEntry`, `BiometricsTabContent`.
- **API:** `/api/pain-entries/:userId` (+`/active`, `POST`, `PUT`, `/resolve`, `DELETE`). **Backend:** `painEntryRoutes.mjs` → `painEntryController.mjs` (388). **Models:** `ClientPainEntry` (135), `PainEntryCorrectiveExercise`. **AI integ:** `painWriteService`, `painFollowUpService`, `painDispatchers`, `injuryRiskReadModel`, `bootcamp/bootcampPainAlerts.mjs` (**untracked/uncommitted — flag**).
- **⚠ 4.9-NOTE (truth for Kimi):** the anatomical upgrade is **already merged to `main` (merge `c44755d6c`, 2026-07-05) and mounted** — it is NOT a dormant unshipped upgrade. If production shows the "old" simple chart, the cause is a stale Render deploy or an `/anatomy/*.png` 404 → SVG fallback, NOT missing code. Sean is verifying prod. **Review `main`'s BodyMap, not the stale local branch.** Your job here is the NEXT upgrade tier (Phase E dashboard integration completeness + Phase F pain→workout generation), per the blueprint in 4.4's linked doc.
- **Gaps vs vision:** Phase F — is active pain actually injected into workout/bootcamp generation and does it exclude/flag contraindicated exercises? Is the client sidebar entry present and one-tap? Does pain feed the coach's next-best-action?
- **⚑ FABLE RULING (binding) — the current chart is CLOSED; do NOT re-design it.** Your scope is exclusively **Phase E** (dashboard integration completeness: one-tap client sidebar entry, pain feeding trainer next-best-action) and **Phase F** (active pain injected into `POST /api/workout-builder/generate` and `POST /api/bootcamp/generate`, with contraindicated-exercise exclusion + flagging). Grounded truth: `bootcampPainAlerts.mjs` is imported by NOTHING on `main` and its `.mjs` is not committed → Phase-F bootcamp pain alerting is **UNBUILT** (a genuine gap to design), not a broken import. The "prod looks old" concern is client-side and assigned direct-to-builder — NOT your scope (both onLoad-race and SW-pin hypotheses were checked and REFUTED against the real code: the SW is a cache-clearing self-destruct; residual = stuck old SW on device or the 0.85/0.3 image-layering perception, pending Sean's screenshot). Design Phase E/F only.

### 4.10 — "DEALS" COACH BRAIN / COACH COMMAND CENTER (the proposal-response brain)
- **Canonical:** `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx` (~293, Talk/Review/History tabs + ops rail + client bar + console dock) + `CoachCommandCenter.controller.ts` (~288) + ~350 files. Proposal UI: `CoachActionProposalCard.tsx` (~296), `CoachActionProposalSplitPlanPanel`, `CoachProposalGateRail`, `CoachCommandCenterReviewPanel`. Services: `coachIntakeService.ts` (~204), `coachProposalService.ts` (~149).
- **Mount:** `/coach-assistant` — **admin's default landing**; also trainer + client. `/plaud` folds into `?workspace=plaud`.
- **API:** chat `POST /api/ai-chat/conversations(/:id/messages)`, `/transcribe`, `/tts`; command `POST /api/ai-command/execute`; intake `/api/coach/intake/*`; **proposals ("deal response") `GET /api/coach/proposals/:id`, `POST …/approve`, `…/clarification-answer`, `…/reject`**.
- **Backend brain:** `aiChatRoutes.mjs` (message handler → `createCoachActionProposalsFromAiResponse()` → returns `coachActionProposals`/`frontendActions`), `coachProposalRoutes.mjs` ("Deterministic approval API"), `coachActionProposalService.mjs` (297), `coachActionProposalClassifier.mjs` (302), `coachActionProposalApprovalService.mjs` (264), `aiChatService.mjs` (2342), `swanCoachCortexService.mjs` (286). Intake `coach_intake_items` (encrypted, retention-policied). PLAUD models.
- **Current state:** the deepest surface. Architecture = **review-gated proposal pipeline**: the coach AI NEVER writes directly; it emits structured action proposals (workout_log, nutrition_log, split_plan, profile-coverage…) a human approves/rejects/clarifies. This is the trainer-indispensability doctrine in code — respect it.
- **Prior Kimi verdict (KIMI-COACH-CC-REVIEW-2026-07-17.md):** SHIP-WITH-CHANGES — integrity engineering is elite; visual language is "2024 AI-chat starter kit", tab IA redundant, mobile chrome budget blown. THE ONE change was **The Crystallize** (executed command → faceted crystalline record artifact, not a text reply). Build on that verdict; don't re-derive it.
- **Gaps vs vision:** ~350-file fragmentation (ownership risk); retention purge is dry-run-only; pro-gated message send. The "deal/proposal response" UX (how a trainer dispositions a proposal in the fewest taps) is the money surface — make it ruthless and proactive (surface the next action before it's asked).
- **⚑ FABLE RULING (binding) — run as a DELTA on the existing `KIMI-COACH-CC-REVIEW-2026-07-17.md` verdict; build on your prior "Crystallize" signature move, do NOT re-derive it.** The retention purge actually going live (with an audit log of purged `coach_intake_items` counts, IDs only) is a **mandatory acceptance criterion** of this blueprint, not an optional gap — "encrypted, retention-policied" intake that never purges is a compliance claim the product isn't keeping.

---

### 4.11 — CLIENT HOME / PROGRESS (the client half of the Core Loop — added per Fable ruling)
- **Canonical:** `frontend/src/components/UserDashboard/UserDashboard.V3.tsx` mounted at `/user-dashboard` (main-routes.tsx:283-284, URL-driven tabs) + `components/ClientDashboardHomeTab.tsx`, `HomeTab.tsx`, `SocialProgressAnalyticsPreview.tsx`. (The export pack under `frontend/src/assets/user-dashboard/dashboard-export/` is REFERENCE ONLY — not the live mount.)
- **Why it matters:** §1 declares "Home first, then Progress one reach away" as the client north star. This surface CLOSES the Core Loop for the client — charts/progress proof + next-best-action + the community-share terminal step. Every trainer/admin surface produces data this one must reflect back to the client.
- **Gaps vs vision:** is Progress one reach from Home? Does the just-logged workout surface here as visible proof (data-truth from real logs, Victory only)? Is the community-share step present anywhere? Trainer-indispensability: client sees read+do, NEVER a plan-decision affordance.
- **Kimi scope:** the client Home/Progress IA + progress-proof + next-best-action + share surfaces. It CONSUMES the 4.2 post-save handoff contract — do not re-invent it.

### 4.12 — STOREFRONT / CHECKOUT (the money surface — added per Fable ruling)
- **Canonical:** store `frontend/src/components/DashBoard/workspaces/StoreWorkspace.tsx` + `Pages/store-shared/StoreDesignSystem.*`; checkout `frontend/src/components/NewCheckout/CheckoutView.tsx` (main-routes.tsx:160) + `Checkout/methods/{ACHPayment,VenmoPayment,ZellePayment,CheckPayment}.tsx`, `OrderSummaryComponent`, `PriceMismatchModal`, `PaymentFeeCalculator`. Store routes `/store`, `/swanstudios-store`.
- **☠ DORMANT legacy store routes (design AROUND, propose cleanup):** `/store-original`, `/store-galaxy-api`, `/store-simple`, `/galaxy-store` (main-routes.tsx:530-544) — "galaxy" naming ties to the RETIRED theme; verify none render retired palette.
- **Backend/models:** `Order`, `OrderItem`, `StorefrontItem`, `SessionPackage`, Stripe reconciliation (same models 4.5 aggregates). **Prices are law:** $175/hr, $110/30min; 3mo $8,400 / 6mo $16,800 / 12mo $33,600.
- **Why it matters:** revenue enters here — the largest "value left on the table." Money-path is fail-closed (§1.5 R3): no price mismatch that lets a wrong amount through, no double-charge, no order left unreconciled.
- **Gaps vs vision:** checkout conversion (copy-tournament territory); `PriceMismatchModal` correctness; the ascension path (single → package) low-tap. Credentials/lexicon law applies to ALL store copy.

---

## §5 — CROSS-CUTTING ENHANCEMENT THEMES (gaps that span surfaces — the "what Sean may have missed" layer)

Weigh these when you rank and design; several are worth more than any single-surface polish:

1. **Next-best-action is the north star but is under-surfaced everywhere.** Every one of the four dashboards should answer "what's the next action" without hunting. Propose where a next-best-action card belongs on each surface (client Home, trainer Client Hub, admin Overview, coach console).
2. **The Core-Loop handoff is the product.** log → save → chart → next-action → share. Trace it end-to-end across 4.2 (logger) → progress charts → 4.6 (client record) → 4.10 (coach) → community share. Where does the chain break or add clicks?
3. **Proactive > reactive coach.** Your own coach-CC review: the winning tool tells the trainer the next move before they ask. Where should proactive cards fire (missed top set, stale client, pain flag, PR)?
4. **Data-truth audit.** Confirm each chart/proof is real logged data, not mock. Pain chart already is (Victory + real entries) — hold every other surface to that bar.
5. **Shareable milestone artifacts (acquisition, ~$0/use).** A Crystallize record → exportable, watermarked-free / trainer-branded-pro share image. Closes the loop's weakest link (proof → shareable) and creates a pro upsell. Where does it plug in?
6. **Consolidation debt is real risk.** 3 planners + 5 dead workout/nutrition/client files + 2 nutrition entry points + separate client/team routes. Rank what to unify vs delete (deletion is propose-only, needs grep + Sean's approval — Rules 32–39).
7. **Minimal-click violations to fix now:** nutrition client-ID raw input (no picker); any hover-only action on a client/data card; any multi-tap primary action on the gym floor.
8. **One canonical client record.** Workout builder/planner/logger/pain/nutrition/coach all touch the same client — verify they read/write ONE record, not divergent shapes (schema-drift is a known recurring bug class here — Rule 58).
9. **White-label integrity.** Move-Fitness vs SwanStudios branding must never bleed across client types on any shared surface (plan PDFs especially) — anchor: `workoutPlannerPlanPdfAdapter.ts`.
10. **Money-path integrity (fail-closed).** Three revenue rails — session deduction (4.7), Stripe reconciliation (4.5/4.12), pro-gating (4.10). Any blueprint touching them carries acceptance criteria proving no double-deduct, no fail-open booking, no unreconciled order. A booking that errors must never consume a session credit.
11. **Interim client next-best-action owner.** Until 4.11 Client Home is built, the logger post-save screen (4.2) is the canonical home of the client's next-best-action. Do not scatter it.
12. **Leave seams for the deferred surfaces.** 4.11 (Client Home/Progress) and 4.12 (Storefront/Checkout) are now grounded above; earlier surfaces must leave the share-affordance stub + next-best-action card contract these plug into — do not contradict them.

---

## §6 — YOUR RANKING ASK (you decide the order — you are final)

After the per-surface blueprints, produce a **master prioritization**: rank all ten surfaces by *value or money or risk left on the table* (not by ease), give the recommended build order, and name the single highest-leverage move across the whole set. If two are tied, name both and say what would break the tie. This ranking is **your call** — Opus and Sean sequence from it.

---

## §7 — KILL-CHECK (run LAST, before you output — recency is where models obey)

- ONE surface per run — did you scope to it and refuse to blend surfaces?
- VERDICT on line 1?
- Did you make EVERY decision (type sizes, tokens, copy, props, file layout, acceptance criteria) — zero left to the builder?
- Mermaid flowchart present? Wireframes for 375 + 1440 present? Sequence/ER diagram present wherever data mutates?
- Palette: zero retired Galaxy-Swan (`#0a0a1a/#00FFFF/#7851A9`) anywhere, including `rgba()` channels and `var()` fallbacks? Dual-Button Glow honored? Charts Victory-only?
- Lexicon: "stretching/flexibility" (never yoga/meditation); "26+ years / NASM-protocol" (never NASM-certified)? White-label respected?
- Trainer-indispensability: no upgrade hands a client a decision that belongs to the trainer (plan switch / `planData` edit stay trainer-only)?
- Did every proposed feature strengthen coaching / adherence / progress-proof / community / revenue / trust (Rule 62)? Cut the ones that don't.
- Minimal-click: did you state before→after tap count for each primary action?
- Does every file you create OR modify end ≤300 lines, with the split layout specified where you exceed it?
- Did you obey every §1.5 Fable ruling without re-opening it, and set `branch base = origin/main` as acceptance criterion #1 (R1)?

**Produce the surface's build package now.**
