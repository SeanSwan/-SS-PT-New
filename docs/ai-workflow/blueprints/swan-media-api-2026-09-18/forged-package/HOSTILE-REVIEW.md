# PART A — Hostile Review (Astra Pro)

> Review first, per the Forge: findings carry file:line evidence and a fix.
> A finding without a fix is not a finding.

---

**Assessment: DEFECTS FOUND. Implementation advancement remains blocked.**

Reviewed the supplied packet, prior adjudication, selected ledger sections, and targeted source files in `C:/tmp/ss-media-api`. Verified HEAD as `90f8e34ed228fbe207dcdfdbcf12c4003c037e0d`, branch `feat/media-api-2026-09-18`. The packet file is untracked; the working tree is therefore not entirely clean.

The recorded **29 gates / 1097 assertions** remain historical evidence supplied by the lane. They were not rerun here. Node execution and the continuity-count command failed with `Access is denied`. No provider was enabled, no service started, and no files changed.

Read the existing archive entry `2026-09-19-160803-swan-media-api-lane-round-23-the-queue.md`. Its settled completion-module findings are not presented as new discoveries. README lines 537–1037 remain outside this review.

**Archive status: BLOCKED.** This session permits reads only. The required filing to `Z:\HostileReviews` and reindexing could not be performed; this response is an unfiled review draft, not a completed Rule 86 archive receipt.

**A1 — Existing blueprints and ledger**

| ID | Severity | Evidence | Finding and concrete fix |
|---|---|---|---|
| A1-01 | High | `ASTRA-PRO-REPLY.md#D-G`; `README.md#Next` | The authoritative Slice 1 requires the audited **Wan** workflow and restart reconciliation. “Next” substitutes **H3** and calls the remaining work a configuration exercise. That contradicts the chosen entry gate and understates admitted recovery gaps. **Fix:** retain Wan as the Slice 1 target, require the entire original exit, and block if its actual graph or resource authority is unavailable. H3 substitution requires a separate explicit plan amendment. |
| A1-02 | High | `server.mjs:69–76`; `ASTRA-PRO-REPLY.md#D-D` | The claimed loopback invariant contains `SWAN_MEDIA_API_ALLOW_NON_LOOPBACK=1`, which bypasses refusal. This is an enforceable exception to a non-negotiable prohibition, not merely missing live listener evidence. **Fix:** remove the exception; reject non-loopback addresses even when the legacy variable is set. Accept literal loopback addresses only. |
| A1-03 | High | `routesCatalog.mjs:67`; `README.md#The flow, demonstrated over a real socket`; `ASTRA-PRO-REPLY.md#D-H/CAP-001` | `runnable: on && caps.transport === 'comfyui'` equates enablement and transport identity with readiness. It does not establish the graph, bindings, licence context, resource authority, or backend observation. The conceded absence of a live GPU test does not fully disclose this affirmative API claim. **Fix:** derive readiness from a timestamped, profile-bound observation; missing evidence yields `runnable:false` and explicit blockers. |
| A1-04 | High | `store.mjs:79`; `store.mjs:102–108`; `README.md#NOT proven/11`; `ASTRA-PRO-REPLY.md#D-E` | The recovery concession is incomplete. Valid JSON with an invalid collection shape becomes an empty store, and retention prunes by count without preserving nonterminal jobs. Recovery cannot reconcile records already discarded. **Fix:** validate schema and every record; block on malformed state; never count-prune unresolved jobs, reservations, leases, or idempotency references. |
| A1-05 | High | `server.mjs#handle`, idempotency lookup and subsequent `jobs.update`; `ASTRA-PRO-REPLY.md#D-A,D-E` | “Same key, same job” is weaker than the specified durable admission contract. The lookup does not compare request fingerprints, and the idempotency key is attached after job creation and runner invocation. **Fix:** atomically persist principal, key digest, request fingerprint, quote consumption, job, and reservation before dispatch eligibility. Different payload under the same key returns `409`. |
| A1-06 | High | `README.md#NOT proven/5,6,21`; `generateVideo.mjs:199,207`; `ASTRA-PRO-REPLY.md#D-C` | The ledger concedes post-success accounting, then calls not counting failed free renders “correct” and quote reuse “safe” because daily caps bind. Those conclusions contradict **admitted-run** accounting and overlook overlapping admissions. Zero provider charge does not mean zero volume consumption. **Fix:** charge run volume at durable admission for every lane; retain the charge on failure/cancellation; reserve atomically before dispatch. |
| A1-07 | High | `ASTRA-PRO-REPLY.md#D-G`; `README.md#Next` | Slice 1 requires durable restart/lease recovery, while Slice 2 postpones the mechanisms needed to provide it. The build dependency is circular. **Fix:** place the minimum admission journal, lifecycle adapter seam, and lease recovery inside Slice 1; retain exhaustive crash and concurrency hardening in Slice 2. Slice numbers and live authorization gates remain unchanged. |
| A1-08 | Medium | `README.md#The headline number`; `ASTRA-PRO-REPLY.md#D-B,D-C` | “Local MiniMax H3 @ 6s: $0.00” reinstates a duration the graph cannot promise and implies equivalence the adjudication expressly rejected. **Fix:** state “hosted six-second arithmetic at the supplied published rate: $0.78; audited local execution: zero provider/API charge, output duration profile-bound and measured afterward.” |
| A1-09 | Medium | `routes.mjs:63–69`; `ASTRA-PRO-REPLY.md#D-A,D-E` | A quote always records `grant_recorded:false`, even though resolution reads configured grants. This is not an honest snapshot when a grant actually authorized admission. **Fix:** return the authoritative licence decision from the existing gate and snapshot its evidence reference; never infer a grant, and never hardcode its absence. |
| A1-10 | Medium | `routesCatalog.mjs:168`; `ASTRA-PRO-REPLY.md#D-F` | The estimate caveat says published-rate arithmetic “bounds exposure,” although the packet lacks the billable-quantity and maximum-charge contract. The NOT-proven list does not cure an affirmative wire claim. **Fix:** expose `charge_bound_verified:false`; use exact copy stating that arithmetic neither authorizes execution nor establishes a maximum charge. |
| A1-11 | Medium | `ASTRA-PRO-REPLY.md#D-A,D-E` | The adjudication accepts server-owned image/preview asset IDs but supplies no ingress or approval contract. It also expires idempotency records after 90 days while forbidding expired-key reuse indefinitely. Both leave consequential builder choices. **Fix:** initially accept only qualifying existing gateway assets; explicitly block external image ingestion. Retain compact idempotency tombstones beyond full-job retention. |
| A1-12 | Medium | `README.md#Readiness receipt`, `#Re-verified from the patch`, `#NOT proven/25` | The stale patch is already conceded; the remaining defect is that authoritative-looking present-tense patch receipts survive beside the concession. Arithmetic consistency cannot establish execution against a particular artifact. **Fix:** make the commit the sole current handover identity; label patch receipts historical/unreproduced and attach future test results to commit, dirty diff, command, environment, and exit status. |

