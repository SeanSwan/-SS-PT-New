# GLM Consult

**Model:** glm-5.3
**Document:** C:/tmp/swan-p1a/docs/ai-workflow/AI-HANDOFF/panel-2026-08-26/BRIEF-ENHANCE.md
**Tokens:** 15678 in / 19573 out (reasoning: 16191) | total 35251
**Wall:** 260.4s

---

## 1. BUGS AND ISSUES STILL PRESENT

### [HIGH] Trainer scope in the resolver fails OPEN on an invalid trainer id — `commandExecutor.mjs` stepResolveClient call site + `clientResolver.mjs` `hasTrainerScope`
Where: the resolver call passes `trainerId: ctx.user.role === 'trainer' ? ctx.user.id : undefined`. Inside `resolveClient`, `Number.parseInt(undefined)` → NaN → `hasTrainerScope = false` → the scope SQL is simply omitted. Failure scenario: any trainer-shaped context whose `user.id` is missing, null, or garbage resolves ANY active client by id or name — the exact shape of original hole #1, trainer edition. Note the asymmetry: `assertAssignmentOrAdmin` fail-closes on `!requesterId`; the resolver fail-opens. And the new unscoped-role guard in `stepResolveClient` validates `selfId` for non-scoped roles but validates nothing for trainers before the ternary. Smallest fix: in `stepResolveClient`, refuse when `role === 'trainer' && !toPositiveInteger(ctx.user.id)`; the durable fix is a scope object (`{kind: 'trainer', id}`) so "unscoped by design" and "unscoped by garbage" stop being the same value. Confidence: the fail-open is certain from the code shown; reachability depends on whether the lane entry can ever construct a trainer user without a valid id — unverified, which is why this is defence-in-depth rather than an exploit chain.

### [MED] The denial gate covers two redemption shapes; the third may be ungated — `executeConfirmedOperation`
Where: `confirmLaneDenialReason` is invoked inside the `ndResult.verified` branch and inside `if (commandType && hasDispatcher(commandType))`. By its own design it returns `null` (permitted) for a commandType with no dispatcher, and `prepareDestructiveOperation` still signs an `endpoint` — which strongly implies a non-dispatcher replay path exists for pre-v9-style operations. Failure scenario: an operation with a commandType that has no dispatcher, or an endpoint-only operation, redeems without the role/client re-check this whole slice exists to add. Smallest fix: hoist the `confirmLaneDenialReason` call above the lane split, and give `commandType == null && endpoint != null` its own explicit code path (deny or endpoint-equivalent check) rather than letting it fall through. Confidence: medium — the endpoint-replay branch isn't shown, so this is a verify-don't-assume item, but it is precisely the class that survives diff-scoped review.

### [MED] The handler-side denial in `dispatchDeleteWorkoutPlan` is unaudited
Where: the `!permitted` branch returns `planNotAvailable(planId)` — correct response shape (404 parity is the right call), but nothing is recorded anywhere. Failure scenario: a trainer walks planIds through the command lane; every probe consumes a mint and leaves a success-shaped or not-found-shaped audit trail. The enumeration attack this lane's whole 404-parity design anticipates is undetectable in the one place detection would live. Smallest fix: one `recordCommandAudit`/`logger.warn` line on the `!permitted` branch with actor, planId, `reason: 'handler_denied'` — response stays 404-shaped, server-side record doesn't. Confidence: high — visible in the shown code.

### [MED] Admin name-resolution is broken past 50 clients — `clientResolver.mjs` fuzzy path
Where: the unscoped query is `WHERE "isActive" = true AND role = 'client' ORDER BY lastName, firstName LIMIT 50`. Failure scenario: a tenant with 60 clients — an admin typing the 51st-alphabetical client's name gets "not found" and wrong suggestions; a trainer with >50 assigned clients hits the same wall by name (by-ID still works). The code already logs this as a TODO; nobody has asked to fix it, and at realistic gym scale it stops being a TODO. Smallest fix now: scope-aware limit (and higher for admin); right fix: database-side similarity (`pg_trgm`, indexed) as the log note suggests. Confidence: high — it's in the SQL shown.

### [LOW] Two small ones
- A `user`-role caller targeting themselves on a requiresClientRef command gets the resolver's client-shaped error ("No client found with ID #7") about their own account. Fail-closed, misleading message. Fix: distinct copy. Confidence high, impact low.
- `normalizeReason` strips paths, line numbers, ms, hex, timestamps — but not bare numerals in assertion messages. A baselined flaky test whose failure count varies ("expected 3 to equal 4" → "expected 5 to equal 4") becomes reason drift, which is a hard gate failure. That's the gate crying wolf, which its own header correctly identifies as the failure mode that gets gates routed around. Fix: normalize digits inside `expected/received` assertion shapes only, and accept the small real-drift you'd mask. Confidence medium — depends on whether any baselined tests have count-flapping messages.

