/**
 * clientDataOverviewPayloadService.mjs
 * ====================================
 * Shapes fetched onboarding records into the client-safe overview payload.
 *
 * Purpose:
 * - Keep response contract formatting out of query orchestration.
 * - Preserve existing null/default behavior for missing measurements.
 * - Centralize formatting for baseline, nutrition, photos, and notes.
 */

import {
  calculateCompletionPercentage,
  normalizeJsonObject,
} from '../utils/onboardingHelpers.mjs';

const nullableNumber = (value) => (value ? Number(value) : null);

const formatPair = (first, second, template) => (
  first && second ? template(first, second) : null
);

const buildBaselineSummary = (baselineMeasurement, movementDate) => {
  if (!baselineMeasurement) {
    return null;
  }

  return {
    bodyWeight: baselineMeasurement?.bodyWeight ?? null,
    bodyFatPercentage: baselineMeasurement?.bodyFatPercentage ?? null,
    plankDuration: baselineMeasurement?.plankDuration ?? null,
    restingHeartRate: baselineMeasurement?.restingHeartRate ?? null,
    bloodPressure: formatPair(
      baselineMeasurement?.bloodPressureSystolic,
      baselineMeasurement?.bloodPressureDiastolic,
      (systolic, diastolic) => `${systolic}/${diastolic}`,
    ),
    benchPress: formatPair(
      baselineMeasurement?.benchPressWeight,
      baselineMeasurement?.benchPressReps,
      (weight, reps) => `${weight} lbs x ${reps}`,
    ),
    squat: formatPair(
      baselineMeasurement?.squatWeight,
      baselineMeasurement?.squatReps,
      (weight, reps) => `${weight} lbs x ${reps}`,
    ),
    lastUpdated: movementDate,
  };
};

const buildNutritionSummary = (nutritionPlan) => {
  if (!nutritionPlan) {
    return {
      active: false,
      dailyCalories: null,
      macros: { protein: null, carbs: null, fat: null },
    };
  }

  return {
    active: true,
    dailyCalories: nutritionPlan.dailyCalories ?? null,
    macros: {
      protein: nullableNumber(nutritionPlan.proteinGrams),
      carbs: nullableNumber(nutritionPlan.carbsGrams),
      fat: nullableNumber(nutritionPlan.fatGrams),
    },
  };
};

const buildOnboardingStatus = (questionnaire) => {
  const responses = normalizeJsonObject(questionnaire?.responsesJson) ?? {};
  const completionPercentage = questionnaire ? calculateCompletionPercentage(responses) : 0;

  return {
    completed: questionnaire?.status === 'completed' || completionPercentage === 100,
    completionPercentage,
    primaryGoal: questionnaire?.primaryGoal ?? null,
    trainingTier: questionnaire?.trainingTier ?? null,
  };
};

export const buildClientDataOverviewPayload = ({
  targetUserId,
  questionnaire,
  baselineMeasurement,
  nutritionPlan,
  photoCount,
  latestPhoto,
  noteCount,
  latestNote,
}) => {
  const movementDate = baselineMeasurement?.takenAt ?? baselineMeasurement?.createdAt ?? null;

  return {
    userId: targetUserId,
    onboardingStatus: buildOnboardingStatus(questionnaire),
    movementScreen: {
      completed: !!baselineMeasurement,
      nasmAssessmentScore: baselineMeasurement?.nasmAssessmentScore ?? null,
      date: movementDate,
    },
    baselineMeasurements: buildBaselineSummary(baselineMeasurement, movementDate),
    nutritionPlan: buildNutritionSummary(nutritionPlan),
    progressPhotos: {
      count: photoCount ?? 0,
      lastUpload: latestPhoto?.uploadedAt ?? null,
    },
    trainerNotes: {
      count: noteCount ?? 0,
      lastNote: latestNote?.createdAt ?? null,
    },
  };
};
