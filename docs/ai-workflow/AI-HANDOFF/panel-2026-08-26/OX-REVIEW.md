# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF.md
**Seed:** (none)
**Tokens:** 10846 in / 11354 out · **Cost:** ~$0.0000 · **Wall:** 453.2s · **finish:** stop

---

## VERDICT: REVISE

Fix #1 (resolver scoping) is structurally sound. Fix #2 (dispatcher-side plan check) is sound. Fix #3 (confirm-lane re-auth) has a class-level hole, an invariant violation against your own documented admin-superset decision, and an untested allow-branch. The test suite has real positive controls (rare and commendable) but the SQL-mirror fake can certify queries PostgreSQL would answer differently, and one entire branch of the new gate is never exercised.

---

## FINDINGS

### [CRITICAL] Confirm-lane re-auth is vacuous for destructive operations whose target client is not in `params.clientId`
- **Where:** `commandExecutor.mjs` — `const clientId = operation.params?.clientId ?? null;` (destructive lane) vs `operation.clientId ?? null` (non-destructive lane)
- **Failure scenario:** The two lanes read the target client from *different sources*. `delete_workout_plan` is destructive, HMAC-confirmed, and carries its target in `params.planId` — `params.clientId` is absent, so `clientId` is `null`, the `if (clientId != null)` block is skipped, and the *only* re-auth applied is the role check. A trainer mints `delete_workout_plan` for an assigned client, the assignment is revoked at t+30s, the trainer redeems at t+60s: role still `trainer` → passes; clientId `null` → skipped; dispatch runs. Today the plan survives only *incidentally*, because fix #2 happens to put a check inside that particular dispatcher. Any destructive command whose target identifier is not literally `params.clientId` and whose dispatcher does not self-gate gets **zero** client re-authorization — and "dispatcher self-gating" is on your own not-proven list. Worse, the asymmetric sources mean an operation where `operation.clientId` and `params.clientId` disagree gets checked against one and executed against the other. The test suite masks this completely: `mintDestructive()` always sets `commandParams.clientId`, so the "checks the destructive lane's client too" test cannot distinguish "checked the right client" from "checked whatever field happens to exist."
- **Fix:** Resolve the target client per-command at redemption (registry-declared accessor, e.g. `targetClientFromParams`), or persist the authorized `clientId` on the operation at mint time and read *that* in both lanes.
- **Confidence:** High on the code path; medium on exploitability, since I cannot see whether every destructive dispatcher self-gates. That uncertainty is itself the finding — fix #3 must not depend on it.

### [HIGH] The role check breaks the documented admin-superset invariant at redemption
- **Where:** `confirmLaneDenialReason` — `if (!required.includes(user.role)) return 'role_revoked';`
- **Failure scenario:** Everywhere else, `admin` is the deliberate superset (`assertAssignmentOrAdmin` special-cases it; the resolver names admin scoped-by-design; your own test suite pins "admin is the superset role, deliberately"). This check does exact membership. Any confirmed command whose `roleRequired` omits `'admin'` bricks the admin: pipeline rbac lets the admin mint the pending op, then redemption denies with `role_revoked` — and because retrieval is single-use, **the op is consumed by the denial**. The admin cannot ever complete a legitimately minted operation. No test redeems as admin, so the suite is blind to this.
- **Fix:** `if (user.role !== 'admin' && !required.includes(user.role)) return 'role_revoked';` — or prove every confirmed command lists `admin` and pin that with a registry-wide assertion.
- **Confidence:** High that the asymmetry exists; medium on how many registry entries omit `admin` (I cannot enumerate the 139).

### [HIGH] One entire branch of the new gate is the *allow* branch — and it is never tested
- **Where:** `confirmLaneDenialReason` — `return hasDispatcher(commandType) ? 'unregistered_command' : null;`
- **Failure scenario:** Every test either has a registered command or mocks `hasDispatcher` to `true`. The path `commandType` unregistered **and** `hasDispatcher` false returns `null` — permit — with no role check and no client check having run. In the non-destructive lane the gate is called unconditionally after retrieval; if that lane's subsequent dispatch is not itself behind a `hasDispatcher` guard (not visible in the diff), an operation minted with a stale/renamed `commandType` redeems through the gate untouched. Your own comment argues this is safe because "nothing can execute either way" — that is an argument, not an assertion, and it is the only unconditional-allow path in the fix.
- **Fix:** Add the missing test: mint with an unknown type, mock `hasDispatcher` false, assert the outcome explicitly (whatever it should be). If the correct outcome is "proceed to not_wired," assert that dispatch is *not* reached rather than inferring it.
- **Confidence:** High that the branch is untested; medium on blast radius (depends on unseen code between the gate and dispatch in the nd lane).

