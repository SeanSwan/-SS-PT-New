# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COORDINATION-LEDGER-IMPL-REVIEW-PACKET-2026-08-12.md
**Seed:** (none)
**Tokens:** 8523 in / 13345 out | **Cost:** ~$0.2257 | **Wall:** 191.8s | **finish_reason:** stop

---

# Hostile Implementation Review — Coordination Ledger v2 (2092af72e)

Ranked by cost × likelihood. All line cites are to the packet as given.

---

## P1 — High cost, high likelihood

### 1. MSYS `/c/` path form is never normalized — the ledger forks to a bogus directory, silently
**`lane.mjs:57–62`, `push-blast-radius.mjs:78–79`, `tree-sentinel.mjs` (LEDGER_DIR IIFE)**

`resolve(common, '..', ...)` assumes `git rev-parse` returns a Windows-native path. Your own environment facts say paths mix `C:/` and `/c/` forms. If git is MSYS-flavored, `common` = `/c/repo/.git`. Node's `resolve()` on Windows treats that as drive-relative: `resolve('/c/repo/.git', '..')` → `C:\c\repo` → LEDGER = `C:\c\repo\.ai-workflow\coordination`.

Then:
- `claim()` at `lane.mjs:126` does `mkdirSync(LEDGER, {recursive:true})` — it **creates** the phantom ledger. No error, ever.
- `digest()` reads the same phantom path, finds nothing, prints "no fresh locks held by other agents" (`lane.mjs:182`).

This is the exact v1 failure the header (lines 10–12) claims to have killed — "9 published lane files sat in worktree-local dirs no other agent could ever read" — resurrected via path form instead of cwd. Coordination believed, and void. There is no `/^\/[a-zA-Z]\//` → `X:/` rewrite anywhere in the packet.

### 2. Case-sensitive path equality decides session identity
**`lane.mjs:74`, `push-blast-radius.mjs:85`, `lane.mjs:195`**

