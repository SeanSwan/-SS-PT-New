# Product audit — full-site repair, 2026-09-12

Status: READ-ONLY AUDIT COMPLETE; implementation and browser verification pending. Auditor: delegated Astra. Canonical packet belongs to parent. This document is an evidence appendix, not a competing plan.

## Baseline and method

- Worktree: `C:/Users/BigotSmasher/Desktop/quick-pt/SS-PT/tmp/worktrees/full-site-repair-20260912`.
- Verified HEAD: `53120649f356c3efccee32872b530096d386642f`; initial `git status --short` empty.
- Read current project instructions, installed non-vibe-coding and graphify guidance, and original UX report. No graph at `graphify-out/graph.json`; no graph build/provider calls attempted because delegated scope is read-only.
- `node scripts/lane.mjs digest` reported not a git repository despite direct git identity succeeding. WSL continuity count hit E_ACCESSDENIED. Parent owns workflow repair and baseline tests.
- No application edits, backend startup, real database, private records, external model calls, or messages to clients. One existing-source in-memory synthetic concurrency probe was executed below. All other findings are source-verified with mounted caller paths; no authenticated-browser or deployment claim.

## Mounted surface receipt

All paths below are relative to the verified worktree.

| Surface | Actual mounted path and consumer | Backend and authority |
|---|---|---|
| Client logger | `frontend/src/routes/main-routes.tsx:940` renders UniversalDashboardLayout; `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:222` declares `/client/log-workout`; `UniversalDashboardLayout.shellPieces.tsx:108` renders the selected Component. `WorkoutLogger.tsx:216` consumes useOfflineQueue and its submit hook at approximately 485; `useWorkoutPlanLoading.ts:86-89` reads `/api/workout-forms/my/info`. | `backend/core/routes.mjs:774` mounts workout forms; `dailyWorkoutFormRoutes.mjs:282` protects self-info and :611 protects POST `/` with trainer-client relationship checks. `frontend/src/services/nasmApiService.ts:740` posts `/api/workout-forms`. User.availableSessions is defined at `backend/models/User.mjs:185`; DailyWorkoutForm client/trainer/date/formData model at :197 onward; WorkoutSession.userId/date at :30/:44. |
| Trainer logger | Dashboard route definition :190 mounts EnhancedWorkoutLogger; `EnhancedWorkoutLogger.view.tsx:131-138` renders real WorkoutLogger. Outer wrapper has its own honest error path, but inner logger independently fetches info again. | `/client/:clientId/info` at `dailyWorkoutFormRoutes.mjs:350`, trainer assignment/permission checks at :393-415. No backend authorization weakening is proposed. |
| Client home/onboarding | routes :218/:220; `ClientHomeTab.tsx:59` renders onboarding launch card and :74 home; `routeComponents.tsx:174` renders selfSubmit wizard. | Self wizard calls `/api/onboarding/self` at `ClientOnboardingWizard.tsx:613-614`; completion refreshes auth and navigates overview in routeComponents :170-174. |
| Admin attention | `overview/AdminOverviewPanel.tsx:263` renders ClientComplianceDashboard. Widget fetch at :104 and actions at :236-237. | `core/routes.mjs:586` mounts adminComplianceRoutes; GET `/compliance/at-risk` at :45. Query uses completed WorkoutSession rows and User billing fields (`backend/utils/adminComplianceHelpers.mjs:7-48`). |
| Trainer intervention | routes :187 selects TrainerHomeTab; `TrainerHomeTab.tsx:146` renders TrainerInterventionQueue, which fetches `/api/admin/compliance/at-risk` at :155. | Own route allows admin/trainer (:38), helper scopes trainers to active assignments (:9-19), BUT earlier admin router blocks trainers; see P-04. |
| Gamification | `/user-dashboard` renders UserDashboardV3 (`main-routes.tsx:798`), which calls useGamificationRealtime at :42. Canonical `/dashboard/client/*` uses UniversalDashboardLayout, which does not call this hook. | Points service schedules events through `GamificationRealtimeEvents.mjs:62-69`, using transaction.afterCommit. Hook validates event userId at :84 before invalidation and celebration. |

