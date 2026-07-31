---
decision: "Consult brief — Plan Surfacing master plan: Planner→Logger pull-next-workout + Schedule×Plan day preview (Sean 2026-07-31)"
status: open
supersedes: none
---

# PLAN SURFACING — CONSULT BRIEF (Kimi K3 + Opus 5), 2026-07-31

## 0. Sean's asks (owner, verbatim intent)
1. **Planner→Logger:** "When we create workouts in the Workout Planner, the logger should pull the NEXT
   workout on the plan every time I open it — plug it in, and I just edit exercises if I want. This needs
   to be comprehensive. Tell me what we have and whether it needs upgrading."
2. **Schedule×Plan:** "Tie the plan to the schedule. When a person looks at the schedule and clicks the day
   they're working out, they should be able to see the plan itself from the schedule section. Look at the
   schedule section, upgrade it, enhance it."

## 1. Verified ground truth — the plan spine (file:line receipts held in session)
- **Planner (canonical):** `admin-workout-planner/` builds `planData` (`planDataBuilder.ts:60`) →
  `POST/PUT /api/workout-plans` → `WorkoutPlan` row (JSONB `planData { weeks[] → days[] → exercises[] }`,
  cursor columns `currentWeek`/`currentDay`, revision-aware mutation boundary `contentRevision`/`contentHash`).
  New plans are `draft` until explicitly activated; ONE `status:'active'` plan per client is the read target.
