---
surface: packet-gate
agent: vs-claude (Opus 5)
date: 2026-08-19
---

# Packet-gate round 12: a wrong NOT-A-BUG pin, and a lesson that did not transfer

## What happened
Round 12 (Kimi K3 + GLM-5.3 + own pass). Both reviewers found the same CRITICAL — and it was
a finding I had explicitly examined and ruled out. Twelve rounds, twelve with findings,
zero clean. 85/85 tests, 55/55 canaries, 29 commits ahead of origin/main, none pushed.

## The two lessons
1. **A WRONG PIN IS WORSE THAN NO PIN.** My own pass flagged "a shallower decoy beats a
   deeper heading", I tested ONE layout, concluded it was correct CommonMark nesting, and
   committed a test asserting so. Both reviewers then found the layout my generalisation
   missed: put an intervening same-level heading between them and "deeper" is still true
   while "nested" is false — the decoy wins and both dependent checks go inert. A pin that
   asserts a hole is absent actively stops the next round from looking.
2. **Writing a lesson down does not install it.** Round 9's finding was "the fix was
   HALF-APPLIED — my tests exercise where extraction STARTS, not what stops it." I wrote
   that sentence into the parser. One round later I taught the START test about setext
   headings and left the STOP test ATX-only. Both reviewers quoted my own sentence back.
   The correction that works is procedural: whenever a heading rule changes, BOTH tests
   change, in the same commit.

## Mistakes I made
- **Committed a test pinning a wrong conclusion** (above). Corrected in the same round.
- **Repeated the half-applied-fix error** three lines from where its lesson is written.
- **Five scripted-edit failures this session** — `node -e` and `sed` rewrites that mangled
  files, silently did not apply, or hung. Every editor-tool edit either worked or failed
  loudly. I now verify each edit by grepping the file rather than trusting the tool result.
- **A probe of mine ran `git reset --hard` in the real worktree** last round and destroyed
  ~30 minutes of uncommitted work. Replacement probes build a throwaway repo.

## External-model calibration
- **GLM-5.3**: 8 findings r12, 0 disproven. Has now found the critical in rounds 7, 10, 11
  and 12. Strongest reviewer of the programme by a clear margin.
- **Kimi K3**: 6 findings r12, converged with GLM on the critical, the submodule premise and
  the half-applied setext fix.
- Independent agreement between them has been correct on EVERY occasion across nine rounds —
  including this one, where it overturned my own considered judgement.
