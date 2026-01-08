/**
 * Session Metrics Routes
 * ======================
 * Trainer-facing session metrics endpoints.
 *
 * Blueprint Reference:
 * - docs/ai-workflow/PHASE-8-DASHBOARD-API-GAPS-BLUEPRINT.md
 *
 * Architecture Overview:
 * [Trainer Dashboard] -> [sessionMetricsRoutes] -> [sessionMetricsService] -> [Session model]
 *
 * Middleware Flow:
 * Client -> protect -> trainerOrAdminOnly -> handler
 *
 * Endpoints:
 * - GET /api/sessions/trainer/:trainerId/today
 *
 * Mermaid Sequence (Today Sessions):
 * sequenceDiagram
 *   participant Client
 *   participant Routes
 *   participant Service
 *   participant DB
 *   Client->>Routes: GET /api/sessions/trainer/:id/today
 *   Routes->>Service: getTrainerTodaySessions
 *   Service->>DB: COUNT sessions
 *   DB-->>Service: count
 *   Service-->>Routes: { success, data }
 *   Routes-->>Client: 200 OK
 */

import express from 'express';
import { protect, trainerOrAdminOnly } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';
import sessionMetricsService from '../services/sessions/sessionMetrics.service.mjs';

const router = express.Router();

/**
 * GET /api/sessions/trainer/:trainerId/today
 * Get today's session count for a trainer
 */
router.get('/trainer/:trainerId/today', protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const result = await sessionMetricsService.getTrainerTodaySessions(req.params.trainerId, req.user);
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in GET /api/sessions/trainer/:trainerId/today', {
      error: error.message,
      trainerId: req.params.trainerId,
      userId: req.user?.id
    });

    if (error.message.includes('Invalid trainerId')) {
      return res.status(400).json({ success: false, message: 'Invalid trainerId' });
    }

    if (error.message.includes('Trainer or admin') || error.message.includes('Trainers can only view')) {
      return res.status(403).json({ success: false, message: error.message });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error fetching trainer today sessions',
      error: error.message
    });
  }
});

export default router;
