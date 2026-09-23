# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 513 in / 10027 out (reasoning: 7556) | total 10540
**Wall:** 153.6s

---

## VERDICT

**Q1 — Ranking (advisory, by engineering-hour value):**

1. **CI reliability — first slice.** Every shipped proof (webhook redelivery, gates, validation) is *advisory* until checks are required and bypass-resistant. Engineering work: make the gate deterministic (no network flake, fixed seeds, fail-closed on missing evidence, repeatable in an isolated workspace), collapse to one authoritative workflow, then hand the owner the required-checks flip as a one-action ask. Current enforcement state is UNPROVEN — probe before anything else.
2. **Owner-gated closure prep — run in parallel; it is the human-latency critical path.** Payment-config confirmation gates the entire later compat phase. Engineering cost is small: evidence packets so each owner decision is a zero-research yes/no (config probe output, DSN default-off proof from the *built artifact*, redelivery proof re-run from a clean isolated workspace, restart checklist for the durable worker).
3. **Release/observability.** Restart proof + observation-window instrumentation; DSN smoke test once the destination exists. Sequencing rule: destination must be live *before* the durable worker is enabled, or the observation window is blind.
4. **New OSS work — waits.** Waits on: payment config confirmed, CI enforcement real, DSN destination live + smoke-tested, worker enabled with a clean observation window, and queue-protocol probes below.

**Ordered actions (advisory only, no owner assignments):**
1. Read-only probe of CI enforcement state + gate determinism (repeat runs, offline).
2. Build all four closure evidence packets in an isolated workspace — never the dirty primary checkout.
3. Batch the owner asks: payment confirm, DSN destination, enforcement flip (gated on step 1), worker enable (gated on restart proof + window).
4. Land the queue below as an additive, non-breaking migration + local CLI; do not *activate* until the probes in BLOCKERS pass.
5. DSN smoke test → restart proof → observation window → worker enable.
6. Only then open the compat phase / new OSS slices.

**Q2 — Minimal durable queue/lease protocol** (Postgres you already run; no broker, no Redis, no provider proxy):

One job table, one append-only receipt log. `FOR UPDATE SKIP LOCKED` claim; lease-token compare-and-swap on every worker write; unique partial index per lane; expiry → `ambiguous` by default.

```
pending ──claim──▶ claimed ──start──▶ running ──complete──▶ completed
   │                  │                 │
   │─cancel           │ lease expiry    │ lease expiry / lost CAS after dispatch
   ▼                  ▼                 ▼
cancelled         ambiguous ◀────── ambiguous   (terminal until explicit resolve)
                       └─resolve(receipt_id required)─▶ completed | failed
pending ──round budget exceeded──▶ failed (terminal; no auto-requeue)
```

```sql
CREATE TABLE queue_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text UNIQUE NOT NULL,      -- hash(lane, subject_ref, kind, round) → idempotent enqueue
  kind text NOT NULL CHECK (kind IN ('consultation','build_slice')),
  lane text NOT NULL,
  subject_ref text NOT NULL,            -- sanitized pointer; no secrets, no customer data
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','claimed','running','completed','failed','ambiguous','cancelled')),
  attempt int NOT NULL DEFAULT 0,
  round int NOT NULL DEFAULT 1,          -- bounded review-round budget enforced at enqueue AND claim
  lease_token uuid, leased_until timestamptz,
  seat_id text, model_id text,           -- written BY the claim txn from the seat registry, never by the worker
  request_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_active_per_lane ON queue_jobs(lane)
  WHERE status IN ('claimed','running');            -- duplicate-dispatch backstop
CREATE INDEX claim_idx ON queue_jobs(created_at) WHERE status='pending';
CREATE INDEX reaper_idx ON queue_jobs(leased_until) WHERE status IN ('claimed','running');

CREATE TABLE queue_receipts (            -- append-only: REVOKE UPDATE, DELETE
  id bigserial PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES queue_jobs(id),
  at timestamptz NOT NULL DEFAULT now(),
  event text NOT NULL,                  -- dispatched|heartbeat|receipt|lost_lease|expired|resolved
  seat_id text, model_id text, provider text,
  request_hash text, payload_digest text, artifact_path text,  -- digests + local path, not full payloads
  reproduced_locally boolean
);
```

