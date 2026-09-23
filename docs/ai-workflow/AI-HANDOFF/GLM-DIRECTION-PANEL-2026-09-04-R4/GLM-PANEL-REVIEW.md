# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 741 in / 14147 out (reasoning: 11173) | total 14888
**Wall:** 196.8s

---

## VERDICT

REVISE — the program direction is sound, but closure sequencing must be tightened before opening new OSS surface: make CI enforcement real first, close the owner-gated items (payment-config confirmation evidence, DSN destination), hold worker enablement behind restart proof plus an instrumented observation window, and add a fail-closed durable lease queue before delegating more build slices. Advisory only: no edits, no deployment, no owner decisions made or implied here; this brief is not treated as authorization to ship.

Scope: reviewed from the sanitized brief alone — no repository, credentials, or infrastructure accessed. Every environment claim below is UNPROVEN until probed locally.

**Ranked next slices (Q1):**

1. **CI reliability — make enforcement real.** Highest value: converts every already-shipped slice (payment-client centralization, shared validation, dialog primitive, worker scaffolding, DSN gating, redelivery proof) from silently reversible to protected, and is engineering-controllable now. Verify in a scratch branch before any branch-protection toggle. LIKELY.
2. **Owner-gated closure prep** (small engineering slice + one owner decision each). (a) Payment-config confirmation: build a read-only verification probe and canary spec so the owner's confirmation is a single evidenced decision — this unblocks the largest later compatibility phase. (b) DSN destination: configure a staging sink, prove end-to-end with a synthetic error, stage the prod DSN for owner approval. LIKELY.
3. **Release/observability.** Worker restart proof in an isolated workspace (kill mid-job, verify resume with no duplicate side effects) plus the instrumentation the "safe observation window" requires: queue depth, lease age, orphan completions, dead-job count. DSN staging verification rides along with #2. Worker enablement itself waits. LIKELY.
4. **New OSS work — waits entirely.** It adds unaudited surface while the gate is advisory and production error visibility is dark.

**What waits on what:**
- Payment compatibility phase ← owner confirmation of the external payment configuration.
- Production error visibility ← DSN destination configured + synthetic-error verification.
- Durable-worker enablement ← restart proof + a defined observation window with metrics and exit criteria in place.
- New OSS upgrades ← real CI enforcement + items above.

**Ordered actions:**
1. Probe CI enforcement state (scratch branch with a deliberate red check) — UNPROVEN until run.
2. Convert advisory checks to blocking required-status checks; test that a red PR blocks merge.
3. Stage the DSN sink, run a synthetic error in staging, prepare the prod DSN change for the owner.
4. Produce the payment-config confirmation evidence pack (read-only probe + canary spec); hand to owner.
5. Run the worker restart proof in an isolated workspace; record the artifact.
6. Implement the minimal lease queue below plus its CI tests; route seats through it.
7. Define the observation window (duration, metrics, exit criteria) before any enablement.
8. Only then queue owner decision points: prod DSN, worker enablement, payment-config confirmation.

## BLOCKERS

No P0/P1/P2 blocker reproduced.

Nothing was probed. Advisory candidates (deliberately not numbered as P-findings), each Not tested — UNPROVEN:
- C1: CI gate advisory (brief lists "make CI enforcement real") → silent regression risk.
- C2: DSN-gated reporting with unconfigured destination → production blind window.
- C3: Worker enablement possible before restart proof → duplicate side effects on the payments path.
- C4: Consultation coordination not durable across processes/restarts → duplicate dispatch or lost receipts when seats are busy.

Reproducible: Not tested — UNPROVEN.

## ATTACKS

**Current-state vectors:**

- **V1 Regression injection while the gate is advisory.** Scenario: a PR with a failing check merges because enforcement is off. Evidence: brief item "make CI enforcement real" implies enforcement is not yet real (documentary, UNPROVEN). Test: a red PR must block merge after the change; before the change, expect it not to.
- **V2 Dark production.** Scenario: a post-upgrade payment failure is invisible because the DSN destination is unconfigured. Evidence: brief item "configure the error-reporting destination". Vector: staging sink + synthetic-error canary + alert on absence of reports.
- **V3 Premature worker enablement.** Scenario: crash mid-job; recovery re-executes a side-effecting step (webhook/charge retry) twice. Evidence: enablement is gated on a "restart proof" that therefore has not been produced. Test: kill −9 mid-job N times in an isolated workspace; require at-least-once dispatch with idempotency keys and zero duplicate observable effects.
- **V4 Coordination ambiguity at two seats.** Scenario: two lanes free simultaneously; both dispatch the same consultation → paid seat burn + conflicting advisory outputs. Evidence: the brief describes a single-flight lock, seat registry, and lane coordination but no durable queue. Vector: dedupe key + conditional claim, below.

