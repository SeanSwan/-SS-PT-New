# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COORDINATION-FINAL-REVIEW-PACKET-2026-08-12.md
**Seed:** (none)
**Tokens:** 11543 in / 16580 out | **Cost:** ~$0.0103 | **Wall:** 461.6s | **finish_reason:** stop

---

## Ranked findings — cost × likelihood

| # | Cost×Likelihood | File:Line | Defect |
|---|----------------|-----------|--------|
| 1 | High × Med | `lane-core.mjs:130` | `parseLane` **drops extensionless locks** (`Dockerfile`, `README`, `LICENSE`, `Makefile`). Under-reports. |
| 2 | Med-High × High | `push-blast-radius.mjs:109` | Hook **always emits** on any push to `main`/`master`/`production` even with empty diff / no executable files → alert fatigue → hook disabled. |
| 3 | High × Med | `prune-worktrees.mjs:44-51` (executed) | `git status --porcelain` ignores ignored files; **orphan ledgers / local env inside removed worktrees deleted silently**. |
| 4 | High × Med | `lane-core.mjs:157-162` | `lockMatches` **never matches `./`-prefixed or relative locks** (`normPath` not applied to leading `./`), so even if Rank 1 is patched, `./Dockerfile` won’t clash. |
| 5 | High × Low-Med | `push-blast-radius.mjs:139` | `catch {}` fail-open: **any thrown bug = exit 0, no output** — the exact “reports success while doing nothing” class. |
| 6 | Med-High × Low | `lane-core.mjs:78` | 6-hex slug hash → **lane-file collision** between two worktrees (birthday ~0.1% at 184 trees) → cross-agent claim/release clobber. |
| 7 | Med × Low-Med | `lane-core.mjs:129` | First-whitespace-token only → **comma-separated multi-file bullets under-report** locks. |
| 8 | Low × Med | `lane.mjs:87` | Unlocked `appendFileSync` to `activity.log.md` → **concurrent append loss/corruption** on Windows. |
| 9 | High × Very Low | `prune-worktrees.mjs:32` | `MAIN = wts[0].path` assumes list order; if main isn’t first, it could be targeted (git refuses, but fragile). |
| 10 | Low × Low | `lane-core.mjs:132-134` | Wrong-entry: `task` falls back to first heading (the lane title) when `Task:` line missing. |

---

## 1. Fourth parsing defect (and cousins)

**Primary fourth defect — under-report of extensionless files.**  
`lane-core.mjs:130` filters locks with `/[/\\]/.test(l) || /\.[A-Za-z0-9]{1,6}$/.test(l)`. A bullet `- Dockerfile` (no slash, no dot) is **discarded**. `Dockerfile` is explicitly in `EXECUTES_ON_PUSH` (`push-blast-radius.mjs:37`). So an agent can lock `Dockerfile`, and both `digest` and the push hook will report **no lock / no clash** while the file is genuinely locked. This is the missing false-negative.

**Companion defects in the same neighbourhood:**
- `lane-core.mjs:129` takes `split(/\s+/)[0]` — a bullet `- a.js, b.js` yields only `a.js`. Under-report.
- `lane-core.mjs:157-162` `lockMatches` compares `normPath(changed)` to `normPath(lock)` but `lock` keeps a leading `./` (`raw` only strips quotes). `./dockerfile` ≠ `dockerfile` and doesn’t start with `./dockerfile/`, so **relative locks never match**. Over-report of safety.
- `lane-core.mjs:132-134` `task` fallback to `heads[0]` (the `# Agent — Live Lane` title) when `Task:` absent → wrong-entry in digest.

## 2. `prune-worktrees.mjs` — already executed

**What it could have silently destroyed:**
- `git status --porcelain` (line 44) does **not** list ignored files. Any worktree containing only gitignored but locally-important files (`.env`, local config, build output, or an **orphan `.ai-workflow/coordination` directory** as flagged by `doctor`) was `git worktree remove`d with zero warning. The script never inspects for orphan ledgers inside the worktree.
- No commits/branches were lost (`worktree remove` leaves refs). Stashes survive. But **untracked-ignored data is gone**.
- `MAIN = wts[0].path` (line 32) trusts list order. If order ever differs, the main tree would be in the removal loop; git would refuse, but it’s a silent near-miss.

