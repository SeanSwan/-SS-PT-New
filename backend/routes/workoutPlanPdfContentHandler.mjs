/**
 * Workout Plan PDF Content Handler
 * ================================
 *
 * Streams authenticated workout-plan PDFs after workoutPlanRoutes attaches
 * req.workoutPlan through the plan-access middleware.
 */

import logger from '../utils/logger.mjs';
import {
  resolveWorkoutPlanPdfContent,
  WorkoutPlanPdfContentError,
} from '../services/workoutPlanPdfContentService.mjs';

const contentDisposition = (fileName) => `inline; filename="${String(fileName).replace(/"/g, '')}"`;

export const handleWorkoutPlanPdfContent = async (req, res) => {
  try {
    const pdf = await resolveWorkoutPlanPdfContent({ plan: req.workoutPlan });
    res.set({
      'Content-Type': pdf.contentType,
      'Content-Length': String(pdf.size),
      'Content-Disposition': contentDisposition(pdf.fileName),
      'Cache-Control': 'private, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.status(200).send(pdf.buffer);
  } catch (error) {
    if (error instanceof WorkoutPlanPdfContentError) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    logger.error('[WorkoutPlan] GET /:id/pdf/content.pdf error: %s', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load workout plan PDF' });
  }
};
