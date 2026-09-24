# G07 build evidence — 2026-09-11

## Changes
1. NEW services/ai/coachProgressRecordReader.mjs — source-linked join
   (workout_sessions -> workout_exercises -> sets, model-verified column names,
   parameterized), maps real rows to the S8a calculator contract; unit from the
   client's latest body_measurements.weightUnit (missing -> '' + 'weight_unit'
   in missingInputs, never invented); scheduled denominator = status 'planned'
   count in the same window; LIMIT+1 truncation honesty ('session_row_cap').
2. services/ai/coachProgressEvidence.mjs — status semantics split: 'unavailable'
   (no source) / 'empty' (real zero) / 'no_verified_records' / 'verified';
   zero planned sessions -> adherence null (no divide-by-zero Infinity, no
   invented 0% rate); null reps/load still never counted as zero.
3. services/ai/coachEvidenceTools.mjs — progressEvidenceTool now reads via the
   source-linked reader (the old query selected columns the calculator cannot
   use, so real calls could never produce verified evidence and its scheduled
   denominator counted ALL sessions); reader missingInputs propagate to the
   planner; envelope maps empty/unavailable precisely.
4. NEW services/ai/coachSubstitutionDraft.mjs (T34) — hard contraindication
   blocks with NO bypass input; unknown pain/readiness/contraindication data
   and threshold crossings (pain >= 4, readiness <= 3) require review — never
   a fabricated clearance; clean -> trainer-review draft preserving exercise
   identity + equipment/media metadata.
5. NEW services/ai/coachMilestoneShareDraft.mjs (T48) — verified milestone ->
   share DRAFT only: no recipients, no sender API, consent captured at the
   separate share step; structural test proves the log lane imports no
   share/send path.

## Slice-internal hostile review — findings fixed in-slice
- F1 windowDays parameter/const redeclaration (SyntaxError) — caught before run.
- F2 reader missingInputs did not propagate through the tool — merged
  (test caught it).
- F3 silent mid-session truncation at the row cap — LIMIT+1 probe +
  'session_row_cap' marker + test.
- F4 'consentAtSend' field name collided with the structural sender-key scan —
  renamed consentRequired.
- F5 my three new node:test files would fail the repo's vitest suite
  ("No test suite found") — converted to vitest's test export; the calculator
  file stays node:test per its existing exclude-list pattern.

## Known limitations (disclosed)
- Historical unit changes: unit is sourced from the client's latest
  measurement, so a lbs->kg switch can re-bucket historical volume under the
  current unit; per-set unit storage (schema change) is out of scope. Mixed
  units within one read still surface as mixed_units comparability.
- Row/window caps mean very heavy histories produce flagged partial evidence
  ('session_row_cap'), not silently wrong totals.
- Real-PG loopback + browser acceptance for these paths belongs to G11's
  release matrix per plan.
