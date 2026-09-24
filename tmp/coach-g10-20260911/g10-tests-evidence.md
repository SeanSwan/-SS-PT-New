# G10 tests evidence — 2026-09-11

## RED / fixture finding
Engine + tests written together (new-module green-lock per plan 42/44
disclosure). One assertion failure was observed and adjudicated: the
snooze-expiry fixture used 01:00Z (02:00 local, inside quiet hours) — the
ENGINE was correct (quiet hours beat an expired snooze at night); the fixture
moved to 17:00Z. A boundary check at exactly 20:00 local (quiet, inclusive)
and 08:00 local (allowed) passes, proving the DST window semantics.

## GREEN
- vitest coachProactiveNudge.test.mjs: 8/8, exit 0.
- ESM import smoke: SMOKE_PASS.

## Baseline (rule 56)
New files only; no regression surface touched. Slice-clean equals
baseline-clean for this slice.
