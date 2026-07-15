# 07 — Checkpoint Protocol & Log

## Protocol
After each slice the builder posts: (a) the diff (`git diff --stat` + full diff of key files),
(b) every acceptance criterion from 05 with its REAL output pasted, (c) screenshots where required.
The architect (Fable, or the strongest available Claude per the Final Decider chain — free lane
by default; paid Fable consult only if Sean approves) reviews:
1. Criteria: every item verified against pasted evidence — no "trust me" greens.
2. Drift scan: anything built that the package didn't specify? anything specified but missing?
   any 06-bans violation? Deviations go BACK to the builder — the architect does not patch.
3. Verdict: `PASS` (proceed) · `REVISE <list>` (fix, re-present same slice) · `HALT` (architect
   re-forges; stop coding).
Log every verdict below. The completed log feeds the Rule 48 audit record in S6.

## Review remit (paste to the reviewer)
> Review slice N of BLUEPRINT-dictation-planner-logger-sync-2026-07-14 against 03-contracts,
> 04-build-order, 05-slices, 06-bans. Verify every acceptance criterion from pasted evidence only.
> List drift (unspecified additions, missing specs, ban violations). Verdict PASS/REVISE/HALT with
> file:line findings. Hostile: try to name a state/race/mobile/a11y case the slice misses.

## Verdict log
| Slice | Date | Reviewer | Verdict | Notes |
|---|---|---|---|---|
| S1 | | | | |
| S2 | | | | |
| S3 | | | | |
| S4 | | | | |
| S5 | | | | |
| S6 | | | | |
