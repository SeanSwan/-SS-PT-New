/**
 * ReceiptV1 adapter for panel calls.
 * ==================================
 * Calls are recorded only after an attempt exists; dry preflight writes no provider receipt.
 * ReceiptV1's allowlist excludes prompts, outputs, rationales, and absolute external paths while
 * the panel extension records stage and calibration counts needed to compare reviewer value.
 *
 * @module kimi-panel/receipts
 */
import { recordConsult } from '../context-gateway/src/receiptV1.mjs';

const stamp = () => new Date().toISOString().replaceAll(/[-:.]/g, '').replace('Z', 'Z');

export function createReceiptSink({ root, packetMeta, capUsd, runId }) {
  return ({ seat, result = {}, estimate, maxTokens = seat.outputTokens,
    outcome = 'ok', errorCode = null,
    findingsRaised = null, findingsUpheld = null }) => recordConsult({
    stamp: stamp(), root, providerName: seat.id,
    provider: { model: seat.model, ceiling: seat.ceiling }, result,
    spend: { estimate, cap: capUsd }, effort: seat.supportsEffort ? 'high' : null,
    maxTokens, docPath: packetMeta.documentPath,
    docSha: packetMeta.sha256, docBytes: packetMeta.bytes,
    redactions: packetMeta.redactions, redactionKinds: packetMeta.redactionKinds,
    outcome, errorCode, originatingModel: 'kimi-panel-runtime',
    panelRunId: runId, panelStage: seat.stage, findingsRaised, findingsUpheld,
  });
}
