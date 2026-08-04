---
name: worktree-isolation
description: Use before implementation when a Git checkout is dirty, stale, shared by concurrent agents, or risky to modify directly. Creates or verifies an isolated worktree with an exact baseline, branch, dependency, environment, port, and cleanup receipt. Never copy secrets or remove worktrees without explicit authority.
---

# Worktree Isolation

Prepare an isolated Git workspace while preserving the user's existing checkout.

## Classify First

Classify the requested lane:

- `READ_ONLY_AUDIT` - inspect without mutation.
- `SHARED_LANE` - edit the existing checkout under its coordination and lock rules.
- `ISOLATED_WORKTREE` - use a separate branch and directory.
- `STALE_OR_DIRTY` - do not implement until moved to a trustworthy baseline.

Use an isolated worktree when unrelated changes exist, the branch is materially stale, concurrent work may collide, or the user asks for parallel isolation.

## Preflight Receipt

Record:

```text
REPO ROOT:
CURRENT BRANCH:
CURRENT STATUS:
TARGET BASELINE:
BASELINE VERIFIED BY:
TARGET BRANCH:
TARGET WORKTREE:
OTHER ACTIVE WORKTREES:
COORDINATION LOCKS:
ENV STRATEGY:
DEPENDENCY STRATEGY:
PORT/SERVICE STRATEGY:
CLEANUP AUTHORITY: not granted | granted for <exact target>
STATUS: GO | BLOCKED
```

Before edits:

1. Resolve the real repo root and current worktree.
2. Read project instructions and coordination files.
3. Inspect `git status`, branch divergence, existing branches, and worktrees.
4. Fetch the intended remote baseline when current truth matters and network access is authorized.
5. Verify the exact target directory does not already contain user data.
6. Use the project's required branch prefix.

## Create Safely

- Create the worktree from the verified baseline, not from a stale dirty branch.
- Use an explicit absolute target under an approved workspace or temporary root.
- Do not copy `.env`, credentials, auth state, databases, or secret files.
- Reuse dependency caches only through documented project mechanisms.
- Assign independent ports and local service names where concurrent processes could collide.
- Run the minimum bootstrap command that proves the worktree can execute the relevant checks.
- Update the shared coordination ledger with the worktree path and claimed files when the project requires it.

A copied directory is not proof of isolation. Git state, ports, services, credentials, databases, and external resources can still collide.

## Verify

After creation, report:

- worktree path and branch;
- baseline commit;
- clean or expected status;
- instruction files loaded;
- dependency/bootstrap result;
- port and service isolation;
- files or surfaces claimed;
- any remaining shared resources.

## Cleanup

Worktree creation does not authorize cleanup. Before removing a worktree or branch:

1. Resolve the exact absolute targets.
2. Verify whether commits, staged changes, modified files, or untracked files remain.
3. Preserve or hand off any material work.
4. Make closeout evidence survive the target's removal: copy the durable report into the primary checkout or record content hashes plus a committed/canonical artifact location. A path that cleanup will destroy is not durable evidence.
5. Obtain explicit authority for destructive cleanup unless the target is a temporary artifact created by the current task and removal is already within scope.
6. Report what was removed and whether it is recoverable.

Never use broad recursive targets, force deletion, destructive reset, or blind environment copying.
