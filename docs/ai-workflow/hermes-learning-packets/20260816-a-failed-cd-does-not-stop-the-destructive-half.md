---
title: A failed `cd` does not stop the destructive half of the line
originating_model: claude-opus-5
tier_basis: Opus 5 designated Fable-tier by Sean 2026-08-10 (Rule 68 allowlist)
date: 2026-08-16
decision: Destructive git commands must carry their own scope (`git -C <dir>`) or assert the directory before running; never inherit scope from a preceding `cd`, and never chain the two on one line.
status: draft
models_used:
  - model: claude-opus-5
    role: builder + orchestrator of a 4-round dry-loop review
    did: caused and recovered the incident; ran the review loop; wrote all fixes
    cost: subscription (flat-rate)
  - model: glm-5.3
    role: hostile reviewer (rounds 1-4)
    did: 14 findings across rounds; returned the confirming CLEAN; caught an overstated rationale comment
    cost: $0 marginal (Z.ai coding plan)
  - model: moonshotai/kimi-k3
    role: hostile reviewer (rounds 1-3)
    did: produced the round's best finding (pre-existing vs delta); caught the false-positive-prone threshold
    cost: ~$0.47 total across three rounds
skills_touched:
  - id: agent-lane
    change: proposed
    motivated_by: the incident happened in a shared tree with a live agent; the lane digest warned me and I acted anyway
  - id: rule-70 (batch push)
    change: none
    motivated_by: the merge that prompted this is still unshipped, deliberately
privacy: IDs and roles only; no client data; paths relative; secret-scanned before commit
---

# A failed `cd` does not stop the destructive half of the line

## The one-line lesson

**`cd` is not a guard.** It is a command that can fail, and `;` runs whatever follows regardless.
A destructive git command must carry its own scope or assert its directory — never inherit scope
from a step that might not have happened.

## What happened

Preparing to merge two reviewed branches, I wanted a scratch worktree, and wrote one shell line:

```
git worktree add <scratch> main ; cd <scratch> ; git reset -q --hard origin/main
```

`git worktree add` **failed** — `main` was already checked out in another worktree, which git
refuses to duplicate. So the scratch directory never existed, `cd` failed, **and the reset ran
anyway**, in whatever directory the shell was already in: the shared main working tree, on a branch
173 commits ahead of origin, with another agent actively editing it.

It moved the branch to `origin/main` and hard-reset the working tree.

## Why this is worth keeping

The blast radius was set by **the directory I happened to be standing in**, not by anything in my
command. I had spent the entire session working in isolated worktrees precisely so that mistakes
stayed local — then issued the one command whose scope came from ambient state rather than from its
own arguments. **Isolation you can accidentally step out of is not isolation.**

The correct forms, any of which would have made this impossible:

- `git -C <dir> reset --hard …` — scope is an argument; it cannot be inherited from a failed step.
- `[ -d "$D" ] || exit 1` before anything destructive.
- `&&` instead of `;` — chaining on success is the bare minimum, and I did not even do that.

## Who did what

- **Opus 5 (me)** — wrote the failing line, detected it within about a minute by reading output that
  did not match expectation ("ship tree on main" printed while `cd` had failed), recovered the
  branch, verified the damage boundary, and posted an incident notice to the coordination channel
  naming the files another agent should check.
- **GLM-5.3** — unrelated to the incident, but the same turn: returned the confirming CLEAN round of
  a 4-round dry loop, and flagged that a code comment I had written overstated its own evidence.
- **Kimi K3** — rounds 1-3; its "pre-existing explains the baseline, not the delta" finding reversed
  a wrong conclusion of mine earlier in the session.

## Skills created or changed

None created. The candidate is a guard, not a skill: **a pre-execution check that refuses any
`reset --hard` / `clean -fd` / `checkout --` line that also contains `cd`.** That is mechanical and
would have caught this exact line. Proposed, not built — building it inside the incident turn would
be the same haste that caused the incident.

## Mistakes I made

- **Chained `cd` with `git reset --hard` using `;`.** A well-known trap, walked into while moving
  fast at the end of a long session.
- **Assumed `git worktree add` would succeed** because it had succeeded four times earlier that
  session. It failed for a predictable reason — the branch was already checked out elsewhere in a
  repo carrying many worktrees.
- **Ran a destructive command in a tree I knew was shared and dirty.** The session-start lane digest
  told me other agents were live. I read it and proceeded anyway.
- **Did not verify location before acting.** One `pwd`, or reading the failed `cd` before the next
  command, would have caught it.
- **Repeat within the same session:** hours earlier I wrote a memo about probes whose printed labels
  outrun their evidence. This is that class — acting on assumed state — with a far worse
  consequence. Writing the lesson down did not change the behaviour; only a mechanical guard will.

## Error → fix → repeat ledger

| error class | times this session | written up before recurring? | what finally stopped it |
|---|---|---|---|
| Acting on assumed state rather than verified state | 4 (three benign probe-label cases, one destructive) | **Yes** — memo written hours before the destructive instance | Nothing yet. The three benign ones were caught by re-checking; the destructive one was caught only after it fired. A guard is required. |
| Conclusion printed beside unverified output | 3 | yes, twice | Stopped writing pre-baked `echo "^ empty = ..."` labels |
| Partial sweep — fixing N-1 of N call sites | 4 | yes | Grepping for the old string instead of trusting memory of which files were touched |

**The repeat count is the signal here.** The lesson "verify state before acting" was written down
*in this session* and then violated destructively *in this session*. A lesson that has been written
and re-violated is evidence the write-up is not the fix. The correction that survives is procedural
(`git -C`, or a guard that blocks the shape), never resolutional ("be more careful").

## External-model calibration

- **GLM-5.3** — $0 marginal, 4 rounds. Returned a genuine "no new findings" confirming round with a
  5-point checklist rather than manufacturing a finding to look thorough. Two prior rounds it
  labelled uncertain claims HYPOTHESIS and attached the one command to settle them; both times the
  hypothesis was wrong and the command cost nothing. **Trust its observations; verify its
  mechanism claims** — it has asserted a non-existent linter before.
- **Kimi K3** — ~$0.47 across three rounds, best findings-per-dollar. Its highest-value contribution
  was a *reasoning* correction, not a code defect: I had argued three red tests were "pre-existing,
  therefore fine", and it showed that pre-existing explains a baseline but never excuses a negative
  delta. Also correctly declined to inflate — one round was three findings, two of them LOW, with an
  explicit "not a reason to hold the merge".
- Pattern across both, and across Fable and HY3 earlier in the same workstream: **observations and
  judgement are strong; claims about how a mechanism behaves need executing, not reading.**

## Damage boundary, verified rather than assumed

**Recovered:** branch pointer and tracked files restored via reset to the prior commit. Verified
after: correct branch and HEAD; all five of the other agent's session commits present; still 173
ahead of origin; 216 untracked files intact (a hard reset does not touch untracked); coordination
ledger and Hermes inbox intact, both gitignored.

**Not recoverable:** unstaged edits to tracked files at that instant. Unstaged content never enters
the object store, so reflog and `fsck` cannot reach it. Three files showed modified again
immediately afterwards, indicating a live agent — the incident notice names them and asks for any
loss to be reported rather than silently redone.

**Not merged.** The confirming review had just returned clean and both branches were ready to ship
to production. Shipping minutes after causing an incident in the shared tree is the owner's call,
not the agent's to assume.
