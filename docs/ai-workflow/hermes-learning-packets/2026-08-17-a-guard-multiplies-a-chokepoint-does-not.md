---
title: "A guard multiplies, a chokepoint does not — 25 hostile rounds on one capture surface"
packet: guard-multiplies-chokepoint-does-not
date: 2026-08-17
originating_model: claude-fable-5
tier: fable-tier
tier_basis: "claude-fable-5 is the running session model (Fable 5, Final Decider); provenance is first-hand, not relayed"
surface: swan-coach / freestyle dictation capture layer
decision: "When a fix must hold at N call sites, restructure so there is ONE call site; when N cannot be reduced, define the category by the INVARIANT rather than the verb, and sweep every member in the same commit"
privacy: "IDs/roles only; no PII, no secrets, no client data; artifacts named are repo files, commit SHAs, review documents"
status: draft
models_used:
  - model: claude-fable-5
    role: builder, adjudicator, Final Decider
    did: "Ran 25 hostile-review rounds; fixed 77 findings; disproved one false positive; introduced 2 defects of its own (one live-data-destroying) and caught both before commit"
    cost: subscription (flat rate)
  - model: glm-5.3
    role: hostile reviewer, all 25 rounds
    did: "~35 findings, all verified real; 9 evidenced zeros; twice refused to manufacture a LOW to avoid an empty verdict; supplied the closeSession chokepoint and abandon() prescriptions"
    cost: ZAI subscription (2 HTTP 429 outages, 2 empty responses — each logged as transport failure, never counted as a zero)
  - model: openai/gpt-5.5 (Codex)
    role: hostile reviewer, all 25 rounds
    did: "~42 findings across 25 rounds; first zero at round 19; ONE false positive (round 24) — an off-by-one misread of a numbered listing"
    cost: OpenRouter, ~$0.05-0.15/round
skills_touched:
  - id: rule-30 (external output is a hypothesis)
    change: reinforced with evidence
    failure: "Codex claimed a build-blocking syntax error in a file that had just passed tsc and a production build; acting on it would have 'fixed' correct code"
  - id: rule-73 (proof-before-done)
    change: applied 25 times
    failure: "every round's fixes were verified against PRE-FIX source before the claim; four tests that could not fail were caught this way"
  - id: dry-loop law
    change: applied to completion
    failure: "none — the loop ran to CLEAN×2 on its stated terms"
---

# A guard multiplies, a chokepoint does not

Twenty-five hostile-review rounds against one dictation surface produced 77 verified findings. The
single most valuable thing learned is not any individual defect — it is the *shape* of the fixes
that stopped defects recurring, versus the shape that kept re-opening them.

## The lesson

Three times in this loop I fixed a category defect by patching the instances a reviewer named:

| Round | Category | What I fixed | What survived | Found again at |
|---|---|---|---|---|
| 5 | Exits that must stop the engine synchronously | The 2 lifecycle paths named | Done, discard-arm, Cancel | R13, R14 |
| 13 | Same category, 2 more members | Done + discard-arm | Cancel/close | R14 |
| 18 | Surface-terminating exits that must clear the error latch | 1 of 2 exits | discard-confirm exit | R19 |

Each time, the fix was correct and the category stayed broken. The pattern only stopped at round 19,
when the fix changed **shape**: instead of adding the missing call site, both terminating exits were
routed through a single `closeSession` chokepoint that performs stop → clearError → settle → close.
A future exit added to that surface cannot skip the invariant without visibly bypassing the
chokepoint.

**The rule: when a fix must hold at N call sites, restructure so there is one call site.** Guards
multiply — each new path is a new chance to forget. Chokepoints don't.

Round 22 proved the same principle at the data layer: instead of adding an expiry check to each
destroying path, `clearBuffer` itself now decides the receipt (`expired ⇒ 'ttl'`, whatever the
caller passed). The invariant "an expired buffer's destruction is always receipted truthfully" is
now true *by construction*, at the one place every purge already flowed through.

**Corollary (round 21→22): when N genuinely cannot be reduced, define the category by the INVARIANT,
not by the verb.** I swept "paths that extend a live buffer" and the reviewer immediately found the
paths that merely *touch* one. The invariant was "nothing may act on an expired buffer" — a wider
set than any verb I had chosen.

## Who did what

- **claude-fable-5 (me)** — built the layer, fixed all 77 findings, and produced two defects of my
  own. The serious one: a "hardening" change gave a callback a new identity, which made an unmount
  effect re-run on a routine prop change, and its **cleanup destroyed a live recording session**
  with a false `'unmount'` receipt. A regression test written six rounds earlier for an unrelated
  reason caught it in one run; a 20-line probe traced it in one pass.
