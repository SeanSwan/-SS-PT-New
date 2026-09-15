/**
 * Trainer Onboarding Routes — self-serve trainer application + contract e-sign.
 * ============================================================================
 * Mounted at /api/trainer-onboarding (see core/routes.mjs). All routes require an
 * authenticated user (protect). Any authenticated user may apply to become a trainer;
 * approval is a separate admin action (fail-closed).
 *
 * Routes:
 *   GET  /contract     — current agreement text + consents (public-ish, still auth-gated)
 *   GET  /status       — the caller's latest application status
 *   POST /credentials  — upload an encrypted credential file, returns an opaque private key
 *   POST /apply        — submit the signed application
 *
 * @module routes/trainerOnboardingRoutes
 */
import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/authMiddleware.mjs';
import {
  getContract,
  getMyApplicationStatus,
  uploadCredential,
  submitApplication,
} from '../controllers/trainerOnboardingController.mjs';

const router = express.Router();

/** Keep the backend foundation dark until legal terms and the product surface are approved. */
export function requireTrainerOnboardingEnabled(_req, res, next) {
  if (process.env.ENABLE_TRAINER_ONBOARDING !== 'true') {
    return res.status(503).json({
      success: false,
      code: 'TRAINER_ONBOARDING_DISABLED',
      message: 'Trainer onboarding is not currently accepting applications.',
    });
  }
  return next();
}

/** Prefer authenticated identity so clients behind the same gym NAT do not share a quota. */
export const trainerOnboardingRateLimitKey = (req) => (
  req?.user?.id ? `u:${req.user.id}` : `ip:${req.ip}`
);

const throttleBody = (message, retryAfter) => ({
  success: false,
  error: message,
  message,
  retryAfter,
});

export const trainerCredentialUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: trainerOnboardingRateLimitKey,
  message: throttleBody('Too many credential uploads. Please wait before trying again.', '1 hour'),
  standardHeaders: true,
  legacyHeaders: false,
});

export const trainerApplicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: trainerOnboardingRateLimitKey,
  message: throttleBody('Too many trainer application attempts. Please wait before trying again.', '15 minutes'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Memory storage → dedicated service validates bytes, encrypts, then writes privately.
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 1,
    parts: 2,
    fieldSize: 100,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    return cb(new Error('Only PDF or image files are allowed.'));
  },
});

// All onboarding endpoints require authentication.
router.use(protect);
router.use(requireTrainerOnboardingEnabled);

router.get('/contract', getContract);
router.get('/status', getMyApplicationStatus);

// Wrap the multer middleware so file-type / size errors return clean JSON (not a 500).
router.post('/credentials', trainerCredentialUploadLimiter, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const status = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, message: err.message || 'Upload rejected.' });
    }
    return uploadCredential(req, res);
  });
});

router.post('/apply', trainerApplicationLimiter, submitApplication);

export default router;