**Detection now (after the fact):**
- The script only `console.log`s; if stdout wasn’t captured, the exact 79 paths are **unrecoverable** from the repo. Capture `git worktree list` now and diff against any pre-prune inventory or bash history.
- Verify no branch was lost: `git for-each-ref --format='%(refname)' | grep -E 'heads/'`. All removed-worktree branches should still exist.
- Check remaining worktrees for a sibling `.ai-workflow` orphan that *was* inside a now-deleted tree — impossible to see post-deletion; the only signal is a missing entry in the executor’s scrollback.
- Accept that ignored files in those 79 trees are permanently destroyed; there is no git record.

**Verdict:** The operation was *mostly* safe for committed work, but it likely **deleted orphan ledgers and local-only files without notice**. That is silent destruction by definition.

## 3. Remaining concurrency races

- **Lane identity collision (`lane-core.mjs:78`)**: `slice(0,6)` of a SHA1. Two worktrees with different full paths but same lowercased basename + hash collision share `ME.laneName` → `atomicWrite` to same file → last-writer-wins claim, cross-agent release. Not theoretically fixed.
- **Activity log (`lane.mjs:87`)**: `appendFileSync` without `O_EXCL`/lock. Concurrent agents interleave or drop lines on Windows. Audit trail loss.
- **`mkdirSync` (`lane.mjs:91`)**: double-check-then-act on `existsSync`; with `recursive:true` it’s benign but still a TOCTOU.
- **Prune TOCTOU (`prune-worktrees.mjs:42-49`)**: re-verifies, but a commit landed *after* the `ahead`/`dirty` checks and *before* `worktree remove` is still safe (commit lives in ref), so not destructive.

## 4. Push advisory false positives / negatives

- **False positive (Rank 2)**: `push-blast-radius.mjs:109` early-returns only on `!hits && !forced && !leased && !lockClash && !rangeNote && !explicitRefspec`. `targetsDeployRef` is **not** in that list, so *every* push to `main` prints the ⚠ banner even when the diff is empty or touches only docs. This is the fastest path to “hook disabled” rubber-stamping.
- **False negative (Ranks 1+4)**: extensionless and `./`-prefixed locks are invisible to `lockClash` (lines 100-104), so a real live-session clash on `Dockerfile` is missed.
- **False negative**: `EXECUTES_ON_PUSH` misses `package-lock.json` / `yarn.lock` (only `package.json`), but that’s design scope.
- **Fail-open (Rank 5)**: any regex or `sh` throw inside `main()` is swallowed by line 139 → hook exits 0 with no stderr. A bug there is indistinguishable from “no problem”.

## 5. Reports success while doing nothing

- **`parseLane` under-report** → `digest` prints `no fresh locks held by other agents` (lane.mjs:183) and the push hook prints no `lockClash`, while a lock exists. This is the original sin: **green light, no protection**.
- **`push-blast-radius.mjs:139`** → on internal error, exits 0, says nothing. Push proceeds.
- **`release()` (lane.mjs:115)** → `no lane to release` exits 0; if a prior `claim` silently failed (exit 3 would have caught it, but if skipped), the agent believes they released a real lane.
- **Prune dry-run** is honest (prints WOULD-REMOVE), so not in this class.

## 6. Merge risk — what should block

1. **Block** until `lane-core.mjs:130` accepts extensionless path tokens (e.g., `/\.[A-Za-z0-9]{1,6}$/` **or** a bare filename without slash but known to exist). Same for `lockMatches` to strip `./` and normalize relative paths.
2. **Block** until `push-blast-radius.mjs:109` either (a) includes `targetsDeployRef` in the early-return guard, or (b) suppresses the banner when `changed` is empty / no `hits` and no `lockClash` — otherwise it will be disabled within a day.
3. **Block** until the prune executor confirms stdout was captured and a post-mortem confirms no orphan ledgers were inside the 79 removed trees; otherwise we are merging code whose operational sibling already destroyed evidence.
4. **Fix before next deploy**: `lane-core.mjs:78` hash truncation → use full hash or `basename+full path` without truncation to kill lane collision.

If these are not addressed, the ledger will report “clear” on exactly the files (`Dockerfile`, `render.yaml`, `package.json`) that trigger production migrations — the one scenario this entire rebuild was meant to prevent.
