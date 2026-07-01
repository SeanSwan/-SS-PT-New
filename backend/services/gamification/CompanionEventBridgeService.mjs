import { CompanionPetService } from './CompanionPetService.mjs';

const POSITIVE_ACTIVITY_TYPES = new Set([
  'strength_workouts',
  'cardio_workouts',
  'nutrition_logs',
  'recovery_actions',
  'streak_days',
  'social_actions',
  'personal_records',
]);

const LEDGER_SOURCE_TO_COMPANION_EVENT = {
  workout_completion: 'workout_completed',
  workout_completed: 'workout_completed',
  streak_bonus: 'streak_updated',
  achievement_earned: 'badge_earned',
  milestone_reached: 'personal_record',
};

const normalizeAmount = (value, fallback = 1) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(100, Math.max(1, Math.round(parsed)));
};

const normalizeText = (value) => String(value || '').trim().toLowerCase();

export const getCompanionActivityForWorkout = (metadata = {}) => {
  const focus = normalizeText(metadata.focus || metadata.workoutType || metadata.category || metadata.modality);
  if (/cardio|run|bike|cycle|row|swim|endurance|conditioning/.test(focus)) {
    return 'cardio_workouts';
  }
  return 'strength_workouts';
};

export const buildCompanionActivityEvents = (sourceType, metadata = {}) => {
  switch (sourceType) {
    case 'workout_completed':
      return [{ activityType: getCompanionActivityForWorkout(metadata), amount: normalizeAmount(metadata.amount) }];
    case 'nutrition_logged':
      return [{ activityType: 'nutrition_logs', amount: normalizeAmount(metadata.amount) }];
    case 'recovery_logged':
      return [{ activityType: 'recovery_actions', amount: normalizeAmount(metadata.amount) }];
    case 'streak_updated':
      return [{ activityType: 'streak_days', amount: normalizeAmount(metadata.days || metadata.amount) }];
    case 'social_action':
      return [{ activityType: 'social_actions', amount: normalizeAmount(metadata.amount) }];
    case 'badge_earned':
    case 'personal_record':
      return [{ activityType: 'personal_records', amount: normalizeAmount(metadata.amount) }];
    default:
      return [];
  }
};

export const buildCompanionActivityEventsForLedger = (result, entry = {}) => {
  if (!result || result.duplicate || result.pointsAwarded <= 0) return [];
  if (entry.transactionType === 'spend' || entry.transactionType === 'expire') return [];

  const sourceType = LEDGER_SOURCE_TO_COMPANION_EVENT[entry.source];
  if (!sourceType) return [];

  return buildCompanionActivityEvents(sourceType, {
    ...(entry.metadata || {}),
    amount: sourceType === 'streak_updated' ? entry.metadata?.streakDays : 1,
  });
};

export const recordCompanionActivityEvents = async ({ userId, events, service = CompanionPetService }) => {
  if (!userId || !Array.isArray(events) || events.length === 0 || !service?.recordActivity) return [];

  const results = [];
  for (const event of events) {
    if (!POSITIVE_ACTIVITY_TYPES.has(event?.activityType)) continue;
    const result = await service.recordActivity(userId, event.activityType, normalizeAmount(event.amount));
    if (result) results.push({ activityType: event.activityType, result });
  }
  return results;
};

export const recordCompanionLedgerEvents = async ({ result, entry, service = CompanionPetService }) => {
  const events = buildCompanionActivityEventsForLedger(result, entry);
  return recordCompanionActivityEvents({ userId: entry?.userId, events, service });
};

export const scheduleCompanionLedgerEvents = ({ result, entry, transaction, service = CompanionPetService }) => {
  const run = () => recordCompanionLedgerEvents({ result, entry, service })
    .catch((error) => console.error('[CompanionEventBridge] non-blocking ledger bridge failed:', error?.message || error));

  if (transaction && typeof transaction.afterCommit === 'function') {
    transaction.afterCommit(run);
    return;
  }
  void run();
};

export default {
  buildCompanionActivityEvents,
  buildCompanionActivityEventsForLedger,
  getCompanionActivityForWorkout,
  recordCompanionActivityEvents,
  recordCompanionLedgerEvents,
  scheduleCompanionLedgerEvents,
};
