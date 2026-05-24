/**
 * sessions.mjs - Unified Session Routes (Phase 1: Backend Harmonization)
 * =====================================================================
 * Express routes for comprehensive session management using the unified service
 * 
 * ARCHITECTURAL TRANSFORMATION:
 * ✅ Direct service integration (no fragmented controllers)
 * ✅ Role-based middleware protection at route level
 * ✅ Transactional integrity through unified service
 * ✅ Consistent error handling and response formatting
 * ✅ Consolidated session lifecycle management
 * 
 * REPLACES:
 * - enhancedScheduleRoutes.mjs (Enhanced operations)
 * - scheduleRoutes.mjs (Basic operations)
 * 
 * CONSOLIDATES ENDPOINTS:
 * - Session CRUD operations
 * - Session booking and lifecycle management
 * - Session allocation from orders
 * - Statistics and reporting
 * - User management (trainers/clients)
 */

import express from "express";
import { protect, adminOnly, trainerOrAdminOnly } from "../middleware/authMiddleware.mjs";
import unifiedSessionService from "../services/sessions/session.service.mjs";
import ConflictService from "../services/conflictService.mjs";
import trainerAssignmentService from "../services/TrainerAssignmentService.mjs";
import Session from "../models/Session.mjs";
import User from "../models/User.mjs";
import { getOrder, getOrderItem, getStorefrontItem } from "../models/index.mjs";
import logger from '../utils/logger.mjs';
import { createNotification } from '../controllers/notificationController.mjs';
import { getClientPackagePricing, computeCancellationCharge } from '../utils/cancellationPricing.mjs';
import realTimeScheduleService from '../services/realTimeScheduleService.mjs';

const router = express.Router();
const MAX_MANUAL_SESSION_ADD = 50;

const parsePositiveInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseStrictPositiveInteger = (value) => {
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseBoundedPositiveInteger = (value, max) => {
  const parsed = parseStrictPositiveInteger(value);
  return parsed && parsed <= max ? parsed : null;
};

const parseNonNegativeInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

const canAccessSessionRecord = (user, session, { allowClient = true, allowTrainer = true } = {}) => {
  if (!user || !session) return false;
  if (user.role === 'admin') return true;

  const requesterId = Number(user.id);
  if (!Number.isInteger(requesterId)) return false;

  if (allowClient && user.role === 'client' && Number(session.userId) === requesterId) {
    return true;
  }

  if (allowTrainer && user.role === 'trainer' && Number(session.trainerId) === requesterId) {
    return true;
  }

  return false;
};

const parseMoneyAmount = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : null;
};

const cancellationPricingModels = () => ({
  Order: getOrder(),
  OrderItem: getOrderItem(),
  StorefrontItem: getStorefrontItem()
});

const getSessionPackagePricing = async (session) => {
  const fallbackPrice = Number(session.duration || 60) >= 60 ? 175 : 110;

  if (!session.userId) {
    return {
      pricePerSession: null,
      packageName: null,
      fallbackPrice,
      defaultChargeAmount: fallbackPrice,
      lateFeeAmount: Math.round(fallbackPrice * 0.5),
      isFallback: true
    };
  }

  const packageInfo = await getClientPackagePricing(session.userId, cancellationPricingModels());
  const pricePerSession = parseMoneyAmount(packageInfo.pricePerSession);
  const defaultChargeAmount = pricePerSession ?? fallbackPrice;

  return {
    ...packageInfo,
    pricePerSession,
    packageName: packageInfo.packageName || null,
    fallbackPrice,
    defaultChargeAmount,
    lateFeeAmount: Math.round(defaultChargeAmount * 0.5),
    isFallback: Boolean(packageInfo.isFallback)
  };
};

// ==================== CORE SESSION CRUD OPERATIONS ====================

/**
 * GET /api/sessions
 * Get all sessions with role-based filtering
 */
router.get("/", protect, async (req, res) => {
  try {
    const sessions = await unifiedSessionService.getAllSessions(req.query, req.user);
    
    return res.status(200).json(sessions);
  } catch (error) {
    logger.error('Error in GET /api/sessions:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching sessions',
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/stats
 * Get schedule statistics with role-based data
 */
router.get("/stats", protect, async (req, res) => {
  try {
    const result = await unifiedSessionService.getScheduleStats(req.user);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in GET /api/sessions/stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching statistics',
      error: error.message
    });
  }
});

/**
 * POST /api/sessions/check-conflicts
 * Check conflicts for a proposed session time (trainer/admin only)
 */
router.post("/check-conflicts", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { startTime, endTime, trainerId, clientId, excludeSessionId } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'startTime and endTime are required'
      });
    }

    const conflicts = await ConflictService.checkConflicts({
      startTime,
      endTime,
      trainerId,
      clientId,
      excludeSessionId
    });

    const hasHardConflicts = conflicts.some((conflict) => conflict.type === 'hard');
    const duration = Math.max(0, (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000);
    const alternatives = hasHardConflicts
      ? await ConflictService.findAlternatives({
          date: startTime,
          trainerId,
          duration: duration || 60
        })
      : [];

    return res.status(200).json({
      success: true,
      hasConflicts: conflicts.length > 0,
      hasHardConflicts,
      conflicts,
      alternatives
    });
  } catch (error) {
    logger.error('Error in POST /api/sessions/check-conflicts:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error checking conflicts',
      error: error.message
    });
  }
});

// ==================== USER ANALYTICS (MUST BE BEFORE /:id ROUTE) ====================

