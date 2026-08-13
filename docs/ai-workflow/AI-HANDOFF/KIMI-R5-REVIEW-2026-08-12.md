# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COORDINATION-R5-REVIEW-PACKET-2026-08-12.md
**Seed:** (none)
**Tokens:** 10840 in / 13056 out | **Cost:** ~$0.2284 | **Wall:** 408.6s | **finish_reason:** stop

---

## Findings, ranked by cost × likelihood

**1. `-C` fallback silently analyzes the wrong repo — the exact failure the fix claims to kill.** `push-blast-radius.mjs:68-69`: `existsSync(dashC[2]) ? dashC[2] : process.cwd()`. A typo'd, moved, or truncated `-C` path (see #2) falls back to cwd, so the hook prints this repo's branch/diff/verdict **with no `repo:` disclosure** — because `REPO === process.cwd()` suppresses the only hint (line ~150). The comment at :64-67 describes this precise failure mode as fixed. Fail-closed (warn + skip analysis), don't fall back.

**2. `-C "path with spaces"` → hook does nothing, exit 0.** `push-blast-radius.mjs:62` (`-[Cc]\s+\S+` can't span a quoted space, and backtracking can't rescue it because `\s+push` never follows) and `:68` (`[^\s"]+` stops mid-path, backreference fails → no match → cwd fallback of #1). On Windows, quoted space paths are the norm, not the edge. The hook vanishes exactly where `-C` matters most. Reports success while doing nothing.

**3. `deployRefNamed` scans the whole command line, not what follows `push`.** `push-blast-radius.mjs:84-90`. `git pull origin main && git push origin feature-x` → `deRef` still contains `main` → DEPLOY-LINKED lecture on a feature push. Fix 7 gated only the *branch-inference* half (`namesAnyRef`); the regex half still matches pre-push tokens. `git pull origin main` + push is the single most common agent flow here — this is an over-report factory on the highest-severity flag, i.e., it trains readers to ignore DEPLOY-LINKED.

**4. Idle guard (fix 6) and tree-sentinel now disagree about the same file.** `lane-core.mjs:203-205` zeroes locks on `/^Status:\s*(idle|released|done)/mi`; `tree-sentinel.mjs:133-136` calls `parseLane` directly and prints those same locks as `LIVE`. The two tools whose job is reporting locks give contradictory digests of one ledger — reader/reader disagreement, this round's instance of the writer/reader class. Worse, fix 6 trusts agent-authored prose (`Status:`) to erase *parsed* locks, contradicting the doctrine stated in this same packet (tree-sentinel:128-131: "a model can hallucinate" prose, so trust mtime). A stale or template-default `Status: idle` line makes real locks invisible to `digest` and `lane-session-start` while release()'s parseLane verification still sees them. Move the guard into `parseLane` or apply it in tree-sentinel.

**5. SCP-style SSH remote matches the refspec detector.** `push-blast-radius.mjs:104`: `git push git@github.com:org/repo.git main` — one colon, not a drive letter → `refspecToken` true → "the range below is NOT what is being pushed" on every SSH push, with a perfectly trustworthy range below it. Permanent spurious warning on a standard push shape.

**6. Conditional splitting mangled quoted paths with spaces — disagrees with the push hook's own quotePath fix.** `lane-core.mjs:155-176`: `- "backend/migrations/014 add col.sql"` splits on `\s` into three tokens, quote-stripping only works at token edges, `add` fails `pathish` → first-token-only → lock = `backend/migrations/014`, a path that exists nowhere and that `lockMatches` can never match against `backend/migrations/014 add col.sql`. Fix 9 made git *emit* space-bearing paths unquoted; fix 2 made the lane parser unable to represent them. Phantom lock + unprotected migration file — the hook's own stated worst case.

**7. Session discriminator silently never engages.** `lane-core.mjs:96-99`: two *guessed* env var names, no verification, fallback "no worse than before" — i.e., if hooks don't export either var, the doc's "one lane per session" promise quietly delivers per-worktree lanes with main-tree last-writer-wins, and nothing can tell the difference. Same class: a manual `lane.mjs release` from a terminal (no session env) computes a different `laneName` than the hook wrote — release targets a nonexistent lane while the real one keeps its locks.

**8. `rev-list` failure → phantom UNMERGED.** `tree-sentinel.mjs:89-111`: `counts` null leaves `wt.ahead` undefined; `undefined === 0` is false → klass `UNMERGED`, printed as `+undefined ahead` (:179). With `--no-fetch` against a repo lacking `origin/main`, every worktree false-alarms "real WIP — do not touch" in the tool whose output feeds cleanup decisions.

**9. Round-4's `origin/main`-in-prose regression only half-fixed.** `lane-core.mjs:171-176`: the every-token-pathish gate protects non-initial positions only. `- origin/main is my upstream` — sentence-initial path, exactly how agents write it — yields a lock on `origin/main` that never matches a file and renders in every digest.

**10. `pathish` existence check resolves against the main tree, not the caller's worktree.** `lane-core.mjs:161-163` with `root = resolve(ledger,'..','..')`. An extensionless new file existing only in a linked worktree fails `existsSync` and is dropped as a single-token lock — the escape hatch admits real files, but checks the wrong tree, in a repo with ~110 worktrees.

**11. Bold-strip eats legitimate `**`-leading globs.** `lane-core.mjs:157`: `- **/migrations/**` is valid glob syntax and matches `^\*\*(.+?)\*\*$` → becomes `/migrations/`, a lock that matches nothing. The fix for `**Nothing.**` can't distinguish markdown bold from a `**/` glob prefix.

**12. Printed hint reintroduces the bug this file's header brags about fixing.** `lane-session-start.mjs:35` tells the agent to run `node scripts/lane.mjs claim` — a relative path that fails from any cwd ≠ repo root, the exact failure documented at lines 8-13. Orientation advises a command that doesn't work from where the agent is sitting.

## Revert verdict

Nothing warrants a revert; all twelve are patchable. Priority order: #1+#2 (make `-C` fail closed and quote-aware — one regex and one `if`), #4 (hoist the idle guard into `parseLane` so every consumer shares it), #3 (slice `deRef` at `pushIdx` before testing). #6 and #7 need design decisions (token-aware splitting that respects quotes; a verified session-id source), not one-liners.
