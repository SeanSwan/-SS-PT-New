# Round 3 (R3-1 … R3-5) fix log — 2026-09-21

Base under repair: `fb82c21a1` (HEAD). Reviewed base named by the document: `b796338fb` (round 27).

## Baseline, DERIVED by execution (not by summing prose)

`media-api/BASELINE-fb82c21a1-before-R3-fixes.txt` — 33 gates, **1 FAILED**, derived assertion
total **1220**. Gate 28 (`hostile-round25-probe`) RED at baseline.

Note: a prior report of mine claimed "all 33 gates green at fb82c21a1". That was WRONG — the 1220
figure was correct only because it summed *stated* numbers rather than executed ones. The baseline
run is the correction, and it is preserved rather than restated.

## The five findings fixed

| # | Finding | Fix | Control |
|---|---|---|---|
| R3-1 | `default:` in `costEstimate.mjs` priced any unrecognised `rateUnit` at the flat per-run figure while its comment claimed to refuse it | `'run'` gets its own `case`; `default:` returns `null`. Closed set `RATE_UNITS = {run, second, generation}` at import in `specShape.mjs` | B2a / B2b / B2b2 / B2c (round-27 probe) |
| R3-2 | The document named a *tip*; `distance <= 1` accepted a SIBLING as an ancestor | Predicate replaced with `git merge-base --is-ancestor`; document relabelled "reviewed base" | F2b — builds a real sibling witness via `git commit-tree` (no ref) and proves the old predicate accepted it |
| R3-3 | Gate-statement scanner missed count words written as words; exemptions were unscoped | Fourth pattern constrained to real count words; exemptions carry a `within:` scope; section-level `LIVE_EXCLUDE`; two-scan split (live vs whole-document) | E1d (unbolded form seen + live drift caught); `ninety-nine` / `forty-two` mutations now CAUGHT |
| R3-4 | Section E could pass with its invocation deleted | `E_LEDGER_CHECKS = 9` (measured); `E0` pin at the call site | Deleting the invocation now yields **43 passed, 1 failed** where it previously yielded 43/0 |
| R3-5 | E1 folded untracked files into `total`, so any agent's scratch reddened the gate | Derivation is TRACKED ONLY; untracked files REPORTED separately by name | E3 |

## Defects found inside the fixes themselves (the dry loop earning its keep)

**R3-5a — the E3 control tested nothing, while appearing to test the fix.**
The fixture was `media-api/.r35-untracked-control.tmp`. It failed half (b) with an unchanged total,
which looked like the fix having silenced the untracked report. It had not: `.gitignore:49` is
`*.tmp`, so `git status --porcelain` never listed the fixture and the "UNCHANGED" total was true
for the wrong reason. Measured: `git check-ignore -v media-api/.r35-untracked-control.tmp` ->
`.gitignore:49:*.tmp`. Renamed to `.scratch`; the check now verifies its own fixture is VISIBLE to
git before measuring anything, and fails loudly naming the ignore rule if it is not.
This is the lane's recurring defect class (a check satisfied by never looking) appearing inside
the control written to catch it. **Sixth appearance.**

**R3-5b — the E3 control leaked its fixture, and the `finally` comment asserted a cleanup the code
had not performed.** Observed on the 2026-09-21 suite run: `.r35-untracked-control.scratch` left in
the tree. A `finally` does not run under a kill, and `catch { /* already gone */ }` hid it.
The unlink is now followed by an `exists()` assertion; `leftBehind` is a failed check, not a note.
**Seventh appearance of the same class, this time in the cleanup path.**

**R3-5c — THE RUNNER ITSELF was a producer of untracked files inside the tree it audits.**
`run-all-gates.sh` pointed `TMPDIR`/`TEMP`/`TMP` at `$REPO/.tmp-gates`, so Node's compile cache
(thousands of entries) and each demo's job directory were created INSIDE the worktree during a
suite containing gates that derive facts from `git status`. Two consecutive runs with no source
change between them reported a *different* gate red (gate27 with 4 failures, then gate28 with 1).
This is R3-5's defect class arriving through the runner — a gate reddenable by files the gate did
not create. Repaired by moving scratch outside the repo (`mktemp -d`, removed on exit) and
disabling `NODE_COMPILE_CACHE`; NOT by exempting paths, since an allowlist cannot scale and a gate
that exempts its auditor's litter is unreadable.

