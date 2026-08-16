# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/recon-review-packet.md
**Tokens:** 11064 in / 32000 out (reasoning: 27442) | total 43064
**Wall:** 483.4s

---

# Hostile review: `recon`

**Headline: the central safety claim — "every failure mode errs toward false-ABSENT" — is false.** I found four independent, reproducible paths to `already-landed` for work that is *not* on main (D1, D2, D3, D6). Two of them sit inside the exact functions that exist to prevent this. Details below, grouped by your remit.

---

## 1. Correctness of the equivalence layers

### D1 · CRITICAL · `equivalence.mjs:~59-77` (`reverseApplies`) — the flagship squash-merge detector checks the wrong tree
`git apply --reverse --check -` (no `--cached`, no `--index`) tests the patch against the **current working tree**, not against `base`. `deepConfirm` therefore asks "does whatever is checked out right now contain this branch's changes?" — a question about an arbitrary, mutating tree in a repo where you yourself say other agents are actively working.

Concrete false-LANDED scenarios:
- **Detached HEAD at the branch tip** (an agent inspecting it — not in `worktrees` branch set, so no `ACTIVE_LANE` masking): reverse-applying `diff base...tip` onto a tree identical to `tip` trivially succeeds → `reverse-apply:content-present` → `LANDED` → `[ARCHIVE]` "zero risk to retire". Branch deleted; the fix exists nowhere on main.
- **A successor branch is checked out** that contains the same changes (agent rebased/ported the work): old branch → `LANDED`, report says "already live on origin/main". False.

It also breaks the "deterministic" claim outright: two runs of `deepConfirm` on the same repo can disagree purely based on checkout state. And it fails in the *safe* direction too (base contains the content but the worktree drifted → false "content-absent"), which then **boosts confidence to HIGH** (see D17).

Your live run is affected: every `LANDED` carrying the signal `reverse-apply:content-present` is suspect.

**Fix:** test against base's tree via a temp index: create a temp `GIT_INDEX_FILE`, `git read-tree <base>`, then `git apply --cached --reverse --check --binary -` (generate the patch with `--binary` so binary hunks don't auto-fail). Clean up the temp file.

### D2 · HIGH · `equivalence.mjs:~160-175` (Layer 3) — `cherry.absent === 0` → LANDED HIGH is defeated by apply-then-revert on base
`git cherry` matches **patch-ids**, and a patch-id match says nothing about net content. Scenario: hotfix X is cherry-picked to main (commit A), then reverted next day (commit R) — routine "backed out pending investigation". Branch `hotfix/x` still holds X. Walk the layers: not an ancestor; `ahead = 1`; tree differs (main lacks X); cherry: X's patch-id matches A → `-` → `absent=0, present=1` → **`LANDED`, HIGH confidence**. Report: "[ARCHIVE] … zero risk to retire". The branch is the only surviving copy of X. Work lost — the exact catastrophic direction, and `deepConfirm` never re-checks it because it only runs on ABSENT/PARTIAL.

**Fix:** when `cherry.absent === 0`, require an independent *content* check against base before emitting LANDED (temp-index reverse-apply from D1, or tree comparison); otherwise emit PARTIAL/UNKNOWN with signal like `cherry-eq-only;content-mismatch`. Also note in passing: cherry ignores merge commits, which errs absent (safe) — fine.

### D3 · HIGH · `inventory.mjs:~27` (`%(refname:short)`) + all of `classify()` — ref-name ambiguity resolves tags before branches
`classify(item.ref, BASE)` passes **short names** into `merge-base`, `rev-list`, `diff`, `cherry`. Per `gitrevisions(7)`, `<name>` resolves `refs/tags/<name>` **before** `refs/heads/<name>`. Repo has tag `v2-payment` and branch `v2-payment` (release-tagging flows do this): every git call in the pipeline silently operates on the **tag**. If the tag points into main's history → `isAncestor` true → `LANDED` HIGH → branch archived regardless of its actual tip. Wrong in all directions, including the dangerous one. `%(refname:short)` can also produce mangled results for adversarial names like `refs/heads/origin/main`.

**Fix:** use `%(refname)` in `listBranches`, and classify with fully-qualified `refs/heads/<name>`; qualify the base too (`refs/remotes/origin/main`).

