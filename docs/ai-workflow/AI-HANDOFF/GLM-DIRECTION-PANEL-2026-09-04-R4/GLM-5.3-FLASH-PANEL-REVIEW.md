# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 741 in / 8182 out (reasoning: 6008) | total 8923
**Wall:** 239.1s

---

## VERDICT

APPROVE — the advisory direction (close owner-gated items before expanding scope; model output stays advisory with local reproduction) is sound. This response makes no edits, no deployment claims, and no owner decisions; all items below are recommendations pending local probes.

**Q1 — Ranking of next engineering slices (highest leverage first):**

1. **CI reliability** — make the already-shipped gates *enforcing* (required checks / merge protection). Cheapest slice, protects every subsequent merge, and converts "CI-gate work shipped" from a claim into a property. A gate that only reports is not a gate.
2. **Owner-gated closure**, internally ordered:
   a. Confirm the external payment configuration — small task, and it unblocks the later compatibility phase; late discovery there is expensive.
   b. Configure the error-reporting destination — this is a *prerequisite* for the durable-worker observation window; without it the window is blind.
   c. Enable the durable worker — only after the restart proof **and** an observation window with working telemetry.
3. **Release/observability** — residual alerting/dashboard polish beyond the destination config. Waits on 2b.
4. **New OSS work** — waits on all of 1–2. Expanding surface while closure debt and unenforced gates remain increases rework risk.

What waits: compatibility phase ← 2a; worker enablement ← restart proof + observation window + 2b; OSS work ← 1, 2a–c.

**Ordered actions:**
1. Probe and flip CI enforcement (owner applies; verify a bad commit is actually rejected).
2. Confirm payment configuration; record the artifact; gate the compatibility phase on it.
3. Configure error-reporting DSN/destination; verify one real event round-trips.
4. Execute durable-worker restart proof; open observation window with telemetry from 3.
5. Enable worker (owner decision) after window criteria are met.
6. Stand up the queue/lease protocol (Q2) locally *before* parallelizing consultations/build slices.
7. Only then schedule new OSS slices.

Scenario: owner merges while gates are advisory → regression ships under "CI green" label.
Evidence: brief states CI-gate work shipped but enforcement is not yet "real" — VERIFIED as stated; enforcement behavior itself not observed.
Verified: Not tested — UNPROVEN (advisory brief only; no repo access).
Reproducible: Yes, locally, once gate definitions are inspected.
Confidence: LIKELY (ranking); implementation status UNPROVEN.
Uncertainty: whether enforcement is pure configuration vs. code change — needs probe P1 (see CONFIDENCE).

## BLOCKERS

No P0/P1/P2 blocker reproduced.

Watchlist — design risks, **not reproduced**, each carrying its probe:

- R1 Duplicate dispatch race. Scenario: two workers acquire the same consultation task concurrently. Evidence: brief describes a single-flight lock but no cross-task atomicity. Test: run two `acquire` calls in parallel against one PENDING task; exactly one must win (rowcount==1). Verified: Not tested — UNPROVEN.
- R2 Stale worker commits after lease expiry. Scenario: worker pauses past TTL, wakes, writes a receipt. Evidence: no lease-token mechanism named in brief. Test: force-expire a lease, then attempt `complete`; must be rejected. Verified: Not tested — UNPROVEN.
- R3 Silent model drift. Scenario: provider resolves a model alias differently; output attributed to the wrong identity. Evidence: brief requires model identity/receipt preservation. Test: dry call must echo the pinned exact model id into the receipt; mismatch quarantines. Verified: Not tested — UNPROVEN.
- R4 Auto-requeue over an existing artifact. Scenario: expired task re-runs while partial output exists → duplicate/contradictory results. Evidence: fail-closed requirement. Test: expired task with output present must go QUARANTINED, never PENDING. Verified: Not tested — UNPROVEN.
- R5 Clock skew drives premature expiry. Scenario: worker clock ahead → reaper kills healthy leases. Evidence: multi-process timing assumed. Test: reaper must use DB clock only. Verified: Not tested — UNPROVEN.

Reproducible: All five are locally reproducible by construction once implemented; none executed — Not tested — UNPROVEN.

## ATTACKS