### [HIGH] `commandType` null skips the entire role check in the non-destructive lane
- **Where:** `confirmLaneDenialReason` — `if (commandType) { ... }`
- **Failure scenario:** If `operation.commandType` is null/undefined on a pending op, the role check is skipped wholesale; combined with `clientId` null, `confirmLaneDenialReason` returns `null` having performed **no checks at all**, and the nd lane proceeds. Whether this is mintable depends on `preparePendingConfirmation`'s validation, which I cannot see — but your own test mints with `clientId: null`, proving nullable fields reach the stored operation, and defensive gates should not hinge on the minter's discipline.
- **Fix:** Treat null `commandType` on a *stored* operation as denial (`'malformed_operation'`). Null was defensible as an input-guard; on a persisted record it is an unauthenticated shape.
- **Confidence:** Medium — mintability unverifiable from the diff.

### [HIGH] The SQL-mirror fake certifies predicates, not queries — and lies in at least three ways
- **Where:** `backend/tests/helpers/fakeClientDirectory.mjs` — `sql.includes('client_trainer_assignments')`, `sql.includes('"isActive" = true')`, `sql.includes("role = 'client'")`
- **Failure scenario:** (a) *Presence ≠ constraint:* a resolver query that JOINs `client_trainer_assignments` for enrichment, or scopes with `WHERE (... OR :trainerId IS NULL)` (a classic fail-open escape hatch), contains the substring — the fake filters, the suite goes green, PostgreSQL returns the foreign client. (b) *Exact-quote brittleness:* if the real query emits `"isActive" IS TRUE`, a bound parameter, or different identifier casing, `filtersActive` is false, the fake filters *nothing*, and — depending on fixture construction — either everything passes because the JS-level gate catches it (and the SQL layer is never actually tested) or fixtures leak. (c) *Semantics drift:* `(a.status || 'active') === 'active'` hardcodes the assignment-status model; if real assignments carry effective-date windows, the fake grants access for expired assignments. All three mean the "sends the assignment scope to the database" test asserts that a *string was sent*, not that a *restriction was applied*. The 29/29 mutation score is measured against this same mirror, so mutations of SQL text mutate the fake's trigger strings, not database semantics.
- **Fix:** Smallest honest improvement: assert on the parsed predicate structure (or run these specific contracts against a real Postgres in CI — which you currently cannot, see no-CI below). At minimum, add a negative control proving the fake *denies* when the scope substring is present but `replacements.trainerId` is a *different* trainer — today nothing proves the fake's filter binds to the caller rather than to any value.
- **Confidence:** High on the design fragility; I could not run the real resolver's SQL.

### [MEDIUM] Self-check uses strict typed comparison — legit self-access denied on string ids
- **Where:** `stepResolveClient` — `if (clientId && clientId !== toPositiveInteger(ctx.user.id))`
- **Failure scenario:** `ctx.intent.params.clientId` arrives as the string `"7"` (classifier/LLM output is routinely stringified) and `ctx.user.id` is numeric `7`: `"7" !== 7` → the caller is denied access to **their own record** with "You can only run this on your own record." Every voice/NL-originated numeric parameter is a candidate. Availability/correctness defect, and it trains users that the lane is broken.
- **Fix:** `if (clientId && toPositiveInteger(clientId) !== toPositiveInteger(ctx.user.id))`.
- **Confidence:** High on the strict-inequality behavior; medium on whether upstream coerces params before step 6.

