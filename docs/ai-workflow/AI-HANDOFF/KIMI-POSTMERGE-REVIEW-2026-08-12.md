# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COORDINATION-POSTMERGE-REVIEW-PACKET-2026-08-12.md
**Seed:** (none)
**Tokens:** 15755 in / 15377 out | **Cost:** ~$0.2779 | **Wall:** 499.5s | **finish_reason:** stop

---

# Post-merge hostile review — Round 4 findings

**Revert verdict up front: nothing here warrants a revert.** Every new finding is a false-negative / fail-silent in an advisory layer; reverting resurrects the twelve fixed defects, which are strictly worse. Two findings (F1, F2) are urgent patches. Ranked by cost × likelihood below.

---

## F1 — Identity is agent×worktree, not per-session: same-worktree concurrent sessions clobber one lane (CRITICAL × HIGH)

**`scripts/lib/lane-core.mjs:75–88`** — `laneName` is `${agent}--${slug}.lane.md`. The slug discriminates *worktrees*, nothing discriminates *sessions*. Two concurrent Claude sessions in the same worktree — which on the **main tree is the normal case** (`vs-claude--main.lane.md`) — write the same file. This silently reintroduces fixed defect #2's exact failure mode (last-writer-wins, surviving file reads as authoritative) in the one location where concurrency is most likely.

Compound effects, all verified in the shipped code:

- **`lane.mjs:97–119`** — `claim()` got no concurrency guard (compare the mtime re-stat added to `release()` at `129`/`163–167`). A full-file overwrite with zero detection. The guard was added to the wrong operation.
- **`push-blast-radius.mjs:102–105`** — `if (file === mine) continue;` — session B's push hook skips session A's locks **as its own**, because they share a lane name. The lock-clash advisory is structurally blind to the most likely collision pair.
- **`lane-core.mjs:186`** — digest marks the shared lane `self: true` for both sessions; each sees "no fresh locks held by other agents."
- **`SKILL.md §3`** promises "one lane per SESSION, never per agent name." The implementation does not deliver the documented protocol. This is also a doc/code defect (see F5).

**Fix:** append a session discriminator to `laneName` (session id env var, or pid+start-time hash). Small diff, one file.

---

## F2 — The sixth parsing/consumer defect class: writer/reader format asymmetry in `release()`, plus mtime resurrection (HIGH × MEDIUM)

`parseLane` is deliberately format-agnostic — `*`/`+` bullets, numbered lists, checkboxes, fenced blocks (`lane-core.mjs:121–146`, comments cite a *live lane* that used a fence). **`release()` clears only `- ` bullets:**

- **`lane.mjs:150`** — `while (... lines[end].trim().startsWith('- '))` stops at the first `* a.ts`, `1. a.ts`, or ```` ``` ```` line. Those locks survive in the file and remain fully parseable by every consumer.
- **`lane.mjs:157–159`** — the "leftover" safety check only inspects a window of `removed + 2` lines and only for `- `-prefixed entries. A `* b.ts` lock one line past the window is never examined, so the warning at `160–162` never fires. **release() prints "released" while leaving live locks — the reports-success-while-doing-nothing class.**
- **The resurrection multiplier:** `release()` rewrites the file (`lane.mjs:168`), bumping mtime. Freshness is mtime-based (`lane-core.mjs:187`), and `digest()` filters on `ageMin <= FRESH_MIN && l.locks.length` (`lane.mjs:178`) with **no `Status: idle` check**. So a failed clear doesn't leave *stale* phantom locks — it converts them into **LIVE** locks for another 120 minutes, precisely because release ran.

Sibling under-report in the same class: **`lane-core.mjs:116`** breaks the section on any subheading. An agent that structures its locks as `## EDITING NOW` / `### backend` / `- a.ts` parses to **zero locks** — the entire section invisible. `release()`'s loop dies on the same line. Section-boundary logic was written against the claim template, not against what parseLane accepts.

**Fix:** make `release()` consume exactly what `parseLane` would return as locks (ideally: call `parseLane`, rewrite by exclusion), and extend the leftover check to the parsed lock list, not a bullet-style heuristic.

---

## F3 — settings.json wires every hook by relative path; the repo's own postmortem documents cwd ≠ repo root (HIGH × MEDIUM)

**`.claude/settings.json`** — every command is `node scripts/hooks/…`. **`lane-session-start.mjs:8–13`** is the team's own verified evidence that hook execution with cwd = `backend/` is a real condition on this machine ("running this from `backend/` produced zero output"). That condition was patched *inside one script* but the wiring layer still assumes it away. When cwd isn't the project root:

- The **PreToolUse blast-radius hook** — per `SKILL.md §6`, currently *the only thing* between an agent and an unreviewed production migration — fails to launch. A failed PreToolUse hook produces no output and no block: the push proceeds **unchecked and silent**, indistinguishable from a clean pass. Founding failure class, at the wiring layer.
- Same for `lane-session-start.mjs` itself: orientation believed, not happening — the exact bug its v2.1 comment describes, one level up.

**Fix:** prefix all commands with `$CLAUDE_PROJECT_DIR` (or absolute resolution). One-line change per hook.

---

## F4 — Push hook detects `git -C <path> push` but analyzes the wrong repository (HIGH × MEDIUM-LOW)

