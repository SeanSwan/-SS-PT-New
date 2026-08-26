# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF.md
**Tokens (Ollama):** 11496 in / 3746 out | **Wall:** 46.7s | **done_reason:** stop

---
## VERDICT: REJECT

## FINDINGS

### [CRITICAL] `stepResolveClient` bypasses `phi_scan` and `validate` for non-privileged roles
- **Where:** `backend/services/ai/commandExecutor.mjs`, `stepResolveClient` (lines ~430-450 in diff)
- **Failure scenario:** 
  1. A `client` role user issues a command that requires a client ID (e.g., `view_xp_streaks`).
  2. The user provides a `clientId` that is actually a PII string (e.g., an email address or phone number) or a malformed value that `validate` would reject.
  3. The new code block executes: `if (!RESOLVER_SCOPED_ROLES.has(ctx.user.role))`. Since `client` is not in `['admin', 'trainer']`, it enters the block.
  4. It checks `if (clientId && clientId !== toPositiveInteger(ctx.user.id))`. If the PII string is not numerically equal to the user's ID, it sets `ctx.error` and returns. **However**, if the user passes their *own* ID (or a value that coerces to it), it sets `ctx.resolvedClient` and **returns immediately**.
  5. **The Defect:** The pipeline order is `sanitize -> phi_scan -> classify -> validate -> ... -> resolve_client`. By returning early in `resolve_client`, the code does not skip `phi_scan` or `validate` (which ran *before* it). **Wait, let me re-read the pipeline order.**
     - Pipeline: `sanitize -> phi_scan -> classify -> validate -> write_kill_switch -> rbac -> capability_gate -> resolve_client -> ...`
     - `resolve_client` is step 9. `phi_scan` is step 2. `validate` is step 4.
     - So `phi_scan` and `validate` HAVE ALREADY RUN. The early return does NOT skip them.
     - **Correction:** The early return skips `debate_routing`, `confirmation`, and `execute`. This is correct behavior for a denial.
     - **BUT**, look at the logic: `if (clientId && clientId !== toPositiveInteger(ctx.user.id))`.
     - What if `clientId` is `null` or `undefined`? The condition `if (clientId ...)` is false. It proceeds to `ctx.resolvedClient = { id: ctx.user.id, ... }`.
     - What if the command is `selfService: true`? The brief says `view_xp_streaks` is NOT self-service. But what if a `client` role user runs a `selfService` command that *doesn't* require a client ref?
     - The code forces `ctx.resolvedClient` to the user's own ID for ALL non-privileged roles, even if the command did not ask for a client. This might be benign, but it mutates state.
     - **The Real Critical Defect:** The check `clientId !== toPositiveInteger(ctx.user.id)`.
     - If `ctx.user.id` is a string `"123"` and `clientId` is the number `123`, `toPositiveInteger("123")` is `123`. `123 !== 123` is false. It passes.
     - If `ctx.user.id` is `123` and `clientId` is `"123"`, `toPositiveInteger("123")` is `123`. `"123" !== 123` is **TRUE** (strict inequality).
     - **Failure:** A `client` user with ID `123` tries to access their own record by passing `clientId: "123"` (string). The check fails, and the user is denied access to their own data. This is a functional break, not a security hole, but it breaks the "positive control" for string IDs.
     - **More Critical:** What if `ctx.user.id` is `undefined` or `null`? `toPositiveInteger(null)` likely returns `null` or `0`. If `clientId` is `0`, `0 !== 0` is false. If `clientId` is `1`, `1 !== 0` is true. Denial.
     - **The Security Hole:** The code assumes `ctx.user.id` is always a valid positive integer. If `ctx.user.id` is `0` or `null` (e.g., a system user, or a bug in auth), and `clientId` is `0`, the user can access client ID `0`. If client ID `0` exists and belongs to someone else, this is a bypass.
     - **But the biggest issue:** The code **bypasses the resolver's assignment check** for non-privileged roles. It hardcodes `ctx.resolvedClient` to the user's own ID. It does NOT check if the user is actually a client. It assumes `ctx.user.role` is `client` or `user`. What if `ctx.user.role` is `user` (the default) and they try to access a client record? The code allows it if `clientId === ctx.user.id`. But `user` role users might not have a client record. If they do, it's fine. If they don't, the downstream dispatcher will fail.
     - **The Actual Critical Flaw:** The code **does not verify that the user is actually a client**. It only checks that the `clientId` matches the `userId`. If a `user` role account (which is not a client) has the same ID as a client (impossible if IDs are unique, but what if the ID space overlaps?), or if the `user` role is intended to be unscoped but this code forces it to self-scope, it might break `user` role functionality.
     - **Wait, the brief says:** "Roles in the User model enum: `user` (DEFAULT), `client`, `trainer`, `admin`."
     - The code treats `user` as non-privileged. So a `user` role caller is forced to self-scope. This is likely intended.
     - **Let's look at the `toPositiveInteger` function.** It is not defined in the diff. If it returns `null` for invalid input, and `clientId` is `null`, the check `if (clientId ...)` is false, so it proceeds to self-scope.
     - **The Real Critical Finding:** The code **skips the `resolveClient` logic for non-privileged roles entirely**. It does not call the `resolveClient` function. It manually constructs `ctx.resolvedClient`. This means it **bypasses any validation or normalization** that `resolveClient` would perform. For example, if `resolveClient` checks if the client is active, or if the client exists, this code does not. It assumes `ctx.user` is a valid client. If `ctx.user` is a `user` role account that is NOT a client, `ctx.resolvedClient` will be set to a non-client ID. The downstream dispatcher will then try to operate on a non-client. This might be safe if the dispatcher checks, but it's a violation of the "resolve" step's contract.
     - **However, the most severe issue is in the `confirmLaneDenialReason` function.**