/**
 * GET /api/sessions/analytics
 * Get session analytics for the current user
 * NOTE: This route MUST be defined before /:id to avoid "analytics" being parsed as an ID
 */
router.get("/analytics", protect, async (req, res) => {
  try {
    const userId = req.user?.id;

    // Return empty analytics if no user ID (graceful degradation)
    if (!userId) {
      logger.warn('[Analytics] No user ID found in request, returning empty analytics', {
        hasUser: !!req.user,
        userKeys: req.user ? Object.keys(req.user) : []
      });
      return res.status(200).json({
        success: true,
        totalSessions: 0,
        totalDuration: 0,
        averageDuration: 0,
        caloriesBurned: 0,
        favoriteExercises: [],
        weeklyProgress: [],
        currentStreak: 0,
        longestStreak: 0
      });
    }

    // Get all completed sessions for the user
    const userSessions = await Session.findAll({
      where: {
        userId,
        status: 'completed'
      },
      order: [['sessionDate', 'DESC']]
    });

    if (!userSessions || userSessions.length === 0) {
      return res.status(200).json({
        success: true,
        totalSessions: 0,
        totalDuration: 0,
        averageDuration: 0,
        caloriesBurned: 0,
        favoriteExercises: [],
        weeklyProgress: [],
        currentStreak: 0,
        longestStreak: 0
      });
    }

    // Calculate basic analytics
    const totalSessions = userSessions.length;
    const totalDuration = userSessions.reduce((sum, session) => {
      return sum + (session.duration || 0);
    }, 0);

    const averageDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0;

    // Calculate weekly progress (last 12 weeks)
    const weeklyProgress = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekSessions = userSessions.filter(session => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      });

      const weekDuration = weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

      weeklyProgress.push({
        week: weekStart.toISOString().split('T')[0],
        sessionsCompleted: weekSessions.length,
        totalDuration: weekDuration,
        caloriesBurned: weekSessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0)
      });
    }

    // Calculate current streak (consecutive days with sessions)
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);

      const hasSession = userSessions.some(session => {
        const sessionDate = new Date(session.sessionDate);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === checkDate.getTime();
      });

      if (hasSession) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = [...new Set(userSessions.map(s => {
      const d = new Date(s.sessionDate);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }))].sort((a, b) => a - b);

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return res.status(200).json({
      success: true,
      totalSessions,
      totalDuration,
      averageDuration,
      caloriesBurned: userSessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0),
      favoriteExercises: [], // TODO: Implement when exercise tracking is added
      weeklyProgress,
      currentStreak,
      longestStreak
    });
  } catch (error) {
    logger.error('Error in GET /api/sessions/analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching analytics',
      error: error.message
    });
  }
});

/**
 * POST /api/sessions/assign-trainer
 * Backward-compatible endpoint used by admin sessions clients.
 */
router.post('/assign-trainer', protect, adminOnly, async (req, res) => {
  try {
    const { trainerId, clientId, sessionIds = [] } = req.body || {};

    if (!trainerId || !clientId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID and Client ID are required'
      });
    }

    const result = await trainerAssignmentService.assignTrainerToClient(
      trainerId,
      clientId,
      Array.isArray(sessionIds) ? sessionIds : [],
      req.user.id
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Error in POST /api/sessions/assign-trainer:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to assign trainer'
    });
  }
});

/**
 * GET /api/sessions/assignment-statistics
 * Must be defined before /:id route to prevent path collision.
 */
router.get('/assignment-statistics', protect, adminOnly, async (req, res) => {
  try {
    const statistics = await trainerAssignmentService.getAssignmentStatistics();
    return res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Error in GET /api/sessions/assignment-statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment statistics',
      degraded: true
    });
  }
});

/**
 * GET /api/sessions/trainer-assignment-health
 * Must be defined before /:id route to prevent path collision.
 */
router.get('/trainer-assignment-health', protect, adminOnly, async (req, res) => {
  try {
    const health = await trainerAssignmentService.healthCheck();
    return res.status(200).json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error in GET /api/sessions/trainer-assignment-health:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get trainer assignment health'
    });
  }
});

// ==================== UPCOMING & HISTORY (MUST BE BEFORE /:id ROUTE) ====================

/**
 * GET /api/sessions/upcoming/:userId
 * Get upcoming sessions for a user (sessions with sessionDate > now)
 * Auth: user can only access own sessions; trainers can access their clients; admins can access all
 */
