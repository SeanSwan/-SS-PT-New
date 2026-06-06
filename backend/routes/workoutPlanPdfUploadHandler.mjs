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

const missingFileResponse = (req) => (
  req.file ? null : { status: 400, message: 'A valid PDF file is required' }
);

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
    return res.status(status).json({
      success: false,
      message,
    });
  });
};

export const handleWorkoutPlanPdfUpload = async (req, res) => {
  const missingFile = missingFileResponse(req);
  if (missingFile) {
    return res.status(missingFile.status).json({ success: false, message: missingFile.message });
  }

  try {
    const plan = req.workoutPlan;
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
    return sendPdfUploadError(res, error);
  }
};
