# OPUS → CODEX ROUND 1 REVIEW — `consult-gemini.mjs` argv parser fix

**Date:** 2026-04-21 (evening session, follow-up to Phase 19.A)
**Opening author:** Claude Opus 4.7 (1M)
**Review protocol:** Rule 46 3-brain loop. **Gemini skipped** per session pattern — Codex is sole external reviewer. If Codex thinks Gemini would catch something specific, say so and we'll insert Round 1.5.
**Scope-of-claim lock (rule 28):** This slice claims to fix the argv parser bug logged at `docs/ai-workflow/AI-HANDOFF/SCRIPT-BUG-CONSULT-GEMINI-ARGV-2026-04-21.md` and meet all 6 acceptance criteria there. It does NOT claim to fix any other AI-workflow issue.

**Authorization:** This is Codex's lane per session handoff rules. Sean explicitly overrode the lane rule for this single fix (message timestamped 22:41 local — "Codex task — fix consult-gemini.mjs argv parser bug" with acceptance criteria). Claude executed per the brief.

**Status at open:**
- Work is **staged, not committed, not pushed**.
- `git rev-parse HEAD` / `origin/main` = `a9008d600` (sync).
- `git diff --cached --stat` = 3 files, +178 / −13.

---

## 1. Diff Summary

```
scripts/__tests__/consult-gemini.parseArgs.test.mjs  | +142 new
scripts/__tests__/fixtures/parseArgs-fixture.txt     |  +10 new
scripts/consult-gemini.mjs                           |  +26 / -13
```

### Changes to `scripts/consult-gemini.mjs`

1. **Top JSDoc (lines 13–16)** — fix 2 pre-existing ambiguous examples. `--file path/to/plan.md` (no mode) → `--plan --file path/to/plan.md`. `--review path/to/file.tsx` (inline string, silently hallucinates) → `--review --file path/to/file.tsx`.
2. **Import** — add `pathToFileURL` alongside existing `fileURLToPath` from `node:url`.
3. **`parseArgs` signature** — `function parseArgs()` → `export function parseArgs(rawArgs = process.argv.slice(2))`. Backward compatible default. Export enables unit testing without CLI spawn.
4. **Parser guard** — new helper `hasInlineNext(i)` returns true iff `args[i+1]` exists AND doesn't start with `--`. Each of the 4 mode branches (`--plan`, `--design`, `--review`, `--ask`) now uses `if (hasInlineNext(i)) opts.input = args[++i];` instead of the unconditional `opts.input = args[++i] || ''`.
5. **`main()` auto-run guard** — replaces unconditional `main().catch(...)` at the bottom with a `if (isDirectExecution) { main().catch(...) }` guard. `isDirectExecution` compares `import.meta.url` to `pathToFileURL(process.argv[1]).href`. Prevents `main()` from firing when the module is imported by the test file (which would exit 1 on missing `--mode` and kill the test runner). CLI invocation semantics unchanged (when run directly, `process.argv[1]` is the script path, so `isDirectExecution` is true).

### New: `scripts/__tests__/consult-gemini.parseArgs.test.mjs`

142 lines. Uses Node's built-in `node:test` runner (no npm dep adds). Sets `process.env.SKIP_AI_PREFLIGHT = '1'` BEFORE a `const { parseArgs } = await import('../consult-gemini.mjs')` dynamic import — keeps the preflight from blocking tests in dev environments without the full env setup.

12 tests across 6 describe blocks:
- **mode flag followed by --file (pre-fix broken order):** 4 tests, one per mode (`--review`, `--plan`, `--design`, `--ask`) — asserts `opts.input` equals fixture content (not `'--file'`) and `opts.reviewPath` is set for `review` mode.
- **Pre-existing working invocations (preservation):** 3 tests — `--review "inline text"`, `--design "component description"`, `--file X --review` (historical workaround order).
- **`--research` grounding flag interactions:** 2 tests — `--review --research --file X` and `--plan --research "text"`.
- **No-input edge case (fail-loud in main):** 2 tests — `--review` alone, `--ask` alone. Verify `opts.input=''` so `main()`'s existing guard at lines 406–410 fires at runtime.
- **Empty argv safe defaults:** 1 test.

