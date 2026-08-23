# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/PANEL-PACKET-SESSION-2026-08-23.md
**Tokens:** 9220 in / 21540 out (reasoning: 18931) | total 30760
**Wall:** 329.8s

---

## VERDICT
REVISE — the Gemini adapter is near-ship quality and the roster's flag structure is sound, but the ox privacy gate is a comment where a mechanism must be, and the classifier fuzzer's green cannot detect the exact false-OK class it was built to catch.

(The document supplies no line numbers; evidence is cited as file → anchor.)

## BLOCKERS

1. **P1 — ox data-egress gate is policy, not mechanism.** `panel-seats.mjs → ox entry`: "Only send it packets that are already scrubbed to the standard we would use for any vendor" is operator discipline pinned in a comment. Nothing shown enforces redaction on the `consult-grok.mjs` transport ox rides (the Gemini seat had to add redaction call-by-call — three rounds of it — which is strong evidence the shared transport never had it). Concrete scenario: operator runs `--seats glm,qwen,ox --confirm-spend` on a handoff doc naming a client; raw text egresses to a stealth provider that **retains prompts**, irreversibly. This leaves the binding rule "zero PII to LLMs (IDs only)" unenforced on the one seat where violation is both most likely and least reversible. Fix: route the transport's document/seed/remit through `redactForEgress` at the boundary exactly as `consult-gemini-panel.mjs` now does, or make the panel refuse to seat ox unless the packet is already scrubbed-clean.

2. **P1 — the fuzzer's P2/P3 oracles check existence, not identity, so they cannot catch the headline bug class.** `drift-check-gate.fuzz.mjs → P3 block`: `isFile(v.key)` passes for ANY existing file, regardless of which token the command referenced. Concrete: the adversarial generator can emit `node -r ./hooks/present.mjs hooks/absent.mjs` (FLAGS contains `-r ./hooks/present.mjs`, PATHS contains `hooks/absent.mjs`). A classifier bug that keys on the first path-like token returns `{OK, key:'./hooks/present.mjs'}` — the file exists, P3 passes, exit 0, "all properties held" — while the real script is missing and the gate certifies a broken registration. That is precisely round 9's false-OK class surviving the instrument. P2 is mirrored: `node hooks/present.mjs` → `{MISSING, path:'hooks/absent.mjs'}` passes P2 because a hallucinated nonexistent path isn't a file. The plain generator branch *knows* the intended script (`parts[1]`) and throws that ground truth away. Fix: in the ~55% plain branch, assert OK's `key` / MISSING's `path` resolves to the intended token.

3. **P2 — hy3's 262k-context hazard has comment-only mitigation, and the schema makes it unenforceable.** `panel-seats.mjs → hy3 note` names the failure mode ("a review of a different, shorter document, which reads exactly like a real reply") but the seat schema records `inPerM`/`outPerM` and no context-window field, so no caller can check packet fit. Scenario: >262k-token packet → provider-side truncation → HY3-PANEL-REVIEW.md reads as a full review and INDEX counts it as coverage. Add `maxCtx` to the schema and have the panel warn/refuse on overflow.

4. **P2 — silent seed drop and uncaught crash in the Gemini seat.** `consult-gemini-panel.mjs → seedText`: `--seed typo.md` → `existsSync` false → `''` with **no warning**; the review silently runs without prior context while the operator believes it was included. Worse: `--seed <directory>` → `existsSync` true → `readFileSync` throws EISDIR at module top level, outside any try — raw stack, after having carefully guarded every other input. Given the seed is described as "the file MOST likely to name a real person," silently dropping it also changes the egress profile run-to-run.

5. **P2 — degenerate fuzzer corpus still exits 0.** `drift-check-gate.fuzz.mjs → end block`: the "⚠ corpus did not exercise both OK and MISSING" warning prints and then falls through to `all properties held` + `process.exit(0)`. Any CI keyed on exit code sees green. The file's own philosophy — "silence-looks-like-success" — applies to its own coverage check. Set `process.exitCode = 1` (or a distinct exit) on the warning.

6. **P2 — the two-axis gate contradicts itself on ox's second condition.** The round header says `premium = must be named`. `panel-seats.mjs → PREMIUM SEATS paragraph` says premium seats "can only run when named explicitly **AND --confirm-spend is passed**." One of these misdescribes the code, and it matters most for ox, the seat where the second condition is the entire point. The deeper conflation: the DATA gate's acknowledgment is a flag named for MONEY. The most natural future UX fix — "don't require --confirm-spend for $0 seats" — silently degrades ox back to name-only gating, which is the default-ON mistake this round just corrected.

## ATTACKS

