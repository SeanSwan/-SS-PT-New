# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/fusion/panel6-contract-and-extraction.md
**Tokens:** 1627 in / 10043 out (reasoning: 8123) | total 11670
**Wall:** 162.3s

---

## Verdict

No. The contract is a branch-side regression net being used as a port gate. It characterizes the behavior the *branch* adds and is structurally blind to the behavior *main* added in the gap — which is where every catastrophic risk in this port lives. Proof by construction: copy the branch's two divergent files wholesale over main's (the exact error this procedure exists to prevent, and which has already happened once in this repo's history). The 16 tests run green. The double-deduct fix, the double-grant fix, the reschedule ownership guard, the endpoint auth fix — all gone, contract 16/16. A gate that passes under the failure mode it was built to catch is not a gate for that failure mode. It has real value for the branch-side invariants it lists; that is not the question asked.

## 1. Contract sufficiency — the missing assertions, in severity order

- **Reschedule ownership.** This is a cancellation contract. The reschedule guard lives in `sessions.mjs`, one of the two files being hand-ported, has documented precedent of being reverted in this codebase, and has **zero** assertions in the contract. Missing assertion: *"Trainer B rescheduling Trainer A's session → 403."*
- **Interleaved idempotency.** The contract tests "already-cancelled refused" — sequential. Main's double-deduct fix almost certainly exists for the *interleaved* case (a row lock, a conditional UPDATE, a transaction-scoped guard). Drop it in the hand-port and every sequential test still passes, because a state guard alone satisfies sequential tests. Missing assertions: *"two interleaved cancellations of one session → exactly one deduction"* and *"two restore evaluations → exactly one grant."*
- **Auth sweep.** The contract runs at service level. The unauthenticated-endpoint fix is a route/middleware change in a hand-ported file. Missing assertion: *"every route under the canonical mount rejects unauthenticated requests."*
- **Ledger end-states.** The contract asserts payloads and stamps ("operator figure recorded," "forfeit stamped"). Nothing listed asserts the money moved: *"client credit balance delta == operator figure, decremented exactly once, as a post-call DB-state assertion."* A port that keeps the response shape but breaks the deduction write passes.
- **Amount agreement with the warning.** The contract pins the 24h *time* agreement, not the *amount* agreement. Missing assertion: *"on a late cancel with no operator override, the forfeit amount in the cancel-warning response equals the amount actually deducted."* Under the advisory design the operator can free-type a figure the client was never warned about — this is the chargeback machine, see §3.
- **Boundary tautology.** If the warning endpoint and the restore path share a helper/constants for the 24h window, the boundary test is self-referential: change the shared constant, both sides move together, green. Assert the two values independently, or pin the constant.

## 2. Positive controls

Two killed mutants prove the harness executes and can fail. That is liveness, not coverage. Both mutants were drawn from the *branch's* feature axes — the safest possible place to find red. The third simulation I demand is drawn from main's history: **revert the reschedule ownership guard in the extracted tree and run the contract.** I predict 16/16 green, and if so, you have demonstrated in one experiment that this gate does not guard the port. Run the double-deduct revert as a fourth. If those stay green, the correct response is not a 17th test bolted on — it's admitting the contract gates the workstream, not the port, and adding a main-side invariant suite as a separate blocking artifact.

## 3. The advisory design

Advisory is correct as an *authority allocation* and incomplete as a *control*. Look at what the three catastrophes actually were: a wrong number reaching the authoritative slot — program price pasted as a charge, the wrong order's figure used, duration ignored. Advisory doesn't fix that failure mode; it guarantees those accidents now execute *faithfully*. The clamp failed symmetrically for the opposite reason: it silently rewrote the number, and the one documented case shows the derived value was the wrong one ($110 from the wrong order). Override vs. advisory is an argument about who computes the number. Nobody proposed the third axis: **verify the input, don't derive or correct it.**

The third option: **confirm, don't correct.** Server-enforced acknowledgement gates that require no Session→OrderItem link and no migration:

- Charge exceeding a tolerance above the derived rate for the session's *actual duration* (or above remaining package credit) → 422 unless the request carries explicit `overrideAcknowledged` + reason. The human decision still wins; it just has to survive seeing the machine's number and re-asserting its own.
- Structural blacklist of the known accident signature: charge equal to any `StorefrontItem` program price → require ack. Derivable from data that exists today.
- Asymmetric by harm: hard gate on the ceiling (overcharge = client harm, dispute, and the owner's stated #1 priority is acquisition — a $33,600 accidental charge is an acquisition-killer), warn-only on the floor.

Note also what the contract did here: by asserting *"no clamping"* and rejecting only non-positive charges, it has **cemented $33,600 as valid input** and made the eventual guardrail a contract-breaking change. Characterization tests freeze the status quo, holes included.

## 4. The port procedure

- **The function boundary is a lie.** Main's fixes don't live inside "the functions" being ported — they live in helper calls, lock parameters, and middleware lines. Concrete nightmare: main's double-deduct fix adds an optional `tx`/locking parameter to `loadSession`. The branch's hand-ported function calls `loadSession(id)`. Optional-parameter drift → lock silently skipped → compiles (it's `.mjs`, see §5), characterization green (sequential), double-deduct reintroduced.
- **Do it as a merge, not a checkout-and-graft.** A merge of the branch into main forces conflict on exactly the two diverged files and makes main the base; hand-porting hunks is how the reschedule guard died the first time ("a proof step reverted it" — precedent in-tree).
- **Add a mechanical deletion check.** The structural rule the procedure lacks: `git diff main..extracted` on the two diverged files may contain **no deletion of a line that exists on main and not on the two-month-old merge base**. Any such hunk is a stop, reviewed by name. This is checkable by script and directly targets "silently reverted main's fix."
- **Divergence snapshot staleness.** "Zero main-side divergence" was measured at review time. Re-verify at port time, or a main commit landing in between gets checkout-reverted with the same silence.
- **Tests are files too.** Any test file both sides touched gets hand-ported, meaning tests can be silently weakened during the port. Nothing positive-controls the tests.
- **Mount discipline.** The contract should pin its import path to the canonical `backend/core/routes/sessions.mjs`. An explicit import is itself an assertion; anything resolving through the unmounted legacy file is green tests on dead code.

## 5. Untested surfaces — priority

1. **HTTP-level suite on the canonical mount, first.** It is the only layer that can see auth, mounting, and route shape — i.e., the entire P0/CRITICAL regression class: reschedule 403, 401 sweep across session routes, cancel-warning through the real router, canonical-vs-legacy confusion. This one gap, closed, covers more of the known risk than items 2–4 combined.
2. **Live Postgres run of the money contract.** Transaction-scoped lookup, conditional writes, and locking semantics are exactly what a test-double/SQLite harness masks.
3. **One-line tsconfig fix — and note the vacuity:** `tsc` exit 0 currently certifies nothing about the two hand-edited `.mjs` files (no `checkJs` claimed). The port has **zero static checking on precisely the files being hand-edited**. `node --check` or eslint as a floor, today.
4. Browser run last. The risk in this port is server-side; E2E is UX validation, not a money gate.

## Minimum gate I would accept

Contract green **and**: (a) main-side invariant suite — reschedule 403, 401 sweep, interleaved double-deduct/double-grant, ledger delta assertions — green; (b) mechanical no-main-side-deletion diff check on the two divergent files, clean; (c) positive controls re-run against a *main-side* revert (reschedule guard), red. Without (a)–(c), green on the contract is evidence about the branch, and this port is not gated at all.
