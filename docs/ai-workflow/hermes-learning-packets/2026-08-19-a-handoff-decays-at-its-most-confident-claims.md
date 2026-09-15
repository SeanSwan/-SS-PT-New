---
title: "A handoff decays fastest at its most confident claims"
date: 2026-08-19
originating_model: claude-opus-5
tier: fable-tier
surface: ai-privacy-cost-workstream
decision: "Blocking claims in a handoff must ship with a re-verify command, not just evidence. Confidence marks a claim as actionable, and actionable claims are the ones that go stale."
status: shipped
supersedes: none
linear: SWA-107, SWA-179, SWA-180
models_used:
  - model: claude-opus-5
    role: executor of an inherited handoff, plus self-hostile reviewer (5 rounds)
    did: "Re-measured every blocking claim; mutation-tested PR #45; scoped the credential exposure; found 4 faults in the handoff and then 2 more in its own corrections."
    cost: subscription
  - model: glm-5.3
    role: prior-session reviewer of the handoff document
    did: "Attacked the instruments. Found 6 faults. Missed all 4 staleness faults."
    cost: subscription
  - model: moonshotai/kimi-k3
    role: prior-session reviewer of the handoff document
    did: "Attacked authority and control. Found 4 faults including ranking-is-not-a-control. Missed all 4 staleness faults."
    cost: $0.18
skills_touched:
  - id: rule-67 Live Pair-Coding Coordination Ledger
    change: used-as-designed
    motivating_failure: "Two lanes held stale in-progress locks (13h and 1h). R5 flag-do-not-seize worked; the file needed for handoff step D was locked and I routed around it instead of taking it."
  - id: STALE-CHECK memory
    change: earned-its-keep
    motivating_failure: "I was about to relay a Sean action (run npm ci) that was already done. Only the standing memory stopped me."
  - id: landmines list in the handoff doc
    change: proposed-addition
    motivating_failure: "An unescaped backtick inside a double-quoted python -c silently deleted every backticked filename from a doc edit, and the edit reported success."
---

# A handoff decays fastest at its most confident claims

## The lesson

The handoff I inherited was good. It was written by a careful agent, hostile-reviewed twice by two
different models attacking from different angles, and it carried an explicit doctrine section on
verifying your instruments. **It was still wrong in four places at pickup**, and every one of those
four was in its *most emphatic* content: the section with the siren emoji, the bold BLOCKER
heading, the table, the repeated warnings.

That is not a coincidence, and it is the transferable part:

> **Confidence marks a claim as actionable. Actionable claims are the ones somebody acts on.
> Therefore the most confident claims in a document are the ones most likely to be false by the
> time the next reader arrives.**

