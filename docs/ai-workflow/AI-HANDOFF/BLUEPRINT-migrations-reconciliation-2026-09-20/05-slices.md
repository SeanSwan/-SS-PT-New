**S0 — Freeze evidence and correct reconciliation**

Scope: package, evidence index, supplied claims.

Acceptance:

- Every A1 finding has a corrected instruction or a named unresolved dependency.
- Record current file hashes and dirty state without staging or modifying unrelated files.
- Distinguish packet-reported counts from fresh measurements.
- Correct debt distribution to 19/2/1/1.
- Mark H-03 partial, H-04 visibility-only, and H-07 production state unknown.
- Record actual test commands from supplied test/runtime configuration before using historical results.

Evidence: hash-bound input list and reconciled status table. Runtime tests N/A for the documentary correction itself.

**STOP: do not implement S1 against an unidentified source/configuration snapshot.**

**S1 — Runner truth and lifecycle**

Scope: runner modules, connection adapter, compatibility entry point, runner unit tests.

Decisions: reject completion-by-text and failure bypass; preserve `--to`; stop on first failure; unified target; bounded lifecycle.

Acceptance command:

```text
node backend/scripts/acceptance-gate.mjs backend/tests/unit/migrationRunnerContract.test.mjs --expect 12 --self-test
```

Required: the gate reports `12 passed`, matching the declared 12; applicable subprocess/platform cases execute. Unsupported platform coverage is explicitly BLOCKED, not silently passed. The `--self-test` flag is part of the acceptance, not an extra: it re-runs the same file with a test-name filter that deselects every case and **fails the slice unless the gate refuses that run**. A gate that cannot fail an empty run is not a gate.

> **CORRECTED 2026-09-20 (N-1).** This command was `node --test backend/tests/unit/migrationRunnerContract.test.mjs`. That form was a **false-green generator** in this repo: the tests are vitest tests, so `describe`/`it` register with vitest's collector, which is not running. `node --test` then counts the FILE as one passing test and exits 0 — measured on the two suites that exist, **0 of 5** and **0 of 9** cases executed, exit 0. It also disarms the mutation requirement below, because there is no executing assertion for a mutant to redden. The gate replaces the runner, requires the reporter's own case count to equal the declared count, and treats the `pass 1 / suites 0` TAP signature as a failure.

Mutation requirement: restore completion-by-text and demonstrate the partial-migration assertion fails.

**STOP: do not deploy this slice independently of catalog reconciliation.**

**S2 — Inventory and legacy preservation**

Scope: discovery, disposition manifest, inventory tests, historical debt comment.

Every file receives exactly one disposition:

- Historical executable, retained.
- Intended schema/data effects incorporated into the approved v2 contract.
- Duplicate effects, evidenced against a named successor.
- Unimplemented intention explicitly excluded from this release.

“Incorporated” requires complete source review and linked verification; filename resemblance is insufficient.

Acceptance command:

```text
node backend/scripts/acceptance-gate.mjs backend/tests/unit/migrationInventoryContract.test.mjs --expect 7 --self-test
```

Required: the gate reports `7 passed`, matching the declared seven. Unknown files, hash changes, and newly inert files fail the inventory gate.

**STOP: do not convert or relocate the 38 inert files as a bulk operation.**

**S3 — Observe and decide**

Scope: observer, authorized observation receipt, owner decisions.

Acceptance:

- D1 resolved by timestamped catalog evidence, not migration filenames.
- D2/D3 selected with exact namespace/name/type.
- Physical FK graph and source-derived unconstrained references reconciled.
- If both user relations exist, stop until ownership and reconciliation are approved.
- A missing production authorization leaves observation NOT RUN.

Exact observation command is in `03-contracts.md`; it is not executed by this review.

**STOP: no dependent schema implementation while D2/D3 remain null.**

**S4 — Complete the target and adoption contract**

Scope: full schema contract, model mappings, migration dispositions, test fixtures, baseline design.

Acceptance command:

```text
node backend/scripts/acceptance-gate.mjs backend/tests/unit/migrationSchemaContract.test.mjs --expect 6 --self-test
```

Required: the gate reports `6 passed`, matching the declared six. In addition:

- Full target DDL and model definitions are supplied and independently reviewed.
- Final ERD uses exact physical columns/types and validated references.
- All four debt-table families and transitive dependencies are accounted for.
- Each schema operation has a precondition, postcondition, and rollback applicability decision.
- Select the fixture PostgreSQL major to match the observed deployment major; pin the fixture image or provisioner version.
- Confirm the installed CLI’s metadata-table/schema configuration through an actual fixture run.
- Specify any PostgreSQL extension or nontransactional operation explicitly; none is implicitly permitted.

**STOP: this packet’s partial ERD is not permission to invent the baseline.**

**S5 — Prove fresh creation and existing adoption**

Scope: v2 baseline, complete fixtures, real CLI/PostgreSQL integration.

Acceptance command:

```text
node backend/scripts/acceptance-gate.mjs backend/tests/integration/migrationEpochV2.test.mjs --expect 10 --self-test -- --no-file-parallelism
```

Required: the gate reports `10 passed`, matching the declared ten, against disposable resources. **No skips** — and this is enforced rather than requested: the gate treats any skipped case as a refusal, because a skipped case did not execute. `--no-file-parallelism` is the vitest equivalent of the `--test-concurrency=1` this command used to pass to `node --test`.

Evidence must include actual catalog differences, migration metadata deltas, synthetic-record checks, and the tested manifest digest.

**STOP: no claim of production convergence from fixture results alone.**

**S6 — Couple deployment and startup**

Scope: deployment/startup integration and runtime gate tests.

Acceptance command:

```text
node backend/scripts/acceptance-gate.mjs backend/tests/unit/migrationStartupContract.test.mjs --expect 4 --self-test
```

Required: the gate reports `4 passed`, matching the declared four; integration case `startup-refuses-incomplete-schema-without-sync` also passes.

Record compatibility of the proposed rollback application version. No production sync fallback may bypass the v2 requirement.

**STOP: release preparation is not deployment authority.**

**S7 — Authorized rollout and observation**

Scope: separately approved production operation.

Entry:

- Owner decision, immutable release digest, backup/restore evidence, migration timeout, and operational owner recorded.
- Old schema writers stopped.
- Fresh preflight observation matches the approved upgrade/adoption state.
- Explicit production execution authority is present.

Exit:

- Required catalog and metadata postconditions observed.
- Application readiness observed with production schema sync disabled.
- Any failure is classified FAILED or INDETERMINATE; no automatic retry.
- Caller files the review and rollout receipts.
