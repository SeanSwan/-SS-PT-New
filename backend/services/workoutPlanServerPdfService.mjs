/**
 * Workout Plan Server PDF Service
 * ===============================
 *
 * Generates a branded, client-facing PDF buffer from the exact saved
 * WorkoutPlan.planData payload. The returned object matches multer's
 * in-memory file shape so it can reuse the private R2/local storage path.
 */

import {
  buildWorkoutPlanPdfLines,
  safeWorkoutPlanPdfFilenamePart,
} from './workoutPlanPdfDataService.mjs';
import { buildWorkoutPlanPdfBuffer } from './workoutPlanPdfRenderer.mjs';

const PDF_CONTENT_TYPE = 'application/pdf';

export function buildWorkoutPlanPdfFile({
  title,
  description = null,
  durationWeeks = 4,
  nasmPhase = null,
  planData = null,
  brand = null,
  appendixLines = null,
} = {}) {
  const lines = buildWorkoutPlanPdfLines({
    title, description, durationWeeks, nasmPhase, planData,
    brandWordmark: brand?.wordmark, appendixLines,
  });
  if (!lines) return null;

  const buffer = brand ? buildWorkoutPlanPdfBuffer(lines, brand) : buildWorkoutPlanPdfBuffer(lines);
  const originalname = `${brand?.filenamePrefix || 'SwanStudios'}-Workout-Plan-${safeWorkoutPlanPdfFilenamePart(title)}.pdf`;
  return {
    originalname,
    mimetype: PDF_CONTENT_TYPE,
    size: buffer.length,
    buffer,
  };
}
