/**
 * Training Session Management Routes
 * ================================
 * Routes for managing training sessions in client/admin/trainer dashboards
 * Integrates SwanStudios Store purchases with session management
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import TrainingSessionService from '../services/TrainingSessionService.mjs';
import Session from '../models/Session.mjs';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

/**
 * GET /api/training-sessions
 * Get training sessions for the authenticated user
 * Filters based on user role (client sees their sessions, trainer sees assigned sessions)
 */
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, limit = 50, offset = 0 } = req.query;

    let whereClause = {};
    let include = [];

    // Filter based on user role
    if (userRole === 'client') {
      // Clients see their own sessions
      whereClause.userId = userId;
      include.push({
        model: User,
        as: 'trainer',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      });
    } else if (userRole === 'trainer') {
      // Trainers see sessions assigned to them
      whereClause.trainerId = userId;
      include.push({
        model: User,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: true
      });
    } else if (userRole === 'admin') {
      // Admins see all sessions
      include.push(
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      );
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add status filter if provided
    if (status) {
      whereClause.status = status;
    }

    const sessions = await Session.findAll({
      where: whereClause,
      include,
      order: [['sessionDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return res.status(200).json({
      success: true,
      sessions,
      count: sessions.length
    });
  } catch (error) {
    logger.error(`Error fetching training sessions:`, error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching training sessions'
    });
  }
});

/**
 * GET /api/training-sessions/summary
 * Get session summary for dashboard display
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let summary;

    if (userRole === 'client') {
      // Get summary for the client
      summary = await TrainingSessionService.getSessionSummaryForUser(userId);
    } else if (userRole === 'trainer') {
      // Get summary for sessions assigned to this trainer
      const sessionCounts = await Session.findAll({
        where: { trainerId: userId },
        attributes: [
          'status',
          [Session.sequelize.fn('COUNT', Session.sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      summary = {
        available: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        total: 0
      };

      sessionCounts.forEach(row => {
        const status = row.status;
        const count = parseInt(row.count);
        
        if (summary.hasOwnProperty(status)) {
          summary[status] = count;
        }
        summary.total += count;
      });
    } else if (userRole === 'admin') {
      // Get overall summary for admin
      const sessionCounts = await Session.findAll({
        attributes: [
          'status',
          [Session.sequelize.fn('COUNT', Session.sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      summary = {
        available: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        total: 0
      };

      sessionCounts.forEach(row => {
        const status = row.status;
        const count = parseInt(row.count);
        
        if (summary.hasOwnProperty(status)) {
          summary[status] = count;
        }
        summary.total += count;
      });
    }

    return res.status(200).json({
      success: true,
      summary
    });
  } catch (error) {
    logger.error(`Error fetching session summary:`, error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching session summary'
    });
  }
});

/**
 * GET /api/training-sessions/available/:clientId
 * Get available sessions for a specific client (admin/trainer only)
 */
router.get('/available/:clientId', protect, async (req, res) => {
  try {
    const userRole = req.user.role;
    const clientId = req.params.clientId;

    // Only admins and trainers can view other users' sessions
    if (userRole !== 'admin' && userRole !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const sessions = await TrainingSessionService.getAvailableSessionsForUser(parseInt(clientId));

    return res.status(200).json({
      success: true,
      sessions,
      count: sessions.length
    });
  } catch (error) {
    logger.error(`Error fetching available sessions:`, error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while fetching available sessions'
    });
  }
});

/**
 * POST /api/training-sessions/assign-trainer
 * Assign a trainer to available sessions (admin only)
 */
router.post('/assign-trainer', protect, async (req, res) => {
  try {
    // Only admins can assign trainers
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can assign trainers'
      });
    }

    const { clientId, trainerId, sessionCount } = req.body;

    if (!clientId || !trainerId) {
      return res.status(400).json({
        success: false,
        message: 'Client ID and Trainer ID are required'
      });
    }

    const result = await TrainingSessionService.assignTrainerToSessions(
      parseInt(clientId),
      parseInt(trainerId),
      sessionCount ? parseInt(sessionCount) : null
    );

    return res.status(200).json({
      success: true,
      message: `Successfully assigned ${result.trainerName} to ${result.assignedCount} sessions`,
      result
    });
  } catch (error) {
    logger.error(`Error assigning trainer:`, error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred while assigning trainer'
    });
  }
});

/**
 * PUT /api/training-sessions/:id/schedule
 * Schedule a specific session (admin/trainer only)
 */
router.put('/:id/schedule', protect, async (req, res) => {
  try {
    const userRole = req.user.role;
    const sessionId = req.params.id;
    const { sessionDate, location, duration, notes } = req.body;

    // Only admins and trainers can schedule sessions
    if (userRole !== 'admin' && userRole !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const session = await Session.findByPk(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // If user is a trainer, they can only schedule their own assigned sessions
    if (userRole === 'trainer' && session.trainerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only schedule sessions assigned to you'
      });
    }

    // Update session with scheduling information
    if (sessionDate) session.sessionDate = new Date(sessionDate);
    if (location) session.location = location;
    if (duration) session.duration = parseInt(duration);
    if (notes) session.notes = notes;
    session.status = 'scheduled';

    await session.save();

    // Fetch updated session with related data
    const updatedSession = await Session.findByPk(sessionId, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Session scheduled successfully',
      session: updatedSession
    });
  } catch (error) {
    logger.error(`Error scheduling session:`, error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while scheduling the session'
    });
  }
});

/**
 * PUT /api/training-sessions/:id/complete
 * Mark a session as completed (trainer/admin only)
 */
router.put('/:id/complete', protect, async (req, res) => {
  try {
    const userRole = req.user.role;
    const sessionId = req.params.id;
    const { notes, rating, feedback } = req.body;

    // Only admins and trainers can complete sessions
    if (userRole !== 'admin' && userRole !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const session = await Session.findByPk(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // If user is a trainer, they can only complete their own assigned sessions
    if (userRole === 'trainer' && session.trainerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only complete sessions assigned to you'
      });
    }

    // Update session as completed
    session.status = 'completed';
    session.sessionDeducted = true;
    session.deductionDate = new Date();
    if (notes) session.notes = notes;
    if (rating) session.rating = parseInt(rating);
    if (feedback) {
      session.feedback = feedback;
      session.feedbackProvided = true;
    }

    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Session marked as completed',
      session
    });
  } catch (error) {
    logger.error(`Error completing session:`, error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while completing the session'
    });
  }
});

export default router;
