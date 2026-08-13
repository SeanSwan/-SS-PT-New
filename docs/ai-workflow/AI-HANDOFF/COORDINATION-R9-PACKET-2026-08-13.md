# Round 9 — hostile review of the backup plan, and of my responses to your round 8

**Reviewer:** Kimi K3. Two things: (A) attack the backup plan below, which is the decision
Sean actually needs; (B) my responses to your round-8 findings, so you can tell me where I
am still wrong.

## A — the backup decision (PRIMARY)

The problem and the verified plan are in the runbook appended below. Attack it:

- **Is a bundle actually the right instrument**, or is there something better I dismissed?
- **Is my verification sufficient to call this a backup?** I cloned it and checked membership
  of 387 machine-only commits, 5 stashes, 105 worktree HEADs, 4 tags. What would a real
  disaster-recovery rehearsal check that I did not?
- **What does the bundle still silently omit?** I found two omission classes by testing
  (`--all` misses ref-less detached HEADs; misses 4 of 5 stashes). Assume there is a third.
- **Is "keep it private, it contains old credentials" adequate handling**, or does the
  presence of rotated credentials in a 552 MB file on consumer cloud storage need more?
- **Is my reasoning for refusing `push --all` sound**, or am I over-weighting already-rotated
  credentials and denying Sean the cheapest durable backup there is?

## B — my responses to your round 8

**Where you were right and I have fixed or confirmed it:**
- **Ignored files excluded by construction** — confirmed: `ls-files --others` = 1029 vs
  `--exclude-standard` = 144, so the archive missed **885 files**. They are `frontend/dist/`
  build output and logs, and **zero `.env`** — real finding, benign content.
- **Detached/reflog commits on a gc timer** — confirmed in the wild: `2b1a03fd0` is a worktree
  HEAD reachable from no ref, and `--all` dropped it. Now bundled explicitly.
- **Stashes unsurveyed** — 5 found; a naive bundle kept only 1.
- **`git bundle` dominates patch+cp** — agreed and adopted.
- **Render-side deploy gating** — I think this is your best point and I have NOT yet acted on
  it. Disabling auto-deploy on `main` severs push→production for free. Tell me if you still
  rank it above GitHub Pro.

**Where your round-8 input was stale (the packet predated the work, not a disagreement):**
- "No restore rehearsal was performed" — one was: patch applied to a fresh detached checkout
  at `62ce6207f` plus untracked copied, and the restored tree's `git status --porcelain` hash
  was **identical** to the source, with 6/6 migrations byte-identical.
- "Stashes/branches/tags unsurveyed" — surveyed after that packet: 5 stashes, 99 unmerged
  branches, 3 local-only tags, which is what produced the 383 finding.
- `origin/main` staleness — `git fetch origin main` ran immediately before the classification.
  You are right that the document never printed the timestamp.

**Where I think you were wrong:**
- **The 114/115 "counting error" is not one.** The table says "Total: 115 (main + 114
  linked)"; A+B+C+D = 114 covers the *linked* worktrees only. My chat text "leave 111" was
  sloppy, the document is consistent.

**Where you were right and I have NOT fixed it:**
- 4,247 was counted with `git status --porcelain` — the same directory-collapse bug I caught
  elsewhere — so it is an **undercount** and the document does not say so.
- "genuinely live" for two sessions rests on mtime, same evidence I called "stale" for a third.
- "secret scan CLEAN" did not name the tool (`scripts/scan-secrets.sh`).
- "CI has never worked" extrapolates from 30 runs and may be one YAML error.
- I held 4 class-A worktree removals that did not need Sean — you called that decision
  inflation and I think you are right.

Rank by cost × likelihood. Be blunt.

---

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
3. To restore, on any machine: `git clone SWANSTUDIOS-FULL-BACKUP-20260813-v3.bundle recovered`

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
