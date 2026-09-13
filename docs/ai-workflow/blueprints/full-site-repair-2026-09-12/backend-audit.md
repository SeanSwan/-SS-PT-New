# Current-main backend audit

Owner: Astra backend audit subtask. Status: VERIFIED SOURCE + SYNTHETIC PROBES; implementation not performed. Effective 2026-09-12. Base: `53120649f356c3efccee32872b530096d386642f`.

Worktree: `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/full-site-repair-20260912`. Initial `git status --short` was empty. This document supplements the parent's canonical packet and supersedes only backend conclusions inherited from sections 5A/5B of `FULL-SITE-HOSTILE-AUDIT-2026-09-12.md` that the reconciliation below rejects. It does not replace that preserved report.

Boundaries: source reads and isolated in-memory handler probes only. No server startup, DB connection/mutation, provider call, real records, secrets, baseline-suite duplication, code edits, or cleanup. The parent owns baseline evidence and implementation readiness. No existing graphify graph was available; direct mounts and callers were inspected instead. The fresh worktree lacks the rolling continuity file.

## Ranked findings and repair contracts

### BE-01 — P1: Debate start authorizes the trainer role but not the target client

VERIFIED. `backend/core/routes.mjs:717` mounts `/api/ai/debate`; `backend/routes/aiDebateRoutes.mjs:50` registers `/start` behind `protect, trainerOrAdminOnly`. At lines 69-74, body `clientId` is accepted directly, or `resolveClient(clientRef, sequelize)` is called without its available trainer scope. Lines 86-149 read the selected user's profile, pain, workouts, nutrition and goals. Line 155 starts a job owned by the requesting actor. There is no assignment gate between role validation and those reads. `clientResolver.mjs:110,130-144` supports a `trainerId` option, but this route omits it. The job-ownership guard at `aiDebateRoutes.mjs:32-45` protects later results against other actors; it does not authorize the original client selection. Earlier `/api/ai` routes do not define `/debate/start` or a global assignment guard.

Read-only reproduction: evaluated the actual route source with import dependencies replaced by in-memory stubs, capturing the real `/start` handler. Synthetic trainer 101 submitted client 901 without any assignment. Result: HTTP 200, `success:true`, five client-data queries, and `startDebate(workout_plan, client901, actor101)`. No Express listener, DB, or provider ran. This proves the missing handler boundary, not production account access.

Repair: parse a strict positive client ID, apply the existing fail-closed client-access policy before reading any client domain, and scope reference resolution to the trainer. Admin access remains explicit. Do not infer authorization from de-identification or job ownership.

Regression BE-T01: invoke the mounted router with real role middleware plus synthetic auth fixtures. Unassigned trainer + direct ID and reference must return 403/404 with zero client-domain reads and zero debate/provider starts. Assigned trainer/admin pass; missing, malformed, inactive and unknown targets are rejected. Later result ownership tests remain required.

### BE-02 — P1: Renewal-alert routes expose and mutate clients outside trainer assignments

VERIFIED. Current main repaired the old missing-model defect and now mounts `/api/renewal-alerts` at `core/routes.mjs:553`. `routes/renewalAlertRoutes.mjs:44-67` applies only authentication and a staff role gate. The list controller passes only urgency/limit options (`controllers/renewalAlertController.mjs:23-31`); `services/renewalAlertService.mjs:208-236` queries all active alerts and includes each user's email, phone and name. `/user/:userId` passes the requested ID directly to `getUserAlerts` (`service:379-390`). Contacted/renewed/dismissed service methods (`:259-307`) fetch by alert PK and update without checking its client against the requester. POST `/` similarly accepts an arbitrary client. Its route header says admin-only creation, while registration at `renewalAlertRoutes.mjs:63` has no admin guard; the service comment says trainers may manually flag clients, so resolve that product policy explicitly rather than silently guessing.

The actual `requireStaff` function admitted a synthetic trainer, and the POST route registered only `createManualRenewalAlert`; no admin or assignment middleware is present. Global parent admin middleware does not help: this mount is `/api/renewal-alerts`, not `/api/admin`.

Repair: carry requester identity into reads and writes, scope trainer collections/statistics to active assigned clients, and authorize the persisted alert's user before mutation. Use the same policy for user-specific reads and manual flags. Admin retains global operations. Prefer the existing assignment helper rather than a new permission system.

Regression BE-T02: two trainers with disjoint synthetic client assignments; each collection/stat response contains only the caller's scope; cross-client ID/alert ID reads and all three PATCH mutations deny with zero writes. Test assignment revocation, admin global access, client/user denial, and the chosen manual-create authority. Current renewal widget tests and mocked cron tests do not prove this boundary.

