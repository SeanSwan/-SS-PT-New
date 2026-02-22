/**
 * onboardingHelpers.mjs
 * =====================
 * Shared helpers for onboarding questionnaire processing.
 * Extracted from clientOnboardingController.mjs for reuse in adminOnboardingController.mjs.
 */

export const TOTAL_QUESTION_COUNT = 85;

export const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const countAnsweredQuestions = (value) => {
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

export const extractPrimaryGoal = (responses) => {
  return (
    responses?.section2_goals?.primary_goal ??
    responses?.section2_goals?.primaryGoal ??
    responses?.section2?.primary_goal ??
    responses?.section2?.primaryGoal ??
    responses?.goals?.primary_goal ??
    responses?.goals?.primary ??
    responses?.primaryGoal ??
    null
  );
};

export const extractTrainingTier = (responses) => {
  return (
    responses?.section2_goals?.preferred_package ??
    responses?.section2_goals?.preferredPackage ??
    responses?.section2?.preferred_package ??
    responses?.section2?.preferredPackage ??
    responses?.package?.tier ??
    responses?.trainingTier ??
    null
  );
};

export const extractCommitmentLevel = (responses) => {
  const rawValue =
    responses?.section3_lifestyle?.commitment_level ??
    responses?.section3_lifestyle?.commitmentLevel ??
    responses?.section2_goals?.commitment_level ??
    responses?.section2_goals?.commitmentLevel ??
    responses?.goals?.commitmentLevel ??
    responses?.commitmentLevel ??
    null;
  const parsed = toNumber(rawValue);
  return parsed !== null ? Math.round(parsed) : null;
};

export const extractNutritionPrefs = (responses) => {
  const nutrition = responses?.section5_nutrition ?? responses?.nutrition ?? {};
  const dietaryRestrictions =
    nutrition?.dietary_restrictions ??
    nutrition?.dietaryRestrictions ??
    nutrition?.dietary_preferences ??
    responses?.dietaryPreferences ??
    responses?.dietary_preferences ??
    [];
  const allergies =
    nutrition?.allergies ??
    responses?.foodAllergies ??
    responses?.allergies ??
    [];
  const mealFrequency =
    nutrition?.meals_per_day ??
    nutrition?.meal_frequency ??
    nutrition?.mealFrequency ??
    responses?.mealFrequency ??
    null;

  return {
    dietary_restrictions: Array.isArray(dietaryRestrictions) ? dietaryRestrictions : [],
    meal_frequency: toNumber(mealFrequency) ?? 3,
    allergies: Array.isArray(allergies) ? allergies : [],
  };
};

export const calculateHealthRisk = (responses) => {
  const health = responses?.section4_health ?? responses?.health ?? {};
  const history = responses?.section3_health_history ?? responses?.health_history ?? {};

  const medicalConditions = [
    health?.medical_conditions,
    health?.medicalConditions,
    health?.chronic_conditions,
    history?.chronic_conditions,
    history?.medical_conditions,
    // Flat keys used by transformQuestionnaireToMasterPrompt
    responses?.medicalConditions,
  ].reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);

  const injuries = [
    health?.current_injuries,
    health?.injuries,
    history?.injuries,
    history?.past_injuries,
    // Flat keys
    responses?.pastInjuries,
    responses?.currentPain,
  ].reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0);

  const painLevel = toNumber(
    health?.pain_level ?? health?.painLevel ?? responses?.pain_level ?? responses?.painLevel ?? responses?.currentPainLevel ?? 0
  );

  if (medicalConditions >= 3 || (painLevel !== null && painLevel >= 8)) return 'critical';
  if (medicalConditions >= 1 || injuries >= 2 || (painLevel !== null && painLevel >= 5)) return 'high';
  if (injuries >= 1 || (painLevel !== null && painLevel >= 3)) return 'medium';
  return 'low';
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
