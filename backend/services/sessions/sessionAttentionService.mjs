/**
 * Session Attention Service
 * =========================
 * Read-only settlement attention summary for admin schedule operations.
 */

import { getSession, getUser, Op } from '../../models/index.mjs';
import { isNonDeductingClient } from '../sessionBillingPolicy.mjs';
import {
  SETTLEMENT_GRACE_HOURS,
  getSessionSettlementDecision
} from './sessionSettlementPolicy.mjs';

const DEFAULT_ATTENTION_LIMIT = 200;
const MAX_ATTENTION_LIMIT = 500;

function clampLimit(value) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit <= 0) return DEFAULT_ATTENTION_LIMIT;
  return Math.min(limit, MAX_ATTENTION_LIMIT);
}

function toIso(value) {
  return value?.toISOString?.() ?? null;
}

function getClientName(client) {
  const name = [client?.firstName, client?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return name || null;
}

function getCreditImpact(session, decision) {
  if (!decision.shouldSettleNow) {
    return decision.reason === 'settlement_not_due' ? 'none' : 'deferred_review';
  }
  if (isNonDeductingClient(session?.client)) return 'tracking_only';

  const availableSessions = Number(session?.client?.availableSessions ?? 0);
  if (Number.isFinite(availableSessions) && availableSessions > 0) {
    return 'pending_deduction';
  }
  return 'payment_recovery_needed';
}

function getRiskLevel(riskCategory) {
  if (riskCategory === 'payment_recovery_needed' || riskCategory === 'attendance_review') return 'high';
  if (riskCategory === 'pending_deduction') return 'medium';
  return 'low';
}

function getRiskCategory(decision, creditImpact) {
  if (decision.reason === 'settlement_not_due') return 'not_due';
  if (decision.reason === 'attendance_missing_after_cutoff' || decision.reason === 'no_show_after_cutoff') {
    return 'attendance_review';
  }
  return creditImpact;
}

function toAttentionItem(session, decision) {
  const creditImpact = getCreditImpact(session, decision);
  const riskCategory = getRiskCategory(decision, creditImpact);

  return {
    sessionId: session?.id ?? null,
    clientId: session?.userId ?? session?.client?.id ?? null,
    trainerId: session?.trainerId ?? null,
    clientName: getClientName(session?.client),
    status: session?.status ?? null,
    attendanceStatus: session?.attendanceStatus ?? null,
    sessionDate: toIso(session?.sessionDate),
    sessionEndAt: toIso(decision.sessionEndAt),
    settlementDueAt: toIso(decision.settlementDueAt),
    reason: decision.reason,
    recommendedAction: decision.recommendedAction,
    riskCategory,
    riskLevel: getRiskLevel(riskCategory),
    creditImpact
  };
}

function emptyCounts(totalCandidates) {
  return {
    totalCandidates,
    readyToSettle: 0,
    deferred: 0,
    notDue: 0,
    attendanceReview: 0,
    noShowReview: 0,
    invalidTime: 0,
    trackingOnly: 0,
    pendingPaidCredits: 0,
    paymentRecoveryNeeded: 0
  };
}

function applyCounts(counts, item, decision) {
  if (decision.shouldSettleNow) {
    counts.readyToSettle++;
  } else {
    counts.deferred++;
  }

  if (decision.reason === 'settlement_not_due') counts.notDue++;
  if (decision.reason === 'attendance_missing_after_cutoff') counts.attendanceReview++;
  if (decision.reason === 'no_show_after_cutoff') counts.noShowReview++;
  if (decision.reason === 'invalid_session_time') counts.invalidTime++;
  if (item.creditImpact === 'tracking_only') counts.trackingOnly++;
  if (item.creditImpact === 'pending_deduction') counts.pendingPaidCredits++;
  if (item.creditImpact === 'payment_recovery_needed') counts.paymentRecoveryNeeded++;
}

export function buildSessionAttentionSummary(sessions, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const items = [];
  const counts = emptyCounts(sessions.length);

  for (const session of sessions) {
    const decision = getSessionSettlementDecision(session, { now });
    const item = toAttentionItem(session, decision);
    applyCounts(counts, item, decision);
    items.push(item);
  }

  return {
    generatedAt: now.toISOString(),
    settlementGraceHours: SETTLEMENT_GRACE_HOURS,
    counts,
    items
  };
}

export async function getSessionDeductionAttentionSummary(options = {}) {
  const Session = getSession();
  const User = getUser();
  const now = options.now instanceof Date ? options.now : new Date();
  const limit = clampLimit(options.limit);

  const sessions = await Session.findAll({
    where: {
      status: { [Op.in]: ['scheduled', 'confirmed'] },
      sessionDate: { [Op.lt]: now },
      sessionDeducted: false,
      userId: { [Op.not]: null },
      isBlocked: false
    },
    include: [{
      model: User,
      as: 'client',
      required: true,
      attributes: ['id', 'firstName', 'lastName', 'availableSessions', 'clientSource', 'sessionBillingMode']
    }],
    order: [['sessionDate', 'ASC']],
    limit
  });

  return buildSessionAttentionSummary(sessions, { now });
}
