# GLM Consult

**Model:** glm-5.3-flash
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF-R5.md
**Tokens:** 7563 in / 10716 out (reasoning: 8858) | total 18279
**Wall:** 290.2s

---

VERDICT: NOT DRY

### [HIGH] Fire-and-forget audit promise is unguarded at the call site — crash-safety rests entirely on an unverified module
- Where: `dispatchers/workoutPlanCommandDispatchers.mjs`, denial branch — `recordCommandAudit({...});` with no `.catch`, no enclosing `try`.
- Failure scenario: `recordCommandAudit` is (or becomes) async and rejects — audit DB connection blip, constraint violation, pool exhaustion under an attacker spamming cross-tenant `planId`s precisely when the writer is degraded. Bare-expression promise → unhandled rejection → Node ≥15 default kills the process. Result: the defense added for id-walking becomes a remote DoS amplifier — denials correlate with audit failure, giving both a crash loop and a signal the 404-parity design was built to withhold. Note your own test guarantees you'll never notice: `vi.mock('../../services/ai/commandAudit.mjs', () => ({ recordCommandAudit: vi.fn() }))` means the mock returns `undefined`, not a rejecting promise. Every plan-archive test is structurally incapable of surfacing a rejection.
- Smallest fix: read `commandAudit.mjs` once; if it doesn't contain its errors internally, append `.then(null, (e) => logger.error('[PlanDispatch] audit write failed', { err: e }))` — preserves fire-and-forget timing parity (see below) while making rejection impossible to escape.
- Confidence: high that the call-site is unguarded; medium that the callee doesn't swallow (module body withheld from review materials — hence one-line verification, not invention).

Timing oracle, answered directly while we're here: as written there is **no** oracle — you did *not* await, so denial latency equals not-found latency modulo negligible synchronous preamble. This is the correct trade; awaiting would have bought reliability at the cost of the exact distinguishability fix 2 forbids. You picked the right half of the tension and left the other half (rejection) uncovered. That pairing — no-await for parity, no-catch for luck — is the finding.

### [MEDIUM] The audit trail sees only half the enumeration attack it was created to detect
- Where: same denial branch; the `!plan` path above it writes **nothing**.
- Failure scenario: the stated rationale is that id-walking is now "visible in the only place detection could live." A walker sweeping a dense range generates `handler_denied_plan_access` rows — but a walker scanning sparse/random ranges mostly hits nonexistent ids, which exit at `if (!plan) return planNotAvailable(planId);` unrecorded. Coverage of the probing campaign is proportional to hit-rate on extant foreign plans, i.e., worst exactly where enumeration is stealthiest. Volume-anomaly detection ("this account made 400 absence answers") remains impossible, which was most of the point.
- Smallest fix: record absence attempts too, server-side only — e.g., `outcome: 'absent'`, `targetClientId: null`, same response shape untouched. Response indistinguishability is a caller-facing property; you yourself established that the server-side record need not mirror it.
- Confidence: high — logic is local and certain; only the threat model weight is judgment.

### [MEDIUM] Possible import cycle through `commandAudit`, permanently masked by the test seam
- Where: new import in `workoutPlanCommandDispatchers.mjs`; suspected chain `commandExecutor → commandAudit ← commandDispatcher ← dispatcher`. A cycle needs a back-edge **from** `commandAudit` **toward** executor/dispatcher — unverifiable from material provided.
- Failure scenario: if the back-edge exists and `recordCommandAudit` is exported as a `const` arrow (TDZ-sensitive, not a hoisted declaration), the first production denial throws `ReferenceError`/`TypeError` synchronously inside the denial branch → 500 → destroys 404-parity on exactly the path that must never 500. Your entire test estate cannot observe this: the plan-archive suite mocks `commandAudit`, severing the very edge under suspicion; nothing shown imports the dispatcher against the real module.
- Smallest fix: one smoke test that imports the dispatcher file with **no** mocks and asserts `typeof recordCommandAudit === 'function'` after resolution; or defensively convert to a lazy dynamic import at the call site.
- Confidence: medium existence / high maskability.

