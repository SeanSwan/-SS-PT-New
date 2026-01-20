/**
 * Client Stats Routes
 * ===================
 * Provides lightweight client summary stats for dashboard cards.
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { ensureClientAccess } from '../utils/clientAccess.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * GET /api/stats/:userId/summary
 * Returns total workouts and optional wellness stats if available.
 */
router.get('/:userId/summary', protect, async (req, res) => {
  try {
    const access = await ensureClientAccess(req, req.params.userId);
    if (!access.allowed) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    const { clientId, models } = access;
    const { WorkoutSession, Session, ProgressReport } = models;

    let totalWorkouts = 0;

    if (WorkoutSession) {
      totalWorkouts += await WorkoutSession.count({ where: { userId: clientId } });
    }

    if (Session) {
      totalWorkouts += await Session.count({
        where: {
          userId: clientId,
          status: 'completed'
        }
      });
    }

    let sleepAvg = null;
    let goalConsistency = null;

    if (ProgressReport) {
      const latestReport = await ProgressReport.findOne({
        where: { userId: clientId },
        order: [['generatedAt', 'DESC']]
      });

      const summaryData = latestReport?.summaryData || {};

      if (typeof summaryData.sleepHoursAvg === 'number') {
        sleepAvg = summaryData.sleepHoursAvg;
      } else if (typeof summaryData.sleepAvg === 'number') {
        sleepAvg = summaryData.sleepAvg;
      }

      if (typeof summaryData.goalConsistency === 'number') {
        goalConsistency = summaryData.goalConsistency;
      } else if (typeof summaryData.compliance === 'number') {
        goalConsistency = summaryData.compliance;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalWorkouts,
        sleepAvg,
        goalConsistency
      }
    });
  } catch (error) {
    logger.error('Error fetching client stats summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching client stats summary',
      error: error.message
    });
  }
});

export default router;
