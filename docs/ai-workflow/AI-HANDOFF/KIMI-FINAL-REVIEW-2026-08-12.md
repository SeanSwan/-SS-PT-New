# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COORDINATION-FINAL-REVIEW-PACKET-2026-08-12.md
**Seed:** (none)
**Tokens:** 11810 in / 17610 out | **Cost:** ~$0.2996 | **Wall:** 581.6s | **finish_reason:** stop

---

# Hostile review — findings ranked by cost × likelihood

## 1. THE FOURTH PARSING DEFECT: bare top-level directory locks are silently discarded

**`scripts/lib/lane-core.mjs:129–130`**

```javascript
.map((l) => l.split(/\s+/)[0].replace(/[,;]$/, ''))
.filter((l) => /[/\\]/.test(l) || /\.[A-Za-z0-9]{1,6}$/.test(l))
```

A lock of `- docs`, `- backend`, or `- migrations` — the *broadest, highest-value* lock an agent can declare — contains no `/`, `\`, and no `.ext`, so it fails both tests and vanishes. No digest entry, no push-hook clash, no warning anywhere. The prose-bullet fix (defect #3) overcorrected: it filters out exactly the locks that cover the most files. This is an under-report in the collision detector, the failure this rebuild exists to prevent. Fix: after token extraction, test the token against the actual repo (`existsSync(resolve(top, token))`) instead of a shape heuristic, or accept any token matching `^[A-Za-z0-9._/-]+$` and let `lockMatches` decide.

**Sibling token defects at the same two lines** (same silent under-report class):

- `- ./src/app.js` — `./` is never stripped; `lockMatches` compares `./src/app.js` against `src/app.js`, never matches (lane-core.mjs:157–163).
- `- C:/repo/backend/src/app.js` — absolute path; never matches a repo-relative `changed` path.
- `- "backend/my dir/x.js"` — `split(/\s+/)[0]` truncates at the space → lock `"backend/my`, matches nothing.
- `- src/*.js` — **over-report, opposite direction**: `lockMatches` line 160 `raw.replace(/\/\*+.*$/, '')` discards the extension constraint, so `src/*.test.js` locks all of `src/`. The docstring claims `dir/*` support; the code implements `dir/**`.
- `*` and `+` Markdown bullets (lane-core.mjs:119 `startsWith('- ')`) are invisible. Hand-edited lanes using `*` bullets publish zero locks.

## 2. Reports success while doing nothing: `deliveryState()` prints "pushed-branch" when the count FAILED

**`scripts/lane.mjs:58` → `:61`**

```javascript
const unpushed = Number(sh(`git rev-list --count ...`) ?? 0) || 0;
...
else if (onRemote && unpushed === 0) state = 'pushed-branch';
```

`sh()` returns `null` on failure; `?? 0` conflates failure with zero — the exact conflation the comments at lane-core.mjs:24–27 and push-blast-radius.mjs:77–79 congratulate themselves for eliminating. In a **shallow clone** (CI agents, cloud agents — your stated population) `rev-list --count origin/ref..HEAD` fails with "no merge base" → `null` → `0` → lane file and digest both state `Delivery: pushed-branch` while HEAD is arbitrarily far ahead. An agent trusting that field to decide a branch is safe to abandon gets a lie. This is the incident's failure class reproduced on the field the incident created. `null` must produce `state: 'unknown'`, never a count.

Secondary: **`identity()` depends on ambient env** (lane-core.mjs:70). `SWAN_AGENT_SURFACE`/`CLAUDE_AGENT` propagate differently into hook contexts vs. interactive shells. Claim from one context, digest/push-hook from another → different `laneName` → your own live lane renders as a *foreign* lane holding locks (digest:160, push hook:94–97 are keyed on exact filename). "It always flags my own files" is the false positive that trains agents to ignore the digest entirely.

## 3. `prune-worktrees.mjs` — the executed operation was NOT fully safe

**Tracked content: almost certainly safe.** 0-ahead + clean porcelain + git's own refusal at removal time is a sound triple check, and branch refs survive `worktree remove` regardless.