**Minimal durable queue/lease protocol (Q2)** — one PostgreSQL table (the stack already runs Postgres; no new infra, no rewrite; the existing single-flight lock remains the local synchronous executor):

State machine: `queued → leased → done | failed`; `failed` requeues with backoff while `attempts < max_attempts`, else `dead`; expired `leased` is reaped back to `queued` (attempts++, else `dead`); `budget_exceeded` is terminal, set at enqueue when round exceeds the review-round budget. All lease arithmetic uses database `now()`, never application clocks.

```sql
CREATE TABLE consult_jobs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key       text UNIQUE NOT NULL,      -- e.g. lane:phase:round:target
  kind             text NOT NULL CHECK (kind IN ('model_consult','build_slice')),
  lane             text NOT NULL,
  round            int  NOT NULL CHECK (round >= 1),
  payload          jsonb NOT NULL,
  state            text NOT NULL DEFAULT 'queued'
                   CHECK (state IN ('queued','leased','done','failed','dead','budget_exceeded')),
  attempts         int  NOT NULL DEFAULT 0,
  max_attempts     int  NOT NULL DEFAULT 3,
  lease_token      uuid,
  lease_owner      text,                       -- seat id / worker id
  lease_expires_at timestamptz,
  visible_at       timestamptz NOT NULL DEFAULT now(),
  receipt          jsonb,  -- {seat_id, model_id, request_hash, round, attempt, started_at, finished_at}
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consult_jobs_claim_idx ON consult_jobs (visible_at) WHERE state = 'queued';

-- busy/free derived from live leases; seats = existing seat registry, capacity 1 each
CREATE VIEW seat_state AS
SELECT s.seat_id,
       CASE WHEN COALESCE(l.live,0) >= s.capacity THEN 'busy' ELSE 'free' END AS state
FROM seats s
LEFT JOIN (SELECT lease_owner, count(*) AS live FROM consult_jobs
           WHERE state='leased' AND lease_expires_at > now()
           GROUP BY lease_owner) l ON l.lease_owner = s.seat_id;
```

Transitions — each a single conditional statement; this is the entire protocol:

1. **Enqueue (idempotent):** `INSERT … ON CONFLICT (dedupe_key) DO NOTHING`; if round > budget → insert as `budget_exceeded` (fail closed: never dispatched).
2. **Claim (exactly one winner):**
```sql
UPDATE consult_jobs
SET state='leased', lease_token=gen_random_uuid(), lease_owner=:seat,
    attempts=attempts+1, lease_expires_at=now()+interval '15 minutes'
WHERE id = (SELECT id FROM consult_jobs
            WHERE state='queued' AND visible_at <= now()
            ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
  AND :seat_is_free   -- no live lease exists for :seat
RETURNING *;
```
3. **Heartbeat:** extend `lease_expires_at` where `lease_token` matches and `state='leased'`.
4. **Complete (lease-scoped):** `UPDATE … SET state='done', receipt=:r WHERE id=:id AND lease_token=:t AND state='leased' RETURNING id;` — zero rows ⇒ orphan completion: drop and log; never overwrite (fail closed).
5. **Reaper** (run inside the claim transaction or on a timer): requeue `leased` rows with `lease_expires_at < now()`, clear lease columns, promote to `dead` at `max_attempts`.

**Requirement coverage:**
- Duplicate dispatch: unique `dedupe_key` prevents duplicate jobs; `FOR UPDATE SKIP LOCKED` conditional claim prevents duplicate claims. Test: two concurrent claimers, exactly one row returned.
- Busy/free state: `seat_state` view plus one `queue-status` script (queue depth, oldest age, live leases, dead count).
- Stale workers: lease expiry plus token-scoped completion — a zombie's late completion cannot corrupt a newer attempt.
- Model identity/receipts: completion validates `receipt.model_id` against the seat-registry lineage; mismatch ⇒ `dead` with reason `receipt_invalid`, never `done`. Provider output stays advisory; the active builder reproduces claims locally, bounding blast radius.
- Fail closed on ambiguity: unverifiable seat state ⇒ treated busy; DB unreachable ⇒ enqueue/dispatch refused loudly with no in-memory fallback (degrade to the existing synchronous single-flight path); duplicate completion ⇒ first conditional write wins, second logged.

