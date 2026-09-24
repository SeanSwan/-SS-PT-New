# Swan Coach V3 — hostile review rounds 2026-09-11 (G06–G11 candidate)

Artifact `SCU-HR-46`. Sean's instruction: hostile reviews until dry, fixes
always, enhance/update with NO breaking changes. Three rounds executed after
the G11 release-readiness commit (`1a5f4118b`); each finding fixed in-slice
with regression tests before the next round started.

## Round 1 — commit `8b94a988e` (4 findings)

1. **G07 false-clearance path (real defect):** a planned exercise with no
   pattern/muscle/joint metadata got a vacuous contraindication match and
   could reach `draft`. Now `requires_review` with
   `planned_exercise_metadata_unknown` + test.
2. **G09 privacy gap (real defect):** `forgetFact` only worked on `active`
   facts — proposed (never approved) and superseded facts could not be
   forgotten, blocking the deletion/24h-purge path for exactly those rows.
   Forget is now a deletion op valid for any status (active rows still
   transition via the adopted conditional update; human actor required;
   unknown ids reject without mutation) + 3 tests.
3. G07 dead `sinceIso` parameter removed.
4. G06 dead `voiceActive` parameter removed (gates documented unconditional).

## Round 2 — commit `f485b5a70` (4 findings)

5. **G06 test blind spot closed:** the getUserMedia abort/reset race guard
   (`cancelledRef`) was disclosed as code-review-only — now PROVEN: a late
   permission resolve after abort stops stream tracks, constructs no
   recorder, produces no blob (2 new tests).
6. **G06 dedupe hole closed:** last-two-finals echo window missed a full
   session re-emission of 3+ finals; widened to a session-scoped Set (reset
   on arm/stop) + regression test.
7. **G10 observability (additive enhancement):** every decision carries
   `localHourAtCandidate`; incidentally fixed the latent cosmetic bug where
   the weekly-dedupe reason interpolated `undefined` instead of `7`.
8. **G09 cap honesty:** `getMemoryForTask({cap: 0})` silently used the
   service default; now returns zero facts (positive integer caps pass
   through) + test.

## Round 3 — commit `45d72ad71` (1 finding)

9. **G07 reader-context validation:** negative/zero/fractional/non-numeric
   actor ids passed the truthy `Number()` guard; the tool now requires a
   positive integer (other tools untouched) + test.

## Round 4 — DRY (no findings)

A fourth pass over the same surfaces (registry probes, forget/purge
lifecycle, nudge boundaries, voice lifecycle, reader/calculator) produced no
new findings; the full verification sweep below is the dry evidence.

## Verification (post-Round-3)

- Backend scoped sweep (all coach* unit files + surface registry + evidence
  tools): **63 files / 438 tests, 0 failures**.
- Frontend scoped sweep (coach-assistant + surface context):
  **977 pass / 5 fail → exactly the 5 proven-pre-existing baseline failures**
  (4 coach-assistant files proven by G06 stash roundtrip; TrainingTabContent
  proven by zero-overlap diff in G11; one transient count of 5 in-scope was
  a flaky 6s retry, re-run shows the exact 4).
- `tsc --noEmit` exit 0 (WSL Node 22, 10GB heap); `vite build` exit 0.
- All scoped source files ≤300 lines (speech hook 299, controller 299).

## Post-rounds state

Worktree HEAD `45d72ad71` (+3 fix commits over `1a5f4118b`). The override
controller remains at stage FINAL (9/24 admissions); the formal combined
Astra review re-freezes the FINAL digest over these commits when authorized.
No push, no deployment.