router.get("/upcoming/:userId", protect, async (req, res) => {
  try {
    const targetUserId = parseStrictPositiveInteger(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // IDOR protection:
    // - Admin: full access to any user's sessions
    // - Trainer: only sessions where THEY are the trainer for the target user
    // - Client: only their own sessions
    const requesterId = Number(req.user.id);
    const role = req.user.role;
    if (role !== 'admin' && role !== 'trainer' && requesterId !== targetUserId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these sessions' });
    }

    const limit = parseBoundedPositiveInteger(req.query.limit, 50) || 10;
    const now = new Date();
    const { Op } = Session.sequelize.Sequelize;

    // Build ownership-scoped where clause
    const ownershipFilter = role === 'admin'
      ? { [Op.or]: [{ userId: targetUserId }, { trainerId: targetUserId }] }
      : role === 'trainer'
        ? { userId: targetUserId, trainerId: requesterId } // Trainer only sees their own clients
        : { [Op.or]: [{ userId: targetUserId }, { trainerId: targetUserId }] }; // Own sessions

    const sessions = await Session.findAll({
      where: {
        ...ownershipFilter,
        sessionDate: { [Op.gt]: now },
        status: { [Op.notIn]: ['cancelled', 'blocked'] }
      },
      order: [['sessionDate', 'ASC']],
      limit
    });

    // Return raw array to match frontend caller expectations (MyClientsView, sessionService)
    return res.status(200).json(sessions);
  } catch (error) {
    logger.error('Error in GET /api/sessions/upcoming/:userId:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching upcoming sessions',
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/history/:userId
 * Get past sessions for a user (sessions with sessionDate <= now)
 * Auth: user can only access own sessions; trainers see only their clients; admins can access all
 */
router.get("/history/:userId", protect, async (req, res) => {
  try {
    const targetUserId = parseStrictPositiveInteger(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    // IDOR protection:
    // - Admin: full access to any user's sessions
    // - Trainer: only sessions where THEY are the trainer for the target user
    // - Client: only their own sessions
    const requesterId = Number(req.user.id);
    const role = req.user.role;
    if (role !== 'admin' && role !== 'trainer' && requesterId !== targetUserId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these sessions' });
    }

    const limit = parseBoundedPositiveInteger(req.query.limit, 50) || 10;
    const now = new Date();
    const { Op } = Session.sequelize.Sequelize;

    // Build ownership-scoped where clause
    const ownershipFilter = role === 'admin'
      ? { [Op.or]: [{ userId: targetUserId }, { trainerId: targetUserId }] }
      : role === 'trainer'
        ? { userId: targetUserId, trainerId: requesterId } // Trainer only sees their own clients
        : { [Op.or]: [{ userId: targetUserId }, { trainerId: targetUserId }] }; // Own sessions

    const sessions = await Session.findAll({
      where: {
        ...ownershipFilter,
        sessionDate: { [Op.lte]: now }
      },
      order: [['sessionDate', 'DESC']],
      limit
    });

    // Return raw array to match frontend caller expectations (MyClientsView, sessionService)
    return res.status(200).json(sessions);
  } catch (error) {
    logger.error('Error in GET /api/sessions/history/:userId:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching session history',
      error: error.message
    });
  }
});

// ==================== SESSION ALLOCATION COMPATIBILITY ENDPOINTS ====================

/**
 * POST /api/sessions/allocate-from-order
 * Compatibility alias for legacy admin allocation callers.
 */
router.post("/allocate-from-order", protect, adminOnly, async (req, res) => {
  try {
    const { orderId, userId } = req.body;

    if (!orderId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and User ID are required'
      });
    }

    const result = await unifiedSessionService.allocateSessionsFromOrder(orderId, userId);

    return res.status(200).json({
      success: true,
      message: result.message || 'Sessions allocated from order',
      data: result
    });
  } catch (error) {
    logger.error('Error in POST /api/sessions/allocate-from-order:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to allocate sessions from order'
    });
  }
});

/**
 * POST /api/sessions/add-to-user
 * Compatibility endpoint used by the canonical admin allocation UI.
 */
router.post("/add-to-user", protect, adminOnly, async (req, res) => {
  try {
    const userId = parsePositiveInteger(req.body.userId);
    const rawSessionCount = parseStrictPositiveInteger(req.body.sessionCount);
    const sessionCount = parseBoundedPositiveInteger(req.body.sessionCount, MAX_MANUAL_SESSION_ADD);
    const reason = typeof req.body.reason === 'string' && req.body.reason.trim()
      ? req.body.reason.trim()
      : 'Manually added by admin';

    if (!userId || !rawSessionCount) {
      return res.status(400).json({
        success: false,
        message: 'User ID and positive session count are required'
      });
    }

    if (!sessionCount) {
      return res.status(400).json({
        success: false,
        message: `Session count must be between 1 and ${MAX_MANUAL_SESSION_ADD}`
      });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'firstName', 'lastName', 'availableSessions']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User ${userId} not found`
      });
    }

    await user.increment('availableSessions', { by: sessionCount });
    if (typeof user.reload === 'function') {
      await user.reload();
    }

    const availableSessions = Number(user.availableSessions || 0);

    try {
      await realTimeScheduleService.broadcastAllocationUpdated({
        userId,
        sessionsAdded: sessionCount,
        sessionsRemaining: availableSessions,
        packageType: 'Manual Addition',
        reason,
        allocatedBy: req.user.id
      });
    } catch (broadcastError) {
      logger.warn('Failed to broadcast manual allocation update:', broadcastError.message);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully added ${sessionCount} sessions`,
      data: {
        userId,
        added: sessionCount,
        availableSessions,
        totalSessionsRemaining: availableSessions,
        reason,
        allocatedBy: req.user.id
      }
    });
  } catch (error) {
    logger.error('Error in POST /api/sessions/add-to-user:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to add sessions'
    });
  }
});

/**
 * GET /api/sessions/user-summary/:userId
 * Compatibility endpoint used by the canonical admin allocation UI.
 */
