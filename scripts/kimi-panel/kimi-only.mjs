/**
 * One-call Kimi K3 hostile review.
 * =================================
 * This path bypasses the breadth panel but preserves packet sanitization, strict structured output,
 * a dry-first conservative spend gate, and ReceiptV1 evidence for the single attempted call.
 *
 * @module kimi-panel/kimi-only
 */
import { randomBytes } from 'node:crypto';
import { redactSecrets } from '../context-gateway/src/egress.mjs';
import { sha256 } from '../context-gateway/src/receiptV1.mjs';
import {
  KIMI_DIRECT_SEAT, MAX_OUTPUT_TOKENS, MAX_SHARED_CAP_USD, estimateWorstCase,
} from './config.mjs';
import { parseReviewerFindings } from './findings.mjs';
import { buildReviewerPrompt } from './prompts.mjs';
import { callOpenRouter } from './openrouter.mjs';
import { assertDesignDocumentPath } from './packet.mjs';

const noop = () => null;

export function buildKimiOnlyPreflight({ packet, capUsd, maxTokens = 8_000 }) {
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > MAX_OUTPUT_TOKENS) {
    throw new Error('max output must be an integer at or below 60,000 tokens');
  }
  if (!Number.isFinite(capUsd) || capUsd <= 0 || capUsd > MAX_SHARED_CAP_USD) {
    throw new Error(`shared cap must be positive and at most $${MAX_SHARED_CAP_USD}`);
  }
  const packetBytes = Buffer.byteLength(String(packet), 'utf8');
  const promptByteCeiling = packetBytes + 16_000;
  const seatTokens = Math.min(maxTokens, KIMI_DIRECT_SEAT.outputTokens);
  const worstCaseUsd = estimateWorstCase(KIMI_DIRECT_SEAT, promptByteCeiling, seatTokens);
  return {
    packetSha256: sha256(packet), packetBytes, model: KIMI_DIRECT_SEAT.model,
    maxMeteredCallCount: 1, modelCallsExecuted: 0, maxOutputTokens: seatTokens,
    promptByteCeiling, worstCaseUsd, sharedCapUsd: capUsd, allowed: worstCaseUsd <= capUsd,
    blockReason: worstCaseUsd <= capUsd ? null : `conservative Kimi total exceeds shared cap $${capUsd.toFixed(2)}`,
  };
}

export async function runKimiOnly({
  packet, documentPath = 'packet.md', capUsd, maxTokens = 8_000, confirmed = false,
  callModel = callOpenRouter, receiptSink = noop, env = process.env, runId = null,
}) {
  assertDesignDocumentPath(documentPath);
  const sanitized = redactSecrets(packet).text;
  const preflight = buildKimiOnlyPreflight({ packet: sanitized, capUsd, maxTokens });
  if (!confirmed) return { status: 'preflight-only', preflight };
  if (!preflight.allowed) throw new Error(`shared cap blocked Kimi: ${preflight.blockReason}`);

  const id = runId ?? sha256(`${preflight.packetSha256}:${randomBytes(12).toString('hex')}`).slice(0, 16);
  const prompt = buildReviewerPrompt(KIMI_DIRECT_SEAT, sanitized);
  if (Buffer.byteLength(prompt, 'utf8') > preflight.promptByteCeiling) {
    throw new Error('Kimi prompt exceeded its preflight bound');
  }
  let result;
  try {
    result = await callModel({ seat: KIMI_DIRECT_SEAT, prompt,
      maxTokens: preflight.maxOutputTokens, env });
    if (!Number.isFinite(result?.cost) || result.cost < 0 || result.cost > preflight.worstCaseUsd + 0.000001) {
      const error = new Error('provider cost exceeded the Kimi max-price estimate');
      error.code = 'SPEND_CAP'; error.result = result; throw error;
    }
    const findings = parseReviewerFindings(result.text, { originModel: KIMI_DIRECT_SEAT.model });
    receiptSink({ seat: KIMI_DIRECT_SEAT, result, estimate: preflight.worstCaseUsd,
      maxTokens: preflight.maxOutputTokens, findingsRaised: findings.length });
    return {
      status: 'complete', runId: id, packetSha256: preflight.packetSha256,
      modelCallsExecuted: 1, spendUsd: result.cost, preflight, findings,
      final: { verdict: findings.length ? 'REVISE' : 'CLEAN' },
    };
  } catch (error) {
    receiptSink({ seat: KIMI_DIRECT_SEAT, result: error.result ?? result ?? {},
      estimate: preflight.worstCaseUsd, maxTokens: preflight.maxOutputTokens,
      outcome: 'error', errorCode: error.code ?? 'BAD_OUTPUT' });
    throw error;
  }
}
