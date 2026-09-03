# GLM Consult

**Model:** glm-5.3-flash
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF-ENHANCE.md
**Tokens:** 15678 in / 13654 out (reasoning: 10799) | total 29332
**Wall:** 389.5s

---

## 1. BUGS AND ISSUES STILL PRESENT

### [HIGH] Tenancy is derived from caller-supplied linkage, never canonically from the record — `stepResolveClient` + `confirmLaneDenialReason` / any id-consuming command
Where: the whole lane's authorization model, not one file.

Failure scenario: for `requiresClientRef: true` commands, resolution and redemption both authorize the **trainer↔client relationship**. Neither answers "does the record being acted on belong to that client?" Suppose `cancel_session` requires a client ref and carries `sessionId`. A trainer legitimately assigned to client A resolves A (scoped ✓), mints the op with `clientId = A` ✓, redeems 90 seconds later — `assertAssignmentOrAdmin(user, role, A)` ✓ — and dispatch acts on `sessionId`, which can belong to **client B, trained by someone else**. Every gate ran green and none of them checked ownership of the session row. The record's tenant was never derived from the row; it was taken from whoever the caller picked.

`dispatchDeleteWorkoutPlan` is the only place in the shown workstream that does it right — and only accidentally, because `requiresClientRef: false` forced the fix to derive `plan.userId` from the fetched row. That inversion ("fetch the row, authorize against its owner, let 404-shape hide existence") is the correct general invariant, but it exists as an implementation detail of one dispatcher, stated nowhere, enforced nowhere. The redemption comment even frames the opposite division of labour ("ownership for those lives in the handler"), which institutionalizes caller-derived tenancy everywhere else.

Smallest fix: don't try to fix 139 handlers. Add a required registry field — `targetOwnership: 'from_record' | 'from_client_ref' | 'n/a'` — and an enumeration contract test that fails until every id-taking command fills it. The failing list is your true residual-risk inventory, including whether a second live hole exists among the other id-taking commands (sessions, programs, biometric entries, photos — reads included, since the gamification hole shows reads are where the mass is).

Done-when you know it worked: the enumeration test goes green, and one mutation per declared `'from_record'` command proves deleting the row-derived check flips the outcome. Confidence: high on the structural gap (visible in the pasted code and comments); medium that another exploitable instance exists today — I can't see the other 138 handlers, and neither could the four prior rounds, which is the point.

### [MED] If any non-dispatcher execution path remains at confirm time, the new gate doesn't cover it
Where: `executeConfirmedOperation`.

`prepareDestructiveOperation` still signs and stores `endpoint`. The redemption gate wraps `dispatch(commandType, …)` only. If a legacy lane replays `operation.endpoint` for types with no dispatcher, an operation can execute having passed none of the new checks — the exact "capability-shaped hole behind the router" class this workstream exists to kill. This may already be dead code. Smallest fix: grep for consumers of `op.endpoint` at redemption; if found, gate them identically; if truly dead, delete the field from the stored/signable shape so future authors can't revive the shortcut. Done-when: no reader of the code can reasonably believe an endpoint-replay path exists. Confidence: genuinely unknown — this is a one-hour verification, flagged rather than asserted.

### [LOW] Pre-existing pending confirmations die at deploy with no explanation
Where: `signOperation` / `verifyOperationSignature`.

Adding `clientId` to the HMAC payload invalidates the signature of every op minted before deploy. All in-flight confirmations fail verification and users get the generic re-issue message. Impact is cosmetic and self-healing in ≤120s — but with 15 unpushed commits landing at once, do you want the first hour after go-live generating signed-object failures in logs? Smallest fix: flush the pending store during the deploy, or tolerate *absence* of `clientId` in the payload while rejecting mismatches. Left at LOW on purpose.

