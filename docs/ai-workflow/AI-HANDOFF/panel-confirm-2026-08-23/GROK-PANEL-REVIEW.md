# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-CONFIRM-2026-08-23.md
**Seed:** (none)
**Tokens:** 9032 in / 25476 out · **Cost:** ~$0.1707 · **Wall:** 467.0s · **finish:** stop

---

## VERDICT
REVISE — the five stated bugs are fixed in the two files shown, but P4 is scoped so narrowly it will green-light a regression of the exact wrong-file class it was added to catch, and the new RUNNERS/stray rule inverts `deno`/`npm` (legal form declined, illegal form can OK).

## BLOCKERS
1. **P1** — Mutate away the stray-operand or `FLAG_TAKES_FILE` guard. Input `node -r ./hooks/present.mjs hooks/present` (adversarial generator already emits this shape: `FLAGS` contains `-r ./hooks/present.mjs`, `PATHS` contains extensionless `hooks/present`). Classifier returns `{kind:'OK', key:'./hooks/present.mjs'}` about the loader; the real entrypoint was never inspected. P3 passes because that file exists. P4 does not run because `generate()` sets `intended: null` on the adversarial branch and also on any plain target matching `/\s/` — including the motivating fixture `hooks/pre load.mjs`. Fuzzer prints `all properties held` and exits 0. Evidence: `scripts/hooks/drift-check-gate.fuzz.mjs` (`generate()` plain branch `intended: coherent ? target : null`; adversarial `intended: null`; P4 gated on `if (intended && (v.kind === 'OK' || v.kind === 'MISSING'))`); `scripts/lib/hook-registration.mjs` (`FLAG_TAKES_FILE`, `strayOperand`).

2. **P2** — `.claude/settings.json` command `deno run hooks/present.mjs` or `/usr/bin/env node hooks/present.mjs` or `python3.12 hooks/x.py`. `deno`/`env`/`node` are fine but `run`, `/usr/bin/env`, and `python3.12` fail `RUNNERS` and do not start with `-` → `UNVERIFIED`. Legitimate registrations become loud UNKNOWN every run; operators learn to ignore the unresolvable bucket (the failure mode the header comment itself names). Evidence: `scripts/lib/hook-registration.mjs` (`RUNNERS = /^(?:node|npx|npm|bun|deno|…|env)$/i` plus `strayOperand = before.find((w) => !w.startsWith('-') && !RUNNERS.test(w))`).

3. **P2** — Inverse of (2): command `deno hooks/present.mjs` or `npm hooks/present.mjs`. No stray operand (`deno`/`npm` are RUNNERS), file exists → `{kind:'OK'}`. Deno will not execute a file without `run`; npm will not execute that path. Dead hook, gate reads clean. Evidence: same `RUNNERS` list; OK path is `statSync(abs).isFile()` after the stray check.

No crash/totality fall-through found in `classifyCommand`. Fixes 1, 2, and 6 have no files in this package — not invented here.

## ATTACKS
- Correctness: Totality looks closed — every branch of `classifyCommand` returns `OK|MISSING|UNVERIFIED`; empty/non-string, quotes, `SHELL_META`, unusual ws (`[^\S \t\n]`), `..`, absolute, `=`/`:`, flag-embedded path, and stat errno are all explicit. Happy-path-only logic has moved into the *oracle*: P4 only ever sees `runner + one coherent PATHS token [+ --flag]`, so it cannot fail the identity cases the comments claim it found. `norm` only strips a single leading `./`, which is fine solely because the generator never produces another prefix. `--inspect-brk` is wrongly in `FLAG_TAKES_FILE` (it takes an optional `[host:]port`, not a file) → `node --inspect-brk hooks/present.mjs` false-declines. `SHELL_META` already bans `\n`, so the later split on `[ \t\n]+` never sees a newline — dead, not wrong. xorshift uses `state >> 17` (arithmetic) instead of `>>>`; still deterministic, weaker period, not a gate bug. `record` keeps 12 failures and then lies about the count; exit code is still 1.
- Security: Local audit of `.claude/settings.json` + `stat`/`realpath`. Lexical `..` declined before `resolve` collapse; realpath containment skipped on ENOENT so absent files still alarm MISSING (the round-8 bug they describe looks actually fixed). No authn, no SSRF, no secret handling, no multi-tenant surface. Unbounded `readFileSync` of settings is a theoretical DoS, not realistic. TOCTOU between realpath and stat is irrelevant for a repo-local gate.
- Data-truth / schema drift: Claude hook shape `hooks[event][] → {hooks:[{command}]}` is what they walk; bad roots / `hooks: null` / non-array groups now emit `shape` findings instead of iterating zero times (the 2026-08-22 signature one level up). They do not read `type`, matchers, or user-global/managed settings — `scopeNote` says so. No PascalCase/snake_case or FK issues. Frontend response-shape: N/A. Dedupe key `${name}:${event}:${v.kind}:${v.key}` will collapse two different UNVERIFIED whys that share a command string; only the first `why` is kept.

Degenerate-run detection: `--iterations 0` / `NaN` / non-finite / `<=0` / no OK / no MISSING now skip the pass line and `process.exit(2)`. Residual shape that still prints proof without testing P4: any run that lucks into ≥1 OK and ≥1 MISSING entirely from the adversarial branch (`intended` always null). That is not “tested nothing,” but it is “P4 proved nothing” while claiming all properties held. `--seed 0` collapses to seed 1 (`SEED >>> 0 || 1`).

House rule: `hook-registration.mjs` is comment-heavy and almost certainly over the 300-line cap it was extracted to satisfy — flag and `wc -l` it; I did not count from a real file.

## HIGHEST RISK
P4 + generator together do not lock the identity invariant. Cheapest de-risk before ship: add a tiny explicit golden table (not fuzz) for `node hooks/pre load.mjs` → UNVERIFIED, `node -r ./hooks/present.mjs hooks/absent.mjs` → UNVERIFIED, `node hooks/present.mjs` → OK, `node hooks/absent.mjs` → MISSING, `node --import=./hooks/present.mjs ./guard` → UNVERIFIED, and decide `/usr/bin/env node hooks/present.mjs` / `deno run hooks/present.mjs` (either extend RUNNERS with path-basename + a `run`/`exec` subcommand allowlist, or stop listing `deno`/`npm` as bare runners). Then re-run the fuzzer against a mutant that deletes the strayOperand block — that mutant must fail.

## CONFIDENCE
Could not verify from this document: seat-registry `--confirm-spend` (fix 1), panel `null`-on-silent-exit-0 (fix 2), Gemini seed EISDIR/typo (fix 6) — those files are absent, so those three fixes are unreviewed, not approved. Could not `wc -l` either complete file against the 300-line rule. Could not see production `.claude/settings.json` commands, so I do not know whether `/usr/bin/env` / `deno run` / versioned Python actually fire in CI. Could not run the fuzzer or a deletion-mutant.

Evidence that would settle it: the three missing diffs; `wc -l scripts/lib/hook-registration.mjs scripts/hooks/drift-check-gate.fuzz.mjs`; a dump of registered hook `command` strings; one CI log of `node scripts/hooks/drift-check-gate.fuzz.mjs --iterations 20000 --seed 1`; and a second run with the strayOperand block stubbed out (must exit 1).