The other conceded gaps remain open requirements, **not new findings**: hosted schemas and licence evidence, reservation accounting, float bridging, caller identity, range responses, cancellation reachability, provenance execution identity, GPU retries, artifact-origin controls, short-secret handling, and absent live verification.

Their dispositions are explicit below. “Disclosed” does not mean “accepted for enablement.”

**A2 — One review of the draft package**

The draft was reviewed once. These changes are incorporated in Part B:

| ID | Draft defect | Correction incorporated |
|---|---|---|
| A2-01 | “Single writer” could be mistaken for a second GPU lock. | Separate gateway persistence ownership from the existing GPU resource authority; forbid a replacement GPU lock. |
| A2-02 | Single-use quotes would reject legitimate same-key retries. | Resolve authenticated idempotency replay before quote consumption/expiry checks; changed payload still conflicts. |
| A2-03 | A successful artifact could be withheld indefinitely by pending vendor settlement. | Keep execution state and settlement state independent; success requires verified assets, not a fabricated settled charge. |
| A2-04 | New schema restoration could duplicate an ambiguous submission. | Rollback stops dispatch and preserves unresolved exposure; never restore an old snapshot as authority over later submissions. |
| A2-05 | Named future test files could be mistaken for existing runnable evidence. | Mark future suites **TO IMPLEMENT / NOT RUN**; supply a standalone executable snapshot audit separately. |
| A2-06 | Generic download retry could fetch a new target after a redirect. | Disable automatic redirects; independently validate each allowed hop, resolved address, and destination policy. Unknown CDN contracts block hosted ingestion. |
| A2-07 | A clock reset could make a used spending period look fresh. | Persist accounting-day progression; clock rollback blocks new admissions until reconciled. |
| A2-08 | Live verification looked like the next executable command. | No live command is supplied or invoked without the operator’s explicit authorization and a bounded run manifest. |