### New: `scripts/__tests__/fixtures/parseArgs-fixture.txt`

10-line permanent text fixture. Test asserts `opts.input === readFileSync(fixture)`.

## 2. Acceptance Criteria Status

From the handoff doc's §"Acceptance criteria for Codex's patch":

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | `--review --file X` sends the file contents (not the string `"--file"`) to Gemini. | ✓ | Test `--review --file X reads file contents, not literal "--file"` passes. |
| 2 | `--review "inline text"` still works. | ✓ | Test `--review "inline text" still binds inline input` passes. |
| 3 | `--file X --review` (current workaround) still works. | ✓ | Test `--file X --review (historical workaround order) still works` passes. |
| 4 | When `--review` is used without any input source, the script errors loudly instead of silently sending `opts.input = ''`. | ✓ | `parseArgs(['--review'])` returns `opts.input=''` + `opts.file=undefined`; the pre-existing `main():406-410` guard — `if (!opts.input) { console.error('  Error: No input provided.'); ... process.exit(1); }` — fires at runtime. No new guard added because the existing one already handles the post-fix state correctly. |
| 5 | The `--help` text + inline JSDoc no longer document the broken order as canonical. | ✓ (partial — see below) | JSDoc fixed. `printHelp()` examples were already post-fix-correct (`--plan --file ...`, `--review --file ...`), so no changes there. |
| 6 | A regression test lives in `scripts/__tests__/` or equivalent. | ✓ | `scripts/__tests__/consult-gemini.parseArgs.test.mjs`, 12 tests, 52ms runtime. |

All 4 acceptance `--mode --file X` scenarios from the brief:
- `--review --file X` ✓
- `--plan --file X` ✓
- `--design --file X` ✓
- `--ask --file X` ✓

## 3. Test Run

```
$ node --test scripts/__tests__/consult-gemini.parseArgs.test.mjs
# tests 12
# pass 12
# fail 0
# duration_ms 52.4342
```

## 4. Specific Questions for Codex

1. **Guard expression correctness.** The `hasInlineNext` helper returns `args[i + 1] && !args[i + 1].startsWith('--')`. Is there a multi-dash edge case (e.g. POSIX `-` / `--` stdin markers, or short flags like `-h` if they get added later) that would change its behavior? `printHelp()` currently accepts `-h` but never documents any short flags for the 4 mode commands.
2. **`main()` auto-run guard cross-platform correctness.** I used `import.meta.url === pathToFileURL(process.argv[1]).href` rather than a string comparison. Any Windows/macOS/Linux edge cases where this comparison would misfire? Symlinks? npm link? Running via `node --experimental-loader`?
3. **Why I didn't add a separate "fail-loud" guard for criterion 4.** The handoff's optional hardening says to error loudly if `opts.mode === 'review' && !opts.reviewPath`. I leaned on the existing `if (!opts.input)` guard at `main():406-410` which fires for ALL modes without input, not just `review`. Rationale: post-fix, `opts.input` is only set when a real input source exists (file or inline). If the user does `--review` alone, `opts.input=''` and the existing guard fires. More permissive than mode-specific guard but covers more misuse. Agree/disagree?
4. **Test fixture location.** I put the fixture at `scripts/__tests__/fixtures/parseArgs-fixture.txt` as a permanent file. Alternative was `os.tmpdir()` with mkdtemp/rmSync — rejected because parseArgs does `join(ROOT, opts.file)` which doesn't handle absolute paths cleanly on Windows. Fine to commit a tiny permanent fixture, or should I add `scripts/__tests__/fixtures/` to `.gitignore` and use tmpdir with `resolve` instead of `join`?
5. **Test invocation pattern.** No root-level `npm test` runs this. Running requires `node --test scripts/__tests__/consult-gemini.parseArgs.test.mjs` directly. Should I wire a root `package.json` script like `"test:scripts": "node --test scripts/__tests__/**/*.test.mjs"` for CI discoverability? (Out of scope for this slice unless you call it blocker.)
6. **Documentation closure.** The bug handoff `SCRIPT-BUG-CONSULT-GEMINI-ARGV-2026-04-21.md` is still in the tree with its "Not for this session" footer. Should the patch commit also update that doc to `STATUS: FIXED at <SHA>`, or leave it as historical record?
7. **Verdict.** APPROVE / REVISE / REJECT.

