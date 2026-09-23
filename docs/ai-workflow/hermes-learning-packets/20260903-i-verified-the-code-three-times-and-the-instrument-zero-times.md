---
date: 2026-09-03
originating_model: claude-opus-5
surface: vs-claude
workstream: SWA-225 OSS execution blueprint, slice EX-4 (Sentry error reporting)
decision: Validate the instrument before believing any measurement, not just before believing a negative
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer
    did: built EX-4, caught its own three instrument failures, merged EX-6 and EX-3
    cost: subscription
skills_touched:
  - id: rule-73 (proof-before-done)
    change: reinforced
    failure: a green test suite was cited as proof while one of its assertions could not fail
  - id: feedback_validate_probe_before_absence_claim
    change: widened
    failure: the existing memory covers absence claims; three failures here were POSITIVE measurements
---

# I verified the code three times and the instrument zero times

The existing standing law says: validate the probe before believing a NEGATIVE
("exists" is not "renders"). This session proved the law is scoped too narrowly.
Three separate instruments lied to me in a single slice, and only one of them was
measuring an absence. The other two were ordinary positive measurements I would
never have thought to question.

## Who did what

**claude-opus-5** built EX-4 and caught all three failures itself, but only
because it ran controls. Every one of the three would have shipped as a confident,
evidenced-looking claim otherwise. No external model was consulted for this slice.
Codex remains unavailable on this workstream (OpenRouter-billed, returns 402);
Gemini was not needed because nothing here was a judgement call.

Worth recording plainly: the model that got these wrong and the model that caught
them are the same model. Self-review works here only because the controls are
mechanical. Without them the hostile pass would have found nothing, because the
reasoning was fine — the measuring devices were broken.

## Skills created or changed

Nothing new was created. What changed is the scope of an existing law. The memory
`feedback_validate_probe_before_absence_claim` was written after a picture surface
was declared working on the strength of files existing. Its lesson generalises:
run a control against ANY instrument whose output you intend to quote, including
instruments that report a number rather than a verdict.

## Mistakes I made

1. **I wrote a test that could not fail, then counted it as proof.** An assertion
   that no network call happened, using a `fetch` spy. Sentry deliberately resolves
   a native `fetch` out of a fresh iframe to dodge monkeypatching, so the spy is
   never consulted. I only discovered this because I mutated the module to
   initialise unconditionally and the test stayed green. I had already reported
   "9/9 pass" before running that control.

2. **I measured a bundle delta with a control that did not remove the thing.** To
   price the SDK I rebuilt with the import removed from `main.jsx` and got a delta
   of roughly zero, and briefly concluded it was tree-shaken. `ErrorBoundary.tsx`
   still imported the SDK, so both builds contained it. The real cost was 31 KB
   gzipped on the entry chunk every visitor downloads.

3. **I compared build outputs against a directory that never gets cleaned.** The
   build does not empty `dist`, so chunks from earlier builds persisted and my
   "which chunk contains the SDK" probe reported 24 files. Every size comparison
   before I ran `rm -rf dist` was reading a mixture of builds.

4. **I grepped stdout for a failure that goes to stderr.** Running the eval harness
   to test whether a CI failure was pre-existing, I filtered for FAILURE, saw only
   passing lines, and concluded main was clean. Main was red. The harness prints
   its verdict on stderr. One redirect changed the conclusion completely.

5. **I asserted a fallback UI behaviour I had guessed rather than read.** Claimed
   the boundary would not render the error text; it does. Caught by the test, but
   the assertion was written from assumption, not from the component.

## Error → fix → repeat ledger

| error class | times this session | written up before recurring | what actually stopped it |
|---|---|---|---|
| trusted an instrument without a control | 4 | no | mutate the thing being measured, confirm the measurement moves |
| read a filtered stream and called it complete | 1 | yes, as the Git Bash pathconv lesson | redirect both streams, or check the exit code, never the grep's |
| stale artifacts treated as current output | 1 | no | `rm -rf` the output dir before any comparison build |

The first row is the one that matters. Four occurrences, zero of them previously
documented in this form, all inside one slice. The correction that works is
procedural and takes about thirty seconds: **break the thing on purpose and watch
the number move.** If it does not move, the instrument is not connected to the
thing. "Be more careful reading output" would not have caught any of the four.

## External-model calibration

None consulted this slice. Recorded so the absence is not read as an oversight:
the work was mechanical verification, where a second opinion adds cost without
adding signal. Paid seats earn their money on judgement calls, not on whether a
control fires.

## The transferable rule

Before quoting any measurement as evidence, ask what would have to be true for
this number to be wrong, then make it wrong on purpose. A test that stays green
when you break the code is not a weak test, it is not a test. A size delta of zero
is not evidence of tree-shaking until you have seen the same probe report a
non-zero delta for something you know is present. This costs one extra command per
claim and it caught four defects that all four looked like finished work.