### BE-03 — P1: Manual session grants lose credits under concurrent writes

VERIFIED. `/api/session-packages/add-sessions` is live: `core/routes.mjs:338` -> `routes/sessionPackageRoutes.mjs:263` -> `sessionPackageManualGrantRoutes.mjs:37`. The admin-only handler loads the user at line 55, computes `currentSessions + sessionCount` at 71-72, and calls ordinary `save()` at 73. No transaction, row lock, or atomic increment protects the balance. A concurrent grant or booking deduction can be overwritten.

Actual-handler synthetic probe: two concurrent requests read initial balance 10 and grant 5 and 7. Both return 200 (reporting 15 and 17); persisted in-memory balance is 17, expected 22. Dependencies used ordinary independent snapshots to model reads, without database access. Existing `__tests__/sessionPackageManualGrantValidation.test.mjs` tests invalid amounts only and mocks `save()`.

Repair: align this route with the existing atomic credit service pattern (`services/sessionDeductionService.mjs:373-399`), including balance/source validation in the transaction and authoritative post-write receipt. Decide whether repeated delivery of the same manual-grant operation should be idempotent; do not reuse an order/payment key for unrelated grants. An atomic increment fixes lost updates but does not by itself prevent duplicate retry credits.

Regression BE-T03: deterministic interleaving with independent snapshots must preserve both grants; grant vs booking deduction must preserve their sum; denied/invalid/free-tracking requests make zero writes; failed transaction rolls back. Run real row-lock/concurrent-request proof only against an explicitly isolated test DB. Mark that DB proof NOT RUN until available.

### BE-04 — P1: Incomplete clinical/operational context becomes an explicit all-clear

VERIFIED. `services/ai/contextEngine/coachContextEngine.mjs:282,290` catches trainer-day client-credit and active-pain query failures to empty arrays. Lines 301-306 then construct no pain/low-credit flags; line 319 returns `ok:true`. `services/ai/dispatchers/dayBriefDispatcher.mjs:37` renders **All clients clear — no flags.** This is the live `brief_my_day` dispatcher on the AI-command surface (`core/routes.mjs:715`), so a failed pain query can produce an affirmative safety/attention statement. The single-client context's `dataQuality` handling does not cover this separate day path.

Sibling: debate enrichment at `aiDebateRoutes.mjs:106,130,135,141` and `services/ai/debate/debateClientContextService.mjs:7-15` collapses DB failures into genuine empty history. A debate can therefore proceed without indicating missing pain/nutrition/goals. These are separate from the old table-name drift, which is fixed.

Repair: retain per-domain availability and distinguish known empty from unavailable. Block safety-dependent generation or return a clearly incomplete context according to the existing AI policy; day briefs must never claim all-clear when required domains fail.

Regression BE-T04: reject pain/credit query independently while providing a real synthetic scheduled session; output must say unavailable/partial and must not contain all-clear. True empty rows can produce no flags. Debate failure must be surfaced or block generation; no provider call is needed for these tests.

### BE-05 — P1/P2: Compliance failures are hidden, and trainer access is blocked by an earlier mount

VERIFIED; independently corroborates the product lane. `core/routes.mjs:498` mounts `adminRoutes` before `adminComplianceRoutes` at :586. `adminRoutes.mjs:30-31` uses router-global authentication/admin authorization even when no route matches. A trainer requesting `/api/admin/compliance/at-risk` is therefore denied before reaching the admin/trainer gate at `adminComplianceRoutes.mjs:38` and the assignment-aware query builder. Do not fix this by broadly removing admin guards.

For an admitted admin, the inner DB-query catch at `adminComplianceRoutes.mjs:48-59` leaves `clients=[]` and line 64 sends HTTP 200. Query outage and no at-risk clients are indistinguishable. This overlaps BE-04's data-truth policy but has its own real caller contract.

Repair: give intended trainer routes an explicit non-shadowed mount or narrow earlier admin middleware without exposing sibling admin APIs. On query failure return a typed unavailable response that the existing compliance widget displays truthfully.

Regression BE-T05: mount the real routers in actual order, then trainer-assigned-client positive case, unassigned negative case, client denial, admin pass, and unrelated admin-route denial. Rejected SQL must return non-success/unavailable, while successful `[]` remains a valid empty state.

### BE-06 — P1/P2: Socket message notification SQL does not match the notification schema

