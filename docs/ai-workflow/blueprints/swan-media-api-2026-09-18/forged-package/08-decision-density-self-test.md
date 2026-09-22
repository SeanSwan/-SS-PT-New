# PART C — Decision-Density Self-Test

> Every remaining builder choice: decided-in-package, or delegated-with-bounds.

---

| Remaining builder choice | Decision or bounded delegation |
|---|---|
| Public API shape | Neutral `/v1` quote → job → asset; exact routes and record fields specified |
| Existing flattened request compatibility | Migrate lane fixtures to the strict target shape; do not silently accept both ambiguous forms |
| Extra estimate/health endpoints | Retained with explicit read-only/liveness semantics |
| Local versus hosted identity | Provider-qualified route is authoritative; branding is not equivalence |
| Model-only routing | Exactly one server-pinned target; otherwise 409 |
| Slice 1 model | Wan remains authoritative; H3 substitution is not delegated |
| Actual Wan graph | **Blocked fact:** locate and audit existing artifact; no invented workflow |
| Existing GPU authority interface | **Blocked fact:** identify and verify actual implementation; no second lock |
| H3 duration | Profile-only; requested seconds refused |
| Auth identity | Per-principal opaque token verifier; body fields cannot establish authority |
| Token provisioning | Sean provisions restricted records; no secret values or credential creation in this pass |
| Licence grant representation | Snapshot existing gate’s evidence; never hardcode absence |
| Input/preview ingress | Existing qualifying owned assets only; upload feature out of scope |
| Readiness lifetime | Timestamp/profile bound; unknown or stale observation refuses quoting |
| Exact observation freshness | Builder may choose 1–60 seconds for local readiness, documented and tested; admission always rechecks |
| Quote reuse | Single-use new admission; same-key replay retained |
| Idempotency expiry | Durable tombstones; capacity exhaustion refuses new work |
| Money representation | Integer micro-dollar authority with exact decimal wire values |
| Higher precision prices | Block until explicit precision/schema amendment |
| Volume accounting | Count admitted jobs, including failed/canceled local jobs |
| Midnight and clock rollback | Outstanding exposure persists; backward day movement blocks admission |
| GPU time | Measured occupancy only; no hard-cap promise |
| Job and settlement completion | Independent states; no fabricated refund or erased charge |
| Submission retry | Never automatic |
| Observation retry timing | Builder may select bounded backoff between 1 and 30 seconds; deadline enters reconciliation, never resubmission |
| Cancellation | Serialize against intent; ownership-safe operations only |
| Store mechanism | One durable writer and journal around existing ledger; actual Windows crash proof required |
| Filesystem durability API | Builder must use supported flush primitives and prove process-crash recovery; unsupported semantics block acceptance |
| Retention | Explicit periods; unresolved records protected; no count-based active pruning |
| Legacy data migration | Preserve bytes and unknowns; no inferred callers, charges or outcomes |
| Artifact transfer | Controlled root, inspected media, checksum, byte cap, single ranges |
| Hosted CDN/schema/charge facts | **Blocked external evidence:** retrieve; never guess |
| Hosted execution authorization | **Blocked authorization:** separate explicit bounded approval required |
| Module extraction | Builder may split by responsibility under 300 lines; no new authority or unrelated refactor |
| Test implementation | Named cases/files/commands specified; fixture internals delegated only within isolated, zero-egress bounds |
| Historical green receipt | Recorded evidence only until rerun against exact artifact |
| Review filing | **Blocked environment:** read-only session cannot archive or reindex |
| Completion claim | Revised package emitted; implementation readiness, archive completion and live proof remain blocked |

**Self-test result:** consequential choices are decided, bounded, or explicitly blocked. The package does not convert missing facts or authorization into builder discretion.
