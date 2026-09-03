---
title: "One value, two meanings, and the permissive one wins"
originating_model: "claude-opus-5"
tier_basis: "Sean designated claude-opus-5 Fable-tier 2026-08-10. This session ran the panel, verified every finding against the source, and shipped both fixes with tests and mutations."
privacy: "IDs and roles only. No client names, no PII, no credentials. Secret-scanned clean before commit."
date: 2026-08-26
surface: "Swan Coach authorization — the client resolver's scope decision"
decision: "When one value encodes both 'no restriction was requested' and 'a restriction was requested and could not be computed', the code will act on the permissive reading. Separate the two before writing the branch, and diff any two helpers that answer the same question — where they disagree on bad input, one of them is a bug."
status: shipped
supersedes: none
models_used:
  - model: "claude-opus-5"
    role: "author, panel operator, triage"
    did: "ran the enhancement remit, verified each finding against the source, shipped both fixes with tests and compound mutations, and disproved one convergent claim"
    cost: "subscription"
  - model: "z-ai/glm-5.3"
    role: "enhancement and gap hunt"
    did: "found the fail-open scope decision and the unaudited denial — two real defects in code four prior hostile rounds had already read"
    cost: "subscription"
  - model: "z-ai/glm-5.3-flash"
    role: "second seat, same remit"
    did: "argued tenancy is derived from caller-supplied linkage rather than from the record — structurally right, with an example that was wrong on the first file opened"
    cost: "subscription"
skills_touched:
  - id: "Rule 30 (subagent output is a hypothesis)"
    change: "reinforced"
    why: "the highest-value finding of the round arrived attached to a concrete example that was false. Verifying the example first would have discarded the insight; verifying the CLAIM kept it."
  - id: "scripts/mutation-harness.mjs"
    change: "extended"
    why: "40 to 42, including the first COMPOUND mutation written because two guards are deliberately redundant and neither alone can fail a test"
  - id: "memory: feedback_ox_alpha_always_in_panel"
    change: "applied"
    why: "both seats were Z.AI. Their agreement on a third finding was counted as one prior, not two — and that finding turned out to be wrong."
---

# One value, two meanings, and the permissive one wins

## What happened

Four rounds of hostile review had already reached DRY on this workstream. A fifth pass with a
*broader* remit — enhancements, gaps, feature ideas, not just bugs — found a fail-open in a
file the four rounds had all read.

```js
const scopedTrainerId = Number.parseInt(trainerId, 10);
const hasTrainerScope = Number.isInteger(scopedTrainerId) && scopedTrainerId > 0;
```

`hasTrainerScope === false` omitted the scope clause entirely, producing the admin-wide query.

That boolean carried **two different meanings**:

- *no scope was requested* — correct for an admin, who is the superset role
- *a scope was requested and could not be computed* — a trainer whose own id was missing,
  zero, negative, or unparseable

One value, and the code acted on the permissive reading of it. A trainer with a broken id was
served every active client in the system rather than refused.

## Why nobody saw it for four rounds

Because it does not look like a missing check. The check is right there, the variable is
named for what it does, and the negative branch reads as an ordinary "no scope needed". Fail-
open hides inside a boolean that reads as a normal negative — which is exactly why reading
harder is not the counter-measure.

I had personally read that function four times in the session, including while writing a
mutation against a branch three lines away. **Reading for one defect class makes you blind to
another in the same lines.**

## What actually found it — and it generalises

The seat that found it did not spot the bug directly. It spotted an **asymmetry**:

> `assertAssignmentOrAdmin` fail-closes on `!requesterId`; the resolver fail-opens.

Two helpers in one codebase, answering the same question — *may this caller act on this
client?* — and giving **opposite answers to the same bad input**.

That comparison is a repeatable technique, and it is cheaper than reading either function
again:

> **Find two pieces of code that answer the same question. Diff their behaviour on invalid
> input. Where they disagree, one of them is wrong.**

It works because a codebase accretes multiple answers to the same question over time, and the
divergence is evidence — not of style drift, but that somebody's assumption was different.

## The fix, and why it landed in two places

The durable half separates the meanings at the source:

```js
const scopeRequested = trainerId !== undefined && trainerId !== null;
if (scopeRequested && !hasTrainerScope) return deny();
```

"No scope requested" and "scope requested and uncomputable" are now different states with
different outcomes. The lane *also* refuses a trainer whose id will not parse, independently —
because a lane should not depend on a shared helper's internals for its own safety, and
because the shared helper serves other callers whose needs may change.

Neither guard alone can fail a test, since either one catches the case. That redundancy is
deliberate, so the mutation proving it had to be **compound** — both removed at once. A single-
guard mutation would have SURVIVED and read as vacuity when it was actually defence in depth.
Mutation testing cannot distinguish redundant-by-design from useless without being told.

## The second defect: a denial nobody could see

