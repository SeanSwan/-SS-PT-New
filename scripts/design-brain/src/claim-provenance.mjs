/** Shared gate binding claims and human decisions to signed canonical receipts. */
import { createHash } from 'node:crypto';
import { signablePayload, verifyAuthorityRecord } from './authority.mjs';
import { validateClaim } from './validate.mjs';
import { synthesizeClaims } from './synthesize.mjs';
export const decisionDigestFor = (claim) => createHash('sha256').update(signablePayload({ claimId: claim.claimId, domainId: claim.domainId, principle: claim.principle, workflowPhase: claim.workflowPhase, userRole: claim.userRole })).digest('hex');
export function validateClaimProvenance(claim, receiptsById, authority = {}) {
  if (!validateClaim(claim).ok || !(receiptsById instanceof Map)) return false;
  const receipts = claim.receiptRefs.map((ref) => receiptsById.get(ref));
  if (receipts.some((receipt) => !receipt)) return false;
  const canonical = synthesizeClaims(receipts, { nowIso: claim.createdUtc, sourceAuthority: authority }).claims.find((candidate) => candidate.claimId === claim.claimId);
  const sameSet = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value) => right.includes(value));
  const coreValid = Boolean(canonical) && canonical.principle === claim.principle && canonical.domainId === claim.domainId
    && canonical.workflowPhase === claim.workflowPhase && canonical.userRole === claim.userRole
    && sameSet(canonical.products, claim.products) && sameSet(canonical.receiptRefs, claim.receiptRefs)
    && JSON.stringify(canonical.confidence) === JSON.stringify(claim.confidence)
    && canonical.singleSource === claim.singleSource && JSON.stringify(canonical.exceptions) === JSON.stringify(claim.exceptions)
    && JSON.stringify(canonical.contradictions) === JSON.stringify(claim.contradictions)
    && JSON.stringify(canonical.swanTranslation) === JSON.stringify(claim.swanTranslation);
  if (!coreValid) return false;
  if (claim.status === 'proposed') return claim.humanDecision == null;
  const decision = claim.humanDecision;
  const verified = verifyAuthorityRecord(decision, { ...authority, purpose: 'claim-adjudication' });
  return verified.ok && decision.schemaVersion === 'authority/1' && decision.claimId === claim.claimId
    && decision.claimDigest === decisionDigestFor(canonical) && decision.decision === claim.status
    && (claim.status !== 'merged' ? claim.mergedInto == null && decision.mergedInto == null : decision.mergedInto === claim.mergedInto);
}