### D4 · HIGH · `equivalence.mjs:~192-207` + `rank.mjs:~86` — a failed `diffStat` silently zeroes the sensitivity floor → sensitive branch hits `[ARCHIVE] unmergeable-by-cost`
When `git diff --numstat` fails (pack rewrite / gc / lock contention under your 12-way parallelism — see §3), `ds` is null, `classify` proceeds with **no signal pushed and `rec.files = []`**, and cherry may already have said ABSENT. Then `neverAgeOut()` sees zero path hits, the name regex misses, and `(behind > 500 && realCommits <= 3)` fires → `COST` → `[ARCHIVE]`. This is your `storefront-special-leak` bug reintroduced through an unguarded failure path — your fix wired the helper in, but the helper's *input* can silently be empty due to a transient error.

**Fix:** in `classify`, if `ds === null` and equivalence is ABSENT/PARTIAL, push `diffstat:failed`, set `rec.error`, and demote to UNKNOWN. In `assignVerdict`, return UNKNOWN for any non-LANDED record with `error` set or (`fileCount === 0 && files empty && realCommits > 0`).

### D5 · MEDIUM · `equivalence.mjs:~152, ~205` — "tree-identical" / "net-diff-empty" prove net-zero delta, not "work landed"
Branch = commit A (fix) + commit B (revert A). Tree matches base → `LANDED` HIGH → "already live on base". The fix is **not** live anywhere; retiring the branch destroys the only record that a fix was attempted and reverted — which is precisely "work that never reached main," this tool's stated mission. No content is lost (net nil), but the label and the "zero risk" language are wrong.

**Fix:** keep the classification but change signal/wording to `net-zero-delta (possible add+revert history)` and have the report hedge the LANDED line when `ahead > 0`.

### D6 · MEDIUM · `git.mjs` (all traversal calls) — replace refs and grafts are honored, so ancestry is spoofable
`git replace` refs and `.git/info/grafts` rewrite parentage and are honored by default. A stray replace ref (left over from filter-repo surgery — not necessarily malice) can make a branch tip appear reachable from base → Layer 1 → `LANDED` HIGH. For a tool whose product is trust decisions, silently honoring repo-local history rewrites is a hole.

**Fix:** pass `--no-replacement-objects` to `rev-list`/`merge-base`/`diff`/`cherry`, or detect `git replace -l` non-empty → degrade to UNKNOWN + `notExamined` note.

---

## 2. The `ahead === 0` short-circuit

**Mostly sound, with the D3/D6 caveats.** Reasoning: `rev-list --left-right --count base...ref` right-side 0 means ref's tip is reachable from base through parent links among *present* objects, and those links are real in the full repo too. Shallow clones fail toward UNKNOWN (merge-base below the cut → `mergeBase` null → early return) or toward inflated `ahead` (divergence below the cut counts every visible ref commit) — both safe. Single-branch clones with stale base get caught by the freshness gate. A branch whose tip **is** the merge-base (your `equipment-p0-safety` case) is correctly LANDED. Grafted/replaced history is the one unsound input (D6), and ref ambiguity corrupts the operands themselves (D3).

One adjacent nit: `recon-scan.mjs:~60-64` — if `commitTime(BASE)` returns null, the freshness gate is **skipped silently** rather than failing loudly, which is the "reassuring silence" pattern you claim to have eliminated. LOW. Fix: treat null base time as stale unless `--stale-ok`.

---

## 3. Concurrency + parallel agents

### D7 · CRITICAL · `inventory.mjs:~104` (`snapshotWorkingTree`) — `git status` failure is rendered as a CLEAN tree
```js
const porcelain = await gitLines(['status', '--porcelain']);
const entries = porcelain ?? [];
```
`git status` **writes the index** opportunistically; under the index-lock contention you have already observed, it fails → `porcelain === null` → `entries.length === 0` → returns `dirty: false` → the working-tree section is omitted from the report entirely. Uncommitted work gets a false all-clear. This is the *identical bug class* you fixed one function down for `stash create` — the fix stopped one call too early.

**Fix:** `if (porcelain === null) return { kind: WORKING_TREE, id: 'working-tree', dirty: null, snapshotStatus: 'FAILED: git status unreadable — working tree state UNKNOWN', ... }` and render it loudly.

### D8 · MEDIUM · `git.mjs:~27` — `GIT_OPTIONAL_LOCKS=0` never set
Every invocation spreads `process.env` only. `git status` (and friends) take opportunistic index locks; this both causes D7-style failures under contention and technically violates git.mjs's own "HARD RULE: nothing … mutates". **Fix:** add `GIT_OPTIONAL_LOCKS: '0'` to the env (exempt `stash create`, which must write).