### [LOW-MED] Denial audit persists a third party's client id, sourced from an attacker's guess
- Where: `targetClientId: plan.userId ?? null`.
- Failure scenario: not a caller-facing disclosure — but the file's own doctrine is bounded identifiers. The audit row now attests "user X probed a plan belonging to client Y," persisting Y's linkage across retention windows and exports on the strength of an unauthenticated guess that happened to collide. Sufficient for detection without it: `planId` + errorCode already reconstructs the campaign; owner attribution can be joined at investigation time from the plans table instead of frozen into security logs.
- Smallest fix: drop `targetClientId` (or substitute the probe's `planId` as the investigation key).
- Confidence: medium — policy-dependent, argued from the file's stated minimization principle, not invented regulation.

### [LOW] Two different id parsers guard the same input; they disagree off the common path
- Where: lane guard uses `toPositiveInteger(ctx.user.id)`; resolver uses `Number.parseInt(trainerId, 10)` + `isInteger` + `> 0`. These are not interchangeable: `'12px'` → lane denies, resolver would accept 12; `12.5` → lane denies, resolver accepts 12; `'1e3'` → lane passes 1000, resolver **scopes to trainer 1** (parseInt stops at `'e'`). Today intersection-safety holds only because the lane guard runs first; if a future caller reaches the resolver past the lane (any new entry point, or the admin-path variants), the divergent parser picks divergent scopes.
- Smallest fix: one canonical coercion shared by both sites; `scopedTrainerId` derived from `toPositiveInteger`, period.
- Confidence: high on divergence, low on exploitability (requires identity layer emitting non-plain ids).

### [LOW] M42's compound form is the only pin for either guard — and a second test assertion rides along free
- Where: `tests/mutations/ownership.mutations.mjs` M42; `tests/api/aiCommandDispatcherOwnership.contract.test.mjs` ~l.257–259 (diff offset).
- Failure scenario: you concede neither guard alone can fail a suite — which also means deleting *only* the resolver guard (the shared-helper blast radius your briefing worries about, since four callers depend on it) is currently unobservable. The `unscoped.toEqual([])` assertion contributes nothing beyond its sibling whenever `dispatchCalls === 0` holds, so the loop's protection reduces to one effective predicate executed four times.
- Smallest fix: three-line direct `resolveClient` unit test — `trainerId: '' / 'oops' / 0` → deny — enabling M42 to split into independent mutations; each guard then earns its own corpse.
- Confidence: high.

Attacked and held, for the record: (1) `scopeRequested`'s check admits no sane value that deserves the unscoped treatment — `null` and absent are excluded precisely; the only behavior deltas (`''`, `false`) were silent-wide-query bugs yesterday; caller census beyond `stepResolveClient` is unverifiable from the supplied material and I decline to invent one. (2) Guard **order is load-bearing and correct** — the lane check precedes the `ctx.resolvedClient = { id: clientId }` stamping; placed after it, a garbage-id trainer supplying `selectedClientId` would pre-resolve a foreign target. Verified by trace. (3) Admin fall-through terminates in a legitimately unscoped resolver call; non-admin unknown roles pin to self and fail `role='client'` predicates harmlessly.

VACUOUS TESTS: none strictly tautological — both new tests assert falsifiable specifics (dispatch count across four id-corruptions; audit row fields against the mock, M43 anchors the exact call). Two strength caveats recorded in the final finding rather than inflated to vacuity: the `unscoped` sub-assertion at ownership.contract ~257 cannot fire while the `toBe(0)` beside it passes, and M42's compoundness leaves single-guard deletion unpinned today.

ONE LINE: Read `commandAudit.mjs` before pushing anything — catch the floating promise, add the unmocked import smoke and the resolver-direct bad-id unit, extend auditing to absence probes — then the tenancy registry lands on top of fixes that can't crash or blink.
