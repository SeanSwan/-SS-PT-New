# HOSTILE REVIEW BRIEF — Swan Coach ownership authorization (3 fixes, 9 commits) — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF.md
**Tokens:** 10729 in / 20947 out (reasoning: 16514) | total 31676
**Wall:** 409.1s

---

## VERDICT: REVISE

The direction of all three fixes is right and the positive-control discipline in the tests is genuinely good. But fix #3's central premise ("current role") is only as current as the auth context it is handed, the destructive lane's client re-auth depends on a field the test fixture fabricates rather than one production is proven to mint, and the SQL-mirror fake can vouch for queries that do not constrain. None of these is provably exploitable from the diff alone; all of them are exactly the kind of hole this review exists to catch.

## FINDINGS

### [HIGH] Fix #3 re-checks the caller's role from the passed `user` object — if auth context carries a stale role, the "revoked within 120s" scenario is still open
- **Where:** `commandExecutor.mjs`, `confirmLaneDenialReason` — `if (!required.includes(user.role)) return 'role_revoked';` and `assertAssignmentOrAdmin(user.id, user.role, clientId)`.
- **Failure scenario:** Admin A is demoted to `user` at t=0. If `req.user` is hydrated from a JWT/session with the role embedded (common, and invisible in this diff), `user.role === 'admin'` for the token's remaining lifetime. At t=100s A redeems the HMAC-signed destructive op minted at t=10s: `required.includes('admin')` passes, and `assertAssignmentOrAdmin(id, 'admin', clientId)` presumably short-circuits true on role alone → dispatch. Defect 3, the exact scenario the fix claims to close, remains open for the token TTL. The tests cannot catch this: they pass literal `{id, role}` objects, so they prove the gate obeys its argument, not that its argument is fresh.
- **Fix:** Re-fetch the role (one `User.findByPk(user.id)` or equivalent) inside `confirmLaneDenialReason` and check the fetched role; or assert a token-version/role-epoch check on this lane.
- **Confidence:** Medium-high that this is the weakest joint of fix #3; I could not see how `user` reaches `executeConfirmedOperation` in production. If users are loaded from the DB per request, downgrade this to a documentation requirement.

### [HIGH] The destructive lane's client re-auth keys on `operation.params?.clientId` — the field the test mints by hand, not one production is shown to mint
- **Where:** `commandExecutor.mjs`, destructive path: `const clientId = operation.params?.clientId ?? null;` before `confirmLaneDenialReason(commandType, clientId, user)`.
- **Failure scenario:** Trainer T's assignment to client C is revoked at t=0. T redeems a destructive op at t=60s whose params are `{ sessionId: 9 }` — no `clientId`, which is precisely the shape your own `mintDestructive` would have without the hand-added `clientId: OWN_CLIENT`. `confirmLaneDenialReason(type, null, user)` skips the assignment check entirely; whether revocation is enforced now depends solely on that command's dispatcher having its own gate (see next finding). The test suite fabricates the exact field the check reads, so it passes whether or not production ever populates it.
- **Fix:** Extract one canonical target — `operation.clientId ?? operation.params?.clientId ?? null` — and use it for both lanes and the audit row; add a test that mints via the real pipeline mint path, not hand-built params.
- **Confidence:** High that the two lanes read different sources and that this is unverified; low-visibility because I cannot see `prepareDestructiveOperation`'s production call sites.

### [HIGH] The plan-archive fix is one dispatcher deep; the class of hole (`requiresClientRef:false` + caller-supplied record id) is not closed
- **Where:** `workoutPlanCommandDispatchers.mjs` only; no systemic change to dispatch or the registry.
- **Failure scenario:** `delete_workout_plan` was one instance of "declares `requiresClientRef:false`, passes a caller-supplied id to a service that authorizes nothing." Any sibling dispatcher — session cancel by `id`, program delete by `programId`, message delete by `messageId` — has the identical shape. Your own confirm-lane fixture (`/api/sessions/9/cancel`, params `{ id: 9 }`) shows such commands exist. A trainer revoked from client C cancels C's session by id; rbac passes (role is fine), resolve applies no scope, and unless that dispatcher privately calls `assertAssignmentOrAdmin`, the archive bug survives under a different command name.
- **Fix:** Audit every command with `requiresClientRef:false` that takes an entity id (a registry query, not a code change), and either add the dispatcher-side assert to each or assert-and-document per command that the id is caller-scoped.
- **Confidence:** High that the fix is per-instance; I cannot enumerate the other 138 commands from this diff, which is itself the finding.

