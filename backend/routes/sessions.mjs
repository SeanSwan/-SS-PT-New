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

import crypto from 'node:crypto';
import express from "express";
import { protect, adminOnly, trainerOrAdminOnly } from "../middleware/authMiddleware.mjs";
import unifiedSessionService from "../services/sessions/session.service.mjs";
import ConflictService from "../services/conflictService.mjs";
import trainerAssignmentService from "../services/TrainerAssignmentService.mjs";
import Session from "../models/Session.mjs";
import User from "../models/User.mjs";
import { isNonDeductingClient } from '../services/sessionBillingPolicy.mjs';
import { getSessionAnalyticsFavoriteExercises } from '../services/sessionAnalyticsFavoriteExercisesService.mjs';
import { getOrder, getOrderItem, getStorefrontItem } from "../models/index.mjs";
import logger from '../utils/logger.mjs';
import { createNotification } from '../controllers/notificationController.mjs';
import { getClientPackagePricing } from '../utils/cancellationPricing.mjs';
import { recordCancellationBillingDecision } from '../services/sessions/sessionCancellationReviewService.mjs';
import realTimeScheduleService from '../services/realTimeScheduleService.mjs';
import { processSessionDeduction, sendDeductionNotification } from '../utils/notification.mjs';
import {
  buildEditableSessionUpdate,
  hasEditableScheduleFields,
  parseEditableSessionId
} from './sessionEditableUpdate.mjs';

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

const getErrorMessage = (error) => (typeof error === 'string' ? error : (error?.message || ''));
const getNormalizedErrorMessage = (error) => getErrorMessage(error).toLowerCase();

const toSessionRouteErrorMetadata = (error, fallbackCode = 'session_route_error') => ({
  errorName: error?.name || 'Error',
  errorCode: error?.code || error?.type || fallbackCode,
});

const logSessionRouteError = (message, error, req, metadata = {}) => {
  logger.error(message, {
    userId: req?.user?.id,
    route: req?.originalUrl || req?.path,
    ...metadata,
    ...toSessionRouteErrorMetadata(error),
  });
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

// The late-cancellation fee as a fraction of the session rate. Was inlined as
// a bare 0.5 in several places; a policy number with copies is a policy number
// that drifts.
const LATE_FEE_RATE = 0.5;

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
      lateFeeAmount: Math.round(fallbackPrice * LATE_FEE_RATE),
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
    lateFeeAmount: Math.round(defaultChargeAmount * LATE_FEE_RATE),
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
      message: 'Server error fetching sessions'
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
      message: 'Server error fetching statistics'
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
      message: 'Server error checking conflicts'
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

    const favoriteExercises = await getSessionAnalyticsFavoriteExercises(userId);

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
        favoriteExercises,
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
      favoriteExercises,
      weeklyProgress,
      currentStreak,
      longestStreak
    });
  } catch (error) {
    logger.error('Error in GET /api/sessions/analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching analytics'
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
      message: 'Failed to assign trainer'
    });
  }
});

/**
 * POST /api/sessions/remove-trainer-assignment
 * Remove trainer assignments from selected sessions.
 * Must be defined before /:id route to prevent path collision.
 */
router.post('/remove-trainer-assignment', protect, adminOnly, async (req, res) => {
  try {
    const { sessionIds = [] } = req.body || {};

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Session IDs are required'
      });
    }

    const result = await trainerAssignmentService.removeTrainerAssignment(sessionIds, req.user.id);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Error in POST /api/sessions/remove-trainer-assignment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove trainer assignment'
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
      message: 'Failed to get trainer assignment health'
    });
  }
});

/**
 * GET /api/sessions/trainer-assignments/:trainerId
 * Get trainer's assigned clients and sessions.
 * Must be defined before /:id route to prevent path collision.
 */
router.get('/trainer-assignments/:trainerId', protect, async (req, res) => {
  try {
    const trainerId = parseStrictPositiveInteger(req.params.trainerId);
    if (!trainerId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid trainer ID'
      });
    }

    if (Number(req.user.id) !== trainerId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own trainer assignments'
      });
    }

    const assignments = await trainerAssignmentService.getTrainerAssignments(trainerId);

    return res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    logger.error('Error in GET /api/sessions/trainer-assignments/:trainerId:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get trainer assignments'
    });
  }
});

/**
 * GET /api/sessions/client-assignments/:clientId
 * Get client's trainer assignments.
 * Must be defined before /:id route to prevent path collision.
 */
router.get('/client-assignments/:clientId', protect, async (req, res) => {
  try {
    const clientId = parseStrictPositiveInteger(req.params.clientId);
    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID'
      });
    }

    if (Number(req.user.id) !== clientId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own assignments'
      });
    }

    const assignments = await trainerAssignmentService.getClientAssignments(clientId);

    return res.status(200).json({
      success: true,
      data: assignments
    });
  } catch (error) {
    logger.error('Error in GET /api/sessions/client-assignments/:clientId:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get client assignments'
    });
  }
});

