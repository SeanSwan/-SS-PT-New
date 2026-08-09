/**
 * @file receipt.mjs
 * @description Creates and verifies immutable, hash-bound verification receipts.
 */
import { canonicalJson, sha256 } from './ledger.mjs';
import { computeVerdict } from './verdict.mjs';
import { selectGates } from './gate-registry.mjs';

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
    reviewPacketHash: input.reviewPacketHash ?? null,
    scopeContract: input.scopeContract ?? null,
    requiredGates: input.requiredGates ?? [],
    gates: input.gates ?? {},
    findings: input.findings ?? [],
    blockers: input.blockers ?? [],
    escalations: input.escalations ?? [],
    vantages: input.vantages ?? [],
    reviews: input.reviews ?? [],
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
  if (!/^[a-f0-9]{40}$/.test(String(claimed.headSha ?? '')) ||
      !/^[a-f0-9]{64}$/.test(String(claimed.sourceHash ?? '')) ||
      sha256(canonicalJson(claimed.scopeContract)) !== claimed.scopeHash ||
      claimed.scopeContract?.tier !== claimed.tier) {
    return { valid: false, error: 'receipt-source-contract-invalid' };
  }
  let expectedGates;
  try {
    expectedGates = selectGates({ tier: claimed.tier, surfaces: claimed.scopeContract?.surfaces }).map((gate) => gate.id);
  } catch {
    return { valid: false, error: 'receipt-gate-policy-invalid' };
  }
  if (canonicalJson(expectedGates) !== canonicalJson(claimed.requiredGates)) {
    return { valid: false, error: 'receipt-required-gates-mismatch' };
  }
  const snapshot = claimed.ledger?.[0];
  if (snapshot?.type !== 'snapshot' || snapshot.headSha !== claimed.headSha ||
      snapshot.sourceHash !== claimed.sourceHash || snapshot.scopeHash !== claimed.scopeHash) {
    return { valid: false, error: 'receipt-snapshot-ledger-mismatch' };
  }
  for (const id of expectedGates) {
    const gate = claimed.gates?.[id];
    const event = claimed.ledger.findLast?.((entry) => entry.type === 'gate' && entry.gateId === id);
    if (!gate || !/^[a-f0-9]{64}$/.test(String(gate.outputHash ?? '')) ||
        !event || event.outputHash !== gate.outputHash || event.status !== gate.status || event.current !== true) {
      return { valid: false, error: `receipt-gate-evidence-invalid:${id}` };
    }
  }
  const recomputed = computeVerdict(claimed);
  if (canonicalJson(recomputed) !== canonicalJson(claimed.verdict)) {
    return { valid: false, error: 'receipt-verdict-mismatch' };
  }
  return { valid: true, verdict: recomputed };
}
