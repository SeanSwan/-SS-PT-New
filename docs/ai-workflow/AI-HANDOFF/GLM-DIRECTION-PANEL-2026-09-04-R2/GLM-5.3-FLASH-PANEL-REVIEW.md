# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 513 in / 7272 out (reasoning: 5437) | total 7785
**Wall:** 227.7s

---

## VERDICT

Advisory only — nothing below authorizes shipping, editing, or owner decisions.

**Ranking (highest value first):**

1. **Owner-gated closure — payment configuration confirmation** (VERIFIED per brief that it gates a later compatibility phase). Cheapest unlock on the critical path; a wrong config surfaces as production checkout breakage later. Do this first.
2. **CI reliability — make enforcement real** (LIKELY highest leverage per unit of effort). Advisory gates protect nothing; every later slice, including queue-driven consultation work, inherits the enforcement. Constraint: enforce only on clean isolated workspaces, never the intentionally dirty primary (VERIFIED that primary is dirty; enforcement target is UNPROVEN).
3. **Release/observability — error-reporting destination** (LIKELY prerequisite, not parallel work). The durable-worker observation window is only as good as its error visibility. Cheap; do before worker enablement.
4. **Owner-gated closure — durable worker enablement, last.** Sequence: restart proof → error destination live → observation window → enable. Enabling first inverts the safety order.
5. **New OSS work — deferred.** It adds review surface before closure and raises the cost of flipping CI enforcement (larger unverified delta).

**Ordered actions:**

1. Payment config probe: produce a test-mode/sandbox configuration proof; record evidence; owner schedules compatibility phase against it.
2. CI baseline: prove green on a clean workspace, then flip blocking on scoped workflows only.
3. Configure error-reporting destination; fire one end-to-end test event; keep DSN gating.
4. Restart proof for the durable worker (kill mid-task, verify no lost/duplicated work), then start the observation window with #3 live.
5. Queue/lease CLI v0 (see ATTACKS) running **manual-dispatch only, no auto-requeue**, until the BLOCKERS probes land.
6. New OSS work resumes only after 1–5.

**What waits:** compatibility phase → #1; enforcement → green baseline; worker enable → #3+#4; OSS → #2; any queue automation → probes.

## BLOCKERS

Assumptions requiring a fresh local probe (all UNPROVEN from this brief):

1. **Single-flight lock semantics.** flock vs. pidfile? Behavior on SIGKILL? Reused across reboot? Determines the liveness-token design; a reboot-reused lock is a duplicate-dispatch hole.
2. **Model identity in responses.** Does the provider echo model id/version per response? Receipt integrity (below) depends on it; if absent, model attribution stays UNPROVEN forever.
3. **Persistence substrate of the consultation tooling.** Files? Existing Postgres? Whether atomic CAS transitions are possible at all today.
4. **Branch-protection admin rights** and existence of a known-green CI baseline on workspaces.
5. **Payment provider proof path.** What evidence the compatibility phase requires, and whether test mode can produce it without touching production keys.
6. **Durable-worker checkpoint safety.** Does scaffolding resume cleanly after kill -9 mid-task?
7. **Error-destination payload compatibility** with the current SDK/format.
8. **Seat registry vs. job store drift.** Same store or two sources of truth?
9. **CI scope today** — does CI run against the dirty primary at all?
10. **Clock discipline** if anything is multi-host (LIKELY single-host; verify).

Until 1–3 resolve: queue defaults to fail-closed manual dispatch.

## ATTACKS

Failure modes and the minimal protocol that defeats them. Design pattern confidence: LIKELY; integration: UNPROVEN pending probes.

**State machine** (all transitions are CAS on `(state, lease_epoch)` in one transaction):

```
QUEUED ─acquire(e→e+1, holder, ttl)──────────────► LEASED
LEASED ─holder commits receipt+DONE, epoch match─► DONE        (terminal)
LEASED ─holder reports failure───────────────────► FAILED      (terminal)
LEASED ─lease expired ∧ heartbeat stale───────────► QUEUED(attempt+1)
                                                     └─► DEAD if attempt ≥ budget
ANY     ─ambiguity detected──────────────────────► QUARANTINE (manual reset only)
```

