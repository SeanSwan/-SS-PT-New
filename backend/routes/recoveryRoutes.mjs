/**
 * Recovery Routes — the Restore (off-day recovery) panel API
 * ==========================================================
 * GET  /api/recovery/today     — auto-queried composition for the client home
 * POST /api/recovery/complete  — persist a completed ritual item + award XP
 *
 * Access: self by default; trainers/admins may pass ?clientId= / body.clientId
 * (ensureClientAccess enforces the same scoping as client workout routes).
 * Deterministic backend — no LLM in this path (Rule 8).
 */
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import logger from '../utils/logger.mjs';
import { composeRestoreToday } from '../services/recovery/restoreCompassService.mjs';
import { formatDateOnlyInTimeZone, resolveClientTrainingDateContext } from '../services/clientTrainingDateService.mjs';
import { getAllModels } from '../models/index.mjs';
import { gamificationEngine } from '../services/gamification/GamificationEngine.mjs';

const router = express.Router();

const VALID_BLOCKS = new Set(['inhibit', 'lengthen', 'activate', 'cardio']);

router.get('/today', protect, async (req, res) => {
  try {
    const targetId = req.query.clientId || req.user.id;
    const access = await ensureClientAccess(req, targetId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, client } = access;
    const composition = await composeRestoreToday({
      userId: clientId,
      storedTimeZone: client?.timeZone,
      storedTimeZoneConfigured: client?.timeZoneConfigured,
      headerTimeZone: req.get('X-Client-Timezone'),
      actorId: req.user.id,
    });

    // Persisted checks for today so the ritual survives refresh (Kimi: no toy checkboxes).
    const { RecoveryActivityLog } = getAllModels();
    let completedExerciseIds = [];
    if (RecoveryActivityLog && composition.localDate) {
      const rows = await RecoveryActivityLog.findAll({
        where: { userId: clientId, localDate: composition.localDate },
        attributes: ['exerciseId'],
      });
      completedExerciseIds = rows.map((r) => r.exerciseId);
    }

    return res.json({ success: true, data: { ...composition, completedExerciseIds } });
  } catch (error) {
    if (error?.name === 'ClientTrainingDateError') {
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
    logger.error('recovery/today failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Unable to compose recovery guidance' });
  }
});

router.post('/complete', protect, async (req, res) => {
  try {
    const targetId = req.body?.clientId || req.user.id;
    const access = await ensureClientAccess(req, targetId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }
    const { clientId, client } = access;

    const { exerciseId, blockKey, dataSources } = req.body || {};
    if (!exerciseId || typeof exerciseId !== 'string') {
      return res.status(400).json({ success: false, message: 'exerciseId is required' });
    }
    const safeBlock = VALID_BLOCKS.has(blockKey) ? blockKey : 'inhibit';

    const { RecoveryActivityLog, Exercise } = getAllModels();
    const exercise = await Exercise.findByPk(exerciseId, {
      attributes: ['id', 'experiencePointsEarned'],
    });
    if (!exercise) {
      return res.status(404).json({ success: false, message: 'Exercise not found' });
    }

    const dateContext = resolveClientTrainingDateContext({
      storedTimeZone: client?.timeZone,
      storedTimeZoneConfigured: client?.timeZoneConfigured,
      headerTimeZone: req.get('X-Client-Timezone'),
      actorId: req.user.id,
      targetClientId: clientId,
    });
    const localDate = dateContext.localDate
      || formatDateOnlyInTimeZone(new Date(), dateContext.timeZone);

    // Idempotent per (client, local day, exercise) — Kimi H6 granularity.
    const [row, created] = await RecoveryActivityLog.findOrCreate({
      where: { userId: clientId, localDate, exerciseId },
      defaults: {
        blockKey: safeBlock,
        xpAwarded: 0,
        dataSources: Array.isArray(dataSources)
          ? dataSources.map(String).join(',').slice(0, 120)
          : null,
      },
    });

    let award = null;
    if (created) {
      try {
        award = await gamificationEngine.awardPoints(clientId, 'recovery_activity', {
          idempotencyKey: `restore:${clientId}:${localDate}:${exerciseId}`,
          exerciseId,
          localDate,
        });
        await row.update({ xpAwarded: award?.pointsAwarded ?? 0 });
      } catch (awardError) {
        // XP failure must never lose the completion record.
        logger.error('recovery XP award failed', { message: awardError.message });
      }
    }

    return res.json({
      success: true,
      data: {
        exerciseId,
        localDate,
        alreadyCompleted: !created,
        xpAwarded: created ? (award?.pointsAwarded ?? 0) : 0,
        levelUp: Boolean(award?.levelUp),
      },
    });
  } catch (error) {
    if (error?.name === 'ClientTrainingDateError') {
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
    logger.error('recovery/complete failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Unable to record recovery activity' });
  }
});

export default router;
