---
surface: qa-harness
slug: launch-brief-and-orphaned-shas
agent: vs-claude (Opus 5)
date: 2026-08-14
---

# Launch-readiness brief written for an external agent — and the SHAs in it were all orphaned

## What happened

Sean asked for a prompt he can hand to another agent to run a four-role (admin / trainer / client /
user) production Playwright audit for **launch clearance**. Wrote a self-contained mission brief:
environment and branch, step-by-step runs, the traps that have already cost hours, a
SITE/HARNESS/ENVIRONMENT classification discipline, a severity rubric, and an explicit section on
what a read-only crawl **cannot** clear.

Then dry-looped the brief itself, because another agent will execute it blind.

## The defect the dry-loop found in my own deliverable

The brief told the agent to confirm they had the current harness with
`git log --oneline -6` against five commit hashes. **Five of the six were not ancestors of HEAD.**
This branch had been rebased: my commits were rewritten (`3dc7be425` → `0df0280b8`,
`69f1d1352` → `89ce2f1cf`) and two commits I did not author were interleaved into the history.

Net effect had it shipped: the verification step fails on a perfectly correct tree, the agent
concludes it is on the wrong branch, falls back to `main`, and runs a launch audit with the OLD
harness — blind to 39 routes while reporting 100% coverage. The precise failure that section of the
brief exists to prevent.

Replaced the SHA check with a rebase-proof one: six files must exist and the routes table must
contain `/user-dashboard/groups`.

## Lessons worth carrying

**A commit SHA is not a stable identifier for "which code you have."** Any rebase, amend, or
cherry-pick invalidates it while the tree stays correct. Identify a code state by its CONTENT —
files present, a marker string — not by a hash someone else can rewrite.

**Verifying a document is verifying software.** A brief that another agent executes blind is
executable. Its commands, flags, env vars, and expected counts are assertions and they can be
wrong, so they get the same dry-loop as code.

**Every SHA I reported to Sean this session for the earlier commits is stale.** The work is intact —
files verified present — but the hashes in my earlier closeouts no longer resolve on the branch.

## Mistakes I made

- **Shipped a verification step that would have caused the exact failure it was written to
  prevent.** Caught only because I dry-looped a document rather than assuming docs need no proof.
- **Used the wrong instrument first, again.** `git cat-file -e` returned success for all six SHAs
  because the objects still exist as dangling refs — I nearly concluded the brief was fine.
  `git merge-base --is-ancestor` is the question I actually meant to ask. Third time this session I
  have reached for a check that cannot answer the question I have.
- **Cited SHAs in four consecutive closeouts without ever checking they were still reachable.**
- **Did not notice the branch had been rebased under me** until it broke something, despite the
  coordination ledger being one command away.

## External-model calibration

None this turn — no external model consulted. The prior turn's Kimi/HY3 calibration stands.

## State for Hermes

- Brief: `docs/ai-workflow/AI-HANDOFF/LAUNCH-READINESS-PLAYWRIGHT-BRIEF-2026-08-14.md`.
  Commits `4957c67b1` (brief) and `9213a9707` (the SHA fix) — **as of this writing**; treat all
  hashes on this branch as provisional until it stops being rebased.
- **Needs Sean:** the branch is unpushed, so the harness exists only in the local worktree
  `C:/tmp/ss-qa-harness-slice0`. If the external agent is on another machine, or the folder is
  cleaned, they silently get the old blind harness. Pushing the branch removes that risk.
- **Needs Sean:** another agent is committing into this repo and rebased this branch. Rule 45 says
  history rewrites need his say-so.
- **Highest-risk gap for the launch decision:** cross-role authorization is completely untested.
  The crawl walks each role through its OWN routes and never attempts to cross the boundary. A
  client reaching an admin route would not be detected by anything built this session. Flagged at
  the top of the brief's NOT-VERIFIED list; proposed as the next slice.
