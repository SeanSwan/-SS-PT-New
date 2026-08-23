# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-DRIFT-SEATS-2026-08-23.md
**Seed:** (none)
**Tokens:** 8104 in / 7717 out · **Cost:** ~$0.0266 · **Wall:** 585.7s · **finish:** stop

---

## VERDICT
REVISE — multiple defects including a PII leak via unredacted seed, a likely broken kimi seat due to an interactive flag, and missing file existence check causing crashes.

## BLOCKERS
1. **P0** – The kimi seat definition in `panel-seats.mjs` includes `--confirm-spend` in its args array. This will almost certainly cause `consult-kimi.mjs` to prompt for user confirmation or exit with an error, breaking the non-interactive panel run.  
   **Evidence:** `panel-seats.mjs` kimi seat args: `'--confirm-spend'`.

2. **P0** – In `consult-gemini-panel.mjs`, the seed file is read with raw `readFileSync` without redaction, so any PII in the seed is sent to Google API, violating the “zero PII to LLMs” rule.  
   **Evidence:** `const seedText = seed && existsSync(seed) ? readFileSync(seed, 'utf8') : '';` (no redaction).

3. **P1** – `consult-gemini-panel.mjs` does not check if the document file exists before calling `readForEgress`, causing an unhandled synchronous exception (crash) instead of a clean error exit.  
   **Evidence:** After argument validation, `const body = readForEgress(document, { label: 'document' });` with no `existsSync` check.

## ATTACKS
- **Correctness:**
  - The kimi seat’s `--confirm-spend` flag likely makes it interactive, hanging the panel.
  - Missing file existence check in gemini seat leads to unhandled crash.
  - The spend gate logic defines `seatsToRun` but the snippet cuts off; if not used, the panel might run all requested seats regardless of payment status (unverified).
  - Token estimation uses raw document length, not redacted length, causing minor cost inaccuracy.
- **Security:**
  - Seed file content is not redacted before sending to external API (PII leak).
  - API key is passed as a URL query parameter, which may be logged by intermediaries (though standard for Google API).
  - The `ox` seat sends prompts to an undisclosed provider that retains them; while noted, there is no explicit confirmation gate for this privacy risk.
- **Data-truth / schema drift:**
  - The default seat roster string in `consult-panel.mjs` (`'kimi,glm,qwen,ox,gemini,grok,dspro,dsflash'`) is hardcoded separately from the seat registry; adding/removing seats in `panel-seats.mjs` without updating this string will cause drift (missing seats or unknown seat errors).

## HIGHEST RISK
The unredacted seed file sent to Google API is the most dangerous, as it directly violates the zero-PII rule and could leak sensitive data.  
**Cheapest de-risk:** Wrap the seed read with `readForEgress` (or a dedicated redaction) before including it in the prompt, or enforce that seed files are pre-redacted.

## CONFIDENCE
I could not verify the behavior of `readForEgress` (does it fully redact PII?) and the kimi seat’s handling of `--confirm-spend` without seeing `lib/redact-egress.mjs` and `consult-kimi.mjs`. To settle: review those files to confirm redaction coverage and whether `--confirm-spend` causes interactive blocking. Also, the panel orchestration after the snippet is unseen; need to confirm `seatsToRun` is used correctly to avoid running paid seats without confirmation.
