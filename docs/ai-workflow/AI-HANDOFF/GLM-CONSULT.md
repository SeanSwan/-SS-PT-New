# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 6650 in / 26369 out (reasoning: 24013) | total 33019
**Wall:** 739.9s

---

# Round 2 findings — SWA-230

Line numbers approximate (source as pasted). Everything below is new or a broken/incomplete fix; round-1 items otherwise stay closed.

## A. New defects from `pathsFromCommand`

**R2-1 — HIGH — vault-guard.mjs:~205 (walk gate) + ~239 (Bash branch). Repo-wide destructive commands snapshot nothing.**
`git reset --hard origin/main`, `git checkout -- .`, `git clean -fdx`, `git stash`, `rm -rf .` destroy every uncommitted blueprint version, and none of them name a file: `--hard`/`-fd` are skipped (`tok.startsWith('-')`), `origin/main` doesn't stat, and `.` resolves to REPO where `rel === ''` → `continue`, so the docs/ walk never fires. Failure scenario: agent edits a blueprint 3× (intermediates vaulted ✓), then runs `git reset --hard` — the **final live version** is destroyed with zero snapshots, exactly the loss class F1 exists to close. These are among the most common agent commands.
Fix: a scorched-earth detector that triggers the bounded walk (docs/ + root operating files) regardless of path tokens:
```js
if (/\bgit\s+(reset\s+--hard|checkout(\s+\S+)*\s+\.|clean\s+|stash)|\brm\s+-[rf].*\s\.\s*$/.test(command))
  walkVaultClassTree();   // reuse the docs/ walk + root CLAUDE/SOUL/ACTIVE-INDEX/SWAN-*.md, SCAN_CAP-bounded
```

**R2-2 — MEDIUM — vault-guard.mjs:~194. Relative tokens resolved against REPO only, not the shell's cwd.**
`cd frontend && sed -i s/a/b/ AGENTS.md`: `AGENTS.md` stats at REPO root → ENOENT; `frontend` is a dir not under docs/ → no walk. `frontend/AGENTS.md` (vault-class per F7) is silently missed. Same for any `cd subdir && formatter *.md`.
Fix (cheap, bounded): resolve each token against `[REPO, process.cwd()]`, and additionally try `dirToken + '/' + fileToken` for the cross-product of directory-like and file-like tokens already collected. Also note the F1 test encodes the assumption "Bash cwd == REPO" (`cwd: os.tmpdir()` + repo-relative path) — its "prove cwd-independence" comment is false for the Bash branch.

**R2-3 — MEDIUM-LOW — vault-guard.mjs:~188–196. SCAN_CAP bounds the result, not the work.**
`cat > docs/x.md <<'EOF' …1MB prose… EOF` is idiomatic agent behavior. Every 2–300-char BARE token in the heredoc body gets a `statSync()` (mostly ENOENT), ~10⁵–2×10⁵ syscalls, hundreds of ms — on **every** Bash call (PreToolUse). The `files.size >= SCAN_CAP` break never triggers because prose tokens don't exist.
Fix: cap the scanned region (`command.slice(0, 16384)`) or cap tokens examined (`if (++seen > 2000) break;`). Paths virtually always appear in the head of a command.

**R2-4 — LOW — vault-guard.mjs:~196. Glob/pathspec forms missed.**
`prettier --write 'docs/**/*'`, `git checkout -- ':(glob)docs/**'`: glob chars fail `statSync`, and no bare `docs` token exists, so the walk never fires.
Fix: if a failed-stat token contains `docs` as a path component plus glob metachars (`*?[`), trigger the docs/ walk.