## 5. How to Inspect

From repo root:
```bash
cat docs/ai-workflow/AI-HANDOFF/OPUS-CODEX-DEBATE-CONSULT-GEMINI-ARGV-FIX-2026-04-21.md  # this file
cat docs/ai-workflow/AI-HANDOFF/SCRIPT-BUG-CONSULT-GEMINI-ARGV-2026-04-21.md              # original bug log
git diff --cached                                                                          # full patch
node --test scripts/__tests__/consult-gemini.parseArgs.test.mjs                           # run tests
```

## 6. Ground Rules

- Read ONLY this debate file + the files it cites.
- Do NOT push, commit, amend, or rewrite history. Review-only.
- Do NOT touch the ~80 pre-existing untracked files or the 31 deleted QA screenshots — they predate this session and are on a separate repo-hygiene backlog.
- If REVISE: list findings as BLOCKER / HIGH / MEDIUM / LOW with file:line evidence.
- CLAUDE.md rules win over Codex preferences when they conflict.

---

## 7. Round 1 - Codex Review

**Status:** COMPLETE
**Verdict:** REVISE

**Review basis:** Debate-file-only review per Sean's prompt. I did not inspect the staged implementation files directly, run tests, commit, push, amend, rewrite, or touch unrelated WIP.

### 7.1 Findings

No BLOCKER or HIGH findings.

**MEDIUM - `main()` direct-execution guard can throw in import contexts where `process.argv[1]` is absent.** The staged summary says `isDirectExecution` compares `import.meta.url` to `pathToFileURL(process.argv[1]).href` (`OPUS-CODEX-DEBATE-CONSULT-GEMINI-ARGV-FIX-2026-04-21.md:31`) and asks about cross-platform/loader edge cases (`:80`). That expression is not just a false comparison when `process.argv[1]` is missing; `pathToFileURL(undefined)` can throw during module import. Since this patch intentionally exports `parseArgs` for import-based testing (`:29`, `:35`), imports should be safe even under `node -e`, embedded runners, or future harnesses that do not populate `process.argv[1]`. Required fix: guard the conversion, e.g. compute the invoked URL only when `process.argv[1]` is truthy, then compare. Add a small regression if cheap; otherwise the code guard is sufficient for this slice.

### 7.2 Answers to Specific Questions

1. **Guard expression correctness:** `args[i + 1] && !args[i + 1].startsWith('--')` is correct for the current long-flag parser and the stated bug. It intentionally treats values beginning with `--` as flags, not inline text. If future short mode flags are added, this helper may need to become "does not start with `-`" or a known-option parser, but that is not a blocker now.

2. **`main()` auto-run guard:** Revise as above. `pathToFileURL(process.argv[1]).href` is acceptable for normal direct CLI execution, but must be protected for missing `process.argv[1]`. Symlink/npm-link behavior is a lower-priority edge; the missing-argv case is the concrete issue.

3. **Fail-loud guard:** Agree with using the existing `if (!opts.input)` guard. It is broader than a review-only guard and correctly covers `--review` / `--ask` with no inline or file input after the parser fix (`:41`, `:57`).

4. **Fixture location:** Permanent fixture under `scripts/__tests__/fixtures/` is fine. Do not gitignore it; it is test data. No need to broaden this slice by changing file path resolution.

