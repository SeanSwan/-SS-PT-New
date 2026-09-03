# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF-R2.md
**Tokens:** 7013 in / 18593 out (reasoning: 16140) | total 25606
**Wall:** 330.8s

---

## VERDICT: REVISE

One high finding. The headline forensic fix from round 1 (accepted fix #6) is validated only against a mock whose contract differs from the real function it stands in for. Everything else is fail-closed; this is a fix-integrity and audit-truth problem, not an access hole — hence REVISE, not REJECT.

## DID MY REJECTIONS HOLD?

**R1 — UPHELD.** The comparison's operands are exactly three values: `selectedClientId`, `paramsClientId`, `selfId` — each is a `toPositiveInteger` output, and `toPositiveInteger`'s closure over `number | null` is airtight (regex rejects leading zeros/signs/whitespace-padded garbage, safe-integer bounds enforced, non-string/non-number → null). There is no path in the shown code where a raw string reaches `clientId !== selfId`. Also note the new `!selfId` guard means an unparseable `ctx.user.id` now denies rather than comparing against garbage — that's an improvement the round-1 finding never asked for.

**R2 — UPHELD, with a scope caveat you should write down.** Within the AI pipeline, mint and redeem read the same `roleRequired` array with (as you assert) the same membership predicate, so a role that cannot mint cannot arrive — and a *promotion* (trainer→admin mid-flight) locks the caller out of their own pending op, which is fail-closed and correct. The caveat: `executeConfirmedOperation` redeems whatever is in the *stores*, and `prepareDestructiveOperation`'s REST-shaped signature (`type`, `endpoint`, `affectedRecords`, `commandType` optional-to-null) advertises mint sites outside the pipeline that `stepRBAC` never sees. For those, your argument is unsound but the behavior stays safe — the redeem gate is then the *only* RBAC and it fails closed. Also: make sure the registry-equivalence test drives the actual `stepRBAC` predicate over roles × commands rather than re-deriving both sets from `roleRequired`; if it re-derives, it compares a thing with itself and would not catch a superset carve-out inside `stepRBAC`.

**R3 — UPHELD.** Self-comparison precedes the table for `client`/`user`; admin short-circuits; unknown roles fall to `return false`; the model-lookup catch denies. The client positive control asserts the exact `assertAssignmentOrAdmin(OWN_CLIENT, 'client', OWN_CLIENT)` triple, so the lockout scenario is dead. (But see N1 — that internal catch is load-bearing in a way you didn't intend.)

**R4 — UPHELD, and here is the cheapest honest guard.** The two-trainer fixture does prove binding: a fake filtering on anything-but-the-caller would return PEER_TRAINER's assignment for FOREIGN_CLIENT and flip the denial tests, so the binding is exercised, not assumed. For the fail-open-SQL class (`WHERE (... OR :trainerId IS NULL)`): the cheapest honest guard is a **post-fetch re-assertion at the data consumer** — after `findOne`, verify `assignment.trainerId === requesterId && assignment.clientId === targetClientId && assignment.status === 'active'` before returning true. That converts any fail-open WHERE into a fail-closed consumer, mirrors the `isActive` double-check you already have, costs three comparisons, and needs no CI/PostgreSQL. A lint ban (`no-restricted-syntax` on `Op.or` containing `Op.is(..., null)` in access modules) is a useful second layer, not a substitute.

## NEW FINDINGS

### [HIGH] `client_access_check_failed` is unreachable in production — the real authorizer never throws
- **Where:** `confirmLaneDenialReason`'s `try { ... } catch { return 'client_access_check_failed' }`, against the `assertAssignmentOrAdmin` body you pasted in R3.
- **Failure scenario:** The pasted function swallows its own failures — `getModel` throws and `findOne` rejects are caught *inside* it and returned as `false`. The outer catch in `confirmLaneDenialReason` is therefore dead code in production: a database outage surfaces as `permitted === false` and is audited as `client_access_revoked` — the exact conflation fix #6 claimed to repair. The test passes because `assertAccessMock.mockRejectedValue` replaces the function wholesale with one that *does* throw, i.e. the test validates a contract the real module does not have and can never have. `logger.warn` preserves the distinction in logs but not in the audit trail the test asserts on.
- **Fix:** Either let `assertAssignmentOrAdmin` rethrow and move fail-closed to its callers (verify the REST `verifyClientAccess` caller first), or export a throwing variant for the confirm lane. Cheapest test-side repair regardless: mock the *model layer* (`getModel`/`findOne`) to reject, not the authorizer, so the test exercises the real catch topology.
- **Confidence:** High — the contradiction is between two artifacts you supplied.

### [MEDIUM] `malformed_operation` is unreachable in the destructive lane; null-commandType destructive ops remain mintable and probe-free
- **Where:** `executeConfirmedOperation` destructive lane — the gate sits inside `if (commandType && hasDispatcher(commandType))`; `prepareDestructiveOperation` still defaults `commandType` to null.
- **Failure scenario:** Fix #3 declares a stored null `commandType` malformed — and enforces that only in the ND lane. In the destructive lane, null `commandType` is the *legacy REST shape*, still mintable via the exported function, and such ops reach redemption with no role, client, or mismatch check from this gate at all. Same stored shape, opposite verdicts by lane. Whether that's covered by route-level authz is unshown and untested.
- **Fix:** Either forbid null `commandType` at command-lane mint now that `stepConfirmation` always supplies it, or document and test the REST lane's own re-authorization. At minimum, one test minting a null-commandType destructive op and asserting the intended outcome.
- **Confidence:** Medium-high (the gap is certain; its exploitability depends on unseen REST redemption code).

### [MEDIUM] `target_mismatch` is detectable at mint but enforced only at redemption, after confirmation, and the denial consumes the op
- **Where:** `stepResolveClient` (`clientId = selectedClientId || paramsClientId` — precedence, no agreement check) vs. the redemption-time mismatch guard.
- **Failure scenario:** UI selection says client 7, NL-parsed params say client 5. Resolution silently picks 7; nothing shown writes the resolved id back into `ctx.intent.params` (the old self-scope branch needed its own explicit write-back, which is evidence the resolver does not canonicalize params). The op is minted with `operation.clientId = 7`, `params.clientId = 5`, shown to the user, confirmed — then denied `target_mismatch`, and because retrieval is single-use, the confirmed command is destroyed. The audit reads as tampering what is actually a UI/NL disagreement the resolver itself created.
- **Fix:** In `stepResolveClient`, when `selectedClientId` and `paramsClientId` are both present and differ, error at mint. Redemption keeps the guard as backstop.
- **Confidence:** Medium — contingent on the resolver block not writing params back, which the diff's own removed line supports but does not prove.

### [MEDIUM] Destructive-lane redemption's binding of redeemer to minter is unshown and untested
- **Where:** ND lane binds explicitly — `retrievePendingConfirmation(operationId, user.id)`. The destructive lane's retrieval is not in the diff and no test redeems as a different user of the *same* role (the demoted test changes role; the client test is self-minted).
- **Failure scenario:** If destructive retrieval is by operationId + signature only, then `createdBy` is HMAC-protected against tampering but never compared to the caller. Any admin passes `assertAssignmentOrAdmin` unconditionally (`admin → true`) and can redeem any user's pending destructive op; a peer trainer assigned to the same client likewise. Possibly intended — but it is an asymmetry with the ND lane that neither round has looked at.
- **Fix:** Show the retrieval, and add one test: mint as trainer A, redeem as trainer B (same role, assignment mocked true), assert denial.
- **Confidence:** Low-medium (code unseen), high that it is unexamined.

### [LOW] `clientId`'s HMAC coverage is evidenced only for the destructive lane
- **Where:** The diff adds `clientId` to `signOperation` in `destructiveOperations.mjs`; the ND mint site recording/signing `clientId` is not in the diff, though tests mint it.
- **Failure scenario / Fix:** If `preparePendingConfirmation` shares the patched `signOperation`, this is moot — show it. If it signs separately, the ND lane's canonical target and the `target_mismatch` comparison run over a field that store-level tampering can alter undetected.
- **Confidence:** Low as a defect, high as a verification gap.

### [LOW] `check_failed` consumes the single-use operation
- **Where:** The single-use-delete-on-retrieval semantics, combined with the (currently dead) `check_failed` path.
- **Failure scenario:** A transient outage permanently destroys every queued confirmed operation — trainers' cancellations vanish while the DB is unhealthy, which is when queued destructive work matters most. You chose consume-on-denial for safety; that reasoning holds for `revoked` and `target_mismatch`, not for `check_failed`.
- **Fix:** Restore/requeue the operation on `check_failed` only. Design trade-off — decide it explicitly.
- **Confidence:** High that the behavior follows; medium that it's wrong.

## WHAT I ATTACKED AND COULD NOT BREAK

- **The self-scope fall-through.** Ordering of `selfId`-null vs. cross-target denial is correct (a garbage user.id can no longer act even on self); the fabricated `resolvedClient` is gone; the resolver's `isActive` is now on the self path. Could not construct a bypass.
- **The mismatch coercion matrix.** `params.clientId` of `""`, `"12abc"`, `undefined`, non-numeric — all land on deny or on the canonical `operation.clientId`; `Number()` cannot produce a false-pass that survives `assertAssignmentOrAdmin`'s strict parse.
- **R1's normalization closure** — every operand of every comparison in that branch passes through `toPositiveInteger` exactly once.
- **The plan-shape test's non-vacuity** — it asserts the `toHaveBeenCalledWith(TRAINER, 'trainer', OWN_CLIENT)` triple, so it cannot pass on a denial sourced elsewhere.
- **Your compound-mutation adjudication — it is sound, not an excuse.** Single-layer survival is exactly what defense-in-depth predicts when two real checks guard the same property; requiring the `isActive` mutation alone to fail a test would mean one of the two layers is dead code. The compound proves non-vacuity. One condition: the resolver's *explicit* `rows.isActive` check must carry its own anchor elsewhere — if mutating it alone survives everywhere too, then the compound is masking two weak assertions, not one honest redundancy. Verify that one anchor exists.