**Dead code found by the loop:** the `untrackedFileAllowlist` I introduced in R3-5 was declared with
an explanatory comment and never referenced. A comment asserting behaviour the code does not
perform. Recorded; the list is deliberately empty and the comment now says so.

## After (DERIVED)

`media-api/RECEIPT-after-R3-fixes.txt` — 33 gates, **0 FAILED**, derived assertion total **1228**.
Gate 28 now GREEN. Probe totals moved: round23 51 -> 53, round25 22 -> 23, round27 26 -> 31.

## Harness errors made and corrected (not code defects — recorded so they are not repeated)

1. Round-27's R3-1 control, draft 1: hand-built caps object -> `E_NO_PROVIDER`.
2. Draft 2: spec object passed where an id belongs -> `E_UNKNOWN_PROVIDER`.
3. Draft 3: tried to inject a fixture row -> `TypeError: object is not extensible`; `VIDEO_PROVIDERS`
   is deeply frozen, which is the catalogue doing its job.
4. Draft 4: donor was `higgsfield/seedance-2.5` — the ONE row with `pricingStatus: 'disputed'`, so
   the status gate returned `null` before the `rateUnit` switch was reached. Correct donor is
   `higgsfield/dop` (`published`, `generation`, carries `costPerRunUsd: 0.125` and
   `costPerSecondUsd: null` — the exact shape the old `default:` arm was dangerous for).
5. B2c fixture, three hand-written drafts: each rejected naming a DIFFERENT required field
   (`modelVersion`, then `transport`). Fixed structurally by cloning the shipped donor spec and
   overriding only `rateUnit`, so the fixture cannot drift from `specShape.mjs:47`'s nine required
   fields. A `donorCloneError` pre-check separates "the clone is bad" from "the rule is bad".

Every one of these failed LOUDLY and CRASHED rather than passing quietly, which is why they were
recoverable. The dangerous direction is the one that reports success.

## Self-hostile dry loop (Rule 73) — what it found beyond the five filed findings

The loop ran until a full pass produced nothing new. It produced **three or four items per pass**, and
two of them are the most interesting evidence in this log because they are about the fixes, not the
findings.

**R3-7 — examined and cleared.** `describeCost` (a THIRD consumer of `rateUnit`, not covered by the
filed finding) branches only on `'second'` and falls through to `per ${caps.rateUnit}`. Measured
across seven units: `run` -> "per run", `generation` -> "per generation", and for `per-minute`,
`unrecognised`, `null` the text is "cost unknown" — because `default:` now returns `null` before the
fall-through can render a nonsense unit. **R3-1's fix protects it transitively.** No defect.
Also confirmed `generation` ignores duration as documented (2s and 6s both 125000; no-duration also
125000, correct for a flat rate).

**R3-8 — investigated, fix written, fix REVERTED, resolved as a documented non-defect.**
R3-3 constrained only the fourth scan pattern to count words and left `([A-Za-z-]+|\d+)` in the other
three. That asymmetry is real and measurable: against ordinary prose, `**money** gates`,
`**all money** gates`, `all applicable gates` and `**readiness** gates` all match.
A "fix" constraining all four patterns was written — and it **broke E1c**, which requires
`**umpteen** gates` to be FLAGGED as unreadable. A constrained token cannot see `umpteen`, so the
fix would have replaced a loud false positive with a **silent omission** — the worse direction, and
exactly what F5 exists to catch.
The loose token is therefore **load-bearing**: it captures anything word-shaped before `gates`,
`num()` classifies it, and anything unreadable is either exempted by name with a stated reason or
FAILS the gate.
The decisive measurement: the shipped document contains exactly four loose-token phrases —
`all thirty-three gates` (x2), `**thirty-three** gates`, `all five gates` (scoped exemption), and
`all D-F gates` (a gate category, not a count). **Zero stray nouns.** The loose patterns cost nothing
here, and the two legitimate exceptions are already handled by `NON_COUNT_TOKENS`.
Recorded in the probe with the full reasoning, because the wrong fix is the tempting one and it was
made and reverted in this very session.

