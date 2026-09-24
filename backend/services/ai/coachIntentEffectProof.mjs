/** Independent workout proof bound to the pre-write expectation stored on an intent.
 * No model result flag or readEffect.matches boolean establishes verification.
 * Only persisted expectation and an authorized independent observation are used.
 */
import { createHash } from 'node:crypto';
import { stableStringify } from './stableStringify.mjs';
import { verifyCoachWorkoutReadback } from './coachWorkoutResultVerifier.mjs';
import { intentIso, intentSha256 } from './coachIntentReceipt.mjs';
import { normalizeCoachSemanticFootprint } from './coachWorkoutSemanticFootprint.mjs';

export function hashCoachWorkoutExpectation(footprint) {
  if (verifyCoachWorkoutReadback({ expected: footprint, observed: footprint }).status !== 'verified') return null;
  // Legacy encodings are durable receipt keys. Normalize only explicit v2.
  const semantic = footprint.schemaVersion === 2 ? normalizeCoachSemanticFootprint(footprint) : footprint;
  return createHash('sha256').update(stableStringify({ proofVersion: 2, footprint: semantic })).digest('hex');
}

export function verifyCoachIntentEffect(intent, observation) {
  if (observation?.found !== true || intent.proofVersion !== 2 || !intentSha256(intent.expectedHash)
    || !Number.isSafeInteger(intent.version) || intent.version < 0 || !intentIso(intent.committedAt)) return null;
  if (observation.intentId !== intent.id || observation.requestHash !== intent.requestHash) return null;
  if (!intent.proposalId || observation.proposalId !== intent.proposalId) return null;
  const expected = intent.expectedFootprint;
  if (expected?.actorId !== intent.actorId || expected?.targetClientId !== intent.targetClientId
    || observation.observed?.actorId !== intent.actorId
    || observation.observed?.targetClientId !== intent.targetClientId) return null;
  if (hashCoachWorkoutExpectation(expected) !== intent.expectedHash) return null;
  const checked = verifyCoachWorkoutReadback({ expected, observed: observation.observed });
  const committedAt = intentIso(intent.committedAt);
  return checked.status === 'verified' && committedAt
    ? { recordRefs: checked.recordRefs, realAffectedCount: checked.realAffectedCount, committedAt } : null;
}