router.get("/user-summary/:userId", protect, adminOnly, async (req, res) => {
  try {
    const userId = parsePositiveInteger(req.params.userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID is required'
      });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'availableSessions']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User ${userId} not found`
      });
    }

    const [scheduled, completed, cancelled] = await Promise.all([
      Session.count({ where: { userId, status: ['assigned', 'scheduled', 'confirmed'] } }),
      Session.count({ where: { userId, status: 'completed' } }),
      Session.count({ where: { userId, status: 'cancelled' } })
    ]);

    const available = Number(user.availableSessions || 0);

    return res.status(200).json({
      success: true,
      data: {
        userId,
        available,
        scheduled,
        completed,
        cancelled,
        total: available + scheduled + completed + cancelled
      }
    });
  } catch (error) {
    logger.error('Error in GET /api/sessions/user-summary/:userId:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get session summary'
    });
  }
});

/**
 * GET /api/sessions/allocation-health
 * Lightweight compatibility health check for legacy allocation callers.
 */
router.get("/allocation-health", protect, adminOnly, async (_req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      service: 'unified-sessions-allocation-compatibility',
      timestamp: new Date().toISOString()
    }
  });
});

/**
 * GET /api/sessions/health
 * Health check for the unified session service.
 */
router.get("/health", async (_req, res) => {
  try {
    const health = await unifiedSessionService.healthCheck();

    return res.status(200).json({
      status: health.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error in GET /api/sessions/health:', error);
    return res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/sessions/admin/cancelled
 * Admin review queue for cancelled sessions and cancellation billing decisions.
 */
router.get("/admin/cancelled", protect, adminOnly, async (req, res) => {
  try {
    const { Op } = Session.sequelize.Sequelize;
    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      chargeStatus,
      decisionStatus = 'all'
    } = req.query;
    const allowedDecisionStatuses = new Set(['all', 'pending', 'charged', 'waived']);

    if (!allowedDecisionStatuses.has(decisionStatus)) {
      return res.status(400).json({
        success: false,
        message: 'decisionStatus must be one of: all, pending, charged, waived'
      });
    }

    const whereClause = { status: 'cancelled' };
    if (startDate && endDate) {
      const parsedStart = new Date(startDate);
      const parsedEnd = new Date(endDate);
      if (!Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime())) {
        whereClause.cancellationDate = { [Op.between]: [parsedStart, parsedEnd] };
      }
    }

    if (decisionStatus !== 'all') {
      whereClause.cancellationDecision = decisionStatus;
    } else if (chargeStatus === 'charged') {
      whereClause.cancellationChargedAt = { [Op.ne]: null };
    } else if (chargeStatus === 'uncharged') {
      whereClause.cancellationChargedAt = null;
    }

    const limitValue = Math.min(parsePositiveInteger(limit) ?? 50, 100);
    const offsetValue = parseNonNegativeInteger(offset);
    const { count, rows: cancelledSessions } = await Session.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          required: false
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ],
      order: [['cancellationDate', 'DESC']],
      limit: limitValue,
      offset: offsetValue
    });

    const processedSessions = cancelledSessions.map((session) => {
      const sessionData = session.toJSON();
      const sessionTime = new Date(sessionData.sessionDate);
      const cancellationTime = new Date(sessionData.cancellationDate || sessionData.updatedAt || sessionData.sessionDate);
      const rawHoursUntilSession = (sessionTime.getTime() - cancellationTime.getTime()) / (1000 * 60 * 60);
      const hasValidCancellationWindow = Number.isFinite(rawHoursUntilSession);
      const hoursUntilSession = hasValidCancellationWindow
        ? Math.max(0, Math.round(rawHoursUntilSession * 10) / 10)
        : 0;
      const isLateCancellation = hasValidCancellationWindow && rawHoursUntilSession < 24 && rawHoursUntilSession >= 0;
      const cancellationDecision = sessionData.cancellationDecision || (isLateCancellation ? 'pending' : null);

      return {
        ...sessionData,
        isLateCancellation,
        hoursUntilSession,
        chargePending: isLateCancellation && (!sessionData.cancellationDecision || sessionData.cancellationDecision === 'pending'),
        cancellationDecision,
        decision: cancellationDecision || 'pending',
        reviewReason: sessionData.cancellationReviewReason,
        reviewerInfo: sessionData.reviewer
          ? {
              id: sessionData.reviewer.id,
              firstName: sessionData.reviewer.firstName,
              lastName: sessionData.reviewer.lastName,
              reviewedAt: sessionData.cancellationReviewedAt
            }
          : null,
        clientName: sessionData.client
          ? `${sessionData.client.firstName || ''} ${sessionData.client.lastName || ''}`.trim()
          : 'Unknown Client',
        trainerName: sessionData.trainer
          ? `${sessionData.trainer.firstName || ''} ${sessionData.trainer.lastName || ''}`.trim()
          : 'Unassigned'
      };
    });

    return res.status(200).json({
      success: true,
      data: processedSessions,
      pagination: {
        total: count,
        limit: limitValue,
        offset: offsetValue,
        hasMore: offsetValue + processedSessions.length < count
      },
      stats: {
        pending: processedSessions.filter(session => session.cancellationDecision === 'pending').length,
        charged: processedSessions.filter(session => session.cancellationDecision === 'charged').length,
        waived: processedSessions.filter(session => session.cancellationDecision === 'waived').length
      }
    });
  } catch (error) {
    logger.error('Error in GET /api/sessions/admin/cancelled:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching cancelled sessions',
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/:id
 * Get a single session by ID with role-based access control
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    if (Number.isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session id'
      });
    }

    const session = await unifiedSessionService.getSessionById(sessionId, req.user);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    logger.error(`Error in GET /api/sessions/${req.params.id}:`, error);
    
    // Handle permission errors
    if (error.message.includes('permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error fetching session',
      error: error.message
    });
  }
});

// ==================== SESSION CREATION (ADMIN ONLY) ====================

/**
 * POST /api/sessions
 * Create available session slots (admin only)
 */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { sessions } = req.body;
    
    if (!sessions) {
      return res.status(400).json({
        success: false,
        message: 'Sessions array is required in request body'
      });
    }
    
    const createdSessions = await unifiedSessionService.createAvailableSessions(sessions, req.user);
    
    return res.status(201).json({
      success: true,
      message: `Successfully created ${createdSessions.length} available session slots`,
      sessions: createdSessions
    });
  } catch (error) {
    logger.error('Error in POST /api/sessions:', error);
    const rawMessage = typeof error === 'string' ? error : (error?.message || '');
    const normalizedMessage = rawMessage.toLowerCase();
    
    // Handle validation errors
    if (normalizedMessage.includes('admin privileges required') || normalizedMessage.includes('invalid request')) {
      return res.status(403).json({
        success: false,
        message: rawMessage
      });
    }
    
    if (
      normalizedMessage.includes('must include') ||
      normalizedMessage.includes('cannot create') ||
      normalizedMessage.includes('invalid') ||
      normalizedMessage.includes('missing required')
    ) {
      return res.status(400).json({
        success: false,
        message: rawMessage
      });
    }

    if (normalizedMessage.includes('model unavailable') || normalizedMessage.includes('models cache')) {
      return res.status(503).json({
        success: false,
        message: 'Session service is still initializing. Please retry in a few seconds.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error creating sessions',
      error: error.message
    });
  }
});

/**
 * POST /api/sessions/recurring
 * Create recurring sessions (admin only)
 */
router.post("/recurring", protect, adminOnly, async (req, res) => {
  try {
    const result = await unifiedSessionService.createRecurringSessions(req.body, req.user);
    
    return res.status(201).json(result);
  } catch (error) {
    logger.error('Error in POST /api/sessions/recurring:', error);
    const rawMessage = typeof error === 'string' ? error : (error?.message || '');
    const normalizedMessage = rawMessage.toLowerCase();
    const responseMessage = rawMessage || 'Request validation failed';
    
    // Handle validation errors
    if (normalizedMessage.includes('admin privileges required')) {
      return res.status(403).json({
        success: false,
        message: responseMessage
      });
    }
    
    if (normalizedMessage.includes('missing required') || normalizedMessage.includes('must be') || 
        normalizedMessage.includes('invalid') || normalizedMessage.includes('no valid') ||
        normalizedMessage.includes('exceeds')) {
      return res.status(400).json({
        success: false,
        message: responseMessage
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error creating recurring sessions',
      error: responseMessage || 'Unknown error'
    });
  }
});

/**
 * PUT /api/sessions/recurring/:groupId
 * Update all future sessions in a recurring series (admin only)
 */
router.put("/recurring/:groupId", protect, adminOnly, async (req, res) => {
  try {
    const result = await unifiedSessionService.updateRecurringSeries(req.params.groupId, req.user, req.body);
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in PUT /api/sessions/recurring/:groupId:', error);
    const rawMessage = typeof error === 'string' ? error : (error?.message || '');
    const normalizedMessage = rawMessage.toLowerCase();

    if (normalizedMessage.includes('admin privileges')) {
      return res.status(403).json({ success: false, message: rawMessage || 'Admin privileges required' });
    }

    if (normalizedMessage.includes('not found') || normalizedMessage.includes('no future sessions')) {
      return res.status(404).json({ success: false, message: rawMessage || 'Recurring series not found' });
    }

    if (normalizedMessage.includes('invalid') || normalizedMessage.includes('missing') || normalizedMessage.includes('must')) {
      return res.status(400).json({ success: false, message: rawMessage || 'Invalid request' });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error updating recurring series',
      error: rawMessage || 'Unknown error'
    });
  }
});

/**
 * DELETE /api/sessions/recurring/:groupId
 * Cancel all future sessions in a recurring series (admin only)
 */
router.delete("/recurring/:groupId", protect, adminOnly, async (req, res) => {
  try {
    const deleteAll = req.query.deleteAll === 'true' || req.query.deleteAll === true;
    const result = await unifiedSessionService.deleteRecurringSeries(req.params.groupId, req.user, { deleteAll });
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in DELETE /api/sessions/recurring/:groupId:', error);
    const rawMessage = typeof error === 'string' ? error : (error?.message || '');
    const normalizedMessage = rawMessage.toLowerCase();

    if (normalizedMessage.includes('admin privileges')) {
      return res.status(403).json({ success: false, message: rawMessage || 'Admin privileges required' });
    }

    if (normalizedMessage.includes('not found') || normalizedMessage.includes('no future sessions')) {
      return res.status(404).json({ success: false, message: rawMessage || 'Recurring series not found' });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error cancelling recurring series',
      error: rawMessage || 'Unknown error'
    });
  }
});

/**
 * POST /api/sessions/block
 * Block time slots (admin or trainer)
 */
router.post("/block", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const result = await unifiedSessionService.createBlockedSessions(req.body, req.user);
    return res.status(201).json(result);
  } catch (error) {
    logger.error('Error in POST /api/sessions/block:', error);
    const rawMessage = typeof error === 'string' ? error : (error?.message || '');
    const normalizedMessage = rawMessage.toLowerCase();
    const responseMessage = rawMessage || 'Request validation failed';

    if (normalizedMessage.includes('admin or trainer')) {
      return res.status(403).json({
        success: false,
        message: responseMessage
      });
    }

    if (normalizedMessage.includes('missing required') || normalizedMessage.includes('invalid') ||
        normalizedMessage.includes('no valid') || normalizedMessage.includes('exceeds')) {
      return res.status(400).json({
        success: false,
        message: responseMessage
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error blocking time',
      error: responseMessage || 'Unknown error'
    });
  }
});

/**
 * PUT /api/sessions/:id/reschedule
 * Reschedule a session (trainer/admin only)
 */
router.put("/:id/reschedule", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const sessionId = Number(req.params.id);
    if (Number.isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session id'
      });
    }

    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const { newStartTime, newEndTime, trainerId, notifyClient, conflictOverride } = req.body;
    if (!newStartTime) {
      return res.status(400).json({
        success: false,
        message: 'newStartTime is required'
      });
    }

    const startTime = new Date(newStartTime);
    if (Number.isNaN(startTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid newStartTime'
      });
    }

    const duration = session.duration || 60;
    const endTime = newEndTime
      ? new Date(newEndTime)
      : new Date(startTime.getTime() + duration * 60000);

    if (Number.isNaN(endTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid newEndTime'
      });
    }

    const resolvedTrainerId = trainerId ?? session.trainerId ?? null;

    const conflicts = await ConflictService.checkConflicts({
      startTime,
      endTime,
      trainerId: resolvedTrainerId,
      clientId: session.userId ?? null,
      excludeSessionId: sessionId
    });

    const hasHardConflicts = conflicts.some((conflict) => conflict.type === 'hard');
    const allowOverride = conflictOverride === true && req.user.role === 'admin';

    if (hasHardConflicts && !allowOverride) {
      const alternatives = await ConflictService.findAlternatives({
        date: startTime,
        trainerId: resolvedTrainerId,
        duration
      });
      return res.status(409).json({
        success: false,
        message: 'Scheduling conflict detected',
        conflicts,
        alternatives
      });
    }

    await session.update({
      sessionDate: startTime,
      trainerId: resolvedTrainerId,
      notifyClient: typeof notifyClient === 'boolean' ? notifyClient : session.notifyClient
    });

    // Create in-app notification for client if session is assigned and notifyClient is not false
    const resolvedNotifyClient = typeof notifyClient === 'boolean' ? notifyClient : session.notifyClient;
    if (session.userId && resolvedNotifyClient !== false) {
      createNotification({
        userId: session.userId,
        title: 'Session Rescheduled',
        message: `Your training session has been moved to ${new Date(startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
        type: 'session',
        link: '/schedule',
        senderId: req.user.id
      }).catch(err => logger.warn('[SessionNotify] Reschedule notification failed:', err.message));
    }

    const updatedSession = await unifiedSessionService.getSessionById(sessionId, req.user);

    return res.status(200).json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    logger.error(`Error in PUT /api/sessions/${req.params.id}/reschedule:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error rescheduling session',
      error: error.message
    });
  }
});

// ==================== SESSION LIFECYCLE MANAGEMENT ====================

/**
 * POST /api/sessions/:id/book
 * Book an available session
 */
  router.post("/:id/book", protect, async (req, res) => {
    try {
      const result = await unifiedSessionService.bookSession(req.params.id, req.user, req.body);
      
      return res.status(200).json(result);
    } catch (error) {
      logger.error(`Error in POST /api/sessions/${req.params.id}/book:`, error);
      const rawMessage = typeof error === 'string' ? error : (error?.message || '');
      const normalizedMessage = rawMessage.toLowerCase();
      const responseMessage = rawMessage || 'Request validation failed';

      // Handle booking-specific errors
      if (normalizedMessage.includes('permission') || normalizedMessage.includes('privileges')) {
        return res.status(403).json({
          success: false,
          message: responseMessage
        });
      }

      if (normalizedMessage.includes('not available') ||
          normalizedMessage.includes('in the past') ||
          normalizedMessage.includes('not found') ||
          normalizedMessage.includes('insufficient') ||
          normalizedMessage.includes('credit') ||
          normalizedMessage.includes('double-booking') ||
          normalizedMessage.includes('conflict')) {
        return res.status(400).json({
          success: false,
          message: responseMessage
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Server error booking session',
        error: responseMessage
      });
    }
  });

/**
 * PATCH /api/sessions/:id/cancel
 * Cancel a session
 */
router.patch("/:id/cancel", protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await unifiedSessionService.cancelSession(req.params.id, req.user, reason);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in PATCH /api/sessions/${req.params.id}/cancel:`, error);
    
    // Handle cancellation-specific errors
    if (error.message.includes('permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error cancelling session',
      error: error.message
    });
  }
});

