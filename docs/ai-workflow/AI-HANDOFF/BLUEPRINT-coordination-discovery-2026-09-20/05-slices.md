**S0 — Preserve and identify**

Scope: packet and integration inputs.

Acceptance:

- Preserve the supplied packet unchanged.
- Record the full candidate base commit and task-owned diff identity.
- Separate committed evidence from uncommitted instruction work.
- Record archive linkage when the caller files the review.
- Mark omitted sources and runtime checks UNVERIFIED.

**Stop:** no editing of shared canonical instruction files without current ownership evidence. S1 can be built in an isolated fixture workspace from this package.

**S1 — Root-pinned, read-only orientation**

Scope: first five files in build order.

Decisions: existing `digest` remains the startup summary; no pruning; explicit degraded states; root-pinned recovery commands.

Executable acceptance:

```text
node --test scripts/hooks/lane-session-start.test.mjs scripts/lane-at-root.test.mjs
```

Required: 20 named cases in `09-tests.md`; no production or live-ledger access.

Mutation evidence:

- Remove the child `cwd` option: the outside-root cwd case must fail for the cwd assertion.
- Replace the printed wrapper path with a relative helper command: the recovery-command case must fail.
- Reintroduce prune invocation: the sentinel test must fail.

**Stop:** do not integrate until the checkpoint accepts both actual behavior and the intended mutation failures.

**S2 — Complete discovery**

Scope: authoritative helper integration and its contract tests.

Required source supplement:

1. Full `scripts/lane.mjs` and its relevant dependency closure.
2. Identity resolver implementation and exact `whoami` output.
3. Lane parser implementation.
4. Sanitized fixtures for static, per-session, empty, stale, malformed, and duplicate-label records.
5. Current staleness configuration.
6. Existing discovery tests.

This is a source-supply gate, not a request to explore the repository during this review.

Executable acceptance:

```text
node --test scripts/lane-discovery.contract.test.mjs
```

Required: 16 named cases below, using the real integrated parser and identity resolver in synthetic resources.

**Stop:** normalized-object mocks or canned JSON do not satisfy this checkpoint.

**S3 — Documentation and harness coverage**

Scope: authoritative documents, mirrored and independent instruction surfaces, verified hook adapters.

Executable acceptance:

```text
node --test scripts/coordination-docs.test.mjs
node scripts/sync-agents-mirror.mjs --check
```

Required: six document tests plus the seven-row harness evidence matrix.

A harness may ship with a clearly documented manual procedure while its automatic hook remains unverified. It may not be labelled automatically covered.

**Stop:** no “every harness” claim without observed execution on every claimed automatic surface.

**S4 — Candidate delivery**

Scope: integration verification and receipts.

Acceptance:

- All applicable S1–S3 commands pass against the candidate tree.
- Documentation mirrors agree in the candidate commit.
- The change excludes unrelated Rule-86 work.
- No live ledger changes occur from orientation or tests.
- Unknown harness coverage and the cooperative race limitation remain disclosed.
- Review is filed by the caller with the candidate’s exact identity.

**Stop:** no production deployment or push to `main` is implied by this package.