Transition rules (the whole protocol):
- **Claim:** `UPDATE ... SET status='claimed', lease_token=gen_random_uuid(), leased_until=now()+ttl WHERE id = (SELECT id FROM queue_jobs WHERE status='pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *` — consultations additionally require a free seat, checked under `FOR UPDATE` on the seat registry inside the same transaction; a `dispatched` receipt row is inserted in that same transaction, *before* any provider call.
- **Heartbeat:** extend `leased_until` (CAS on lease_token), interval ≤ TTL/3; reaper cadence ≤ TTL/2.
- **Complete/fail:** CAS on `lease_token`; rowcount 0 → lost lease → write nothing further, log `lost_lease`, abort.
- **Expiry:** strict default → `ambiguous`. Safe relaxation only if the job has *zero* `dispatched` receipts (nothing could have billed the seat or produced output) → requeue, `attempt+1`, still round-bounded.
- **Busy/free:** derived view — `pending / active / ambiguous / longest_lease` per lane, joined to seat registry. The registry is display; **active leases are truth**. Divergence between the two is itself an alert.
- **Fail-closed invariants:** (1) lost CAS never retries writes; (2) expiry-with-dispatch is quarantined, never auto-retried; (3) two receipts for one `dedupe_key` → quarantine the newer and alert; (4) a completed consultation with NULL `model_id` is invalid → forced `ambiguous` (identity loss = no trust); (5) round budget exceeded → terminal `failed`; (6) DB unavailable → enqueue fails loudly, never falls back to an in-memory queue; (7) a build slice cannot reach `completed` while its consultation receipt has `reproduced_locally IS NOT TRUE` — advisory output stays visibly unverified until the builder reproduces it locally.
- The existing single-flight lock remains the in-process guard; this table is the durable cross-restart backlog for when both seats are busy. Provider calls go direct from the worker; no base-URL/API proxy.

**Q3 — Local vs external split:**
- **Local (repo scripts + docs):** CLI subcommands `enqueue / claim / heartbeat / resolve --to completed|failed (requires receipt id) / status`; the reaper; closure evidence packets; migrations; runbook for `ambiguous` adjudication; protocol spec with the fail-closed invariants above.
- **External:** nothing required at two seats / one active builder. The reaper may be cron/systemd-timer (or pg_cron) firing the local script — it may only *fire*, never own state; state stays in Postgres. Revisit an external task layer only for multi-host dispatch or latency guarantees, and even then as a trigger, not a state store. Agreed exclusions, restated: no message broker, no Redis lease store, no unreviewed provider API/base-URL proxy (exfiltration + billing risk).

## BLOCKERS

Owner-gated (calendar, not engineering): payment-config confirmation; DSN destination; required-checks flip; worker enable after restart proof + window. Sequencing: destination before window; enforcement flip only after determinism probe; compat phase only after payment confirm; queue activation only after probes below.

**Assumptions requiring a fresh local probe:**
1. Postgres ≥13 (native `gen_random_uuid`) and ≥9.5 (`SKIP LOCKED`) — verify version.
2. Seat registry durability: in-memory or DB? If in-memory, leases are the only cross-restart truth.
3. Single-flight lock scope: process-local or cross-process (file lock)?
4. Round budget enforced *pre-dispatch* (before seat consumption)?
5. CI enforcement today: required checks present? Admin bypass used? (read-only probe)
6. Gate determinism: identical results across repeat/offline runs.
7. DSN gating default-off in the **built artifact**, not just in source.
8. Redelivery proof reproducible from a clean isolated workspace.
9. Provider billing on interrupted/abandoned calls — UNPROVEN; this decides strict vs relaxed expiry.
10. Do lane-coordination dedupe keys exist to feed `dedupe_key`, or must they be defined?
11. All timestamps from DB `now()`, no client clocks (lease-skew forgery).
12. Audit that no proof artifact originates from the dirty primary checkout.

## ATTACKS

- Poller race → duplicate dispatch (mitigated: SKIP LOCKED + partial unique index; attacked if any code path bypasses the claim SQL).
- Stale worker double-write after lease loss (CAS rowcount=0 must abort; a worker that "retries just in case" breaks the model).
- Receipt tampering/model-identity spoofing via worker-supplied fields (mitigated: identity written by claim txn from registry; receipts append-only, digest-bound to `request_hash`).
- Requeue-loop billing DoS against paid seats (attempt caps, round budget, expiry→ambiguous).
- Busy-state lie: registry says free, lease active — derive from leases; alert on divergence.
- Fail-open "fixes": deleting or editing `ambiguous` rows instead of adjudicating — append-only + resolution-as-event.
- Unreviewed proxy as prompt/receipt exfiltration path — banned.
- Clock-skew lease forgery — DB time only.
- Enforcement theater: flaky gate + admin bypass habit silently converts required checks back to advisory — the most likely real-world failure of Q1.

## HIGHEST RISK

1. Advisory model output consumed as verified (reproduction gap) — the queue must make unverified receipts impossible to miss.
2. Enforcement flipped onto a flaky gate → merge freeze → bypass culture → gates become decoration.
3. Durable worker enabled without a live observability destination → blind observation window.
4. `ambiguous` states resolved by mutation/deletion rather than adjudication — destroys fail-closed silently.
5. Compat phase opened before payment config confirmed → rework/rollback exposure.

## CONFIDENCE

- Shipped prior work (centralization, validation, dialog, scaffolding, DSN gating, redelivery proof): VERIFIED as reported; redelivery re-run from clean workspace still pending.
- Ranking (CI first, owner-closure prep parallel, OSS waits): LIKELY.
- Postgres lease-queue minimal design: LIKELY (standard pattern); activation contingent on probes 1–4, 9–11.
- Current CI enforcement state: UNPROVEN until probe.
- Provider billing-on-interruption behavior: UNPROVEN — hence strict expiry default.
- "No external scheduler needed at current scale": LIKELY.
- Dirty-checkout contamination of any proof artifact: UNPROVEN until audit.
