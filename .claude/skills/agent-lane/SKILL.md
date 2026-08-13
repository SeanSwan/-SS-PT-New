---
name: agent-lane
description: The cross-agent coordination protocol — how parallel AI agents (Claude sessions, Codex, Fable, cloud agents) working the same SwanStudios repo publish what they are doing so they do not step on each other, delete each other's work, sweep each other's files into a commit, or push a dirty/irreversible batch to production. Fires at session start via the lane-session-start hook; also use when Sean says "who else is working", "claim these files", "what's in flight", "is anyone editing X", "/agent-lane", or before any push to a deploy-linked branch. Carries the ledger commands, the delivery-state vocabulary (committed is not delivered), and the push blast-radius checklist.
---

# Agent Lane — the coordination protocol for parallel agents

> Rule 67 v2. Rebuilt 2026-08-11 after a hostile review by **Kimi K3** and **Tencent HY3**
> demolished v1 *and* my first proposed fix. Read §6 before you "improve" this — several
> obvious upgrades are actively harmful and were rejected with reasons.

## 1. What this is for

Many agents work this repo at once, across ~184 git worktrees. They collide in four ways,
in increasing order of cost:

1. **Two agents edit the same file** → one silently overwrites the other.
2. **One commit sweeps another's WIP** → happened: 63 files.
3. **One agent builds on a phantom** → Agent A deletes a service (unpushed); Agent B keeps
   writing code that depends on it, or reviews it approvingly. The cost is the rewrite.
4. **One agent pushes an irreversible batch** → on this repo `render.yaml` builds with
   `npm run migrate:production`, so **a push to a deploy-linked branch runs migrations
   against the production database.**

The mitigation is **broadcast, not exclusion**. The reviewed evidence is unambiguous: the
ledger's proven wins have all come from *visibility* — nine review findings, a self-corrected
error, four schema columns caught while still cheap. No lock has ever prevented a collision.
So: publish early, read before you edit, and treat locks as advisory hints.

## 2. The three commands

```bash
node scripts/lane.mjs digest      # who holds locks NOW + my delivery state (runs at session start)
node scripts/lane.mjs claim  --task "<one line>" --files "a.tsx,b.mjs" [--next "..."] [--notes "..."]
node scripts/lane.mjs release --outcome "<one line>"
node scripts/lane.mjs doctor      # hygiene: orphaned ledgers, oversized artifacts (report only)
```

**Claim before your first edit. Release when the slice ends.** If you learn mid-slice that
you must touch a file you did not claim, re-run `claim` with the fuller list — a claim is
cheap and a stale claim is a lie.

## 3. Identity: one lane per SESSION, never per agent name

Your lane file is `<agent>--<worktree>-<pathhash>-s<session>.lane.md` (e.g.
`vs-claude--ss-creator-local-video-a71588b9f9-saea5fafb.lane.md`); on the main tree the
worktree part is just `main`. Run `node scripts/lane.mjs whoami` rather than constructing
the name by hand.