## Ranked verified findings and bounded remediation

### P-01 — P1: offline flush deletes a newly queued workout

**VERIFIED, behavior reproduced.** `frontend/src/components/WorkoutLogger/useOfflineQueue.ts:82-110` reads a queue snapshot, awaits each POST, then replaces all storage with failures from that original snapshot. `queueSubmission` at :147-160 can append while the request is pending. The completion rewrite removes the new entry without submitting it.

Safe probe executed current source using TypeScript transpilation with injected React hooks, a Map-backed localStorage and one deferred fake POST. No source files were altered. Sequence: seed A; flush A; append B; resolve A success. Output: `pendingBeforeFirstResponse=2`, `submittedPayloadCount=1`, `pendingAfterFirstResponse=0`, expected pending=1. This is valid behavioral FAIL evidence, not an import/setup failure.

**Minimal repair:** acknowledge completed entry IDs against the latest persisted queue, preserving entries appended since the snapshot. Scope mutation/flush ownership per actor and client; do not erase failed entries. Preserve unknown-result entries for reconciliation. Cross-tab locking must use an existing safe primitive or explicit reconciliation rather than assuming a hook-local ref serializes tabs.

**Owned files:** `frontend/src/components/WorkoutLogger/useOfflineQueue.ts`, `offlineQueueStore.ts`; new `useOfflineQueue.race.test.tsx`, existing `offlineQueueStore.test.ts`.

**Acceptance:** P-T01 queues A then B during A request; B remains and later syncs once. P-T02 two hook instances/tabs do not delete each other's appends; duplicate acknowledgements are idempotent. P-T03 storage rewrite failure preserves pending data and reports uncertainty.

**Related receipt defect in the same slice:** `useWorkoutSubmit.ts:141-148,216-217` ignores the boolean returned by queueSubmission and returns KEPT_LOCAL even when persistence fails. `workoutSubmitOutcome.ts:27-28` explicitly defines KEPT_LOCAL as persisted in the offline queue. Include `useWorkoutSubmit.ts` and its submit-outcome tests in ownership: a false persistence result must return FAILED, preserve the live draft and never produce a durable-local receipt. This does not require changing the separate synchronous AI acknowledgement contract.

### P-02 — P1: offline queue has no authenticated actor ownership

**VERIFIED source boundary.** `offlineQueueStore.ts:49-54` keys storage only as `ss-workout-queue-${clientId}`; `useOfflineQueue.ts:60-65,82-99,138-141` reads and auto-flushes this queue with whatever session is currently authenticated. `WorkoutLogger.tsx:216` passes only client ID. Trainer A's queued workout for client C can therefore be submitted by trainer B, or C themselves, on the same browser when that client logger next mounts. Server assignment checks still apply; this is an attribution and cross-account local persistence problem, not a demonstrated backend authorization bypass.

**Minimal repair:** version the queue under authenticated actor ID plus target client ID; validate envelope owner, target ID and payload before replay. Capture an auth-context generation and stop/ignore further operations after actor change. Legacy ownerless queues must remain preserved and require an explicit reviewed recovery path; never silently assign them to the next login or delete them.

**Owned files:** same queue files as P-01 plus `WorkoutLogger.tsx`; new `useOfflineQueue.identity.test.tsx` and `offlineQueueStore.test.ts`.

**Acceptance:** P-T04 actor A/C queue never appears in B/C or C/C; anonymous actor cannot read/write/replay; changing auth mid-flush issues no subsequent stale-account requests and preserves remaining entries. P-T05 ownerless legacy storage remains untouched and is not auto-flushed.

### P-03 — P1: failed client-info fetch fabricates no-credit billing state