/**
 * POST /api/sessions/request
 * Request a custom session time with admin approval workflow.
 * Must be defined before /:id route to prevent path collision.
 */
router.post("/request", protect, async (req, res) => {
  try {
    const { start, end, duration, notes, sessionType, sessionTypeId, location, preferredTrainerId } = req.body || {};

    if (!start) {
      return res.status(400).json({
        success: false,
        message: 'Session start time is required'
      });
    }

    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    if (Number.isNaN(startDate.getTime()) || (endDate && Number.isNaN(endDate.getTime()))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot request sessions in the past'
      });
    }

    if (endDate && endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'Session end time must be after the start time'
      });
    }

    const parsedSessionTypeId = sessionTypeId || sessionType
      ? parseStrictPositiveInteger(sessionTypeId || sessionType)
      : null;
    const parsedTrainerId = preferredTrainerId
      ? parseStrictPositiveInteger(preferredTrainerId)
      : null;

    if ((sessionTypeId || sessionType) && !parsedSessionTypeId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session type'
      });
    }

    if (preferredTrainerId && !parsedTrainerId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferred trainer'
      });
    }

    const client = await User.findByPk(req.user.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (isNonDeductingClient(client)) {
      return res.status(403).json({
        success: false,
        message: 'This client account does not have custom session request access. Use the Workout Logger to track training.'
      });
    }

    const sessionRequest = await Session.create({
      sessionDate: startDate,
      endDate,
      duration: parseBoundedPositiveInteger(duration, 480) || 60,
      status: 'requested',
      userId: client.id,
      trainerId: parsedTrainerId,
      notes: notes || null,
      sessionTypeId: parsedSessionTypeId,
      location: location || 'Main Studio',
      confirmed: false,
      bookingDate: new Date()
    });

    realTimeScheduleService.broadcastSessionRequest({
      sessionId: sessionRequest.id,
      clientId: client.id,
      requestedDate: startDate.toISOString(),
      timestamp: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: 'Session request submitted successfully',
      session: sessionRequest
    });
  } catch (error) {
    logger.error('Error in POST /api/sessions/request:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating session request'
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
      message: 'Server error fetching upcoming sessions'
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
      message: 'Server error fetching session history'
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
      message: 'Failed to allocate sessions from order'
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
      attributes: ['id', 'firstName', 'lastName', 'availableSessions', 'clientSource', 'sessionBillingMode']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User ${userId} not found`
      });
    }

    if (isNonDeductingClient(user)) {
      return res.status(409).json({
        success: false,
        message: 'Manual paid-session allocation is disabled for no-pay/free-tracking clients'
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
      message: 'Failed to add sessions'
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
      attributes: ['id', 'availableSessions', 'clientSource', 'sessionBillingMode']
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

    const available = isNonDeductingClient(user)
      ? 0
      : Number(user.availableSessions || 0);

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
      message: 'Failed to get session summary'
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
 * POST /api/sessions/admin/book
 * Admin books a paid SwanStudios session on behalf of a client.
 * This canonical unified route keeps session credits, sessionDeducted, and
 * cancellation review logic aligned with the shared deduction helper.
 */
router.post("/admin/book", protect, adminOnly, async (req, res) => {
  const transaction = await Session.sequelize.transaction();

  try {
    const { clientId, sessionDate, trainerId, duration = 60, notes, location } = req.body || {};
    const parsedClientId = parseStrictPositiveInteger(clientId);
    const parsedTrainerId = trainerId ? parseStrictPositiveInteger(trainerId) : null;
    const parsedDuration = parseBoundedPositiveInteger(duration, 480) || 60;

    if (!parsedClientId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "clientId is required" });
    }

    if (!sessionDate) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "sessionDate is required" });
    }

    const parsedSessionDate = new Date(sessionDate);
    if (Number.isNaN(parsedSessionDate.getTime())) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid sessionDate format. Use ISO 8601."
      });
    }

    const client = await User.findByPk(parsedClientId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!client) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const shouldDeductPaidCredit = !isNonDeductingClient(client);

    if (shouldDeductPaidCredit && (!client.availableSessions || client.availableSessions <= 0)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Client has no available sessions. Add sessions first.",
        availableSessions: client.availableSessions || 0
      });
    }

    if (trainerId && !parsedTrainerId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Invalid trainerId" });
    }

    if (parsedTrainerId) {
      const trainer = await User.findByPk(parsedTrainerId, { transaction });
      if (!trainer || !['trainer', 'admin'].includes(trainer.role)) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: "Trainer not found" });
      }
    }

    const endDate = new Date(parsedSessionDate.getTime() + parsedDuration * 60 * 1000);
    const { Op } = Session.sequelize.Sequelize;
    const overlapWindow = {
      status: { [Op.in]: ['scheduled', 'confirmed'] },
      [Op.and]: [
        { sessionDate: { [Op.lt]: endDate } },
        { endDate: { [Op.gt]: parsedSessionDate } }
      ]
    };

    const clientConflict = await Session.findOne({
      where: {
        ...overlapWindow,
        userId: parsedClientId
      },
      transaction
    });

    if (clientConflict) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "Client has a conflicting session at this time",
        conflictingSession: {
          id: clientConflict.id,
          sessionDate: clientConflict.sessionDate,
          endDate: clientConflict.endDate
        }
      });
    }

    if (parsedTrainerId) {
      const trainerConflict = await Session.findOne({
        where: {
          ...overlapWindow,
          trainerId: parsedTrainerId
        },
        transaction
      });

      if (trainerConflict) {
        await transaction.rollback();
        return res.status(409).json({
          success: false,
          message: "Trainer has a conflicting session at this time",
          conflictingSession: {
            id: trainerConflict.id,
            sessionDate: trainerConflict.sessionDate,
            endDate: trainerConflict.endDate
          }
        });
      }
    }

    const session = await Session.create({
      sessionDate: parsedSessionDate,
      endDate,
      duration: parsedDuration,
      userId: parsedClientId,
      trainerId: parsedTrainerId,
      status: 'scheduled',
      notes: notes || null,
      location: location || 'Main Studio',
      bookedByAdminId: req.user.id,
      bookingDate: new Date(),
      isBlocked: false,
      confirmed: false,
      sessionDeducted: false
    }, { transaction });

    let deductionResult = null;
    if (shouldDeductPaidCredit) {
      deductionResult = await processSessionDeduction(session, client, transaction);
      if (!deductionResult?.success) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: deductionResult?.message || 'Failed to deduct session credits'
        });
      }
    }

    await transaction.commit();

    unifiedSessionService.sendBookingNotifications(session, client).catch((err) => {
      logSessionRouteError('[adminBookSession] Booking notification failed', err, req, {
        sessionId: session.id,
        clientId: parsedClientId,
        notificationType: 'booking',
      });
    });

    if (deductionResult?.creditsDeducted > 0) {
      sendDeductionNotification(session, client).catch((err) => {
        logSessionRouteError('[adminBookSession] Deduction notification failed', err, req, {
          sessionId: session.id,
          clientId: parsedClientId,
          notificationType: 'deduction',
        });
      });
    }

    try {
      realTimeScheduleService.broadcast('session:created', {
        session: session.toJSON(),
        bookedByAdmin: true
      });
    } catch (broadcastError) {
      logSessionRouteError('Error broadcasting admin booking session update', broadcastError, req, {
        sessionId: session.id,
        clientId: parsedClientId,
      });
    }

    logger.info(`Admin ${req.user.id} booked session ${session.id} for client ${parsedClientId}`, {
      sessionDate: parsedSessionDate.toISOString(),
      trainerId: parsedTrainerId,
      remainingSessions: client.availableSessions
    });

    return res.status(201).json({
      success: true,
      message: "Session booked successfully",
      session: session.toJSON(),
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        availableSessions: client.availableSessions
      }
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logSessionRouteError('Rollback failed in unified admin booking route', rollbackError, req, {
        clientId: req.body?.clientId,
      });
    }

    logSessionRouteError('Error in unified admin book session', error, req, {
      clientId: req.body?.clientId,
      trainerId: req.body?.trainerId,
    });
    return res.status(500).json({
      success: false,
      message: "Server error booking session"
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
      message: 'Server error fetching cancelled sessions'
    });
  }
});

/**
 * GET /api/sessions/available
 * Return future available slots for app-wide SessionContext consumers.
 */
router.get("/available", protect, async (_req, res) => {
  try {
    const { Op } = Session.sequelize.Sequelize;
    const availableSessions = await Session.findAll({
      where: {
        status: 'available',
        userId: null,
        sessionDate: {
          [Op.gt]: new Date()
        }
      },
      include: [
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'specialties', 'photo'],
          required: false
        }
      ],
      order: [['sessionDate', 'ASC']]
    });

    return res.status(200).json(availableSessions);
  } catch (error) {
    logger.error('Error in GET /api/sessions/available:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching available sessions'
    });
  }
});

/**
 * GET /api/sessions/client/:userId
 * Return all sessions for a target client for active SessionContext consumers.
 */
router.get("/client/:userId", protect, async (req, res) => {
  try {
    const targetUserId = parseStrictPositiveInteger(req.params.userId);
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const requesterId = Number(req.user.id);
    const role = req.user.role;
    if (!Number.isInteger(requesterId)) {
      return res.status(403).json({ success: false, message: 'Invalid requester' });
    }

    if (role !== 'admin' && role !== 'trainer' && requesterId !== targetUserId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view these sessions' });
    }

    const ownershipFilter = role === 'trainer'
      ? { userId: targetUserId, trainerId: requesterId }
      : { userId: targetUserId };

    const clientSessions = await Session.findAll({
      where: ownershipFilter,
      include: [
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'photo'],
          required: false
        },
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      order: [['sessionDate', 'DESC']]
    });

    return res.status(200).json(clientSessions);
  } catch (error) {
    logger.error('Error in GET /api/sessions/client/:userId:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching client sessions'
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
      message: 'Server error fetching trainers'
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
    const normalizedMessage = getNormalizedErrorMessage(error);

    if (normalizedMessage.includes('privileges required')) {
      return res.status(403).json({
        success: false,
        message: 'Trainer or admin privileges required'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error fetching clients'
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
    const normalizedMessage = getNormalizedErrorMessage(error);

    // Handle permission errors
    if (normalizedMessage.includes('permission')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this session'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error fetching session'
    });
  }
});

/**
 * PUT /api/sessions/:id
 * Conservative generic update path for app-wide SessionContext autosave.
 */
router.put("/:id", protect, async (req, res) => {
  try {
    const sessionId = parseEditableSessionId(req.params.id);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!canAccessSessionRecord(req.user, session, { allowClient: true, allowTrainer: true })) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this session'
      });
    }

    if (req.body?.status === 'completed') {
      const result = await unifiedSessionService.completeSession(sessionId, req.user, {
        notes: req.body?.notes,
        completeWithoutLog: req.body?.completeWithoutLog === true,
        deductSessionCredit: req.body?.deductSessionCredit
      });
      return res.status(200).json(result);
    }

    const allowedStatusUpdates = new Set(['scheduled', 'confirmed', 'cancelled']);
    if (typeof req.body?.status === 'string' && allowedStatusUpdates.has(req.body.status)) {
      if (!['admin', 'trainer'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Admin or trainer privileges required to update session status'
        });
      }
      session.status = req.body.status;
    }

    const editableUpdate = buildEditableSessionUpdate(req.body || {}, session);
    const editableKeys = Object.keys(editableUpdate);

    if (req.user.role === 'client') {
      const clientAllowedFields = new Set(['notes']);
      const blockedField = editableKeys.find((key) => !clientAllowedFields.has(key));
      if (blockedField) {
        return res.status(403).json({
          success: false,
          message: 'Client schedule changes must be handled through cancellation or rescheduling support'
        });
      }
    }

    if (hasEditableScheduleFields(editableUpdate)) {
      const startTime = editableUpdate.sessionDate || session.sessionDate;
      const endTime = editableUpdate.endDate
        || new Date(new Date(startTime).getTime() + Number(editableUpdate.duration ?? session.duration ?? 60) * 60000);
      const trainerId = Object.prototype.hasOwnProperty.call(editableUpdate, 'trainerId')
        ? editableUpdate.trainerId
        : session.trainerId;
      const clientId = Object.prototype.hasOwnProperty.call(editableUpdate, 'userId')
        ? editableUpdate.userId
        : session.userId;

      const conflicts = await ConflictService.checkConflicts({
        startTime,
        endTime,
        trainerId,
        clientId,
        excludeSessionId: sessionId
      });
      const hasHardConflicts = conflicts.some((conflict) => conflict.type === 'hard');
      const allowOverride = req.body?.conflictOverride === true && req.user.role === 'admin';

      if (hasHardConflicts && !allowOverride) {
        const alternatives = await ConflictService.findAlternatives({
          date: startTime,
          trainerId,
          duration: Number(editableUpdate.duration ?? session.duration ?? 60)
        });
        return res.status(409).json({
          success: false,
          message: 'Scheduling conflict detected',
          conflicts,
          alternatives
        });
      }
    }

    if (editableKeys.length > 0) {
      session.set(editableUpdate);
    }

    await session.save();

    const updatedSession = await unifiedSessionService.getSessionById(sessionId, req.user);
    return res.status(200).json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    logger.error(`Error in PUT /api/sessions/${req.params.id}:`, error);
    const rawMessage = typeof error === 'string' ? error : (error?.message || '');
    const normalizedMessage = rawMessage.toLowerCase();

    if (normalizedMessage.includes('permission') || normalizedMessage.includes('privileges')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this session'
      });
    }

    if (normalizedMessage.includes('invalid') || normalizedMessage.includes('only confirmed') || normalizedMessage.includes('only scheduled')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid session update'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error updating session'
    });
  }
});

/**
 * DELETE /api/sessions/bulk
 * Admin-only bulk removal for unused session slots.
 * Must stay before DELETE /:id so Express does not parse "bulk" as an id.
 */
router.delete("/bulk", protect, adminOnly, async (req, res) => {
  try {
    const rawSessionIds = Array.isArray(req.body?.sessionIds) ? req.body.sessionIds : [];
    const parsedSessionIds = rawSessionIds.map((sessionId) => parseStrictPositiveInteger(sessionId));

    if (rawSessionIds.length === 0 || parsedSessionIds.some((sessionId) => !sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionIds are required'
      });
    }

    const sessionIds = [...new Set(parsedSessionIds)];
    if (sessionIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Bulk delete is limited to 100 sessions at a time'
      });
    }

    const { Op } = Session.sequelize.Sequelize;
    const sessions = await Session.findAll({
      where: {
        id: { [Op.in]: sessionIds }
      }
    });

    if (sessions.length !== sessionIds.length) {
      const foundIds = new Set(sessions.map((session) => Number(session.id)));
      const missingSessionIds = sessionIds.filter((sessionId) => !foundIds.has(sessionId));
      return res.status(404).json({
        success: false,
        message: 'One or more sessions were not found',
        missingSessionIds
      });
    }

    const blockedDeleteStatuses = new Set(['scheduled', 'confirmed', 'completed']);
    const blockedSessions = sessions.filter((session) =>
      session.status === 'completed' ||
      blockedDeleteStatuses.has(session.status) ||
      session.sessionDeducted
    );

    if (blockedSessions.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Booked, confirmed, completed, or credited sessions must be cancelled or archived instead of deleted.',
        blockedSessionIds: blockedSessions.map((session) => session.id)
      });
    }

    const deletedSessions = sessions.map((session) =>
      typeof session.toJSON === 'function'
        ? session.toJSON()
        : {
            id: session.id,
            trainerId: session.trainerId,
            userId: session.userId,
            status: session.status
          }
    );

    const deletedCount = await Session.destroy({
      where: {
        id: { [Op.in]: sessionIds }
      }
    });

    await Promise.all(deletedSessions.map((session) =>
      realTimeScheduleService.broadcastEvent('session:deleted', {
        sessionId: session.id,
        trainerId: session.trainerId,
        clientId: session.userId,
        status: session.status
      }, {
        sessionId: session.id,
        trainerId: session.trainerId,
        clientId: session.userId,
        priority: 'high'
      })
    ));

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedCount} session(s).`,
      deletedCount,
      deletedSessionIds: sessionIds
    });
  } catch (error) {
    logger.error('Error in DELETE /api/sessions/bulk:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting sessions'
    });
  }
});

