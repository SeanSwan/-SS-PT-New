/** Signed, expiring, revocable owner-authority records. */
import { verify } from 'node:crypto';
const PURPOSE_KEYS = Object.freeze({
  'spec-enable': new Set(['schemaVersion', 'recordId', 'purpose', 'approvedBy', 'notBefore', 'notAfter', 'evidenceRefs', 'termsVersion', 'configDigest', 'signature']),
  'source-corpus-clearance': new Set(['schemaVersion', 'recordId', 'purpose', 'approvedBy', 'notBefore', 'notAfter', 'evidenceRefs', 'sourceClass', 'scope', 'termsVersion', 'decisionType', 'signature']),
  'source-classification': new Set(['schemaVersion', 'recordId', 'purpose', 'approvedBy', 'notBefore', 'notAfter', 'evidenceRefs', 'sourceClass', 'derivationRef', 'licenseRef', 'receiptDigest', 'signature']),
  'claim-adjudication': new Set(['schemaVersion', 'recordId', 'purpose', 'approvedBy', 'notBefore', 'notAfter', 'evidenceRefs', 'claimId', 'claimDigest', 'decision', 'batchId', 'mergedInto', 'signature']),
});
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
};
export const signablePayload = (record) => {
  const { signature: _signature, ...payload } = record ?? {};
  return JSON.stringify(canonicalize(payload));
};
export function verifyAuthorityRecord(record, { publicKey, trustedNow, revokedIds, purpose } = {}) {
  const errors = [];
  const allowed = PURPOSE_KEYS[purpose];
  if (!allowed) errors.push('recognized purpose required');
  for (const key of Object.keys(record ?? {})) if (allowed && !allowed.has(key)) errors.push(`unknown authority field: ${key}`);
  if (!publicKey) errors.push('publicKey required');
  if (!(trustedNow instanceof Date) || Number.isNaN(trustedNow.getTime())) errors.push('trustedNow required');
  // Fail closed: an absent revocation list is NOT an empty one. A caller that cannot
  // produce the list has not proven the record is unrevoked, so it must not verify.
  const haveRevocationList = Array.isArray(revokedIds);
  if (!haveRevocationList) errors.push('revocation list required: an absent list is not an empty list');
  if (!record?.recordId || (haveRevocationList && revokedIds.includes(record.recordId))) errors.push('recordId missing or revoked');
  if (record?.approvedBy !== 'sean') errors.push('approvedBy must be sean');
  if (record?.purpose !== purpose) errors.push(`purpose must be ${purpose}`);
  if (!Array.isArray(record?.evidenceRefs) || !record.evidenceRefs.length || !record.evidenceRefs.every((ref) => typeof ref === 'string' && ref.length >= 4)) errors.push('evidenceRefs must be non-empty strings');
  const start = new Date(record?.notBefore).getTime(); const end = new Date(record?.notAfter).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) errors.push('valid authority window required');
  if (trustedNow instanceof Date && (trustedNow.getTime() < start || trustedNow.getTime() > end)) errors.push('authority record is outside its validity window');
  if (publicKey && typeof record?.signature === 'string') {
    try { if (!verify(null, Buffer.from(signablePayload(record)), publicKey, Buffer.from(record.signature, 'base64'))) errors.push('signature invalid'); } catch { errors.push('signature invalid'); }
  } else errors.push('signature required');
  return { ok: errors.length === 0, errors };
}