**VERIFIED.** `useWorkoutPlanLoading.ts:111-122` fabricates a client with `availableSessions:0` and null source on any /info failure. `WorkoutLogger.submitGuard.ts:16-19` then refuses a client/trainer without a linked scheduled session; `useWorkoutSubmit.ts:109-117` tells them no sessions remain. Admin and linked-session exemptions mean the old report's universal hard-block claim is too broad, but the reachable client failure remains. `WorkoutLogger.tsx:569` also coerces an unknown balance to zero for ContextBar.

**Minimal repair:** expose loading/error/retry and keep client identity/balance unknown until a validated matching /info response. Preserve the active workout/draft, prevent a submit that lacks verified client context with a load/retry message, and reserve insufficient-credit wording for a verified numeric balance or server receipt. Cancel or generation-gate pending fetches on client/role changes; validate response client ID. ContextBar must accept unknown balance and render an unavailable state, not zero.

**Owned files:** `frontend/src/components/WorkoutLogger/useWorkoutPlanLoading.ts`, `WorkoutLogger.tsx`, `WorkoutLogger.localTypes.ts` only if the load state needs shared types, `runner/shell/zones/ContextBar.tsx`, `useWorkoutSubmit.ts` only for specific load-state refusal. Existing submitGuard stays authoritative; avoid duplicating it.

**Tests:** new `useWorkoutPlanLoading.clientTruth.test.tsx`, `WorkoutLogger.clientInfoFailure.test.tsx`; existing `WorkoutLogger.submitGuard.test.ts`, `WorkoutLogger.clientMount.test.tsx`, `WorkoutLogger.submitContract.test.tsx`.

**Acceptance:** P-T06 403/500/network failure never shows zero-credit/no-money copy; exercises and draft survive retry. P-T07 delayed A response cannot populate client B; mismatched response ID rejected; true zero, unknown, free-tracking and scheduled-session cases retain existing billing semantics. P-T08 retry success restores saving without remount/data loss.

### P-04 — P1: trainer intervention endpoint is shadowed by earlier admin-only middleware

**VERIFIED mount-order defect.** `backend/core/routes.mjs:498` mounts adminRoutes at `/api/admin` before adminComplianceRoutes at :586. `backend/routes/adminRoutes.mjs:30-31` installs router-wide authenticateToken and authorizeAdmin. The latter is adminOnly (`backend/middleware/auth.mjs:176`). Therefore a trainer's request is rejected before the intended admin/trainer handler and assignment-scoped SQL. `TrainerInterventionQueue.tsx:163-172` catches and hides the widget, masking the failure.

**Minimal repair:** mount the narrowly protected at-risk route before generic admin middleware, or introduce a trainer namespace sharing the existing handler. Do not broadly relax authorizeAdmin. Preserve the admin URL, assignment-scoped SQL and admin-only business KPI/check-in mutations. Parent/backend owner must inspect the entire moved router's sibling routes before selecting a mount-order fix.

**Owned files:** `backend/core/routes.mjs`, `backend/routes/adminComplianceRoutes.mjs`, optionally a new narrow `backend/routes/clientComplianceReadRoutes.mjs` or handler module. `TrainerInterventionQueue.tsx` for visible denial/unavailable state.

**Tests:** new `backend/tests/api/trainerComplianceMountOrder.test.mjs` with Express mount order and synthetic auth/model seams; existing `backend/tests/api/clientOnboardClientSourceBoundary.test.mjs`, `adminComplianceWorkoutTruth.test.mjs`; trainer widget test.

**Acceptance:** P-T09 real mounted Express chain allows assigned trainer read, filters unassigned client, allows admin global read, rejects client/anonymous, and still rejects trainer on `/api/admin/users` and admin-only analytics/mutations. A test of only the extracted SQL or isolated compliance router is insufficient.

### P-05 — P1: compliance SQL failure reports every client healthy

**VERIFIED.** `backend/routes/adminComplianceRoutes.mjs:47-64` catches SQL failure and returns HTTP 200 `{clients:[]}`. `ClientComplianceDashboard.tsx:195-199` then announces all clients on track; `TrainerInterventionQueue.tsx:178-180` does the same. Both also turn malformed successful bodies into empty arrays. Admin filtered-empty results use the same global all-clear wording even when other risk filters contain clients.