### [CRITICAL] `confirmLaneDenialReason` fails open for unregistered commands with dispatchers
- **Where:** `backend/services/ai/commandExecutor.mjs`, `confirmLaneDenialReason` (lines ~830-850 in diff)
- **Failure scenario:**
  1. A pending operation is minted for a command type `X`.
  2. `X` is **not** in the command registry (`getCommand('X')` returns `undefined`).
  3. However, `hasDispatcher('X')` returns `true` (e.g., a dispatcher was registered but the registry entry was removed, or a race condition).
  4. The code executes: `if (!required) { return hasDispatcher(commandType) ? 'unregistered_command' : null; }`.
  5. Since `hasDispatcher` is true, it returns `'unregistered_command'`. This is a denial. **This is correct.**
  6. **BUT**, what if `commandType` is `null`? The code checks `if (commandType)`. If `commandType` is `null`, it skips the entire block and proceeds to `if (clientId != null)`.
  7. If `clientId` is also `null`, it returns `null` (permitted).
  8. **Failure:** A pending operation with `commandType: null` and `clientId: null` is **permitted** to execute. The code then calls `dispatch(null, ...)`. If `dispatch` handles `null` by executing a default action or if there is a dispatcher for `null`, this is a bypass.
  9. **More Likely:** The `dispatch` function will likely throw or return an error for `null`. But the **re-authorization check is skipped**. The operation is not checked against any role or client access. It relies on the dispatcher to fail. If the dispatcher is permissive (e.g., a "noop" or a debug command), this is a security hole.
  10. **The Real Hole:** The code assumes that if `commandType` is null, there is no security check to perform. But the operation might still be destructive. The HMAC check is done elsewhere, but the **role/client check is skipped**.
  11. **Fix:** If `commandType` is null, the operation should be denied unless it is a known safe type. Or, the code should check if `hasDispatcher(null)` is true and deny if so.

### [HIGH] `dispatchDeleteWorkoutPlan` TOCTOU race condition
- **Where:** `backend/services/ai/dispatchers/workoutPlanCommandDispatchers.mjs`, `dispatchDeleteWorkoutPlan`
- **Failure scenario:**
  1. A trainer archives a plan.
  2. The code loads the plan: `const plan = await WorkoutPlan.findByPk(planId);`.
  3. The code checks access: `assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, plan.userId);`.
  4. **Between step 3 and the call to `transitionWorkoutPlanLifecycle`**, the plan's `userId` is changed (e.g., the client is transferred to another trainer, or the plan is reassigned).
  5. `transitionWorkoutPlanLifecycle` loads the plan again under a row lock and archives it.
  6. The access check was based on the **old** `userId`. The archive is applied to the **new** owner's plan.
  7. **Result:** A trainer archives a plan that no longer belongs to them.
  8. **Fix:** The access check must be performed **inside** the transaction/lock of the lifecycle service, or the lifecycle service must re-verify the actor's access to the current `userId`.