/**
 * PATCH /api/sessions/:id/confirm
 * Confirm a session (admin/trainer only)
 */
router.patch("/:id/confirm", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const result = await unifiedSessionService.confirmSession(req.params.id, req.user);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in PATCH /api/sessions/${req.params.id}/confirm:`, error);
    
    // Handle confirmation-specific errors
    if (error.message.includes('privileges required') || error.message.includes('can only confirm')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Only scheduled')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error confirming session',
      error: error.message
    });
  }
});

/**
 * PATCH /api/sessions/:id/complete
 * Mark a session as completed (admin/trainer only)
 */
router.patch("/:id/complete", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const { notes, trainerRating, clientFeedback, actualDuration } = req.body;
    const result = await unifiedSessionService.completeSession(req.params.id, req.user, {
      notes,
      trainerRating,
      clientFeedback,
      actualDuration
    });
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in PATCH /api/sessions/${req.params.id}/complete:`, error);
    
    // Handle completion-specific errors
    if (error.message.includes('privileges required') || error.message.includes('can only complete')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    const rawMessage = typeof error === 'string' ? error : (error?.message || '');
    const normalizedMessage = rawMessage.toLowerCase();
    if (normalizedMessage.includes('only confirmed') || normalizedMessage.includes('only scheduled')) {
      return res.status(400).json({
        success: false,
        message: rawMessage || error.message
      });
    }

    if (normalizedMessage.includes('invalid')) {
      return res.status(400).json({
        success: false,
        message: rawMessage || error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error completing session',
      error: error.message
    });
  }
});

