---
title: Ask where the push LANDS, not whether the work is good
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: self, pre-push blast-radius checks (dry-run, refspec, post-push verification)
date: 2026-08-14
decision: Before any push, resolve `@{u}` and dry-run the refspec — a feature branch can be tracking main, which turns the reflex command into a production deploy
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + operator
    did: ran the pre-push blast-radius checks, caught the upstream trap, pushed with an explicit refspec
    cost: subscription
skills_touched:
  - name: agent-lane (rule 67 coordination ledger)
    change: exercised — and found a use it was not built for
    why: its value at push time was not collision-avoidance but discovering a SECOND agent independently fixing the same defect
  - name: blast-radius-guard
    change: extended in practice
    why: the guard's taxonomy covers destructive DB and external actions; "a push that silently targets main" belongs in the same class and was not listed
privacy: IDs/roles only; no PII, no secrets, no absolute paths
---

## The lesson

I finished 35 commits on a feature branch and went to push. The branch's upstream was
**`origin/main`**.

`git push`, with no arguments, would have put all 35 commits directly onto main — the branch that
triggers the production deploy. Not a merge, not a PR, no review step. One reflex command, six
characters, and the work ships.

The branch was created from `origin/main` in a worktree, and the tracking reference came along with
it. Nothing about the branch's name, its contents, or its 35 commits of unrelated work hints at
this. The only way to know is to ask:

    git rev-parse --abbrev-ref --symbolic-full-name @{u}

**The dangerous command is the one that takes no arguments,** because it silently resolves a
destination you never stated. Every safe push I have ever done was safe because the default happened
to be right, not because I checked. That is luck, and luck does not survive repetition.

**The procedure that replaces it** — three commands, all cheap, all before the push:

1. `git rev-parse --abbrev-ref --symbolic-full-name @{u}` — where does the default point?
2. `git push --dry-run origin <src>:<dst>` — read the output; `* [new branch]` means a new remote
   branch, anything else means you are moving something that already exists.
3. Push with the **explicit `src:dst` refspec**, and `-u` to re-point the upstream so the trap does
   not survive to the next session.

Then verify AFTER: remote SHA equals local, and `git merge-base --is-ancestor HEAD origin/main`
returns false. A push that "looked fine" is not evidence; the ancestor check is.

## The second lesson: divergence is not conflict

Main had moved **39 commits** since the fork. The instinct is to rebase before pushing — real work,
real risk of mangling 35 commits.

Comparing the two file lists instead:

    git diff --name-only origin/main...HEAD | sort > mine
    git diff --name-only HEAD...origin/main | sort > theirs
    comm -12 mine theirs

**Zero overlap.** No rebase was needed at all. "Behind by N" says nothing about whether the work
touches the same code — check the intersection before paying for reconciliation.

## The third lesson: read the coordination ledger at PUSH time

The lane ledger exists to stop agents editing the same files. Reading it before pushing found
something it was not designed to catch: **another agent, 24 minutes earlier, working on the same
defect I had spent the session fixing.** Its task line named the bug directly — a paid model call
being consumed and reported as fine.

We had come at it from opposite ends. I fixed the RECORD side: an empty response is now
`outcome: error` with a dedicated code and a non-zero exit. They are fixing the REQUEST side:
stopping the reasoning budget from eating the whole call. Complementary, no shared files — but had
neither of us looked, two fixes for one defect would have met on main as a surprise, and whichever
landed second would have looked redundant or wrong.

**A coordination ledger is not only a lock table. It is the only place you can see that someone else
already found your bug.**

## Who did what

- **Opus 5** ran the pre-push checks, caught the upstream trap before pushing, verified CI triggers
  per-workflow, compared file sets, read the lane ledger, and pushed with an explicit refspec.
- **No external model was consulted** for this turn — it is operational discipline, not a judgement
  call, and paying for review of a `git push` would be exactly the misrouting this corpus warns
  about.
- **Agent `s9ae724a6`** (concurrent, unprompted) independently identified the same paid-call defect
  from the request side. Discovered via the ledger, not via any handoff.

## Skills created or changed

- **blast-radius-guard, extended.** Its taxonomy covers destructive DB operations and irreversible
  external actions. "A push whose default destination is main" belongs in the same class — it is
  outward-facing, hard to reverse once deployed, and triggered by the most reflexive command in the
  toolchain. It was not on the list.
- **agent-lane, new use.** Read it at push time, not only before editing. The failure it prevented
  here was duplicated effort meeting on main.

## Mistakes I made

- **None in this turn's execution** — the dry-run, refspec, and post-push verification all behaved
  as intended, and I am recording that plainly rather than inventing a confession.
- **The honest near-miss:** I have run bare `git push` reflexively in many prior sessions. Nothing
  about my habits made this safe; checking `@{u}` this particular time did. Converting that from
  luck into procedure is the entire content of this packet.
- Earlier in the same session, already recorded in their own packets: five shell-escaping
  corruptions, a wrong diff scope sent to a reviewer, and a fail-open inside a fail-open fix.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What finally stopped it |
|---|---|---|---|
| Unverified push destination | 0 (near-miss, caught) | No — this packet is the first | Resolving `@{u}` + `--dry-run` + explicit refspec, as a fixed pre-push sequence |
| Assuming divergence requires a rebase | 0 (avoided) | No | `comm -12` on the two file lists before deciding |
| Duplicate work across agents | 1 (discovered) | No | Reading the lane ledger at push time, not only at edit time |

**Note the shape of this table versus the others in this corpus.** The recurring classes elsewhere
(shell escaping, fail-open, instrument lies) all have "yes" in the written-up column and kept
happening anyway. These three have zero occurrences because a *procedure* ran before the risky
action — not because anyone remembered a lesson. That contrast is the strongest evidence yet for the
conclusion three packets have now reached independently: **write procedures, not reminders.**

## External-model calibration

- None consulted this turn, deliberately. Operational safety checks are deterministic and cheap;
  routing them to a paid reviewer would add cost and latency without adding information.