**What it destroyed without noticing — ignored files.** `git status --porcelain` (line 44) does not list ignored paths, and `git worktree remove` does not refuse on them. Across 79 removed worktrees, everything matched by `.gitignore` — `.env` files, local SQLite databases, scratch configs, uncommitted notes in ignored dirs, submodule working-copy state — was deleted with zero output. This is the "what could it have destroyed that nobody would notice" answer: **nobody would notice, because git never tracked it.**

**Latent flaw now landing on `main`:** line 42 uses `JSON.stringify(w.branch)` as shell quoting. It is not. `"$(...)"` and backticks survive double quotes in sh/bash; `%VAR%` survives in cmd.exe. `safeRef` exists in lane-core.mjs:87 precisely because refnames can be shell-active; this script doesn't use it. Benign branch names meant nothing fired *this time*; the code should not be merged as-is.

**No record.** Lines 54–55: an irreversible 79-deletion operation logged to stdout only. If nobody tee'd it, there is no inventory of what was removed.

**Detection, now:**
1. `git worktree list --porcelain` — reconcile survivors against any captured dry-run output.
2. Tracked work: `git fsck --lost-found`, `git branch -vv`, `git log --all --oneline` — expect clean, per the ahead-check.
3. Ignored files: undetectable via git. Cross-reference `.gitignore` patterns against the 79 paths; check Volume Shadow Copy / Previous Versions on the parent directory, OneDrive/File History if enabled. Recycle Bin is useless — programmatic deletes bypass it.
4. Injection exposure: `git branch -a --format='%(refname:short)'` and flag anything outside `[A-Za-z0-9._/-]`.
5. `git stash list` — stashes live in the common dir and survive; they may now reference removed worktrees.

## 4. Remaining race: `release()` is a non-atomic read-modify-write

**`scripts/lane.mjs:117 → :150`.** `readFileSync` → transform → `atomicWrite`. tmp+rename makes each write atomic but the *sequence* is not. A concurrent `claim()` between the read and the rename is overwritten by the release — the new locks vanish while `claim` already printed "claimed". Same-lane concurrency is real in your setup: an agent's subagent or Stop-hook releasing while the main loop re-claims. Fix: claim/release of the same lane need a lockfile or a compare-and-swap retry loop (read mtime, re-stat before rename, retry on change). The advisory lock-clash TOCTOU in the push hook (read lanes, then push) is inherent and by design — don't chase it.

## 5. Push advisory — false negative that matters

**Pre-execution state analysis (push-blast-radius.mjs:59, :80).** PreToolUse fires *before* the command runs. `git checkout main && git push` — a completely routine agent compound command — is analyzed against the *current* branch: `branch` is `feature-x`, `targetsDeployRef` is false, the diff is computed for the wrong HEAD. The push to deploy-linked `main` goes through with an advisory that says nothing scary, or nothing at all. Cheap fix: if `bare` matches `checkout|switch|merge|reset|rebase` anywhere before `push`, set a rangeNote and treat as deploy-linked-unknown.

**Missing execution vectors (line 30–38).** `render.yaml` runs `npm install` → `package-lock.json` and `.npmrc` both control what executes at build; neither is listed. A lockfile-only change repointing a dependency executes at build with no advisory.

**False positives that will get it disabled:** `/\.sql$/i` (line 33) fires on test fixtures and doc snapshots repo-wide; and the first-push fallback `origin/main...HEAD` (line 76) diffs an entire long-lived branch's history, so the advisory fires on pushes containing zero new commits. Both are high-frequency in a real repo.

## 6. Merge blockers

1. **lane.mjs:58** — `null→0` false "pushed-branch". The incident's bug class on the incident's field. Block.
2. **lane-core.mjs:130** — silent drop of bare-directory locks, plus the `./`/absolute/space-token cluster. Block; fix with existence-based validation, not shape regexes.
3. **prune-worktrees.mjs must not land on `main` as written** (line 42 shell quoting) — drop it from the PR or route through `safeRef`, and run the §3 detection pass first.
4. **push-blast-radius.mjs** — compound-command pre-execution mislabeling + add `package-lock.json`/`.npmrc` to `EXECUTES_ON_PUSH`. Cheap; do before merge.
5. **release() race** (lane.mjs:117–150) — fix or document as known-limitation with a follow-up ticket before the merge closes.