/**
 * PATCH /api/sessions/:id/assign
 * Assign a trainer to a session (admin only)
 */
router.patch("/:id/assign", protect, adminOnly, async (req, res) => {
  try {
    const { trainerId } = req.body;
    
    if (!trainerId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID is required'
      });
    }
    
    const result = await unifiedSessionService.assignTrainer(req.params.id, trainerId, req.user);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in PATCH /api/sessions/${req.params.id}/assign:`, error);
    
    // Handle assignment-specific errors
    if (error.message.includes('Admin privileges required')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('required')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error assigning trainer',
      error: error.message
    });
  }
});

// ==================== SESSION ALLOCATION FROM ORDERS ====================

/**
 * POST /api/sessions/allocate
 * Allocate sessions from completed order (admin only for manual allocation)
 */
router.post("/allocate", protect, adminOnly, async (req, res) => {
  try {
    const { orderId, userId } = req.body;
    
    if (!orderId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and User ID are required'
      });
    }
    
    const result = await unifiedSessionService.allocateSessionsFromOrder(orderId, userId);
    
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error in POST /api/sessions/allocate:', error);
    
    if (error.message.includes('not found') || error.message.includes('not completed')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error allocating sessions',
      error: error.message
    });
  }
});

// ==================== USER MANAGEMENT FOR DROPDOWNS ====================

/**
 * GET /api/sessions/users/trainers
 * Get all trainers for dropdown selection
 */
router.get("/users/trainers", protect, async (req, res) => {
  try {
    const trainers = await unifiedSessionService.getTrainers();
    
    return res.status(200).json(trainers);
  } catch (error) {
    logger.error('Error in GET /api/sessions/users/trainers:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching trainers',
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/users/clients
 * Get all clients for dropdown selection (admin/trainer only)
 */
router.get("/users/clients", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const clients = await unifiedSessionService.getClients(req.user);
    
    return res.status(200).json(clients);
  } catch (error) {
    logger.error('Error in GET /api/sessions/users/clients:', error);
    
    if (error.message.includes('privileges required')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error fetching clients',
      error: error.message
    });
  }
});

// ==================== ATTENDANCE & FEEDBACK ====================

/**
 * PATCH /api/sessions/:id/attendance
 * Record attendance for a session (admin/trainer only)
 */
router.patch("/:id/attendance", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const sessionId = parseStrictPositiveInteger(req.params.id);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session ID' });
    }

    const { attendanceStatus, noShowReason, notes } = req.body;

    if (!['present', 'late', 'no_show'].includes(attendanceStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance status. Must be: present, late, or no_show'
      });
    }

    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!canAccessSessionRecord(req.user, session, { allowClient: false, allowTrainer: true })) {
      return res.status(403).json({ success: false, message: 'Not authorized to record attendance for this session' });
    }

    const updates = {
      attendanceStatus,
      attendanceRecordedAt: new Date(),
      ...(attendanceStatus === 'present' && { checkInTime: new Date() }),
      ...(attendanceStatus === 'no_show' && noShowReason && { noShowReason }),
      ...(notes && { notes })
    };

    await session.update(updates);

    return res.status(200).json({
      success: true,
      message: `Attendance recorded: ${attendanceStatus}`,
      data: session
    });
  } catch (error) {
    logger.error(`Error in PATCH /api/sessions/${req.params.id}/attendance:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error recording attendance',
      error: error.message
    });
  }
});

