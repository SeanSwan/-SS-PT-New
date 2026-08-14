/**
 * Kimi Panel model and spend policy.
 * ================================
 * This is product-neutral: seats receive only the caller's sanitized review packet. The roster is
 * pinned from the 2026-08-14 live-routing handoff. Prices are conservative per-million ceilings,
 * also sent to OpenRouter as provider.max_price so an unexpectedly expensive endpoint is refused.
 * Gemini 3.7 Flash was routable but unpriced in the handoff, so its ceiling deliberately matches
 * the much more expensive Sol lane until a measured price replaces it.
 *
 * @module kimi-panel/config
 */
import { sha256 } from '../context-gateway/src/receiptV1.mjs';

export const MAX_OUTPUT_TOKENS = 60_000;
export const MAX_SHARED_CAP_USD = 5;
// Four severity-ranked findings from each of eleven independent reviewers yields up to 44
// candidates while keeping adjudication and dismissal-verification prompts inside Sean's shared
// project budget. The breadth comes from independent labs, not unbounded prose per model.
export const MAX_FINDINGS_PER_REVIEW = 4;
export const MAX_FINDING_JSON_BYTES = 2_400;
export const HY3_MODEL = 'tencent/hy3-preview';

const makeSeat = (seat) => Object.freeze({
  temperature: 0.2, timeoutMs: 900_000, supportsEffort: false,
  ceiling: 'design', priceVerified: '2026-08-14', ...seat,
});

const generalRemit = 'Find concrete defects and missed opportunities. Prefer source-grounded, actionable findings over praise.';

export const CHEAP_PANEL_MODELS = Object.freeze([
  makeSeat({ id: 'deepseek', lab: 'DeepSeek', model: 'deepseek/deepseek-v4-flash', priceInPerM: 0.09, priceOutPerM: 0.18, outputTokens: 6_000, remit: generalRemit }),
  makeSeat({ id: 'qwen', lab: 'Alibaba', model: 'qwen/qwen3.5-flash-02-23', priceInPerM: 0.07, priceOutPerM: 0.26, outputTokens: 6_000, remit: generalRemit }),
  makeSeat({ id: 'llama', lab: 'Meta', model: 'meta-llama/llama-4-scout', priceInPerM: 0.10, priceOutPerM: 0.30, outputTokens: 6_000, remit: generalRemit }),
  makeSeat({ id: 'glm', lab: 'Zhipu', model: 'z-ai/glm-4.7-flash', priceInPerM: 0.06, priceOutPerM: 0.40, outputTokens: 6_000, remit: generalRemit }),
  makeSeat({ id: 'nemotron', lab: 'NVIDIA', model: 'nvidia/nemotron-3-super-120b-a12b:free', priceInPerM: 0, priceOutPerM: 0, outputTokens: 6_000, remit: generalRemit }),
  makeSeat({ id: 'mistral', lab: 'Mistral', model: 'mistralai/mistral-nemo', priceInPerM: 0.02, priceOutPerM: 0.03, outputTokens: 6_000, remit: generalRemit }),
  makeSeat({ id: 'seed', lab: 'ByteDance', model: 'bytedance-seed/seed-1.6-flash', priceInPerM: 0.07, priceOutPerM: 0.30, outputTokens: 6_000, remit: generalRemit }),
  makeSeat({ id: 'gpt-oss', lab: 'OpenAI-OW', model: 'openai/gpt-oss-20b', priceInPerM: 0.03, priceOutPerM: 0.14, outputTokens: 6_000, remit: generalRemit }),
  makeSeat({ id: 'hy3', lab: 'Tencent', model: HY3_MODEL, specialty: 'design', priceInPerM: 0.06, priceOutPerM: 0.21, outputTokens: 8_000,
    remit: 'Act as the dedicated visual, interaction, motion, accessibility, and artistic-fidelity specialist. Find design defects other seats may miss.' }),
].map((seat) => makeSeat({ ...seat, stage: 'fanout', title: `Kimi Panel ${seat.lab} lens` })));

export const GEMINI_SEAT = makeSeat({
  id: 'gemini', stage: 'fanout', lab: 'Google', model: 'google/gemini-3.7-flash',
  priceInPerM: 5, priceOutPerM: 30, priceVerified: null, priceSource: 'conservative-policy-ceiling',
  outputTokens: 6_000, title: 'Kimi Panel Gemini 3.7 Flash lens',
  remit: `${generalRemit} Stress-test synthesis, multimodal assumptions, and cross-system coherence.`,
});

