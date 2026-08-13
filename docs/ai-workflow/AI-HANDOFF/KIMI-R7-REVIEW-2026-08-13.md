# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/COORDINATION-R7-PACKET-2026-08-13.md
**Seed:** (none)
**Tokens:** 5391 in / 12465 out | **Cost:** ~$0.2031 | **Wall:** 319.4s | **finish_reason:** stop

---

# PART A — Hostile review of the v2.6 delta

## A1. The quoted-token-is-an-explicit-lock rule mints locks from prose. This is a live regression, not a hypothetical.

The new rule short-circuits the entire commentary check:

```js
if (!pathish(toks[0].text)) return [];
if (toks[0].quoted) return [toks[0].text];   // ← no commentary check survives this
```

`pathish` accepts extensionless single words — it has to, your own fixture pins `Dockerfile`. So this line:

```
- "backend" is where I work
```

parses as: `toks[0]` = quoted `backend`, pathish → true, quoted → **lock on the entire `backend/` tree**, minted from a prose sentence. The old code dropped this line (quoted runs were hoisted, then the remainder `is where I work` failed the commentary check → `[]`). The new code locks it. Same for `- "src" needs a rebase`, `- "Dockerfile" is next on my list`.

The dangerous part is that **the fixture pins this in**. `quoted path + plain note` asserts the happy path, and no case covers a quoted *pathish single word* followed by prose — so the next refactor that widens the rule further stays green, and a reviewer who reads the suite concludes the behavior is contractual. The rule as implemented is "quoting = deliberate lock, unconditionally." The defensible rule is narrower: quoted **and** (contains a space, or contains `/`, or has an extension) → explicit lock; otherwise fall through to the commentary check. As shipped, quoting a directory name in a sentence is a tree-wide lock.

**Severity: P1.** It manufactures the over-lock class — the fatigue class — from the most common prose shape there is: quoting a noun.

## A2. The idle walk's stop condition reads Status out of nested subsections.

```js
for (let i = parent + 1; i < head; i += 1) {
  const hl = headingLevel(all[i]);
  if (hl && hl <= lvl) { stop = i; break; }
}
```

A heading's preamble ends at its **first child heading of any level deeper than the parent**, or at any heading of level ≤ the parent. The correct stop is `hl > 0` — any heading at all. The code stops only at `hl <= lvl`. So with parent `#` (level 1) and section `## EDITING NOW` (lvl 2), a `#### Notes` block sitting in the parent's preamble does **not** stop the scan, and a `Status: idle` written under that `####` governs the live section's locks. Weird nesting, yes — but hand-edited lanes are exactly where weird nesting lives, and the whole point of this walk was hand-edited lanes. The fixture has no case with a heading nested between parent and section at level > lvl.

Second hole in the same walk: **first-Status-wins within the own-body scan.** `scope.map(...).find(...)` takes the first `Status:` in the block. A hand edit that appends `Status: in-progress` below a stale `Status: idle` in the same block stays idle — live locks suppressed, same suppression class as the round-6 headline, one heading narrower. Either last-wins or any-`in-progress`-wins is defensible; first-wins is the one choice that favors suppression.

Third: nothing strips fences before the Status scan. If `body` carries fenced content (your own fixture proves fenced blocks reach the parser), a documented example `Status: idle` inside a fence in the section body governs. Unverified because `body`'s construction isn't in the diff — which is itself the point: **the fixture has no Status-in-fence case**, so this can't be caught either way.

## A3. The fixture's real-corpus section pins nothing, and vanishes on a fresh clone.

The advisory block asserts exactly one thing: `activeLocks` doesn't throw. All 12 real lanes could parse to `[]` — total lock suppression across the entire live ledger — and the suite stays green. There is no count assertion (`files.length === 12`), no golden snapshot of expected locks per lane, nothing. And because the ledger is gitignored (your own item 5!), on any fresh checkout `existsSync(ledger)` is false and the entire section silently skips. The corpus that "is the only thing that breaks that cycle" is conditional on a directory that version control pretends doesn't exist. This is the fixture's largest hole and it is structural, not a missing case.

Other missing cases, in descending order of how much the next refactor will enjoy them:

- **No adversarial quoted-prose case** (A1 — the regression ships green).
- **No unterminated quote.** `- "backend/a.ts` tokenizes as the literal `"backend/a.ts` via `\S+`, almost certainly fails pathish, lock dropped — the unsafe direction — with no test.
- **No assertion on `task` at all.** `parseLane` returns three fields; the suite exercises two. A refactor that breaks task extraction or the 90-char truncation passes 47/47.
- **No idle-scoping case for the A2 holes**: nested heading between parent and section, duplicate Status in one block, Status in a fence.
- **Nothing covers the sibling-anchor fix in `digest()`**, because `digest()` lives in `lane.mjs` and the fixture only imports `lane-core.mjs`. Which brings me to:

## A4. The sibling fix narrowed the over-match; it didn't end it, and it's untested.

