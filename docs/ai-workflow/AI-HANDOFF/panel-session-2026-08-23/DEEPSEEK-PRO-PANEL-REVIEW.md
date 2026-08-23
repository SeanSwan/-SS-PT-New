# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-SESSION-2026-08-23.md
**Seed:** (none)
**Tokens:** 9665 in / 8443 out · **Cost:** ~$0.0108 · **Wall:** 159.9s · **finish:** stop

---

## VERDICT
REVISE — The premium/paid gate conflation comment indicates a likely implementation defect that could unintentionally gate a free data-risky seat on spend confirmation or allow silent data egress, and the fuzzer’s blindness to the full gate logic means its green light is too narrow to trust.

## BLOCKERS
1. **P0 — Gate conflation (data egress risk)**  
   The comment in `panel-seats.mjs` states that premium seats (including the free Ox Alpha, whose prompts are retained by an undisclosed provider) “can only run when named explicitly **AND --confirm-spend is passed**.” This directly conflates the two axis: `paid` should control spend confirm, and `premium` should only force explicit naming. If `consult-panel.mjs` implements the comment, Ox either requires a non‑sensical spend confirmation for a free seat or runs without opt‑in when `--confirm-spend` is given. Either breaks the data‑gate design.  
   *Evidence: panel-seats.mjs PREMIUM SEATS comment block (approx. lines 35‑45).*

2. **P1 — Egress redaction completeness cannot be verified**  
   `consult-gemini-panel.mjs` redacts document, seed, and remit via `readForEgress` and `redactForEgress`, but the implementations of those functions are not provided. Any incomplete PII scrubbing (e.g., missing patterns, partial matches) would send sensitive data to Google’s API.  
   *Evidence: consult-gemini-panel.mjs lines 33‑34 (imports) and throughout prompt construction.*

3. **P2 — Fuzzer properties do not guarantee gate‑level truth**  
   The fuzzer only validates that `MISSING` never labels a real file and `OK` never labels a non‑file. It does not check that `UNVERIFIED` is never returned for commands whose resolved path clearly exists. A classifier that returns `UNVERIFIED` for all well‑behaved inputs could still produce both `OK` and `MISSING` on the fuzzer’s artificial corpus and pass the coverage check, leaving a blind spot.  
   *Evidence: drift-check-gate.fuzz.mjs P1‑P3 checks; no property like “if file exists → verdict ≠ UNVERIFIED”.*

## ATTACKS
- **Correctness**  
  - The two‑axis gate coherence cannot be confirmed from the provided files; the `premium` comment demands `--confirm-spend`, which contradicts the document’s own description that `premium` means “must be named” and `paid` means money.  
  - The fuzzer only tests `classifyCommand`, not the full drift‑check gate (which includes registration parsing and hook file checks). A false clean could arise from the integration, not the classifier alone.  
  - `consult-gemini-panel.mjs` creates the output directory before the API call, but the output path could be `/dev/null` or similar; `mkdirSync(dirname(out))` would throw on `/dev`, but that error is caught—still an edge case.  
  - No validation of `--max-tokens` against Google’s actual per‑model limits; exceeding them may produce confusing HTTP errors.

- **Security**  
  - The `--model` flag is directly interpolated into the API URL (`…/models/${model}:generateContent`) without allow‑listing. An attacker‑controlled model ID (e.g., `../internal/path`) could alter the request path, though bound to `generativelanguage.googleapis.com`.  
  - The fuzzer’s `statSync(resolve(root, rel))` escapes the sandbox for absolute paths like `/abs/hooks/x.mjs`, probing ex‑sandbox file existence (not contents). Low risk but sloppy for a security‑oriented tool.  
  - Seat‑level environment pinning (e.g., `SWAN_GROK_MODEL`) correctly overrides ambient env, preventing model misattribution.

- **Data‑truth / schema drift**  
  - The fuzzer assumes `classifyCommand` returns `{kind, key}` for `OK` and `{kind, path}` for `MISSING`. It validates missing properties, so a schema drift that omits the expected property would be caught as a property violation.  
  - The Gemini seat builds the prompt from three redacted sources; no hard‑coded strings leak, but the prompt construction order (`remit` then seed then body) is safe.

## HIGHEST RISK
The undocumented gate logic in `consult-panel.mjs` likely conflates the two axis because of the comment’s demand. This could either prevent the Ox seat from running (forcing a spend confirmation on a free, data‑risky seat, leading operators to bypass or misconfigure the gate) or allow Ox to run in the default roster (data retention by an undisclosed provider) if the gate is inconsistently applied.  
**Cheapest de‑risk:** Immediately review `consult-panel.mjs`’s seat selection and spend‑gate logic. Run a manual integration test with `--seats ox` **without** `--confirm-spend` and verify the API call is sent only when the operator explicitly names ox and (if required) acknowledges the data disclosure—not when only confirming spend.

## CONFIDENCE
I could not verify the implementation of the gate logic (`consult-panel.mjs`), the PII redaction functions (`readForEgress`, `redactForEgress`), or the classifier under test (`hook-registration.mjs`). These are the exact components that make egress redaction complete and the gate axes coherent.  
**Evidence that would settle it:** A code review of the orchestrator to confirm `premium` only controls default exclusion and `paid` drives `--confirm-spend`, plus a black‑box end‑to‑end test feeding a document with synthetic PII‑like markers through the panel with `--seats ox` and no spend confirm, then inspecting the outbound request for unredacted data.
