# G09 tests evidence — 2026-09-11

## Reconciliation proof
The adopted S1 layer (commit 21ed0554ba) passes its full suite UNMODIFIED in
this worktree: coachFactService.test.mjs + coachFactsMigration.test.mjs +
coachContextTableNames.test.mjs = 106/106 green before any S9 edit.

## RED (new-behavior assertions against pre-policy state)
- T35 forget: retrieval exclusion asserted against a seeded active fact
  (pre-policy code had no forget path — contract tests written first).
- Cache recheck: seeded a real coachContextCache entry, asserted it survives
  until forget drops it; first run caught a test-seed defect (envelope missing
  `state`) — fixed in the test, then green.
- T35 purge: rows past/prior to the deadline asserted.

## GREEN
- vitest 4 files: coachFactMemoryPolicy (9) + adopted 106 + migration/table
  suites = 115/115, exit 0.
- ESM import smoke for the policy service and model: SMOKE_PASS (model import
  logs its local-DB connection warnings, non-fatal, no DB needed by tests —
  the adopted/policy suites mock models/index.mjs).

## Baseline (rule 56)
Adopted S1 suite green unmodified = slice-clean equals baseline-clean for the
coach-fact surface.
