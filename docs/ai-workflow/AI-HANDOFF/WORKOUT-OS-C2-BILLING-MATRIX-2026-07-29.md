---
decision: "C2 billing gate: deduction is TARGET-client-based only; current semantics preserved byte-for-byte this batch; owner-personal-logger credit burn + TrainerPermissions fail-open documented for Sean's ruling"
status: open
supersedes: none
---

# WORKOUT OS — C2 Billing/Deduction Matrix (GATE artifact, 2026-07-29)

**Why this exists:** §12-C2 blocks any logger-convergence ship until the deduction semantics per logging context are documented and Sean-signed (Kimi 2.1 — "nobody has ever defined whether a session credit gets deducted when a trainer logs for a client vs. the client logging themselves"). Per §13 HR-5: this batch **changes ZERO deduction behavior** — this doc records verified current truth; Sean's sign-off either ratifies it or orders a follow-up slice.

## 1. The one rule that answers Kimi's question

**A session credit deducts based on WHO THE WORKOUT IS FOR — never on who logs it.** `[VERIFIED]` `buildWorkoutSessionBillingDecision(client, …)` receives only the TARGET client row; `req.user.role` / trainer id / self-log flags appear nowhere in the money branch (`backend/routes/dailyWorkoutFormRoutes.mjs:837-848`, `:1108-1114`; `backend/services/sessionBillingPolicy.mjs:136-200`).

A credit deducts iff ALL hold (else no deduction; insufficient credits = hard 400 + rollback):
1. Target is a deducting client: `clientSource` ∉ {`move_fitness`, `external`} AND `sessionBillingMode` ≠ `no_session_required` (`sessionBillingPolicy.mjs:96-105,137`).
2. Linked scheduled session not already deducted (`:151`).
3. Not a non-billable planned assignment (off-day homework never bills — route test locks this) (`:161`).
4. `creditsRequired ≥ 1` (multi-credit session types honored) (`:171`).
5. `availableSessions ≥ creditsRequired` — else 400, save rolled back (`:181-191`).

## 2. The matrix (current production semantics — all four contexts POST the same `/api/workout-forms`)

| Who logs → for whom | Authorization gate | Deduction |
|---|---|---|
| Client/user self-log | self-id match only (`authMiddleware.mjs:665`; handler `:687`) | Rule §1 vs THEIR row |
| Trainer → assigned client | active `ClientTrainerAssignment` (fail-closed, `authMiddleware.mjs:677-688`) + `edit_workouts` permission (fail-OPEN, see §4) + in-txn re-check | Rule §1 vs CLIENT row — identical to self-log |
| Admin → any client | admin bypass (`authMiddleware.mjs:647`) | Rule §1 vs CLIENT row — identical |
| **Admin personal** (`/dashboard/admin/log-my-workout`, `forceSelfMode`) | self-id match | **Rule §1 vs the ADMIN'S OWN user row** — see §3 |

Route-level tests already lock: 1-credit deduct + schedule completion stamp, multi-credit `creditsRequired`, insufficient-credit 400, zero-credit assessment, no-double-deduct, Move Fitness free tracking, homework-no-deduct (`backend/__tests__/dailyWorkoutFormRoutes.scheduleBillingPolicy.test.mjs:236-395`, `plannedAssignment.test.mjs:214,232`).

## 3. ⚠ DECISION NEEDED (Sean): owner personal logging burns a paid credit

`[VERIFIED]` The admin's own `User` row defaults to `clientSource: 'swanstudios'` + `sessionBillingMode: 'paid_sessions'` (`backend/models/User.mjs:455,464`). So "Log My Workout": with 0 credits → **400 "no available sessions remaining"**; with credits → **decrements the owner's own paid credits**. No test covers this context.

Options (pick one; none shipped this batch):
- **(a) Data-only fix (recommended, zero code):** set `sessionBillingMode='no_session_required'` on Sean's own account(s). Instant, reversible, no behavior change for anyone else.
- (b) Code fix: billing skip when `isSelfWorkoutLogActor && role==='admin'` + route test. One conditional in the money path — needs its own slice + review.
- (c) Leave as-is (owner tracks his own credits deliberately).

## 4. TrainerPermissions gate — ACCEPTED-WITH-REASON (gate S4.1)

The `edit_workouts` permission check is **fail-open** (zero rows → grant; query error → grant; `dailyWorkoutFormRoutes.mjs:518-557`, deliberate 2026-05-01 semantic, unit-locked). Root cause of SWA-87 confirmed: two incompatible migrations for one table (July camelCase raw vs August snake_case no-op-guarded) while the model maps snake_case — mounted `/api/trainer-permissions` throws; its green tests fully mock the model. **Reason for acceptance now:** the practical who-may-log gate is the ASSIGNMENT layer, which is fail-closed (403 without an active assignment; catch → 500). The schema repair needs a production `information_schema` probe + rolling migration — its own slice under SWA-87, NOT smuggled into a UI batch.

## 5. What C2 shipped instead of a merge (evidence-driven rescope)

The blueprint's "2 competing trainer loggers" was stale: `EnhancedWorkoutLogger` is a 205-line client-resolution WRAPPER mounting the canonical `WorkoutLogger` (`EnhancedWorkoutLogger.view.tsx:12,131`); `AdminPersonalWorkoutLogger` is a 37-line `forceSelfMode` wrapper (`:29-33`); all three surfaces converge on ONE `useWorkoutSubmit → POST /api/workout-forms` (`useWorkoutSubmit.ts:147`, `nasmApiService.ts:718-724`). Role-parameterization ALREADY EXISTS (`forceSelfMode`, `/my/info` vs `/client/:id/info` branch). Retiring the wrappers would remove working glue, not a competitor — **wrappers stay**. C2's shipped change is the set-state calm-down (see C2 receipt in the program blueprint §13 + `ExerciseSetRow.trainTokens.contract.test.ts`).

Trainer sidebar "Log Workout" stays on the client-picker intent flow (pinned contract + HR-7 default; the flow lands in the same canonical logger).