### [HIGH] The mirror fake vouches for scoping on table-name *mention* and exact SQL strings — it can pass while the real query leaks, and misdeliver rows on string drift
- **Where:** `fakeClientDirectory.mjs` — `const scopedByAssignment = sql.includes('client_trainer_assignments');` and `if (sql.includes('WHERE id = :id'))`.
- **Failure scenario (lie #1):** The resolver SQL is refactored to `FROM clients c LEFT JOIN client_trainer_assignments a ON a.clientId = c.id` with no constraining predicate. The string still contains the table name → the fake filters to assigned clients → all 30+ trainer ownership assertions stay green while production returns every client. Failure scenario (lie #2): the direct-id branch drifts to `WHERE "id" = :id` (quoted). The `includes('WHERE id = :id')` test misses → the fake falls through to the full-list branch and the resolver destructures element 0 — an arbitrary *assigned* client, not the requested one. The foreign-id denial tests then pass because the foreign row was pre-filtered out, not because the lookup honored `:id`. Both are "the SQL changed, the tests didn't notice, and the failure direction is false-pass."
- **Fix:** Require a constraining predicate (e.g., assert `replacements.trainerId` appears bound in a WHERE/JOIN-ON clause, not merely that the table is named), and make the id-lookup branch fail loudly (`throw new Error('unrecognized lookup shape')`) instead of falling through to the list scan.
- **Confidence:** High on the mechanism; admitted-unverifiable against real PostgreSQL, which is why the fake must fail visible, not silently re-interpret.

### [MEDIUM] Redemption re-auth omits the capability gate — the fix re-runs a *subset* of the pipeline's checks while claiming parity
- **Where:** `commandExecutor.mjs`, `confirmLaneDenialReason` — checks `roleRequired` and assignment only; `authorizeCommandCapability` (pipeline step 5) is never re-run.
- **Failure scenario:** Trainer T has capability X revoked at t=0 (capability policy is a distinct step from rbac, so presumably a distinct revocable grant). T redeems at t=60s: role fine, assignment fine → a capability-revoked command executes. The docblock claims this asks "what every other gate in this lane asks" — it does not; capability_gate is one of those gates.
- **Fix:** Call `authorizeCommandCapability(command, user)` inside `confirmLaneDenialReason` and deny with a third reason code.
- **Confidence:** Medium — I cannot see whether capabilities are static per command or dynamically revocable. If static, this is documentation; if revocable, it is a real gap.

### [MEDIUM] The two confirm lanes read the target client from different fields — the gate can check a different id than dispatch uses
- **Where:** `commandExecutor.mjs` — non-destructive: `confirmLaneDenialReason(operation.commandType, operation.clientId ?? null, user)` then `dispatch(..., operation.params, ...)`; destructive: `operation.params?.clientId ?? null`.
- **Failure scenario:** A mint stores `clientId: A` at the top level (from `ctx.resolvedClient.id`) while `params.clientId` is `B` (raw caller input that the pipeline overwrote too late, or a hand-minted op). The non-destructive gate verifies the caller still holds A; dispatch runs with B, which was revoked. Nothing enforces `operation.clientId === operation.params.clientId`.
- **Fix:** One canonical extraction used for gate, dispatch, and audit; assert equality and deny on mismatch (`'target_mismatch'`).
- **Confidence:** Medium — requires a mint-shape defect to fire, but the defense should not depend on mint discipline it doesn't check.

### [MEDIUM] Client-role callers redeeming their own confirmed ops hit an identity-model fork: `assertAssignmentOrAdmin(self, 'client', self)` — permanent denial or an untested special case
- **Where:** `confirmLaneDenialReason`'s assignment branch applied to the self-resolution produced by fix #1.
- **Failure scenario:** Client C confirms a permitted op on their own record (pipeline self-scope allows it — fix #1 explicitly enables this). At redemption, `assertAssignmentOrAdmin(C.id, 'client', C.id)` looks for `ClientTrainerAssignment{trainerId: C.id}` — a client is not their own trainer → `'client_access_revoked'`. Either every client-role redemption is permanently denied (availability break, and two layers disagreeing about who a client is), or `assertAssignmentOrAdmin` special-cases self and no test pins which it is. The confirm-lane tests use TRAINER/DEMOTED only; no client-role redemption is ever exercised.
- **Fix:** Short-circuit `clientId === user.id` → permitted (matching fix #1's own rule), and add a client-role redemption test.
- **Confidence:** Medium-high on the inconsistency; low visibility on impact because I don't know which confirmed commands permit `client`.

### [MEDIUM] The self-resolution early return skips the directory predicates the scoped path enforces — a deactivated client resolves
- **Where:** `commandExecutor.mjs`, `stepResolveClient` non-privileged branch — fabricates `ctx.resolvedClient` from `ctx.user` without any query, so `"isActive" = true` and exists-as-client never apply.
- **Failure scenario:** Client id 55 is soft-deactivated (`isActive=false`, the exact predicate the scoped SQL enforces). 55 runs `view_xp_streaks` naming their own id: the early return binds self with no directory lookup → deactivated client keeps reading/running on their record. Same shape for a `user`-role caller on any future client-ref command: a fabricated client record for an id that may not exist in the client table.
- **Fix:** In the branch, when `clientId` is present, verify self against the directory (or at minimum the active flag) before binding; or document deliberately that self-access ignores active status.
- **Confidence:** High on the code path (the branch makes no query — visible in the diff); medium on whether `isActive` is a security boundary versus cosmetic.

### [MEDIUM] `UNSYNTHESIZABLE` pins are a standing coverage hole dressed as hygiene
- **Where:** Ownership suite — every sweep does `if (UNSYNTHESIZABLE.has(command.type)) continue;`, and the `no stale pins` test only proves pins aren't *stale*.
- **Failure scenario:** A pinned client-ref command (any of the 19 wrapped / 12 hidden-params commands) leaks a foreign client for years: the pin excludes it from every sweep, and the pin-hygiene test passes forever because the command genuinely doesn't converge. The one test that could catch it (`no stale pins`) succeeds *because* the command remains untestable.
- **Fix:** For each pinned type, either a hand-written minimal params fixture exercised through the same ownership assertion, or an explicit registry-annotated reason + count asserted in the suite so a new pin fails the build until accompanied by a manual fixture.
- **Confidence:** High on the logic; I cannot see the pin list contents, which is the point.

### [MEDIUM] Verification compares the failing baseline as a SET of file names — new failures inside the 23 known-failing files are invisible
- **Where:** Claim: "failing-file set byte-identical to `known-failing-baseline.json` (23 files), compared as SETS."
- **Failure scenario:** A change (or one of the 29 mutations) breaks a second test inside any of the 23 already-failing files. The set of failing filenames is unchanged → "byte-identical" passes → a new regression ships under an existing red file.
- **Fix:** Compare failing test IDs (or the per-file intersection of failing test names), flagging any file whose failing set grew.
- **Confidence:** High; this is arithmetic on the stated method, not speculation.

### [LOW] Kill-switch-before-gate ordering is asserted only on the non-destructive lane; the pipeline's third dispatch site is ordered by structure, not test
- **Where:** `aiCommandConfirmLaneReauthorization` — the kill-switch test mints `mintPending()` only; `stepExecute`'s dispatch is ordered by the step array.
- **Failure scenario:** The destructive lane's kill-switch check is moved below its re-auth (or a future edit reorders it): no test notices, because the only ordering assertion for that lane is a regex over `executeConfirmedOperation`. Separately, if someone reorders the pipeline step array so `execute` precedes `resolve_client`/`rbac`, nothing in these suites fails with a message about ordering.
- **Fix:** Duplicate the kill-switch test with `mintDestructive()`; add a one-line assertion that the step array's index of `stepRbac`/`stepResolveClient` is less than `stepExecute`'s.
- **Confidence:** High that coverage is one-lane; low that reordering is plausible.

### [LOW] Strict `clientId !== toPositiveInteger(ctx.user.id)` — string ids from options deny legitimate self
- **Where:** `stepResolveClient` non-privileged branch.
- **Failure scenario:** `ctx.options.selectedClientId = '55'` (string from a UI payload) and `ctx.user.id = 55` → `'55' !== 55` → "You can only run this on your own record" for the caller's own record. Fails safe, but it trains users and support to see this error as noise, which erodes the denial's meaning.
- **Fix:** Compare `toPositiveInteger(clientId) !== toPositiveInteger(ctx.user.id)` (NaN-mismatch still denies garbage).
- **Confidence:** Medium — I cannot see the type discipline of `options`; the failure direction is safe either way.

### [LOW] Denied-vs-missing is distinguishable by timing on the archive lane
- **Where:** `dispatchDeleteWorkoutPlan` — absence does one query; denial does `findByPk` hit + assignment lookup.
- **Failure scenario:** An id-walker measures ~1 extra indexed query of latency per probe and maps which plan ids exist. This is parity with the REST middleware's own signature, so it is systemic rather than introduced here — noting it because the code comments claim the two answers are the same, and they are the same only in body.
- **Fix:** None small; a constant-shape double lookup or accepted residual risk, documented next to `planNotAvailable`.
- **Confidence:** High that the delta exists; low that it is exploitable at ms granularity over a network.

### [LOW] The ordering-regex guard is blind to un-awaited and aliased dispatch; `hasDispatcher` is read twice with no consistency guarantee
- **Where:** `/confirmLaneDenialReason\(|await dispatch\(/g` scan; the gate calls `hasDispatcher(commandType)` and the caller calls it again independently.
- **Failure scenario:** A future edit writes `dispatch(commandType, ...)` without `await`, or `const run = dispatch;` — the regex sees neither, the count stays 2, an unaccounted dispatch runs ungated. Separately, at boot, the registry initializes between the gate's `hasDispatcher` (false → gate returns null) and the dispatch site's (true → dispatch): the op dispatches with no role check. The window is one boot, but it is real.
- **Fix:** Wrap dispatch in a module-local `gatedDispatch` that always runs the gate, and make the scan assert its use; have `confirmLaneDenialReason` receive the dispatcher-availability answer from the caller's single check.
- **Confidence:** High on the blind spots, low on likelihood.

### [NIT] Missing trailing newline in `workoutPlanCommandDispatchers.mjs` (`\ No newline at end of file`).

### [OPINION] Silent self-substitution on name references for non-privileged callers contradicts this diff's own stated principle
- **Where:** The branch comment: "A name reference falls through to self." Two tests above it assert the opposite principle for ids: "refused explicitly, not silently retargeted." A client saying "archive Bo's plan" gets an action on their *own* record with no error — the wrong-record-write footgun the second test names, arriving by the other resolver branch. It is documented, so per the rules I flag it as opinion, not defect: on any future write command permitted to `client`, retarget-by-name should refuse instead of substitute, and no test covers client+`byName` today.

## WHAT I ATTACKED AND COULD NOT BREAK

1. **The positive-control discipline in the ownership suite.** I ran the "delete the check" thought experiment against each fix: deleting the non-privileged branch fails `cannot reach a dispatcher holding another client id` (dispatchedClientId becomes FOREIGN_CLIENT) *and* the wrong-stage assertion; deleting the trainer scope fails the positive control and the direct `scopedByAssignment` mechanism assertion; deleting the dispatcher assert fails `does not archive a plan belonging to a client who is not the caller's` via `transitionMock` call count. Every denial test is paired with a same-shape success, so none of them can pass by never reaching the gate.
2. **The three-way denial/absence/race shape equivalence on the archive lane.** Shared `planNotAvailable` helper, `withoutEcho` comparison, and — genuinely rare — the third path (permitted caller, service reports NOT_FOUND underneath) tested for shape equality too. The residual signals are timing (filed LOW) and the echoed caller-supplied id, which is the caller's own input. I could not construct a fourth distinguishable path.
3. **Fail-closed on authorizer failure in the confirm lane.** `catch { permitted = false }` plus the `mockRejectedValue` test whose comment names the exact surviving mutation — I could not construct inputs where a throw or reject yields a permit. The never-settling-promise case yields a hang (availability), not a bypass, and the op is already consumed at that point, so a hung redemption cannot be retried into a permit.

## WHAT I TOOK ON FAITH

- **How `user` reaches `executeConfirmedOperation`** — DB-fresh per request or token-carried. Finding #1's severity hinges entirely on this and it is not visible in the diff.
- **`assertAssignmentOrAdmin` internals** — the admin short-circuit, whether it special-cases client-self, and whether it truly catches model errors internally (the dispatcher test depends on that; the confirm lane re-wraps it, implying its authors weren't sure).
- **Production mint shapes** — that `preparePendingConfirmation`/`prepareDestructiveOperation` call sites in the pipeline populate `clientId` and `params.clientId` consistently. Both confirm-lane gate findings reduce to mint discipline I cannot inspect.
- **Pipeline step order as a structural invariant** — nothing in these suites pins rbac/resolve before execute.
- **The harness wiring of `runAgainstClient`** — that it drives the real pipeline with real steps (the stage/error diagnostics strongly suggest so, but the builder is elided).
- **The 29-mutation list, the 7/7 anchor guard, and `UNSYNTHESIZABLE` membership** — all claimed, none shown; the coverage findings above scale directly with their contents.
- **That the 23-file baseline is legitimate drift rather than accumulated breakage** — set-of-filenames comparison cannot tell me.
