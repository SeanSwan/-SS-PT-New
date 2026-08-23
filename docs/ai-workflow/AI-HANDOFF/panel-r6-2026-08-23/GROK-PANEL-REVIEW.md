# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R6-2026-08-23.md
**Seed:** (none)
**Tokens:** 3560 in / 20476 out · **Cost:** ~$0.1298 · **Wall:** 340.9s · **finish:** stop

---

## VERDICT
REVISE — `classifyCommand` always returns a verdict, but a single incidental `SCRIPT_EXT` token still yields false `OK` (emit-silent) when the real entrypoint is extensionless, which is the same “silence ≡ clean” class rounds 1–5 were killing.

## BLOCKERS
1. **P1** — Input `node --import ./preload.mjs ./guard` (or `-r` / `--require` / `--experimental-loader` / `--loader` with a space-separated file) where `./preload.mjs` exists and `./guard` is missing or extensionless → `candidates === [./preload.mjs]` → `statSync` succeeds → `{kind:'OK'}` → no push to `missing`/`unresolvable` → emit path is silent. Same shape as the round-5 “took the first of two scripts” outage; they only closed the *two-extension* subset, not the *one incidental extension + extensionless entry* subset. Evidence: `candidates = words.filter(SCRIPT_EXT && !URL_SCHEME)` then `candidates.length > 1` UNVERIFIED, else `tok = candidates[0]` asserted; `OK` is explicitly “the only outcome that produces no output.”

2. **P2** — House rule `<=300 lines per file`. This snippet is check 7 alone (~200+ lines of comments + logic) and the emit/exit trailer; the file still hosts checks 1–6. Almost certainly over the cap; split check 7 (classify + settings walk + emit) before adding more cases.

## ATTACKS
- Correctness: Invariant holds only as *cardinality* (never zero returns from `classifyCommand`). It does not hold as *soundness*. False `OK` as in blocker 1. Complementary false `MISSING`: sole `SCRIPT_EXT` token is a glued flag (`node --import=./preload.mjs ./guard`) → `tok` is `--import=./preload.mjs` → `join(SS_PT, tok)` ENOENT → `MISSING` (“DO NOT EXIST”). `isFile()===false` (directory / fifo / socket named `x.mjs`) is reported `MISSING` with copy “DO NOT EXIST”; `statSync` never throws `EISDIR` (that comment is wrong — `stat` succeeds on dirs). `join(SS_PT, tok)` normalizes `scripts/../../outside.mjs` out of the tree; if that file exists the registration is `OK`. Stale header comment still says “ONLY the first such path is asserted”; the code (correctly) declines `candidates.length > 1` — two comments in the same function disagree. Tests as described (“24 + 15 fuzz asserting the INVARIANT”) only lock “exactly one verdict,” which an always-`UNVERIFIED` stub or this false-`OK` path would pass; that is how round 3 shipped silence-as-correct.

- Security: Local linter, not an authz boundary. Residual issues: `..` escape via `join` (above); newline/`\r` not fully neutralized before interpolation into findings (`\n` is `SHELL_META` but still copied into `brief` and can split the numbered emit); always `process.exit(0)` is intentional fail-open — operators grepping exit codes cannot detect drift. No injection into a shell (this process only `stat`s). No tenant/PII/LLM path in the shown code.

- Data-truth / schema drift: Only `hook?.command` (string) is classified. If Claude’s live schema uses `cmd` / argv-array `command` / group-level `command` / `type:"prompt"` with no `command`, every such entry is `UNVERIFIED` (“no usable command string”) and real missing files are never named. `JSON.parse` on `.claude/settings.json` will mark the whole file `unreadable` if the project uses JSONC comments (common in Claude settings); then *none* of the 13 registrations can be `OK` and the message “harness runs NONE of the hooks” can be factually false. `SCRIPT_EXT` / `URL_SCHEME` / `SS_PT` are not in the snippet — an unanchored `SCRIPT_EXT` turns interpreter install paths like `…/node.mjs/bin/node` into extra candidates (`UNVERIFIED`) or, with one match, asserts the wrong token. Paths are joined to `SS_PT` only; a registration relative to `.claude/` reads `MISSING`.

## HIGHEST RISK
False `OK` on “exactly one script-looking word that is not the entrypoint” (blocker 1) — emit-silent phantom guard, the bug this check exists to catch. Cheapest de-risk before ship: add a fixture that *must not* be `OK` (`node --import ./preload.mjs ./guard` with preload present, guard absent), and tighten the assert grammar to: first word = interpreter, exactly one positional non-flag operand, that operand is the only `SCRIPT_EXT` match and is relative; any extra positional → `UNVERIFIED`. Then drive `classifyCommand` over the 13 real `command` strings and require `kind==='OK'`.

## CONFIDENCE
Could not verify from this document: definitions of `SCRIPT_EXT`, `URL_SCHEME`, `SS_PT`, `findings`; the 13 live registrations; whether settings are strict JSON or JSONC; checks 1–6 and true file length; the 24+15 tests (especially whether they assert *kind*, not just count); Claude hook schema actually deployed (`type`, argv `command`, prompt hooks). Evidence that would settle it: those constants, a dump of the 13 `command` strings with this function’s verdicts, `wc -l` on the file, and the test file contents. I am confident the false-`OK` hole exists in the shown control flow; I am not confident it is hit by the current 13.
