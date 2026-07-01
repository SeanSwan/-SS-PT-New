const POSITIVE_ACTIVITY_TYPES = new Set([
  'strength_workouts',
  'cardio_workouts',
  'nutrition_logs',
  'recovery_actions',
  'streak_days',
  'social_actions',
  'personal_records',
]);

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

export const recordCompanionActivityEvents = async ({ userId, events, service }) => {
  if (!userId || !Array.isArray(events) || events.length === 0 || !service?.recordActivity) return [];

  const results = [];
  for (const event of events) {
    if (!POSITIVE_ACTIVITY_TYPES.has(event?.activityType)) continue;
    const result = await service.recordActivity(userId, event.activityType, normalizeAmount(event.amount));
    if (result) results.push({ activityType: event.activityType, result });
  }
  return results;
};

export default {
  buildCompanionActivityEvents,
  getCompanionActivityForWorkout,
  recordCompanionActivityEvents,
};
