/**
 * panel-seats.mjs — the seat registry for consult-panel.mjs.
 * ==========================================================
 * Extracted from consult-panel.mjs 2026-08-21 to keep that file under the
 * 300-line cap (CLAUDE.md Rule 4) when the two DeepSeek V4 seats were added.
 * This is the roster; consult-panel.mjs is the orchestration.
 *
 * Pricing per 1M tokens, OpenRouter catalog re-verified 2026-08-21 via
 *   curl -s https://openrouter.ai/api/v1/models
 * Free seats are 0/0 so the estimator needs no special-casing.
 *
 * Fable has TWO distinct roles and they must not be confused:
 *   1. FINAL DECIDER (unchanged, primary) — reads every reply below and arbitrates.
 *      Run it separately via scripts/consult-fable.mjs AFTER the panel returns.
 *      This is the role CLAUDE.md's Co-Orchestrator Hierarchy + Rule 46 describe.
 *   2. PANEL SEAT (added 2026-08-22 by Sean's directive) — reviews the document
 *      blind, alongside the others, contributing one opinion among many.
 * These are NOT the same thing. A seat-Fable has not seen the other replies, so its
 * output is a PEER REVIEW, not a ruling, and must never be reported as an arbitration.
 * If you want a verdict, run the Final-Decider pass separately.
 *
 * PREMIUM SEATS (`premium: true`) - Fable 5 and GPT-5.6 Sol Pro. Sean's directive
 * 2026-08-22: "ask me each and every time if I want Fable and ChatGPT in it since
 * they're the most expensive ones, and I can say yes or no, or choose one or the
 * other." They are therefore NOT in the default roster - they can only run when
 * named explicitly AND --confirm-spend is passed. consult-panel.mjs still prints
 * what each WOULD cost on every run, so the choice is always informed and never
 * requires guessing or a separate dry-run to price.
 *
 * DeepSeek seats ride consult-grok.mjs (it is a generic OpenRouter streaming
 * client with a SWAN_GROK_MODEL override) rather than getting copy-pasted
 * siblings — one transport, one streaming/idle-watchdog/truncation-guard
 * implementation to keep correct. The 2026-08-21 incident that motivated the
 * 48k default max_tokens was a DeepSeek run: reasoning models spend output
 * budget on hidden thinking, and V4 Flash burned all 16k on reasoning and
 * emitted an EMPTY reply for $0.10. Do not lower the ceiling for these seats.
 */

