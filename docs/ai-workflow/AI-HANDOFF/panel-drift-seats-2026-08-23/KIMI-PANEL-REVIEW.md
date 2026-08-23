# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-DRIFT-SEATS-2026-08-23.md
**Seed:** (none)
**Tokens:** 7764 in / 3767 out | **Cost:** ~$0.0798 | **Wall:** 50.9s | **finish_reason:** stop

---

## VERDICT
REVISE — No single crash-level defect, but the default panel roster silently ships every reviewed document to a prompt-retaining stealth provider, and the spend gate's core invariant ("no flag = no money spent") is now false.

## BLOCKERS

1. **P1 — `ox` (stealth/ox-alpha) is in the DEFAULT roster.** `scripts/consult-panel.mjs`, `arg('--seats', 'kimi,glm,qwen,ox,gemini,grok,dspro,dsflash')`. Failure scenario: operator runs the documented bare command `node scripts/consult-panel.mjs --document docs/SPEC.md` → the document is sent to `stealth/ox-alpha`, whose own seat note says "prompts are RETAINED and seen by that provider" and "Only send it packets that are already scrubbed." Nothing in the default path enforces or verifies that scrubbing — the Gemini seat redacts via `readForEgress`/`redactForEgress` (`consult-gemini-panel.mjs` imports), but ox rides `consult-grok.mjs`, and this document supplies no evidence that transport redacts. Premium seats require explicit naming + `--confirm-spend` because they cost *money*; ox costs *data* and gets the opposite treatment — opt-out instead of opt-in. This is the same "silence looks like safety" failure shape the packet itself celebrates catching.

2. **P1 — Spend gate invariant broken by `gemini: paid: false`.** `panel-seats.mjs` gemini seat: `paid: false, inPerM: 0, outPerM: 0`; `consult-panel.mjs`: `seatsToRun = requested.filter((n) => confirmSpend || !SEATS[n].paid)`. Failure scenario: operator runs without `--confirm-spend`, sees "SKIPPING paid seats… no --confirm-spend" and "estimated spend ~$0.00xx", and reasonably concludes no money was spent — but the Gemini seat ran and billed against Sean's personal Google API key at real Gemini 3.1 Pro prices. The comment acknowledges this ("does NOT mean Google bills nothing") but the *estimate line* still prints `$0` and the gate message still implies zero spend. The gate's stated purpose is "protect MONEY (Rule 16)," not "protect OpenRouter credits specifically."

3. **P2 — Markdown header blank lines are filtered out, mangling the artifact.** `consult-gemini-panel.mjs`: the `header` array deliberately includes `''` separator lines, then `.filter((l) => l !== '')` strips every one of them. Result: `# Gemini Panel Review\n**Model:**…\n**Document:**…\n**Tokens:**…\n---\n\n<text>` — the intended blank lines after the H1 and around the metadata block never exist, so the header renders as one run-on paragraph in strict markdown parsers. The filter exists only to drop the empty `truncated` branch; it should filter *that element* (e.g. `filter(Boolean)` on a conditional) or use `.flatMap`, not nuke all separators. The truncated-warning line embeds a literal `\n` to compensate, which proves the author half-noticed.

## ATTACKS

- **Correctness:**
  - `consult-gemini-panel.mjs`: safety-blocked responses (`promptFeedback.blockReason`, no `candidates`) collapse into `empty response (finishReason=?)` — the one error the operator most needs named (content refusal) is reported as a generic empty. Happy-path-only handling of Google's response envelope.
  - `resolveKey()`: if `.env` contains `GEMINI_API_KEY=` (empty value), `m[2]` → `''` → `.trim()` → `''` → returned as truthy-ish? No — `return m[2]...trim()` returns `''`, and `if (!apiKey)` catches it, but the loop `return`s on the *first match* even when that match is empty, never checking the second .env file or the other var name later in the same file. Empty first match shadows a valid second entry.
  - `arg('--seats', DEFAULT)` in consult-panel: `--seats` passed as the final argv token with no value returns the *default roster* (because `argv[i+1] === undefined` → returns `d`), silently running seats the operator tried to constrain. Same latent shape as the fixed `--seats ""` bug, one argv position away.
  - `drift-check-gate.mjs` check 7: the outer `catch { /* fail-open */ }` swallows *any* exception, including a TypeError from a malformed-but-parseable `cfg.hooks` shape (e.g. `hooks: []` → `Object.entries` fine, but `hooks: {"PreToolUse": {}}` → `groups || []` on an object iterates nothing — silently zero coverage). A bug in the check itself is indistinguishable from "no missing hooks" — the exact phantom-guard failure the check exists to detect, re-implemented one level up.

