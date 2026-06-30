/**
 * Challenge progress rule matching.
 * Keeps challenge progress tied to canonical workout-event evidence.
 */

const GENERIC_EXERCISE_FAMILY_TAGS = new Set([
  'exercise_family',
  'rolodex',
  'template:exercise_family',
  'workouts',
  'workout',
  'sessions',
]);

const FLEXIBILITY_TOKENS = new Set([
  'flexibility',
  'stretching',
  'static_stretch',
  'dynamic_stretch',
  'mobility',
  'corrective',
  'smr',
]);

const ASSIGNED_SESSION_METRICS = new Set([
  'assigned_sessions_completed',
  'team_assigned_sessions_completed',
]);

const ASSIGNED_SESSION_TAGS = new Set([
  'assigned_session',
  'assigned_sessions',
  'planned_assignment',
  'planned_session',
  'assigned_workout',
]);

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      // Fall through to delimiter splitting.
    }
    return trimmed.split(/[,|]/);
  }

  return [value];
};

const normalizeToken = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '_')
  .replace(/-/g, '_');

export const normalizeChallengeRuleTokens = (...sources) => {
  const tokens = [];
  const seen = new Set();

  for (const source of sources) {
    for (const item of toArray(source)) {
      const token = normalizeToken(item);
      if (!token || seen.has(token)) continue;
      seen.add(token);
      tokens.push(token);
    }
  }

  return tokens;
};

const parseRule = (challenge = {}) => {
  const rule = challenge.rule ?? challenge.rules ?? null;
  if (!rule) return {};
  if (typeof rule === 'object' && !Array.isArray(rule)) return rule;
  if (typeof rule !== 'string') return {};

  try {
    const parsed = JSON.parse(rule);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
};

const getChallengeTags = (challenge = {}) => {
  const rule = parseRule(challenge);
  return normalizeChallengeRuleTokens(
    challenge.tags,
    challenge.requirements,
    challenge.progressUnit,
    rule.metric,
    rule.exerciseFamily,
    rule.exerciseFamilies,
  );
};

const getRequiredExerciseFamilies = (challenge = {}) => {
  const rule = parseRule(challenge);
  const explicit = normalizeChallengeRuleTokens(rule.exerciseFamily, rule.exerciseFamilies, challenge.exerciseFamily);
  if (explicit.length > 0) return explicit;

  const tags = getChallengeTags(challenge);
  if (!tags.includes('exercise_family') && !tags.includes('template:exercise_family')) return [];

  return tags.filter((tag) => !GENERIC_EXERCISE_FAMILY_TAGS.has(tag));
};

const getWorkoutEvidenceTokens = (event = {}) => normalizeChallengeRuleTokens(
  event.exerciseFamilies,
  event.workoutTags,
  event.tags,
  event.category,
  event.workoutCategory,
);

const isTrueFlag = (value) => value === true || String(value).trim().toLowerCase() === 'true';

const needsFlexibilityEvidence = (challenge = {}) => {
  const tags = getChallengeTags(challenge);
  return tags.some((tag) => FLEXIBILITY_TOKENS.has(tag))
    && (tags.includes('template:consistency') || String(challenge.progressUnit ?? '').toLowerCase() === 'days');
};

export const challengeRequiresAssignedSessionEvidence = (challenge = {}) => {
  const rule = parseRule(challenge);
  const tags = getChallengeTags(challenge);
  return isTrueFlag(rule.assignedSessionOnly)
    || isTrueFlag(rule.requiresAssignedSession)
    || ASSIGNED_SESSION_METRICS.has(normalizeToken(rule.metric))
    || tags.some((tag) => ASSIGNED_SESSION_TAGS.has(tag));
};

export const evaluateWorkoutChallengeProgressRule = ({ challenge = {}, event = {} } = {}) => {
  const evidence = new Set(getWorkoutEvidenceTokens(event));
  const requiredFamilies = getRequiredExerciseFamilies(challenge);

  if (challengeRequiresAssignedSessionEvidence(challenge) && event.isAssignedSession !== true) {
    return { eligible: false, reason: 'rule_mismatch_assigned_session' };
  }

  if (requiredFamilies.length > 0) {
    const matched = requiredFamilies.some((family) => evidence.has(family));
    if (!matched) {
      return { eligible: false, reason: 'rule_mismatch_exercise_family', requiredFamilies };
    }
  }

  if (needsFlexibilityEvidence(challenge)) {
    const matched = [...FLEXIBILITY_TOKENS].some((token) => evidence.has(token));
    if (!matched) {
      return { eligible: false, reason: 'rule_mismatch_flexibility' };
    }
  }

  return { eligible: true, reason: null };
};