export const OPUS_FIRST_SEAT = makeSeat({
  id: 'opus-first', stage: 'opus-first', lab: 'Anthropic', model: 'anthropic/claude-opus-5',
  ceiling: 'standard', priceInPerM: 5, priceOutPerM: 25, outputTokens: 8_000,
  supportsEffort: true, title: 'Kimi Panel Opus 5 blind first review',
  remit: `${generalRemit} Review first and blind, before any panel output can anchor you.`,
});

export const KIMI_SEAT = makeSeat({
  id: 'kimi-adjudicator', stage: 'adjudication', lab: 'Moonshot', model: 'moonshotai/kimi-k3',
  priceInPerM: 3, priceOutPerM: 15, outputTokens: 20_000, supportsEffort: true,
  title: 'Kimi K3 finding adjudicator', remit: 'Rule every candidate REAL, NOT_REAL, or NEEDS_PROOF against the original evidence. Never vote.',
});

export const OPUS_VERIFY_SEAT = makeSeat({
  ...OPUS_FIRST_SEAT, id: 'opus-verify', stage: 'opus-verify', outputTokens: 16_000,
  title: 'Kimi Panel Opus 5 dismissal verifier',
  remit: 'Re-check Kimi dismissals against the original evidence. Reopen unsupported exonerations.',
});

export const BLIND_PANEL_SEATS = Object.freeze([...CHEAP_PANEL_MODELS, GEMINI_SEAT]);
export const EXECUTION_SEATS = Object.freeze([
  OPUS_FIRST_SEAT, ...BLIND_PANEL_SEATS, KIMI_SEAT, OPUS_VERIFY_SEAT,
]);

export function estimateWorstCase(seat, promptBytes, maxTokens) {
  // One UTF-8 byte per possible token is intentionally pessimistic. A typical bytes/token ratio
  // is smaller, but a hard spend gate must not depend on a tokenizer-average assumption.
  const inputTokens = promptBytes;
  return (inputTokens / 1e6) * seat.priceInPerM + (maxTokens / 1e6) * seat.priceOutPerM;
}

function promptCeiling(stage, packetBytes) {
  const findingBytes = (BLIND_PANEL_SEATS.length + 1) * MAX_FINDINGS_PER_REVIEW * MAX_FINDING_JSON_BYTES;
  if (stage === 'adjudication') return packetBytes + findingBytes + 64_000;
  if (stage === 'opus-verify') return packetBytes + (findingBytes * 2) + 64_000;
  return packetBytes + 16_000;
}

export function buildPreflight({ packet, capUsd, maxTokens = MAX_OUTPUT_TOKENS }) {
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > MAX_OUTPUT_TOKENS) {
    throw new Error('max output must be an integer at or below 60,000 tokens');
  }
  if (!Number.isFinite(capUsd) || capUsd <= 0 || capUsd > MAX_SHARED_CAP_USD) {
    throw new Error(`shared cap must be positive and at most $${MAX_SHARED_CAP_USD}`);
  }
  const packetBytes = Buffer.byteLength(String(packet), 'utf8');
  const roster = EXECUTION_SEATS.map((seat) => {
    const seatTokens = Math.min(maxTokens, seat.outputTokens);
    const promptByteCeiling = promptCeiling(seat.stage, packetBytes);
    return {
      id: seat.id, stage: seat.stage, model: seat.model, lab: seat.lab,
      maxTokens: seatTokens, promptByteCeiling,
      maxPricePerMillion: { prompt: seat.priceInPerM, completion: seat.priceOutPerM },
      priceSource: seat.priceSource ?? 'verified-roster',
      worstCaseUsd: estimateWorstCase(seat, promptByteCeiling, seatTokens),
    };
  });
  const totalWorstCaseUsd = roster.reduce((sum, entry) => sum + entry.worstCaseUsd, 0);
  const allowed = totalWorstCaseUsd <= capUsd;
  return {
    packetSha256: sha256(packet), packetBytes, meteredCallCount: roster.length,
    opusStageCount: 2, modelCallsExecuted: 0, maxOutputTokens: maxTokens,
    sharedCapUsd: capUsd, totalWorstCaseUsd, allowed,
    blockReason: allowed ? null : `conservative total exceeds shared cap $${capUsd.toFixed(2)}`,
    roster,
  };
}
