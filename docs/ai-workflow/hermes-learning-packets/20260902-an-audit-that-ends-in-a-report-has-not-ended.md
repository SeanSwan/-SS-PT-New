---
name: an-audit-that-ends-in-a-report-has-not-ended
date: 2026-09-02
originating_model: claude-fable-5
tier_gate: PASS
models_used:
  - model: claude-fable-5 / orchestrator+Final Decider / audit, fusion, verification of every adopted finding / subscription
  - model: claude-opus-5 (Explore agents) / mappers / backend+frontend architecture maps with file:line mount evidence / subscription
  - model: glm-5.3 (Z.ai) / hostile reviewer / 10 findings all real, 15 plan corrections, 6 mechanisms / $0
  - model: glm-5.3-flash (Z.ai) / hostile reviewer / 21 claims, 10 adopted, 4 disproven at source, 1 narrowed / $0
skills_touched:
  - id: rule-73 proof-before-done / applied / every adopted finding re-verified at file:line before entering the blueprint
  - id: hermes-learning-packet / applied / this packet
---

# An audit that ends in a report has not ended

## The lesson
On 2026-08-21 a five-seat panel audited the Swan Coach brain, falsified 4 of 13 findings
in the audit it was reviewing, found the REAL P0 the audit missed (random per-process HMAC
signing key + in-memory approval store), designed a corrected 12-slice blueprint, and
BUILT the fixes — 19 commits: an adversarial approval test pack, a CI gate, an IDOR fix,
rate-limit hardening. Eleven days later, on 2026-09-01, this session found every one of
those 19 commits stranded on an unmerged branch and the P0 still live on main, at the same
two line numbers. The panel did everything right except the only thing that changes
production: landing. **A finding's lifecycle is find → fix → LAND → verify live. A
correction that ships as a branch is a correction that did not ship.** The audit report
even became the trusted artifact — later sessions cited it as if its fixes were real.

## Who did what
- claude-fable-5 orchestrated; two Opus-5 Explore agents produced the architecture maps;
  GLM 5.3 and GLM 5.3-flash ran the hostile reviews on packets carrying REAL SOURCE.
- GLM 5.3 was flawless on verification (10/10). Flash produced the single deepest finding
  of the session (the cross-client alarm is unreachable by construction — the id collapse
  happens upstream of the comparison) AND four confidently-wrong claims, each disproven by
  reading the exact line it cited. Flash names verify-commands for its inferences, which
  makes its wrongness cheap. Routing: flash = breadth, 5.3 = depth, both = verify-first.

## Skills created or changed
None created. The blueprint proposes converting two conventions to enforcement (route-guard
contract test; dispatcher return contract) — motivated by /cancel shipping guardless while
its siblings carried guards, the exact drift class a convention cannot stop.

## Mistakes I made
- Quoted a plan document's own progress table ("only S1 shipped") as status; the board
  showed all 25 slices landed. A plan's slice index is a snapshot the moment it was
  written, never a status surface — check the board first.
- Wrote an injection finding before tracing the consumer; the probe showed the path is
  deterministic (display-only). The claim was corrected in-place and the corrected form
  was MORE useful (it names the exact future slice where the lane opens).
- Built a Monitor wait on "output file exists" — the file exists from task creation. A
  wait condition must observe the completion signal, not a side effect of starting.
- A `tail -n +2 | sed` assembly pipeline deleted the line the sed was meant to rewrite.
  Caught by the pre-commit hostile pass, which is the reason that pass exists.

## Error → fix → repeat ledger
- Stale-doc-as-status: 1 occurrence this session, caught by a subagent digest within the
  hour, before any decision was made on it. Prior art: the drift-check hook warned at
  session start and the branch-freshness lesson already exists in the corpus — the hook
  prevented the expensive version (auditing the stale tree) but not the cheap version
  (quoting a stale table). Procedural fix that survives: status comes only from the board
  or git, never from a document's own progress section.
- Probe-before-claim: 1 occurrence, self-caught same session. The write-up preceded the
  probe; the standing correction is the repo's own F8-style stamp: no finding enters a
  ledger without a verification stamp or an explicit [INFERENCE] + verify command.

## External-model calibration
- glm-5.3 (review-class, source-packet): 10 findings, 10 verified real. $0. 345s.
- glm-5.3-flash (review-class, source-packet): 21 claims → 10 real, 4 false, 1 narrowed,
  rest architectural. $0. 735s. False claims all carried their own disproof commands.
- Both models' PLAN attacks (sequencing, missing slices) had a 100% adoption rate — on
  this task class their judgement about what to do next outran their assertions about
  what code currently does, which matches the V3-handoff lesson exactly.
