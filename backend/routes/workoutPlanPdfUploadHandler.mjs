/**
 * ============================================================================
 * FILE: workoutPlanPdfUploadHandler.mjs
 * PURPOSE: Validate, store, and transactionally record manual plan PDFs.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { createHash } from 'node:crypto';
import multer from 'multer';
import sequelize from '../database.mjs';
import { getWorkoutPlan } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { sanitizeWorkoutPlanMetadataForPersistence } from '../services/workoutPlanDataPrivacyService.mjs';
import { mutateWorkoutPlanRecord } from '../services/workoutPlanMutationService.mjs';
import { recordManualWorkoutPlanPdfDerivative } from '../services/workoutPlanPdfDerivativeService.mjs';
import {
  deleteStoredWorkoutPlanPdf,
  storeWorkoutPlanPdf,
  WORKOUT_PLAN_PDF_MAX_BYTES,
  WorkoutPlanPdfValidationError,
} from '../services/workoutPlanPdfStorageService.mjs';

const uploadPlanPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: WORKOUT_PLAN_PDF_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const hasPdfName = /\.pdf$/i.test(file.originalname || '');
    if (file.mimetype === 'application/pdf' && hasPdfName) return cb(null, true);
    return cb(new WorkoutPlanPdfValidationError('A valid PDF file is required'));
  },
}).single('pdf');

const uploadErrorResponse = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, message: 'PDF file must be under 20MB' };
  }
  const status = error instanceof WorkoutPlanPdfValidationError ? 400 : 500;
  return {
    status,
    message: status === 400 ? error.message : 'Failed to upload workout plan PDF',
  };
};

const sendPdfUploadError = (res, error) => {
  if (error instanceof WorkoutPlanPdfValidationError) {
    return res.status(400).json({ success: false, message: error.message });
  }
  logger.error('[WorkoutPlan] POST /:id/pdf/upload error: %s', error.message);
  return res.status(500).json({ success: false, message: 'Failed to upload workout plan PDF' });
};

export const workoutPlanPdfUploadMiddleware = (req, res, next) => {
  uploadPlanPdf(req, res, (error) => {
    if (!error) return next();
    const { status, message } = uploadErrorResponse(error);
    return res.status(status).json({ success: false, message });
  });
};

export const handleWorkoutPlanPdfUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'A valid PDF file is required' });
  }

  let storedPdf = null;
  try {
    const authorizedPlan = req.workoutPlan;
    const checksum = createHash('sha256').update(req.file.buffer).digest('hex');
    storedPdf = await storeWorkoutPlanPdf({
      file: req.file,
      planId: authorizedPlan.id,
      clientId: authorizedPlan.userId,
      uploadedBy: req.user.id,
    });
    const planPdf = {
      ...storedPdf,
      sourceType: 'manual',
      state: 'ready',
      sourceRevision: Number(authorizedPlan.contentRevision) || 1,
      sourceHash: authorizedPlan.contentHash || null,
      checksum,
      needsReview: false,
    };
    const metadata = sanitizeWorkoutPlanMetadataForPersistence({
      ...(authorizedPlan.metadata && typeof authorizedPlan.metadata === 'object'
        ? authorizedPlan.metadata
        : {}),
      planPdf,
    });

    const result = await sequelize.transaction(async (transaction) => {
      const mutation = await mutateWorkoutPlanRecord({
        sequelize,
        WorkoutPlan: getWorkoutPlan(),
        planId: authorizedPlan.id,
        updates: { metadata },
        transaction,
      });
      const pdfDerivative = await recordManualWorkoutPlanPdfDerivative({
        sequelize,
        plan: mutation.plan,
        planPdf,
        checksum,
        requestedBy: req.user.id,
        transaction,
      });
      return { mutation, pdfDerivative };
    });

    logger.info('[WorkoutPlan] Uploaded manual PDF for plan #%s by user %d',
      authorizedPlan.id, req.user.id);
    return res.json({
      success: true,
      plan: result.mutation.plan,
      planPdf,
      pdfDerivative: result.pdfDerivative,
    });
  } catch (error) {
    if (storedPdf) {
      try {
        await deleteStoredWorkoutPlanPdf(storedPdf);
      } catch (cleanupError) {
        logger.warn('[WorkoutPlan] Failed to clean up uncommitted PDF %s: %s',
          storedPdf.storageKey, cleanupError.message);
      }
    }
    return sendPdfUploadError(res, error);
  }
};