VERIFIED SOURCE; transport lane owns socket repair. `server.mjs:60,131` imports/initializes `socket/socket.mjs`. In `send_message`, the message is inserted and emitted first (:165-174), then :193-196 inserts into `notifications(user_id,type,content,created_at)`. `models/Notification.mjs:18-23,65-87` and `migrations/20260205100001-repair-notifications-table.cjs` define required title/message, camel-case userId/createdAt, and no content column. The model also does not recognize `new_message` as a notification type. The catch at socket :204 tells the sender sending failed after a message may already have persisted/delivered, encouraging duplicate retries. No live DB-schema probe was performed.

Repair: use the canonical notification service/schema and separate message success from notification-delivery degradation. Regression BE-T06: synthetic successful message insert plus notification failure must not claim message failure or duplicate a retry; validate the emitted event against the real notification DTO and isolated DB migration schema.

### BE-07 — P2: Per-admin notification records are broadcast to every admin

VERIFIED SOURCE; transport lane owns repair. `controllers/notificationController.mjs:406-435` creates a separate notification row for every admin, emits every row to the shared admin room, and then emits each admin's own row again individually. Each admin receives other admins' recipient-specific row IDs plus its own repeated event. The internal call chain is active from signup, contact, orientation and order controllers. This is a duplication/ownership defect; do not inflate it into proof of cross-role disclosure.

Repair: emit each persisted recipient row only to that recipient; if an admin-wide event is required, use a separate recipient-neutral contract. BE-T07: with two admins, each gets one event containing only its own ID and no second unread-count increment. Preserve row-scoped mark-read authority.

### BE-08 — P2: Production secret prerequisite is missing from deployment examples

VERIFIED CONFIG GAP, not a currently observed outage. `core/startup.mjs:31-65` requires a sufficiently strong production `ADMIN_ACCESS_CODE`; failure aborts startup. Neither `render.yaml` nor `render.env.example` names it. Add a `sync:false` declaration/example placeholder and operator documentation without reading or changing a real secret. BE-T08: configuration contract checks the key's declaration; existing startup tests prove missing/weak values fail closed. Never relax the validation to repair deployment configuration.

## Sections 5A/5B reconciliation