/**
 * POST /api/sessions/:id/feedback
 * Client submits feedback for a completed session
 */
router.post("/:id/feedback", protect, async (req, res) => {
  try {
    const sessionId = parseStrictPositiveInteger(req.params.id);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session ID' });
    }

    const rating = parseBoundedPositiveInteger(req.body.rating, 5);
    const { comment } = req.body;

    if (!rating) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Only the client assigned to this session can leave feedback
    if (!canAccessSessionRecord(req.user, session, { allowClient: true, allowTrainer: false })) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned client or an admin can submit feedback'
      });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Feedback can only be submitted for completed sessions'
      });
    }

    await session.update({
      rating,
      feedback: comment || null,
      feedbackProvided: true
    });

    return res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: { rating, feedback: comment || null }
    });
  } catch (error) {
    logger.error(`Error in POST /api/sessions/${req.params.id}/feedback:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error submitting feedback',
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/:id/cancel-warning
 * Check late cancellation policy before cancelling
 */
router.get("/:id/cancel-warning", protect, async (req, res) => {
  try {
    const sessionId = parseStrictPositiveInteger(req.params.id);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session ID' });
    }

    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!canAccessSessionRecord(req.user, session, { allowClient: true, allowTrainer: true })) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this session' });
    }

    const sessionDate = new Date(session.sessionDate);
    const now = new Date();
    const hoursUntilSession = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isLateCancellation = hoursUntilSession < 24;

    // Default cancellation policy
    const cancellationPolicy = {
      lateFeeAmount: 88,
      creditRestored: !isLateCancellation,
      lateThresholdHours: 24
    };

    return res.status(200).json({
      success: true,
      isLateCancellation,
      hoursUntilSession: Math.max(0, Math.round(hoursUntilSession * 10) / 10),
      cancellationPolicy,
      warningMessage: isLateCancellation
        ? `This is a late cancellation (less than 24 hours notice). A fee of $${cancellationPolicy.lateFeeAmount} may apply.`
        : 'You are cancelling with more than 24 hours notice. No fee will be charged.',
      sessionDateFormatted: sessionDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
      })
    });
  } catch (error) {
    logger.error(`Error in GET /api/sessions/${req.params.id}/cancel-warning:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error checking cancellation policy',
      error: error.message
    });
  }
});