- **glm-5.3** — the better *structural* reviewer: it supplied the chokepoint and `abandon()`
  prescriptions, traced clock algebra symbolically, and twice explicitly refused to manufacture a
  finding to avoid an empty verdict ("manufacturing a LOW from the dismissed list would be exactly
  that"). Nine evidenced zeros, each with the attack traces shown.
- **openai/gpt-5.5 (Codex)** — the better *seam* reviewer: it found the paths between layers
  (gesture handler vs hook, arming vs destroying, entry vs commit). It reported findings in every
  round until 19 and never manufactured one — but produced the loop's only false positive at round
  24, misreading a line number in a numbered listing.
- **Eight independent convergences** — both reviewers finding the same defect from different
  directions — were all eight genuine. Convergence remained the single strongest real-defect signal.

## Skills created or changed

- **Chokepoint-over-call-site** is now the default fix shape for any invariant that must hold at
  multiple sites (recorded above with three failure cases and two successes).
- **Empty responses and HTTP 429s are transport failures, never verdicts.** GLM returned two empty
  documents; counting either as a "zero" would have corrupted the dry-loop ledger at the exact
  moment it mattered. Every retry was content-verified before acceptance.
- **A finding is resolved by documenting the ambiguity when code cannot know the answer.** Round 23's
  `'unmount'`-while-`'stopped'` receipt is genuinely ambiguous (delivered vs lost); the reviewer's own
  instruction was "do NOT change the hook to guess", and the resolution is a paragraph in the
  retention contract telling audit consumers to read it as indeterminate.
- **Destructive effect cleanups take empty deps and a ref, always.** Identity churn turns "cleanup on
  unmount" into "cleanup on any prop change" — invisible in review, catastrophic in effect.

## Mistakes I made

1. **I destroyed a live session with a safety fix** (round 22) — the chokepoint's dep change made a
   destructive cleanup re-run on a prop change. Caught by an existing test, not by me.
2. **Three category-shaped defects fixed instance-shaped** (rounds 5/13/18), each recurring one to
   eight rounds later. The lesson was written down after the first two and did not change behaviour
   until the fix *shape* changed.
3. **Four tests that could not fail** — each caught only by running new tests against pre-fix source.
   The procedure caught every one; my test-design judgment never improved.
4. **Carried a stale branch figure for twenty rounds.** The handoff said "~1948 behind"; the real
   number was 2,076, and re-measuring took three commands. Worse, its framing let me treat delivery
   as a blocker to defer rather than a question to answer.
5. **Suppressed stderr in a commit retry loop** and nearly proceeded after a silent failure. Caught by
   checking `git log` afterwards.
6. **A dead dep array entry sat for eleven rounds** — introduced when I removed a call without
   pruning its dep. Same family as two real defects (R16 frozen policy, R22 live wipe).

## Error → fix → repeat ledger

| Error class | Occurrences | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| Instance fix for a category defect | 3 | Yes, twice, with the rule stated plainly | Changing the fix SHAPE (chokepoint), not remembering harder |
| Test that cannot fail against the defect it names | 4 | Yes, repeatedly | Running new tests against pre-fix source — every time, without exception |
| Stale/dead/churning dep array | 3 | Yes, twice | Reviewers. **The deferred ESLint `exhaustive-deps` slice would have caught all three at edit time** |
| Destructive cleanup coupled to callback identity | 1 | No | An unrelated regression test from six rounds earlier |
| Carrying a handoff figure without re-measuring | 1 (~20 rounds) | Yes — the STALE-CHECK rule | Running the measurement |

**The honest summary of this table: written lessons did not prevent recurrence. Procedures and
structures did.** The pre-fix verification run has a 4-for-4 catch rate. The chokepoint ended a
three-round recurrence. The one class with no structural cure yet (dep arrays) is precisely the one
still costing findings — and the tool that would fix it has been deferred for months.

## External-model calibration

| Model | Findings | Real | Zeros | Best at | Watch for |
|---|---|---|---|---|---|
| **GLM-5.3** (ZAI sub) | ~35 | 35 | 9 evidenced | Structural prescriptions, symbolic clock/state algebra, honest refusals | Transport flakiness: 2× HTTP 429, 2× empty response — always content-verify before counting a verdict |
| **Codex / gpt-5.5** (~$0.05–0.15/round) | ~42 | 41 | 2 (R19, R23, R25) | Seams BETWEEN layers; holding a commit message's own claims to account within one round | One off-by-one misread of a numbered listing (R24). When a finding's load-bearing evidence IS a line number, verify the line number first |

**Total spend for 25 rounds of dual hostile review: roughly $2–4 on OpenRouter plus flat-rate
subscription time.** For 77 verified defects on a surface that handles a microphone and client PII,
that is the cheapest quality in the toolkit — and cheaper than the one production incident it
prevents.

## How to apply next time

1. When a fix must hold at N sites, restructure to one site. If you can't, sweep by invariant.
2. Run every new test against pre-fix source before believing it.
3. Destructive cleanups: empty deps + ref, never a callback identity.
4. Empty/429 reviewer responses are transport failures; content-verify before counting.
5. When a reviewer's evidence is a line number, check the line number.
6. When a workstream hardens a shared primitive, check who else consumes it before choosing the
   delivery order — the most valuable output of this 25-round feature loop was a four-file safety
   fix that has nothing to do with the feature.
