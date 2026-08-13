# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** C:/tmp/ss-coach-gate0-20260812/docs/ai-workflow/AI-HANDOFF/KIMI-PACKET-S4-SLICE-CERTIFICATION-2026-08-13.md
**Seed:** (none)
**Tokens:** 3129 in / 12428 out | **Cost:** ~$0.1958 | **Wall:** 671.0s | **finish_reason:** stop

---

# Hostile review: slice-certification gate

**Verdict up front: NOT FIT to authorize schema work.** The gate certifies the *tip commit* while the dangerous operation is the *push*. Almost every load-bearing check either looks at the wrong range, swallows errors into PASS, or is decorative by the author's own standard ("a gate that always passes and a gate that always fails are the same defect"). Several findings below are inferences about elided helpers; verification commands are given for each.

---

## PASS-on-unsafe, ranked by cheapness of accidental trigger

### P1 — The gate tests five suites no matter what changed. Green by omission is the default path.
- **What breaks:** `checkTargetedSuites` runs `CERTIFIED_SUITES` regardless of the diff. Nothing ties the change under test to the suites run. Any change outside those five suites' coverage — which is *all future work and most of this slice's blast radius* — is certified untested.
- **Trigger:** ordinary work. Edit any backend file not exercised by those five suites. Cost: zero; it is the default behavior of the gate.
- **Corollary to verify:** the five suites map to three of the four fixes. `sessionsRouteOrder.test.mjs` does not obviously exercise the Workout Coach unawaited-ack path. Verify: `grep -rl "bridge\|ack\|applied" backend/tests/api backend/tests/unit | grep -i coach` — if nothing covers the AI-bridge seam, one of the four fixes ships with no certified regression test *right now*, and a later revert of that fix would stay green.
- **Smallest fix (answers your Q2):** the hardcoded list is the flaw; making a missing suite FAIL only freezes the list, it doesn't make the list *correct*. The alternative that doesn't re-run the red suite: a checked-in coverage manifest mapping source globs → certifying suites, e.g. `{ "backend/routes/sessionBlocks/**": ["tests/unit/sessionBlockAuthorization.test.mjs", ...] }`. The gate diffs the push range (see P2), maps each changed file through the manifest, and FAILs on any changed file with no mapped suite ("uncertified change"). Suites still run targeted; the full red suite is never invoked. New work must name its certifying tests at authoring time — which is exactly the discipline you already applied manually to these four fixes.

### P2 — `HEAD~1..HEAD` certifies the tip commit; the push ships the whole stack. Multi-commit slices and the entire unpushed stack are unscanned.
- **What breaks:** `checkBackendSyntax` and `checkMigrationsStatic` diff only `HEAD~1..HEAD`. Your own context says four fixes are "committed locally and unpushed" — the push range is `origin/main..HEAD`, and everything except the tip commit is invisible to both checks. A destructive migration or a syntax-breaking backend file in commit 1 of a 4-commit slice is never examined.
- **Trigger:** completely ordinary — any slice that lands as more than one commit, which is your stated norm. Cost: zero.
- **Bonus bypass:** because the destructive-migration check only ever scans the tip, the discovered workaround for a legitimate FAIL (F1 below) is "commit anything on top" — an empty commit hides a genuinely destructive migration. The false-fail and the bypass are the same line of code.
- **Merge case (your Q4):** on a merge commit, `HEAD~1` is the first parent, so the diff shows the merge's incoming changes — accidentally closer to correct, but it still ignores everything already on the branch before the merge, and a contributor who *rebases* the same slice gets tip-only scanning. The behavior differs by merge strategy, which is itself a defect: the verdict depends on how the branch was integrated.
- **Smallest fix:** compute the push range, not the tip: `base = git merge-base origin/HEAD HEAD` (fall back to `origin/main`), then diff `base..HEAD` in both checks. This handles multi-commit slices, merges, rebases, and the unpushed stack with one change. If the merge-base command fails, that is UNPROVEN/FAIL — never an empty file list (see P5).

### P3 — The destructive-SQL regex misses the destructive shapes an *honest* migration author actually writes.
- **What breaks:** `/\b(DROP\s+(TABLE|COLUMN|DATABASE)|TRUNCATE|DELETE\s+FROM)\b/i` catches the theatrical shapes and misses the common ones:
  - `ALTER TABLE … ALTER COLUMN … TYPE …` — silent truncation/rewrite (varchar(255)→varchar(20), numeric precision loss). The most common real-world data-destroying migration.
  - `UPDATE users SET role = 'member'` — mass data mutation; only `DELETE FROM` is caught.
  - `ALTER TABLE … ALTER COLUMN … SET NOT NULL` on a populated table — migration fails *mid-deploy*, and your deploy host runs migrations on push, so this is a half-applied schema in production.
  - `DROP INDEX`, `DROP CONSTRAINT`, `DROP SCHEMA`, `DROP SEQUENCE`, `DROP VIEW`, `DROP TRIGGER`, `DROP FUNCTION` — only TABLE/COLUMN/DATABASE are enumerated.
  - `ALTER TABLE … RENAME` / `RENAME TABLE` — breaks every reader of the old name.
  - `CREATE INDEX` without `CONCURRENTLY`, `ADD COLUMN … DEFAULT <volatile>` — table-locking/rewriting shapes that take the production host down at deploy without deleting a row.
