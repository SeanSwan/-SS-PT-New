**Checkpoint result:** `PASS`, `REVISE`, or `HALT`, always scoped to an exact slice and immutable source identity.

A checkpoint requires:

1. Commit hash plus dirty diff/hash, if any.
2. Exact files changed and preserved baseline artifacts.
3. Requirement-to-test mapping.
4. Commands, exit status, assertions and environment.
5. Separation of static, synthetic, filesystem, real GPU and live hosted evidence.
6. Confirmation that no prohibited action occurred.
7. Review findings and explicit resolution/blocker for each.
8. Archived review ID and successful archive lookup.
9. Remaining unproven boundaries.
10. The next authorized sub-slice.

A missing archive file prevents a completed hostile-review receipt. A failed test-import/setup command is BLOCKED evidence, not a valid RED regression.

**Review remit**

> Review only the named slice at the recorded commit and dirty-tree hash. Query prior archive findings first. Attack mounted callers, authority boundaries, durable admission, ambiguous submission, resource ownership, public truth and test discrimination. Do not repeat conceded gaps as new findings. For every new finding provide source evidence, reachable consequence, concrete repair and a test that fails without the repair. Do not infer provider or spending authorization.

**Roles**

This package’s A2 is the requested single self-review, not an independent final implementation approval. Preserve the existing final-decider workflow for implementation checkpoints; do not silently replace it with the package author.

**Evidence manifest**

Future receipts must record:

```json
{
  "commit": "full-commit-hash",
  "dirty_diff_sha256": null,
  "command": "exact command",
  "cwd": "exact working directory",
  "started_at": "UTC timestamp",
  "finished_at": "UTC timestamp",
  "exit_code": 0,
  "evidence_kind": "synthetic",
  "provider_requests": 0,
  "gpu_executions": 0,
  "paid_requests": 0,
  "result_artifact_sha256": "hash"
}
```

Use actual observations; do not fill zeros without a transport/process recorder capable of establishing them.

**Operational limits**

- Eight waiting local jobs; one active existing-authority GPU lease.
- Admission refuses when durable state, disk capacity, or accounting is unavailable.
- No render-time SLA.
- Unknown lease duration prevents a guaranteed GPU-time cap.
- Polling uses bounded observation retries; exhaustion enters reconciliation.
- Logs contain allowlisted IDs, transition codes and accounting amounts only.
- Sean owns enablement, unresolved accounting adjudication and operational recovery.

**Current checkpoint**

`HALT` for runtime advancement. The revised documents are emitted, but archive filing, persistence, executable new suites, resource authority binding and live Slice 1 proof remain incomplete.
