/**
 * ============================================================================
 * FILE: workoutPlanPdfMetadataHandler.mjs
 * PURPOSE: Transactionally attach or rename a protected manual plan PDF.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import sequelize from '../database.mjs';
import { getWorkoutPlan } from '../models/index.mjs';
import {
  buildWorkoutPlanPdfMetadata,
  extractWorkoutPlanPdfAttachment,
} from '../services/workoutPlanPdfAttachmentService.mjs';
import { sanitizeWorkoutPlanMetadataForPersistence } from '../services/workoutPlanDataPrivacyService.mjs';
import {
  mutateWorkoutPlanRecord,
  WorkoutPlanMutationError,
} from '../services/workoutPlanMutationService.mjs';
import { recordManualWorkoutPlanPdfDerivative } from '../services/workoutPlanPdfDerivativeService.mjs';
import { hashWorkoutPlanContent } from '../services/workoutPlanRevisionService.mjs';
import logger from '../utils/logger.mjs';

const buildMetadata = ({ plan, body, userId }) => buildWorkoutPlanPdfMetadata({
  currentMetadata: plan.metadata || {},
  planId: plan.id,
  pdfUrl: body?.pdfUrl || body?.url,
  fileName: body?.fileName,
  storage: body?.storage,
  storageKey: body?.storageKey,
  updatedBy: userId,
});

const manualProvenance = (plan, planPdf) => ({
  ...planPdf,
  sourceType: 'manual',
  state: 'ready',
  sourceRevision: Number(plan.contentRevision) || 1,
  sourceHash: plan.contentHash || hashWorkoutPlanContent(plan.planData),
  needsReview: false,
});

const isClientError = (error) => {
  const status = Number(error?.statusCode);
  return Number.isInteger(status) && status >= 400 && status < 500;
};

export async function handleWorkoutPlanPdfMetadataUpdate(req, res) {
  const authorizedPlan = req.workoutPlan;
  const initial = buildMetadata({ plan: authorizedPlan, body: req.body, userId: req.user.id });
  if (!initial.ok) {
    return res.status(400).json({ success: false, message: initial.message });
  }

  try {
    const result = await sequelize.transaction(async (transaction) => {
      let planPdf;
      const mutation = await mutateWorkoutPlanRecord({
        sequelize,
        WorkoutPlan: getWorkoutPlan(),
        planId: authorizedPlan.id,
        expectedRevision: req.body?.expectedRevision ?? authorizedPlan.contentRevision,
        transaction,
        updates: (lockedPlan) => {
          const built = buildMetadata({ plan: lockedPlan, body: req.body, userId: req.user.id });
          if (!built.ok) {
            throw new WorkoutPlanMutationError(built.message, {
              code: 'WORKOUT_PLAN_PDF_METADATA_INVALID',
              statusCode: 400,
            });
          }
          const safeMetadata = sanitizeWorkoutPlanMetadataForPersistence(built.metadata);
          planPdf = manualProvenance(lockedPlan, safeMetadata.planPdf || built.planPdf);
          return { metadata: { ...safeMetadata, planPdf } };
        },
      });
      const pdfDerivative = await recordManualWorkoutPlanPdfDerivative({
        sequelize,
        plan: mutation.plan,
        planPdf,
        requestedBy: req.user.id,
        transaction,
      });
      return { mutation, pdfDerivative, planPdf };
    });

    logger.info('[WorkoutPlan] Updated manual PDF for plan #%s by user %d',
      authorizedPlan.id, req.user.id);
    return res.json({
      success: true,
      plan: result.mutation.plan,
      planPdf: extractWorkoutPlanPdfAttachment({ planPdf: result.planPdf }),
      pdfDerivative: result.pdfDerivative,
    });
  } catch (error) {
    if (isClientError(error)) {
      return res.status(Number(error.statusCode)).json({
        success: false,
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
        ...(error.currentRevision ? { currentRevision: error.currentRevision } : {}),
      });
    }
    logger.error('[WorkoutPlan] PUT /:id/pdf error: %s', error.message);
    return res.status(500).json({ success: false, message: 'Failed to update workout plan PDF' });
  }
}
