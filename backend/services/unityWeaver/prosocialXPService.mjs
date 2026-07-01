import { Op } from 'sequelize';
import PointTransaction from '../../models/PointTransaction.mjs';
import User from '../../models/User.mjs';
import GamificationPointsService from '../gamification/GamificationPointsService.mjs';
import { checkBadgesForGamificationEvent } from '../badgeGamificationBridge.mjs';
import logger from '../../utils/logger.mjs';

const LEDGER_SOURCE = 'social_engagement';
const MAX_PROSOCIAL_XP = 50;

export const UNITY_WEAVER_PROSOCIAL_EVENTS = Object.freeze({
  encourage_friend: {
    label: 'Encourage a Friend',
    category: 'encouragement',
    baseXP: 8,
    dailyLimit: 5,
    cooldownMinutes: 10,
    requiresRecipient: true,
    requiresHumanOrSystemValidation: false,
  },
  welcome_new_member: {
    label: 'Welcome a New Swan',
    category: 'welcome',
    baseXP: 10,
    dailyLimit: 3,
    cooldownMinutes: 20,
    requiresRecipient: true,
    requiresHumanOrSystemValidation: false,
    recipientMaxAccountAgeDays: 14,
  },
  gratitude_given: {
    label: 'Give Gratitude',
    category: 'gratitude',
    baseXP: 6,
    dailyLimit: 5,
    cooldownMinutes: 10,
    requiresRecipient: true,
    requiresHumanOrSystemValidation: false,
  },
  positive_progress_post: {
    label: 'Share Honest Progress',
    category: 'progress_sharing',
    baseXP: 12,
    dailyLimit: 2,
    cooldownMinutes: 180,
    requiresRecipient: false,
    requiresHumanOrSystemValidation: false,
  },
  challenge_cheer: {
    label: 'Cheer the Team',
    category: 'challenge_support',
    baseXP: 8,
    dailyLimit: 4,
    cooldownMinutes: 15,
    requiresRecipient: true,
    requiresHumanOrSystemValidation: false,
  },
  mentor_tip: {
    label: 'Share a Helpful Tip',
    category: 'mentorship',
    baseXP: 15,
    dailyLimit: 3,
    cooldownMinutes: 30,
    requiresRecipient: true,
    requiresHumanOrSystemValidation: true,
  },
  safe_report_confirmed: {
    label: 'Protect the Community',
    category: 'safety',
    baseXP: 10,
    dailyLimit: 3,
    cooldownMinutes: 60,
    requiresRecipient: false,
    requiresHumanOrSystemValidation: true,
  },
  deescalation_assist: {
    label: 'Bridge Builder',
    category: 'safety',
    baseXP: 20,
    dailyLimit: 2,
    cooldownMinutes: 120,
    requiresRecipient: false,
    requiresHumanOrSystemValidation: true,
  },
});

const VALID_CONTEXT_TYPES = new Set([
  'post',
  'comment',
  'challenge',
  'profile',
  'dashboard',
  'moderation_review',
]);

function normalizePositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function normalizeToken(value, fallback = 'none') {
  const normalized = String(value ?? '').trim();
  if (!normalized) return fallback;
  return normalized.replace(/[^a-z0-9:_-]/gi, '-').slice(0, 48) || fallback;
}

