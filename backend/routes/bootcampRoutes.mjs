/**
 * Boot Camp Class Builder Routes -- Phase 10
 * ============================================
 * REST API for AI-powered group fitness class generation.
 *
 * POST   /api/bootcamp/generate         Generate a boot camp class
 * POST   /api/bootcamp/save             Save generated class as template
 * GET    /api/bootcamp/templates        List saved templates
 * POST   /api/bootcamp/log              Log a class that was taught
 * GET    /api/bootcamp/history          Class history
 * GET    /api/bootcamp/spaces           List space profiles
 * POST   /api/bootcamp/spaces           Create space profile
 * PUT    /api/bootcamp/spaces/:id       Update space profile
 * GET    /api/bootcamp/trends           List exercise trends
 * POST   /api/bootcamp/trends/:id/approve  Approve a trend
 */

import { Router } from 'express';
import eventBus from '../services/eventBus.mjs';
import { protect, authorize } from '../middleware/auth.mjs';
import {
  generateBootcampClass,
  saveBootcampTemplate,
  logBootcampClass,
  getClassHistory,
  getTemplates,
  createSpaceProfile,
  getSpaceProfiles,
  updateSpaceProfile,
  getExerciseTrends,
  approveExerciseTrend,
} from '../services/bootcampService.mjs';
import logger from '../utils/logger.mjs';

const router = Router();

router.use(protect);
router.use(authorize('admin', 'trainer'));

const VALID_FORMATS = ['stations_4x', 'stations_3x5', 'stations_2x7', 'full_group', 'custom'];
const VALID_DAY_TYPES = ['lower_body', 'upper_body', 'cardio', 'full_body', 'custom'];

// POST /api/bootcamp/generate
router.post('/generate', async (req, res) => {
  try {
    const { classFormat, dayType, targetDuration, expectedParticipants, spaceProfileId, equipmentProfileId, name } = req.body;

    const safeFormat = VALID_FORMATS.includes(classFormat) ? classFormat : 'stations_4x';
    const safeDayType = VALID_DAY_TYPES.includes(dayType) ? dayType : 'full_body';
    const safeDuration = Math.min(Math.max(parseInt(targetDuration, 10) || 45, 20), 90);
    const safeParticipants = Math.min(Math.max(parseInt(expectedParticipants, 10) || 12, 1), 50);

    const result = await generateBootcampClass({
      trainerId: req.user.id,
      classFormat: safeFormat,
      dayType: safeDayType,
      targetDuration: safeDuration,
      expectedParticipants: safeParticipants,
      spaceProfileId: spaceProfileId ? parseInt(spaceProfileId, 10) : undefined,
      equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : undefined,
      name: typeof name === 'string' ? name.slice(0, 200) : undefined,
    });

    return res.json({ success: true, bootcamp: result });
  } catch (err) {
    logger.error('[Bootcamp] Generate failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to generate boot camp class' });
  }
});

// POST /api/bootcamp/save
router.post('/save', async (req, res) => {
  try {
    const { generatedClass } = req.body;
    if (!generatedClass) {
      return res.status(400).json({ success: false, error: 'generatedClass is required' });
    }

    const template = await saveBootcampTemplate(generatedClass, req.user.id);
    return res.json({ success: true, templateId: template.id });
  } catch (err) {
    logger.error('[Bootcamp] Save failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save template' });
  }
});

// GET /api/bootcamp/templates
router.get('/templates', async (req, res) => {
  try {
    const { classFormat, dayType, limit } = req.query;
    const templates = await getTemplates(req.user.id, {
      classFormat: VALID_FORMATS.includes(classFormat) ? classFormat : undefined,
      dayType: VALID_DAY_TYPES.includes(dayType) ? dayType : undefined,
      limit: Math.min(parseInt(limit, 10) || 20, 50),
    });
    return res.json({ success: true, templates });
  } catch (err) {
    logger.error('[Bootcamp] Templates fetch failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load templates' });
  }
});

