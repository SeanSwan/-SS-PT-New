# Backing up 383 machine-only commits without publishing old credentials

**Date:** 2026-08-13 · **Author:** vs-claude (Opus 5) · **Status:** bundle BUILT and VERIFIED;
awaiting Sean to move it off-machine.

## The problem in one paragraph

`git log --oneline --branches --not --remotes` returns **383+ commits** that exist on no
remote — 99 branches unmerged to `origin/main`, spanning 2025-02-18 to 2026-08-12, plus 5
stashes and 3 local-only tags. If this disk fails, that work is gone. The obvious fix,
`git push origin --all`, is **unsafe**: a secret scan of that history matches credential
shapes in **9 files** (`backend/database.mjs`, two `mcp_server/utils/config.py`,
`backend/routes/api.http`, `reset-db-manual.mjs`, `dev-tool-connection.mjs`,
`dev-auth-helper.ts`, `TESTING_GUIDE.md`, `STOREFRONT_DEBUG_GUIDE.md`), dated around May
2025 — *before* the 2026-04-19 remediation that rotated every credential and rewrote 2,179
commits to purge exactly this. Pushing would re-publish what that surgery removed.

## The answer: a git bundle

A bundle is a single file containing real git objects. It is what a push would transfer,
written to disk instead of to a server. It **publishes nothing**, preserves full fidelity
(modes, symlinks, deletions, renames, history), and is self-verifying.

```bash
# what was actually run
HEADS=$(git worktree list --porcelain | awk '/^HEAD /{print $2}' | sort -u)
STASHES=$(git stash list --format=%H)
git bundle create C:/tmp/SWANSTUDIOS-FULL-BACKUP-20260813-v3.bundle --all $HEADS $STASHES
git bundle verify C:/tmp/SWANSTUDIOS-FULL-BACKUP-20260813-v3.bundle
```

**`--all` alone is not enough, and I proved it twice:**

| Attempt | What it missed | Why |
|---|---|---|
| `--all` | a detached commit (`2b1a03fd0`) reachable from **no ref** | `--all` walks `refs/`; a detached worktree HEAD is not a ref. This is the class that dies on `gc` after the 90-day reflog expiry. |
| `--all` + worktree HEADs | **4 of 5 stashes** | only the current `refs/stash` is a ref; older stashes live in its reflog. |
| `--all` + HEADs + stash commits | nothing | ✅ |

## Verification actually performed

Cloned the bundle to a scratch bare repo and checked membership, rather than trusting
`bundle verify` alone:

| Check | Result |
|---|---|
| `git bundle verify` | "records a complete history … is okay" |
| Machine-only commits | **387 checked, 0 missing** |
| Stashes | **5 of 5** |
| Worktree HEADs (incl. the ref-less one) | **105 of 105** |
| Tags | **4 of 4** |
| Refs captured | 651 |
| Real `git clone` from the bundle | working tree, 395 branches |
| Size | 552 MB, one file |

## What Sean does — 3 minutes

1. Copy `C:/tmp/SWANSTUDIOS-FULL-BACKUP-20260813-v3.bundle` to **at least one place that is
   not this disk**: external drive, OneDrive/Dropbox, or a NAS. Two places is better.
2. Keep it out of the repo — do not commit it, do not push it. It contains the same old
   credentials that make pushing unsafe; the difference is a private file is not a public ref.
3. To restore, on any machine:

```bash
git -c core.longpaths=true clone SWANSTUDIOS-FULL-BACKUP-20260813-v3.bundle recovered
```

### ⚠ The `core.longpaths` flag is NOT optional, and the bundle cannot carry it

A plain `git clone` of this bundle **fails**:

```
error: unable to create file AI-Village-Documentation/validation-prompts/archive/…: Filename too long
fatal: cannot create directory at 'archive/cleanup-2026-05-12/…': Filename too long
warning: Clone succeeded, but checkout failed.
```

History recovers (395 branches, 6,359 commits) but **zero files are checked out**. This repo
contains paths longer than Windows' 260-character `MAX_PATH`. It works *here* only because
`core.longpaths=true` is set in **this repo's local `.git/config`** — and a bundle carries
objects and refs, **not config**. So a recovery on a fresh machine inherits none of it.

With the flag: **11,491 of 11,491 tracked files check out, exit 0.** Verified by cloning from
the Z: copy.

Residual: `git status` in the recovered clone reports ~228 paths as deleted — git cannot
`stat` them even with longpaths, because the directory nesting is extreme. **All of them are
under `archive/pending-deletion/`** (plus one design-asset export) — dead code already slated
for removal. Zero live source affected.

**This is the single most important line in this runbook.** Without the flag the backup looks
like it worked and produces an empty working tree.

## Why not the alternatives

| Option | Verdict |
|---|---|
| `git push origin --all` | **No.** Re-publishes credentials the 2026-04-19 remediation removed. |
| Push only "clean" branches | Requires branch-by-branch triage; I confirmed that excluding the obvious branch does **not** clear the scan. Real work, deferred. |
| Copy the `.git` folder | Works, but 105 live worktrees make it awkward, and it is not self-verifying. The bundle is one file with an integrity check. |
| Do nothing | 383 commits and 5 stashes, one disk failure from gone. |

## Honest limits

- **A bundle is a point-in-time snapshot.** A commit made minutes after I built the first one
  was absent from it — other sessions are actively committing. Re-run before relying on it.
- **It contains those old credentials.** They are almost certainly already rotated, but treat
  the file as sensitive: private storage, not a shared link.
- **It does not capture uncommitted working-tree state** — the 4,247 dirty files across 44
  worktrees are not in it. Those are a separate decision.
- **Not yet moved off-machine.** Until step 1 above, the backup and the thing it protects are
  on the same disk, which is not a backup.
