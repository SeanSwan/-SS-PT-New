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
 * Fable is NOT a seat here. It is the FINAL seat and the Final Decider
 * (CLAUDE.md Co-Orchestrator Hierarchy + Rule 46): it reads every reply below
 * and arbitrates. Run it separately via scripts/consult-fable.mjs.
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
      label: 'GPT-5.6 Sol Pro', script: 'consult-sol.mjs', paid: true,
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
    grok: {
      label: 'Grok 4.6', script: 'consult-grok.mjs', paid: true,
      inPerM: 2, outPerM: 6, out: 'GROK-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      note: 'x-ai/grok-4.6 via OpenRouter — rule-12 repeal (PR #54)',
    },
    dspro: {
      label: 'DeepSeek V4 Pro', script: 'consult-grok.mjs', paid: true,
      inPerM: 0.48, outPerM: 0.96, out: 'DEEPSEEK-PRO-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      env: { SWAN_GROK_MODEL: 'deepseek/deepseek-v4-pro' },
      note: 'deepseek/deepseek-v4-pro via consult-grok transport',
    },
    dsflash: {
      label: 'DeepSeek V4 Flash', script: 'consult-grok.mjs', paid: true,
      inPerM: 0.073, outPerM: 0.145, out: 'DEEPSEEK-FLASH-PANEL-REVIEW.md',
      args: (doc, out) => ['--document', doc, '--out', out, '--remit', remit, '--effort', 'high'],
      env: { SWAN_GROK_MODEL: 'deepseek/deepseek-v4-flash' },
      note: 'cheapest paid seat; watch for empty replies (reasoning eats output budget)',
    },
  };
}