/**
 * DELETE /api/sessions/:id
 * Admin-only removal for unused session slots.
 * Booked or deducted sessions must use cancellation/attendance flows so paid
 * credits and workout history stay auditable.
 */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const sessionId = parseStrictPositiveInteger(req.params.id);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session id' });
    }

    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!canAccessSessionRecord(req.user, session, { allowClient: false, allowTrainer: false })) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this session'
      });
    }

    const blockedDeleteStatuses = new Set(['scheduled', 'confirmed', 'completed']);
    if (session.status === 'completed' || blockedDeleteStatuses.has(session.status) || session.sessionDeducted) {
      return res.status(409).json({
        success: false,
        message: 'Booked, confirmed, completed, or credited sessions must be cancelled or archived instead of deleted.'
      });
    }

    const deletedSession = typeof session.toJSON === 'function'
      ? session.toJSON()
      : {
          id: session.id,
          trainerId: session.trainerId,
          userId: session.userId,
          status: session.status
        };

    await session.destroy();

    await realTimeScheduleService.broadcastEvent('session:deleted', {
      sessionId,
      trainerId: deletedSession.trainerId,
      clientId: deletedSession.userId,
      status: deletedSession.status
    }, {
      sessionId,
      trainerId: deletedSession.trainerId,
      clientId: deletedSession.userId,
      priority: 'high'
    });

    return res.status(200).json({
      success: true,
      message: 'Session deleted successfully',
      deletedSessionId: sessionId
    });
  } catch (error) {
    logger.error(`Error in DELETE /api/sessions/${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting session'
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
        message: 'Admin privileges required'
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
        message: 'Invalid session creation request'
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
      message: 'Server error creating sessions'
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
    
    // Handle validation errors
    if (normalizedMessage.includes('admin privileges required')) {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges required'
      });
    }
    
    if (normalizedMessage.includes('missing required') || normalizedMessage.includes('must be') || 
        normalizedMessage.includes('invalid') || normalizedMessage.includes('no valid') ||
        normalizedMessage.includes('exceeds')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recurring session request'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error creating recurring sessions'
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
      return res.status(403).json({ success: false, message: 'Admin privileges required' });
    }

    if (normalizedMessage.includes('not found') || normalizedMessage.includes('no future sessions')) {
      return res.status(404).json({ success: false, message: 'Recurring series not found' });
    }

    if (normalizedMessage.includes('invalid') || normalizedMessage.includes('missing') || normalizedMessage.includes('must')) {
      return res.status(400).json({ success: false, message: 'Invalid recurring series request' });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error updating recurring series'
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
      return res.status(403).json({ success: false, message: 'Admin privileges required' });
    }

    if (normalizedMessage.includes('not found') || normalizedMessage.includes('no future sessions')) {
      return res.status(404).json({ success: false, message: 'Recurring series not found' });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error cancelling recurring series'
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

    if (normalizedMessage.includes('admin or trainer')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to block time'
      });
    }

    if (normalizedMessage.includes('missing required') || normalizedMessage.includes('invalid') ||
        normalizedMessage.includes('no valid') || normalizedMessage.includes('exceeds')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid blocked time request'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error blocking time'
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
      message: 'Server error rescheduling session'
    });
  }
});

// ==================== SESSION LIFECYCLE MANAGEMENT ====================

/**
 * POST /api/sessions/book/:userId
 * Compatibility path used by app-wide SessionContext booking.
 */
router.post("/book/:userId", protect, async (req, res) => {
  try {
    const targetUserId = parseStrictPositiveInteger(req.params.userId);
    const sessionId = parseStrictPositiveInteger(req.body?.sessionId);

    if (!targetUserId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Valid user ID and session ID are required'
      });
    }

    if (Number(req.user.id) !== targetUserId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only book sessions for yourself.'
      });
    }

    const bookingUser = req.user.role === 'admin'
      ? { ...req.user, id: targetUserId, role: 'client' }
      : req.user;
    const bookingData = req.user.role === 'admin'
      ? { ...(req.body || {}), deductSession: false }
      : (req.body || {});

    const result = await unifiedSessionService.bookSession(sessionId, bookingUser, bookingData);

    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error in POST /api/sessions/book/${req.params.userId}:`, error);
    const rawMessage = typeof error === 'string' ? error : (error?.message || '');
    const normalizedMessage = rawMessage.toLowerCase();

    if (normalizedMessage.includes('permission') ||
        normalizedMessage.includes('privileges') ||
        normalizedMessage.includes('booking access') ||
        normalizedMessage.includes('does not have session booking')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to book this session'
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
        message: 'Session cannot be booked'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error booking session'
    });
  }
});

