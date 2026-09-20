**Checkpoint artifact**

Each slice supplies:

```text
Package ID:
Slice:
Source snapshot:
Changed files and hashes:
Requirements addressed:
Commands and exit codes:
Named case counts:
Database/provider/browser boundary:
Expected RED evidence:
GREEN evidence:
Failures and unresolved findings:
Contract deviations:
Review ID and predecessor:
Verdict:
Next authorized slice:
```

Passing checks receive concise summaries with their saved output locations. Failures include the command, exit code, failing case, relevant error, and file. Setup/import failures do not count as intended RED.

**Verdicts**

- `PASS`: required evidence exists and supports that slice’s claims.
- `REVISE`: concrete corrections required; next slice remains closed.
- `HALT`: missing authority, missing essential source, unsafe environment, unresolved compatibility, or unsupported effects prevent progress.

Deferred reviews remain pending. No reset of review history or silent reviewer replacement.

**Review routing**

Use the commissioned chain: builder → Gemini → independent Codex/Astra hostile input → Fable or explicitly approved Claude Final Decider. This packet does not authorize paid calls. If a required seat is unavailable, record that checkpoint as pending with a concrete handoff.

**Reusable review remit**

> Review only this immutable slice snapshot against package CC-AI-HARNESS-20260920. Cite file:line or package section for every finding and give a concrete fix. Challenge mounted callers, role/client boundaries, operation replay, actual transaction participation, kill switches, provider payloads, proposal approval, frontend receipt honesty, accessibility, and rollback. Distinguish supplied facts, independently reproduced facts, hypotheses, and unknowns. Identify tests that could pass while the real feature remains broken. Return PASS, REVISE, or HALT without claiming deployment.

**Archive procedure**

The caller queries `Z:\HostileReviews` before the checkpoint review, supplies relevant prior findings, files the completed review with Rule 86 headers, and reindexes it. Supersession links must be reciprocal. No archive operation is claimed by this text response.

If this review was run before prior archive evidence was supplied, mark that limitation in its record and reconcile prior findings before accepting the checkpoint.

**Rollout**

1. Preserve baseline source and database backup/restore evidence.
2. Apply additive storage migration only after storage adjudication.
3. Deploy backend parsing and recovery support with writes held during compatibility transition.
4. Deploy frontend support for V2 confirmations and unknown outcomes.
5. Invalidate legacy executable previews; require a fresh preview.
6. Verify selected transactional dispatchers, proposal guards, and provider admission on the deployed build.
7. Enable approved write capability through the existing operational controls.
8. Expand only after each additional dispatcher has transaction, access, and replay evidence.

Deployment/environment ownership and exact commands are S0 inputs. No public endpoint is probed or changed by this package.

**Rollback**

- Pause writes first.
- Preserve operation records and audit evidence.
- Reconcile in-flight/unknown outcomes.
- Restore compatible application code only after proving it cannot consume V2 previews unsafely.
- Do not drop the ledger during emergency rollback.
- Reads and cancellation/status recovery remain available where technically possible.
- Reenable writes only after a reviewed compatibility test.

**Operational budgets**

Proposed release criteria, measured against S0’s captured baseline:

- Pure outcome/registry validation: p95 ≤5ms for the configured maximum input on the test host.
- Provider admission: p95 ≤10ms for the maximum admitted envelope.
- Command read/status response: p95 regression ≤10% under the same isolated load.
- Confirm critical section: no network calls; p95 lock duration ≤500ms for the selected bounded dispatcher.
- Provider generation deadline: retain the verified existing timeout until its adapter contract is supplied; do not invent a competing timeout.
- No raw payloads in operational metrics.

Budget failure is a finding, not permission to truncate safety checks.

**Readiness receipt**

Current status:

| Area | Status |
|---|---|
| Supplied-evidence review A1 | Completed within packet scope |
| Draft review A2 | Completed once; corrections incorporated |
| Required document classes | Emitted |
| Existing models and full caller source | Missing from packet |
| Existing operation-store conformance | Unknown |
| Canonical mounted JSX receipt | Incomplete |
| Approved production provider templates | Missing |
| Executable source/test files | Planned, not created |
| Tests/build/type-check | NOT RUN |
| Secret scan | NOT RUN |
| Diagram rendering | NOT RUN |
| Archive lookup/filing | Caller-owned; not verified |
| Implementation readiness | S0 gate not passed |
| Deployment readiness | Not established |

**Hygiene:** This response creates no filesystem artifacts. Caller-generated package files, review records, screenshots, and test outputs must be indexed under the package/evidence directory rather than scattered at repository root.