- **Security:**
  - API key in URL query param (`?key=${apiKey}`). Query strings land in proxy/CDN access logs and any future error telemetry that captures `url`. Google supports `x-goog-api-key` header; the code already knows query-param keys are dangerous (it redacts the key from echoed errors) yet still puts it in the most-logged position. P2.
  - Key redaction via `split(apiKey).join('<REDACTED>')`: if a malformed `.env` yields a 1–2 char "key" (e.g. `GEMINI_API_KEY=x`), the redaction shreds every occurrence of that character in error output — not a leak, but it means redaction correctness depends on key length, and a *short prefix collision* of a real key in an error message would partially survive. Minor.
  - ox seat: see Blocker 1. Additionally, `dspro`/`dsflash`/`ox`/`grok` all share `consult-grok.mjs`, which the document itself flags as still having the cwd-relative ROOT defect — from a worktree, four of eight seats die with a config-looking error. Acknowledged but shipped anyway.

- **Data-truth / schema drift:**
  - `panel-seats.mjs` pricing table is hand-maintained ("re-verified 2026-08-21") with no drift check against the OpenRouter catalog — the drift-check gate gained a hook-existence check but nothing guards stale `inPerM/outPerM`, so the pre-spend estimate can silently understate Fable/Sol pricing. The estimate is the artifact Sean uses to say yes/no; stale numbers = uninformed consent.
  - Check 7's `PATH_RE` only matches paths containing `scripts/` or `.claude/` with extensions `(mjs|js|sh|ps1|py)`. A hook registered as `node hooks/guard.mjs`, `bash ~/bin/guard.sh`, or `$CLAUDE_PROJECT_DIR/tools/guard.mjs` matches nothing and is reported as existing-by-omission. The check's coverage claim ("registered hooks whose files do not exist") is broader than what the regex can see — registration-vs-existence drift the check itself can't detect.
  - Check 7 only reads `.claude/settings.json` and `settings.local.json` under `SS_PT`; user-level `~/.claude/settings.json` hooks are invisible to it. Same phantom-guard hole, one scope up.

## HIGHEST RISK

**Blocker 1 — ox-alpha in the default roster.** It is the only defect that is (a) triggered by the documented happy path, (b) irreversible (retained prompts can't be un-sent), and (c) unverifiable at runtime — the operator gets no signal that scrubbing did or didn't happen. Cheapest de-risk: remove `ox` from the default `--seats` string and gate it exactly like premium seats (explicit naming required), reusing the existing `premiumRequested` pattern with a `dataSensitive: true` flag — a two-line change to files already in this diff, no new machinery.

## CONFIDENCE

- **Could not verify whether `consult-grok.mjs` applies egress redaction.** Blocker 1's severity hinges on this: if the grok transport also calls `redactForEgress`, ox drops from P1 to P2 (still wrong as opt-out, but scrubbed). Evidence that settles it: the `consult-grok.mjs` source, or one captured outbound request body to `stealth/ox-alpha`.
- **Could not verify the real `.claude/settings.json` hook schema in use.** Check 7 assumes `{hooks: {Event: [{hooks: [{command}]}]}}`; if the harness also supports top-level `matcher`-less arrays or `type: "prompt"` hooks, the check under-counts. Evidence: an actual settings file from the repo.
- **Could not verify `read()`'s null contract** in drift-check-gate (absent vs. unreadable vs. empty) — if `read` returns `''` on missing file instead of `null`, `JSON.parse('')` throws and a *missing* settings.local.json gets reported as "not valid JSON — runs NONE of the hooks," a false-positive P1-grade alarm. Evidence: the `read` helper's source.
- **Could not verify Google API behavior on `maxOutputTokens` + thinking models** for Gemini 3.1 Pro — the MAX_TOKENS handling is patterned on DeepSeek's failure, but whether Gemini returns partial `parts` with `finishReason: MAX_TOKENS` or empty candidates is assumed, not shown.
- House rules: nothing in this packet touches styled-components/Victory/palette/touch-targets, and no "NASM-certified" or yoga/meditation language appears — no violations to flag, but I also can't verify the *absence* of violations in files not included (consult-sol.mjs, consult-kimi.mjs, consult-fable.mjs are referenced but not shown).