### D9 · MEDIUM · `inventory.mjs:~29, ~58, ~85` — census lists return `[]` on failure, producing a success-shaped empty report
`listBranches` failure (packed-refs lock during a concurrent fetch) → `[]` → "0 refs swept", "Sensitive paths: NO unpushed changes detected", "covers those surfaces completely". `listWorktrees` failure → all `inWorktree` false → in-flight protection lost. Same for stashes. **Fix:** propagate failure; exit non-zero or print a top-of-report "CENSUS DEGRADED" banner.

### D10 · MEDIUM (NEEDS-VERIFICATION on file format) · `inventory.mjs:~163` — lane parsing is fragile and failures are swallowed
`catch { /* lane dir absent is fine */ }` also swallows permission errors and JSON-ish lanes. The branch regex `/branch\s+([^\s·|]+)/i` requires whitespace after `branch` — a lane written `branch: feature/x` captures nothing → lock silently ignored → `ACTIVE_LANE` protection lost. Verify the actual lane format; at minimum distinguish ENOENT from other errors and log unparsed lane files.

**Sound:** `mapLimit` itself (single-threaded `cursor++`, bounded workers) is correct; tri-state null handling in `isAncestor`/`treeIdentical` never reads failure as data.

---

## 4. The sensitivity floor — what it misses

### D11 · HIGH · `rank.mjs:~20-27` (`SENSITIVE`) — the net has large holes
Not caught by path or name regexes, with concrete kill scenarios:

- **Identity/auth:** `login`, `sign-in`, `oauth`, `oidc`, `saml`, `token`, `jwt`, `cookie`, `password`, `credential`, `secret`, `key(s)`, `rbac`, `acl`, `roles`, `user`, `account`. Scenario: branch `redact-logs` touching `src/lib/logger.ts` + `src/routes/account.ts` — zero hits → 2 real commits, behind 800 → `COST` → `[ARCHIVE]`. A PII-redaction fix dies quietly.
- **Money beyond your list:** `refund`, `charge`, `invoice`, `tax`, `payout`, `ledger`, `wallet`, `subscription`, `pricing`, `discount`, `giftcard`.
- **Vuln classes:** `sanitize`, `escape`, `validate`, `sql`, `injection`, `xss`, `csrf`, `cors`, `ssrf`, `redirect`, `header`, `rate-limit`, `crypto`, `tls`, `cert`, `upload`, `export` (data egress).
- **Files:** `.env`, `*.pem`, `*id_rsa*`, `secrets.*`, `credentials.*`, `.github/workflows/*` (supply chain), `Dockerfile`, `nginx.conf`, terraform.
- **Data:** migrations/seeds/fixtures touching auth/payment tables; `pii`, `gdpr`.

### D12 · MEDIUM · `rank.mjs:~114-117` (`neverAgeOut`) — name list is narrower than `NAME_SIGNAL`'s
`neverAgeOut` tests `p0|security|safety|auth|payment` while `NAME_SIGNAL` (rank only) knows `hotfix|urgent|cve`. Branch `hotfix-token-expiry` touching `src/lib/tokens.ts`: path misses, name misses, ranking gets +3 it can't spend on escalation. **Fix:** `neverAgeOut` should OR path hits with the *positive* entries of `NAME_SIGNAL` plus `cve|leak|exploit|bypass|injection|secret|credential|2fa|otp|mfa`.

### D13 · MEDIUM · `equivalence.mjs:~194` + `git.mjs diffStat` — the 200-file cap and rename notation blind the floor
`rec.files = ds.files.slice(0, 200)` truncates before sensitivity is computed (any branch touching >200 files); `git diff --numstat` rename output (`src/{old => auth}/f.mjs`) defeats the `(^|\/)` anchors, so a file moved *into* a sensitive dir can be invisible. **Fix:** evaluate sensitivity inside `diffStat` before slicing and carry `sensitiveHits` on the record; pass `--no-renames` or un-glue rename paths.

Minor (safe direction, but noisy): the regexes are unanchored substrings — `/(^|\/)auth/i` matches `authorRoutes.mjs`, `/p0/` matches `app01`, `/fix|patch/` matches `prefix`. False escalation is acceptable; fix with boundaries when you fix D11.

---

## 5. Report honesty

### D14 · HIGH · `report.mjs:~118-127` (AUDIT DELTA) — the coverage claim is computed over the wrong population
`risky = decisions.filter(...)`, but `decisions` excludes **UNKNOWN — which is the *default* verdict for every surviving candidate** — plus EXPERIMENTAL, ACTIVE_LANE, and SUPERSEDED. Scenario: `claude/auth-fix-v3`, classified ABSENT, default verdict UNKNOWN, touching `src/auth/session.ts` → absent from AUDIT DELTA → report prints "Sensitive paths: NO unpushed changes detected. **An audit of base covers those surfaces completely.**" False. Same for a fresh (<48h) sensitive branch hidden as IN-FLIGHT, an experimental branch, and any stash contents (stashes are unexamined, yet "completely" prints unconditionally). This is the single most safety-relevant sentence in the artifact and it lies exactly when classification is least certain.