**Minimal repair:** at-risk query failure returns non-success unavailable status; no raw SQL/PII in response. Validate response shape before accepting it; render an explicit unavailable/retry state. Distinguish successful zero results, zero results in the selected filter, loading, denial and fetch failure. Do not silently hide the trainer operational surface on failure.

**Owned files:** `backend/routes/adminComplianceRoutes.mjs`; `frontend/src/components/DashBoard/Pages/admin-dashboard/components/ClientComplianceDashboard.tsx`; `frontend/src/components/DashBoard/Pages/trainer-dashboard/TrainerInterventionQueue.tsx`; associated styles if needed.

**Tests:** `backend/tests/api/adminComplianceAvailability.test.mjs` (new); `ClientComplianceDashboard.truth.test.tsx`; `TrainerInterventionQueue.truth.test.tsx` (new or existing equivalent).

**Acceptance:** P-T10 DB failure returns non-2xx and both widgets show retry without all-clear; malformed 200 body likewise unavailable; successful empty has calm empty copy. P-T11 empty critical filter with warning rows says no critical matches, not everybody healthy. P-T12 successful retry visibly recovers.

### P-06 — P2: save receipt overpromises pending XP and converts unknown balance to zero

**VERIFIED.** `SaveSuccessPanel.tsx:111-115` uses Number(value), so explicit null/empty string become zero. Billing text can claim zero remaining and show Top up sessions from an unknown balance. Its :235 promise that session XP is on the way is unconditional in self mode. `awardWorkoutXP.mjs:69-70,101-103,125-127` can return no-award states; `dailyWorkoutFormRoutes.mjs:1309-1314` swallows XP failure after the saved workout. The 201 form contains no authoritative awarded-XP receipt (:1377-1393). The older report's toast-and-redirect claim is false because `useWorkoutSubmit.ts:180` mounts the success panel and navigation waits for Done.

**Minimal repair:** strict finite numeric balance parsing and omission of absent values; use saved-workout/record facts as the primary beat. Remove unconditional XP promise or explicitly say rewards status is not yet confirmed. Do not fabricate synchronous XP numbers or make the committed workout depend on reward success. Keep existing PR, challenge, plan-progress and billing receipts.

**Owned files:** `frontend/src/components/WorkoutLogger/SaveSuccessPanel.tsx`; optionally `WorkoutLogger.submitReceipt.ts` for a shorter workout-first toast, with tests updated without removing billing disclosure.

**Tests:** `SaveSuccessPanel.test.tsx` (existing or new equivalent), `WorkoutLogger.submitReceipt.test.ts`, `WorkoutLogger.submitSuccess.test.tsx`.

**Acceptance:** P-T13 null/undefined/blank/malformed balance never implies zero/top-up; numeric 0 still does when billing says deducted. P-T14 saved workout with absent XP still celebrates confirmed sets/PRs, with no earned/pending XP guarantee; duplicate/failed/queued save cannot render success panel.

### P-07 — P2: realtime rewards are absent on canonical client routes

**VERIFIED, corrected scope.** `UserDashboard.V3.tsx:42` subscribes, so the original report's zero-consumer claim is false. Canonical `/dashboard/client/*` mounts the Universal shell, not UserDashboardV3. The actual logger/home therefore do not subscribe there. Backend ledger events correctly defer to afterCommit (`GamificationRealtimeEvents.mjs:62-69`); `useGamificationRealtime.ts:84` checks event ownership and :93-99 deduplicates levels. Preserve those controls.

**Minimal repair:** one authenticated subscription at a shared provider boundary under QueryClient/Auth/Celebration, remove the standalone duplicate. Do not mount dormant PostWorkoutCelebration on top of existing SaveSuccessPanel/PostSaveHandoff. Keep backend commit authority; never infer XP from local sets. Inspect interaction with the active post-save handoff before allowing a second full-screen overlay.

