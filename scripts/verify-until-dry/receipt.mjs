/**
 * @file receipt.mjs
 * @description Creates and verifies immutable, hash-bound verification receipts.
 */
import { canonicalJson, sha256 } from './ledger.mjs';
import { computeVerdict } from './verdict.mjs';

function freezeEntries(value) {
  if (Array.isArray(value)) return Object.freeze(value.map((item) => freezeEntries(item)));
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freezeEntries(item)])));
  }
  return value;
}

function payloadFrom(input) {
  const payload = {
    schema: 'verify-until-dry.receipt.v1',
    tier: input.tier ?? null,
    headSha: input.headSha ?? null,
    sourceHash: input.sourceHash ?? null,
    scopeHash: input.scopeHash ?? null,
    reviewedScopeHash: input.reviewedScopeHash ?? null,
    scopeContract: input.scopeContract ?? null,
    requiredGates: input.requiredGates ?? [],
    gates: input.gates ?? {},
    findings: input.findings ?? [],
    blockers: input.blockers ?? [],
    escalations: input.escalations ?? [],
    vantages: input.vantages ?? [],
    ledger: input.ledger ?? [],
  };
  return { ...payload, verdict: computeVerdict(payload) };
}

export function buildReceipt(input = {}) {
  const payload = payloadFrom(input);
  return freezeEntries({ ...payload, receiptHash: sha256(canonicalJson(payload)) });
}

export function verifyReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object') return { valid: false, error: 'receipt-missing' };
  const { receiptHash, ...claimed } = receipt;
  const actualHash = sha256(canonicalJson(claimed));
  if (actualHash !== receiptHash) return { valid: false, error: 'receipt-hash-mismatch' };
  const recomputed = computeVerdict(claimed);
  if (canonicalJson(recomputed) !== canonicalJson(claimed.verdict)) {
    return { valid: false, error: 'receipt-verdict-mismatch' };
  }
  return { valid: true, verdict: recomputed };
}