**`push-blast-radius.mjs:59`** explicitly admits `-C \S+` in the git-prefix pattern, so `git -C ../other-worktree push` fires the hook. Then **lines 61, 84, 88, 101–108** run `git rev-parse`, `git diff`, and `ledgerDir()` against `process.cwd()` — a different repo/worktree than the one being pushed. Branch, deploy-linked flag, diff, and lock-clash all describe the wrong tree and are printed as fact with no disclosure (unlike `switchesBranch`/`explicitRefspec`, which disclose). With ~110 worktrees, `git -C` is the natural way to push across them; this is a wrong-repo analysis presented as reassurance on the deploy-guard path.

Same line, false-negative half: long options with separate arguments (`--git-dir <path>`, `--work-tree <path>`, `--namespace <n>`) match none of the alternation branches, so `git --git-dir /repo/.git push` is **not detected at all** — silent return on a real push. (Distinct from fixed defect #11's three enumerated false negatives.)

**Fix:** extract `-C`/`--git-dir` and pass as `cwd`/arg to every `sh()` call, or refuse analysis with a disclosure. Tighten the prefix pattern.

---

## F5 — SKILL.md misstates the shipped implementation (MEDIUM × CERTAIN — already wrong)

- **§3:** "The hash is **six characters** of the worktree's full path" and the example lane name shows 6 hex. Code emits **ten** (`lane-core.mjs:84`, `.slice(0, 10)` — widened in fix #12, doc never updated). Any agent or tooling constructing/expecting lane names per the doc will not find real lanes.
- **§5:** "The lane's `Delivery:` field is **computed from git on every read**, never asserted by you." False. `deliveryState()` runs on `claim` (`lane.mjs:101`), `release` (`123`), and for the *self* line of `digest` (`180`). Every *other* lane's `Delivery:` field is file content frozen at its last write. An agent reading a peer's lane to judge whether work is safe to build on gets hours-old state, under a doc that explicitly says "never asserted."
- §6 forbids `git add -A` while another lane holds a lock; no hook anywhere observes `git add`. Doc asserts a protocol invariant the tooling cannot see, let alone enforce.

**Fix:** doc patch; cheap.

---

## F6 — Git-quoted diff paths bypass every anchored `EXECUTES_ON_PUSH` regex (HIGH × LOW-MEDIUM)

**`push-blast-radius.mjs:88–96`** — `git diff --name-only` with default `core.quotePath` C-quotes unusual paths: `backend/migrations/014 add col.sql` arrives as `"backend/migrations/014 add col.sql"` and `^backend\/migrations\/` (line 31) does not match. A migration whose path contains a space or non-ASCII character produces **zero output on a production-migration push** — the hook's own worst case, silent. The quoted form also degrades `lockMatches` (line 109). **Fix:** `git diff --name-only -z` (or `-c core.quotePath=false`) and split on NUL.

---

## F7 — Deploy-ref detection misses full refspecs (MEDIUM × MEDIUM)

**`push-blast-radius.mjs:68`** — `main` must be preceded by start/whitespace/colon. `git push origin HEAD:refs/heads/main` has `main` preceded by `/` → no DEPLOY-LINKED flag; only the generic `explicitRefspec` disclosure (line 79) fires, which says "file list may differ" but not "this targets production." **Fix:** strip `refs/heads/`/`refs/tags/` prefixes before the token test.

---

## F8 — Scale-only: unbounded ledger growth against a 15s hook budget (MEDIUM × LOW, monotonically rising)

Rule 34 forbids deletion, so lane files accumulate forever; `activity.log.md` grows on every claim/release (`lane.mjs:93–95`) and can never be pruned — `doctor` will flag it >128 KB (`lane.mjs:221–226`) *eternally*, a permanent unresolvable warning (fatigue generator). Every push advisory and every SessionStart `readdirSync`s and fully parses all lane files (`lane-core.mjs:181–191`) plus 3–7 git subprocesses, on a Windows box with AV/indexers, under `timeout: 15` (`settings.json`). A timed-out PreToolUse hook emits nothing — the guard silently stops running on exactly the busy days it exists for. No rotation/compaction story exists. **Fix:** cap digest/advisory parsing (mtime-sorted top-N), rotate `activity.log.md` by rewrite-not-delete semantics, and have `doctor` report *trend*, not a static threshold it can never clear.

---

## F9 — Minor, cited for completeness

- **`lane-core.mjs:169` + `180`:** the extensionless existence check resolves against the **main tree** root, not the claiming worktree. A brand-new extensionless lock target existing only in a linked worktree is silently dropped.
- **`lane.mjs:57`:** squash-merged branches never satisfy `--contains HEAD` → permanent `local-commit`/`pushed-branch`. Fails toward over-caution; acceptable, but the state vocabulary in §5 implies coverage it doesn't have.
- **`lane.mjs:163–168`:** residual TOCTOU — the mtime re-stat precedes `atomicWrite`; a claim landing between them is still erased. Window is small; the guard is theater against the exact interleaving it names, and F1 makes that interleaving likely.

---

## Revert assessment

**Patch, don't revert.** F1 is the closest call — it silently recreates the reviewers' own worst-ranked class (false-negative collision detector) — but v1 had the same disease worse (bare agent name across *all* worktrees), so the shipped state is still net-positive, and the fix is a one-line lane-name discriminator. F2 and F3 are small, isolated diffs. Nothing in this merge makes the pre-merge baseline worse; it under-delivers on its own documentation. Independent of all of the above: the two hooks and the doc itself repeatedly state the only real control is server-side branch protection on `main` — these findings (F3, F4, F6 especially) are eleven more reasons that remains true.