- **Trigger:** writing a normal migration. Cost: zero — these are routine DDL.
- **Evasive author (for completeness, not ranked — you asked):** `EXECUTE format('DROP %s %s', …)` / `DO $$ … EXECUTE …` dynamic SQL; `DROP/*x*/TABLE` (your `\s+` doesn't span comments); `'DROP' || ' TABLE'`; psql `\i other.sql` includes (the destructive file never sits under `backend/migrations`); `COPY … FROM PROGRAM`. A regex over one file cannot close these; don't pretend it does.
- **Smallest fix:** widen the pattern to `DROP\s+\w+`, `ALTER\s+TABLE.*(TYPE|SET\s+NOT\s+NULL|RENAME)`, `\bUPDATE\b`, `CREATE\s+(?!UNIQUE\s+)?INDEX\s+(?!CONCURRENTLY)`, `\bEXECUTE\b`, `\\i\s`. Accept that this produces false positives and handle them deliberately (F1 fix below): an explicit, *second-person* sign-off token in the file (`-- gate:destructive-reviewed-by:<id>`) that the gate requires to be absent from the author's own commit trailer. That converts silent PASS into noisy, attributable human review — which is the honest version of what this check can actually deliver.

### P4 — The certified SHA is not bound to the push (TOCTOU).
- **What breaks:** the gate certifies whatever HEAD is at run time, prints it, and exits. Nothing connects that verdict to the ref that gets pushed. `checkPinnedTree`'s comment says "The pinned SHA" — nothing is pinned; it just reads HEAD.
- **Trigger:** run gate → remember one more fix → commit → push. Or `git push origin HEAD~1:main`. Entirely ordinary behavior; cost zero.
- **Smallest fix:** the gate's final line must be an instruction, not an adjective: `CERTIFIED: <sha> — push exactly this ref`. The push checklist compares the post-push remote SHA to the certified SHA (`git ls-remote origin main`). No infrastructure; two commands.

### P5 — Command failures are swallowed into PASS. A broken git makes three checks report green.
- **What breaks:** in `checkBackendSyntax`, `checkMigrationsStatic`, and `checkBackendDrift`, a failed git invocation degrades to an empty string and then to `ok: true`:
  - `checkBackendSyntax`: `changed.code === 0 ? changed.out : ''` → `files = []` → **"no backend modules changed in HEAD" — PASS**.
  - `checkMigrationsStatic`: same pattern → **"no migration changed in HEAD" — PASS**.
  - `checkBackendDrift`: if either `ls-files` or `diff` fails, `.out` is empty → drift list empty → **"no untracked or uncommitted backend drift" — PASS**.
  - Meanwhile `checkPinnedTree` correctly reports UNPROVEN — and UNPROVEN exits 0. Net result: **run this gate with git broken/off PATH and it prints three PASSes and one UNPROVEN, exit 0, authorizing schema work on an unexamined tree.**
  - Same swallow on a **shallow clone** (`HEAD~1` doesn't exist → diff errors → PASS) and on a **root commit**. Shallow clones are the CI default everywhere; you said no hosted CI, but any future automation or a contributor's `--depth 1` clone hits this.
- **Trigger:** moderate cost locally (broken PATH, wrong cwd), near-zero in any automated/shallow context.
- **Verify (inference — depends on the elided `run()`):** does `run()` return `{code: null/1, out: ''}` on spawn failure rather than throwing? Test: `PATH="" node scripts/qa/slice-certification.mjs; echo %ERRORLEVEL%` (or with a git-stub that exits 1). If `run` threw, your try/catch would save you — confirm which.
- **Smallest fix:** a rule with no exceptions: **a helper command that fails can never produce `ok: true`.** Every `run()` result is checked; non-zero → `ok: null` (substrate failure, see Q5) or `ok: false`. This is three small edits and is the single highest-value change in this review.

### P6 — Ignored files are invisible to both tree-cleanliness checks. Rule 42 has a hole exactly where it matters.
- **What breaks:** `git status --porcelain` does not list ignored files; `git ls-files --others --exclude-standard` also excludes them. A new backend module that matches `.gitignore`, a repo-local exclude, or the contributor's **global** `core.excludesFile` is: not in the tree check, not in the drift check, not committed, **not pushed** — and the host crashes at boot importing it. Rule 42 fires while the gate is green.
- **Trigger:** moderate. Requires an ignore rule to match — but ignore rules are exactly the kind of thing that accumulates (`*.local.mjs`, a `dist/` pattern that also matches a new source dir, a global ignore for editor scratch files). Also verify config interaction: `git config status.showUntrackedFiles no` makes porcelain hide *all* untracked files (drift check still catches those via `ls-files`, but the pinned-tree check silently weakens).
- **Verify:** `git config --global core.excludesFile`; `echo 'backend/scratch.mjs' >> .git/info/exclude && touch backend/scratch.mjs && git status --porcelain` → empty output, gate green, file unpushed.
- **Smallest fix:** `git status --porcelain --untracked-files=all --ignored=matching` (or `git ls-files --others` *without* `--exclude-standard` in the drift check) and treat any ignored file under `backend/` that isn't on a checked-in allowlist as drift. Stronger and cheap: at gate time, parse the boot entrypoint's import graph (you already have `node`) and assert every resolved file under `backend/` appears in `git ls-files`. That checks the actual rule-42 invariant — "everything the host imports is tracked" — instead of approximating it.

### P7 — Dead checks (your own standard: the verdict carries no information).
- `checkWhitespace` runs `git diff --check` on the **unstaged working diff**. `checkPinnedTree` has already failed the run unless the tree is clean, so this check's input is always empty. **It can never fail.** Same defect as the old gate's `staging area is empty`.
- `checkStagingEmpty` is fully subsumed by `checkPinnedTree` (porcelain lists staged files). Decorative.
- `checkBackendDrift` is subsumed by `checkPinnedTree` *except* for the ignored-file gap (P6) — keep it, but only after fixing P6, at which point it becomes the load-bearing version of the pinned-tree check.
- `checkBackendSyntax` computes `listed = git ls-files 'backend/**/*.mjs'` and **never uses it**. Dead code in a certification gate is a finding by itself: it suggests the check was meant to parse *all* backend modules and was quietly narrowed to changed ones. Decide which it is; if changed-only is intended, delete the line.
- **Fix:** delete or repair each. A gate with decorative greens trains reviewers to stop reading the output — the precise failure mode you built this to kill.

---

## FAIL-on-safe, ranked by cheapness

### F1 — Legitimate destructive migrations hard-FAIL with no override, and the regex false-positives on comments and strings.
- **Trigger:** a migration that legitimately drops a dead table, deletes orphaned rows, or contains `DELETE FROM` inside an archival function body — or merely a **comment** (`-- safer than DELETE FROM …`) or a string literal. Cost: trivial; one comment.
- **Why it's worse than it looks:** there is no sign-off path, so the contributor's discovered remedy is "amend it away or add a commit on top" — which is the P2 bypass. Your false-fail handling *teaches* the evasion.
- **Fix:** the reviewed-by token from P3, plus strip SQL comments and dollar-quoted/string literals before matching (a 20-line tokenizer, not a parser) to kill the comment false-positives.

### F2 — Renaming or moving a certified suite FAILs the gate.
- **Trigger:** an ordinary test-file rename/reorganize. Cost: low; happens in any test cleanup.
- **Fix:** the coverage manifest (P1) replaces the brittle path list; the gate checks that mapped suites *exist and pass*, and the manifest is updated in the same commit as the rename — which the diff-range check will naturally require.

### F3 — Fresh-environment FAILs.
- **Trigger:** `node_modules` absent (fresh clone, `npm ci` not yet run) → vitest spawn fails → FAIL. `bash` absent or `scan-secrets.sh` checked out with CRLF line endings on Windows → FAIL. Cost: low; first run on any new machine.
- **Assessment:** fail-closed is the correct direction; keep it, but make the detail string say *what was missing* ("vitest not found — run npm ci") so it reads as environment setup, not as a lying gate.

### F4 — Filenames with spaces break `node --check` through `shell: true`.
- **What breaks:** with `spawnSync(..., {shell: true})`, args are string-joined; `node --check backend/my file.mjs` parses as two args → node errors → FAIL on a syntactically fine file. (The same joining is a command-injection lane for a *malicious* filename like `a&touch pwned&.mjs` — low rank for an ordinary contributor, but it's the same one-line fix.)
- **Fix:** quote args when joining, or drop `shell: true` for the `node --check` invocation specifically (node is on PATH; you don't need a shell for it).

### F5 — Unverified, cheap to check: suite env-dependence and secret-scan scope.
- If any certified suite reads env vars or local state, the gate's verdict varies by machine — FAIL-on-safe on a clean tree. Verify: run the five suites with `env -i` (or a scrubbed environment) and compare.
- `scan-secrets.sh --all` semantics are unknown. If `--all` scans **history**, a historical secret FAILs every future certification — permanently red gate, the failure mode you're fixing. Verify: commit a fake `AKIA…` on a scratch branch, delete it, run the scan, observe exit code. Also verify the script can fail at all (your old gate's `staging area is empty` precedent): seed a live fake secret, confirm non-zero exit.

---

## Q5 — UNPROVEN exiting 0: you're half right, and the half you're wrong about is the dangerous half.

Your reasoning is sound for **scope-undecidable** checks: live topology genuinely cannot be derived from a tree, and a permanently red gate teaches people to ignore red — agreed, that's the failure mode on the table. Exiting 0 there is defensible **on two conditions you currently don't meet**:

1. **The artifact must not claim certification.** Today the run exits 0 and the summary (per your code) treats UNPROVEN as non-failing — so the consumer of the exit code experiences it as a pass. A pass wearing a disclaimer is still a pass to anything that reads exit codes. Minimum: when any UNPROVEN exists, the banner reads `PROVISIONAL — owner checks outstanding: live topology`, never `CERTIFIED`, and the push checklist requires the owner sign-off line. Keep exit 0; change what the exit *says*.
2. **Substrate failure must never be UNPROVEN-with-exit-0.** "Live topology is undecidable" and "git didn't run" are different animals. Git is the substrate for every other check; when it fails, the other checks' results are fabricated (P5 shows three of them fabricating *PASS*). Rule: UNPROVEN due to scope → exit 0 + PROVISIONAL. UNPROVEN due to tooling/substrate failure → exit non-zero (use a distinct code, e.g. 2, so automation can distinguish "unsafe" from "unexaminable"). This does not recreate the permanently-red gate, because substrate failure is transient and fixable, not constitutional.

## Q6 — Minimum meaningful self-test.

One proven-failing check is ceremonial. The falsification standard you applied to the four fixes, applied to the gate: **every check must be proven capable of failing, capable of passing, and incapable of lying when its substrate breaks.** Concretely, using `git init` in temp dirs (no infrastructure — git and node only):

1. **Per-check fail fixtures:** dirty tree, staged file, whitespace error, syntax error in a changed backend file, untracked backend file, failing suite, missing suite, destructive migration, seeded secret. Each must produce FAIL and exit 1.
2. **Per-check pass fixture:** a clean fixture repo → all PASS, exit 0.
3. **Substrate fixtures (the ones that matter most, per P5/P6):** git-stubbed-to-fail → assert *no check reports `ok: true`* and exit ≠ 0; shallow/root-commit repo → assert not-PASS; ignored backend file → assert FAIL (post-P6-fix); destructive migration in `HEAD~2` of a 3-commit stack → assert FAIL (post-P2-fix).
4. **Exit-code matrix:** 0 = certified, 1 = failed check, 2 = substrate failure, and PROVISIONAL banner present iff scope-UNPROVEN exists.

Run the gate as a subprocess against these fixture trees — don't unit-test the check functions, or you'll be testing your mocks. This is maybe 150 lines and is the difference between a gate and a script that prints adjectives.

---

## Minimum bar to make this gate fit to authorize schema work

In order; all are git/node/bash, none need infrastructure:

1. **P5:** no helper failure can ever yield `ok: true`. (Three edits. Do this first — it is the cheapest fix and the worst lie.)
2. **P2:** diff the push range (`merge-base origin/HEAD HEAD`..`HEAD`), not `HEAD~1..HEAD`, in both diff-based checks.
3. **P6:** close the ignored-file hole; ideally assert the boot import graph ⊆ `git ls-files`.
4. **P3:** widen the migration patterns to the honest-author destructive shapes; add the second-person reviewed-by token so false fails have an honest exit (F1).
5. **P1:** coverage manifest tying changed files → certifying suites; FAIL on uncovered changes. Confirm first whether the Workout Coach fix has *any* certified suite today.
6. **Q5:** split UNPROVEN — scope → exit 0 + PROVISIONAL banner; substrate → exit 2.
7. **P4:** print `CERTIFIED: <sha>` and make the push procedure verify the remote lands on that SHA.
8. **P7:** delete or repair the dead checks (`checkWhitespace`, `checkStagingEmpty`, unused `listed`).
9. **Q6:** the fixture-based self-test above.

Items 1–4 are a day's work and close every PASS-on-unsafe an ordinary contributor can hit by accident. Until at least 1, 2, and 3 land, this gate's green means "the tip commit's non-ignored files parse and five old suites pass" — which is not a certification of a schema-changing push.

**Stated as inferences (verify before acting):** `run()`'s behavior on spawn failure (P5); `bin()` helper correctness on Windows; whether any certified suite covers the AI-bridge ack path (P1); `scan-secrets.sh --all` scope and fallibility (F5); env-dependence of the five suites (F5). Everything else above is derivable from the code as presented.
