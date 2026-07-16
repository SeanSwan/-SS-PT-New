/**
 * ============================================================================
 * FILE: workoutPlanPdfGenerationService.mjs
 * PURPOSE: Render and store one server-owned workout-plan PDF derivative.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { createHash } from 'node:crypto';
import { storeWorkoutPlanPdf } from './workoutPlanPdfStorageService.mjs';
import { buildWorkoutPlanPdfFile } from './workoutPlanServerPdfService.mjs';
import { buildWorkoutPlanExerciseGuideLines } from './workoutPlanExerciseGuideService.mjs';

export class WorkoutPlanPdfGenerationError extends Error {
  constructor(message, code = 'WORKOUT_PLAN_PDF_RENDER_FAILED', options = {}) {
    super(message, options);
    this.name = 'WorkoutPlanPdfGenerationError';
    this.code = code;
  }
}

export async function buildAndStoreGeneratedWorkoutPlanPdf({
  plan,
  brand,
  uploadedBy,
} = {}) {
  const appendixLines = await buildWorkoutPlanExerciseGuideLines(plan?.planData);
  const file = buildWorkoutPlanPdfFile({
    title: plan?.title,
    description: plan?.description,
    durationWeeks: plan?.durationWeeks,
    nasmPhase: plan?.nasmPhase,
    planData: plan?.planData,
    brand,
    appendixLines,
  });
  if (!file?.buffer) {
    throw new WorkoutPlanPdfGenerationError('Workout plan PDF renderer returned no file');
  }

  const checksum = createHash('sha256').update(file.buffer).digest('hex');
  let planPdf;
  try {
    planPdf = await storeWorkoutPlanPdf({
      file,
      planId: plan.id,
      clientId: plan.userId,
      uploadedBy: uploadedBy || plan.trainerId,
    });
  } catch (error) {
    throw new WorkoutPlanPdfGenerationError(
      'Workout plan PDF durable storage failed',
      'WORKOUT_PLAN_PDF_STORAGE_FAILED',
      { cause: error },
    );
  }
  return { planPdf, checksum };
}