/**
 * GET /api/sessions/:id/client-package-price
 * Get client's package price for a session (admin/trainer only)
 */
router.get("/:id/client-package-price", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const sessionId = parseStrictPositiveInteger(req.params.id);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session ID' });
    }

    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!canAccessSessionRecord(req.user, session, { allowClient: false, allowTrainer: true })) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this session package price' });
    }

    // Default pricing — can be enhanced with actual package lookup later
    const packageInfo = await getSessionPackagePricing(session);

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        clientId: session.userId,
        pricePerSession: packageInfo.pricePerSession,
        packageName: packageInfo.packageName,
        fallbackPrice: packageInfo.fallbackPrice,
        defaultChargeAmount: packageInfo.defaultChargeAmount,
        lateFeeAmount: packageInfo.lateFeeAmount,
        isFallback: packageInfo.isFallback
      }
    });
  } catch (error) {
    logger.error(`Error in GET /api/sessions/${req.params.id}/client-package-price:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching package price',
      error: error.message
    });
  }
});

/**
 * POST /api/sessions/:sessionId/charge-cancellation
 * Record the admin cancellation billing decision for the review queue.
 *
 * This endpoint records the fee decision and audit trail. Actual card charging
 * stays in the dedicated payment workflow.
 */
router.post("/:sessionId/charge-cancellation", protect, adminOnly, async (req, res) => {
  try {
    const sessionId = parsePositiveInteger(req.params.sessionId);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const {
      decision,
      reason,
      chargeType = 'late_fee',
      chargeAmount
    } = req.body;
    const allowedDecisions = new Set(['charged', 'waived']);
    const allowedChargeTypes = new Set(['none', 'late_fee', 'full', 'partial', 'custom']);

    if (!allowedDecisions.has(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision is required and must be 'charged' or 'waived'"
      });
    }

    if (!allowedChargeTypes.has(chargeType)) {
      return res.status(400).json({
        success: false,
        message: 'chargeType must be one of: none, late_fee, full, partial, custom'
      });
    }

    const normalizedReason = typeof reason === 'string' ? reason.trim() : '';
    if (decision === 'waived' && normalizedReason.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required when waiving a cancellation charge'
      });
    }

    const session = await Session.findByPk(sessionId, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'availableSessions']
        }
      ]
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Only cancelled sessions can be reviewed for cancellation billing'
      });
    }

    const packageInfo = await getSessionPackagePricing(session);
    let actualChargeAmount = 0;
    let actualChargeType = 'none';

    if (decision === 'charged') {
      const customAmount = chargeType === 'custom' || chargeType === 'partial'
        ? parseMoneyAmount(chargeAmount)
        : null;
      if ((chargeType === 'custom' || chargeType === 'partial') && customAmount === null) {
        return res.status(400).json({
          success: false,
          message: 'A non-negative chargeAmount is required for custom or partial cancellation decisions'
        });
      }

      const chargeCalc = computeCancellationCharge(session, packageInfo, {
        chargeType,
        customAmount
      });
      actualChargeAmount = chargeCalc.chargeAmount;
      actualChargeType = chargeCalc.chargeType;

      if (actualChargeAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'A charged cancellation decision requires an amount greater than zero'
        });
      }
    }

    const now = new Date();
    session.cancellationChargeType = actualChargeType;
    session.cancellationChargeAmount = actualChargeAmount;
    session.cancellationChargedAt = now;
    session.cancellationDecision = decision;
    session.cancellationReviewedBy = req.user.id;
    session.cancellationReviewedAt = now;
    session.cancellationReviewReason = normalizedReason || null;

    if (decision === 'waived' && session.sessionDeducted && !session.sessionCreditRestored && session.userId) {
      const client = await User.findByPk(session.userId);
      if (client) {
        await client.update({ availableSessions: Number(client.availableSessions || 0) + 1 });
        session.sessionCreditRestored = true;
      }
    }

    await session.save();

    logger.info('Cancellation billing decision recorded', {
      sessionId,
      decision,
      chargeType: actualChargeType,
      chargeAmount: actualChargeAmount,
      reviewedBy: req.user.id
    });

    return res.status(200).json({
      success: true,
      message: decision === 'waived'
        ? 'Cancellation waived and recorded for billing review'
        : `Cancellation charge of $${actualChargeAmount} recorded for billing review`,
      data: {
        sessionId: session.id,
        decision: session.cancellationDecision,
        chargeType: session.cancellationChargeType,
        chargeAmount: Number.parseFloat(session.cancellationChargeAmount) || 0,
        chargedAt: session.cancellationChargedAt,
        reviewedBy: session.cancellationReviewedBy,
        reviewedAt: session.cancellationReviewedAt,
        reason: session.cancellationReviewReason,
        creditRestored: session.sessionCreditRestored,
        packageInfo: {
          pricePerSession: packageInfo.pricePerSession,
          packageName: packageInfo.packageName,
          isFallback: packageInfo.isFallback
        }
      }
    });
  } catch (error) {
    logger.error('Error in POST /api/sessions/:sessionId/charge-cancellation:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error recording cancellation billing decision',
      error: error.message
    });
  }
});

export default router;