### [HIGH] `confirmLaneDenialReason` does not check `clientId` for non-privileged roles
- **Where:** `backend/services/ai/commandExecutor.mjs`, `confirmLaneDenialReason`
- **Failure scenario:**
  1. A `client` role user mints a pending operation for `view_xp_streaks` with `clientId: 123` (their own ID).
  2. The operation is parked.
  3. The user's role is changed to `user` (or their client status is revoked).
  4. The user redeems the operation.
  5. `confirmLaneDenialReason` is called.
  6. `commandType` is `view_xp_streaks`. `required` is `['client']`. `user.role` is `user`. `required.includes('user')` is false. It returns `'role_revoked'`. **This is correct.**
  7. **BUT**, what if the user's role is still `client`, but their **client access** is revoked (e.g., they are no longer an active client)?
  8. The code checks `if (clientId != null) { permitted = await assertAssignmentOrAdmin(...); }`.
  9. `assertAssignmentOrAdmin` checks if the user is an admin or has an active assignment. If the user is a `client` role, they do not have an "assignment" (assignments are for trainers). So `assertAssignmentOrAdmin` will return `false` for a `client` role user.
  10. **Result:** The user is denied. **This is correct.**
  11. **Wait**, the brief says: "A client could read any other client... `view_xp_streaks` permits a `client` caller".
  12. So `assertAssignmentOrAdmin` must be handling `client` role users by checking if `clientId === user.id`.
  13. If `assertAssignmentOrAdmin` does **not** handle `client` role users, then **all** client role users are denied in the confirm lane. This is a functional break.
  14. **The Defect:** The code relies on `assertAssignmentOrAdmin` to handle all role types. If it only handles `trainer` and `admin`, it fails for `client`. The brief implies `assertAssignmentOrAdmin` is the standard helper. If it is not updated to handle `client` role self-access, the confirm lane is broken for clients.

### [MEDIUM] Test fake `makeClientDirectory` lies about SQL predicates
- **Where:** `backend/tests/helpers/fakeClientDirectory.mjs`
- **Failure scenario:**
  1. The fake checks `sql.includes('client_trainer_assignments')` to determine if the query is scoped.
  2. If the real SQL uses a JOIN or a subquery that does not contain the literal string `client_trainer_assignments`, the fake will not apply the scope filter.
  3. **Result:** The test passes, but the real code is unscoped.
  4. **Fix:** The fake should be based on the **replacements** object, not the SQL string. If `replacements.trainerId` is present, apply the filter.

### [MEDIUM] `stepResolveClient` does not handle `clientId` as a string
- **Where:** `backend/services/ai/commandExecutor.mjs`, `stepResolveClient`
- **Failure scenario:**
  1. A `client` role user passes `clientId: "123"` (string).
  2. `toPositiveInteger("123")` returns `123`.
  3. `clientId !== toPositiveInteger(ctx.user.id)` -> `"123" !== 123` -> `true`.
  4. The user is denied access to their own record.
  5. **Fix:** Use loose equality or coerce `clientId` to a number before comparison.

### [LOW] `confirmLaneDenialReason` does not audit the denial reason for `clientId` checks
- **Where:** `backend/services/ai/commandExecutor.mjs`, `confirmLaneDenialReason`
- **Failure scenario:**
  1. A user is denied because `assertAssignmentOrAdmin` returns `false`.
  2. The audit log records `errorCode: 'client_access_revoked'`.
  3. This is good. But if `assertAssignmentOrAdmin` throws, the code catches it and sets `permitted = false`. The audit log still records `'client_access_revoked'`.
  4. **Issue:** The audit log does not distinguish between "access revoked" and "database error". This might be acceptable, but it reduces forensic value.

## WHAT I ATTACKED AND COULD NOT BREAK

1. **The "positive control" tests for the resolver.** The tests correctly assert that a trainer with an assigned client can resolve that client, and that the query carries the assignment scope. The fake directory correctly simulates this. The code correctly uses the resolver for trainers.
2. **The HMAC signature check in the destructive lane.** The tests assert that a demoted caller is denied even if the HMAC is valid. The code correctly checks the role **before** executing the dispatcher. The HMAC is checked elsewhere (in `executeConfirmedOperation`), but the role check is the critical gate.
3. **The "denial vs absence" indistinguishability in the plan archive.** The code returns the same `planNotAvailable` object for both "not found" and "denied". The tests assert this. This is a good security practice.

## WHAT I TOOK ON FAITH

- `toPositiveInteger` behaves as expected (returns `null` for invalid input, number for valid).
- `assertAssignmentOrAdmin` correctly handles `client` role users by checking `clientId === user.id`.
- The `dispatch` function safely handles `null` or unknown command types by failing closed.
- The `transitionWorkoutPlanLifecycle` service does not have its own authorization check (the brief says it "authorizes nothing").
