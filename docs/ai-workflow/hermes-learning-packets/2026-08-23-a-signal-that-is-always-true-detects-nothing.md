---
title: A signal that is always true detects nothing
originating_model: claude-opus-5
tier_basis: Opus 5 is Fable-tier by Sean's designation 2026-08-10
decision: Before shipping a detector, assert its signal against real data of BOTH states it claims to separate. A plausible signal that is always true passes every check and detects nothing.
status: draft
privacy: IDs, file paths and line numbers only; no client data, no secrets, no PII
date: 2026-08-23
models_used:
  - model: claude-opus-5
    role: diagnosed the gate race, built the fix, caught the fix being inert
    did: reproduced the flush race 4/4 from an existing transcript; shipped a first fix that never fired; found it by assertion, replaced the discriminator, merged
    cost: subscription
skills_touched:
  - id: Rule 74 (Proof-Before-Done)
    change: proposed extension
    failure: a detector can pass syntax, review and its own test suite while detecting nothing; proof must include the signal firing on real data of the state it claims to detect
  - id: mutation testing (house practice)
    change: reaffirmed
    failure: my first mutation changed no outcome, the suite stayed green, and I nearly read that as the tests being honest
---

# A signal that is always true detects nothing

## The lesson

Two Stop-hook gates were blocking closeout messages that contained everything they required. I reproduced the cause 4 times out of 4: the hooks read the transcript once, with no retry, and sometimes ran before the final message had been written to it. They were blocking a message for being absent when it was merely not yet flushed.

Then I fixed it — and the fix did nothing.

I keyed the retry on *"the turn contains no assistant text yet."* That reads as obviously correct. It is also **true long before the closing message is written**, because every substantial turn carries mid-turn narration. Measured at all four race points, the signal I was using to mean "the closeout has not landed" was already `true` when the closeout *had* landed, and already `true` when it hadn't. It separated nothing.

It passed `node --check`. It passed reading it back. It would have passed code review — the logic is coherent, the naming is honest, the comment explains the intent accurately. **The only thing that exposed it was asserting the signal against a real transcript in both states.** It fired zero times where it should have fired four.

The general form: **a detector is not verified by checking that its logic is right. It is verified by showing the signal actually differs between the two states you claim to separate.** A plausible signal that is constant is indistinguishable from a working one everywhere except real data.

What actually separated the states was cruder and less elegant — the *last entry in the file*. Pre-flush it is an `attachment` or `bridge-session` record; post-flush it is an assistant entry carrying text. Four for four. The unglamorous signal was the correct one, and I reached for the semantically appealing one first.

## Who did what

**No model was consulted, and none was needed.** The entire diagnosis came from replaying an artifact that already existed — the session transcript — against the gates' own exported functions. When a gate misbehaves, the transcript it judged is a complete, free, deterministic test fixture. That is worth more than a second opinion, because it settles the question rather than adding one.

The sequence worth noting: I proved the gates' *logic* was innocent first (feeding `decide()` the exact transcripts it had blocked returned `allow` every time), which is what made the flush race the only remaining explanation. Exonerating the obvious suspect narrowed the search to one candidate.

## Skills created or changed

`scripts/hooks/lib/transcript-settle.mjs` — shared by both gates. Two properties worth carrying into any similar guard:

**The retry is narrow by construction.** Exactly one state is ambiguous: build-shaped turn, closing message not landed. A turn that is not build-shaped, or whose closeout is present but missing sections, is decided on the first read with no delay. So a genuinely non-compliant closeout still blocks immediately — the fix cannot buy latency for the case it was not written for, and cannot mask real failures.

**A rescue is announced, not swallowed.** If the retry ever saves a read, it says so on stderr. A silent fix for a race is unfalsifiable: you can never tell whether it is working or the race simply stopped happening.

Proposed extension to Rule 74: for a *detector* — a gate, guard, or check — proof of done should include the signal demonstrably firing on real data of the state it detects, not only the surrounding logic being correct. My first fix would have satisfied every existing proof requirement.

## Mistakes I made

- **Shipped a detector whose signal was constant.** It read correctly, passed syntax, and never fired. Caught only by asserting against real transcripts in both states.
- **Reached for the semantic signal over the structural one.** "Has the model produced text" felt like the right abstraction; "what kind of record is the last line" felt crude. The crude one was correct, and the appealing one was constant.
- **Banked a mutation test that proved nothing.** My first mutation removed a type check whose later branches returned the same value anyway. The suite stayed 17/17 and I briefly read that as evidence the tests were honest. A mutation that changes no outcome is a failed experiment, not a passing one. Re-ran with mutations that actually invert behaviour — 7 and 3 failures.
- **Two of my own timeouts produced false failures this session**, including reporting a test that legitimately takes 61 seconds as FAILING under a 60-second limit. A too-tight limit is indistinguishable from a real defect unless re-run longer.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stops it |
|---|---|---|---|
| Instrument reports something confidently while measuring the wrong thing | **~14** | Yes, repeatedly | Cross-check any surprising or *convenient* result against a second signal before banking it |
| **Detector shipped with a signal that cannot discriminate** | 1 | **No — new class** | Assert the signal on real data of BOTH states before shipping. "Logic is correct" is not the test. |
| Mutation test that changes no outcome, read as a pass | 1 | No | A mutation must flip at least one assertion or it is a failed experiment |
| Test/tool timeout set below the real runtime, read as failure | 2 | No | Re-run a lone failure with a longer limit before recording it |

The second row is the one to carry, and it is genuinely new. It survived syntax checking, self-review, and a first mutation pass — **all three of which were pointed at whether the code was correct rather than whether the signal was discriminating.** The correction is one procedural step: before trusting a detector, run its signal against a real example of each state and confirm the values differ.

## External-model calibration

No paid or external model was consulted, and the calibration point is that none would have helped. The decisive evidence was a file already on disk. A reviewer — human or model — reading my first fix would very likely have approved it: the logic is sound and the comment states the intent correctly. What falsified it was data, not judgement.

Routing implication: when the question is *"does this detector actually detect,"* replay real artifacts through it. Reserve paid seats for questions where the disagreement is about judgement, not about fact — a fact can be checked for free and settled permanently.
