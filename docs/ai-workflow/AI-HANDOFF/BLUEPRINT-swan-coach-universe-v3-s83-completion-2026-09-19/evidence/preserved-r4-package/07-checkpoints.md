# Checkpoint protocol and current ledger

## Roles and cadence

- Builder executes bounded slices and returns evidence.
- Architecture owner resolves scope/contract gaps.
- User-authorized combined Astra hostile review occurs after implementation slices; this package’s A2 is only the one-pass review of the **draft plan**.
- Codex hostile review is advisory input to the packet’s Final Decider chain.
- Fable remains the packet’s named final commit gate; exact seat and entitlement require G0-RELEASE.
- No mandatory GLM/Flash gates are added.
- No paid call, reviewer substitution or additional spend is authorized here.

## Per-slice packet

Each checkpoint includes:

```text
slice_id:
worktree:
branch:
base_head:
dirty_source_manifest:
owned_paths:
requirements:
commands:
exit_codes:
test_files:
passed:
failed:
suite_load_failures:
skipped:
mocked_boundaries:
real_boundaries:
screenshots_and_network_receipts:
remaining_findings:
rollback_evidence:
cluster_teardown:
verdict:
```

Attach actual output excerpts. Passing checks get concise result lines; failures include the failed assertion/error, exit code and file. Link raw logs within the saved evidence package.

## Verdicts

- **PASS:** all slice requirements met for the stated boundary.
- **REVISE:** concrete repair list with requirement, evidence and expected retest.
- **HALT:** missing authority/source/identity, unsafe isolation or consequential unresolved contract.

A conditional continuation into an independent slice does not relabel the blocked slice PASS.

## Current ledger

| Checkpoint | Status | Reason |
|---|---|---|
| Forge A1 | REVISE | Findings above |
| Forge A2 | Completed once | Ten corrections reflected in emitted package |
| C0 | BLOCKED | Required source/mount/config supplements absent |
| C1–C5 | NOT RUN | Execution outside this forging call |
| C6 combined implementation review | NOT RUN | No frozen implementation evidence reviewed here |
| Final Decider | PENDING | No actual gate receipt |
| Production | NONE | No authorized deployment/live proof |

## Reviewer remit

> Review only the frozen worktree bytes identified by this checkpoint. Test whether each required behavior reaches its mounted caller and real persistence boundary. Separate source facts, executed results and inference. Challenge same-key replay, committed-but-ambiguous responses, installed migration history, partial DDL, adoption self-acknowledgement, stale navigation credentials, actor A-B-A, and browser fixtures that pass with absent nodes. Every finding must identify evidence, a concrete repair and the required retest. Preserve previous findings and verdicts; do not upgrade untested boundaries.

## Release decision

“Releasable” requires applicable inherited release gates as well as this package’s criteria. G0-RELEASE must identify their disposition. A successful local completion patch is not a claim that all Universe V3 release obligations are met.

The Final Decider receives:

1. Exact diff and frozen source hashes.
2. C0–C5 receipts.
3. Combined review and repair receipts.
4. Current baseline failures and release exclusions.
5. Migration upgrade/rollback evidence.
6. Separate production authorization status.

## Archive and hygiene

The operator saves this review and later implementation reviews under `Z:\HostileReviews` using the established archive protocol. This reply does not claim filing occurred.

Proposed evidence files belong under this package’s `evidence/` directory. Reuse indexed original logs; do not duplicate large historical artifacts. No continuity closeout is authorized.