```js
const stem = ME.laneName.replace(/-s[A-Za-z0-9]+\.lane\.md$/, '')...
x.file.startsWith(`${stem}-s`)
```

`-s[A-Za-z0-9]+` is not a session-ID pattern; it's "any suffix starting with -s." A worktree named `main-sandbox` produces lane `main-sandbox.lane.md`, whose stem strips to `main` — and which itself matches `startsWith('main-s')`, so it is reported as a session sibling of every real `main-s*` session lane. False notice, fatigue class, in the fix for the false notice, shipped in the same commit as the fixture built to catch exactly this — and unreachable by the fixture because `digest()` isn't in the tested module. Pin the actual session-ID shape the tool generates (length and charset, e.g. `-s[A-Za-z0-9]{6}`) and move the sibling filter into `lane-core` where the suite can see it.

## A5. The prune invocation can destroy the log it exists to save, and its failure is invisible by design.

```js
try { if (existsSync(PRUNE)) execFileSync(process.execPath, [PRUNE], { stdio: 'ignore', timeout: 10_000 }); } catch { }
```

Three problems, worst first:

1. **`timeout: 10_000` kills prune mid-rewrite, and the kill is most likely on the exact run the change exists for.** The log "grew unbounded" — so the first session start after this deploy runs the most expensive prune there will ever be, under a 10-second ceiling, synchronously. If `coordination-prune` rewrites `activity.log.md` non-atomically (read → `writeFileSync`), the SIGTERM lands between truncate and write and the append log is gone. The comment says "retention is not worth failing orientation" — a killed-mid-write prune doesn't fail orientation, it corrupts the ledger's history. Two acceptable shapes: prune writes tmp+rename (verify this — if it doesn't, that is the finding), or the hook spawns it detached and does not wait.
2. **`stdio: 'ignore'` + empty catch is the silent-failure pattern this same file's own catch block warns about.** If prune starts failing (and after a mid-write kill, it will), nobody ever finds out; doctor's unclearable warning returns and the fatigue loop you cited as motivation resumes. Write a last-run marker; let doctor check its mtime.
3. **Fan-out race.** Every session start in every worktree invokes prune against shared append logs. Two concurrent sessions = two read-modify-write passes with no lock. If prune has no flock, session-start is the worst possible invocation point.

---

# PART B — Executable plan for 1, 2, 3, 5, 6, 8

## Item 1 — Branch protection on `main`

- **Owner: Sean-only.** It needs repo-admin credentials, and the rule content is a policy decision (require PRs? which status checks? enforce for admins?). An agent holding a token with admin scope could technically PUT it, but "which checks are required" is not engineering.
- **Steps (for Sean, or agent with Sean's admin token and a signed-off ruleset):**
  ```bash
  gh api repos/{owner}/{repo}/branches/main/protection -X PUT --input protection.json
  gh api repos/{owner}/{repo}/branches/main/protection > /tmp/proof.json   # read back
  ```
  Then a negative test: from a non-admin clone, `git push origin main` must be rejected; `git push --force` must be rejected.
- **Done-criteria:** the read-back JSON matches the intended ruleset, **and** both negative pushes fail with remote rejection messages. Not "the UI shows a shield icon."
- **Blast radius:** naming a required status check that doesn't exist blocks all pushes permanently until fixed; requiring PRs ends the push-to-main workflow Sean's batch plan assumes. Irreversible? No — but it can hard-block the repo mid-batch.
- **Order: dead last, after every push in this round has landed.** Enabling it before the batch push risks rejecting the batch.

## Item 2 — The 27-day lane and its 191 files

- **Owner: Sean-only for keep/discard; agent-executable for everything up to the decision and everything after it.**
- **Agent steps (no approval needed):**
  ```bash
  git worktree list --porcelain
  git -C <lane-wt> status --porcelain | wc -l
  git -C <lane-wt> diff --stat main...HEAD | tail -5
  git -C <lane-wt> log --oneline main..HEAD | head -20
  ```
  Produce a classified inventory: files by directory, by last-touched date, merged vs unmerged commits. Present it.
- **After Sean decides:** keep → rebase/merge path; discard → **first** `git -C <wt> add -A && git commit -m "archive: pre-discard snapshot" && git push origin archive/<lane-name>`, then `git worktree remove --force <wt>`, delete the branch, `node scripts/lane.mjs release`.
- **Done-criteria:** `git worktree list` no longer shows it; the lane file reads `Status: released` with empty locks (verify via `activeLocks`, not by eyeball); and either the diff vs main is empty (kept+merged) or the archive branch exists on origin (`git ls-remote origin archive/<lane-name>`) proving discard is reversible.
- **Blast radius:** discarding 27 days of work. The archive-branch push makes it reversible; without it, `worktree remove --force` on uncommitted files is gone work.
- **Order:** parallel with item 3; the inventory can be produced in the same pass as 3's classification.

## Item 3 — Worktree triage, 42 → under 20

- **Owner: agent-with-approval.** Classification is mechanical; removals are batch-approvable by class.
- **Steps:**
  ```bash
  git worktree list --porcelain
  for each: git -C <wt> status --porcelain
            git -C <wt> log main..HEAD --oneline | wc -l
  git branch --merged main
  ```
  Class A (clean + fully merged): agent removes after a single batch approval — `git worktree remove <wt>`. Class B (dirty or unmerged commits): archive-branch trick, then escalate to Sean with the diff stat.
- **Done-criteria:** `git worktree list | wc -l` < 20, **and** for every removed worktree there is a recorded proof line: either `git log main..<branch>` was empty at removal time, or an `archive/*` ref exists on origin. The proof log is the deliverable, not the count.
- **Blast radius:** same as item 2, multiplied by ~22. The archive step caps it.
- **Order:** parallel with 2. Both must finish before item 8's stop condition can be evaluated.

## Item 5 — Ledger: ungitignore or sanitized snapshot

- **Owner: Sean-only.** This is a decision with real consequences: committing an append-only coordination log that 42 worktrees all write is a merge-conflict generator, and lane files carry session metadata Sean may not want in history. The engineering (either way) is agent-executable once decided.
- **Recommended shape (agent-executable on approval):** keep the ledger gitignored; commit a sanitized snapshot:
  ```bash
  node scripts/lane.mjs snapshot --out coordination/snapshot.json   # task, locks, status only
  git add coordination/snapshot.json .gitignore && git commit
  ```
- **Done-criteria:** `git ls-files coordination/snapshot.json` non-empty; `git check-ignore -v <ledger path>` still shows it ignored (no leak); **and** the fixture's advisory block is rewired to read the committed snapshot so the real-corpus coverage survives a fresh clone — this closes A3 above. If Sean instead chooses ungitignore: `git check-ignore` returns empty and a trial append from two worktrees is shown to merge cleanly.
- **Blast radius:** ungitignore = perpetual append-only merge conflicts plus whatever is in those lane files, in history, forever. Snapshot path: near zero.
- **Order:** independent; do it before item 8 so the fixture upgrade lands in the same round.

## Item 6 — Kill the duplicate live session on the main tree

- **Owner: agent-with-approval.** Identification is agent-executable; killing a session and releasing its locks is destructive and needs one explicit yes.
- **Steps:** list lane files, find the two pointing at the main worktree; compare mtimes and `ageMin`; `ps aux | grep <agent>` to see which PID is actually alive. Present: "lane X last updated 3 minutes ago and has a live process; lane Y last updated 41 hours ago, no process." On approval: `node scripts/lane.mjs release --lane <Y>` (or remove the stale lane file).
- **Done-criteria:** exactly one lane references the main worktree; `digest()` emits no sibling notice for main; the stale lane's locks are provably released (`activeLocks` on it = `[]` or file gone); `node scripts/lib/lane-core.test.mjs` still exits 0 afterward.
- **Blast radius:** killing the *live* session instead of the stale one releases real locks while the session keeps editing — the exact silent-clash class the ledger exists to prevent. The mtime/process proof before acting is not optional.
- **Order:** independent of 1/2/3/5; before 8.

## Item 8 — Stop and go back to the product

- **Owner: Sean-only** (it's a prioritization call), but the stop condition is objective and checkable:
  1. Items 1–3, 5, 6 closed with their done-criteria artifacts produced (proof log, read-back JSON, `git ls-files` output).
  2. `node scripts/lib/lane-core.test.mjs` exits 0 — **after** the A1–A4 holes above are either fixed or explicitly accepted in writing.
  3. Session-start orientation and doctor show zero unclearable warnings.
  4. The meta-condition: the next product PR merges with no coordination-tooling change in its diff. The tooling has receded when it stops appearing in product commits.
  5. Timebox: any item blocked on Sean for more than 5 working days closes the round anyway, with the pending decision logged — the round must not be held open by an unanswered question.

## The honest answer on sequencing

**As ordered, the loop stalls on the first item.** 1, 2, 5, and 8 are decisions; only Sean can make them. Nothing about back-to-back execution changes that.

What *can* run back-to-back is everything up to each decision point. The executable order is:

1. **One agent pass, no approvals:** item 6 identification + item 3 classification + item 2 inventory. Output: a single approval document — "kill lane Y; remove these N merged-clean worktrees; these M need your eyes; the 27-day lane inventory is attached; ledger decision needed; protection ruleset drafted."
2. **One Sean sitting:** approve the batch, decide the lane, decide the ledger, sign the ruleset.
3. **Agent execution:** removals, lane release/discard with archive refs, snapshot commit, fixture upgrade for A1–A4.
4. **Push everything.**
5. **Item 1 last** — protection goes on after the pushes, or it may reject them.
6. **Item 8** against the stop condition.

So: not "stalls after two items" — it stalls after zero if run in numeric order, and runs clean if reordered so all Sean-gated decisions are collected into one approval gate. The only items that truly block on him are 1, 2, 5, and 8; 3 and 6 block on a single batched yes.