- Vector: submission-level duplicates (same task enqueued twice). Mitigation: `task_key = sha256(kind, canonical payload, workspace ref)`, UNIQUE; `INSERT OR IGNORE`. Status: design VERIFIED as deterministic; behavior UNPROVEN until R1 test.
- Vector: seat squatting / leaked lease (worker dies holding a seat). Mitigation: seat state derives from queue DB, never worker self-report; heartbeat extends lease; reaper on TTL expiry. Status: UNPROVEN.
- Vector: receipt forgery / builder trusting model output directly. Mitigation: receipts must reference output hash; builder reproduces claims locally before any commit cites the receipt; unreproduced receipts are inert by policy. Status: policy VERIFIED from brief; enforcement UNPROVEN.
- Vector: consultation output steering a build slice (prompt injection via reviewed content). Mitigation: build-slice payloads are owner-authored specs only; model output enters only as advisory text tied to a receipt hash, never as a dispatchable payload. Status: design-level; adversarial testing UNPROVEN.
- Vector: queue corruption / partial write. Mitigation: SQLite WAL mode; integrity check on open; on failure → read-only mode and operator alert (fail closed, no auto-repair). Status: UNPROVEN.
- Vector: status spoofing ("seat looks free"). Mitigation: `q-status` reads DB truth; seats transition FREE/BUSY only inside the same transaction as task state changes. Status: UNPROVEN.

## HIGHEST RISK

Enabling the durable worker (or declaring CI "real") on trust: an observation window without a functioning error-reporting destination is a *blind* window, and an advisory-only CI gate gives false merge assurance. Scenario: worker enabled, restart proof passes, a silent failure occurs during the window, telemetry destination unconfigured → unsafe enablement is certified as safe. Evidence: brief sequences worker enablement after proof + window; destination config is still pending — VERIFIED as stated. Verified: Not tested — UNPROVEN. Reproducible: probe P3 below. Confidence: LIKELY that this ordering (2b before 2c) removes the risk.

## CONFIDENCE

Confidence: LIKELY for the ranking and protocol design; UNPROVEN for every implementation claim — nothing was executed, per advisory scope.

**Minimal queue state machine:**

```
PENDING ──acquire(CAS, seat FREE + model pin matches)──▶ LEASED ⇄ heartbeat
LEASED ──complete(lease_token ∧ not expired)──▶ COMPLETED (+receipt)
LEASED ──worker-reported failure, no output──▶ FAILED ──(attempts<max)──▶ PENDING
LEASED ──reaper: TTL expired──▶ EXPIRED ──(attempts<max ∧ no output)──▶ PENDING
                                   └─(output exists ∨ budget exhausted)──▶ QUARANTINED
ANY 0-row transition, invariant break, seat/model mismatch ──▶ QUARANTINED + seat DEGRADED
Seat: FREE ⇄ BUSY (atomic with task transition); DEGRADED cleared only by operator.
No automatic exit from QUARANTINED. Fail closed on ambiguity.
```

**Minimal schema (local SQLite, single writer):**

```sql
tasks(task_id PK, task_key UNIQUE, kind CHECK(kind IN('consultation','build_slice')),
      payload_ref, workspace_ref, state, attempts, max_attempts,
      lease_seat, lease_token, lease_expires_at, created_at, updated_at);
receipts(task_id PK REFERENCES tasks, seat_id, provider, model_id, model_version,
         request_hash, output_hash, rounds_used, finished_at, raw_ref);
seats(seat_id PK, lineage, model_pin, state CHECK(state IN('FREE','BUSY','DEGRADED')),
      current_task, heartbeat_at, updated_at);
```

Core invariants: acquire only from PENDING via atomic `UPDATE ... WHERE state='PENDING'` (rowcount decides); complete requires matching `lease_token` and unexpired lease, else record anomaly and stop; reaper uses DB clock; busy/free read from DB only.

**Local vs. external (Q3):** Keep it local — scripts (`q-enqueue/status/acquire/heartbeat/complete/fail/reap`), `protocol.md` (states, invariants, operator runbook for clearing DEGRADED/QUARANTINED), receipts directory. The existing single-flight lock remains as seat-level mutual exclusion; the queue wraps it, does not replace it. Two seats, single host, low volume ⇒ no distributed coordination is justified. Revisit an external coordinator only if: >1 host, >~4 seats, or cross-machine visibility is needed — and even then it should coordinate task envelopes only (visibility-timeout queue), never sit in the model API path; no base-URL/API proxying, no rewrite. Uncertainty: none of the thresholds measured — UNPROVEN.

**Assumptions requiring fresh local probes:**
- P1: CI enforcement is a configuration/branch-protection change, not code.
- P2: restart-proof harness for the durable worker exists and runs.
- P3: error-reporting destination config + one event round-trip.
- P4: existing single-flight lock scope integrates cleanly under the queue's acquire step.
- P5: SQLite available/acceptable; genuinely single-writer host.
- P6: provider honors exact model-id pinning and echoes it for receipts.
- P7: heartbeat cadence vs. lease TTL vs. DB clock behavior under load.
- P8: build-slice artifact-presence semantics (what counts as "output exists" for R4).

Confidence: HIGH that fail-closed transitions (QUARANTINED terminal, DB-clock leases, token-checked commits) satisfy the stated requirements; UNPROVEN until P1–P8 run locally. Owner decisions on ordering and enablement remain with the owner.
