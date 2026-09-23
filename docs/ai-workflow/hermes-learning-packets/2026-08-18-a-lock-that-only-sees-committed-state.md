---
title: "A lock that only sees committed state passes exactly when it matters"
packet: a-lock-that-only-sees-committed-state
date: 2026-08-18
originating_model: claude-fable-5
tier: fable-tier
tier_basis: "claude-fable-5 is the running session model (Fable 5, Final Decider); provenance is first-hand, not relayed"
surface: SwanStudios privacy / media egress; test-design discipline
decision: "When a fix must hold across a category, ship an executable detector for the category — and check what the detector cannot see before trusting it."
privacy: "No secrets, no key values, no client data. Env var NAMES only; route and service paths only."
status: draft
models_used:
  - model: claude-fable-5
    role: builder, hostile reviewer, Final Decider
    did: "Built the subject-scoped consent gate across three egress routes; found the third route by enumerating the category after scoping to two; found the OpenAI second sub-processor; found and fixed the git-grep blind spot in my own test; proved every lock by mutation"
    cost: subscription (flat rate)
skills_touched:
  - id: rule-73 (proof-before-done)
    change: sharpened
    failure: "I twice accepted an instrument that could not see the failure it was supposed to catch — `node --check` for import resolution, `git grep` for file existence. Both returned green on questions they cannot answer."
  - id: rule-8 (binary egress clause)
    change: enforced with an executable lock
    failure: "The clause was written as prose after the last incident. Prose did not stop me repeating the error in the same session; a test does."
  - id: category-over-instance
    change: promoted from lesson to shipped detector
    failure: "Recorded as a lesson in this same session's earlier packet, then repeated. A lesson that recurs after being written up proves the write-up was not the fix."
---

# A lock that only sees committed state passes exactly when it matters

I wrote a regression test to enumerate every caller of an audio-egress function and fail when an
unlisted one appeared. It used `git grep`.

**`git grep` only sees tracked files.** A brand-new route is untracked at exactly the moment its
author first runs the suite. The lock would have gone green on the only run that mattered, then
started passing forever afterward because by then the file was committed and listed.

The fix was a filesystem walk. The proof was planting an untracked rogue caller: the `git grep`
version missed it, the walk caught it.

## The question that found it

Not "does this test pass?" — it did. The question was **"when would this test be wrong?"**

That question has a cheap general form worth running on any new guard: *what state can this
instrument not observe, and is that state precisely the one I care about?* Two instruments failed
it in one slice:

| Instrument | Returns green on | Cannot see |
|---|---|---|
| `node --check <file>` | Any syntactically valid module | Whether its imports **resolve** — the Render boot-crash class |
| `git grep <pattern>` | Committed state | The **untracked new file** the lock exists to catch |

Both look like verification. Neither answers the question being asked of it.

## The category error, recorded twice in one session

Earlier this session I wrote up: *governance follows the shape of the audit, not the shape of the
risk* — six binary egress points had accumulated because Rule 8's enforcement was text-shaped.

Then I scoped this slice to the two ungated routes I had already found. Enumerating **every**
caller of `transcribeAudio` surfaced a third — the actual PLAUD merge lane. I would have shipped
two of three.

**A lesson that recurs after being written up proves the write-up was not the fix.** What stopped
it was a grep I ran only because I had made the error before — a habit, not a document. So the
durable output of this slice is not the third route's fix. It is the executable lock that fails
when a fourth appears.

## The consent asymmetry worth reusing

Gating on a data subject who is not the requester needs one distinction, and getting it backwards
fails in opposite directions:

- **Absence of a record → proceed.** Consent rows are created only by the consent flow, and no
  backfill exists. Failing closed on absence blocks every pre-existing user rather than protecting
  anyone — a safety change that reads as an outage.
- **A recorded decision → block.** An explicit opt-out or a withdrawal is the case that carries
  legal weight. Never fail open on these.
- **An error → block.** An unknown answer is not a yes.

"Fail open" and "fail closed" are not properties of a gate; they are properties of *each branch*.
A gate described by one of those words alone has not been specified.

## Who did what

- **claude-fable-5 (me)** — built all three gates, found the third route only after scoping wrong,
  found the OpenAI second sub-processor while checking whether a text path was even AI, wrote a
  category lock with a blind spot, found the blind spot, and proved every lock by mutation.
- **No external model was consulted for this slice.** The prior packet's paid Kimi review had
  already established the legal frame; spending again on execution would have bought nothing.

## Skills created or changed

- **Category-over-instance promoted from lesson to shipped detector.** Prose failed to stop the
  repeat; a test that fails on an unlisted caller does not depend on anyone remembering.
- **Rule 73 sharpened with an instrument-blindness check.** Before an instrument's green counts as
  proof, name what it cannot observe.
- **`requireSubjectAiConsent`** — reusable middleware for any route where the requester is not the
  data subject, with per-branch fail direction.

## Mistakes I made

1. **Scoped to instances after writing up the category lesson this same session.** One grep away.
2. **Shipped a detector with a blind spot in the exact dimension it existed to cover.** Caught only
   by asking when it would be wrong.
3. **Treated `node --check` as proof a nested-path import resolves.** It parses; it does not
   resolve. That is the Rule 42 boot-crash class.
4. **Ran a mutation test whose mutation never applied** and nearly read the green result as
   evidence. A mutation test needs proof the mutation landed before its result means anything.

## Error → fix → repeat ledger

| Error class | Occurrences | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| Fixing instances when the bug is a category | **2 this session** | **Yes — by me, hours earlier** | A habit, then an executable lock. The document did not |
| Accepting an instrument blind to the failure it checks | 2 (`node --check`, `git grep`) | Adjacent (proof discipline) | Asking what the instrument cannot see |
| Mutation test whose mutation silently didn't apply | 1 | No | Counting the marker in the mutated file first |

## External-model calibration

None consulted this slice. Recorded deliberately: the prior packet established the legal frame with
a ~$0.20 Kimi review, and re-spending on execution would have bought nothing. **Paid review earns
its cost on framing and reasoning, not on verifying work I can verify myself.**

## How to apply next time

1. Before trusting a new guard, name the state it cannot observe — then check whether that is the
   state you care about.
2. When a fix must hold at N sites, ship the detector for N+1, not the N fixes.
3. Specify fail direction **per branch** (absent / recorded-no / error), never as one word.
4. A mutation test proves nothing until you confirm the mutation landed.
