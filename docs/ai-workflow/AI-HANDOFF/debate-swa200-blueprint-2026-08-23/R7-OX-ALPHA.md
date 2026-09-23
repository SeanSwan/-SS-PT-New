# Consult reply — Ox Alpha (stealth/ox-alpha) — 2026-08-23T21:08:50.271Z

> tokens: prompt=8172 completion=1176 | finish_reason: stop | max_tokens: 60000

**One small defect — not structural, but real, and it's exactly the round-6 class: a dependent claim left un-updated by the retraction.**

## Finding: shape 4's parenthetical still asserts the exclusivity you retracted

7.1, shape 4:

> NOT a failed migration — **a failed migration is shape 5**, because the guard emits POST on every child exit code

Rev 7's own shape 5 edit explicitly retracts this ("NOT the only failed-migration signature any more — see shape 6"), and shape 6-red *is* a failed migration (child exited non-zero). So shape 4's justification sentence is now false in the document that corrected it two boxes down. An operator paging off shape 4's text alone gets the old, wrong rule. Fix: change to "a failed migration is shape 5 or shape 6-red."

## Checked, nothing else

- **Shape 6 dangling:** none. Green/red split is complete over child exit codes {0, non-zero}, which is exhaustive. `pendingAfter:"unknown"` + green has an instruction (manual query); + red defers to shape 5.
- **A8 → A3:** no contradiction. It mirrors the existing FIXR/FIXM/A4/A5 back-edges — A3 is a decision point, not a state that changes, so re-entering it means "re-read the same deploy's lines," which is correct for green (confirm, then move on) and harmless for red (operator routes to section 9 per the node text). No infinite-loop semantics because every exit from A3 is operator action, not automatic re-evaluation.
- **Section 9 step 3:** reads coherently for both — shape 5 uses `pendingAfter` as a count, shape 6 falls through to the meta-table diff with the fallback stated inline. No dangling reference to the retracted exhaustiveness claim there.
- **Mermaid branch count vs. shapes:** six shapes, six readings, seven A3 branches (the seventh being PRE-yes/POST-absent) — consistent.

**Fix the shape 4 sentence and this is CLEAN.**
