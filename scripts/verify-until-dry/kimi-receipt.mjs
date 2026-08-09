/**
 * @file kimi-receipt.mjs
 * @description Persists and verifies one source-bound Kimi K3 advisory result.
 */
import { canonicalJson, sha256 } from './ledger.mjs';
import { buildCompletedReview, parseReviewDecision } from './review-proof.mjs';

function payload(input) {
  return {
    schema: 'verify-until-dry.kimi-receipt.v1', status: input.status,
    model: input.model, packetHash: input.packetHash, sourceHash: input.sourceHash,
    scopeHash: input.scopeHash, output: input.output, outputHash: input.outputHash,
    decision: input.decision, callCount: input.callCount,
  };
}

export function buildKimiReceipt(result, packet) {
  const body = payload({
    ...result, sourceHash: packet.sourceHash, scopeHash: packet.scopeHash,
    output: result.text, outputHash: sha256(result.text), decision: parseReviewDecision(result.text),
  });
  return Object.freeze({ ...body, receiptHash: sha256(canonicalJson(body)) });
}

export function validateKimiReceipt(receipt, { packet, model }) {
  const fail = (error) => ({ valid: false, clean: false, error, review: null });
  if (receipt?.schema !== 'verify-until-dry.kimi-receipt.v1') return fail('kimi-receipt-schema');
  const { receiptHash, ...body } = receipt;
  if (sha256(canonicalJson(body)) !== receiptHash || sha256(receipt.output) !== receipt.outputHash) {
    return fail('kimi-receipt-integrity');
  }
  if (receipt.status !== 'COMPLETED_ADVISORY' || receipt.callCount !== 1 || receipt.model !== model ||
      receipt.packetHash !== packet.hash || receipt.sourceHash !== packet.sourceHash ||
      receipt.scopeHash !== packet.scopeHash || receipt.decision !== parseReviewDecision(receipt.output)) {
    return fail('kimi-receipt-binding');
  }
  const findings = receipt.decision === 'CLEAN' ? [] : [{
    id: 'KIMI-REVISE', author: 'kimi-k3', status: 'PROPOSED',
    severity: 'high', claim: 'Kimi K3 reported a revision or malformed verdict.',
  }];
  const review = buildCompletedReview({
    id: `KIMI-${receipt.packetHash.slice(0, 12)}`, builder: 'verify-until-dry-builder',
    reviewer: 'kimi-k3', headSha: packet.headSha, sourceHash: packet.sourceHash,
    scopeHash: packet.scopeHash, reviewPacketHash: packet.hash,
    reviewedPaths: packet.evidencePaths, origin: 'kimi-external',
    axes: ['hostile-logic', 'state-machine'], output: receipt.output, findings,
  });
  return { valid: true, clean: receipt.decision === 'CLEAN', error: null, review };
}
