---
surface: packet-gate
agent: vs-claude (Opus 5)
date: 2026-08-16
---

# Packet-gate rounds 4-5 closed; loop not dry

## What happened
Took over the packet-gate hostile-review programme. Fixed round 4's eight findings and ran
round 5 (Kimi K3 + GLM-5.3 + my own pass), which found 1 CRITICAL + 2 HIGH. All fixed.
Seven MEDIUM/LOW remain open for round 6. Nine commits, none pushed.

## Decisions worth carrying
- **Verify by execution, never by reading.** Of round 4's eight findings, one was ranked two
  levels too low (a "HIGH false-refusal" was a CRITICAL fail-open) and one was simply wrong.
  Both were only discoverable by running the code.
- **A guard that cannot fire is the bug it exists to prevent.** Two separate instances this
  session: R15 stopped covering R3/R4 after a refactor, and the new absence-gate silently
  matched nothing until its own first test caught it.
- **GLM-5.3's round-4 empty output was a token-budget artifact, not incapability.** At
  `--max-tokens 96000` it produced the round's strongest review. Do not write it off.

## Mistakes I made
- **I created round 5's CRITICAL myself.** Splitting `checks.mjs` to satisfy the 300-line cap
  moved R3 and R4 out of the three files the canary hash covered, so R15 silently stopped
  certifying the two most load-bearing checks. Caught only because GLM's scope note told me to
  check it. Fifth consecutive round where the previous fix created the next critical.
- **I used a bash heredoc for JS with `\` escapes** and it collapsed them, turning
  `'src\validate.mjs'` into a vertical-tab escape. The takeover doc warned about exactly this
  for python heredocs; I walked into it with bash. Two tests failed for a reason that looked
  nothing like the cause.
- **I trusted two probes that lied**, both mine: a stale probe replicating pre-fix code, and a
  shell-escaped inline `-e` that never contained the U+2028 it claimed to test. Both briefly
  read as regressions. Validate the instrument before believing a negative — again.
- **My first U+2028 fix was insufficient and I nearly shipped it.** `[^\n]*` does not help when
  a document has no `\n` at all. Only re-running the original attack caught it.
- **I reported `scan_exit=0` from a pipeline** where `$?` was `tail`'s exit, not the scanner's.

## External-model calibration
- **Kimi K3** ($0.3618, 431s): 8 findings, all real, but severities are reasoned rather than
  executed — one was two levels off. Worth its cost; do not trust its ranking.
- **GLM-5.3** (bundled, 882s, 33,706 reasoning tokens): 9 findings including the generalization
  that killed the whole hidden-character class, and the scope note that surfaced the critical.
  Strongest reviewer of the round.
- Both independently found the `--seed` provenance hole. Independent agreement was the highest-
  precision signal available.
