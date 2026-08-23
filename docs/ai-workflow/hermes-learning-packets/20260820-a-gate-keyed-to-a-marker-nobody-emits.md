---
title: "A gate keyed to a marker nobody emits — write the emitter before the check"
date: 2026-08-20
originating_model: claude-opus-5
tier: fable-tier
tier_basis: "Session model is claude-opus-5[1m] (harness-stamped in the environment block); claude-opus-5 is Fable-tier by Sean's designation 2026-08-10 and is on the Rule 68 tier_allowlist in _schema.json. First-hand provenance — this session authored the work being recorded."
privacy: "Repo-relative paths, file and function names only. No PII, no secrets, no credentials, no absolute user paths. Competitor entries are public business brand accounts, not private individuals. Secret-scanned CLEAN."
surface: swan-ops
decision: "A 'grep for the marker' gate is only a control if something is contractually obliged to emit that marker. Trace the pattern to its emitter before writing the check, and make absence of the marker fail closed."
status: shipped
supersedes: none
linear: none
models_used:
  - model: claude-opus-5
    role: builder and sole reviewer (13-round dry-loop)
    did: "Built the publish gate + prompt contract for swan-ops Slice 1. Caught that the inherited spec named two marker strings that exist nowhere. Made six of its own errors, three of them the same class."
    cost: subscription
skills_touched:
  - id: rule-73 proof-before-done
    change: reaffirmed
    motivating_failure: "Function-level tests passed while the end-to-end path was never exercised; the claim had to be scoped to what was actually proven rather than to 'the gate works'."
  - id: rule-28 claim-to-evidence lock
    change: reaffirmed
    motivating_failure: "First draft wrote up the gate as closing the finding without stating that it constrains a negligent agent but not a captured one."
  - id: "handoff §8 item 9 (numbers expire)"
    change: amended-in-practice
    motivating_failure: "The rule was open on screen and was violated three times in one session. Vigilance failed; the working correction is procedural — measure counts in the final pass, never before the last edit."
---

# A gate keyed to a marker nobody emits

## The situation

An inherited work order specified a security gate in concrete terms: before publishing an
agent-written report, grep it for `CONTROL_WORKED:\s*NO` and `TRIMOV_STATUS:\s*DID_NOT_RENDER`,
and quarantine on a match. Roughly ten lines. It was ranked the highest value-per-minute item in
the backlog, by two independent hostile reviewers.

**Neither string occurs anywhere in the prompt that produces those reports.** The agent is never
asked to emit them. Building the spec verbatim would have produced a gate that matched nothing,
ever — while every subsequent closeout truthfully reported the finding closed.

The spec was written by a competent agent, at the end of a session whose entire subject was
instruments that return nulls for the wrong reason. It reproduced that error inside the fix for it.

## The lesson

**Trace a pattern to its emitter before you write the check.** "Grep for X" is a control only if
something is obliged to write X. Otherwise it is decoration that reads as enforcement in every
report thereafter — and it is worse than no gate, because a no-op gate is *believed*.

Two corollaries that generalise past this tool:

**Fail-open-by-omission is the default failure of self-report gates.** If absence of the marker
means pass, then the cheapest defeat — and by far the commonest accident — is to not write it. The
built version treats missing, partial, duplicated and malformed blocks identically to failing ones,
and the prompt tells the agent so in the same place it defines them, so honest runs are never
surprised.

**A fail-closed gate can be broken in the safe direction and still be broken.** .NET does not
classify U+FEFF as whitespace, so a surviving byte-order mark made `^\s*FIELD` fail on the *first*
line only — which happened to be the most important field. The gate quarantined perfectly healthy
reports while reporting "verdict block absent": it failed closed for a reason with nothing to do
with the report. Every blocked-path test passed throughout. **Only a test asserting the publish
path found it.** Security-gate suites that only assert blocking cannot distinguish a working gate
from one that blocks everything.

## Who did what

Solo Opus 5 session, no external models consulted, no spend. The two hostile reviewers whose
findings drove the backlog (GLM-5.3 and Kimi-K3) had reviewed the *prior* session; their ranking of
this item was correct, and the concrete implementation they suggested was not. Worth recording as
calibration: **a reviewer can be right about priority and wrong about mechanism in the same
finding**, and the mechanism half is the part that gets built without re-checking.

## Skills created or changed

No new skill. Three existing rules were exercised and one was amended in practice — see frontmatter.
The amendment worth carrying: the "numbers in docs expire" rule cannot be satisfied by intending to
be careful. It is satisfied by measuring counts in the final verification pass, after the last edit,
because any edit invalidates every count written before it.

## Mistakes I made

- Wrote two line counts into a document from memory rather than measuring (README 196 vs 215; job
  prompt 303 vs 299) — while editing the very document whose §8 warns that stale counts bit the
  previous session three times.
- Repeated it twice more, for a different reason: I measured correctly, then edited the files again,
  and the correct numbers went stale. Three occurrences in one session.
- Grew the launcher from 304 to 321 lines, worsening an open finding about that file exceeding its
  own line cap, while working on that file. I had moved the logic to a library and then spent the
  saving on comments.
- Placed the acceptance test for a security gate inside the directory the tool auto-prunes after 30
  days. The test would have deleted itself and the README citation would have rotted.
- Broke a test file with a UTF-8 em-dash that PowerShell 5.1 read as ANSI — the precise encoding
  hazard the gate's ASCII-only design defends against, committed in the file that tests the gate.
- Inserted a section between a table and the paragraph correcting that table, so the correction
  read as belonging to the new section.
- Wrote the first status draft as though the gate closed the finding outright, without stating that
  it constrains a negligent agent but not a captured one.

## Error → fix → repeat ledger

| Error class | Recurrences | Already written up before it recurred? | What actually stopped it |
|---|---|---|---|
| Stale number written into a doc | 3 | **Yes** — §8 item 9 of the open document | Re-measuring every count in a final pass. Not vigilance. |
| Testing through the bash quoting layer, getting the opposite answer | 1 | **Yes** — §8 trap 1 says exactly this | Moving the check into a real `.ps1` |
| Multi-line edit failing silently on this tree | ~5 | No | Single-line anchors, then read/replace for multi-line |

The first row is the highest-signal entry here. **The lesson was documented, in the file open in
front of me, and I repeated it three times.** That is proof the write-up was not the fix. The
correction that survived is procedural — "measure last" — and the one that failed was
resolutional — "remember that numbers expire."

## External-model calibration

None called this session; zero spend. The only calibration datum is retrospective: the prior
session's two paid reviewers correctly ranked this item first and incorrectly specified how to
build it. Treat a reviewer's *priority* and a reviewer's *mechanism* as separately verifiable
claims — Rule 30 applies to the mechanism even when the priority is obviously right.

## Dry-loop record

13 rounds, 8 of which found a real defect (rounds 1, 2, 4, 6, 7, 8, 10, 11). Rounds 12 and 13 clean.
Stopping at "tests pass" would have shipped a self-deleting test, a worsened line-count finding,
six stale numbers, a misleading README structure, and an overclaimed security result.