**Owned files:** `frontend/src/App.tsx` or an existing authenticated shell/provider mount; `frontend/src/components/UserDashboard/UserDashboard.V3.tsx`; `frontend/src/hooks/gamification/useGamificationRealtime.ts` only if lifecycle or dedup changes required.

**Tests:** mounted provider/route test covering both dashboard shells, existing `useGamificationRealtime.structure.test.ts`, new `useGamificationRealtime.lifecycle.test.tsx` for synthetic socket events.

**Acceptance:** P-T15 canonical client logger receives own committed level-up once; other-user/malformed/replayed events do not celebrate; logout disconnects, next login resets user dedup; one socket for one mounted app.

### P-08 — P2: level-up takeover fails modal keyboard contract

**VERIFIED source.** Existing non-reduced-motion `CelebrationPortal.tsx:458-471` displays alertdialog overlay, initially focuses Continue (:314-318), but has no Tab trap, Escape handler, aria-modal/background inertness or focus restoration. One Tab can enter obscured page controls. Reduced-motion branch (:413-420) lacks dialog semantics and leaves LevelUpBackdrop fade animation intact. Provider auto-dismisses at `CelebrationContext.tsx:224`, with no restoration.

**Minimal repair:** reuse the app's existing modal/focus primitive; preserve level-up appearance, make normal/reduced modes share semantic dialog lifecycle, stop animations in reduced motion, restore prior connected focus target on dismissal/auto-dismiss. Existing PostSaveHandoff already implements focus/escape lifecycle and is a compatible reference (`handoff/PostSaveHandoff.tsx:92-132`). This is a functional accessibility correction, not a new visual design.

**Owned files:** `frontend/src/components/Celebrations/CelebrationPortal.tsx`; new `CelebrationPortal.accessibility.test.tsx`; context only if timer lifecycle needs adjustment.

**Acceptance:** P-T16 focus starts in dialog, Tab/Shift+Tab contained, Escape and Continue close, original focus restored; reduced-motion path same semantics with no animation; timer/unmount cleanup creates no subsequent focus theft.

## Corrections to the prior report

| Prior claim | Current result |
|---|---|
| Save only toast then redirect | STALE: SaveSuccessPanel is mounted, has PR/plan/challenge beats, Done controls navigation. Dormant PostWorkoutCelebration is not evidence that no celebration exists. |
| useGamificationRealtime has zero consumers | STALE globally; remaining canonical-shell gap is P-07. |
| Admin attention buttons are inert | STALE: handlers route to client profile and messages?composeTo. `Social/Messaging/MessagingView.tsx:72-103` consumes composeTo. |
| Onboarding cannot be discovered | STALE: ClientHomeTab mounts role-aware known-incomplete launch card. Preserve optional after-signup assessment; no forced wall. |
| Day-one home has no progressive disclosure | STALE: ClientDashboardHome.tsx:34,58,73 uses successfully settled zero history, renders first-session orientation and hides composer. Layout may still merit browser review; no verified new defect from emptiness alone. |
| No trainer intervention UI | STALE: UI is mounted; actual route shadow and failure truth defects are P-04/P-05. |
| Two active trainer plan builders | STALE: routeComponents.tsx:186-188 redirects Forge/Build Plan to planner. |
| Self logger has no last-weight help | TOO BROAD: ghostPreFill is skipped in self mode, but `WorkoutLogger.tsx:167` now mounts useLastWeightSuggestions. No removal of the explicit self-mode API boundary recommended without new self-safe contract. |
| Self-onboarding ends in anonymous/admin modal | NOT CONFIRMED on mounted self route: wrapper refreshes auth and navigates overview on completion. Generic wizard still contains staff/access copy; its existence alone is insufficient. A direct first-workout CTA is a product enhancement, not a verified critical failure. |

## Desktop/mobile wireframes for bounded fixes

These wireframes preserve existing dashboard/runner chrome, palette, 44px controls and information hierarchy.

### Client data loading/error (P-03)

