# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-R4-2026-08-23.md
**Seed:** (none)
**Tokens:** 3984 in / 15818 out · **Cost:** ~$0.1027 · **Wall:** 176.7s · **finish:** stop

---

## VERDICT
REVISE — the simple-vs-UNVERIFIED split is the right design, but the implementation still has silent-clean paths (quoted subcommands, complex commands with no visible extension, space-bearing tokens) that recreate the original outage the check exists to destroy.

## BLOCKERS
1. **P1** — `sh -c "node scripts/hooks/missing.mjs"` (or `bash -c '…'`) with a REAL missing file → no `missing`, no `unresolvable`, check is silent = clean. Quotes are not in `SHELL_META`, so the command takes the ASSERT path; tokenize collapses the quoted run into one space-bearing token; `if (/\s/.test(tok)) continue` drops it. Contradicts the redesign contract (“anything else → UNVERIFIED, never clean”). Same hole for a legitimate simple command `node "my hooks/x.mjs"`. Evidence: `SHELL_META = /[;&|><`$(){}*?~!#\n]|\\\s/` (no `'`/`"`); the `\s` skip plus the comment that explicitly calls this “NONE: quoted subcommand”.

2. **P1** — complex command with no substring matching `/\.(?:mjs|cjs|js|ts|mts|cts|sh|bash|ps1|py|rb)\b/i` → `continue` with nothing recorded. `node $HOOK_DIR/lane-session-start`, `eval "$STARTUP"`, `bash $STARTUP_SCRIPT` all read as clean. Design text says complex is always UNVERIFIED; the extension gate makes “unknown” collapse back to silence. Evidence: the `if (SHELL_META.test(cmd) || /%[A-Za-z_]…%/.test(cmd)) { if (/\.(?:mjs|…)\b/i.test(cmd)) { unresolvable.push(…) } continue; }` block.

3. **P2** — ASSERT still admits ambiguous commands, so a HEALTHY hook can phantom. Any non-meta argv that merely *ends* with a script extension is `statSync`’d as a required file: `node hook.mjs --loader=foo.js`, `node hook.mjs config.ts`, `node --require=./preload.mjs` when that path is not a repo file → `missing.push`. Evidence: `if (!SCRIPT_EXT.test(tok)) continue` then unconditional `statSync(abs).isFile()` with no “this token is the script operand” check.

No exit-code/egress blocker is possible: that code is not in the excerpt (see CONFIDENCE).

## ATTACKS
- Correctness: Happy-path matrix (23/23) never forces “quoted subcommand + missing file → UNVERIFIED” or “`$VAR` path with no extension → UNVERIFIED”, so both ship as green. `tokenize` + quote-stripping is live only for the no-meta branch; the long glue comment about `"$CLAUDE_PROJECT_DIR"/scripts/…` is dead (that string hits `$` and never tokenises). `URL_SCHEME` / space-token guards exist only on the ASSERT path, so they cannot promote a complex command to UNVERIFIED. `statSync` permission/ENOTDIR failures are labelled “DO NOT EXIST”. Outer `catch` is fail-open-with-finding (good) but we cannot see whether emit/exit treats that finding as blocking.
- Security: Local existence checker; no command execution, so no injection/SSRF from this block. Residual: `cmd.slice(0, 90)` is copied into `findings` (hook argv can carry tokens). Document claims “API key length no longer printed” — not in this excerpt, unverified. `statSync` on a UNC/`//host/…` token is a cheap hang/DoS of the gate, not of a tenant boundary. No authn/IDOR/multi-tenant surface here. Zero PII-to-LLM in this snippet (IDs/paths only).
- Data-truth / schema drift: Defensive on `hooks` not-array / group without `hooks` / non-string `command` (good — those used to launder into clean). Drift still possible: (a) prompt/HTTP hook types with no `command` become “registers nothing”; (b) user-level `~/.claude/settings.json` is never read, only `SS_PT/.claude/settings.json` and `settings.local.json`; (c) `seen` key is `${event}:${tok|cmd}` without filename, so a broken entry in one file can be suppressed by a duplicate in the other. No PascalCase/snake_case table issues (not a DB path). Frontend response-shape N/A.

House rules on this artifact: no MUI/Recharts/yoga/NASM-certified violations in the snippet. Check 7 alone is ~200+ lines of comments+code; `drift-check-gate.mjs` almost certainly breaks `<=300 lines per file` — cannot count the rest of the file from this excerpt.

## HIGHEST RISK
Silent-clean on any registration that is not a bare `interpreter + extensioned path` — especially `sh -c 'node …mjs'` and `$VAR` paths without a visible extension. That is the original outage (absence ≡ healthy) reopened for the command shapes people actually wrap hooks in.

Cheapest de-risk before ship: (1) treat `'`/`"` **or** any space-bearing token as complex; (2) on the complex branch, **always** `unresolvable.push` (drop the extension predicate); (3) add two matrix rows that must NOT be silent: `sh -c "node scripts/hooks/definitely-missing.mjs"` and `node $DIR/also-missing` → UNVERIFIED, and `node "scripts/hooks/existing.mjs"` still ASSERT. Do not try to name the inner file.

## CONFIDENCE
Could not verify from the document alone:
- Emit / dry-run exit / “API key length no longer printed” — excerpt stops at `// ---- Emit: silent when clean`. Question 4 is unanswerable; a fail-open finding that still exits 0 in CI would make every blocker above worse.
- Whether *this repo’s* real `.claude/settings.json` commands are all simple `node path.mjs` (then P1s are latent) or already use `bash -c` / `$CLAUDE_PROJECT_DIR` (then P1s are live).
- Definitions of `read`, `SS_PT`, `findings`, and the `statSync`/`join` imports — assumed correct and in scope.
- Full file length (300-line rule) and whether Claude now has non-`command` hook types.
- That `statSync(join(SS_PT, tok))` matches how the harness resolves cwd / PATH / bare names on Windows vs POSIX.

What would settle it: the rest of `drift-check-gate.mjs` from emit through `process.exit`; the actual project hook commands; a fixture run of the two cases in HIGHEST RISK plus `node hook.mjs config.ts` (phantom) on a clean tree.