/** @param {string} remit shared hostile-review remit, injected into every seat's argv. */
export function buildSeats(remit) {
  return {
    sol: {
      label: 'GPT-5.6 Sol Pro', script: 'consult-sol.mjs', paid: true, premium: true,
      inPerM: 2.5, outPerM: 15, out: 'SOL-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      // consult-sol.mjs defaults to plain `gpt-5.6-sol`. Sol PRO is the same
      // weights at the SAME price with reasoning.mode=pro, so there is no reason
      // to review on the weaker tier — pin it explicitly for this seat.
      env: { SWAN_SOL_MODEL: 'openai/gpt-5.6-sol-pro' },
      note: 'reasoning.mode=pro, 1.05M ctx',
    },
    kimi: {
      label: 'Kimi K3', script: 'consult-kimi.mjs', paid: true,
      inPerM: 3, outPerM: 15, out: 'KIMI-PANEL-REVIEW.md',
      args: (doc, out) => [
        '--document', doc, '--out', out, '--remit', remit, '--effort', 'high',
        '--max-tokens', '20000', '--cap-usd', '0.40', '--confirm-spend',
      ],
      note: '20k output ceiling; $0.40 hard cap; ONE review per topic',
    },
    glm: {
      label: 'GLM 5.3', script: 'consult-glm.mjs', paid: false,
      inPerM: 0, outPerM: 0, out: 'GLM-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--model', 'glm-5.3'],
      note: 'Z.ai subscription — no per-token cost, burns coding-plan credit',
    },
    qwen: {
      label: 'Qwen 3.8 (local)', script: 'consult-qwen.mjs', paid: false,
      inPerM: 0, outPerM: 0, out: 'QWEN-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit],
      note: 'local 5090 via Ollama — $0, fully private, never the lead voice',
    },
    gemini: {
      label: 'Gemini 3.1 Pro', script: 'consult-gemini-panel.mjs', paid: false,
      inPerM: 0, outPerM: 0, out: 'GEMINI-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--max-tokens', '20000'],
      // paid:false because this rides Sean's OWN Google API key, NOT OpenRouter credits
      // (his directive 2026-08-22: "only via the API, I don't wanna be paying extra").
      // That makes it $0 against the panel's OpenRouter wallet, which is what the spend
      // gate protects — it does NOT mean Google bills nothing. The seat prints real token
      // counts every run so actual usage stays visible rather than assumed.
      note: 'direct Google API (not OpenRouter) — $0 OpenRouter cost; Google-side usage still metered',
    },
    grok: {
      label: 'Grok 4.6', script: 'consult-grok.mjs', paid: true,
      inPerM: 2, outPerM: 6, out: 'GROK-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      // PIN THE MODEL EXPLICITLY. consult-grok.mjs falls back to `process.env
      // .SWAN_GROK_MODEL || 'x-ai/grok-4.6'`, and the child inherits the parent
      // environment — so an operator shell carrying SWAN_GROK_MODEL from an earlier
      // manual run would make THIS seat file a different model's review under
      // GROK-PANEL-REVIEW.md, priced at Grok's rates. That is exactly the
      // misattribution class the 2026-08-22 fix eliminated, re-entering ambiently
      // through the environment instead of through a hard-coded string. Every other
      // seat on this transport pins its model; grok was the only one relying on the
      // default. Found by two independent panel seats 2026-08-23.
      env: { SWAN_GROK_MODEL: 'x-ai/grok-4.6' },
      note: 'x-ai/grok-4.6 via OpenRouter — rule-12 repeal (PR #54); model pinned, not inherited',
    },
    dspro: {
      label: 'DeepSeek V4 Pro', script: 'consult-grok.mjs', paid: true,
      inPerM: 0.48, outPerM: 0.96, out: 'DEEPSEEK-PRO-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      env: { SWAN_GROK_MODEL: 'deepseek/deepseek-v4-pro' },
      note: 'deepseek/deepseek-v4-pro via consult-grok transport',
    },
    ox: {
      label: 'Ox Alpha', script: 'consult-grok.mjs', paid: false, premium: true,
      inPerM: 0, outPerM: 0, out: 'OX-ALPHA-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      env: { SWAN_GROK_MODEL: 'stealth/ox-alpha' },
      // premium:true despite paid:false — the gate axis here is DATA, not money.
      // Two panel seats independently flagged 2026-08-23 that ox shipped in the
      // DEFAULT roster while its own note says prompts are RETAINED by an
      // undisclosed provider. Fable and Sol require deliberate opt-in because they
      // cost dollars; ox costs disclosure to an unidentified party, which is the
      // less reversible of the two — and it was the one defaulted ON. Money got
      // opt-in, data got opt-out. `premium` removes it from the default roster, so
      // reaching a stealth provider now takes an explicit `--seats ...,ox`.
      // Free BECAUSE it is a stealth listing: an unnamed lab is evaluating the
      // model and OpenRouter's stealth terms mean prompts are retained and seen
      // by that provider. Zero dollars, NON-zero privacy cost. Only send it
      // packets that are already scrubbed to the standard we would use for any
      // vendor — never raw config, transcripts, or anything with PII.
      // 1.05M ctx / 131k max output, added 2026-08-22 by Sean's directive.
      note: 'stealth/ox-alpha — $0 but prompts are RETAINED by an undisclosed provider',
    },
    fable: {
      label: 'Fable 5', script: 'consult-fable.mjs', paid: true, premium: true,
      inPerM: 10, outPerM: 50, out: 'FABLE-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit],
      // BY FAR the most expensive seat — ~5x Kimi/Sol per token and ~340x dsflash.
      // paid:true means the spend gate skips it unless --confirm-spend is passed, so it
      // appears in the printed estimate on EVERY run but never bills without an explicit yes.
      // Seat-Fable is a PEER review, not a ruling — see the two-roles note at the top.
      note: 'PEER seat, not a ruling. $10/$50 per M — the priciest seat; gated behind --confirm-spend',
    },
    dsflash: {
      label: 'DeepSeek V4 Flash', script: 'consult-grok.mjs', paid: true,
      inPerM: 0.073, outPerM: 0.145, out: 'DEEPSEEK-FLASH-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      env: { SWAN_GROK_MODEL: 'deepseek/deepseek-v4-flash' },
      note: 'cheapest paid seat; watch for empty replies (reasoning eats output budget)',
    },
    hy3: {
      label: 'HY3 (Tencent)', script: 'consult-hy3-design.mjs', paid: true,
      inPerM: 0.13, outPerM: 0.53, out: 'HY3-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      // Added 2026-08-23 by Sean's directive. Slug + pricing verified live against the
      // OpenRouter catalog the same day (tencent/hy3, $0.13/$0.53 per M). It already had
      // a standalone script speaking the panel contract; it was simply never seated.
      //
      // CONTEXT IS 262k, NOT 1M like the other seats. That is the one thing to watch:
      // a packet the 1M seats swallow whole can overflow this one, and an overflow is
      // not a truncated review — it is a review of a different, shorter document, which
      // reads exactly like a real reply. Keep packets well inside the window.
      note: 'tencent/hy3 — cheap; 262k ctx (SMALLER than the other seats — watch packet size)',
    },
  };
}
