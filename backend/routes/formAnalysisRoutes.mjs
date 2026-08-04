/**
 * Form Analysis Routes
 * ====================
 * API endpoints for AI-powered exercise form analysis.
 *
 * POST   /api/form-analysis/upload        Upload media + start analysis
 * GET    /api/form-analysis/history        Analysis history for current user
 * GET    /api/form-analysis/:id            Get single analysis
 * POST   /api/form-analysis/:id/reprocess  Reprocess a failed analysis
 * GET    /api/form-analysis/profile        Get current user's movement profile
 * GET    /api/form-analysis/profile/:userId Get any user's movement profile (admin/trainer)
 * GET    /api/form-analysis/exercises      List supported exercises
 * GET    /api/form-analysis/stats          Admin stats dashboard data
 */
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import {
  assertAssignmentOrAdmin,
  verifyClientAccessByUserId,
} from '../middleware/verifyClientAccess.mjs';
import { requireTier } from '../middleware/requireTier.mjs';
import { aiRateLimiter } from '../middleware/aiRateLimiter.mjs';
import {
  createFormAnalysis,
  processFormAnalysis,
  getAnalysisHistory,
  getAnalysisById,
  getMovementProfileForUser,
  getFormAnalysisStats,
} from '../services/formAnalysisService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const resolveAnalysisHistoryUserId = async (req) => {
  const ownUserId = Number(req.user.id);
  if (!req.query.userId) return { userId: ownUserId };

  const targetUserId = parseInt(req.query.userId, 10);
  if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
    return { status: 400, error: 'Invalid userId' };
  }

  const allowed = await assertAssignmentOrAdmin(req.user.id, req.user.role, targetUserId);
  if (!allowed) {
    return { status: 404, error: 'Analysis history not found' };
  }

  return { userId: targetUserId };
};

// Multer for video/image upload (memory storage, 100MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      'image/jpeg', 'image/png', 'image/webp',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${allowedMimes.join(', ')}`));
    }
  },
});

// All routes require authentication
router.use(protect);

/**
 * POST /upload — Upload media and start form analysis (Crystalline+)
 */
router.post('/upload', requireTier('elite', 'video.formcheck'), upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided' });
    }

    const { exerciseName, sessionId } = req.body;
    if (!exerciseName) {
      return res.status(400).json({ error: 'exerciseName is required' });
    }

    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

    // For now, store in local uploads directory (R2 integration in future)
    // In production, this will upload to R2 and store the presigned URL
    let mediaUrl;
    try {
      const { uploadToR2 } = await import('../services/formAnalysisStorage.mjs');
      mediaUrl = await uploadToR2(req.file, `form-analysis/${req.user.id}`);
    } catch {
      // Fallback: use a data URL placeholder (dev mode)
      // In production, R2 must be configured
      mediaUrl = `local://form-analysis/${req.user.id}/${uuidv4()}-${req.file.originalname}`;
      logger.warn('[FormAnalysis] R2 not available, using local placeholder URL');
    }

    const analysis = await createFormAnalysis({
      userId: req.user.id,
      trainerId: req.body.trainerId || null,
      sessionId: sessionId || null,
      exerciseName,
      mediaUrl,
      mediaType,
      metadata: {
        originalFilename: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        deviceType: req.headers['x-device-type'] || null,
        cameraAngle: req.body.cameraAngle || null,
      },
    });

    // Process in background (best-effort, don't block response)
    processFormAnalysis(analysis.id).catch(err => {
      logger.error('[FormAnalysis] Background processing failed for analysis %d: %s', analysis.id, err.message);
    });

    res.status(201).json({
      id: analysis.id,
      status: 'pending',
      message: 'Analysis started. Poll GET /api/form-analysis/' + analysis.id + ' for results.',
    });
  } catch (error) {
    logger.error('[FormAnalysis] Upload error:', error.message);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

/**
 * GET /history — Analysis history for current user
 */
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, exerciseName, status } = req.query;
    const target = await resolveAnalysisHistoryUserId(req);
    if (target.error) {
      return res.status(target.status).json({ error: target.error });
    }
    const userId = target.userId;

    const result = await getAnalysisHistory(userId, {
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      exerciseName: exerciseName || null,
      status: status || null,
    });

    res.json(result);
  } catch (error) {
    logger.error('[FormAnalysis] History error:', error.message);
    res.status(500).json({ error: 'Failed to fetch analysis history' });
  }
});

