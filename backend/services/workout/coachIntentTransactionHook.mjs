/**
 * SCU S4 — optional receipt hook for the canonical daily-form transaction.
 *
 * The hook is deliberately tiny: it receives the existing transaction and
 * refuses to report completion unless the claimed intent transition succeeds.
 * Current callers omit `intentId`, so no existing workout path changes until
 * S3 claim/commit wiring supplies one.
 */
import { commitCoachIntent, completeCoachIntent } from '../ai/coachIntentService.mjs';

export async function persistCoachIntentReceipt({ model, intentId, result, expectedHash = null, expectedFootprint = null, proofVersion = null, transaction }) {
  if (!intentId) return { status: 'skipped', intent: null };
  if (!model || !transaction) {
    const error = new Error('CoachIntent receipt requires the writer transaction and model');
    error.code = 'INTENT_RECEIPT_TRANSACTION_REQUIRED';
    throw error;
  }
  const completed = expectedHash
    ? await commitCoachIntent({ model, intentId, result, expectedHash, expectedFootprint, proofVersion, transaction })
    : await completeCoachIntent({ model, intentId, result, transaction });
  const expectedStatus = expectedHash ? 'committed_unverified' : 'completed';
  if (completed.status !== expectedStatus) {
    const error = new Error('CoachIntent was not in claimed state');
    error.code = 'INTENT_RECEIPT_NOT_CLAIMED';
    throw error;
  }
  return completed;
}

export default { persistCoachIntentReceipt };