- **Logger pull path EXISTS and works mechanically:** `GET /api/workouts/:clientId/current`
  (`clientWorkoutRoutes.mjs:61-197`) → `extractCurrentSession(plan)` (`workoutPlanShapeService.mjs:147`,
  cursor-derived, NOT calendar-derived) → three-tier materializer in `WorkoutLogger.loadTodaysPlan.ts`
  (cursor session → todayAssignment → weekday-name match) → `plannedExerciseToEntry` maps sets/reps/weight/
  tempo/rest/notes into normal editable logger rows. Submit carries `body.plannedAssignment`; on verified
  save, `advancePlanAfterPlannedAssignmentLog` (`clientTrainingPlanProgressService.mjs:187-267`) locks the
  plan row, requires cursor match, stamps the day completed, advances week/day, writes through the revision
  boundary, and creates an immutable `WorkoutPlanCompletionReceipt`. "Today's assignment" already MEANS
  "next unfinished plan day" (`buildTodayAssignment` derives from cursor, stamps today's date on).
- **THE DEADLOCK (the single blocking defect for Sean's use):** the planner stamps every training day
  `assignmentType: 'trainer_session'` (`workoutPlanAssignmentSemantics.ts:10-14,55-57`) and THREE guards
  reject that type without a linked scheduled session:
  `clientTrainingReadModelService.mjs:212-215` (`isLoggable=false` → "Load Today's Plan" toasts and loads
  NOTHING), `clientTrainingAssignmentPickerService.mjs:123` (`canSubmitPlannedAssignment=false` → loads as
  a THROWAWAY DRAFT), `workoutLoggerSubmitPayload.ts:151-154` (drops `plannedAssignment` from the save
  body → **the cursor NEVER advances — the plan is frozen at week 1 day 1 forever**).
  [HYPOTHESIS, flagged for Sean] the `trainer_session` default exists to force trainer-led work through the
  scheduled-session flow for session-credit BILLING integrity (`billingIntent: 'trainer_led_scheduled_flow'`,
  `shouldDeductSession`); plan-cursor advancement is collateral damage. **Advancement and billing must be
  DECOUPLED, not naively unlocked** — loosening the guards wrongly risks double-deducting or silently-free
  sessions.
- **Other gaps:** no auto-load on logger open (only a `?loadPlan=today` deep link or an explicit click);
  prefill APPENDS (`setExercises(prev => [...prev, ...])` — auto-load would duplicate rows; needs
  replace-or-merge); ContextBar plan chip + PlanContextSheet are display-only ("context now, control
  later" is in the file header); no purpose-built "next workout" endpoint (only `/current`); cursor
  advance requires exact week/day match (no log-ahead/skip path).
- **Logger↔Schedule link that already exists:** the logger accepts `scheduledSessionId` (route state), and
  save with a linked scheduled session is ALLOWED to advance (`allowScheduledTrainerSession`).

## 2. Schedule surface — verified map (Explore trace, file:line receipts held)
**Canonical:** ONE engine serves all roles — `UniversalMasterSchedule.tsx` (1073 lines — already 3.5× the
300 cap; do NOT add there). Mounted admin `/dashboard/admin/master-schedule`, trainer
`/dashboard/trainer/schedule`, client `/dashboard/client/schedule`, plus protected `/schedule`
(`UniversalDashboardLayout.routes.tsx:132,198,224`; `main-routes.tsx:951-961`). Client body =
`ClientTimeline`; admin/trainer = `ScheduleDayStrip` + `ScheduleCalendar` (`:860-895`). Various
`*ScheduleTab` wrappers + `UnifiedCalendar` aliases are orphaned/legacy.
**Session click:** `handleSelectSession` (`UniversalMasterSchedule.tsx:720-723`) → `SessionDetailModal.tsx`
(293 lines, composition shell) + `SessionDetailBodyPanels.tsx` (295 lines — AT the cap): no-show → series →
command panel → `SessionDetailInfoGrid` (date/time/duration/status/attendance/location/contact/credits) →
package summary → billing → notes → feedback. **Zero workout/plan content in the modal today.**
**Day click:** `drillDownToDay` (`useSchedule.ts:43-46`) just flips to day view — **no day-detail surface
exists at all.**
**Session model** (`backend/models/Session.mjs`): sessionDate/duration/userId(nullable!)/trainerId/
location/status/attendance/cancellation/billing fields (`sessionDeducted`, `creditsDeducted`) —
**no FK to WorkoutPlan.** `clientName` exists for manual sessions with NO linked user.
**⭐ ALREADY SHIPPED plan↔schedule layer (build ON this, don't duplicate it):**
`TrainingPlanProjectionLayer` mounts unconditionally in the canonical schedule
(`UniversalMasterSchedule.tsx:847-859`) — a read-only "Planned Training" overlay grouped by date: client,
plan title, `W{week}·D{day}`, focus, assignment type, **exercise preview capped at 3 names**, and an
"Appointment also scheduled" coexistence chip (`clientId:date` key). Served by
`GET /api/training-plan-projections` (`trainingPlanProjectionRoutes.mjs:27`, service reads WorkoutPlan
planData/cursor/revision + completion receipts). Feature flags are `true` in render.yaml (LIVE in prod).
**Architectural firewall (deliberate, header-documented):** projections NEVER import/mutate Session,
billing, credits, or packages; projections and Sessions are parallel lists that only annotate each other
via coexistence keys. The frontend normalizer **hard-rejects** unknown/appointment-shaped fields and >3
preview exercises (`training-plan-projection-service.ts:70-136`) — expanding to a full exercise list
requires changing backend contract + frontend allowlist IN LOCKSTEP or the whole layer fails closed.
**Auth scoping already correct in that service (inherit it):** client forced to self (403 otherwise);
trainer all-or-nothing on assigned clients; staff must name clientIds. Timezone: the service resolves the
CLIENT's stored zone and refuses staff-browser override.
**Logger handoff EXISTS:** `buildScheduleWorkoutLoggerRoute` (`SessionDetailModal.logic.ts:60-81`) already
carries `clientId`, `sessionId`, `sessionDate`, `loadPlan=today`, `sessionCredits`; button is
admin/trainer-gated (`useSessionDetailPermissions.ts:120-125`). **Client wiring gap:** the client logger
route never reads `sessionId` (`WorkoutLogger.tsx:111-117` reads only loadPlan/assignment params) — moot
today, live the moment a client-facing "start session" ships.
**🚨 Semantic trap — TWO incompatible date→plan-day algorithms:** projections use
`scheduledDateFor` basis chain (explicit day date → plan-start offset → cursor offset,
`trainingPlanProjectionContract.mjs:152-163`, basis exposed per item); the logger's `getPlanDayForDate`
matches **weekday names** (`WorkoutLogger.helpers.ts:309-321`). A schedule preview and the logger opened
from the SAME session can show DIFFERENT plan days. Any design must pick ONE truth (the projection
contract) and retire the weekday matcher.
**Sockets:** schedule sockets are invalidation-only (payload ignored, refetch on event) — keep it that
way; NEVER put plan/exercise content in socket payloads (known PII-in-broadcast issue in
`realTimeScheduleService`; a room sanitizer exists but its emit-path invocation is unverified).

## 3. Proposed direction (attack this, then add your own)
**A. Unlock the Planner→Logger loop (backend truth first):**
1. Decouple advancement from billing: allow a `trainer_session` plan day to prefill AS the loggable
   assignment and advance the cursor on save, while `shouldDeductSession`/billing semantics continue to key
   on the linked scheduled session (present → billed flow unchanged; absent → advance-only, zero billing
   side effects). Exact guard surgery at the three sites in §1. **Sean must ratify the billing rule.**
2. Auto-load on logger open when the client has an active plan and the logger is empty (no draft, no
   exercises): materialize the cursor day, replace-not-append, with a one-tap dismiss ("Start blank
   instead"). Draft restore keeps priority over plan load (draft = real in-progress work).
3. Promote the ContextBar plan chip to the load control (the file header already promises "control later"):
   chip shows "W2·D3 — Pull today's workout" when unloaded; opens PlanContextSheet with Load/Replace.
4. Log-ahead residual: out-of-cursor day loads stay draft-only (disclosed, not silently frozen).
**B. Schedule×Plan day preview (build ON the shipped projection layer):**
1. New `SessionDetailPlannedWorkoutPanel` in `SessionDetailBodyPanels` between the info grid and package
   summary — **self-fetching hook (session.userId + sessionDate → projections API), ≤3 props**, because
   BodyPanels(295)/Modal(293) are at the 300-line cap and the 65-line prop chain must not widen. Budget an
   extraction for whichever file breaches.
2. Full exercise detail via a contract extension (e.g. `detail=full` or per-item fetch) — backend contract
   + frontend allowlist updated IN LOCKSTEP (the allowlist fails closed on >3 preview names today).
   Preserve the projection firewall: read-only, zero Session/billing imports.
3. **One date-truth:** the projection contract's `scheduledDateFor` basis chain becomes the ONLY
   date→plan-day mapper. The logger's weekday-name `getPlanDayForDate` third tier is retired/re-pointed so
   modal preview and logger-open NEVER disagree on which day is "today's workout."
4. "Open in Logger" already exists (admin/trainer) and already carries `sessionId + loadPlan=today` — the
   linked-session path is ALSO the billing-integrity path (`allowScheduledTrainerSession`). Optional slice:
   wire the client logger route to read `sessionId` before any client-facing start button ships.
5. Day-level affordance: the projection layer already collapses to a single day in day view; polish
   discoverability (Sean did not recognize the layer as "the plan on the schedule") + a per-session glyph
   (world-accent dot/badge) on calendar session blocks whose `clientId:date` has a projection.
6. Auth scoping: inherit the projection service's (client=self-only 403-else; trainer all-or-nothing
   assigned; admin named ids). NOTHING plan-related rides socket broadcasts.
**C. Sequencing (proposed):** S1 guard decouple + tests → S2 one-date-truth unification → S3 logger
auto-load/replace + plan-chip control → S4 modal panel + contract extension → S5 day/glyph discoverability
+ client sessionId wiring → S6 polish/receipts.

## 4. Laws that bind
Rule 8 zero-PII (IDs/roles to LLMs; no client names in new payload logs); Rule 26 canonical receipts before
UI truth claims; M3 anti-jump in logger surfaces; 44px targets; ≤300-line files (SessionDetailModal is
~250 — the preview section likely needs its own file); styled-components + `var(--token,#fallback)`;
world-seam law for logger chrome (new: `shell.world-seam.test.ts`); byte-pinned save payload
(`shell.save-path.canonical.test` — adding `plannedAssignment` for trainer_session MUST update the pin
deliberately, never silently); billing-adjacent code = Sean ratifies before build (Rule 50/62).

## 5. Your job
- **Kimi K3 (design/frontend):** attack the SessionDetailModal preview UX (density, hierarchy, mobile
  414px, load states), the schedule glyph language, the logger auto-load interruption pattern (does
  auto-materializing surprise the user? dismiss affordance?), plan-chip promotion, and name what a
  best-in-class 2026 training app (Strong/Hevy/Fitbod/TrueCoach) would do here that this plan misses.
- **Opus 5 (product/architecture):** rule on the billing/advancement decouple (§3.A.1 — is the proposed
  rule the right product semantics? what breaks?), the preview endpoint shape (cursor-vs-calendar truth),
  replace-vs-merge semantics, the sequencing, and the single highest-risk item. Confirm or override each
  numbered decision with one line.