**Schema** (SQLite beside the tooling or existing Postgres — no new service):

```
jobs:      job_id, idem_key UNIQUE, job_type(REVIEW|BUILD_SLICE), lane,
           state, attempt, max_attempts, lease_holder, lease_epoch,
           lease_expires, last_error, created_at, updated_at
receipts:  receipt_id, job_id, attempt, lease_epoch, seat_id, model_id,
           model_lineage, endpoint_hash, request_hash, response_hash,
           rounds_used, started_at, ended_at, stale_flag
seats:     seat_id, state(FREE|BUSY|QUARANTINE), current_job,
           liveness_token(boot_id,pid), heartbeat_at
```

**Defenses:**

- **Duplicate dispatch** → idempotency key `sha256(lineage ‖ normalized_prompt ‖ slice_ref)`; insert of a second QUEUED row with the same key rejected; dispatch requires seat FREE ∧ single-flight lock ∧ epoch CAS won.
- **Stale workers** → liveness token `(boot_id, pid, heartbeat)`; reclaimer wins epoch+1 via CAS; the superseded worker's commit fails epoch match and its receipt is stored `stale_flag=true`, never trusted for state.
- **Lost/misattributed output** → DONE and its receipt commit atomically; DONE without receipt → QUARANTINE. Receipts carry exact `model_id`, endpoint hash, request/response hashes, rounds used.
- **Fail-closed triggers** (any → QUARANTINE, manual reset recording operator+reason): seat FREE while holding a LEASED job; two receipts for one `(job_id, attempt)`; attempt-counter regression; lock file with no matching live token; writer clock skew > ~5s.
- **Budget bypass** → `attempt` is durable in the row, never in memory; per-lineage circuit breaker: both same-lineage seats failing/exhausted in a window halts dispatch globally rather than retrying into a paid provider incident.
- **Advisory-only enforcement** → for BUILD_SLICE jobs, DONE requires a referenced local verification artifact (test/build log hash); for REVIEW jobs, receipts record which claims were locally reproduced — a separate linked artifact that gates downstream "verified" status, not receipt issuance.

**Local vs. external split:**

- **Local scripts/docs (recommended):** queue CLI with the schema above, a status command (seats busy/free, stuck leases), the quarantine-reset command, receipts log, and a one-page runbook.
- **External scheduler (not now):** with two seats, single-writer discipline, and low dispatch volume, a coordinator adds auth and drift failure modes without solving a real problem. Revisit only at >4 seats or multi-host; even then, Postgres job table + cron beats a platform.
- **Explicit refusal:** no API/base-URL proxy, reviewed or otherwise, in this phase; pin the endpoint in config and log its hash in receipts so an env-override redirect is visible in evidence.

## HIGHEST RISK

**Primary:** enabling the durable worker before a live error destination and restart proof — a worker that silently loses or duplicates work, detected days later by an observation window that was blind. The entire safety argument for enablement rests on observability that doesn't exist yet (LIKELY).

**Runners-up:** (a) enforcing CI against the dirty primary baseline and bricking all merges; (b) treating two same-lineage seats as independent verification — correlated provider failure or shared hallucination passes both seats, making local reproduction the only real control (LIKELY, inherent to the stated lineage constraint); (c) an unreviewed endpoint override silently redirecting consultation traffic.

## CONFIDENCE

- Ranking and sequencing: **LIKELY**, ~0.8 — sound if the compatibility phase carries the business weight the brief implies; owner may reweight.
- Queue/lease protocol design: **LIKELY**, ~0.85 at pattern level (standard lease/CAS/receipt discipline); **UNPROVEN** for integration until probes 1–3 and 8 land.
- Local-vs-external boundary: **LIKELY**, ~0.9 — robust at the stated scale.
- Attack coverage: ~0.7 — bounded by UNPROVEN knowledge of existing lock and registry internals.
- All repository facts: **VERIFIED only as stated in the brief; not independently probed.** Every numbered blocker is a fresh-probe requirement before any gating decision is treated as real.
