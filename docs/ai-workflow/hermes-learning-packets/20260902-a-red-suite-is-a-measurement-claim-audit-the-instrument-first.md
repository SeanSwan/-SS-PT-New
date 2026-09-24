---
name: a-red-suite-is-a-measurement-claim-audit-the-instrument-first
date: 2026-09-02
originating_model: claude-fable-5
tier_gate: PASS
models_used:
  - model: claude-fable-5 / builder+verifier / Phase 0.0 baseline refresh, all fixes verified by bare exit codes / subscription
skills_touched:
  - id: exit-status-gate hook / validated / blocked the pipe-swallowed-exit-code class live, twice-attempted in one session
  - id: nodeTestRunnerSeparation.test.mjs / created / three-way lock born from this failure
---

# A red suite is a measurement claim — audit the instrument first

## The lesson
The repo's failing-test baseline recorded 23 red files. Sixteen were healthy: they were
node:test files that vitest — the wrong runner — loaded, found no vitest suites in, and
recorded as failures. 175 passing tests spent weeks booked as sickness, and the 7 real
failures hid behind the fake red. Nobody had opened a "failing" file to ask WHY it
failed; the baseline had turned red into furniture. **Before fixing, shrinking, or even
believing a failing list, classify the failure MECHANISM per file — "wrong instrument"
is a failure class, and it is the one class that mass-produces false red.** The same
session found the twin mechanism at error level: four services' catch blocks swallowed
their cause and reported every import failure as "SDK not installed"; the real error
underneath was a stale test mock. A wrapper that hides its cause turns every downstream
failure into the same lie.

## Who did what
claude-fable-5 solo; no external seats. The repo's own hooks did real work: the
exit-status-gate blocked the pipe-swallowed-exit-code mistake on its third attempt in
one session (I had already made it twice), and the drift guard I wrote caught my own
under-classification (head -5 missed imports at lines 7–17) on its first run.

## Skills created or changed
`nodeTestRunnerSeparation.test.mjs` — a three-way lock (detected node:test set ==
vitest excludes == test:node script args), built so the exclude list cannot become a
hiding place and the next wrong-runner file fails with instructions instead of a
confusing "No test suite found". The failure it was built against: 16 files, weeks.

## Mistakes I made
- Piped gate output through `tail` and read tail's exit code — twice, before the
  deterministic hook stopped the third. Written up 44 times in the corpus; prose did
  not hold it; the hook did. Procedural fixes beat resolutions, again.
- Classified files by their first 5 lines; three imported node:test deeper. The
  correction that survives: classify by whole-file content, and let a guard re-derive
  the classification instead of trusting a one-time sweep.

## Error → fix → repeat ledger
- pipe-swallows-exit-code: 2 recurrences THIS session by the agent that had just
  written the lesson into a blueprint; stopped only by the PreToolUse hook. Verdict:
  this class is closed by tooling, not by awareness — treat any awareness-only fix for
  it as not a fix.
- instrument-vs-subject confusion: 16-file false-red (runner) + 4-service false
  message (swallowed cause) in one repo, same day. Both fixed structurally: runner
  separation guard; `{ cause }` preserved with the route-matched literal kept.

## External-model calibration
None consulted — deterministic evidence only; the slice needed a debugger, not a panel.
