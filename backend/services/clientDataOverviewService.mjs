/**
 * clientDataOverviewService.mjs
 * =============================
 * Builds the read-only client onboarding overview payload for
 * GET /api/client-data/overview/:userId.
 *
 * Purpose:
 * - Keep overview query orchestration out of the Express route controller.
 * - Preserve the existing client-safe response contract consumed by the
 *   onboarding dashboard hook.
 * - Keep trainer-note counts hidden from client-role requests.
 *
 * Inputs:
 * - Sequelize model registry from getAllModels().
 * - Authorized target user id.
 * - Requester role for trainer-note privacy gating.
 *
 * Outputs:
 * - Plain JSON overview object ready to send as response.overview.
 */

import {
  calculateCompletionPercentage,
  isPlainObject,
} from '../utils/onboardingHelpers.mjs';

const normalizeJsonObject = (value) => {
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

const buildBaselineSummary = (baselineMeasurement, movementDate) => (
  baselineMeasurement
    ? {
        bodyWeight: baselineMeasurement?.bodyWeight ?? null,
        bodyFatPercentage: baselineMeasurement?.bodyFatPercentage ?? null,
        plankDuration: baselineMeasurement?.plankDuration ?? null,
        restingHeartRate: baselineMeasurement?.restingHeartRate ?? null,
        bloodPressure: baselineMeasurement?.bloodPressureSystolic && baselineMeasurement?.bloodPressureDiastolic
          ? `${baselineMeasurement.bloodPressureSystolic}/${baselineMeasurement.bloodPressureDiastolic}`
          : null,
        benchPress: baselineMeasurement?.benchPressWeight && baselineMeasurement?.benchPressReps
          ? `${baselineMeasurement.benchPressWeight} lbs x ${baselineMeasurement.benchPressReps}`
          : null,
        squat: baselineMeasurement?.squatWeight && baselineMeasurement?.squatReps
          ? `${baselineMeasurement.squatWeight} lbs x ${baselineMeasurement.squatReps}`
          : null,
        lastUpdated: movementDate,
      }
    : null
);

const buildNutritionSummary = (nutritionPlan) => (
  nutritionPlan
    ? {
        active: true,
        dailyCalories: nutritionPlan.dailyCalories ?? null,
        macros: {
          protein: nutritionPlan.proteinGrams ? Number(nutritionPlan.proteinGrams) : null,
          carbs: nutritionPlan.carbsGrams ? Number(nutritionPlan.carbsGrams) : null,
          fat: nutritionPlan.fatGrams ? Number(nutritionPlan.fatGrams) : null,
        },
      }
    : {
        active: false,
        dailyCalories: null,
        macros: { protein: null, carbs: null, fat: null },
      }
);

export const buildClientDataOverview = async ({ models, targetUserId, requesterRole }) => {
  const {
    ClientOnboardingQuestionnaire,
    ClientBaselineMeasurements,
    ClientNutritionPlan,
    ClientPhoto,
    ClientNote,
  } = models;

  const includeTrainerNoteSummary = requesterRole !== 'client';

  const [
    questionnaire,
    baselineMeasurement,
    nutritionPlan,
    photoCount,
    latestPhoto,
    noteCount,
    latestNote,
  ] = await Promise.all([
    ClientOnboardingQuestionnaire.findOne({
      where: { userId: targetUserId },
      order: [['createdAt', 'DESC']],
    }),
    ClientBaselineMeasurements.findOne({
      where: { userId: targetUserId },
      order: [['takenAt', 'DESC']],
    }),
    ClientNutritionPlan.findOne({
      where: { userId: targetUserId, status: 'active' },
      order: [['startDate', 'DESC']],
    }),
    ClientPhoto.count({ where: { userId: targetUserId, isDeleted: false } }),
    ClientPhoto.findOne({
      where: { userId: targetUserId, isDeleted: false },
      order: [['uploadedAt', 'DESC']],
    }),
    includeTrainerNoteSummary
      ? ClientNote.count({ where: { userId: targetUserId } })
      : Promise.resolve(0),
    includeTrainerNoteSummary
      ? ClientNote.findOne({
          where: { userId: targetUserId },
          order: [['createdAt', 'DESC']],
        })
      : Promise.resolve(null),
  ]);

  const responses = normalizeJsonObject(questionnaire?.responsesJson) ?? {};
  const completionPercentage = questionnaire ? calculateCompletionPercentage(responses) : 0;
  const onboardingCompleted = questionnaire?.status === 'completed' || completionPercentage === 100;
  const movementCompleted = !!baselineMeasurement;
  const movementDate = baselineMeasurement?.takenAt ?? baselineMeasurement?.createdAt ?? null;

  return {
    userId: targetUserId,
    onboardingStatus: {
      completed: onboardingCompleted,
      completionPercentage,
      primaryGoal: questionnaire?.primaryGoal ?? null,
      trainingTier: questionnaire?.trainingTier ?? null,
    },
    movementScreen: {
      completed: movementCompleted,
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