/**
 * POST /api/sessions/book-recurring
 * Client self-service booking for multiple available sessions.
 */
router.post("/book-recurring", protect, async (req, res) => {
  const transaction = await Session.sequelize.transaction();

  try {
    const requestedSessionIds = Array.isArray(req.body?.sessionIds)
      ? [...new Set(req.body.sessionIds
        .map((sessionId) => parseStrictPositiveInteger(sessionId))
        .filter(Boolean))]
      : [];

    if (requestedSessionIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid session id to book."
      });
    }

    const client = await User.findByPk(req.user.id, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!client) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    if (isNonDeductingClient(client)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "This client account does not have recurring session booking access. Use the Workout Logger to track training."
      });
    }

    const { Op } = Session.sequelize.Sequelize;
    const sessionsToBook = await Session.findAll({
      where: {
        id: { [Op.in]: requestedSessionIds },
        status: 'available',
        sessionDate: { [Op.gt]: new Date() }
      },
      order: [['sessionDate', 'ASC']],
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (sessionsToBook.length !== requestedSessionIds.length) {
      const foundIds = sessionsToBook.map((session) => Number(session.id));
      const unavailableSessionIds = requestedSessionIds.filter((sessionId) => !foundIds.includes(sessionId));

      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Some sessions are not available for booking.",
        unavailableSessionIds,
        availableCount: sessionsToBook.length,
        requestedCount: requestedSessionIds.length
      });
    }

    const recurringGroupId = crypto.randomUUID();
    const bookingDate = new Date();
    const bookedSessions = [];
    const deductionResultsBySessionId = new Map();

    for (const session of sessionsToBook) {
      const sessionStart = new Date(session.sessionDate);
      session.userId = client.id;
      session.status = 'scheduled';
      session.bookingDate = bookingDate;
      session.isRecurring = true;
      session.recurringGroupId = recurringGroupId;
      if (!session.endDate) {
        session.endDate = new Date(sessionStart.getTime() + (session.duration || 60) * 60000);
      }
      await session.save({ transaction });

      const deductionResult = await processSessionDeduction(session, client, transaction);
      if (!deductionResult?.success) {
        throw new Error(deductionResult?.message || 'Failed to deduct session credits');
      }

      deductionResultsBySessionId.set(session.id, deductionResult);
      bookedSessions.push(session);
    }

    await transaction.commit();

    try {
      for (const session of bookedSessions) {
        realTimeScheduleService.broadcastSessionBooked(session, client);
        const deductionResult = deductionResultsBySessionId.get(session.id);
        if (deductionResult?.creditsDeducted > 0) {
          sendDeductionNotification(session, client).catch((err) =>
            logger.error('[bookRecurring] Deduction notification failed:', err)
          );
        }
      }
    } catch (broadcastError) {
      logger.warn('Failed to broadcast recurring booking events:', broadcastError.message);
    }

    const updatedSessions = await Session.findAll({
      where: { recurringGroupId },
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
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          required: false
        }
      ],
      order: [['sessionDate', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      message: `Successfully booked ${bookedSessions.length} recurring sessions.`,
      recurringGroupId,
      sessions: updatedSessions,
      availableSessions: client.availableSessions,
      totalBooked: bookedSessions.length
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    logger.error('Error in POST /api/sessions/book-recurring:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error booking recurring sessions.'
    });
  }
});

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

      // Handle booking-specific errors
      if (normalizedMessage.includes('permission') ||
          normalizedMessage.includes('privileges') ||
          normalizedMessage.includes('booking access') ||
          normalizedMessage.includes('does not have session booking')) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to book this session'
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
          message: 'Session cannot be booked'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Server error booking session'
      });
    }
  });

