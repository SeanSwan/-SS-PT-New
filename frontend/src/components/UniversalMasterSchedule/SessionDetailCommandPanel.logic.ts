import { normalizeAvailableSessions } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import type {
  SessionDetail,
  SessionDetailModalMode,
} from './SessionDetailModal.types';

export const SETTLEMENT_GRACE_HOURS = 24;

export type SessionCommandRiskLevel = 'low' | 'medium' | 'high';
export type SessionCommandActionKey =
  | 'record_attendance'
  | 'open_payment_review'
  | 'review_settlement'
  | 'review_no_show';

export interface SessionCommandAction {
  key: SessionCommandActionKey;
  label: string;
  enabled: boolean;
}

export interface SessionCommandState {
  outcomeLabel: string;
  riskLevel: SessionCommandRiskLevel;
  settlementLabel: string;
  paymentLabel: string;
  attentionReasons: string[];
  primaryAction: SessionCommandAction | null;
  proposalLabel: string;
}

interface BuildSessionCommandStateParams {
  session: SessionDetail;
  mode: SessionDetailModalMode;
  now?: Date;
  isNonDeductingClient: boolean;
}

function getSessionEndAt(session: SessionDetail): Date | null {
  const start = new Date(session.sessionDate);
  if (Number.isNaN(start.getTime())) return null;

  const duration = Number(session.duration);
  if (!Number.isFinite(duration) || duration <= 0) return null;

  return new Date(start.getTime() + duration * 60 * 1000);
}

function getSettlementDueAt(session: SessionDetail): Date | null {
  const endAt = getSessionEndAt(session);
  if (!endAt) return null;
  return new Date(endAt.getTime() + SETTLEMENT_GRACE_HOURS * 60 * 60 * 1000);
}

function formatTimeRemaining(ms: number) {
  const totalMinutes = Math.max(1, Math.ceil(ms / (60 * 1000)));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function getSettlementLabel(session: SessionDetail, now: Date, isNonDeductingClient: boolean) {
  if (session.status === 'cancelled') return 'No settlement action';
  if (isNonDeductingClient) return 'Tracking-only session';
  if (session.sessionDeducted) return 'Credit already settled';

  const dueAt = getSettlementDueAt(session);
  if (!dueAt) return 'Settlement time needs review';
  if (now >= dueAt) return 'Settlement review available now';
  return `Settlement review opens in ${formatTimeRemaining(dueAt.getTime() - now.getTime())}`;
}

function getPaymentLabel(session: SessionDetail, isNonDeductingClient: boolean) {
  if (session.status === 'cancelled') return 'No paid-credit deduction';
  if (isNonDeductingClient) return 'No paid-credit deduction';
  if (session.sessionDeducted) return 'Credit settled';

  const credits = normalizeAvailableSessions(session.clientAvailableSessions);
  if (credits <= 0) return 'Payment recovery needed';
  return `${credits} paid credit${credits === 1 ? '' : 's'} available`;
}

function isAttended(session: SessionDetail) {
  return session.attendanceStatus === 'present' || session.attendanceStatus === 'late';
}

function isSettlementDue(session: SessionDetail, now: Date) {
  const dueAt = getSettlementDueAt(session);
  return Boolean(dueAt && now >= dueAt);
}

export function buildSessionCommandState({
  session,
  mode,
  now = new Date(),
  isNonDeductingClient,
}: BuildSessionCommandStateParams): SessionCommandState {
  const settlementDue = isSettlementDue(session, now);
  const credits = normalizeAvailableSessions(session.clientAvailableSessions);
  const attentionReasons: string[] = [];
  let outcomeLabel = 'On schedule';
  let riskLevel: SessionCommandRiskLevel = 'low';
  let primaryAction: SessionCommandAction | null = null;

  if (session.status === 'cancelled') {
    outcomeLabel = 'Cancelled';
    attentionReasons.push('No settlement action');
  } else if (session.sessionDeducted) {
    outcomeLabel = 'Credit settled';
    attentionReasons.push('Credit already deducted');
  } else if (isNonDeductingClient) {
    outcomeLabel = 'Tracking only';
    attentionReasons.push('Tracking-only session');
  } else if (!settlementDue) {
    outcomeLabel = 'Awaiting settlement window';
    attentionReasons.push('Inside settlement grace window');
  } else if (!session.attendanceStatus) {
    outcomeLabel = 'Attendance review';
    riskLevel = 'high';
    attentionReasons.push('Missing attendance after cutoff');
    primaryAction = { key: 'record_attendance', label: 'Record attendance', enabled: true };
  } else if (session.attendanceStatus === 'no_show') {
    outcomeLabel = 'No-show review';
    riskLevel = 'high';
    attentionReasons.push('No-show charge review');
    primaryAction = { key: 'review_no_show', label: 'Review no-show policy', enabled: true };
  } else if (isAttended(session) && credits <= 0) {
    outcomeLabel = 'Payment review';
    riskLevel = 'high';
    attentionReasons.push('Payment recovery needed');
    primaryAction = {
      key: 'open_payment_review',
      label: 'Open payment review',
      enabled: mode === 'admin',
    };
  } else if (isAttended(session)) {
    outcomeLabel = 'Ready for settlement';
    riskLevel = 'medium';
    attentionReasons.push('Pending credit deduction');
    primaryAction = { key: 'review_settlement', label: 'Review settlement', enabled: false };
  }

  return {
    outcomeLabel,
    riskLevel,
    settlementLabel: getSettlementLabel(session, now, isNonDeductingClient),
    paymentLabel: getPaymentLabel(session, isNonDeductingClient),
    attentionReasons,
    primaryAction,
    proposalLabel: 'No AI proposals drafted',
  };
}
