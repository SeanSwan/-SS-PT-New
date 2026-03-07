/**
 * Workout Variation Routes
 * ========================
 * Phase 8: NASM-aligned exercise rotation engine.
 *
 * POST   /api/variation/suggest    Generate SWITCH workout suggestions
 * POST   /api/variation/accept     Accept and log a variation
 * GET    /api/variation/history    Rotation log for a client
 * GET    /api/variation/timeline   2-week visual timeline data
 * GET    /api/variation/exercises  Full exercise registry
 * GET    /api/variation/patterns   Available rotation patterns
 */
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { getVariationLog } from '../models/index.mjs';
import {
  getNextSessionType,
  generateSwapSuggestions,
  getVariationTimeline,
  recordVariation,
  acceptVariation,
  getExerciseRegistry,
  getRotationPatterns,
} from '../services/variationEngine.mjs';
import logger from '../utils/logger.mjs';
import eventBus from '../services/eventBus.mjs';

const router = express.Router();

// All routes require authentication + trainer/admin role
router.use(protect, authorize('admin', 'trainer'));

// POST /api/variation/suggest — Generate SWITCH workout suggestions
router.post('/suggest', async (req, res) => {
  try {
    const {
      clientId,
      templateCategory,
      exercises,
      rotationPattern,
      compensations,
      equipmentProfileId,
      nasmPhase,
    } = req.body;

    // Validate required fields
    const parsedClientId = parseInt(clientId, 10);
    if (isNaN(parsedClientId)) {
      return res.status(400).json({ success: false, error: 'Valid clientId is required' });
    }
    if (!templateCategory || typeof templateCategory !== 'string') {
      return res.status(400).json({ success: false, error: 'templateCategory is required' });
    }
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ success: false, error: 'exercises array is required' });
    }

    // Get rotation history
    const history = await getVariationTimeline(parsedClientId, templateCategory, 10);

    // Determine next session type
    const nextType = getNextSessionType(history, rotationPattern || 'standard');

    // Calculate session number in current cycle
    const pattern = rotationPattern || 'standard';
    let sessionNumber = 1;
    if (history.length > 0) {
      const lastLog = history[history.length - 1];
      if (lastLog.sessionType === 'switch') {
        sessionNumber = 1; // New cycle after SWITCH
      } else {
        sessionNumber = (lastLog.sessionNumber || 0) + 1;
      }
    }

    let suggestions = null;
    if (nextType === 'switch') {
      // Get recently used exercises (last 2 sessions)
      const recentlyUsed = history
        .slice(-2)
        .flatMap(h => h.exercisesUsed || []);

      // Get equipment at location (if specified)
      let availableEquipment = [];
      if (equipmentProfileId) {
        try {
          const { getEquipmentItem, getEquipmentProfile } = await import('../models/index.mjs');
          const EquipmentItem = getEquipmentItem();
          const items = await EquipmentItem.findAll({
            where: { profileId: parseInt(equipmentProfileId, 10), isActive: true },
            attributes: ['category', 'name'],
          });
          availableEquipment = items.map(i => i.toJSON());
        } catch {
          // Silent — proceed without equipment filter
        }
      }

      const nasmLevel = nasmPhase ? parseInt(nasmPhase, 10) : null;

      suggestions = generateSwapSuggestions(exercises, {
        recentlyUsed,
        compensations: compensations || [],
        availableEquipment,
        nasmLevel,
      });
    }

    // Record the variation log (unaccepted)
    const log = await recordVariation({
      clientId: parsedClientId,
      trainerId: req.user.id,
      templateCategory,
      sessionType: nextType,
      rotationPattern: pattern,
      sessionNumber,
      exercisesUsed: exercises,
      swapDetails: suggestions,
      equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : null,
      nasmPhase: nasmPhase || null,
    });

    res.json({
      success: true,
      sessionType: nextType,
      sessionNumber,
      rotationPattern: pattern,
      suggestions,
      logId: log.id,
    });
  } catch (err) {
    logger.error('[VariationRoutes] Suggest error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate suggestions' });
  }
});

// POST /api/variation/accept — Accept variation suggestions
router.post('/accept', async (req, res) => {
  try {
    const { logId } = req.body;
    const parsedLogId = parseInt(logId, 10);
    if (isNaN(parsedLogId)) {
      return res.status(400).json({ success: false, error: 'Valid logId is required' });
    }

    const log = await acceptVariation(parsedLogId, req.user.id);

    eventBus.safeEmit('variation:accepted', {
      userId: log.clientId,
      trainerId: req.user.id,
      variationLogId: log.id,
      category: log.templateCategory,
    });

    res.json({ success: true, log });
  } catch (err) {
    logger.error('[VariationRoutes] Accept error:', err);
    const status = err.message === 'Access denied' ? 403 : err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
});

// GET /api/variation/history — Rotation log for a client
router.get('/history', async (req, res) => {
  try {
    const parsedClientId = parseInt(req.query.clientId, 10);
    if (isNaN(parsedClientId)) {
      return res.status(400).json({ success: false, error: 'Valid clientId is required' });
    }

    const category = req.query.category || null;
    const VariationLog = getVariationLog();

    const where = { clientId: parsedClientId };
    if (req.user.role !== 'admin') {
      where.trainerId = req.user.id;
    }
    if (category) {
      where.templateCategory = category;
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { rows: logs, count } = await VariationLog.findAndCountAll({
      where,
      order: [['sessionDate', 'DESC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      logs,
      pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
    });
  } catch (err) {
    logger.error('[VariationRoutes] History error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// GET /api/variation/timeline — 2-week visual timeline data
router.get('/timeline', async (req, res) => {
  try {
    const parsedClientId = parseInt(req.query.clientId, 10);
    if (isNaN(parsedClientId)) {
      return res.status(400).json({ success: false, error: 'Valid clientId is required' });
    }

    const category = req.query.category;
    if (!category) {
      return res.status(400).json({ success: false, error: 'category is required' });
    }

    const timeline = await getVariationTimeline(parsedClientId, category, 6);

    // Determine next session type
    const pattern = req.query.pattern || 'standard';
    const nextType = getNextSessionType(timeline, pattern);

    res.json({
      success: true,
      timeline: timeline.map(t => ({
        id: t.id,
        sessionType: t.sessionType,
        sessionNumber: t.sessionNumber,
        sessionDate: t.sessionDate,
        accepted: t.accepted,
        exerciseCount: t.exercisesUsed?.length || 0,
      })),
      nextSessionType: nextType,
      rotationPattern: pattern,
    });
  } catch (err) {
    logger.error('[VariationRoutes] Timeline error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch timeline' });
  }
});

// GET /api/variation/exercises — Full exercise registry
router.get('/exercises', (req, res) => {
  const exercises = getExerciseRegistry();
  const { category, muscle } = req.query;

  let filtered = exercises;
  if (category) {
    filtered = filtered.filter(e => e.category === category);
  }
  if (muscle) {
    filtered = filtered.filter(e => e.muscles.includes(muscle));
  }

  res.json({ success: true, exercises: filtered });
});

// GET /api/variation/patterns — Available rotation patterns
router.get('/patterns', (req, res) => {
  res.json({ success: true, patterns: getRotationPatterns() });
});

export default router;
