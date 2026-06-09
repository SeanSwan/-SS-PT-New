/**
 * onboardingHelpers.mjs
 * =====================
 * Shared helpers for onboarding questionnaire processing.
 * Extracted from clientOnboardingController.mjs for reuse in adminOnboardingController.mjs.
 */

const TOTAL_QUESTION_COUNT = 85;

export const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const normalizeJsonObject = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return isPlainObject(value) ? value : null;
};

export const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readFirstValue = (values, fallback = null) => {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return fallback;
};

const readField = (source, fields, fallback = null) => {
  if (!isPlainObject(source)) {
    return fallback;
  }
  for (const field of fields) {
    const value = source[field];
    if (value !== null && value !== undefined) {
      return value;
    }
  }
  return fallback;
};

const arrayOrEmpty = (value) => (Array.isArray(value) ? value : []);

const countArrayItemsFromValues = (values) =>
  values.reduce((sum, value) => {
    if (!Array.isArray(value)) {
      return sum;
    }
    return sum + value.length;
  }, 0);

const HEALTH_RISK_LABELS = ['low', 'medium', 'high', 'critical'];

const MEDICAL_RISK_LEVELS = [
  { min: 3, level: 3 },
  { min: 1, level: 2 },
];

const INJURY_RISK_LEVELS = [
  { min: 2, level: 2 },
  { min: 1, level: 1 },
];

const PAIN_RISK_LEVELS = [
  { min: 8, level: 3 },
  { min: 5, level: 2 },
  { min: 3, level: 1 },
];

const findRiskLevel = (value, thresholds) =>
  thresholds.find(({ min }) => value >= min)?.level ?? 0;

const countAnsweredQuestions = (value) => {
  if (value === null || value === undefined) return 0;
  if (Array.isArray(value)) return value.length > 0 ? 1 : 0;
  if (typeof value === 'object') {
    return Object.values(value).reduce((sum, item) => sum + countAnsweredQuestions(item), 0);
  }
  if (typeof value === 'string') return value.trim().length > 0 ? 1 : 0;
  return 1;
};

export const calculateCompletionPercentage = (responses) => {
  if (!responses || !isPlainObject(responses)) return 0;
  const answered = countAnsweredQuestions(responses);
  const percent = Math.round((answered / TOTAL_QUESTION_COUNT) * 100);
  return Math.min(100, Math.max(0, percent));
};

export const normalizeOnboardingQueueStatus = (status) => {
  if (!status) return 'not_started';
  if (status === 'submitted' || status === 'completed') return 'complete';
  if (status === 'in_progress') return 'draft';
  if (status === 'archived') return 'archived';
  return 'draft';
};

export const extractPrimaryGoal = (responses) => {
  return readFirstValue([
    readField(responses?.section2_goals, ['primary_goal', 'primaryGoal']),
    readField(responses?.section2, ['primary_goal', 'primaryGoal']),
    readField(responses?.goals, ['primary_goal', 'primary']),
    readField(responses, ['primaryGoal']),
  ]);
};

export const extractTrainingTier = (responses) => {
  return readFirstValue([
    readField(responses?.section2_goals, ['preferred_package', 'preferredPackage']),
    readField(responses?.section2, ['preferred_package', 'preferredPackage']),
    readField(responses?.package, ['tier']),
    readField(responses, ['trainingTier']),
  ]);
};

export const extractCommitmentLevel = (responses) => {
  const rawValue = readFirstValue([
    readField(responses?.section3_lifestyle, ['commitment_level', 'commitmentLevel']),
    readField(responses?.section2_goals, ['commitment_level', 'commitmentLevel']),
    readField(responses?.goals, ['commitmentLevel']),
    readField(responses, ['commitmentLevel']),
  ]);
  const parsed = toNumber(rawValue);
  return parsed !== null ? Math.round(parsed) : null;
};

export const extractNutritionPrefs = (responses) => {
  const nutrition = readFirstValue([responses?.section5_nutrition, responses?.nutrition], {});
  const dietaryRestrictions = readFirstValue([
    readField(nutrition, ['dietary_restrictions', 'dietaryRestrictions', 'dietary_preferences']),
    readField(responses, ['dietaryPreferences', 'dietary_preferences']),
  ], []);
  const allergies = readFirstValue([
    readField(nutrition, ['allergies']),
    readField(responses, ['foodAllergies', 'allergies']),
  ], []);
  const mealFrequency = readFirstValue([
    readField(nutrition, ['meals_per_day', 'meal_frequency', 'mealFrequency']),
    readField(responses, ['mealFrequency']),
  ]);

  return {
    dietary_restrictions: arrayOrEmpty(dietaryRestrictions),
    meal_frequency: toNumber(mealFrequency) ?? 3,
    allergies: arrayOrEmpty(allergies),
  };
};

const classifyHealthRisk = ({ medicalConditions, injuries, painLevel }) => {
  const riskLevel = Math.max(
    findRiskLevel(medicalConditions, MEDICAL_RISK_LEVELS),
    findRiskLevel(injuries, INJURY_RISK_LEVELS),
    findRiskLevel(painLevel ?? 0, PAIN_RISK_LEVELS),
  );

  return HEALTH_RISK_LABELS[riskLevel];
};

export const calculateHealthRisk = (responses) => {
  const health = readFirstValue([
    readField(responses, ['section4_health', 'health']),
  ], {});
  const history = readFirstValue([
    readField(responses, ['section3_health_history', 'health_history']),
  ], {});

  const medicalConditions = countArrayItemsFromValues([
    readField(health, ['medical_conditions', 'medicalConditions', 'chronic_conditions']),
    readField(history, ['chronic_conditions', 'medical_conditions']),
    // Flat keys used by transformQuestionnaireToMasterPrompt
    readField(responses, ['medicalConditions']),
  ]);

  const injuries = countArrayItemsFromValues([
    readField(health, ['current_injuries', 'injuries']),
    readField(history, ['injuries', 'past_injuries']),
    // Flat keys
    readField(responses, ['pastInjuries', 'currentPain']),
  ]);

  const painLevel = toNumber(readFirstValue([
    readField(health, ['pain_level', 'painLevel']),
    readField(responses, ['pain_level', 'painLevel', 'currentPainLevel']),
  ], 0));

  return classifyHealthRisk({ medicalConditions, injuries, painLevel });
};

/**
 * Compute all derived summary fields from questionnaire responses.
 * Returns an object suitable for spreading into a questionnaire update.
 */
export const computeDerivedFields = (responses) => ({
  primaryGoal: extractPrimaryGoal(responses),
  trainingTier: extractTrainingTier(responses),
  commitmentLevel: extractCommitmentLevel(responses),
  healthRisk: calculateHealthRisk(responses),
  nutritionPrefs: extractNutritionPrefs(responses),
});
