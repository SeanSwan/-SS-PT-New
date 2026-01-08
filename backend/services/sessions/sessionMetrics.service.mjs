/**
 * Session Metrics Service
 * =======================
 * Small, focused service for trainer session metrics to avoid expanding
 * the monolithic unified session service.
 *
 * Blueprint Reference:
 * - docs/ai-workflow/PHASE-8-DASHBOARD-API-GAPS-BLUEPRINT.md
 *
 * Architecture Overview:
 * [Trainer Dashboard] -> [sessionMetricsRoutes] -> [sessionMetricsService] -> [Session model]
 *
 * Database ERD:
 * USERS (trainer) 1..* SESSIONS (trainerId)
 *
 * Mermaid Sequence:
 * sequenceDiagram
 *   participant Client
 *   participant Routes
 *   participant Service
 *   participant DB
 *   Client->>Routes: GET /api/sessions/trainer/:id/today
 *   Routes->>Service: getTrainerTodaySessions(trainerId, user)
 *   Service->>DB: COUNT sessions (today, trainerId)
 *   DB-->>Service: count
 *   Service-->>Routes: { success, data }
 *   Routes-->>Client: 200 OK
 *
 * Endpoints using this service:
 * - GET /api/sessions/trainer/:trainerId/today
 *
 * Security Model:
 * - trainerOrAdminOnly middleware
 * - Trainer ownership check (trainerId === req.user.id)
 *
 * Error Handling:
 * - Throws auth/validation errors for route to map to 403/400
 *
 * WHY:
 * - Keeps metrics logic isolated and avoids editing the 1900+ line unified service.
 *
 * Dependencies: Session model, sequelize Op, logger
 * Testing: See Phase 8 blueprint testing checklist
 */

import { Op } from 'sequelize';
import Session from '../../models/Session.mjs';
import redis from '../cache/redisWrapper.mjs';
import logger from '../../utils/logger.mjs';

const ALLOWED_STATUSES = ['scheduled', 'confirmed', 'completed'];
const CACHE_TTL_SECONDS = 60;

const normalizeTrainerId = (trainerId) => {
  const normalized = Number(trainerId);
  return Number.isFinite(normalized) ? normalized : null;
};

const getTrainerTodaySessions = async (trainerId, user) => {
  const normalizedTrainerId = normalizeTrainerId(trainerId);
  if (!normalizedTrainerId) {
    throw new Error('Invalid trainerId');
  }

  if (!user || (user.role !== 'admin' && user.role !== 'trainer')) {
    throw new Error('Trainer or admin privileges required');
  }

  if (user.role === 'trainer' && Number(user.id) !== normalizedTrainerId) {
    throw new Error('Trainers can only view their own sessions');
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const todayKey = startOfDay.toISOString().split('T')[0];
    const cacheKey = `trainer:todaySessions:${normalizedTrainerId}:${todayKey}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (cacheError) {
      logger.warn('[sessionMetricsService] Cache read failed', {
        error: cacheError.message,
        cacheKey
      });
    }

    const todaySessionCount = await Session.count({
      where: {
        trainerId: normalizedTrainerId,
        sessionDate: { [Op.between]: [startOfDay, endOfDay] },
        status: { [Op.in]: ALLOWED_STATUSES }
      }
    });

    const result = {
      success: true,
      data: {
        trainerId: normalizedTrainerId,
        todaySessionCount,
        date: new Date().toISOString().split('T')[0]
      }
    };
    try {
      await redis.set(cacheKey, JSON.stringify(result), CACHE_TTL_SECONDS);
    } catch (cacheError) {
      logger.warn('[sessionMetricsService] Cache write failed', {
        error: cacheError.message,
        cacheKey
      });
    }

    return result;
  } catch (error) {
    logger.error('[sessionMetricsService] Failed to get trainer today sessions', {
      error: error.message,
      trainerId: normalizedTrainerId,
      userId: user?.id
    });
    throw error;
  }
};

export default {
  getTrainerTodaySessions
};