- **Correctness:**
  - `resolveKey` returns the *first* regex match in file order: a stale empty `GEMINI_API_KEY=` in root `.env` shadows a real `GOOGLE_AI_KEY` below it or in `backend/.env` → hard "no API key" failure. Fails closed, but misdiagnoses as missing config.
  - Empty-reply detection exists **only** in the Gemini adapter. dsflash/dspro/ox ride `consult-grok.mjs`, whose empty-text exit behavior is unshown — if the transport writes an empty review and exits 0, INDEX records a seat as having reviewed when it emitted nothing. The 2026-08-21 empty-reply incident was on this exact transport; the guard was fixed in the sibling, not where it recurred.
  - `writeFileSync` failure after a successful (paid) response discards the reply — the mkdir-first fix covered the predictable case, not this one. A stderr dump of the text would salvage the spend.
  - `arg()` swallows flags as values (`--remit --document x` → `remit='--document'`); minimal parser, low impact given downstream guards.
  - The fuzzer treats a throw as a P1 violation even for `undefined`/`null`/`42` inputs — if `classifyCommand`'s contract permits throwing on non-strings, the property is stricter than the contract and false-positive-prone.

- **Security:**
  - ox retention leak is blocker 1 — the multi-tenant-scope-leak equivalent of this codebase.
  - Gemini key handling is otherwise correct and worth saying so: header not query string, presence-only logging (length removed), error-body key-strip before stderr capture into INDEX. No finding.
  - No per-seat spend granularity is visible: if panel-level `--confirm-spend` is global, confirming one paid seat unlocks all five paid non-premium seats at once. And gemini has **no cap at all** — no `--cap-usd` analog; Google-side spend is bounded only by 20k output tokens per attempt, and if the panel retries failed seats, spend multiplies ungated.
  - Kimi is the only seat passing `--confirm-spend` inside its own argv — direct invocation of `consult-kimi.mjs` self-acknowledges a $0.40 spend. Bounded, but it means one seat's child auto-confirms where every other seat defers to the panel gate.

- **Data-truth / schema drift:**
  - **sol**: env pins slug `openai/gpt-5.6-sol-pro`, but the note's own causal claim is that PRO = `reasoning.mode=pro` — a *request parameter*, not obviously implied by the slug. If mode must be sent in the body, this seat runs base-tier weights labeled PRO in every artifact and estimate. Unverifiable without `consult-sol.mjs`; the note and the mechanism may not agree.
  - Registry records price but not context window (blocker 3) — the estimator can print `$` but cannot print "won't fit."
  - grok-transport attribution: the registry side is now internally consistent (per-seat `out`, pinned `env`); the four fixed strings inside `consult-grok.mjs` are *asserted* fixed but unshown — residual risk is any fifth string or header template hard-coding a model name.
  - `getModelId('gemini-31-pro')`: registry discipline was built on OpenRouter slugs; the direct Google endpoint wants a bare model id. If the registry maps to a prefixed slug, this 404s (loud, fail-fast — but check). Also unknown whether `getModelId` throws on a missing key, which would make the `!model` guard dead code.
  - Gemini response-shape handling (`candidates`/`parts`/`usageMetadata`/`promptFeedback`, all optional-chained) — no drift risk found; this part is solid.

## HIGHEST RISK
**Blocker 1 — ox.** Irreversible disclosure to an unidentified retaining party, on a path whose only guard is a naming flag plus prose, in a codebase where the Gemini seat needed three rounds to get per-string redaction right — that history is direct evidence the shared transport never redacts. Cheapest de-risk, in order: (1) `grep -n "redactForEgress\|readForEgress" scripts/consult-grok.mjs` — ten seconds, settles whether the transport redacts at all; (2) if absent, add the same boundary call the Gemini seat uses; (3) until then, treat ox as unseatable regardless of `--seats`.

## CONFIDENCE
I could NOT verify from the document:
- **`consult-panel.mjs`** — gate enforcement (named vs confirm semantics, global vs per-seat `--confirm-spend`), seat concurrency, retry-on-failure (this determines whether gemini's uncapped spend can multiply), and how stderr reaches INDEX. Blockers 3/6 and two attacks hinge on it. Pasting its spawn + gate functions settles all five.
- **`consult-grok.mjs`** — redaction presence (blocker 1's premise), empty-reply exit code, post-fix attribution strings, the 48k default. One grep plus one read settles it.
- **`redact-egress.mjs` semantics** — I inferred `readForEgress` = read + redact from the seed comment ("goes over the wire exactly like the document, so it gets exactly the same redaction"). If `readForEgress` only *reads*, the Gemini **document** path is raw and the egress story inverts. This is a load-bearing inference; the function body settles it.
- **`lib/hook-registration.mjs`** — whether `classifyCommand` even returns the token it judged (feasibility of the identity-oracle fix), and whether throwing on non-string input is contract-legal.
- **The second fuzzer (audit walk) is not in the document.** "Two property fuzzers" is half-reviewed; I make no claim about it.
- **No fuzzer run output is attached** — I cannot confirm "all properties held" describes the current classifier at all; my blocker 2 claims the green *would be* uninformative, not that a green was obtained.
- Line counts vs the 300-line cap appear satisfied in all three files but I cannot count exactly from the paste.
- House rules: no UI surface exists in these files (styled-components/Victory/palette/Dual-Button/44px/WCAG — N/A, checked); no yoga/meditation language, no "NASM-certified" string present; the PII rule is the one at risk, flagged as blocker 1.