**Fix:** compute `risky` over all items with `equivalence !== LANDED`; gate the word "completely" on zero unknowns, zero stashes, empty `notExamined`, and a non-failed working-tree snapshot; otherwise print "coverage gaps remain: …".

### D15 · MEDIUM · `report.mjs:~58-67` — correction statistics count unmeasured branches as "shipped"
`(it.rec.realCommits ?? 0)` turns a null (cherry failed → UNKNOWN) into 0, so `inflated++` and `realAhead += 0`, and the report asserts "The rest already shipped" for branches you never measured (plausible under lock contention). **Fix:** skip nulls; print "N branches unmeasured".

### D16 · MEDIUM · `report.mjs:~73` + `~99` — "zero risk to retire" / "[ARCHIVE]" language violates your own language rule
"A checkmark displaces the vigilance a scary unknown would have provoked" — your words. `zero risk to retire` is "safe to merge" wearing a different hat, and D1–D4 are live counterexamples to the underlying claim. **Fix:** "no net difference vs base detected — spot-check before deleting". Related: `report.mjs:~105` advertises `[--full to list]`, **which is not implemented anywhere in `recon-scan.mjs`** — a user who runs `--full` gets the same 8-line truncation and believes they saw everything. Implement it or delete the hint.

### D17 · LOW-MEDIUM · `report.mjs:~75` — `[HUMAN] ${decisions.length}` miscounts
`decisions` includes WIP (`[PARK]`) and COST (`[ARCHIVE]`) items; the labeled count doesn't match the markers shown below it.

---

## 6. Everything else

### D18 · MEDIUM · `recon-scan.mjs:~146` — `process.exit(0)` can silently truncate the piped report
`console.log(report)` to a pipe is asynchronous; immediate `process.exit(0)` may discard pending writes. `node recon-scan.mjs > audit-report.txt` → report cut mid-line, exit 0, no error — the artifact is the product. **Fix:** `process.exitCode = 0;` and return, letting Node drain. Also: the header comment says "Exit 0 always" while the freshness gate exits 3 and bad base exits 1 — pick a story and document it.

### D19 · MEDIUM · `recon-scan.mjs:~41-52` — NaN argument handling produces false-clean runs
`--concurrency garbage` → `mapLimit(items, NaN)` → `Array.from({length: NaN})` → **zero workers** → `results` full of holes → `filter(Boolean)` → 0 items → "0 refs swept … covers those surfaces completely". `--deep` as the last token → `DEEP_N = NaN` → `slice(0, NaN)` → deep pass silently skipped ("deep-confirming 0 finalists"). **Fix:** validate numerics and hard-fail.

### D20 · MEDIUM · scope — commits on a detached HEAD are invisible
Commits made on detached HEAD (agents do this constantly) are not a branch, not a stash, and leave a clean tree. They surface only via the "reflog orphans — not run" disclosure. **Fix:** cheap `git rev-list --not --branches --remotes HEAD` count as a first-class finding.

### D21 · LOW/MEDIUM · `equivalence.mjs:~228-231` (`deepConfirm`) — failure boosts confidence
`rev === false` raises MEDIUM→HIGH, but reverse-apply failure has three benign causes you already know (context drift, binary hunks without `--binary`, D1's wrong tree), plus `maxBuffer` overflow on huge diffs → `patch.ok` false → indeterminate. Boosting to HIGH on that basis overstates certainty of absence. Rename the signal to `reverse-apply:did-not-apply` and stop boosting.

### D22 · LOW · assorted
- `git.mjs` spawn failure (git absent from PATH) → every helper returns failure-shaped data → all-UNKNOWN report, exit 0. Distinguish ENOENT loudly.
- Untracked-only dirty tree: "snapshot: none needed (untracked files only)" — no preservation pointer exists for those files at all; wording reads benign. Say "NO snapshot exists for untracked files".
- `renderJson` omits `files`, `churn`, `mergeBase`, `cherryAbsent`, and the stash inventory — machine consumers cannot audit your sensitivity claims. Include `files` (they're branch paths, not working-tree paths, so the privacy rule doesn't apply).
- `VERDICT.SUPERSEDED` / `UPGRADE` / `REGRESSION_RISK` are unreachable without Phase 3 — dead