| Older claim | Fresh-main disposition |
|---|---|
| A-1 SessionContext missing endpoints breaks every session view | Missing strings persist at `SessionContext.tsx:857,872,887`, but `fetchAllUserSessions`, `fetchTrainerStats`, `fetchAdminStats` have no consumers beyond their own definitions/provider exports. The provider mounts in App; that does not invoke these helpers. Named AdminSessionManager/TrainerClientSessions files are absent. Reject app-wide runtime impact; dormant contract debt. `/api/trainer/drafts` also makes the absolute claim of no trainer router false. |
| A-2 drawer calls removed `/api/users` | `WorkoutClientDrawer.tsx:79` first calls valid `/api/admin/users`; `/api/users` survives only as fallback at :87. Drawer has no importer. Reject claimed live primary failure. Do not restore an unprotected users endpoint. |
| A-3 parameterized session analytics | Wrong service URL remains at `sessionService.ts:495`; `getSessionAnalytics` has no caller. Dormant mismatch, not a verified common-path outage. |
| A-4 activity/risk/trainer widgets | Three named widget files are absent on main. Missing route strings are not used by those removed surfaces. Reject prior live-widget claim; current compliance defects are BE-05. |
| A-5 NASM admin six endpoints | Strings remain; NASMAdminDashboard has no importer. Backend endpoint families remain absent. Dormant UI, not a current mounted outage. |
| A-6 enterprise admin five endpoints | Strings remain, but service has only barrel export/metadata references, no consumer calls. Proposed alternate URLs have different contracts and are not drop-in repairs. |
| A-7 manual-grant router unmounted | FALSE: `sessionPackageRoutes.mjs:263` mounts it. Current defect is atomicity, BE-03. |
| A-8 workout collection CRUD shadowed | STALE: `workoutSessionRoutes.mjs:6` documents SWA-75 removal of duplicate collection CRUD; remaining routes are handoff/start/end/statistics. Canonical CRUD at `workoutRoutes.mjs:201-236` is intentional. |
| A-9 system-health/pending-order hooks | Wrong strings remain at `useDashboardQueries.ts:276,290`; named hooks have no consumer. Dormant. |
| A-9 metrics/photo/video uploader | Named fitness-metrics-chart, ProfilePhotoUploader and useVideoUpload files are absent. Reject old file-based mounted claims. |
| A-9 gamification challenge/milestones | Singular challenge at `gamificationSlice.ts:402` and milestones at :433 remain. Current originating ClientProgressCharts mount was not reproduced; do not claim live break solely from thunk definitions. |
| A-9 special offers | `/api/admin/special-offers` remains at admin-packages-view:645; backend mounts `/api/admin/specials` at routes:562. Product lane must bind visible caller/payload before repair; existence of an alternate mount alone does not prove contract equivalence. |
| A-9 movement screen | `useClientOnboardingData.ts:172` retains missing endpoint; exported history hook has no consumers. Dormant. |
| A-9 avatar marketplace | Actual missing backend family remains; AvatarHomePage imports/renders CrystallineMarketplace, which calls marketplace/crystals/purchase. Backend `avatarHomeRoutes` lacks all three. Parent/product lane owns final page/feature gate receipt and intended behavior. Do not invent a crystal economy to satisfy URLs. |
| A-9 placeholders | Placeholder service still creates `/api/placeholder/widthxheight` at :87; no backend route. Backend API catch-all returns JSON 404, not SPA HTML, so the report's response-body claim is false. Product lane should prefer existing local placeholder behavior. |
| A-10 static middleware ordering | FALSE POSITIVE: `core/app.mjs:337` calls setupMiddleware before setupRoutes :348; `core/middleware/index.mjs:155` registers production static serving before the SPA catch-all. Later duplicate static registration does not establish interception. Other frontend env defaults require consumer/deployment-specific analysis. |
| A-11 dormant routers | No-callers does not mean unreachable. AI debate is mounted and security-relevant (BE-01); results are consumed by workoutPlannerDebateResultHydration. Session metrics remains unmounted, but do not auto-mount legacy families. |
| A-12 broad end-to-end CLEAN | Unsupported. Source route matching is not authenticated runtime, permission, provider, DB or concurrency evidence. Current counterexamples BE-01 through BE-07 disprove the broad verdict. |
| B-1 users/Users | STALE at named live path: scheduleController:145-146 already joins quoted Users. userController.mjs is absent. Raw SQL sibling search across routes/controllers/services found no executable old lowercase-user joins or named old pain/goals tables; comment matches were excluded. Historical migration naming still needs an isolated fresh-DB rehearsal, not speculative production fixes. |
| B-2/B-3 PainEntries/Goals | FIXED across every reported site: coach context :68,:90,:286; debate route :103,:138; debate context service :43,:87 use model-declared tables and corrected columns. |
| B-4 RenewalAlert missing registry | FIXED: associations imports :89, resolves :310, exports :1499, and declares associations :932-934; model cache receives returned registry. Cron is explicitly kill-switched. Current access defects are BE-02. |
| B-5 missing boot key declaration | Survives as BE-08 config gap. Real deployment configuration not inspected. |
| B-6 server-simplified broken | File absent on fresh main. `start:minimal` remains a separate script; no need to delete anything. |
| B-7 migration failure nonfatal | TRUE in render-start:82-87; but render.yaml:66 also runs migrate:production as a build step. Blanket claim this mechanism caused the named repaired defects is unsupported. Choose explicit release policy before changing startup behavior. |
| B-7 Challenge/Exercises | Two Challenge table names are explicit separate systems, not established drift. Exercise table is `Exercises`; fresh migration-only completeness is unproven without an isolated rehearsal. Do not infer current production absence. |
| B-7 manual diagnostics | Confirmed dormant script defect: manualDiagnostics:9 imports absent performEnvironmentDiagnostics; package check-stripe points to it. Low-priority tooling; never execute diagnostics against real config during this audit. |
| B-8 dormant imports/types/debris | sessionController still imports nonexistent server io export (:194), but has no importer. trainingSessionRoutes is absent. Renewal routes are repaired/live. BodyMeasurement.verifiedBy remains UUID, matching its migration; no writer/reference proving a current integer-ID failure was found. Original local debris inventory is not evidence for this clean worktree. |
| B-9 all imports/boot verified | Not re-certified: parent owns baseline suite. Single import/schema spot-checks cannot prove every route or production boot. |

## Slice recommendation and evidence limits

For bounded S2, implement BE-01/BE-02 authorization and BE-03 credit atomicity with focused tests and no schema/provider expansion. Preserve existing current-main session guards: `sessions.mjs:2208` checks reschedule ownership, session service allocation checks the transaction ledger at :2400 and locks the order at :2745. Do not transplant older branch implementations over these controls.

Next data-truth slice: BE-04/BE-05, including mounted compliance authorization. Transport lane: BE-06/BE-07. Config/tooling and dormant frontend contract debt are separate lower-risk follow-ups.

The only executed behavioral probes were the three source-isolated probes described above (grant interleaving, renewal role gate, debate start). They used synthetic records and stubbed persistence/provider dependencies. They are not substitutes for the parent's executable regression tests or isolated PostgreSQL concurrency proof. No claim of implementation verification or deployment is made. The sole new artifact from this subtask is this report.