Attacked and found solid — leave alone: the unscoped-role pin (refuse-don't-retarget is right, and falling through to the resolver rather than fabricating a record is right); absent-is-not-a-mismatch (documented, migration costed, agreed); the dead `if (!rows.isActive)` check on the direct-ID path (WHERE already filters it; harmless mirror); the `planNotAvailable` unification via one helper; 404-parity itself (modulo the audit gap above).

## 2. ENHANCEMENTS AND UPGRADES

### [VALUE: HIGH] Push the 15 commits and wire the baseline gate to pre-push
What: the entire verification posture — 61 assertions, 40 mutations, the reason-drift gate — exists on one machine. `git push` to a branch costs nothing while Actions is billing-blocked; a husky pre-push hook running `test-baseline-gate.mjs` makes the gate a gate instead of a script someone remembers to run. Why here: the gate's own header argues that a gate requiring human discipline gets piped through `tail`. That argument is correct and applies to its own current wiring. First move: push to a `swan-coach-authz` branch today; add the hook. Done-when: a deliberately-broken test on a clean tree blocks push locally, and the mutation harness runs on a schedule (cron is fine until CI exists) with catch-count tracked.

### [VALUE: HIGH] Registry policy lint — authorization-as-data gets data validation
What: a contract test that asserts structural properties over the 139 registry rows: every command whose dispatcher writes must declare an ownership mode; destructive ⇒ `requiresConfirmation`; for commands with a REST counterpart, `roleRequired` must match the route's guard. Why here: the authorization IS registry metadata, `allowedRoles` is already known 54% untrustworthy, and `delete_workout_plan`'s `requiresClientRef: false` was exactly a metadata-shaped hole. Nothing validates the metadata; that is the unguarded flank. First move: enumerate dispatchers, grep for write calls, assert each command is in exactly one bucket (client-ref-scoped / handler-asserted / read-only). Done-when: registering a new write command without a declaration fails a test, and the sensitive-command subset of `allowedRoles` is fixed or explicitly exempted in the lint.

### [VALUE: MED] A strict variant of `assertAssignmentOrAdmin` for the confirm lane only
What: an exported `assertAssignmentOrAdminStrict` that returns `{ok, error}` instead of swallowing, used solely by `confirmLaneDenialReason`. Why here: it makes `client_access_check_failed` — currently documented as unreachable — real, without touching the middleware REST depends on (the exact constraint that blocked the fix). First move: extract the body, add the variant, switch one call site. Done-when: a fault-injection test shows a DB outage audited as `check_failed`, not `client_access_revoked`.

### [VALUE: MED] Property-based tests for the resolution seam
What: fast-check invariants over generated inputs: unscoped roles never resolve to anything ≠ self; trainer resolution ⊆ active assignments; admin resolution ⊆ active clients; resolver never widens scope when `trainerId` is invalid (would have caught bug 1). Why here: the mutation harness proves the existing tests kill known mutants; property tests generate the inputs nobody wrote tests for, and this seam is two pure-ish functions. Done-when: nightly run green on a committed seed corpus.

### [VALUE: LOW] Gate noise hardening — digit-template normalization per the LOW bug above.

## 3. GAPS NOBODY ASKED FOR

### [VALUE: HIGH] Where does `user.role` come from, and how fresh is it?
What's missing: any statement of whether the role re-checked at redemption (and at every pipeline gate) is read from the database per request or carried in a JWT claim. What it costs: if it's a token claim with an hours-long TTL, the celebrated 120-second fix re-checks a *stale claim* — a revoked admin's token still says admin long past the confirm window, and every gate in the lane shares the assumption. The entire re-authorization story would be void in a way no test in the current posture can see, because tests construct the user object directly. First move: trace how the lane's entry constructs `ctx.user`; if token-derived, hydrate role from DB at confirm redemption (you're already paying one assignment query there). This is the cheapest item in this document and potentially the one that invalidates the headline claim.

### [VALUE: HIGH] A route↔command parity inventory
What's missing: any artifact mapping protected REST operations to their command-lane equivalents and the guard each applies. All three session-2 holes were parity holes — the command lane reimplementing (or not) something a route got from middleware. Nothing prevents the fourth except vigilance, and vigilance is what four review rounds have already spent. First move: a script that walks the Express router registry and the command registry and emits a table (route, middleware chain, command type, lane-side guard); review it by hand once; keep it in-repo as a living document. Done-when: wiring a new command to a middleware-guarded service without a lane-side guard shows up as an empty cell.

### [VALUE: HIGH] Lane-level enforcement of write-command ownership — the missing "middleware equivalent"
What's missing: ownership checks for writes are handler convention. `dispatchDeleteWorkoutPlan` remembers to call `assertAssignmentOrAdmin` because a review caught it not doing so. The known-issue "dispatcher self-gating unproven" is the symptom; the gap is that nothing *enforces* it — no runtime check at `dispatch()`, no test that every write dispatcher declares its mode. What it costs: the next handler author forgets, and neither a test nor the runtime notices, because the registry carries no declaration to check against. First move: add an `ownership` field to command metadata (`client-ref` | `handler` | `none:readonly`), have `dispatch()` refuse writes without one, and pair it with the registry lint above. This converts the documented "stated division of labour" from a comment into an invariant.

### [VALUE: MED] Denial and audit telemetry — the lane has no eyes
What's missing: handler denials mimic not-found and go unrecorded (bug 3 above); `auditConfirm` is best-effort and swallowed, so an unhealthy system stops recording exactly when forensics matter; nothing watches the audit stream for probe patterns. What it costs: cross-tenant probing through this lane is invisible by construction, and the outage-vs-revocation conflation the code documents so carefully is the *recorded* version of a broader silence. First move: denial audit line in the dispatcher, stderr+counter on audit-write failure, a weekly grep or digest over denials.

### [VALUE: MED] Abuse controls: no rate limit, no mint quota on a lane that runs a classifier per request
What's missing: REST routes in any mature setup sit behind rate-limit middleware; the command lane — which invokes an LLM classifier per request and mints HMAC-signed destructive operations — shows nothing of the kind. What it costs: cost-abuse is trivial, and id/probe enumeration is bounded only by classifier latency. First move: a per-user token bucket at lane entry plus a cap on concurrently-pending mints per user.

### [VALUE: MED] No kill switch or incident runbook for the lane
What's missing: during an active abuse event you cannot disable Swan Coach without a deploy, force-expire pending operations, or follow a written "what do I do when the audit shows a trainer walking ids" procedure. For a lane holding destructive signed operations, incident response being deploy-shaped is a gap a fresh-eyed security engineer flags immediately. First move: env flag checked at lane entry; admin script to purge the pending-op store.

## 4. FEATURE IDEAS

- **`restore_workout_plan`** — archive is explicit and terminal, and a natural-language lane *will* archive the wrong plan via classifier ambiguity. The immutable lifecycle receipts already exist; a restore command limited to the archiving actor or admin, inside a 7-day window, is grounded in exactly the failure mode this lane creates and exercises the same authZ seam you just hardened.
- **Admin command-lane security digest** — a per-trainer rollup of denials, confirms, and destructive ops. Admin is the deliberate superset and the supervisor role; giving them the telemetry from gap 4 as a product surface (not just a grep) is cheap and on-mission.
- **Typed confirmation for destructive commands regardless of channel** — the brief says callers "type or speak." A spoken "yes" confirming a destructive operation is weak binding to intent; policy: destructive commands require typed confirmation even when initiated by voice. Grounded directly in the stated product.
- **`cancel_pending_confirmations`** — user self-service kill of one's own minted ops. Mis-minted confirms from classifier ambiguity currently cost a 120-second wait or a redemption denial; a cancel command closes that loop and is a trivial authorization case (self only).

## 5. IF ONLY THREE OF MY OWN SUGGESTIONS COULD BE DONE

1. **Push the branch and wire the pre-push gate.** All the value in this workstream currently lives on one machine; an hour of work protects everything else and makes the gate real. Nothing else on this list matters if the commits are lost.
2. **Verify role freshness (gap 1).** Cheap, and it is the only item here that can *invalidate a completed claim* — if role is a JWT claim, the 120-second fix re-checks stale paper and the headline of this workstream is wrong. You want to know that before anyone else discovers it.
3. **Dispatch-enforced ownership declarations + the registry lint (gap 3 + enhancement 2, one slice).** This structurally closes the class that produced the original hole #2 and subsumes the known "dispatcher self-gating unproven" weakness by making the declaration the testable artifact instead of the handler's memory.

Drop, with reasons: the pg_trgm migration (bug 4 has an interim scope-aware-limit fix that holds until real scale hurts); the strict authorizer variant (a forensic-quality refinement of an already-fail-closed path); property tests (valuable, but additive coverage); the kill switch and rate limiting (real, but operability work that follows deployment rather than preceding truth); all four features (good product, but none changes whether the system's central security claims are true). Refinements and additions lose to the three that determine whether the existing claims survive contact with reality.