The document said `backend/node_modules` was empty and that all backend verification was blocked
pending a Sean-owed install. Somebody read that, agreed, and ran the install. **The claim's own
persuasiveness is what killed it.** The quiet, hedged claims in the same document ("mostly
`No test suite found`", "I did not verify X") were all still true — because nobody acted on them.

## The fix that generalizes

**Put a re-verify command next to every blocking claim, not just evidence behind it.**

`backend/node_modules is empty` is a fact with a shelf life.
`ls backend/node_modules | wc -l` is a fact that stays true forever.

The document had the first everywhere and the second nowhere. It had a whole section on not
trusting instruments, and gave the reader no instrument to run.

## Who did what

- **Opus 5 (me):** executed the handoff instead of reading it. Found 4 stale or false claims. Then
  found **2 more in my own corrections** on hostile rounds 2 and 3 — my fixes were themselves
  over-claimed.
- **GLM-5.3:** attacked the instruments, found 6 real faults, **missed all 4 staleness faults**.
- **Kimi K3 ($0.18):** attacked authority and control, found 4 more real faults including the best
  one in the whole chain ("a ranking is not a control"), and **also missed all 4**.

**The routing lesson is sharper than "use two reviewers."** Both reviewers were good and neither
could have caught these, because **both reviewed the document and neither ran it.** Reviewing prose
finds reasoning faults. Only execution finds staleness. These are different defect classes, and no
number of additional review rounds converts one into the other.

**So: after a review panel, one executor pass — not a third reviewer.**

## Skills created or changed

Nothing new was built. Three existing mechanisms were exercised; two proved load-bearing.

- **Rule 67 lane ledger** — worked as designed. Two stale `in-progress` locks (13h and 1h). R5's
  "flag, do not seize" is correct: the 13h lock sat on the exact file I needed, its branch was
  clean and already pushed, the lock was obviously abandoned — and I still should not take it,
  because only Sean knows whether a session died.
- **The STALE-CHECK memory** — the highest-value item in my context this session. It is phrased as
  a command ("re-verify a blocker before repeating it"), which is why it fired.
- **Landmines list** — needs one addition: unescaped backticks inside `python -c "..."`.

## Mistakes I made

- **I shipped an over-generalized correction and had to catch it myself.** I wrote "the blocker is
  cleared" without saying the install is **per-worktree**. A next agent cutting a fresh worktree
  gets the identical `ERR_MODULE_NOT_FOUND` and could reasonably conclude the blocker returned —
  reproducing the exact hour-long confusion the review queue already describes. **I committed the
  same class of error I had just finished criticizing, in the same document, within the hour.**
- **I cleared a merge hold on evidence narrower than the gate's own wording.** The gate said "until
  its frontend suite runs"; I ran one test file and wrote CLEARED. `useVoiceRecorder` has three
  consumers and the change is 127 lines in a shared hook. The correct evidence was 162 files and
  890 tests — which I only ran after attacking my own claim.
- **An unescaped backtick inside `python -c "..."` silently deleted content and reported success.**
  Every backticked filename in the inserted paragraph became empty. Python printed its success
  message, the secret scan passed, and the commit would have gone through clean. Only reading the
  rendered text back caught it. **A write that reports success is not a write that wrote what you
  meant.**
- **I ran an unscoped credential grep across a tree with 130+ worktrees and timed out at 2 minutes.**
  The scoped `git grep` over tracked refs answered the same question in seconds.
- **I assumed Git Bash `/tmp` and Windows Python share a filesystem view.** They do not.

## Error to fix to repeat ledger

| Error class | Times this session | Written up before it recurred? | What finally stopped it |
|---|---|---|---|
| Over-claiming scope on a fix | **2** (blocker-cleared, hold-cleared) | **Yes** — it is the exact fault I documented one commit earlier | Only self-hostile rounds 2 and 3 from **new vantages** (a different worktree; the gate's literal wording). Re-reading my own text would never have found either |
| Trusting a documented state instead of re-measuring | 1, caught pre-send | Yes — the STALE-CHECK memory | The memory fired. **Procedural phrasing is why**: "re-verify before repeating" is a command; "be careful about stale docs" would not have fired |
| A tool reporting success while doing the wrong thing | 1 (backtick substitution) | Yes as a class — the doc's own doctrine 3 and its CRLF landmine are the same shape | Reading the output back. Nothing in the toolchain flagged it |
| Cross-toolchain path assumption | 1 | No — new | Nothing yet; belongs in the landmines list |

**The first row is the one that matters.** I documented a failure mode, committed the
documentation, then committed two instances of that same failure mode within the hour. That is the
strongest available evidence that **writing a lesson down does not install it.**

What installed it was a hostile round forced to attack from a vantage I had not yet occupied — a
different worktree, and the gate's literal wording rather than my summary of it.

**The rule that follows:** a self-review round that re-reads your own reasoning finds nothing,
because it re-runs the reasoning that produced the error. **A round only works if it enters from
somewhere the original work never stood.**

## External-model calibration

| Model | Cost | Findings real on verification | Blind spot |
|---|---|---|---|
| GLM-5.3 | subscription | 6 of 6 real, all applied | Staleness — reviews text, not state |
| Kimi K3 | $0.18 | 4 of 4 real, including the best finding in the chain | Same blind spot, independently |
| Opus 5 executing | subscription | 4 staleness faults, plus 2 self-inflicted | Over-claims scope; needs a forced vantage change to see it |

**Both reviewers were worth their cost, and neither was a substitute for running the thing.**
Budget accordingly: reviewers for reasoning, an executor for truth.
