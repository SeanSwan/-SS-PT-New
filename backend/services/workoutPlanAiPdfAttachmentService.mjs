/**
 * Workout Plan AI PDF Attachment Service
 * ======================================
 *
 * Bridges Swan Coach's raw SQL workout-plan insert to the shared workout-plan
 * PDF storage system. The plan insert remains the source of truth; this service
 * only adds metadata.planPdf after the inserted plan id is known.
 */

import logger from '../utils/logger.mjs';
import { storeWorkoutPlanPdf } from './workoutPlanPdfStorageService.mjs';
import { buildWorkoutPlanPdfFile } from './workoutPlanServerPdfService.mjs';
import { sanitizeWorkoutPlanMetadataForPersistence } from './workoutPlanDataPrivacyService.mjs';
import {
  buildWorkoutPlanExerciseGuideLines,
  resolveWorkoutPlanPdfBrandForClient,
} from './workoutPlanExerciseGuideService.mjs';

const buildBrandedPlanPdfFile = async ({ title, description, durationWeeks, nasmPhase, planData, clientId }) => {
  const [brand, appendixLines] = await Promise.all([
    resolveWorkoutPlanPdfBrandForClient(clientId),
    buildWorkoutPlanExerciseGuideLines(planData),
  ]);
  return buildWorkoutPlanPdfFile({ title, description, durationWeeks, nasmPhase, planData, brand, appendixLines });
};

const firstRowId = (value) => {
  const row = Array.isArray(value) ? value.find((item) => item?.id) : value;
  return row?.id || null;
};

export const extractInsertedWorkoutPlanId = (queryResult) => {
  const result = Array.isArray(queryResult) ? queryResult : [];
  return firstRowId(result[0]) || firstRowId(result[1]?.rows);
};

const updatePlanPdfMetadata = async ({ sequelize, planId, metadata }) => (
  sequelize.query(
    `UPDATE workout_plans
     SET metadata = :metadata::jsonb, "updatedAt" = NOW()
     WHERE id = :planId`,
    {
      replacements: {
        planId,
        metadata: JSON.stringify(metadata),
      },
      type: sequelize.QueryTypes?.UPDATE,
    },
  )
);

const persistPlanPdf = async ({ sequelize, file, planId, clientId, trainerId, metadata }) => {
  try {
    const planPdf = await storeWorkoutPlanPdf({
      file,
      planId,
      clientId,
      uploadedBy: trainerId,
    });
    const nextMetadata = sanitizeWorkoutPlanMetadataForPersistence({ ...metadata, planPdf });
    await updatePlanPdfMetadata({ sequelize, planId, metadata: nextMetadata });
    logger.info('[AIDataWrite] Attached generated PDF to workout plan %s', planId);
    return nextMetadata;
  } catch (error) {
    logger.warn('[AIDataWrite] Workout plan PDF attachment failed for plan %s: %s', planId, error.message);
    return sanitizeWorkoutPlanMetadataForPersistence(metadata);
  }
};

export async function attachGeneratedWorkoutPlanPdf({
  sequelize,
  planId,
  clientId,
  trainerId,
  title,
  description,
  durationWeeks,
  nasmPhase,
  planData,
  metadata,
}) {
  if (!planId) {
    logger.warn('[AIDataWrite] Workout plan PDF skipped because inserted plan id was unavailable');
    return sanitizeWorkoutPlanMetadataForPersistence(metadata);
  }

  const file = await buildBrandedPlanPdfFile({ title, description, durationWeeks, nasmPhase, planData, clientId });
  if (!file) return sanitizeWorkoutPlanMetadataForPersistence(metadata);

  return persistPlanPdf({ sequelize, file, planId, clientId, trainerId, metadata });
}

/**
 * Regenerate + replace the attached plan PDF from a WorkoutPlan model
 * instance's CURRENT planData (planner save/update path). Non-fatal by
 * design: a PDF failure never fails the save that triggered it.
 */
export async function refreshWorkoutPlanPdfAttachment({ plan, uploadedBy }) {
  if (!plan?.id) return false;
  try {
    const file = await buildBrandedPlanPdfFile({
      title: plan.title,
      description: plan.description,
      durationWeeks: plan.durationWeeks,
      nasmPhase: plan.nasmPhase,
      planData: plan.planData,
      clientId: plan.userId,
    });
    if (!file) return false;

    const planPdf = await storeWorkoutPlanPdf({
      file,
      planId: plan.id,
      clientId: plan.userId,
      uploadedBy: uploadedBy || plan.trainerId,
    });
    const nextMetadata = sanitizeWorkoutPlanMetadataForPersistence({
      ...(plan.metadata && typeof plan.metadata === 'object' ? plan.metadata : {}),
      planPdf,
    });
    await plan.update({ metadata: nextMetadata });
    logger.info('[WorkoutPlanPdf] Refreshed attached PDF for plan %s', plan.id);
    return true;
  } catch (error) {
    logger.warn('[WorkoutPlanPdf] PDF refresh failed for plan %s: %s', plan?.id, error.message);
    return false;
  }
}