**R2-5 — LOW — vault-guard.mjs:~179. Windows absolute paths shatter.**
`\` isn't in the BARE charset, so `C:\repo\docs\x.md` fragments into `C`, `repo`, `docs`, `x.md`; it's saved only by the accidental `docs` fragment triggering the walk (and root operating files are caught only if the basename fragment coincides). Fix: add `\\` to BARE on win32 or pre-normalize backslashes per token.

## B. Fixes that are broken or half-done

**R2-6 — LOW — vault-guard.mjs:~94. F7 half-done: nested build output still vault-class.**
`node_modules` nesting was fixed (`includes('/node_modules/')`) but `dist|build|coverage` are root-anchored only: `frontend/dist/graph.mmd` → `true` → generated artifacts eat per-file quota, the exact F7 failure mode. Fix: mirror the node_modules treatment (`lower.includes('/dist/') || …`), or at minimum exclude `.(mmd|mermaid)` under any dist/build/coverage.

**R2-7 — LOW — vault-guard.mjs:~223. `invokedDirectly` compares non-realpath'd paths.**
If settings.json ever points at a **symlink** to the hook (or a case-variant path on macOS), `argv[1] !== import.meta.url` → the body never runs → silent exit-0 no-op while the user believes they're protected. Fix: compare `fs.realpathSync` of both sides.

**R2-8 — MEDIUM — backup-repo.mjs, mirrorVault(). Mirror drops mtimes, re-introducing the F5 bug class after a restore.**
`cpSync` defaults to `preserveTimestamps: false`, so every mirrored snapshot's mtime ≈ copy time. Restore the mirror after losing the vault and prune-by-mtime degenerates to all-ties → filename (stamp) tie-break — precisely the ordering F5 removed (any historical clock skew is now baked in forever). Fix: `fs.cpSync(src, dst, { recursive: true, force: true, preserveTimestamps: true })`. Also verify (not shown here) that `mirrorVault()` is called unconditionally, including on the bundle-failure path.

**R2-9 — HIGH (deployment, known-pending) — settings matcher.**
By your own note the Bash branch is dead until the matcher is approved — until then, `sed -i` again produces zero snapshots. Two asks: (1) also confirm **Write** is in the matcher; round 1 never says it is, and a Write-only-Edit matcher loses every full overwrite; (2) the regression suite cannot see settings drift — add a test that parses settings.json and asserts the matcher contains `Write|Edit|NotebookEdit|Bash`.

## C. Tests that don't test what they claim

**R2-10 — HIGH (test integrity) — "F5: prune keeps the newest KEEP snapshots even when names sort badly".**
The test never creates badly-sorting names: v1/v2/v3 stamps ascend with mtime, so **the original lexicographic implementation passes this test verbatim**. It certifies the exact round-1 bug it exists to prevent. Fix: hand-write the slot with names n1<n2<n3 but `fs.utimesSync` mtimes in the opposite order, then trigger a further edit/KEEP and assert the mtime-newest survive.

**R2-11 — MEDIUM — "garbage SWAN_VAULT_KEEP falls back … instead of disabling prune".**
The NaN bug disabled *pruning*, not snapshotting; asserting 2 snapshots after 2 edits passes against the broken code (slice(0, NaN) → no deletions). Fix: with `SWAN_VAULT_KEEP=abc`, produce >100 versions and assert `readdirSync(slot).length <= 100`.

**R2-12 — LOW-MEDIUM — "F3 … and recorded in ERRORS.log".**
`fs.existsSync(ERRORS.log)` is vacuous after the first-ever run of the suite; a regressed `note()` still passes. Fix: unlink ERRORS.log at test start, or assert its content contains the failing rel path.

**R2-13 — LOW — test-surface gaps on the new Bash code.**
The negative control proves nothing (`npm` never existed as a file — nothing was suppressed); there is no false-positive control (mention an *existing* non-vault file, e.g. `package.json`, assert no slot); no tests for the docs-directory walk trigger, `cd`+relative (R2-2), globs (R2-4), SCAN_CAP, or destructive commands (R2-1); several tests assert one guessed slot path rather than a whole-VAULT before/after diff. No coverage for `.markdown`, root `swan-*.md`, or nested-`AGENTS.md`-but-not-`dist` interactions (R2-6).

**R2-14 — LOW — tests write live blueprints into the real repo tree.**
`tempDoc` under `docs/ai-workflow/brainstorms/` means a crash mid-test leaves `__vault-*.md` files that are permanently vault-class, get walked by any `docs` mention, and can leak into catalog tooling. Fix: single `__vault-test-tmp/` marker dir with global cleanup, plus clean ERRORS.log and empty slot parents.

## D. Remaining loss vectors (priority c)

- **R2-1 above** is the headline: repo-wide destructive Bash destroys the newest version with the user believing the vault has their back.
- **R2-8 above**: post-restore prune corruption.
- **R2-16 — LOW**: no `fsync` — power loss can leave the newest snapshot torn; a restore then silently yields a corrupt doc. Optional: `fd = openSync(...,'w'); writeSync; fsyncSync(fd)`.
- **R2-17 — LOW — vault-guard.mjs:~148**: a snapshot whose `statSync` fails during prune is treated as *oldest* and deleted first. Conservative direction is newest. One-line change.

## Clean (verified, one line each)

- Prune arithmetic, mtime tie-break, and dedupe-substring safety (`-<sha12>` can't false-positive with uniform 12-hex names) — clean.
- Path traversal / symlink escape in both `snapshot` and `pathsFromCommand` (realpath + `..` guard on both sides, walk confined to docs/) — clean.
- Exit-0-on-every-path invariant, including stdin failure, JSON failure, and `note()` failure — clean.
- F6 (nested slots), F8 (SNAP_RE), F9 (sha12) fixes and their tests — clean; the stray doubled `/**` at ~line 161 is cosmetic.

**Top three to act on:** R2-1 (destructive-command blindness), R2-9/R2-10 (the suite is green on a broken matcher and on the original F5 bug), R2-8 (mirror mtime loss).