### Checked and left alone
- The `!rows.isActive` branch in `resolveClient`'s direct-ID path is dead code (the query already filters `isActive = true`). Harmless; removing it changes nothing.
- `Number()` coercion in `prepareDestructiveOperation` and the target-match comparison accepts junk like `[7]` → 7, but inputs are server-resolved integers downstream of the pipeline, so the looseness is unreachable in a threatening direction.
- `TOCTOU` on plan archive and the swallowed `assertAssignmentOrAdmin` failures: agreed with both accepted-rulings; the second deserves telemetry, which I put in §3 rather than re-arguing here.

## 2. ENHANCEMENTS AND UPGRADES

### [VALUE: HIGH] Make the verifier unavoidable
Everything impressive here — 61 assertions, 40 mutations, the rewritten gate — runs only when someone remembers to run it, and it has never once run in CI. Smallest move: a pre-push git hook chaining `test-baseline-gate.mjs`, the mutation harness, and the ownership contract suite. Measure wall time; if it's painful, run the gate on `vitest --related` for touched files and full only on release tags. Done-when: a developer physically cannot push a tree that regresses the ownership contract without typing an override they'd remember.

### [VALUE: HIGH] Push the branch now, CI later — decouple the two
GitHub Actions billing is blocking the workflow runner, not `git push`. Fifteen commits of security work existing on one laptop means the verification story has a single point of hardware failure and reviewers literally cannot diff it. Smallest move: push to origin tonight, even with CI dead; add any free CI as follow-up. Done-when: `git push` succeeds and a second machine can check out and run the gate.

### [VALUE: MED] Centralize the role taxonomy
"Who is scoped how" currently lives in three independent encodings: `RESOLVER_SCOPED_ROLES`, the inline `role === 'trainer'` ternary at the resolver call, and `assertAssignmentOrAdmin`'s internal ladder. Adding one role tomorrow (org manager, front-desk) means three chances to drift, and the wrong drift direction is fail-open. One `roles.mjs` module exporting `isRecordScopedRole()` etc., imported by all three sites. Done-when: exactly one place in the backend contains the string `'trainer'` in a permission-decision context.

