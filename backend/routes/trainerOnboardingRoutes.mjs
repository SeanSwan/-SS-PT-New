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
 *   POST /credentials  — upload a COI / certification file (multipart 'file'), returns R2 key
 *   POST /apply        — submit the signed application
 *
 * @module routes/trainerOnboardingRoutes
 */
import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.mjs';
import {
  getContract,
  getMyApplicationStatus,
  uploadCredential,
  submitApplication,
} from '../controllers/trainerOnboardingController.mjs';

const router = express.Router();

// Memory storage → service writes to R2. Allow PDF + common image types for COI/cert docs.
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    return cb(new Error('Only PDF or image files are allowed.'));
  },
});

// All onboarding endpoints require authentication.
router.use(protect);

router.get('/contract', getContract);
router.get('/status', getMyApplicationStatus);

// Wrap the multer middleware so file-type / size errors return clean JSON (not a 500).
router.post('/credentials', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const status = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ success: false, message: err.message || 'Upload rejected.' });
    }
    return uploadCredential(req, res);
  });
});

router.post('/apply', submitApplication);

export default router;