**Residual vectors (accept or mitigate):** crash between provider call and completion write loses a receipt for that attempt (acceptable — output is advisory; log the attempt id); receipts must store hashes and model identity only, no prompt text or PII; terminal rows need a retention rule so the table doesn't become an informal message log.

## HIGHEST RISK

Ranked:
1. Enabling the durable worker before restart proof + observation window — duplicate side effects on the payments path. Severity high; likelihood low if the ordering above is respected. Current enablement state UNPROVEN.
2. CI gate advisory — every shipped slice is silently reversible and this compounds all other risk. UNPROVEN.
3. Consultation coordination ambiguity when both seats are busy — duplicate paid dispatch or lost receipts; bounded today by the single-flight lock, whose scope (in-process vs cross-process) is UNPROVEN and determines whether the queue is needed for correctness now or only for visibility/defer.
4. Process risk: payment-config confirmation stalls → temptation to start new OSS work early → scope creep while 1–3 remain open.

**Local scripts/docs vs external layer (Q3):**

Local (repo):
- Queue migration + thin lib (claim/complete/heartbeat/reaper) + `enqueue` and `queue-status` CLIs.
- CI tests for the protocol: concurrent-claim race, stale-lease requeue, orphan-completion drop, budget exhaustion, crash-resume.
- Runbooks: restart-proof procedure, observation-window checklist (duration, metrics, exit criteria), DSN verification, payment-config confirmation evidence pack.
- Protocol doc: invariants, fail-closed rules, receipt schema.

External (deferred; adopt only on trigger):
- Wall-clock reaper/backoff timer if no long-lived process exists — smallest step is a scheduled CI job or system timer invoking the reviewed reaper script; no new datastore.
- A real orchestrator (Temporal/Celery/queue-service class) only when multi-host dispatch, cross-repo lanes, high volume, or sub-second lease granularity appears — none evidenced.
- Owner approvals and decision tracking stay in the existing human channel, not in code.

Explicitly not recommended: a broad rewrite of the existing consultation tooling, or an unreviewed API/base-URL proxy for provider traffic — provider calls stay on the reviewed code path behind existing gating.

**Assumptions requiring fresh local probes:**
1. Postgres ≥ 13 (builtin `gen_random_uuid`) and `SKIP LOCKED` behavior under two concurrent sessions. Not tested — UNPROVEN.
2. CI enforcement actually advisory: a red-check scratch PR merges before the change and blocks after. UNPROVEN.
3. DSN destination absent in production; reporting safely dark, not half-configured. UNPROVEN.
4. Worker restart semantics: resume, idempotency keys, no duplicate observable effects. UNPROVEN.
5. Single-flight lock scope: cross-process or in-process only. UNPROVEN.
6. Seat registry matches the provider console (two seats, one lineage). UNPROVEN (owner-assisted).
7. Webhook-redelivery proof still reproducible/fresh. UNPROVEN.
8. All build slices run from isolated workspaces; the dirty primary checkout is never built from. UNPROVEN.

## CONFIDENCE

Scenario: advisory ranking, fail-closed lease protocol design, and local/external split derived from a sanitized brief with zero environment access.
Evidence: the sanitized direction brief only; no repository, CI logs, database, or provider console inspected; no probes executed.
Verified: nothing — no environment claim was verified fresh; all such claims are marked UNPROVEN.
Reproducible: Not tested — UNPROVEN for every environment claim; the protocol design is reproducible on paper (SQL above) and must be validated by the eight listed probes before use.
Confidence: ranking order LIKELY (follows from the brief's own sequencing constraints); single-table lease adequacy for two seats LIKELY (standard pattern at this scale); the REVISE verdict LIKELY (documentary reading, not a reproduced defect); all environment-state statements UNPROVEN.
Uncertainty: actual CI enforcement state; single-flight lock scope; worker restart behavior; DSN/production configuration state; seat registry accuracy; Postgres version and feature availability; freshness of the webhook-redelivery proof.
