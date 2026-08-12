# Live Coordination Ledger (Rule 67 v2)

> **Created** 2026-06-13 by Sean. **Rebuilt** 2026-08-12 after three hostile reviews found the
> v1 ledger had silently stopped working. **Full procedure:** the `agent-lane` skill
> (`.claude/skills/agent-lane/SKILL.md`). **Engine:** `scripts/lib/lane-core.mjs`.

## What this is

Several AI agents (Claude sessions, Codex, sometimes Fable, sometimes a cloud agent) work
this repo at the same time, across ~110 git worktrees. They publish here what they are doing
and which files they hold, so they do not overwrite each other, sweep each other's work into
a commit, or build on something another agent already deleted.

**Locks are advisory broadcast, not exclusion. Nothing here blocks an edit.** The recorded
wins of this system have all come from *visibility*; no lock has ever prevented a collision.

## Use the commands — do not hand-write these files

```bash
node scripts/lane.mjs digest      # who holds what right now + my delivery state
node scripts/lane.mjs claim  --task "<one line>" --files "a.tsx,b.mjs" [--next "…"] [--notes "…"]
node scripts/lane.mjs release --outcome "<one line>"
node scripts/lane.mjs doctor      # orphaned ledgers, oversized artifacts (reports only, never deletes)
node scripts/lane.mjs whoami      # my lane filename
```

`digest` also runs automatically at session start via `scripts/hooks/lane-session-start.mjs`.

## Files

| File | Tracked? | Purpose |
|---|---|---|
| `README.md` | ✅ | this file |
| `<agent>--<worktree>-<hash>.lane.md` | ❌ gitignored | ONE PER SESSION. Written only by `lane.mjs`, only by its owner. |
| `review-queue.md` | ❌ gitignored | append log: review requests + `APPROVE`/`REVISE`/`REJECT` verdicts |
| `activity.log.md` | ❌ gitignored | append log of claims/releases |
| `archive/` | ❌ gitignored | retired artifacts, moved never deleted (Rule 34) |

### Lane naming is load-bearing — do NOT go back to `claude.lane.md`

v1 used one file per agent *name*. With several Claude sessions running at once that is
**last-writer-wins**: one session's claim silently erases another's, and the surviving file
still reads as authoritative. Two hostile reviewers independently called that the worst
defect in the system — *a false-negative collision detector*, worse than having none,
because it looks like success.

Identity is therefore **agent + worktree + a hash of the worktree's full path**. The hash is
not decoration: with ~110 worktrees, two checkouts sharing a directory basename (or one
literally named `main`) would otherwise collide.

### One ledger, reachable from every worktree

The ledger is resolved from `git rev-parse --path-format=absolute --git-common-dir`, so it is
the same directory whether you are in the main tree, a linked worktree, or a subdirectory of
either. v1 resolved it from the current directory: with 187 worktrees that forked the ledger
into private copies, and **nine published claims sat where no other agent could ever read
them**, the oldest for four weeks. `node scripts/lane.mjs doctor` reports any that remain.

## The rules

- **R1 Read before you edit.** The session-start digest does this for you. If a file you are
  about to touch is held by a LIVE lane, don't edit it — pick another, ask in
  `review-queue.md`, or ask Sean.
- **R2/R3 Claim on start, release on finish.** A claim is cheap; a stale claim is a lie. If
  the slice grows, re-run `claim` with the fuller list.
- **R4 Never write another session's lane file.** You read theirs; you write only yours.
- **R5 A stale claim is not a dead claim.** Over `FRESH_MIN` (120 min) a lane shows as stale —
  flag it, never silently seize. On 2026-08-12 a 27-day-old lane turned out to be protecting
  191 uncommitted files.
- **R6 Stage explicit paths.** Never `git add -A` while another lane holds a lock.
- **R7 Hostile-review each other.** Append a request to `review-queue.md`; the other agent
  returns a verdict plus findings. It is the highest-value review available and it is free.

## Committed is not delivered

`Delivery:` in each lane is computed from git on every read, never asserted:
`local-commit` (invisible to everyone else) → `pushed-branch` → `merged-to-main`. An artifact
is delivered only when it exists where its reader looks.

## Before you push

`scripts/hooks/push-blast-radius.mjs` prints the blast radius on any `git push` — advisory,
never blocking. On this repo `render.yaml` builds with `npm run migrate:production`, so **a
push to a deploy-linked branch runs migrations against the production database.** The hook
cannot see `gh pr merge`, the GitHub API, or agents on other machines; server-side branch
protection on `main` is the only control that reaches those.

## Retention

Lane files are overwritten in place and never grow. The append logs are trimmed by
`node scripts/coordination-prune.mjs` (30 days / 256 KB); nothing invokes it automatically, so
run it when `doctor` flags an oversized artifact.
