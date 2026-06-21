export const ETHICAL_CONSTRAINTS = Object.freeze({
  maxDailyPoints: 1000,
  maxStreakBonus: 3.0,
  engagementCooldown: 30,
  maxDailyActions: Object.freeze({
    workout_completed: 3,
    check_in_logged: 5,
    social_interaction: 10
  }),
  addictionWarningThresholds: Object.freeze({
    sessionLength: 180,
    dailyLogins: 20,
    rapidActionSequence: 10
  })
});

export const POSITIVE_PATTERNS = Object.freeze({
  encouragement: Object.freeze([
    'Great job staying consistent!',
    'Your progress is inspiring!',
    'Remember, rest days are important too!',
    'Quality over quantity - you\'re doing amazing!'
  ]),
  healthyBreaks: Object.freeze([
    'Take a moment to celebrate your progress',
    'How about some water and a stretch?',
    'Your body and mind deserve this rest',
    'Recovery is part of the journey'
  ])
});

export const cloneEthicalConstraints = () => ({
  ...ETHICAL_CONSTRAINTS,
  maxDailyActions: { ...ETHICAL_CONSTRAINTS.maxDailyActions },
  addictionWarningThresholds: { ...ETHICAL_CONSTRAINTS.addictionWarningThresholds }
});

export const clonePositivePatterns = () => Object.fromEntries(
  Object.entries(POSITIVE_PATTERNS).map(([category, messages]) => [category, [...messages]])
);

export const stableMessageIndex = (seed, messageCount) => {
  if (!Number.isSafeInteger(messageCount) || messageCount <= 0) {
    return 0;
  }

  const value = String(seed || 'swan-ethics-support');
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) >>> 0;
  }

  return hash % messageCount;
};

export const selectSupportMessage = (patterns, category, seed = new Date().toISOString().slice(0, 10)) => {
  const messages = patterns?.[category] || patterns?.encouragement || [];
  if (!messages.length) {
    return null;
  }

  return messages[stableMessageIndex(`${category}:${seed}`, messages.length)];
};
