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
import logger from '../utils/logger.mjs';
import { createNotification } from '../controllers/notificationController.mjs';

const router = express.Router();

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

// ==================== SERVICE HEALTH CHECK ====================

/**
 * GET /api/sessions/health
 * Health check for the unified session service
 */
router.get("/health", async (req, res) => {
  try {
    const health = await unifiedSessionService.healthCheck();
    
    return res.status(200).json(health);
  } catch (error) {
    logger.error('Error in GET /api/sessions/health:', error);
    return res.status(500).json({
      service: 'UnifiedSessionService',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