/**
 * PATCH /api/sessions/:id/cancel
 * Cancel a session
 */
router.patch("/:id/cancel", protect, async (req, res) => {
  try {
    const { reason, chargeType, chargeAmount, restoreCredit } = req.body || {};
    const result = await unifiedSessionService.cancelSession(req.params.id, req.user, reason, {
      chargeType,
      chargeAmount,
      restoreCredit
    });
    
    return res.status(200).json(result);
  } catch (error) {
    logSessionRouteError('Error in PATCH /api/sessions/:id/cancel', error, req, {
      sessionId: req.params.id,
    });
    const normalizedMessage = getNormalizedErrorMessage(error);
    
    // Handle cancellation-specific errors
    if (normalizedMessage.includes('permission')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this session'
      });
    }
    
    if (normalizedMessage.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (normalizedMessage.includes('cannot cancel')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this session'
      });
    }

    if (normalizedMessage.includes('invalid')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cancellation request'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error cancelling session'
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
    const normalizedMessage = getNormalizedErrorMessage(error);
    
    // Handle confirmation-specific errors
    if (normalizedMessage.includes('privileges required') || normalizedMessage.includes('can only confirm')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to confirm this session'
      });
    }
    
    if (normalizedMessage.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (normalizedMessage.includes('only scheduled')) {
      return res.status(400).json({
        success: false,
        message: 'Only scheduled sessions can be confirmed'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error confirming session'
    });
  }
});