// POST /api/bootcamp/log
router.post('/log', async (req, res) => {
  try {
    const { templateId, classDate, dayType, actualParticipants, exercisesUsed, modificationsMade, trainerNotes, classRating, energyLevel, overflowActivated } = req.body;

    if (!classDate || !exercisesUsed) {
      return res.status(400).json({ success: false, error: 'classDate and exercisesUsed are required' });
    }

    const log = await logBootcampClass({
      trainerId: req.user.id,
      templateId: templateId ? parseInt(templateId, 10) : null,
      classDate,
      dayType: VALID_DAY_TYPES.includes(dayType) ? dayType : null,
      actualParticipants: actualParticipants ? parseInt(actualParticipants, 10) : null,
      exercisesUsed,
      modificationsMade: modificationsMade ?? null,
      trainerNotes: typeof trainerNotes === 'string' ? trainerNotes.slice(0, 2000) : null,
      classRating: classRating ? Math.min(Math.max(parseInt(classRating, 10), 1), 5) : null,
      energyLevel: ['low', 'medium', 'high', 'explosive'].includes(energyLevel) ? energyLevel : null,
      overflowActivated: !!overflowActivated,
    });

    eventBus.safeEmit('bootcamp:classLogged', {
      trainerId: req.user.id,
      dayType: log.dayType,
      exerciseCount: Array.isArray(exercisesUsed) ? exercisesUsed.length : 0,
      logId: log.id,
    });

    return res.json({ success: true, logId: log.id });
  } catch (err) {
    logger.error('[Bootcamp] Log failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to log class' });
  }
});

// GET /api/bootcamp/history
router.get('/history', async (req, res) => {
  try {
    const { dayType, limit, offset } = req.query;
    const result = await getClassHistory(req.user.id, {
      dayType: VALID_DAY_TYPES.includes(dayType) ? dayType : undefined,
      limit: Math.min(parseInt(limit, 10) || 20, 50),
      offset: Math.max(parseInt(offset, 10) || 0, 0),
    });
    return res.json({ success: true, logs: result.rows, total: result.count });
  } catch (err) {
    logger.error('[Bootcamp] History fetch failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load history' });
  }
});

// GET /api/bootcamp/spaces
router.get('/spaces', async (req, res) => {
  try {
    const spaces = await getSpaceProfiles(req.user.id);
    return res.json({ success: true, spaces });
  } catch (err) {
    logger.error('[Bootcamp] Spaces fetch failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load spaces' });
  }
});

// POST /api/bootcamp/spaces
router.post('/spaces', async (req, res) => {
  try {
    const { name, locationName, totalAreaSqft, maxStations, maxPerStation, hasOutdoorAccess, outdoorDescription, notes } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'name is required' });
    }

    const space = await createSpaceProfile({
      trainerId: req.user.id,
      name: name.slice(0, 100),
      locationName: typeof locationName === 'string' ? locationName.slice(0, 200) : null,
      totalAreaSqft: totalAreaSqft ? parseInt(totalAreaSqft, 10) : null,
      maxStations: maxStations ? Math.min(parseInt(maxStations, 10), 20) : null,
      maxPerStation: maxPerStation ? Math.min(parseInt(maxPerStation, 10), 10) : 4,
      hasOutdoorAccess: !!hasOutdoorAccess,
      outdoorDescription: typeof outdoorDescription === 'string' ? outdoorDescription.slice(0, 500) : null,
      notes: typeof notes === 'string' ? notes.slice(0, 1000) : null,
    });

    return res.json({ success: true, space });
  } catch (err) {
    logger.error('[Bootcamp] Space create failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to create space' });
  }
});

// PUT /api/bootcamp/spaces/:id
router.put('/spaces/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Valid space ID required' });
    }

    const space = await updateSpaceProfile(id, req.user.id, req.body);
    return res.json({ success: true, space });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    logger.error('[Bootcamp] Space update failed:', err.message);
    return res.status(status).json({ success: false, error: err.message });
  }
});

// GET /api/bootcamp/trends
router.get('/trends', async (req, res) => {
  try {
    const { source, isApproved, limit } = req.query;
    const trends = await getExerciseTrends({
      source,
      isApproved: isApproved === 'true' ? true : isApproved === 'false' ? false : undefined,
      limit: Math.min(parseInt(limit, 10) || 50, 100),
    });
    return res.json({ success: true, trends });
  } catch (err) {
    logger.error('[Bootcamp] Trends fetch failed:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to load trends' });
  }
});

// POST /api/bootcamp/trends/:id/approve
router.post('/trends/:id/approve', authorize('admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, error: 'Valid trend ID required' });
    }

    const trend = await approveExerciseTrend(id, req.user.id);
    return res.json({ success: true, trend });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    logger.error('[Bootcamp] Trend approve failed:', err.message);
    return res.status(status).json({ success: false, error: err.message });
  }
});

export default router;