### [MEDIUM] The non-privileged branch injects `params.clientId` into *every* command, after validation, whether or not the command has one
- **Where:** `stepResolveClient` — `if (ctx.intent.params) ctx.intent.params.clientId = ctx.user.id;`
- **Failure scenario:** The branch fires for *all* non-privileged callers on *all* commands, not just `requiresClientRef` ones. Validation ran at step 4; this mutation happens at step 6 and is never schema-checked. Any command permitted to `user`/`client` whose params happen to carry a `clientId` key with *different* semantics (or whose dispatcher reads `params.clientId` optionally) now silently receives the caller's id stamped into it. Also: when `ctx.intent.params` is undefined, the injection is skipped entirely while `ctx.resolvedClient` is still set — so downstream consumers see a resolved client with no corresponding param, an inconsistency the old name-resolution path may not have produced (that code is not in the diff; see faith section).
- **Fix:** Gate the injection on the command declaring a client-ref requirement, and inject through the same code path the existing branches use.
- **Confidence:** Medium — depends on unseen dispatcher param contracts.

### [MEDIUM] The early return skips the remainder of `stepResolveClient`, including whatever DB validation the direct-id path performs
- **Where:** `stepResolveClient` — the new branch `return ctx;` before `if (clientId) { ... }`
- **Failure scenario:** The direct-id path (per the fake's model) hits the database with `isActive` and `role = 'client'` filters. The new branch does **zero** database work: it constructs `resolvedClient` from `ctx.user` alone. A deactivated user with a still-valid session/token — or a `user`-role caller being resolved as if they were a client row — gets a resolved client that the old path's `isActive`/`role` filters would have refused. Whether earlier steps (rbac) re-validate account state determines if this is exploitable or merely a parity gap with the REST lane's "anything middleware gets, this lane must do itself" rule.
- **Fix:** Either route the self-case through the same scoped query (`WHERE id = :id` with the caller's id) or document why ctx.user is trusted as already-active.
- **Confidence:** Medium — the elided body of `stepResolveClient` is not in the diff; this is the largest thing I could not inspect.

### [MEDIUM] Ordering is tested, not guaranteed — and the static scan has a blind spot
- **Where:** confirm-lane test, "reaches a dispatcher only after a re-authorization, in that order"
- **Failure scenario:** The source-scan regex matches only `await dispatch(`. A fire-and-forget `dispatch(...)` (no await), a `void dispatch(...)`, or a dispatch inside a helper function called from `executeConfirmedOperation` is invisible — the counter stays balanced and the test passes with an ungated dispatch in the lane. Similarly, "kill switch before re-auth" is asserted behaviorally for one env value, not enforced by construction; a refactor moving the retrieval above the switch passes every outcome test and only the single `assertAccessMock`-not-called assertion notices — if anyone keeps that assertion when editing.
- **Fix:** Match `/\bdispatch\(/` without the await prefix (over-matching is fine — it fails loud), and/or wrap dispatch in a local `gatedDispatch` helper so the gate is structural, not positional.
- **Confidence:** High on the regex gap.

### [MEDIUM] A never-settling `assertAssignmentOrAdmin` promise hangs redemption and burns the single-use operation
- **Where:** `confirmLaneDenialReason` — `permitted = await assertAssignmentOrAdmin(...)`
- **Failure scenario:** You asked; here it is: the authorizer's connection hangs (pool leak, lost socket without TCP RST). The `catch` handles rejection, not suspension. The await never resolves, the HTTP request hangs until timeout — and because retrieval already deleted the pending operation, the caller's legitimately minted op is gone. Repeatedly: a transient infra pathology converts into permanent loss of confirmed operations. (Related: the bare `catch {}` also converts *programming* errors into `client_access_revoked` audit rows, poisoning the exact forensics trail the test celebrates.)
- **Fix:** Race the authorizer against a timeout; distinguish timeout error-code from revocation error-code in the audit row.
- **Confidence:** High on mechanics; low on real-world frequency.

### [LOW] Full-suite verification compares failing files as a SET — intra-file regressions are invisible
- **Where:** Verification claim: "failing-file set byte-identical to recorded baseline (23 files), compared as SETS"
- **Failure scenario:** A known-failing file goes from 1 failing test to 200; the set is unchanged; the claim reports green. Set equality is a much weaker statement than it reads as.
- **Fix:** Compare per-file failing-*test* counts, or just failing-test names.
- **Confidence:** High — arithmetic.

### [LOW] Four ways to say "no," and they are not all indistinguishable
- **Where:** `dispatchDeleteWorkoutPlan` denial design + test "tells an unassigned trainer nothing a stranger would not learn"
- **Failure scenario:** The three `planNotAvailable` shapes are unified (good), but the fourth path — `findByPk` throwing — propagates as a pipeline error with a *different* message shape ("command lane failed"), distinguishable from not-found. And timing distinguishes the unified ones: missing plan = 1 query, denied = 2, permitted = 3. An id-walker with a stopwatch learns which ids exist. The REST middleware presumably has the same timing profile (parity), so this is a shared weakness, not a new one — but the test's indistinguishability claim is about shape only and would not catch a future audit-write that occurs on one denial path and not another.
- **Fix:** Document the residual channel; add constant-time or uniform-audit treatment if threat model warrants.
- **Confidence:** High on the shape/timing facts; low on practical exploitability.

### [NIT] Dead signal and weak assertions in the ownership suite
- **Where:** `schemaConverged: fixture.ok` is computed and never asserted; `JSON.stringify(foreign.ctx.result || {})` stringifies `{}` when result is unset at `resolve_client`, so the "must not disclose Foreign" assertion trivially passes today and only becomes meaningful if result is ever populated at that stage.
- **Failure scenario:** None today; both are tripwires that will silently rot.
- **Fix:** Assert `foreign.ctx.result` is undefined explicitly (making the intent load-bearing), or drop the stringify.
- **Confidence:** High.

### [OPINION] `CONFIRM_NO_LONGER_PERMITTED_MESSAGE` tells a caller whose *lookup failed transiently* to "re-issue the command"
- During a database incident, this converts every in-flight confirmed operation into an instruction to retry — a self-inflicted retry storm precisely when the system is least able to absorb one. The generic message is right for revocation privacy; consider a distinct internal-only code and letting the transport decide what the user hears.

---

## WHAT I ATTACKED AND COULD NOT BREAK

1. **Empty-sweep vacuity in the pair-sweep tests.** Both sweeps carry positive controls (`pairsTested > 0`, the assigned-trainer control, the own-record control) that fail loudly if the surface evaporates or the harness never reaches the gate. This is the rare suite that defends against its own subject disappearing. Held.
2. **Fail-closed behavior of both new gates under authorizer failure.** The dispatcher-side test kills the model cache and asserts no transition; the confirm-lane test rejects the authorizer and asserts no dispatch — and the comment correctly identifies that only a rejecting-authorizer test catches the `permitted = true` mutation. Held, for *throw*; the *hang* case is the MEDIUM above.
3. **Denial/absence shape unification including the raced third path.** The `withoutEcho` comparison covering found-but-denied, missing, and locked-and-gone is genuinely tighter than most production code manages, and the single-helper refactor makes drift structurally hard. Held for the three shapes it covers (the throw path is the LOW above).

## WHAT I TOOK ON FAITH

- **The elided body of `stepResolveClient`** after the `if (clientId)` block — what the early return actually skips beyond name resolution (activity checks, telemetry, confirmation-message inputs). This is the basis of a MEDIUM and I could not read it.
- **`preparePendingConfirmation` / `prepareDestructiveOperation` mint-time validation** — whether `commandType: null` or disagreeing `clientId`/`params.clientId` pairs are mintable. Two findings' severity hinge on this.
- **Real `assertAssignmentOrAdmin` semantics** — admin handling (my HIGH assumes it special-cases admin as the rest of the system does), string-id coercion, status/date windows, and whether it can suspend rather than reject.
- **That no destructive dispatcher other than the workout-plan one self-gates** — handlers are mocked throughout, per your own not-proven list; my CRITICAL assumes the worst consistent with that admission.
- **The 29/29 mutation harness** — its independence from the mirror fake, and that mutated files were restored (sha256 claim accepted, not recomputed).
- **`transitionWorkoutPlanLifecycle`'s row lock** actually serializing the second read against concurrent reassignment (the TOCTOU analysis assumes the lock exists and covers `userId`).
- **9719 passing tests and the 23-file baseline** — numbers on a page; no CI exists to reproduce them, which is itself the standing risk your not-proven list correctly names but underweights: with billing-blocked Actions, *none* of this is re-verifiable by anyone but the author, on the author's machine, once.
