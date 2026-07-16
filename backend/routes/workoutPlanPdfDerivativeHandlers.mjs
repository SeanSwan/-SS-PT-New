/**
 * ============================================================================
 * FILE: workoutPlanPdfDerivativeHandlers.mjs
 * PURPOSE: Expose authorized PDF generation recovery and safe status endpoints.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import sequelize from '../database.mjs';
import { getWorkoutPlan } from '../models/index.mjs';
import { mutateWorkoutPlanRecord } from '../services/workoutPlanMutationService.mjs';
import { getWorkoutPlanPdfDerivativeStatus } from '../services/workoutPlanPdfDerivativeService.mjs';
import logger from '../utils/logger.mjs';

const clientError = (error) => (
  Number.isInteger(Number(error?.statusCode))
  && Number(error.statusCode) >= 400
  && Number(error.statusCode) < 500
);

export async function handleWorkoutPlanPdfGenerate(req, res) {
  try {
    const plan = req.workoutPlan;
    const mutation = await mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan: getWorkoutPlan(),
      planId: plan.id,
      expectedRevision: req.body?.expectedRevision ?? plan.contentRevision,
      updates: {},
      pdfDerivativeIntent: {
        requestedBy: req.user.id,
        reason: 'explicit_generate',
        promoteGenerated: true,
      },
    });

    return res.status(mutation.pdfDerivative?.enabled ? 202 : 200).json({
      success: true,
      pdfDerivative: mutation.pdfDerivative,
    });
  } catch (error) {
    if (clientError(error)) {
      return res.status(Number(error.statusCode)).json({
        success: false,
        code: error.code,
        message: error.message,
        ...(error.currentRevision ? { currentRevision: error.currentRevision } : {}),
      });
    }
    logger.error('[WorkoutPlan] POST /:id/pdf/generate error: %s', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to request workout plan PDF generation',
    });
  }
}

export async function handleWorkoutPlanPdfStatus(req, res) {
  try {
    const pdfDerivative = await getWorkoutPlanPdfDerivativeStatus({
      sequelize,
      planId: req.workoutPlan.id,
    });
    return res.json({ success: true, pdfDerivative });
  } catch (error) {
    logger.error('[WorkoutPlan] GET /:id/pdf/status error: %s', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to load workout plan PDF status',
    });
  }
}
