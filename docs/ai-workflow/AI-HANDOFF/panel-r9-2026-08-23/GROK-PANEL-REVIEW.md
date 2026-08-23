# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R9-2026-08-23.md
**Seed:** (none)
**Tokens:** 5748 in / 30272 out · **Cost:** ~$0.1929 · **Wall:** 474.5s · **finish:** stop

---

## VERDICT
APPROVE — the five round-8 fixes match the code, `classifyCommand` is still total, and I cannot construct a realistic silent-clean, phantom-MISSING, or MISSING→UNVERIFIED path from what was supplied.

## BLOCKERS
None. Do not treat that as “looks good”; it means the three questions below have no remaining concrete counterexample in these two files.

## ATTACKS
- Correctness: R8’s own rationale is still one notch incomplete. They decline non-ASCII `\s` because “a shell does not treat them as an argument separator,” then allowlist `\r`, `\f`, `\v` as safe and split on `/\s+/`. Default IFS is only ` \t\n` (`\n` is already in `SHELL_META`; `\r\f\v` are not). Input `node\v./guard.mjs` with `./guard.mjs` present → `OK`. bash/sh will not split on VT and will not run that file. Same shape as the NBSP bug, inverted (false clean instead of phantom MISSING). Realistic settings.json will not contain VT/FF; this is leftover from the fix, not a ship-stop.
- Correctness: `FLAG_TAKES_FILE` only inspects `words[idx-1]`. `node --eval foo ./guard.mjs` therefore OKs `./guard.mjs` even though node executes the eval string. Quoted `-e`/`--eval` already declines. Not a live hook shape.
- Correctness: `realpathSync` errors are all treated as “absent.” If realpath throws and `statSync(abs).isFile()` is true, containment is skipped and the verdict is `OK` on the lexical path. I could not name a common FS where that pair happens *and* the real target is outside the repo; bind mounts already evade realpath.
- Correctness: a directory (or socket) at `tok` is `MISSING`, and the finding text says “DO NOT EXIST.” Loud in the right direction; the sentence is false.
- Security: no command execution, no fetch (URL-scheme tokens are dropped before stat), no secret handling. Containment is prefix+sep after `resolve`/`realpath`, which is the right check for this job. Residual: project-scope only — a phantom hook in `~/.claude/settings.json` or managed settings is still the 2026-08-22 outage, and `scopeNote` is appended only when `audit.findings.length` is already non-zero, so a clean project never tells the operator those scopes were skipped.
- Security: findings interpolate raw `command` / `why` into stdout. Newlines in `cmd` hit `SHELL_META` and still land in `brief` (first 90 chars) — visual spoof of extra numbered lines, not a privilege issue.
- Data-truth / schema drift: N/A for DB/API. Schema risk is Claude’s hook JSON: `command` as argv-array, or a flat `Event: [{type,command}]` (no nested `hooks`), never reaches `classifyCommand`. Those become CONFIG findings, not silence — MISSING is demoted in wording, not dropped. `type: "prompt"` entries will always be UNVERIFIED.

## HIGHEST RISK
MISSING→UNVERIFIED on a symlinked/junction root is exactly the alarm this module exists to raise; the R8 control is a try/catch plus `if (real !== null)` with no test in this document. Cheapest de-risk: one fixture in the same PR — repo root is a junction/symlink, registered relative file is absent, assert `kind === 'MISSING'` (not `UNVERIFIED`). They say they proved it by hand; lock it in so the next “simplification” cannot revive round 8.

## CONFIDENCE
Could not verify: definition of `SS_PT` (wrong root → every relative verdict is a lie); the rest of `drift-check-gate.mjs` (`findings` init, whether this `await import` is legal TLA/async); the test file that supposedly fuzzes totality and the junction case; actual `.claude/settings.json` commands (whether `--import` + script, `.cmd`, prompt hooks exist); Windows as a runtime (backslash dies on `SHELL_META`; `inside` is case-sensitive). Settled by: those three artifacts plus one run of `classifyCommand('node ./hooks/absent.mjs', <junction-root>)`.