**R3-5d — a causal claim in the runner comment was inferred, tested, and REMOVED.**
The runner's comment asserted that the compile cache plus the leaked fixture "put hundreds of
untracked paths in the tree" and thereby caused the two differing gate reds. The *observations* are
real (two consecutive suite runs, no source change, different gate red each time; thousands of paths
during the suite with scratch inside the repo, two files with it outside). The *mechanism* was
inferred and is **not established**: `hostile-round24-probe.mjs` passes 13/13 with a leaked fixture
present, with a foreign `.mjs` file in `media-api/`, and under continuous concurrent creation and
deletion of untracked files in both lane directories. The causal sentence was therefore **rewritten
to separate what was observed from what was not**, in both the runner and this document. Prose about
a gate is not exempt from needing evidence.

**R3-5e — a paragraph in the document described behaviour the code no longer had.**
The R3-5 paragraph I added said E1 "derives its number from `git diff --name-status` **plus untracked
files in the lane's directories**" — true of the OLD derivation, false after R3-5's own fix. Prose
written by the fix, describing the pre-fix mechanism. Corrected to describe the tracked-only
derivation and the separate report. **Eighth appearance of the lane's recurring class.**

**Dead code:** the `untrackedFileAllowlist` introduced for R3-5 is declared with an explanatory
comment and never referenced. A comment asserting behaviour the code does not perform. Left
deliberately empty with the comment now saying so.

## Dry-loop verdict

Full passes run: **6** (plus targeted single-angle passes for R3-7, R3-8, R3-5d/e). Pass 6 found
nothing new beyond documentation corrections. The loop is dry for the source under repair.

Final state, DERIVED twice consecutively: **33 gates, 0 FAILED, 1228 assertions, exit 0.**

## Working tree / commit caution

`git status` in this worktree reports ~3,577 deletions across `shared/bootcamp-core/**` (19 files)
that are **NOT part of this work**. `shared/bootcamp-core/` does not exist on disk — this is a sparse
checkout, so an unfiltered `git diff` reports the whole subsystem as deleted. It is pre-existing
state and must **not** enter the commit. The commit for this round stages the changed lane files
explicitly by path, never `git add -A`.

Files this round changed or added:

- `shared/providers/video/costEstimate.mjs` — R3-1 money half
- `shared/providers/video/specShape.mjs` — R3-1 import half
- `media-api/hostile-round23-probe.mjs` — R3-3, R3-4, R3-8 documentation
- `media-api/hostile-round25-probe.mjs` — R3-5, R3-5a/b
- `media-api/hostile-round27-probe.mjs` — R3-2, R3-1 controls
- `docs/ai-workflow/blueprints/swan-media-api-2026-09-18/README.md` — R3-2, R3-3, R3-5 prose
- `media-api/run-all-gates.sh` — R3-5c (runner scratch) — NEW
- `media-api/BASELINE-fb82c21a1-before-R3-fixes.txt` — NEW, the baseline receipt
- `media-api/RECEIPT-after-R3-fixes.txt` — NEW, the post-fix receipt
- `docs/ai-workflow/blueprints/swan-media-api-2026-09-18/ROUND-3-FIX-LOG.md` — NEW, this log

## Status

- Enablement: **STILL BLOCKED.** Nothing here is an enablement approval.
- Invariants 2–4: still NOT SATISFIED or PARTIAL, as round 26 recorded.
- Invariant 5: NOT implemented — the race is in ADMISSION, not the ledger write.
- Invariant 6: NOT implemented — exposure is wider than `E_SUBMIT_FAILED`.
- Astra round 4: NOT yet commissioned.
