# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R9-2026-08-23.md
**Seed:** (none)
**Tokens:** 5682 in / 37474 out · **Cost:** ~$0.0624 · **Wall:** 599.8s · **finish:** stop

---

## VERDICT
REVISE — the round-8 realpath fix is still bypassable by a symlinked directory followed by `..`, so a missing hook outside the repo can still be reported OK and stay silent.

## BLOCKERS
1. **P0 — `path.resolve` collapses `..` before `realpathSync`, defeating symlink containment.**
   Concrete failure: repo root `/repo`; `/repo/link` is a symlink to `/outside/dir`; hook command is `node link/../guard.mjs`. `path.resolve('/repo', 'link/../guard.mjs')` yields `/repo/guard.mjs`. If `/repo/guard.mjs` exists, the code verifies that file and returns OK. But the actual OS path `/repo/link/../guard.mjs` resolves through the symlink to `/outside/guard.mjs`; if that file is missing, the hook is missing and the gate emits nothing. Evidence: `const abs = resolve(root, tok);` followed later by `realpathSync(abs)`; there is no `..`-segment rejection before `resolve`, despite the comment claiming `..` is declined.

2. **P1 — `split(/\s+/)` still treats CR/FF/VT as argument separators, but shells do not.**
   Concrete failure: command string `node ./guard.mjs\rx` with a literal carriage return between `mjs` and `x`. A POSIX shell treats that as a single word `./guard.mjs\rx`, which is missing. The code’s non-ASCII whitespace check explicitly allows `\r`, `\f`, `\v`, then `cmd.trim().split(/\s+/)` splits on CR, yielding candidate `./guard.mjs`. If `./guard.mjs` exists, the hook is reported OK. Evidence: `if (/[^\S \t\n\r\f\v]/.test(cmd))` permits these ASCII control separators, and `const words = cmd.trim().split(/\s+/);` splits on them.

3. **P2 — `FLAG_TAKES_FILE` whitelist is incomplete, so a data-file operand can be mistaken for the entrypoint.**
   Concrete failure: hook command `node ./missing-guard --env-file .env.mjs`, where `./missing-guard` is missing and `.env.mjs` exists. Candidate selection finds only `.env.mjs`; the previous word is `--env-file`, which is not in `FLAG_TAKES_FILE`, so the code treats `.env.mjs` as the entrypoint and returns OK. The actual registered guard is missing. Evidence: `FLAG_TAKES_FILE = /^(?:-r|--require|--import|--loader|--experimental-loader|--inspect-brk|-c)$/;` and `if (idx > 0 && FLAG_TAKES_FILE.test(words[idx - 1]))`.

4. **P2 — `String(cmd)` can throw on a JSON object with non-callable `toString`, discarding earlier MISSING findings.**
   Concrete failure: `.claude/settings.json` contains two hooks: first is a genuinely missing file, then a hook with `"command": {"toString": false}`. The first hook returns MISSING and pushes into the local `missing` array. The second reaches the non-string branch and evaluates `` `empty:${typeof cmd}:${String(cmd)}` ``; `String(cmd)` throws `TypeError: Cannot convert object to primitive value`. The exception escapes `auditHookRegistrations`, the local arrays are lost, and the caller’s catch replaces the confirmed MISSING with a generic “check could not complete.” Evidence: the non-string return in `classifyCommand`, and the unguarded `classifyCommand(hook?.command, root)` call inside the loop.

## ATTACKS
- **Correctness:** The module guarantees a verdict object, but not that the verdict is about the actual registered file. The `resolve`-then-`realpath` ordering breaks under symlinks; `\s+` splitting is not a faithful model of shell tokenization for CR/FF/VT; and the fixed file-taking-flag list is not enough to avoid mistaking a data-file argument for the entrypoint. These are false-clean paths, not just unknown paths.
- **Security:** The symlink-plus-`..` issue is the relevant path-containment escape. A settings file can make the hook-registration gate certify a different file inside the repo while the shell resolves the actual path outside the repo. There is no authn/authz, injection, SSRF, or secret-handling surface here worth mentioning beyond that local path-resolution boundary.
- **Data-truth / schema drift:** The classifier’s “extension-bearing argument = entrypoint” assumption drifts as soon as a command has an extensionless entrypoint and a file-taking option with a script-like extension. Also, `audit.scopeNote` is only pushed when `audit.findings.length` is non-zero, so on clean hook-audit runs the “project scope only” caveat disappears from output even when other drift checks have findings.

## HIGHEST RISK
The symlink-plus-`..` containment bypass is the most dangerous item because it recreates the original outage: a missing hook can be reported OK and the gate stays silent. Cheapest de-risk: reject any candidate token containing a literal `..` path segment **before** calling `path.resolve`, e.g. `if (tok.split('/').includes('..')) return unver('contains a parent-directory segment that cannot be resolved statically');`, then add a regression test with a symlink `link -> outside-dir` and command `link/../missing.mjs`; assert UNVERIFIED, never OK.

## CONFIDENCE
I could not verify the full `drift-check-gate.mjs` file or checks 1–6, since only the tail was supplied; it may or may not satisfy the 300-line cap or interact with this check in ways not shown here. I also could not execute filesystem behavior, so the symlink `..` resolution is based on POSIX/Node semantics rather than an actual test. Node version and exact shell behavior for CR/FF/VT are not stated; a test that writes a real command string with `\r` through `/bin/sh -c` would settle the CR split issue. The actual Claude settings schema version is also not specified, so the `command`-as-object crash depends on whether JSON of that shape is ever produced by real tooling.