function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function startOfToday(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

function buildIdempotencyKey({ actorUserId, eventId, targetUserId, contextType, contextId, now }) {
  const targetKey = targetUserId ? `target:${targetUserId}` : 'target:none';
  const safeContextType = normalizeToken(contextType, 'none');
  const safeContextId = contextId ? normalizeToken(contextId, todayKey(now)) : todayKey(now);
  return `unity:${eventId}:actor:${actorUserId}:${targetKey}:ctx:${safeContextType}:${safeContextId}`.slice(0, 128);
}

function eventMatches(transaction, eventId) {
  return transaction?.metadata?.unityWeaverEventId === eventId;
}

async function getTodaysEventTransactions(actorUserId, eventId, now) {
  const rows = await PointTransaction.findAll({
    where: {
      userId: actorUserId,
      source: LEDGER_SOURCE,
      createdAt: { [Op.gte]: startOfToday(now) },
    },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: 100,
  });

  return rows.filter((row) => eventMatches(row, eventId));
}

async function validateRecipient({ actorUserId, targetUserId, rule, now }) {
  if (!rule.requiresRecipient) return { targetUser: null };

  if (!targetUserId) {
    return { error: { status: 400, message: 'targetUserId is required for this prosocial event' } };
  }

  if (targetUserId === actorUserId) {
    return { error: { status: 400, message: 'You cannot award prosocial XP to yourself' } };
  }

  const targetUser = await User.findByPk(targetUserId, {
    attributes: ['id', 'createdAt', 'isActive'],
  });

  if (!targetUser || targetUser.isActive === false) {
    return { error: { status: 404, message: 'Target user not found' } };
  }

  if (rule.recipientMaxAccountAgeDays) {
    const ageMs = now.getTime() - new Date(targetUser.createdAt).getTime();
    const ageDays = ageMs / (24 * 60 * 60 * 1000);
    if (ageDays > rule.recipientMaxAccountAgeDays) {
      return { error: { status: 400, message: 'This event only applies to newer members' } };
    }
  }

  return { targetUser };
}

export function getUnityWeaverProsocialEvents() {
  return Object.entries(UNITY_WEAVER_PROSOCIAL_EVENTS).map(([id, rule]) => ({ id, ...rule }));
}

export async function awardUnityWeaverProsocialXP({
  actorUserId,
  eventId,
  targetUserId = null,
  contextType = 'dashboard',
  contextId = null,
}) {
  const now = new Date();
  const numericActorId = normalizePositiveInteger(actorUserId);
  const rule = UNITY_WEAVER_PROSOCIAL_EVENTS[eventId];

  if (!numericActorId) {
    return { error: { status: 400, message: 'Invalid actor user ID' } };
  }

  if (!rule) {
    return { error: { status: 400, message: 'Unknown prosocial event' } };
  }

  if (!VALID_CONTEXT_TYPES.has(contextType)) {
    return { error: { status: 400, message: 'Invalid context type' } };
  }

  if (rule.requiresHumanOrSystemValidation) {
    return {
      success: true,
      awarded: false,
      status: 'requires_validation',
      message: 'This prosocial event requires moderation or trusted-system validation before XP can be awarded.',
      event: { id: eventId, ...rule },
    };
  }

  const numericTargetId = normalizePositiveInteger(targetUserId);
  const recipientValidation = await validateRecipient({
    actorUserId: numericActorId,
    targetUserId: numericTargetId,
    rule,
    now,
  });
  if (recipientValidation.error) return { error: recipientValidation.error };

  const todaysEvents = await getTodaysEventTransactions(numericActorId, eventId, now);
  if (todaysEvents.length >= rule.dailyLimit) {
    return {
      success: true,
      awarded: false,
      status: 'daily_limit_reached',
      message: 'Daily XP limit reached for this prosocial action.',
      event: { id: eventId, ...rule },
      dailyLimit: rule.dailyLimit,
    };
  }

  const lastEvent = todaysEvents[0];
  if (lastEvent && rule.cooldownMinutes > 0) {
    const elapsedMs = now.getTime() - new Date(lastEvent.createdAt).getTime();
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    if (elapsedMs < cooldownMs) {
      return {
        success: true,
        awarded: false,
        status: 'cooldown_active',
        message: 'This good-energy action is cooling down to prevent XP farming.',
        retryAfterSeconds: Math.ceil((cooldownMs - elapsedMs) / 1000),
        event: { id: eventId, ...rule },
      };
    }
  }

  const idempotencyKey = buildIdempotencyKey({
    actorUserId: numericActorId,
    eventId,
    targetUserId: numericTargetId,
    contextType,
    contextId,
    now,
  });

  const ledgerResult = await GamificationPointsService.recordLedgerEntry({
    userId: numericActorId,
    points: rule.baseXP,
    transactionType: 'earn',
    source: LEDGER_SOURCE,
    sourceId: numericTargetId,
    description: `Unity Weaver: ${rule.label}`,
    metadata: {
      unityWeaverEventId: eventId,
      unityWeaverCategory: rule.category,
      contextType,
      contextId: contextId ? String(contextId).slice(0, 80) : null,
      targetUserId: numericTargetId,
    },
    awardedBy: numericActorId,
    idempotencyKey,
    maxPoints: MAX_PROSOCIAL_XP,
  });

  const badgesEarned = ledgerResult.duplicate ? [] : await checkBadgesForGamificationEvent({
    userId: numericActorId,
    type: 'social_action',
    activityData: {
      socialAction: eventId,
      action: eventId,
      unityWeaverEventId: eventId,
      category: rule.category,
      targetUserId: numericTargetId,
      count: 1,
    },
    logger,
  });

  return {
    success: true,
    awarded: !ledgerResult.duplicate && ledgerResult.pointsAwarded > 0,
    duplicate: Boolean(ledgerResult.duplicate),
    status: ledgerResult.duplicate ? 'duplicate' : 'awarded',
    event: { id: eventId, ...rule },
    pointsAwarded: ledgerResult.pointsAwarded || 0,
    newBalance: ledgerResult.newBalance,
    newLevel: ledgerResult.newLevel,
    newTier: ledgerResult.newTier,
    badgesEarned,
  };
}

export default {
  getUnityWeaverProsocialEvents,
  awardUnityWeaverProsocialXP,
};
