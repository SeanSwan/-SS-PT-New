/**
 * sessionCompletionBillingPolicy.mjs
 * ==================================
 * Server-side billing policy for manager/trainer session completion
 * (Fable Vision Slice 0.1, 2026-07-05).
 *
 * WHY THIS EXISTS: the legacy completion path is fail-open to no-deduct —
 * `deductSessionCredit === true` is required to bill, so any caller that
 * omits the flag silently skips billing and the skip is mislabeled
 * 'waived_by_manager'. Behind the SESSION_COMPLETION_SERVER_BILLING_ENABLED
 * flag, the SERVER decides: deduct when eligible; an explicit client-sent
 * `false` becomes a waive REQUEST that requires a reason (>= 5 chars) and
 * lands an immutable FinancialTransaction audit row.
 *
 * Flag default: unset/anything-but-'true' => OFF (legacy behavior,
 * byte-identical). Sean personally flips it per environment (handoff v2
 * §4.5). Zero migrations: the waive audit reuses financial_transactions
 * with paymentMethod='session_credit_waive' + metadata discriminator.
 */

import { isNonDeductingClient } from '../sessionBillingPolicy.mjs';

export const SERVER_COMPLETION_BILLING_FLAG = 'SESSION_COMPLETION_SERVER_BILLING_ENABLED';
export const WAIVE_REASON_MIN_LENGTH = 5;
export const WAIVE_REASON_MAX_LENGTH = 500;
export const WAIVE_PAYMENT_METHOD = 'session_credit_waive';

export const isServerCompletionBillingEnabled = () =>
  process.env[SERVER_COMPLETION_BILLING_FLAG] === 'true';

/**
 * Decide the server-side billing action at completion (flag ON only).
 * Returns { action: 'skip' | 'waive' | 'deduct', reason?, waiveReason? }.
 * Throws on a waive request without a valid reason — the route layer maps
 * messages containing 'invalid'/'waive' to HTTP 400.
 */
export function resolveCompletionBillingAction({ deductSessionCredit, waiveReason, client }) {
  if (isNonDeductingClient(client)) {
    return { action: 'skip', reason: 'non_deducting_client_account' };
  }

  if (deductSessionCredit === false) {
    const trimmedReason = typeof waiveReason === 'string' ? waiveReason.trim() : '';
    if (trimmedReason.length < WAIVE_REASON_MIN_LENGTH) {
      throw new Error(
        `Invalid waive request: waiveReason (min ${WAIVE_REASON_MIN_LENGTH} chars) is required to complete without deducting a session credit`
      );
    }
    return {
      action: 'waive',
      reason: 'waived_by_manager',
      waiveReason: trimmedReason.slice(0, WAIVE_REASON_MAX_LENGTH)
    };
  }

  // undefined or true => the server decides: deduct when eligible.
  return { action: 'deduct' };
}

/**
 * Unlinked-flow dedup guard: was this client already billed via the
 * workout-log lane (daily_workout_forms.sessionDeducted) on the session's
 * calendar date? Uses the server-local date to match Postgres ::date casts.
 * Fails open (null) when inputs are missing — worst case equals today's
 * behavior; linked flows are already guarded by session.sessionDeducted.
 */
export async function findSameDayBilledWorkoutForm({ DailyWorkoutForm, clientId, sessionDate, transaction }) {
  if (!DailyWorkoutForm?.findOne || !clientId || !sessionDate) return null;
  const d = new Date(sessionDate);
  if (Number.isNaN(d.getTime())) return null;
  const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return DailyWorkoutForm.findOne({
    where: { clientId, date: localDate, sessionDeducted: true },
    attributes: ['id', 'date'],
    transaction
  });
}

/**
 * Immutable audit payload for an explicit waive. amount=0 rows ride the
 * existing financial_transactions table (status enum reused — adding a
 * 'waived' status would need a migration). Analytics that average or count
 * transactions should filter paymentMethod != 'session_credit_waive'.
 */
export function buildWaiveAuditPayload({ session, actorUserId, actorRole, waiveReason, creditsWaived }) {
  return {
    userId: session.userId,
    amount: 0,
    currency: 'USD',
    status: 'succeeded',
    paymentMethod: WAIVE_PAYMENT_METHOD,
    description: `Session credit waived at completion: session ${session.id} by user ${actorUserId} (${actorRole})`,
    metadata: JSON.stringify({
      type: WAIVE_PAYMENT_METHOD,
      sessionId: session.id,
      actorUserId,
      actorRole,
      reason: waiveReason,
      creditsWaived: creditsWaived ?? null
    }),
    processedAt: new Date()
  };
}