### [VALUE: MED] Dependency-injection seam in dispatchers
Hard imports of `database.mjs` / `getAllModels()` are why handlers stay mocked and why "dispatcher self-gating unproven" remains permanently true (I half-disagree with accepting that: the division-of-labour defence leans on handlers refusing, so a forever-unprovable defence is an aspiration wearing a design doc's clothes). Accepting optional injected deps converts the strongest handlers into real-code contract tests. Done-when: one destructive-path integration test runs against real Postgres with handlers unmocked.

## 3. GAPS NOBODY ASKED FOR

Three sessions produced proofs, mutations, and a gate — but the *subject* of all that rigor still has no readable statement of its own rules. A fresh security engineer asked "show me what this system authorizes" gets a tour of test files.

### [VALUE: HIGH] A generated authorization matrix with drift detection
139 commands × 4 roles × `requiresClientRef` × `selfService` × `targetOwnership` × `hasDispatcher`, emitted as one artifact by extending the existing 303-pair harness. Why here: `allowedRoles` is admitted-untrustworthy for 54% of rows, so the registry's own claims cannot currently be consulted by a human deciding whether a new command is safe — the knowledge lives in testimony, not artifacts. Costs of lacking it: the next contributor ships `requiresClientRef: false` id-command #2 by copying the pre-fix pattern, and nothing notices until an adversarial review, months later. First move: generator script outputting markdown, plus the §1 registry field feeding the same run. Done-when: the matrix diverges from observed gate behavior on zero cells, and CI annotates diffs to it.

### [VALUE: HIGH] Admission control for the lane itself
No routes, no middleware, therefore — as far as anything shown — **no rate limiting, quotas, or concurrency caps anywhere on Swan Coach**. Nothing indicates the pipeline spent one sentence on this. Cost: classifier/model invocations and the 50-row fuzzy client scans are per-request costs, unthrottled; a scripted hammer monetizes your inference bill and probes resolvers at leisure, and a denial-taxonomy oracle distinguishes successes for an attacker walking ids. First move: token bucket keyed on `user.id` at pipeline entry plus a daily per-user command ceiling; defaults generous enough not to touch legit trainers. Done-when: disabling the limiter in a mutation visibly enables burst escalation, and dashboards show p99 classifier latency flat under synthetic flood.

### [VALUE: MED] Erasure/subject-rights mechanics behind the immutable artifacts
This product holds pain notes, injuries, biometrics — and the new workstream deliberately creates **immutable receipts, append-only audit, and signed pending-ops containing client names and ids**. Nobody has asked what happens when a client exercises deletion rights (GDPR/CCPA; consumer-adjacent fitness market makes this a when, not an if). Immutability and erasure are currently on a collision course discovered during the incident rather than designed around before it. First move: pseudonymous keys in durable artifacts (receipts/audit reference `clientId`, names rendered at display time via the de-identifier you already built). Done-when: an erasure test anonymizes a client while every historical receipt still verifies.

### [VALUE: MED] The guards have no guard
Forty mutations certify the product; zero certify the `test-baseline-gate` and `confirmLaneDenialReason` — the two components whose silent failure invalidates every other verification claim (the gate's reason-truncation at 200 chars, for one, could theoretically collide two distinct failures into one normalized string). First move: mutation-test the gate itself (swap `!==` to `===` in the comparison; a green run anywhere would scream). Done-when: killing the gate's comparison logic turns the harness red.

## 4. FEATURE IDEAS

### Client-handover command
"The gym floor logic": trainers churn constantly. `"Transfer Maya and all her active plans and upcoming sessions to Dana"` — staged preview, destructive-confirm, lifecycle receipt per moved artifact. This showcases precisely the machinery built here (preview `affectedRecords`, HMAC confirm, receipts) against a real operator moment that today requires clicking N screens.

### Receipt-backed progress proof packs
The core loop is log → proof → next action; the proof leg is underdeveloped. `"Build June's progress report for Maya"` compiles PRs, streaks, volume trend into a shareable pack via consent-scoped expiring links — exercising the existing de-identifier/rehydrate pipeline as a feature instead of only a compliance tool. Trainers get a retention weapon; clients get the dopamine artifact.

### Diff-aware destructive confirmations
`archive` is terminal and current confirmations say only "are you sure?". Preview should show what dies: plan name, N sessions, last activity date, no-undo warning. Reuses `affectedRecords` and receipts, fights confirm-fatigue (the exhaustion that trains users to click yes on *everything*, which is itself a security posture problem in a destructive-capable lane).

### Self-service "why did that fail?"
When a redeemed op dies as `role_revoked`/`client_access_revoked`, the user gets an opaque message and files a ticket. Map the internal denial taxonomy (audit already captures it) to safe external phrasings — explaining a *revocation of one's own* power leaks nothing the 404-style discipline forbids, since it never speaks about the target's existence, only the caller's standing.

## 5. IF ONLY THREE COULD BE DONE

1. **Push the branch + smallest CI/hook (§2 both HIGHs, really one move).** Every other recommendation's value compounds or evaporates depending on whether this work survives the laptop and can be reviewed. It's also the only item on the list achievable before lunch.
2. **The `targetOwnership` registry field + enumeration contract (§1 HIGH + §3 matrix, same build).** This is the difference between having *found* three holes and having *made the class unshippable*. The 303-pair harness exists; extend, don't invent.
3. **Lane admission control (§3).** Absent rate limiting on a no-middleware compute-heavy lane is the loudest fresh-eyes omission in an authorization system; small, self-contained, and independent of the other two.

Dropped if forced: the role-taxonomy module and DI seam (valuable, deferrable — the DI seam specifically waits until CI runs so integration tests have a home), erasure mechanics (real deadline pressure, but regulatory-clock-dependent, and the matrix gives you the field inventory it needs first), denial telemetry, guard-the-guards, and all features — genuinely good ideas, none of them holes. If a fourth appears, I'd resurrect guard-the-guards before the rest: a verifier that lies undetected poisons every claim built on it.
