**Status:** Requirement-linked test specification, not an executed suite.

**Executable-source limitation:** N/A — scope-bounded consult, no repository surface in scope. Existing exports, test harnesses and test bodies are not supplied. The paths below are proposed test artifacts and must not be reported as already runnable or passing.

**Test rules**

- Use synthetic canaries, never real client records.
- Default tests make zero provider calls.
- Capture the actual last HTTP/process write seam.
- Exercise real production request constructors once S0 identifies them.
- Assert forbidden side effects: network calls, child launches, reservations and persistent changes.
- A failed import is setup failure, not behavioral RED.
- Recover and retain the original D1 reproduction; do not substitute a weaker detector test.

**Core files and cases**

| Proposed file | Named case | What it proves |
|---|---|---|
| `tests/village/evidence-contract.test.mjs` | `T-S0-01 distinguishes product privacy from Village admission` | Caller/import evidence identifies the actual boundary without assuming shared behavior. |
| Same | `T-S0-02 accounts for every inventoried legacy reference` | The 14 reported references each have evidence-backed disposition; the inventory may expand if S0 finds more. |
| Same | `T-S0-03 preserves original findings bans and decisions` | Original IDs map to retained, changed or blocked entries; no silent loss. |
| Same | `T-DOC-01 rejects unsupported verification claims` | Machine-checkable evidence fields are required; a human still assesses semantic truth. |
| `tests/village/admission.test.mjs` | `T-ROUTE-01 rejects missing or changed route evidence` | Zero dispatch and reservation when route proof is absent or invalidated. |
| Same | `T-ROUTE-02 rejects subscription label without included automation proof` | Billing-profile naming alone cannot admit a route. |
| Same | `T-ROUTE-03 rejects Kimi aliases unknown aliases and Astra Pro substitution` | Real canonical route resolution enforces the prohibition. |
| Same | `T-ROUTE-04 preserves unknown served model identity` | Requested model never populates a verified served-model field. |
| Same | `T-POLICY-01 blocks restricted material while policy is undecided` | Zero sends; explicit policy-decision reason. |
| Same | `T-POLICY-02 deny policy rejects restricted reference codes` | DENY applies to codes classified as restricted. |
| Same | `T-POLICY-03 scoped allowance rejects unlisted material and destinations` | Permissive policy remains bounded. |
| `tests/village/approval.test.mjs` | `T-APPROVAL-01 rejects content route role capability and budget mutations` | Each bound field invalidates approval when changed. |
| Same | `T-APPROVAL-02 rejects caller supplied approval booleans` | Trusted approval state is required. |
| Same | `T-APPROVAL-03 requires new approval for generated debate and adjudication payloads` | Initial approval cannot authorize future unknown content. |
| Same | `T-APPROVAL-04 rejects revoked approval before send` | Queued work cannot use revoked authorization. |
| `tests/village/orchestration.test.mjs` | `T-ROUND-01 gives every reviewer a whole packet remit` | Actual prompt construction contains no enforced narrow-lens exclusion. |
| Same | `T-ROUND-02 hides current round answers from later seats` | Serial execution preserves equal information. |
| Same | `T-ROUND-03 blocks round eight and second adjudication` | Limits are enforced at dispatch, not only planning. |
| Same | `T-ROUND-04 blocks adjudication after missing malformed or uncertain results` | Incomplete rounds cannot advance. |
| Same | `T-ROLE-01 derives authority from frozen role not model name` | Model-specific remits cannot acquire final project authority. |
| Same | `T-ROLE-02 treats reviewer commands as untrusted output` | Injected requests to change budget, policy or tools cause no such effects. |
| `tests/village/budget-recovery.test.mjs` | `T-BUDGET-01 reserves worst case before metered dispatch` | No send precedes valid authorization and reservation. |
| Same | `T-BUDGET-02 rejects subscription routes with unknown incremental spend` | Zero-spend profile fails closed. |
| Same | `T-BUDGET-03 retains reservations after uncertain execution` | Timeout cannot falsely refund capacity. |
| Same | `T-BUDGET-04 permits only one concurrent claim across processes` | Two processes cannot execute one dispatch. |
| Same | `T-RECOVERY-01 restart preserves uncertain dispatch and blocks replay` | Crash recovery does not resend. |
| Same | `T-RECOVERY-02 evidence write failure prevents send` | Audit persistence is a prerequisite. |
| Same | `T-RECOVERY-03 cancellation distinguishes proven no send from uncertainty` | Cancellation reports delivery truthfully. |
| `tests/village/reports.test.mjs` | `T-REPORT-01 preserves unexamined coverage and unsupported claims` | Missing coverage cannot become clean. |
| Same | `T-REPORT-02 binds findings to supplied artifact versions` | Evidence references resolve against frozen artifacts. |
| Same | `T-CONSOLE-01 removing console leaves engine output unchanged` | Console remains an additive reader. |

**Exact planned command after implementation**

```bash
node --test tests/village/evidence-contract.test.mjs tests/village/admission.test.mjs tests/village/approval.test.mjs tests/village/orchestration.test.mjs tests/village/budget-recovery.test.mjs tests/village/reports.test.mjs tests/village/subscription-boundary.test.mjs tests/village/http-media-boundary.test.mjs
```

This command is specified, not executed. Provider-facing probes require separately selected routes, synthetic content and applicable authorization; none is implied by the unit-test command.


---

> **CONTINUED in `09a-adapter-tests.md`** — the final-boundary adapter tests (`T-SUB-01`–`04`, etc.). Extracted 2026-09-22 under Astra R2-A1-05 / D5 so both files meet Rule 4 (300-line cap).
