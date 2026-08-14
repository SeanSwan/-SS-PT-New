# Multi-agent shared-tree git lock — 3-model panel + resolution (2026-08-14)

**Panel:** Kimi K3 ($0.0760, truncated at Q1 — `finish_reason: error`), Tencent HY3
($0.0036, complete), Gemini 3.1 Pro (subscription, complete). Total paid: **$0.0796**.

**⚠ Script bug found:** `scripts/consult-hy3-design.mjs` and `scripts/consult-kimi.mjs`
BOTH write to `docs/ai-workflow/AI-HANDOFF/KIMI-DESIGN-REVIEW.md`. Kimi overwrote HY3's
artifact. HY3's findings are preserved here because they were read before the overwrite.
**Fix needed:** give each consult script a distinct, model-named output path.

---

## The incident

Every index-writing git command in this working tree had failed since **02:18 today**.
An orphaned `.git/index.lock` (0 bytes) blocked all agents — not one. Symptom Sean
reported as "stuff that was pull locked or push". Consequence: the Hermes durable
learning corpus (16 packets, some a fortnight old) sat uncommitted, i.e. *not durable*.

Also found: a hung `git credential-manager store` (PID 26272) blocked on stdin since
**01:54**, ~9 hours.

## Where the panel agreed

1. **The lock was orphaned and safe to clear after verification.** 0 bytes is
   *reassuring*: git never edits `.git/index` in place — it writes `index.lock` then
   atomically renames. A 0-byte stale lock means the writer died before writing, so
   **the real index was never at risk** (Kimi, decisive).
2. **Verification must be a handle test, not just age.** Sysinternals `handle.exe`, or
   an exclusive-open probe (no extra tooling required — this is what was used).
3. **Kill the hung credential helper — zero loss.** It never received stdin, so it
   stored nothing. All three rated the risk as nil.
4. **Commit with `git commit -o -- <path>` (`--only`).** Race-proof: commits exactly the
   named paths regardless of what any other agent stages mid-flight.
5. **Never** `git add -A`, `git commit -a`, or a bare `git commit` in a shared tree.

## Where the panel DISAGREED — and it mattered

**Gemini recommended `git reset` before staging**, to clear any partial staging.
**Kimi and HY3 both classed that as destructive** to a concurrent agent's staged work.

In a tree with several nonstop agents, Gemini's step is the exact toe-stepping Sean
wants prevented: if any other agent has staged files at that instant, `git reset`
silently unstages them. **It was not run.** Nothing was staged at the time, so it would
have been a no-op at best and someone else's lost work at worst.

**Kimi also supplied the reason the race Gemini feared cannot occur:** lock creation is
`O_EXCL`, so while the stale lock file exists *no new git process can acquire it*. No
new owner can appear between the check and the removal.

**HY3 caught a factual error in Gemini's Q6.** Gemini proposed
`git restore --source=<wip-branch> -- <path>` to port knowledge files to `main`. That
cannot work: the files were **untracked**, so they existed on no branch at all.

## What was actually done

1. Snapshotted `.git/index` → `/c/tmp/git-index-backup-20260814/index.bak` (1.6 MB).
2. Exclusive-open probe → `ORPHANED`. Re-checked mtime immediately before acting.
3. Killed PID 26272.
4. **Moved** the lock aside (not deleted) → recoverable.
5. Verified: `fsck` clean, `HEAD` unchanged, **0 files staged** by anyone.
6. Secret+PII scanned all 16 packets, staged the directory explicitly, verified nothing
   outside it was staged, committed with `-o --`. The repo's own pre-commit scanner
   independently reported CLEAN on all 16 staged blobs.

Result: **`b57d21d76`** — 16 files, 1,796 insertions. Tree unblocked for all agents.

## A second lock was created mid-operation — by me

A malformed `git commit -o -- <path> -F-` (after `--`, everything is a pathspec, so
`-F-` was read as a filename) failed **after acquiring the index lock** and orphaned it.
Same verified procedure cleared it.

**This is almost certainly how the 02:18 lock was born too** — an agent ran a malformed
git command, git took the lock, the command died on argument parsing, the lock stayed.
It is not an exotic failure; it is one bad flag away at any time.

## Recommended structural fix (Kimi + HY3 + Gemini unanimous)

**One `git worktree` per agent**, sharing one `.git` object store:

```bash
git worktree add -b agent/<name>-<task> ../wt-<name>
```

Each worktree gets its **own index**, so `index.lock` contention disappears entirely.
Rejected alternatives: separate clones (heavy, slow to sync), a lock-serialising service
(band-aid over single-writer fragility).

This is already how SwanGuard is being worked, and it is why that repo had none of these
problems today.

## Still open for Sean

- **Durable corpus is on a WIP branch with no upstream**, 1,926 commits behind `main`.
  It has never been pushed, so the corpus exists on exactly one machine. Panel's
  recommendation (HY3, corrected): create a `main`-based worktree, copy the packet
  directory in, commit and PR — never merge/rebase this WIP branch into `main`.
- **Fix the consult-script output collision** noted at the top.
- **Consider a pre-flight lock check** in the agent lane tooling: if `.git/index.lock`
  is older than ~10 minutes and no process holds it, surface it loudly rather than
  letting every agent fail silently for nine hours.
