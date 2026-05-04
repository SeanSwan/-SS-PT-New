/**
 * plaudClipsRoutes.mjs
 * =====================
 * Routes for clip lifecycle endpoints:
 *   POST   /api/plaud/clips/upload   - multi-file upload (1-5 clips)
 *   GET    /api/plaud/clips          - list pending clips
 *   DELETE /api/plaud/clips/:clipId  - soft-delete a clip
 *
 * Phase 3 Slice 3.5 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md.
 *
 * Router is mounted ALWAYS (not gated on env flag at mount time) per
 * Codex Round 2 HIGH #6 fix — first middleware on the router returns
 * structured 503 PLAUD_DISABLED when the feature flag is off.
 */
import express from 'express';
import multer from 'multer';
import { protect, authorize } from '../../middleware/authMiddleware.mjs';
import { plaudFeatureFlag } from '../../middleware/plaudFeatureFlag.mjs';
import { handlePlaudAuthzError } from '../../middleware/plaudAuthz.mjs';
import { uploadHandler } from '../../controllers/plaud/plaudUploadController.mjs';
import { listHandler, deleteHandler } from '../../controllers/plaud/plaudListController.mjs';
import logger from '../../utils/logger.mjs';

const router = express.Router();

// First: feature flag check returns 503 PLAUD_DISABLED when off
router.use(plaudFeatureFlag);

// All routes require authentication + admin/trainer role
router.use(protect);
router.use(authorize(['admin', 'trainer']));

// Rate limit: 10 file uploads per 15 min per user (counted per FILE
// inside multer middleware below)
const uploadCounts = new Map();
const RATE_WINDOW = 15 * 60 * 1000;

setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW;
  for (const [key, times] of uploadCounts) {
    const filtered = times.filter((t) => t > cutoff);
    if (filtered.length === 0) uploadCounts.delete(key);
    else uploadCounts.set(key, filtered);
  }
}, 5 * 60 * 1000).unref();

function uploadRateLimiter(maxFiles = 10) {
  return (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next();
    const key = String(userId);
    const now = Date.now();
    if (!uploadCounts.has(key)) uploadCounts.set(key, []);
    const timestamps = uploadCounts.get(key).filter((t) => now - t < RATE_WINDOW);
    const incoming = (req.files?.length || 0);
    if (timestamps.length + incoming > maxFiles) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Upload rate limit exceeded. Max ${maxFiles} files per 15 minutes.`,
        },
      });
    }
    for (let i = 0; i < incoming; i += 1) timestamps.push(now);
    uploadCounts.set(key, timestamps);
    next();
  };
}

const MAX_FILES_PER_UPLOAD = Number(process.env.PLAUD_MAX_FILES_PER_UPLOAD) || 5;
const MAX_FILE_BYTES = Number(process.env.PLAUD_MAX_FILE_BYTES) || 20 * 1024 * 1024;
const MAX_REQUEST_BYTES = Number(process.env.PLAUD_MAX_REQUEST_BYTES) || 30 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: MAX_FILES_PER_UPLOAD,
    fields: 16,
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav',
      'audio/webm', 'audio/ogg', 'audio/x-m4a', 'audio/m4a',
      'audio/aac', 'audio/flac', 'audio/x-wav',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio mime: ${file.mimetype}`));
    }
  },
});

// ── Routes ──

router.post(
  '/upload',
  upload.array('files', MAX_FILES_PER_UPLOAD),
  (req, res, next) => {
    // Total request size check (multer limits per-file but not per-request)
    const total = (req.files || []).reduce((sum, f) => sum + (f.size || 0), 0);
    if (total > MAX_REQUEST_BYTES) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'UPLOAD_TOO_LARGE',
          message: `Total upload ${total} bytes exceeds ${MAX_REQUEST_BYTES}`,
        },
      });
    }
    return next();
  },
  uploadRateLimiter(10),
  uploadHandler,
);

router.get('/', listHandler);

router.delete('/:clipId', deleteHandler);

// Multer error handler (file size, file count, mime filter)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: { code: 'UPLOAD_TOO_LARGE', message: err.message },
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: { code: 'TOO_MANY_FILES', message: err.message },
      });
    }
  }
  if (err?.message?.includes('Unsupported audio mime')) {
    return res.status(415).json({
      success: false,
      error: { code: 'UNSUPPORTED_AUDIO_TYPE', message: err.message },
    });
  }
  return next(err);
});

// PLAUD authz error handler
router.use(handlePlaudAuthzError);

// Final fallback error handler — log + 500
router.use((err, req, res, next) => {
  logger.error('[plaudClipsRoutes] unhandled error: %s', err.message);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
});

export default router;
