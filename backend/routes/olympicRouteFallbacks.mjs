const EVENT_DETAILS = {
  pullups: {
    label: 'Pull-ups',
    metric: 'reps (higher is better)',
  },
  pushups: {
    label: 'Push-ups',
    metric: 'reps (higher is better)',
  },
  sprint: {
    label: 'Sprint',
    metric: 'seconds (lower is better)',
  },
};

export function buildOlympicEventInfo(
  eventType,
  { userBest = null, totalAttempts = 0, totalParticipants = 0 } = {}
) {
  const details = EVENT_DETAILS[eventType] || {
    label: eventType,
    metric: 'score',
  };

  return {
    eventType,
    label: details.label,
    metric: details.metric,
    userBest,
    totalAttempts,
    totalParticipants,
  };
}

export function isOlympicEventsTableMissingError(error) {
  const code = error?.parent?.code || error?.original?.code || error?.code;
  const message = [
    error?.message,
    error?.parent?.message,
    error?.original?.message,
  ].filter(Boolean).join(' ');

  const missingRelation = code === '42P01' || /relation .*does not exist/i.test(message);
  return missingRelation && /olympic_events/i.test(message);
}

export function warnOlympicEventsTableFallback(routeName, error) {
  console.warn(`[Olympics] ${routeName} using empty olympic_events fallback: ${error?.message || 'unknown error'}`);
}