`IS_MAIN = resolve(sh('git rev-parse --show-toplevel') || '.') === resolve(LEDGER, '..', '..')` is a raw string `===` on Windows, a case-insensitive filesystem. `C:\Repo` vs `c:\repo` (git's output casing vs. how the shell was invoked) → `IS_MAIN` false **in the main tree** → SLUG becomes the directory basename instead of `main` → the same agent in the same tree publishes under a different lane name depending on how the shell was launched. Two sessions, one identity, two lane files — the collision class this rebuild exists to kill, per your own line 17. Same bug at `push-blast-radius.mjs:85` (computes `mine` wrong → own lane not skipped → self-clash false positive) and at `lane.mjs:195` (doctor flags the canonical ledger as an orphan).

### 3. `lane-session-start` resolves the script cwd-relative — orientation silently never happens
**`lane-session-start.mjs:21`**

`execSync('node scripts/lane.mjs digest', ...)` only works if the session's cwd is the repo root. An agent starting in `backend/`, or in any subdirectory, gets `ENOENT` → caught at line 28 → exit 0, **nothing printed**. This is precisely the failure mode the header (lines 10–13) wrings its hands over: "it will be IGNORED, which fails silently while everyone believes orientation is happening." The code manufactures that belief. The script path should be resolved from the hook file's own location (`import.meta.url`) or from `git rev-parse --show-toplevel`. As written, the doc's core promise — "an agent is oriented before its first edit" (line 6) — is delivered only when cwd happens to cooperate.

### 4. `release()` regex silently no-ops on CRLF files — "released" lanes keep their locks
**`lane.mjs:157`**

`.replace(/## EDITING NOW\n[\s\S]*?(?=\nNext intent:)/, ...)` requires a bare `\n`. Your environment facts state files are CRLF. On a CRLF lane file, `## EDITING NOW\r\n` does not match `## EDITING NOW\n`, and the lookahead `\nNext intent:` does not match `\r\nNext intent:`. The replace silently does nothing, `atomicWrite` still runs, line 160 prints `[lane] released.` — and the EDITING NOW section, with all its locks, is still in the file. Every other agent's digest shows phantom live locks for up to 120 minutes. Fail-silent on the exact operation whose output other agents act on. (The `^Status:`/`^Updated:` replaces at 154–156 survive because `.` matches `\r`; only 157 is broken — which makes it harder to notice.)

### 5. Push hook conflates "nothing to push" with "git failed" — fail-open on the load-bearing diff
**`push-blast-radius.mjs:32–35, 68–70`**

`sh()` swallows every error into `''`. Then:

```js
const changed = sh(`git diff --name-only ${remoteRef}...HEAD`).split('\n').filter(Boolean);
if (!changed.length && !forced && !leased) return;
```

If `origin/main` doesn't exist (fresh repo, pruned remote, first push), if the index is locked, if git errors for any reason — `changed` is `[]` and the hook returns silently at line 70. A push carrying `backend/migrations/0014_drop.sql` to a deploy-linked branch produces **zero output**. The header (line 20) promises "it makes the agent find out before the push, not after the deploy." When git hiccups, the agent finds out after the deploy. There is no distinction between "diff empty" and "diff failed," and no stderr breadcrumb when the guard disabled itself.

---

## P2 — High cost or high likelihood

### 6. The hook inspects HEAD, not the ref being pushed
**`push-blast-radius.mjs:61–69`**

`git push origin feature-x:main`, `git push --all`, `git push origin v2.0` — the diff range is always `${remoteRef}...HEAD`. Push a different ref than your checked-out HEAD and the hook evaluates the wrong commits; migrations in the pushed ref are invisible. The header (lines 17–19) explicitly enumerates "tag-triggered releases" as the same irreversible act — and then the code never parses the refspec at all. A doc claim the code does not deliver, and a false negative on the highest-blast-radius pushes.

### 7. Lock-clash matching is defeated by Windows path reality
**`push-blast-radius.mjs:93–96`**

`changed.some((c) => c === lock || c.startsWith(stem))` compares git's forward-slash, exact-case output against agent-authored prose. Failures:
- Lock written `src\db\foo.ts` (backslashes, natural on Windows) → never matches → clash invisible.
- Lock `Src/Index.ts` vs changed `src/index.ts` → case mismatch → invisible.
- `stem = lock.replace(/\/\*\*.*$/, '')` handles `src/**` but not `src/*` — single-star globs never match anything.
- `git diff --name-only` C-quotes paths with non-ASCII/space characters (`core.quotePath`), so `c === lock` fails for those files too.

The R6 lock-clash advisory (line 119) is the only cross-agent check in this hook, and it silently degrades to exact-string equality on a case-insensitive, separator-ambiguous filesystem.

### 8. Identity derivation is implemented twice and has already drifted
**`lane.mjs:72` vs `push-blast-radius.mjs:86`**

lane.mjs: `SWAN_AGENT_SURFACE || CLAUDE_AGENT || 'vs-claude'`.
push-blast-radius: `SWAN_AGENT_SURFACE || 'vs-claude'` — `CLAUDE_AGENT` dropped.

A lane claimed with `CLAUDE_AGENT=codex` (SWAN unset) is `codex--main.lane.md`; the hook computes `mine` as `vs-claude--main.lane.md`, fails to skip it, and warns you about *your own* locks — while the comment at lines 80–83 congratulates itself for fixing exactly this class of bug. `lane-session-start.mjs:15` claims "ONE implementation of ledger truth"; there are three (lane.mjs, this hook, tree-sentinel), and two have already diverged. The 120-minute freshness constant is also duplicated (`lane.mjs:165`, `push-blast-radius.mjs:90`).

### 9. SLUG collisions reintroduce shared lane files — "one file per SESSION, never shared" is not delivered
**`lane.mjs:73–76`**

`WORKTREE = basename(toplevel)`. With 184 worktrees, two checkouts named `repo` under different parents (`C:/wt/feat-a/repo`, `C:/wt/feat-b/repo`) produce the same SLUG → same `LANE_NAME` → `claim()` at line 145 overwrites the other session's lane via `atomicWrite`. Last-writer-wins — the precise v1 regression described in the header (lines 13–16). Additionally, a linked worktree whose directory is literally named `main` gets `SLUG = 'main'` and collides with the main tree's lane. The doc claim at line 17 ("one file per SESSION, never shared") is false; identity is agent + *basename*, not agent + worktree.

### 10. `EDITING NOW` section parsing splits on the first case-insensitive occurrence — including prose
**`lane.mjs:105`, `push-blast-radius.mjs:91`, `tree-sentinel.mjs` (same pattern)**

`src.split(/EDITING NOW/i)[1]` takes the segment after the **first** match. A task line like `Task: stop editing now button handlers` (Task precedes the heading in the claim body) puts index `[1]` mid-task-line; the real lock section is never parsed → locks silently absent from digest and from the push hook's clash check. False negative via false positive, in all three implementations. Also: any pre-v2 lane file lacking the `## EDITING NOW` heading parses to zero locks with no warning — the nine already-published lanes your header mentions are invisible to the new digest.

---

## P3 — Lower likelihood or lower cost, still real

### 11. Branch names are interpolated into shell commands — and `$ ( ) ;` are legal in git refnames
**`lane.mjs:86–91`, `push-blast-radius.mjs:68`**

`git-check-ref-format` forbids space, `~ ^ : ? * [ \` — but **allows** `$`, `(`, `)`, `;`, backtick. A branch named `x;touch pwned` or `$(cmd)` is a valid ref. `sh(\`git rev-parse --verify --quiet origin/${branch}\`)` runs it through cmd.exe. Requires an attacker who can name branches in your repo — but lane files and tool_input are explicitly in your threat model ("attacker-ish input"), and branch names are no cleaner.

### 12. Force-push detection: false positives from quoted text, false negatives from combined short flags
**`push-blast-radius.mjs:62`**

`/--force(?!-with-lease)|(?:^|\s)-f(?:\s|$)/.test(cmd)` runs against `cmd`, **not** the quote-stripped `bare` computed at line 58 — the stripping the comment at 54–57 exists for. `git commit -m "try -f first" && git push` flags 🔴 FORCE PUSH. Conversely `git push -uf` and `git push -fv` match neither alternative → force push undetected. Both directions of wrong in one regex.

### 13. `deployLinked` matches `main` inside other tokens
**`push-blast-radius.mjs:64`**

`\b(main|master|production)\b` — `-` is a non-word character, so pushing branch `feature/main-fix` or `production-notes` flags ⚠ DEPLOY-LINKED. Also tested against raw `cmd` including quoted strings. The advisory's rarity is its entire value per your own header (lines 22–23, 56–57); this spends it.

### 14. Push-trigger regex: false positives on non-push subcommands, false negative on case
**`push-blast-radius.mjs:59`**

`/\bgit\b[^|;&]*\bpush\b/` fires on `git config push.default simple`, `git log --grep=push`, `git remote show origin` output containing "push" — any git command with `push` as a later word. And there is no `i` flag: on Windows, where cmd.exe is case-insensitive and `GIT PUSH` executes fine, the hook is silent. Both flaws survive the quote-stripping the comment brags about.

### 15. Unknown subcommand silently runs `digest` and exits 0
**`lane.mjs:213`**

`({...}[CMD] ?? digest)()` — `node scripts/lane.mjs claime --task x` (typo) prints a digest, exits 0, no lane claimed. The agent believes it published; nobody else can see it. Silent failure on the primary write path, one keystroke away.

### 16. `claim()` can hard-fail on Windows rename, contradicting the exit-code contract
**`lane.mjs:115–119, 33`**

`renameSync(tmp, path)` on Windows throws EPERM/EEXIST when the destination is held open (antivirus, indexer, a concurrent reader mid-`readFileSync`). `claim` has no try/catch → unhandled exception, exit 1, claim lost. Header line 33 documents "Exit codes: 0 ok · 2 not a git repo." Crash-leaked `${path}.tmp-${pid}` files accumulate; `doctor`'s rot check (`lane.mjs:199–201`) only flags non-lane files over 128 KB, so small tmp litter is never reported.

### 17. tree-sentinel changes the `lanes` JSON shape with no migration
**`tree-sentinel.mjs` diff, lanes construction**

`lanes[agent]` goes from `string | string[]` to `{ageMin, locked: string | string[]}`. The `--json` consumer (the `JSON_MODE` branch above the shown hunk) now emits a different schema. Anything parsing tree-sentinel JSON breaks at runtime, silently if it tolerates missing keys. Also note tree-sentinel's `LEDGER_DIR` is built by string concatenation (`${common}/../...`) with no `resolve()` and the same `/c/` vulnerability as finding 1, and its fallback (`${ROOT}/.ai-workflow/coordination`) reintroduces the cwd-relative v1 bug whenever `git rev-parse` fails.

### 18. "It cannot fake an mtime" is overstated
**`lane.mjs:98–99`, `tree-sentinel.mjs` freshness comment**

`touch` / `utimes` fake mtimes trivially, and `release()` itself bumps mtime (line 155 rewrites the file) — so a released-then-reclaimed lane's freshness reflects the last write, not the last *intent*. Advisory-only, so low cost, but the doc presents mtime as unforgeable ground truth and it is neither unforgeable nor intent-bearing.

### 19. Quote-stripping doesn't handle escaped quotes
**`push-blast-radius.mjs:58`**

`/"[^"]*"/g` on `git commit -m "say \"push\" loudly"` leaves a bare `push` outside the stripped regions → spurious trigger. Minor, but it's the same false-positive class the comment at 54–57 claims was verified dead.

---

## Doc claims the code does not deliver (summary)

| Claim | Where claimed | Why it's false |
|---|---|---|
| "one file per SESSION, never shared" | lane.mjs:17 | SLUG = basename; collisions + `main`-named worktrees share files (finding 9) |
| "makes the agent find out before the push, not after the deploy" | push-blast-radius:20 | Silent return on git failure (5); HEAD-only diff ignores refspecs/tags (6) |
| "ONE implementation of ledger truth" | lane-session-start:15 | Three parsers, already drifted (8, 10) |
| "an agent is oriented before its first edit" | lane-session-start:6 | cwd-relative script path; fail-open hides all failures (3) |
| "it cannot fake an mtime" | lane.mjs:99 | `touch`; release() bumps mtime (18) |
| "Exit codes: 0 ok · 2 not a git repo" | lane.mjs:33 | Unhandled renameSync throw exits 1 (16) |
| "tag-triggered releases… perform the same irreversible act" (as motivation) | push-blast-radius:19 | Tag pushes never inspected (6) |

**Fix order:** 1, 3, 5 (silent voids — the system reports health while coordinating nothing), then 2, 4 (wrong data presented as fact), then 6–9 (the advisory's actual recall), then the rest.