/**
 * GET /exercises — List supported exercises from Python service
 */
router.get('/exercises', async (req, res) => {
  try {
    const serviceUrl = process.env.FORM_ANALYSIS_URL || 'http://localhost:8100';
    const response = await fetch(`${serviceUrl}/exercises`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Python service returned ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    logger.error('[FormAnalysis] Failed to fetch exercises:', error.message);
    // Return a static fallback
    res.json({
      total: 81,
      message: 'Form analysis service unavailable, returning cached count',
      exercises: [],
    });
  }
});

/**
 * GET /stats — Admin dashboard stats
 */
router.get('/stats', authorize(['admin']), async (req, res) => {
  try {
    const stats = await getFormAnalysisStats();
    res.json(stats);
  } catch (error) {
    logger.error('[FormAnalysis] Stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /profile — Current user's movement profile
 */
router.get('/profile', async (req, res) => {
  try {
    const profile = await getMovementProfileForUser(req.user.id);
    res.json(profile || { message: 'No movement profile yet. Complete a form analysis to start building your profile.' });
  } catch (error) {
    logger.error('[FormAnalysis] Profile error:', error.message);
    res.status(500).json({ error: 'Failed to fetch movement profile' });
  }
});

/**
 * GET /profile/:userId — Any user's movement profile (admin/trainer only)
 */
router.get('/profile/:userId', authorize(['admin', 'trainer']), verifyClientAccessByUserId({ paramName: 'userId' }), async (req, res) => {
  try {
    const profile = await getMovementProfileForUser(parseInt(req.params.userId, 10));
    res.json(profile || { message: 'No movement profile found for this user.' });
  } catch (error) {
    logger.error('[FormAnalysis] Profile error:', error.message);
    res.status(500).json({ error: 'Failed to fetch movement profile' });
  }
});

/**
 * GET /:id — Get single analysis by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const analysis = await getAnalysisById(
      parseInt(req.params.id, 10),
      req.user.id,
      req.user.role
    );

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    logger.error('[FormAnalysis] Get analysis error:', error.message);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

/**
 * POST /:id/reprocess — Retry a failed analysis
 */
// Launch audit 2026-08-04 — cost abuse. This re-runs the FULL Gemini form
// analysis, re-uploading a video up to 100MB, and carried neither a tier gate
// nor a limiter while its sibling /upload requires ('elite','video.formcheck').
// Ownership IS enforced (getAnalysisById scopes by req.user.id + role), so this
// is not an IDOR — but a user could loop reprocess on their OWN analysis and
// bill unbounded paid inference. The `analysisStatus !== 'failed'` guard does
// not throttle: the async job resets to pending and re-arms on failure.
// aiRateLimiter is per-user, which is the right control here.
// NOTE (Sean's call, SWA-128): whether reprocess should ALSO require the same
// 'elite' tier as /upload is a product/entitlement decision, not a security
// one, so it is deliberately NOT changed here.
router.post('/:id/reprocess', aiRateLimiter, async (req, res) => {
  try {
    const analysis = await getAnalysisById(
      parseInt(req.params.id, 10),
      req.user.id,
      req.user.role
    );

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysis.analysisStatus !== 'failed') {
      return res.status(400).json({ error: 'Only failed analyses can be reprocessed' });
    }

    // Reset and reprocess
    await analysis.update({ analysisStatus: 'pending', errorMessage: null });

    processFormAnalysis(analysis.id).catch(err => {
      logger.error('[FormAnalysis] Reprocess failed for analysis %d: %s', analysis.id, err.message);
    });

    res.json({ id: analysis.id, status: 'pending', message: 'Reprocessing started' });
  } catch (error) {
    logger.error('[FormAnalysis] Reprocess error:', error.message);
    res.status(500).json({ error: 'Failed to reprocess analysis' });
  }
});

export default router;
