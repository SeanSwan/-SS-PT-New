# G07 tests evidence — 2026-09-11

## RED (before implementation) — assertion failures only
- node:test coachProgressEvidence.test.mjs (updated statuses): assertion
  `actual: 'unavailable', expected: 'empty'` observed on the old calculator.
- vitest T33 tool test: 4 failed / 3 passed — exact-volume, adherence,
  status-mapping, missing-unit assertions failed against the old tool.

## GREEN
- vitest: 6 files / 36 tests pass (reader, substitution, share, T33 tool,
  evidence tools, caller inventory), exit 0.
- node:test coachProgressEvidence.test.mjs: 8 pass / 0 fail (node:test file is
  on the repo's vitest exclude list by established pattern).
- Import smoke: all 5 changed/new service modules import clean (SMOKE_PASS).
- Backend coach baseline: vitest tests/unit/coach* 58 files / 325 tests / 0
  failures — baseline CLEAN (rule 56: slice-clean equals baseline-clean here).

## Test-runner note
New unit test files use vitest's `test` export (the repo's `npm test` entry is
`vitest run`, whose include list collects all tests/**/*.test.mjs; the
node:test-style calculator file remains on the config's explicit exclude list,
matching the established repo pattern).

## Runner
Windows Node v24.19.0.
