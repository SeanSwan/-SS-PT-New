/**
 * Shared paid-credit eligibility for schedule actions.
 *
 * The backend complete-session endpoint only deducts when the frontend sends
 * deductSessionCredit=true, so UI eligibility must account for known zero
 * balances before showing direct completion or no-show deduction choices.
 */

import type { SessionDetail } from '../SessionDetailModal.types';
import { isNonDeductingClientSource } from '../../DashBoard/workspaces/clients-team/clientSessionSignal';

const normalizeCreditsRequired = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 1;
  const credits = Number(value);
  if (!Number.isFinite(credits) || credits < 0) return 1;
  return Math.floor(credits);
};

const getScheduleCreditsRequired = (session: SessionDetail): number => {
  if (!session.sessionType || typeof session.sessionType === 'string') {
    return 1;
  }

  return normalizeCreditsRequired(session.sessionType.creditsRequired);
};

const getKnownAvailablePaidSessions = (session: SessionDetail): number | null => {
  const rawBalance = session.clientAvailableSessions ?? session.packageInfo?.sessionsRemaining;
  if (rawBalance === undefined || rawBalance === null || rawBalance === '') {
    return null;
  }

  const availableSessions = Number(rawBalance);
  if (!Number.isFinite(availableSessions)) {
    return null;
  }

  return Math.max(0, Math.floor(availableSessions));
};

export const canDeductScheduledSessionCredit = (session: SessionDetail | null): boolean => {
  if (!session?.userId) return false;
  if (session.sessionDeducted === true) return false;
  if (isNonDeductingClientSource(session.clientSource)) return false;

  const creditsRequired = getScheduleCreditsRequired(session);
  if (creditsRequired < 1) return false;

  const availableSessions = getKnownAvailablePaidSessions(session);
  return availableSessions === null || availableSessions >= creditsRequired;
};

/**
 * Billing applicability for direct completion, independent of balance:
 * a billable-source client with credits required and no prior deduction.
 * Under server-side completion billing, completing such a session without
 * a deduction is a waive that requires a recorded reason — including when
 * the known balance is insufficient (that too is an unpaid completion).
 */
export const isCompletionBillingApplicable = (session: SessionDetail | null): boolean => {
  if (!session?.userId) return false;
  if (session.sessionDeducted === true) return false;
  if (isNonDeductingClientSource(session.clientSource)) return false;
  return getScheduleCreditsRequired(session) >= 1;
};
