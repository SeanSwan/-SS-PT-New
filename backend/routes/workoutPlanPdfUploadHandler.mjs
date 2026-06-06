/**
 * Workout Plan PDF Upload Handler
 * ===============================
 *
 * Keeps multipart parsing and binary storage out of workoutPlanRoutes.mjs.
 * The mounted router still owns auth, RBAC, and client-assignment checks.
 */

import multer from 'multer';
import logger from '../utils/logger.mjs';
import {
  storeWorkoutPlanPdf,
  WORKOUT_PLAN_PDF_MAX_BYTES,
  WorkoutPlanPdfValidationError,
} from '../services/workoutPlanPdfStorageService.mjs';

const uploadPlanPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: WORKOUT_PLAN_PDF_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const hasPdfName = /\.pdf$/i.test(file.originalname || '');
    if (file.mimetype === 'application/pdf' && hasPdfName) {
      return cb(null, true);
    }
    return cb(new WorkoutPlanPdfValidationError('A valid PDF file is required'));
  },
}).single('pdf');

export const workoutPlanPdfUploadMiddleware = (req, res, next) => {
  uploadPlanPdf(req, res, (error) => {
    if (!error) return next();

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'PDF file must be under 20MB',
      });
    }

    const status = error instanceof WorkoutPlanPdfValidationError ? 400 : 500;
    return res.status(status).json({
      success: false,
      message: status === 400 ? error.message : 'Failed to upload workout plan PDF',
    });
  });
};

export const handleWorkoutPlanPdfUpload = async (req, res) => {
  try {
    const plan = req.workoutPlan;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'A valid PDF file is required' });
    }

    const planPdf = await storeWorkoutPlanPdf({
      file: req.file,
      planId: plan.id,
      clientId: plan.userId,
      uploadedBy: req.user.id,
    });

    const metadata = {
      ...(plan.metadata && typeof plan.metadata === 'object' ? plan.metadata : {}),
      planPdf,
    };

    await plan.update({ metadata });
    logger.info('[WorkoutPlan] Uploaded PDF for plan #%s by user %d', plan.id, req.user.id);
    return res.json({ success: true, plan, planPdf });
  } catch (error) {
    if (error instanceof WorkoutPlanPdfValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }

    logger.error('[WorkoutPlan] POST /:id/pdf/upload error: %s', error.message);
    return res.status(500).json({ success: false, message: 'Failed to upload workout plan PDF' });
  }
};