Both discriminators earn their place. The **path hash** (10 hex of the worktree's full path)
exists because two checkouts sharing a directory basename — or one literally named `main` —
would otherwise write the same file. The **session id** exists because agent+worktree alone
still collided: two concurrent sessions in the *same* worktree shared one lane, and since the
main tree is the common case, that quietly recreated the clobbering this scheme was built to
prevent. Where no session id is available the suffix is omitted, which is no worse than
before but does reintroduce that risk. All identity and lane parsing lives in one place, `scripts/lib/lane-core.mjs`;
three drifted copies of that logic was itself a defect (one had silently dropped an env var,
so the push hook warned agents about their own locks).

This matters more than it looks. v1 used a bare `claude.lane.md`. With several Claude
sessions running at once that is **last-writer-wins**: one session's claim silently erases
another's, and the surviving file reads as authoritative. An agent then checks the ledger,
sees a file "free", and edits it while a live session holds it. Both reviewers independently
called that class of bug the worst in the catalog — *a false-negative collision detector* —
because unlike a missing ledger, it looks like success.

**Never write another session's lane file** (R4). You read theirs; you write only yours.

## 4. The ledger is ONE directory, reachable from every worktree

`<git-common-dir>/../.ai-workflow/coordination/` — resolved with
`git rev-parse --path-format=absolute --git-common-dir`, which returns the *main* repo's
`.git` even from a linked worktree.

v1 resolved it from `process.cwd()`. With 184 worktrees that forked the ledger silently:
**eight worktrees held their own private coordination folders containing nine published lane
files that no other agent could ever read**, the oldest from 2026-07-14. Coordination was
believed, and void. That is the same disease as the incident that prompted this work —
finished work placed where its reader does not look.

`node scripts/lane.mjs doctor` lists those orphans. It **never deletes them** (Rule 34);
merging them forward would mean writing other agents' lanes and importing phantom locks from
dead sessions, which R4 and R5 both forbid. Report to Sean; let him decide.

## 5. Committed is not delivered

The lane's `Delivery:` field is computed from git — but read the caveat before trusting it.
It is recomputed whenever *you* run `claim`, `release`, or `digest`, and the `digest` line
about **your own** session is always live. Every **other** lane's `Delivery:` is file content
frozen at that agent's last write, so it can be hours old. Judge a peer's state from git, not
from their lane. The states:

| state | meaning |
|---|---|
| `local-commit` | committed on a branch that is not on the remote, or has unpushed commits. **Invisible to every other agent and to Hermes.** |
| `pushed-branch` | on the remote, not merged. Visible to off-machine agents. Not live. |
| `merged-to-main` | actually delivered — it exists where its readers look. |

An artifact is delivered only when it exists **where its reader looks**. A branch, a
gitignored directory, an unmerged worktree and a local file are all places where finished
work goes to be invisible. Before you say a thing is done, check which of the three states
it is in — and say that state out loud.

## 6. Before you push — the blast-radius checklist

`scripts/hooks/push-blast-radius.mjs` prints this automatically on any `git push`. It is
**advisory and never blocks.** Read it anyway:

- **What else does this push do?** On this repo a push is a deploy *and* a migration run.
  "I am only committing docs" is a statement about the diff, not about the consequences of
  merging it.
- **Does the range touch anything automation executes?** migrations, seeders, `*.sql`,
  `render.yaml`, `package.json`, CI workflows, Dockerfile.
- **Is the batch mixed?** When a batch mixes reversible and irreversible work, **split it.**
  Push the safe half now; hold the risky half for review. The safe half should never wait on
  the risky half's review, and the risky half should never ride the safe half's momentum.
- **Does it carry a file another live session has locked?** Stage explicit paths.
  `git add -A` is forbidden while another lane holds a lock — but note that **nothing
  enforces this**: no hook observes `git add`, so it is a discipline you keep, not a guard
  that catches you. The push advisory only sees the result, after the commit exists.
- **Force-push?** `--force` without `--force-with-lease` can destroy another agent's pushed
  commits.

**The local hook is early warning, not enforcement.** It only sees `git push` typed into a
hooked shell — it is blind to `gh pr merge`, the GitHub API, and any agent not on this
machine. The only control that covers every actor is **server-side branch protection on
`main`** (PR required, status checks, no direct pushes). Both reviewers ranked that the
single highest-value change available. It is Sean's to enable; until he does, this hook is
the only thing standing between an agent and an unreviewed production schema change.

## 7. Mutual hostile review (the highest-value review available, and it is free)

Finishing a substantial slice → append a request to `review-queue.md`; the other agent
returns `APPROVE | REVISE | REJECT` + findings. This has repeatedly caught what the author
could not see. Publish your lane **early** — they cannot correct what they cannot see, and a
deletion that sits unpublished for hours is a deletion other agents keep building on.

## 8. Deliberately NOT built (rejected with reasons — do not add these)

- **A Stop-hook "lane freshness" gate.** Both reviewers named this the single thing not to
  build. It keys on file *count* (uncorrelated with risk — a one-line `render.yaml` edit is
  the most dangerous change in the repo; a 20-file docs sweep is harmless), it fires *after*
  the writes so it prevents nothing, and any escape hatch it ships is model-writable, so
  within a week `LANE: N/A — routine` becomes a reflex and the hook gets deleted. You would
  then believe coordination is enforced when it is not — worse than knowing it is not.
- **A committed `DELIVERY-LOG.md`.** `git log origin/main` already *is* the delivery log:
  computed, not asserted, with SHAs that cannot be hallucinated. A tracked shared file
  reintroduces exactly the merge-conflict surface the gitignore rationale correctly avoided
  (the 220 KB `review-queue.md.orig` rotting in the ledger is the in-repo proof), and it
  recurses into this document's own lesson — a delivery log is itself undelivered until pushed.
- **Blocking pushes locally on "migration + main".** Too broad (migrations are the normal
  deploy path → approval theater or blocked deploys → bypass via `gh`) and too narrow (misses
  force-push, tags, branch deploys, `gh pr merge`, the API, cloud agents).
- **Auto-merging orphaned worktree ledgers.** Violates R4 by construction and imports phantom
  locks from dead sessions.

## 9. Known gaps this system still does NOT catch

State these honestly rather than implying coverage:

- **Semantic collisions.** Agent A renames a function; Agent B writes a caller for the old
  name in a different file. No file overlap, both compliant, breaks at integration.
- **Migration version collisions.** Two branches each add a migration; each passes its own
  tests; order against the production DB is decided at deploy time.
- **Off-machine agents.** The live ledger is gitignored and local. A cloud agent cannot read
  it — and local hooks do not constrain it either. The actors with the least visibility have
  the fewest gates. Branch protection is the only control that reaches them.
- **TOCTOU.** Two agents can both read "file free" in the same second. There is no mutex.
- **Sean is an unnamed agent.** He edits files too, and publishes no lane.
- **Stale locks.** A crashed session leaves locks behind. R5: flag, never silently seize.
- **Freshness is advisory, not proof.** Lane age comes from file mtime rather than the
  agent-authored `Updated:` line, because prose is easy to get wrong by accident. mtime is
  not unforgeable — `touch` exists, and releasing a lane bumps it — so treat "LIVE" as a
  hint, never as evidence that someone is actually at the keyboard.
- **The push advisory reads HEAD.** For an explicit refspec, `--all`, or a tag push it says
  so and tells you the file list may describe different commits; it does not parse refspecs.
- **`gh pr merge`, the GitHub API, and off-machine agents bypass every hook here.** Only
  branch protection reaches them.