/**
 * PATCH /api/sessions/:id/complete
 * Mark a session as completed (admin/trainer only)
 */
router.patch("/:id/complete", protect, trainerOrAdminOnly, async (req, res) => {
  try {
    const {
      notes,
      trainerRating,
      clientFeedback,
      actualDuration,
      completeWithoutLog,
      deductSessionCredit
    } = req.body;
    const result = await unifiedSessionService.completeSession(req.params.id, req.user, {
      notes,
      trainerRating,
      clientFeedback,
      actualDuration,
      completeWithoutLog: completeWithoutLog === true,
      deductSessionCredit
    });
    
    return res.status(200).json(result);
  } catch (error) {
    logSessionRouteError('Error in PATCH /api/sessions/:id/complete', error, req, {
      sessionId: req.params.id,
    });
    const normalizedMessage = getNormalizedErrorMessage(error);
    
    // Handle completion-specific errors
    if (normalizedMessage.includes('privileges required') || normalizedMessage.includes('can only complete')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this session'
      });
    }
    
    if (normalizedMessage.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (normalizedMessage.includes('only confirmed') || normalizedMessage.includes('only scheduled')) {
      return res.status(400).json({
        success: false,
        message: 'Only scheduled or confirmed sessions can be completed'
      });
    }

    if (normalizedMessage.includes('invalid')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid completion request'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error completing session'
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
    const normalizedMessage = getNormalizedErrorMessage(error);
    
    // Handle assignment-specific errors
    if (normalizedMessage.includes('admin privileges required')) {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges required'
      });
    }
    
    if (normalizedMessage.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    if (normalizedMessage.includes('required')) {
      return res.status(400).json({
        success: false,
        message: 'Required assignment field missing'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error assigning trainer'
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
    const normalizedMessage = getNormalizedErrorMessage(error);
    
    if (normalizedMessage.includes('not found') || normalizedMessage.includes('not completed')) {
      return res.status(400).json({
        success: false,
        message: 'Order not found or not completed'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error allocating sessions'
    });
  }
});

// ==================== ATTENDANCE & FEEDBACK ====================

/**
 * PATCH /api/sessions/:id/attendance
 * Record attendance for a session (admin/trainer only)
 */
router.patch("/:id/attendance", protect, trainerOrAdminOnly, async (req, res) => {
  let transaction;
  try {
    const sessionId = parseStrictPositiveInteger(req.params.id);
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Invalid session ID' });
    }

    const { attendanceStatus, noShowReason, notes, deductSessionCredit } = req.body || {};

    if (!['present', 'late', 'no_show'].includes(attendanceStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance status. Must be: present, late, or no_show'
      });
    }

    const attendanceRecorderId = parseStrictPositiveInteger(req.user?.id);
    if (!attendanceRecorderId) {
      return res.status(401).json({ success: false, message: 'Invalid attendance recorder' });
    }

    transaction = await Session.sequelize.transaction();

    const session = await Session.findByPk(sessionId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!session) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!canAccessSessionRecord(req.user, session, { allowClient: false, allowTrainer: true })) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: 'Not authorized to record attendance for this session' });
    }

    const attendanceRecordedAt = new Date();

    const trimmedNoShowReason = typeof noShowReason === 'string' && noShowReason.trim()
      ? noShowReason.trim()
      : null;
    const trimmedNotes = typeof notes === 'string' && notes.trim()
      ? notes.trim()
      : null;
    let deductionResult = null;

    if (attendanceStatus === 'no_show' && deductSessionCredit === true && !session.sessionDeducted && session.userId) {
      const client = await User.findByPk(session.userId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!client) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: 'Client not found for session' });
      }

      if (!isNonDeductingClient(client)) {
        deductionResult = await processSessionDeduction(session, client, transaction);
        if (!deductionResult?.success) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: deductionResult?.message || 'Unable to deduct session credit for no-show'
          });
        }
      }
    }

    const updates = {
      attendanceStatus,
      attendanceRecordedAt,
      markedPresentBy: attendanceRecorderId,
      checkInTime: attendanceStatus === 'no_show' ? null : (session.checkInTime || attendanceRecordedAt),
      noShowReason: attendanceStatus === 'no_show' ? trimmedNoShowReason : null,
      ...(trimmedNotes && { notes: trimmedNotes })
    };

    await session.update(updates, { transaction });
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: `Attendance recorded: ${attendanceStatus}`,
      data: session,
      deduction: deductionResult ? {
        deducted: Boolean(deductionResult.deducted),
        creditsDeducted: deductionResult.creditsDeducted || 0,
        remainingSessions: deductionResult.remainingSessions ?? null
      } : null
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        logSessionRouteError('Rollback failed in PATCH /api/sessions/:id/attendance', rollbackError, req, {
          sessionId: req.params.id,
        });
      }
    }
    logSessionRouteError('Error in PATCH /api/sessions/:id/attendance', error, req, {
      sessionId: req.params.id,
    });
    return res.status(500).json({
      success: false,
      message: 'Server error recording attendance'
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
      message: 'Server error submitting feedback'
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

    // This was a hardcoded 88 - Math.round(175 * 0.5) - served to every client
    // regardless of package. A client on the $110 rate was told their fee was
    // $88 when half their rate is $55. getSessionPackagePricing already derives
    // this per session (and is duration-aware), so use it and return null when
    // it is only guessing, rather than inventing a figure for the person who is
    // about to act on it.
    let lateFeeAmount = null;
    try {
      const packageInfo = await getSessionPackagePricing(session);
      if (packageInfo && !packageInfo.isFallback) {
        lateFeeAmount = parseMoneyAmount(packageInfo.lateFeeAmount);
      }
    } catch (pricingError) {
      logger.warn(
        `[CancelWarning] session ${sessionId}: pricing lookup failed, returning ` +
          `null fee: ${pricingError.message}`
      );
    }

    const cancellationPolicy = {
      lateFeeAmount,
      creditRestored: !isLateCancellation,
      lateThresholdHours: 24
    };

    // Describe what cancelling actually does. cancelSession applies no fee to a
    // client-initiated cancellation - the forfeited prepaid credit is the real
    // penalty - so promising a fee here was copy the code does not honour.
    const lateMessage = lateFeeAmount === null
      ? 'This is a late cancellation (less than 24 hours notice). Your session credit will not be returned.'
      : `This is a late cancellation (less than 24 hours notice). Your session credit will not be returned, and a fee of up to $${lateFeeAmount.toFixed(2)} may apply.`;

    return res.status(200).json({
      success: true,
      isLateCancellation,
      hoursUntilSession: Math.max(0, Math.round(hoursUntilSession * 10) / 10),
      cancellationPolicy,
      warningMessage: isLateCancellation
        ? lateMessage
        : 'You are cancelling with more than 24 hours notice. Your session credit will be returned and no fee will be charged.',
      sessionDateFormatted: sessionDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
      })
    });
  } catch (error) {
    logger.error(`Error in GET /api/sessions/${req.params.id}/cancel-warning:`, error);
    return res.status(500).json({
      success: false,
      message: 'Server error checking cancellation policy'
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
      message: 'Server error fetching package price'
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
    const { decision, reason, chargeType = 'late_fee', chargeAmount } = req.body || {};
    const result = await recordCancellationBillingDecision({
      sessionId: req.params.sessionId,
      reviewer: req.user,
      decision,
      reason,
      chargeType,
      chargeAmount
    });

    return res.status(200).json(result);
  } catch (error) {
    logSessionRouteError('Error in POST /api/sessions/:sessionId/charge-cancellation', error, req, {
      sessionId: req.params.sessionId,
    });

    const status = Number.isInteger(error.status) ? error.status : 500;
    if (status === 500) {
      return res.status(500).json({
        success: false,
        message: 'Server error recording cancellation billing decision'
      });
    }

    return res.status(status).json({
      success: false,
      message: error.message
    });
  }
});
export default router;