The plan-archive handler answers a cross-tenant attempt with the same 404-shaped result it
gives for a plan that does not exist. That is deliberate and correct — an id-walker must not
learn which plans exist.

It recorded nothing.

So someone systematically probing plan ids left a trail **identical to someone who mistyped
one**, and the enumeration attack the 404-parity design specifically anticipates was invisible
in the only place detection could live.

**A 404-parity denial is half a design.** Opaque to the caller, legible to the operator. If
only the first half ships, the design has traded away detection for a property it already had.

## The finding that was right with a wrong example

The second seat's headline was that the lane authorizes the *trainer↔client relationship* but
never asks whether the **record being acted on** belongs to that client — tenancy taken from
the caller's pick rather than derived from the row.

Its example was a specific command acting on a foreign session id. That command compares
`session.trainerId === user.id`. The example was wrong on the first file I opened.

**The claim survived anyway.** My earlier sweep proving every id-class was guarded was manual,
encoded nowhere, and covered only the commands that existed the day I ran it. The seat's own
description of the one command that does it right — *"and only accidentally, because
`requiresClientRef: false` forced the fix to derive the owner from the fetched row"* — is fair.

Had I checked the example first and stopped, I would have discarded the best structural idea of
the round. **Verify the CLAIM, not the illustration.** A wrong example is evidence about the
reviewer's reach, not about the argument.

## Who did what

`glm-5.3` found both defects. Neither was found by four prior rounds of hostile review, by the
mutation harness, or by me — and I had read the fail-open function four times. It found them by
reading for **asymmetry between two helpers** rather than for bugs in one.

`glm-5.3-flash` produced the round's best structural argument attached to its worst example.
Both facts matter: the argument is now the next slice, and the example died on the first file
I opened.

`claude-opus-5` verified every claim against the source before acting on any of it, disproved
the one thing both seats agreed on, and shipped both fixes with tests and a compound mutation.

## Skills created or changed

No new skill. The mutation harness gained its first **compound** mutation — two deliberately
redundant guards, neither of which can fail a test alone. That is a shape worth naming: when
defence in depth is real, a single-guard mutation SURVIVES and reads as vacuity. The harness
cannot tell redundant-by-design from useless unless the author says so, and the compound form
is how you say so.

Rule 30 was reinforced from an unusual direction — normally it means "do not trust a
subagent's finding". Here it meant "do not discard a finding because its illustration is
wrong". Both are the same instruction: verify the claim yourself, and let the verification,
not the packaging, decide.

## Mistakes I made

- Missed a fail-open in a file I had read four times, while writing a mutation three lines from it.
- Called a manual sweep proof. It was correct and unencoded, which means it protected exactly
  the commands that existed when I ran it — and a reviewer was right to call the one good case
  accidental.
- Three mutation anchors invalidated by my own edit, because reshaping a branch moved the lines
  they pointed at. Caught only because the harness reports ANCHOR separately from SURVIVED.
- Counted two seats as independent before learning they were one lab. Corrected, and the one
  finding they converged on turned out to be wrong — which is what convergence-without-
  independence buys you.

## Error → fix → repeat ledger

| error class | times this session | written up before? | what stopped it |
|---|---|---|---|
| unencoded sweep called proof | 1 | adjacent — "a lesson that runs beats one written down" | a reviewer naming the good case accidental. The fix is an enforced registry invariant, not another sweep |
| anchors invalidated by my own edit | 3 | **yes, earlier today** | the harness's three-state reporting. It has now paid for itself twice in one session |
| blind to defect class B while hunting class A | 1 | no | a second reader with a different remit — not more of my own attention |
| convergence counted without independence | 1 | **yes, earlier today** | learning the seat's identity mid-session |

The new entry is the third row, and it argues for something the corpus keeps circling: the
errors a tool can catch, I now catch with tools. The ones left are the ones that need a reader
who is looking for something else — which is an argument for varying the REMIT across review
rounds, not just the reviewer. Four rounds of "find bugs" reached dry; one round of "find gaps
and enhancements" found a fail-open in the same lines.

## External-model calibration

| seat | findings | real | verdict |
|---|---|---|---|
| glm-5.3 | 9 | 2 fixed (1 HIGH fail-open, 1 MED audit gap), 1 disproven | Best signal-per-finding of the session. Reads for asymmetry rather than for bugs, which is why it found what four bug-hunts did not. |
| glm-5.3-flash | 4 | 0 directly actionable; 1 structurally right with a false example, now the next slice | Worth calling for structure. Verify every concrete claim — its example failed on the first file opened. |

Same lab. Their one convergent finding was wrong. Cost $0.00.

## What is still not proven

- Whether a second live cross-tenant hole exists among the 138 handlers nobody has read. That
  is precisely what the next slice's enumeration is designed to answer.
- Dispatcher self-gating; the TOCTOU window on plan archive; the ~56 under-specified test stubs.
- Nothing is deployed. Sixteen unpushed commits, and no CI has ever run any of it.