Desktop:
```text
+ Workout logger / Client name or Loading client... -------------------+
| Client details unavailable. Your workout is still here. [Retry]      |
|----------------------------------------------------------------------|
| Exercises + logged sets (editable; existing content retained)        |
|                                                                      |
| Draft saved on this device            [Save: unavailable until retry]|
+----------------------------------------------------------------------+
```
Mobile:
```text
+ Workout logger -------------+
| Client details unavailable  |
| Your workout is still here. |
| [ Retry client details    ] |
|----------------------------|
| Squat  [sets retained]      |
| Draft status               |
| [ Save after retry        ] |
+----------------------------+
```
Loading uses truthful pending text; verified zero balance retains the existing credit message; 403 uses denied copy plus return action. Retry success does not clear inputs. Put failure in role=alert; focus stays on retry unless the user changes task.

### Offline receipt/recovery (P-01/P-02)

```text
Desktop: Workout logger | [2 workouts pending] [Review pending]
          Saved on this device for this account. Sync pending.
          Storage failure: Keep this screen open. [Retry save]
Mobile: + Pending workouts -----+
        | 2 awaiting sync        |
        | [ Review pending     ] |
        | [ Retry sync         ] |
        +------------------------+
```
Ownerless legacy entries must never be silently replayed. Present a recovery disclosure only when present, preserve stored data, and require review before any explicit adoption. Do not show another account's workout contents.

### Compliance (P-04/P-05)

Desktop:
```text
+ Client interventions / Needs attention ----------------- [Refresh] +
| [All] [Critical 2] [Warning 4] [Watch 1]                            |
| Client name | Overdue reason | [Open profile] [Check in]           |
| ERROR: Intervention data unavailable. [Retry]                      |
+-------------------------------------------------------------------+
```
Mobile:
```text
+ Client interventions ------+
| Data unavailable           |
| [ Retry                  ] |
+----------------------------+
| Success with records:      |
| Client name / Critical     |
| Reason wraps to next line  |
| [Open profile] [Check in]   |
+----------------------------+
```
Only existing admin actions retained; trainer profile action remains. Do not send messages automatically. Empty selected filter says No critical clients in this result; successful true-empty is distinct from denied/unavailable. Loading and error must not show reassuring zero KPI claims.

### Saved receipt and accessible level-up (P-06/P-08)

```text
Desktop: [Workout saved]  12 sets / confirmed volume
         New PR if server receipt proves it
         Billing detail only if known
         [Share] [Book next] [Done]

Mobile:  + Workout saved -----+    + Level up! ----------+
         | 12 sets confirmed  |    |        8             |
         | Confirmed PR       |    | [ Continue         ] |
         | [ Done           ] |    +----------------------+
         +--------------------+
```
Level-up modal traps focus and supports Escape in both motion modes; return focus on close. Saved inline panel uses existing status announcement and should not compete with a post-save modal. Keyboard, screen-reader and reduced-motion behavior are acceptance tests, not inferred from screenshots.

## Suggested slice grouping and checks

1. Queue durability/identity and client-info truth: P-01/P-02/P-03. Keep frontend-only except existing service seam; no provider/API spending. Parent explicitly selected this first slice.
2. Compliance route ownership/availability and operational UI: P-04/P-05. Minimal backend route export/mount change, synthetic SQL tests, no DB startup.
3. Saved receipt truth and accessible reward subscription: P-06/P-07/P-08. Preserve existing celebration and handoff implementations.

Frontend targeted command pattern (from frontend): `node node_modules/vitest/vitest.mjs run <exact selected test files> --reporter verbose`; then project type-check after implementation. Backend test command must use the existing repo runner and explicitly isolated dependency seams; no environment that resolves DATABASE_URL. Parent owns exact runtime setup/commands and full baseline.

No tests have been marked PASS here. The queue concurrency probe is FAIL at baseline. New P-T01 through P-T16 are planned and must be implemented and run by Luna; final combined Astra review must examine actual evidence. Real authenticated mobile/desktop, browser focus, backend mount-order runtime and release/deployment verification remain pending until parent completes them.