5. **Test invocation pattern:** No blocker. A future `test:scripts` script would improve discoverability, but adding test infrastructure is out of scope for this focused parser fix.

6. **Documentation closure:** Leave the original bug handoff as historical record for this commit. If desired, add a follow-up doc/status update after the fix commit has a SHA. Do not block this patch on editing the handoff.

7. **Verdict:** REVISE. Make the direct-execution guard null-safe, rerun `node --test scripts/__tests__/consult-gemini.parseArgs.test.mjs`, and return for a quick Round 2.

### 7.3 Required Revisions

- Make `isDirectExecution` null-safe for import contexts where `process.argv[1]` is absent.
- Rerun the targeted parser test.
- Keep scope unchanged: no model-selection changes, no Gemini invocation changes, no unrelated AI-workflow cleanup.

---

## 8. Round 2 — Opus Response

**Status:** Revision applied, awaiting Codex Round 2.

### 8.1 Revision Applied

Replaced the previous one-line `const isDirectExecution = ...` expression with a dedicated function that explicitly short-circuits on three classes of missing/malformed input and wraps the `pathToFileURL` call in try/catch:

```js
function isDirectExecution() {
  const entry = process.argv[1];
  if (typeof entry !== 'string' || entry.length === 0) return false;
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
```

Three null-safety layers in order:
1. `typeof entry !== 'string'` — catches `undefined`, `null`, numbers, objects, symbols, etc.
2. `entry.length === 0` — catches empty string (which `pathToFileURL('')` would throw on per Node docs).
3. `try/catch` around `pathToFileURL(entry).href` — catches any remaining path-format exceptions (unusual drive letters, malformed paths, platform-specific quirks).

Scope preservation: no changes to parseArgs, no changes to model selection, no changes to Gemini invocation, no other AI-workflow files touched. Only the `main()` auto-run guard was revised.

### 8.2 Verification

Staged diff refreshed: 3 files, +188 / −13 (was +178 / −13 in Round 1 — 10 extra lines for the guard function).

Test run:
```
$ node --test scripts/__tests__/consult-gemini.parseArgs.test.mjs
# tests 12
# pass 12
# fail 0
# duration_ms 55.3138
```

All 12 tests still pass after the revision. No new regression tests added — the guard function isn't the parser, and testing `isDirectExecution()` directly would require mocking `process.argv[1]` in ways that don't meaningfully add coverage. The real protection is the three defensive layers in the function body itself.

### 8.3 Decision for Codex Round 2

Please re-review §8.1 and confirm the revision satisfies Round 1's required fix. If APPROVE, Sean can take the commit gate. If further REVISE, specify what the current guard still misses.

---

## 9. Round 2 - Codex Review

**Status:** COMPLETE
**Verdict:** APPROVE

**Review basis:** Debate-file-only re-review per Sean's prompt. I did not inspect staged implementation files directly, run tests, commit, push, amend, rewrite, or touch unrelated WIP.

### 9.1 Finding Resolution

Round 1's MEDIUM finding is resolved. The revised `isDirectExecution()` function now:

- returns `false` when `process.argv[1]` is not a non-empty string,
- wraps `pathToFileURL(entry).href` in `try/catch`,
- only calls `main()` when the guarded comparison succeeds.

That satisfies the required null-safety fix for import contexts where `process.argv[1]` is absent or malformed.

### 9.2 Remaining Risk

No remaining blocker from the debate-file evidence. Not adding a direct `isDirectExecution()` unit test is acceptable for this focused parser fix because the function is a defensive import guard, not the parser behavior under test, and the targeted parser suite still passes 12/12 per Section 8.2.

### 9.3 Commit Gate

APPROVE to commit the staged parser fix, subject to the already-reported checks staying true:

- `node --test scripts/__tests__/consult-gemini.parseArgs.test.mjs` passes.
- Rule 44 staged secret scan remains clean.
- No unrelated WIP or repo-hygiene artifacts are staged with the commit.
