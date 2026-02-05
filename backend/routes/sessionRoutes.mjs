/**
 * Session Management Routes (Universal Master Schedule + Session Booking API)
 * ===========================================================================
 * CONSOLIDATED VERSION - SINGLE SOURCE OF TRUTH
 */

import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.mjs";
import { getSession, getUser, getOrder, getOrderItem, getStorefrontItem } from "../models/index.mjs";
import sequelize, { Op } from "../database.mjs";
import moment from "moment";
import rrulePkg from "rrule";
import { v4 as uuidv4 } from "uuid";

const { RRule } = rrulePkg;
import {
  sendEmailNotification,
  sendSmsNotification, // Correct case matches the export in notification.mjs
} from "../utils/notification.mjs";
import sessionAllocationService from '../services/SessionAllocationService.mjs';
import trainerAssignmentService from '../services/TrainerAssignmentService.mjs';
import realTimeScheduleService from '../services/realTimeScheduleService.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const MAX_RECURRING_OCCURRENCES = 52;
const MAX_RECURRING_MONTHS = 12;

const parseNotificationPreferences = (user) => {
  if (!user) return {};
  let prefs = user.notificationPreferences;
  if (typeof prefs === 'string') {
    try {
      prefs = JSON.parse(prefs);
    } catch (error) {
      prefs = null;
    }
  }
  return prefs || {};
};

const isWithinQuietHours = (quietHours, now = new Date()) => {
  if (!quietHours || !quietHours.start || !quietHours.end) return false;
  const parseTime = (value) => {
    const [hours, minutes] = value.split(':').map(Number);
    return (hours * 60) + (minutes || 0);
  };
  const start = parseTime(quietHours.start);
  const end = parseTime(quietHours.end);
  const nowMinutes = (now.getHours() * 60) + now.getMinutes();
  if (start <= end) {
    return nowMinutes >= start && nowMinutes < end;
  }
  return nowMinutes >= start || nowMinutes < end;
};

const shouldNotifyClient = ({ user, channel, notifyClient = true, force = false }) => {
  if (!user) return false;
  if (!notifyClient && !force) return false;

  const prefs = parseNotificationPreferences(user);
  const quietHours = prefs.quietHours;

  if (!force && isWithinQuietHours(quietHours)) {
    return false;
  }

  if (channel === 'email') {
    if (prefs.email === false) return false;
    return user.emailNotifications !== false;
  }

  if (channel === 'sms') {
    if (prefs.sms === false) return false;
    return user.smsNotifications !== false;
  }

  if (channel === 'push') {
    return prefs.push === true;
  }

  return true;
};

const buildRecurrenceDates = ({ startDate, recurrenceRule }) => {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Invalid startDate for recurrence');
  }

  const options = RRule.parseString(recurrenceRule);
  options.dtstart = start;

  const maxUntil = moment(start).add(MAX_RECURRING_MONTHS, 'months').toDate();
  if (options.until && options.until > maxUntil) {
    throw new Error('Recurring series exceeds max range');
  }

  if (options.count && options.count > MAX_RECURRING_OCCURRENCES) {
    throw new Error('Recurring series exceeds max occurrences');
  }

  if (!options.until && !options.count) {
    options.until = maxUntil;
  }

  const rule = new RRule(options);
  const dates = rule.all();

  if (dates.length > MAX_RECURRING_OCCURRENCES) {
    throw new Error('Recurring series exceeds max occurrences');
  }

  return dates;
};

// Session management test endpoint with real-time service health
router.get('/test', (req, res) => {
  const realTimeHealth = realTimeScheduleService.getServiceHealth();
  
  res.json({ 
    message: 'Session API is working!',
    realTimeService: realTimeHealth,
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   POST /api/sessions/allocate-from-order
 * @desc    Manually allocate sessions from completed order (Admin)
 * @access  Private (Admin Only)
 */
router.post('/allocate-from-order', protect, adminOnly, async (req, res) => {
  try {
    const { orderId, userId } = req.body;
    
    if (!orderId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and User ID are required'
      });
    }
    
    const result = await sessionAllocationService.allocateSessionsFromOrder(orderId, userId);
    
    // Broadcast real-time allocation update
    try {
      await realTimeScheduleService.broadcastAllocationUpdated({
        userId: userId,
        sessionsAdded: result.sessionsAllocated || 0,
        sessionsRemaining: result.totalSessionsRemaining || 0,
        packageType: result.packageType || 'Sessions',
        reason: 'Admin allocation from order',
        allocatedBy: req.user.id
      });
      
      logger.info(`Real-time allocation update broadcasted for user ${userId}`);
    } catch (broadcastError) {
      logger.warn('Failed to broadcast allocation update:', broadcastError.message);
      // Don't fail the request if broadcast fails
    }
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
    
  } catch (error) {
    console.error('Error allocating sessions from order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to allocate sessions'
    });
  }
});

/**
 * @route   POST /api/sessions/add-to-user
 * @desc    Manually add sessions to user (Admin)
 * @access  Private (Admin Only)
 */
router.post('/add-to-user', protect, adminOnly, async (req, res) => {
  try {
    const { userId, sessionCount, reason } = req.body;
    
    if (!userId || !sessionCount) {
      return res.status(400).json({
        success: false,
        message: 'User ID and session count are required'
      });
    }
    
    const adminUserId = req.user.id;
    const result = await sessionAllocationService.addSessionsToUser(
      userId, 
      parseInt(sessionCount), 
      reason || 'Manually added by admin',
      adminUserId
    );
    
    // Broadcast real-time allocation update
    try {
      await realTimeScheduleService.broadcastAllocationUpdated({
        userId: userId,
        sessionsAdded: parseInt(sessionCount),
        sessionsRemaining: result.totalSessionsRemaining || 0,
        packageType: 'Manual Addition',
        reason: reason || 'Manually added by admin',
        allocatedBy: adminUserId
      });
      
      logger.info(`Real-time manual allocation update broadcasted for user ${userId}`);
    } catch (broadcastError) {
      logger.warn('Failed to broadcast manual allocation update:', broadcastError.message);
      // Don't fail the request if broadcast fails
    }
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
    
  } catch (error) {
    console.error('Error adding sessions to user:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add sessions'
    });
  }
});

/**
 * @route   GET /api/sessions/user-summary/:userId
 * @desc    Get session summary for specific user
 * @access  Private (Admin Only)
 */
router.get('/user-summary/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const summary = await sessionAllocationService.getUserSessionSummary(userId);
    
    res.status(200).json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('Error getting user session summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get session summary'
    });
  }
});

/**
 * @route   GET /api/sessions/allocation-health
 * @desc    Health check for session allocation service
 * @access  Private (Admin Only)
 */
router.get('/allocation-health', protect, adminOnly, async (req, res) => {
  try {
    const health = await sessionAllocationService.healthCheck();
    
    res.status(200).json({
      success: true,
      data: health
    });
    
  } catch (error) {
    console.error('Error checking session allocation health:', error);
    res.status(500).json({
      success: false,
      message: 'Session allocation service health check failed'
    });
  }
});

/**
 * TRAINER ASSIGNMENT ENDPOINTS
 * ============================
 * Enhanced trainer assignment system for client-trainer relationship management
 */

/**
 * @route   POST /api/sessions/assign-trainer
 * @desc    Assign trainer to client sessions (Admin)
 * @access  Private (Admin Only)
 */
router.post('/assign-trainer', protect, adminOnly, async (req, res) => {
  try {
    const { trainerId, clientId, sessionIds } = req.body;
    
    if (!trainerId || !clientId) {
      return res.status(400).json({
        success: false,
        message: 'Trainer ID and Client ID are required'
      });
    }
    
    const adminUserId = req.user.id;
    const result = await trainerAssignmentService.assignTrainerToClient(
      trainerId, 
      clientId, 
      sessionIds || [], 
      adminUserId
    );
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
    
  } catch (error) {
    console.error('Error assigning trainer to client:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to assign trainer'
    });
  }
});

/**
 * @route   GET /api/sessions/trainer-assignments/:trainerId
 * @desc    Get trainer's assigned clients and sessions
 * @access  Private (Trainer/Admin)
 */
router.get('/trainer-assignments/:trainerId', protect, async (req, res) => {
  try {
    const { trainerId } = req.params;
    
    // Ensure trainers can only view their own assignments (unless admin)
    if (req.user.id.toString() !== trainerId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own trainer assignments'
      });
    }
    
    const assignments = await trainerAssignmentService.getTrainerAssignments(trainerId);
    
    res.status(200).json({
      success: true,
      data: assignments
    });
    
  } catch (error) {
    console.error('Error getting trainer assignments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get trainer assignments'
    });
  }
});

/**
 * @route   GET /api/sessions/client-assignments/:clientId
 * @desc    Get client's trainer assignments
 * @access  Private (Client/Admin)
 */
router.get('/client-assignments/:clientId', protect, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Ensure clients can only view their own assignments (unless admin)
    if (req.user.id.toString() !== clientId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own assignments'
      });
    }
    
    const assignments = await trainerAssignmentService.getClientAssignments(clientId);
    
    res.status(200).json({
      success: true,
      data: assignments
    });
    
  } catch (error) {
    console.error('Error getting client assignments:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get client assignments'
    });
  }
});

/**
 * @route   POST /api/sessions/remove-trainer-assignment
 * @desc    Remove trainer assignment from sessions (Admin)
 * @access  Private (Admin Only)
 */
router.post('/remove-trainer-assignment', protect, adminOnly, async (req, res) => {
  try {
    const { sessionIds } = req.body;
    
    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Session IDs array is required'
      });
    }
    
    const adminUserId = req.user.id;
    const result = await trainerAssignmentService.removeTrainerAssignment(sessionIds, adminUserId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
    
  } catch (error) {
    console.error('Error removing trainer assignment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove trainer assignment'
    });
  }
});

/**
 * @route   GET /api/sessions/assignment-statistics
 * @desc    Get assignment statistics for admin dashboard
 * @access  Private (Admin Only)
 */
router.get('/assignment-statistics', protect, adminOnly, async (req, res) => {
  try {
    let statistics;
    try {
      statistics = await trainerAssignmentService.getAssignmentStatistics();
    } catch (serviceError) {
      console.error('TrainerAssignmentService error:', serviceError);
      // Return empty stats structure to prevent frontend crash
      statistics = {
        totalAssignments: 0,
        activeAssignments: 0,
        trainerLoad: [],
        unassignedClients: 0
      };
    }
    
    res.status(200).json({
      success: true,
      data: statistics
    });
    
  } catch (error) {
    console.error('Error getting assignment statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get assignment statistics'
    });
  }
});

/**
 * @route   GET /api/sessions/trainer-assignment-health
 * @desc    Health check for trainer assignment service
 * @access  Private (Admin Only)
 */
router.get('/trainer-assignment-health', protect, adminOnly, async (req, res) => {
  try {
    const health = await trainerAssignmentService.healthCheck();
    
    res.status(200).json({
      success: true,
      data: health
    });
    
  } catch (error) {
    console.error('Error checking trainer assignment health:', error);
    res.status(500).json({
      success: false,
      message: 'Trainer assignment service health check failed'
    });
  }
});

/**
 * @route   GET /api/sessions/
 * @desc    Get all sessions (Universal Master Schedule main endpoint)
 * @access  Private (Admin/Trainer/Client)
 */
router.get("/", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { startDate, endDate, status, trainerId, clientId, userId } = req.query;
    
    const filter = {};

    if (!['admin', 'trainer', 'client'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for schedule data"
      });
    }
    
    // Apply filters
    if (startDate && endDate) {
      filter.sessionDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    if (status) {
      filter.status = status;
    }
    
    if (req.user.role === 'admin') {
      if (trainerId) {
        filter.trainerId = trainerId;
      }
      
      const resolvedClientId = clientId || userId;
      if (resolvedClientId) {
        filter.userId = resolvedClientId;
      }
    } else if (req.user.role === 'trainer') {
      filter.trainerId = req.user.id;
    } else if (req.user.role === 'client') {
      filter.userId = req.user.id;
    }
    
    const sessions = await Session.findAll({
      where: filter,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo', 'availableSessions'],
          required: false
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo', 'specialties'],
          required: false
        }
      ],
      order: [['sessionDate', 'ASC']]
    });
    
    const Order = getOrder();
    const OrderItem = getOrderItem();
    const StorefrontItem = getStorefrontItem();

    const clientIds = [...new Set(sessions.map((session) => session.userId).filter(Boolean))];
    let sessionsWithPackage = sessions.map((session) => session.toJSON());

    if (clientIds.length > 0) {
      const clientPackages = await Promise.all(
        clientIds.map(async (clientId) => {
          const [order, user] = await Promise.all([
            Order.findOne({
              where: { userId: clientId, status: 'completed' },
              order: [['createdAt', 'DESC']],
              include: [{
                model: OrderItem,
                as: 'orderItems',
                include: [{
                  model: StorefrontItem,
                  as: 'storefrontItem'
                }]
              }]
            }),
            User.findByPk(clientId, { attributes: ['availableSessions'] })
          ]);

          const orderItem = order?.orderItems?.[0];
          const pkg = orderItem?.storefrontItem;
          if (pkg) {
            return {
              clientId,
              packageInfo: {
                name: pkg.name,
                sessionsTotal: pkg.sessions ?? null,
                sessionsRemaining: user?.availableSessions ?? 0,
                purchasedAt: order?.createdAt ?? null
              }
            };
          }

          return { clientId, packageInfo: null };
        })
      );

      const packageMap = Object.fromEntries(
        clientPackages.map((item) => [item.clientId, item.packageInfo])
      );

      sessionsWithPackage = sessionsWithPackage.map((session) => ({
        ...session,
        packageInfo: packageMap[session.userId] || null
      }));
    }

    res.status(200).json(sessionsWithPackage);
    
  } catch (error) {
    console.error("Error fetching sessions:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error fetching sessions" 
    });
  }
});

/**
 * @route   POST /api/sessions/
 * @desc    Create a new session (Universal Master Schedule)
 * @access  Private (Admin Only)
 */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    
    // Handle both single object and { sessions: [...] } wrapper
    let data = req.body;
    if (req.body.sessions && Array.isArray(req.body.sessions) && req.body.sessions.length > 0) {
      data = req.body.sessions[0];
    }

    const { 
      sessionDate, 
      duration, 
      location, 
      trainerId, 
      userId, 
      status, 
      notes, 
      sessionType,
      notifyClient,
      recurrenceRule,
      recurringGroupId,
      isBlocked
    } = data;
    
    if (!sessionDate) {
      return res.status(400).json({
        success: false,
        message: "Session date is required"
      });
    }
    
    const resolvedIsBlocked = isBlocked !== undefined ? isBlocked : status === 'blocked';
    const resolvedNotifyClient = notifyClient !== undefined ? notifyClient : !resolvedIsBlocked;

    // Create the session
    const newSession = await Session.create({
      sessionDate: new Date(sessionDate),
      duration: duration || 60,
      location: location || 'Main Studio',
      trainerId: trainerId || null,
      userId: userId || null,
      status: status || 'available',
      notes: notes || null,
      sessionType: sessionType || 'Standard Training',
      notifyClient: resolvedNotifyClient,
      recurrenceRule: recurrenceRule || null,
      recurringGroupId: recurringGroupId || null,
      isRecurring: Boolean(recurrenceRule || recurringGroupId),
      isBlocked: resolvedIsBlocked
    });
    
    // Fetch with associations
    const createdSession = await Session.findByPk(newSession.id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo'],
          required: false
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo'],
          required: false
        }
      ]
    });
    
    // Broadcast real-time session creation
    try {
      await realTimeScheduleService.broadcastSessionCreated(createdSession);
      logger.info(`Real-time session creation broadcasted for session ${newSession.id}`);
    } catch (broadcastError) {
      logger.warn('Failed to broadcast session creation:', broadcastError.message);
    }
    
    res.status(201).json({
      success: true,
      message: "Session created successfully",
      data: createdSession
    });
    
  } catch (error) {
    console.error("Error creating session:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error creating session" 
    });
  }
});

/**
 * @route   PUT /api/sessions/:id
 * @desc    Update a session (admin version)
 * @access  Private (Admin Only)
 */
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { id } = req.params;
    const { sessionDate, notes, duration, location, trainerId, userId, status } = req.body;

    const session = await Session.findByPk(id);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    // Update session fields
    session.sessionDate = sessionDate || session.sessionDate;
    session.notes = notes !== undefined ? notes : session.notes;
    session.duration = duration || session.duration;
    session.location = location || session.location;
    session.trainerId = trainerId !== undefined ? trainerId : session.trainerId;
    session.userId = userId !== undefined ? userId : session.userId;
    session.status = status || session.status;

    await session.save();

    // Fetch the updated session with associated client and trainer
    const updatedSession = await Session.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo', 'availableSessions']
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo']
        }
      ]
    });

    res.status(200).json({
      message: "Session updated successfully",
      session: updatedSession,
      data: updatedSession // Standardize response
    });
  } catch (error) {
    console.error("Error updating session:", error.message);
    res.status(500).json({ message: "Server error updating session." });
  }
});

/**
 * @route   GET /api/sessions/clients
 * @desc    Get all clients for dropdown selection in admin views
 * @access  Private (Admin Only)
 */
router.get("/clients", protect, adminOnly, async (req, res) => {
  try {
    const User = getUser();
    const clients = await User.findAll({
      where: {
        role: 'client'
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 'availableSessions']
    });
    
    res.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error.message);
    res.status(500).json({ message: "Server error fetching clients." });
  }
});

/**
 * @route   GET /api/sessions/trainers
 * @desc    Get all trainers for dropdown selection in admin views
 * @access  Private (Admin Only)
 */
router.get("/trainers", protect, adminOnly, async (req, res) => {
  try {
    const User = getUser();
    const trainers = await User.findAll({
      where: {
        role: 'trainer'
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'photo', 'specialties']
    });
    
    res.json(trainers);
  } catch (error) {
    console.error("Error fetching trainers:", error.message);
    res.status(500).json({ message: "Server error fetching trainers." });
  }
});

/**
 * @route   POST /api/sessions/book/:userId
 * @desc    CLIENT: Book a session slot.
 * @access  Private
 * @critical FIXED: Now properly validates and deducts available sessions
 */
router.post("/book/:userId", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { userId } = req.params;
    const { sessionId } = req.body;

    // Ensure the user can only book for themselves or admin is booking
    if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: "You can only book sessions for yourself." 
      });
    }

    const session = await Session.findOne({
      where: { id: sessionId, status: "available" },
    });
    
    if (!session) {
      return res
        .status(400)
        .json({ message: "Session is not available for booking." });
    }

    // CRITICAL FIX: Check and deduct available sessions BEFORE booking
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ 
        message: "User not found." 
      });
    }

    // Check if user has available sessions (admins can bypass this check)
    if (req.user.role !== 'admin' && (!user.availableSessions || user.availableSessions <= 0)) {
      return res.status(400).json({ 
        message: "No available sessions. Please purchase a session package to book this session.",
        availableSessions: user.availableSessions || 0
      });
    }

    // Book the session
    session.userId = userId;
    session.status = "scheduled";
    session.bookedAt = new Date();
    await session.save();

    // Deduct the session (if not admin)
    if (req.user.role !== 'admin') {
      user.availableSessions -= 1;
      await user.save();
      
      console.log(`Session deducted for user ${userId}. Remaining sessions: ${user.availableSessions}`);
    }

    // Notify the user via email/SMS/push (respect notifyClient + preferences)
    if (user) {
      const notifyClient = session.notifyClient !== false;
      // Format the session date for notifications
      const sessionDateFormatted = new Date(session.sessionDate).toLocaleString(
        'en-US', 
        { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      );

      // Send email notification
      if (user.email && shouldNotifyClient({ user, channel: 'email', notifyClient })) {
        await sendEmailNotification({
          to: user.email,
          subject: "Session Booked Successfully",
          text: `Your session has been booked for ${sessionDateFormatted}`,
          html: `<p>Your session has been booked for <strong>${sessionDateFormatted}</strong>.</p>
                 <p>Location: ${session.location || 'Main Studio'}</p>
                 <p>Please arrive 10 minutes before your session.</p>`
        });
      }
      
      // Send SMS notification if the user has a phone number and SMS notifications enabled
      if (user.phone && shouldNotifyClient({ user, channel: 'sms', notifyClient })) {
        await sendSmsNotification({
          to: user.phone,
          body: `Swan Studios: Your session has been booked for ${sessionDateFormatted}. Please arrive 10 minutes early.`
        });
      }

      if (shouldNotifyClient({ user, channel: 'push', notifyClient })) {
        logger.info(`Push notification queued for user ${user.id}: session booked`);
      }
    }

    // Notify trainer if one is assigned
    if (session.trainerId) {
      const trainer = await User.findByPk(session.trainerId);
      if (trainer && trainer.email) {
        const sessionDateFormatted = new Date(session.sessionDate).toLocaleString(
          'en-US', 
          { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }
        );

        await sendEmailNotification({
          to: trainer.email,
          subject: "New Session Booked",
          text: `A new session has been booked with you for ${sessionDateFormatted}`,
          html: `<p>A new session has been booked with you for <strong>${sessionDateFormatted}</strong>.</p>
                 <p>Client: ${user.firstName} ${user.lastName}</p>
                 <p>Location: ${session.location || 'Main Studio'}</p>`
        });
      }
    }

    res.status(200).json({
      message: "Session booked successfully.",
      session
    });
  } catch (error) {
    console.error("Error booking session:", error.message);
    res.status(500).json({ message: "Server error booking session." });
  }
});

/**
 * @route   POST /api/sessions/:sessionId/book
 * @desc    Book a specific session by ID (for current authenticated user)
 * @access  Private (Client)
 */
router.post("/:sessionId/book", protect, async (req, res) => {
  // Use transaction to prevent race condition (double-booking)
  const transaction = await sequelize.transaction();

  try {
    const Session = getSession();
    const User = getUser();
    const { sessionId } = req.params;
    const userId = req.user.id;

    // Find the session with row-level locking to prevent double-booking
    const session = await Session.findOne({
      where: { id: sessionId, status: "available" },
      lock: transaction.LOCK.UPDATE, // Lock the row for update
      transaction
    });

    if (!session) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Session is not available for booking."
      });
    }

    // Check if session is in the past (admins can bypass)
    if (req.user.role !== 'admin' && new Date(session.sessionDate) < new Date()) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot book sessions in the past"
      });
    }

    // Get the user with lock
    const user = await User.findByPk(userId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // Check if user has available sessions (admins can bypass this check)
    if (req.user.role !== 'admin' && (!user.availableSessions || user.availableSessions <= 0)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "No available sessions. Please purchase a session package to book this session.",
        availableSessions: user.availableSessions || 0
      });
    }

    // Book the session within transaction
    session.userId = userId;
    session.status = "scheduled";
    session.bookingDate = new Date();
    await session.save({ transaction });

    // Deduct the session (if not admin)
    if (req.user.role !== 'admin') {
      user.availableSessions -= 1;
      await user.save({ transaction });

      logger.info(`Session deducted for user ${userId}. Remaining sessions: ${user.availableSessions}`);
    }

    // Commit the transaction
    await transaction.commit();

    // Broadcast real-time booking event
    try {
      realTimeScheduleService.broadcastSessionBooked(session, user);
    } catch (broadcastError) {
      logger.warn('Failed to broadcast booking event:', broadcastError.message);
    }

    // Notify the user via email/SMS (respect notifyClient + preferences)
    const notifyClient = session.notifyClient !== false;
    const sessionDateFormatted = new Date(session.sessionDate).toLocaleString(
      'en-US',
      {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );

    // Send email notification
    if (user.email && shouldNotifyClient({ user, channel: 'email', notifyClient })) {
      await sendEmailNotification({
        to: user.email,
        subject: "Session Booked Successfully",
        text: `Your session has been booked for ${sessionDateFormatted}`,
        html: `<p>Your session has been booked for <strong>${sessionDateFormatted}</strong>.</p>
               <p>Location: ${session.location || 'Main Studio'}</p>
               <p>Please arrive 10 minutes before your session.</p>`
      });
    }

    // Send SMS notification
    if (user.phone && shouldNotifyClient({ user, channel: 'sms', notifyClient })) {
      await sendSmsNotification({
        to: user.phone,
        body: `Swan Studios: Your session has been booked for ${sessionDateFormatted}. Please arrive 10 minutes early.`
      });
    }

    // Notify trainer if one is assigned
    if (session.trainerId) {
      const trainer = await User.findByPk(session.trainerId);
      if (trainer && trainer.email) {
        await sendEmailNotification({
          to: trainer.email,
          subject: "New Session Booked",
          text: `A new session has been booked with you for ${sessionDateFormatted}`,
          html: `<p>A new session has been booked with you for <strong>${sessionDateFormatted}</strong>.</p>
                 <p>Client: ${user.firstName} ${user.lastName}</p>
                 <p>Location: ${session.location || 'Main Studio'}</p>`
        });
      }
    }

    // Fetch updated session with associations
    const updatedSession = await Session.findByPk(session.id, {
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
      ]
    });

    res.status(200).json({
      success: true,
      message: "Session booked successfully.",
      session: updatedSession,
      availableSessions: user.availableSessions
    });
  } catch (error) {
    // Rollback transaction on error
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logger.error("Error rolling back transaction:", rollbackError);
    }

    logger.error("Error booking session:", error);
    res.status(500).json({
      success: false,
      message: "Server error booking session.",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/sessions/book-recurring
 * @desc    CLIENT: Book multiple available sessions as a recurring series
 * @access  Private
 *
 * Body options:
 * 1. { sessionIds: [1, 2, 3] } - Book specific available sessions
 * 2. { trainerId, daysOfWeek, timeSlot, weeksAhead } - Auto-find matching slots
 */
router.post("/book-recurring", protect, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const Session = getSession();
    const User = getUser();
    const userId = req.user.id;
    const {
      sessionIds,           // Option 1: Specific session IDs to book
      trainerId,            // Option 2: Find sessions by trainer
      daysOfWeek,           // Option 2: Days to book (0=Sun, 1=Mon, etc.)
      timeSlot,             // Option 2: Time to match (HH:MM format)
      weeksAhead = 4        // Option 2: How many weeks ahead to book
    } = req.body;

    // Get user with lock
    const user = await User.findByPk(userId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    let sessionsToBook = [];

    // Option 1: Book specific session IDs
    if (sessionIds && Array.isArray(sessionIds) && sessionIds.length > 0) {
      sessionsToBook = await Session.findAll({
        where: {
          id: { [Op.in]: sessionIds },
          status: 'available',
          sessionDate: { [Op.gt]: new Date() }
        },
        order: [['sessionDate', 'ASC']],
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (sessionsToBook.length !== sessionIds.length) {
        await transaction.rollback();
        const foundIds = sessionsToBook.map(s => s.id);
        const unavailableIds = sessionIds.filter(id => !foundIds.includes(id));
        return res.status(400).json({
          success: false,
          message: `Some sessions are not available for booking.`,
          unavailableSessionIds: unavailableIds,
          availableCount: sessionsToBook.length,
          requestedCount: sessionIds.length
        });
      }
    }
    // Option 2: Find matching available sessions by pattern
    else if (trainerId && daysOfWeek && Array.isArray(daysOfWeek) && timeSlot) {
      const startDate = new Date();
      const endDate = moment().add(weeksAhead, 'weeks').toDate();

      // Parse time slot
      const [targetHours, targetMinutes] = timeSlot.split(':').map(Number);

      // Find available sessions matching criteria
      const candidates = await Session.findAll({
        where: {
          trainerId,
          status: 'available',
          sessionDate: {
            [Op.between]: [startDate, endDate]
          }
        },
        order: [['sessionDate', 'ASC']],
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      // Filter by day of week and time
      sessionsToBook = candidates.filter(session => {
        const sessionDate = new Date(session.sessionDate);
        const dayMatch = daysOfWeek.includes(sessionDate.getDay());
        const hourMatch = sessionDate.getHours() === targetHours;
        const minuteMatch = Math.abs(sessionDate.getMinutes() - (targetMinutes || 0)) <= 15;
        return dayMatch && hourMatch && minuteMatch;
      });

      if (sessionsToBook.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "No available sessions found matching your criteria.",
          criteria: { trainerId, daysOfWeek, timeSlot, weeksAhead }
        });
      }
    } else {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid request. Provide either 'sessionIds' array or pattern fields (trainerId, daysOfWeek, timeSlot)."
      });
    }

    // Check user has enough available sessions (admins bypass)
    const sessionsNeeded = sessionsToBook.length;
    if (req.user.role !== 'admin' && (!user.availableSessions || user.availableSessions < sessionsNeeded)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Not enough available sessions. You have ${user.availableSessions || 0} sessions but need ${sessionsNeeded}.`,
        availableSessions: user.availableSessions || 0,
        sessionsNeeded
      });
    }

    // Generate recurring group ID to link these bookings
    const recurringGroupId = uuidv4();
    const bookingDate = new Date();

    // Book all sessions
    const bookedSessions = [];
    for (const session of sessionsToBook) {
      session.userId = userId;
      session.status = 'scheduled';
      session.bookingDate = bookingDate;
      session.isRecurring = true;
      session.recurringGroupId = recurringGroupId;
      await session.save({ transaction });
      bookedSessions.push(session);
    }

    // Deduct sessions (if not admin)
    if (req.user.role !== 'admin') {
      user.availableSessions -= sessionsNeeded;
      await user.save({ transaction });
      logger.info(`Recurring booking: ${sessionsNeeded} sessions deducted for user ${userId}. Remaining: ${user.availableSessions}`);
    }

    // Commit transaction
    await transaction.commit();

    // Broadcast real-time booking events
    try {
      for (const session of bookedSessions) {
        realTimeScheduleService.broadcastSessionBooked(session, user);
      }
    } catch (broadcastError) {
      logger.warn('Failed to broadcast recurring booking events:', broadcastError.message);
    }

    // Send single consolidated notification for recurring booking
    const sessionDates = bookedSessions.map(s =>
      new Date(s.sessionDate).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    );

    if (user.email && shouldNotifyClient({ user, channel: 'email', notifyClient: true })) {
      await sendEmailNotification({
        to: user.email,
        subject: `${sessionsNeeded} Recurring Sessions Booked`,
        text: `Your recurring sessions have been booked:\n\n${sessionDates.join('\n')}`,
        html: `<p>Your recurring sessions have been booked:</p>
               <ul>${sessionDates.map(d => `<li>${d}</li>`).join('')}</ul>
               <p>Location: ${bookedSessions[0]?.location || 'Main Studio'}</p>
               <p>Please arrive 10 minutes before each session.</p>`
      });
    }

    if (user.phone && shouldNotifyClient({ user, channel: 'sms', notifyClient: true })) {
      await sendSmsNotification({
        to: user.phone,
        body: `Swan Studios: ${sessionsNeeded} recurring sessions booked. First session: ${sessionDates[0]}`
      });
    }

    // Notify trainer about recurring booking
    if (bookedSessions[0]?.trainerId) {
      const trainer = await User.findByPk(bookedSessions[0].trainerId);
      if (trainer?.email) {
        await sendEmailNotification({
          to: trainer.email,
          subject: `New Recurring Sessions Booked - ${sessionsNeeded} sessions`,
          text: `${user.firstName} ${user.lastName} has booked ${sessionsNeeded} recurring sessions with you.`,
          html: `<p><strong>${user.firstName} ${user.lastName}</strong> has booked ${sessionsNeeded} recurring sessions with you:</p>
                 <ul>${sessionDates.map(d => `<li>${d}</li>`).join('')}</ul>`
        });
      }
    }

    // Fetch updated sessions with associations
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

    res.status(200).json({
      success: true,
      message: `Successfully booked ${sessionsNeeded} recurring sessions.`,
      recurringGroupId,
      sessions: updatedSessions,
      availableSessions: user.availableSessions,
      totalBooked: sessionsNeeded
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logger.error("Error rolling back recurring booking transaction:", rollbackError);
    }

    logger.error("Error booking recurring sessions:", error);
    res.status(500).json({
      success: false,
      message: "Server error booking recurring sessions.",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sessions/my-recurring
 * @desc    CLIENT: Get all recurring session groups for current user
 * @access  Private
 */
router.get("/my-recurring", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const userId = req.user.id;

    // Find all sessions with recurring group IDs for this user
    const sessions = await Session.findAll({
      where: {
        userId,
        isRecurring: true,
        recurringGroupId: { [Op.not]: null }
      },
      include: [
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName'],
          required: false
        }
      ],
      order: [['sessionDate', 'ASC']]
    });

    // Group sessions by recurringGroupId
    const groupedSessions = {};
    sessions.forEach(session => {
      const groupId = session.recurringGroupId;
      if (!groupedSessions[groupId]) {
        groupedSessions[groupId] = {
          recurringGroupId: groupId,
          trainer: session.trainer,
          location: session.location,
          sessions: [],
          upcomingCount: 0,
          completedCount: 0,
          cancelledCount: 0
        };
      }
      groupedSessions[groupId].sessions.push(session);

      if (session.status === 'completed') {
        groupedSessions[groupId].completedCount++;
      } else if (session.status === 'cancelled') {
        groupedSessions[groupId].cancelledCount++;
      } else if (new Date(session.sessionDate) > new Date()) {
        groupedSessions[groupId].upcomingCount++;
      }
    });

    res.status(200).json({
      success: true,
      recurringGroups: Object.values(groupedSessions),
      totalGroups: Object.keys(groupedSessions).length
    });
  } catch (error) {
    logger.error("Error fetching recurring sessions:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching recurring sessions.",
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/sessions/my-recurring/:groupId
 * @desc    CLIENT: Cancel all future sessions in a recurring group
 * @access  Private
 */
router.delete("/my-recurring/:groupId", protect, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const Session = getSession();
    const User = getUser();
    const userId = req.user.id;
    const { groupId } = req.params;
    const { reason } = req.body;

    // Find all future sessions in this recurring group owned by the user
    const sessions = await Session.findAll({
      where: {
        userId,
        recurringGroupId: groupId,
        status: { [Op.notIn]: ['completed', 'cancelled'] },
        sessionDate: { [Op.gt]: new Date() }
      },
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    if (sessions.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "No cancellable sessions found in this recurring group."
      });
    }

    const user = await User.findByPk(userId, {
      lock: transaction.LOCK.UPDATE,
      transaction
    });

    // Cancel sessions and restore credits
    let sessionsRestored = 0;
    for (const session of sessions) {
      session.status = 'cancelled';
      session.cancellationReason = reason || 'Recurring series cancelled by client';
      session.cancellationDate = new Date();
      session.cancelledBy = userId;
      session.sessionCreditRestored = true;
      await session.save({ transaction });
      sessionsRestored++;
    }

    // Restore session credits to user
    user.availableSessions = (user.availableSessions || 0) + sessionsRestored;
    await user.save({ transaction });

    await transaction.commit();

    // Broadcast cancellation events
    try {
      for (const session of sessions) {
        realTimeScheduleService.broadcastSessionCancelled(session, user);
      }
    } catch (broadcastError) {
      logger.warn('Failed to broadcast recurring cancellation events:', broadcastError.message);
    }

    // Notify user
    if (user.email && shouldNotifyClient({ user, channel: 'email', notifyClient: true })) {
      await sendEmailNotification({
        to: user.email,
        subject: `Recurring Sessions Cancelled - ${sessionsRestored} sessions`,
        text: `Your recurring sessions have been cancelled. ${sessionsRestored} session credits have been restored to your account.`,
        html: `<p>Your recurring sessions have been cancelled.</p>
               <p><strong>${sessionsRestored} session credits</strong> have been restored to your account.</p>
               <p>You now have ${user.availableSessions} available sessions.</p>`
      });
    }

    res.status(200).json({
      success: true,
      message: `Cancelled ${sessionsRestored} recurring sessions. Session credits restored.`,
      cancelledCount: sessionsRestored,
      availableSessions: user.availableSessions
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logger.error("Error rolling back recurring cancellation transaction:", rollbackError);
    }

    logger.error("Error cancelling recurring sessions:", error);
    res.status(500).json({
      success: false,
      message: "Server error cancelling recurring sessions.",
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/sessions/reschedule/:sessionId
 * @desc    CLIENT: Reschedule a session.
 * @access  Private
 */
router.put("/reschedule/:sessionId", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { sessionId } = req.params;
    const { newSessionDate } = req.body;

    const session = await Session.findByPk(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    
    // Check if user is authorized to reschedule
    if (session.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: "You can only reschedule your own sessions." 
      });
    }

    if (!['scheduled', 'confirmed'].includes(session.status)) {
      return res.status(400).json({ 
        message: "Only scheduled or confirmed sessions can be rescheduled." 
      });
    }

    const oldDate = moment(session.sessionDate);
    const newDate = moment(newSessionDate);
    const hoursDiff = newDate.diff(oldDate, "hours");

    let sessionDeducted = false;
    
    // Deduct a session if rescheduled within 24 hours of current time
    if (hoursDiff < 24 && req.user.role !== 'admin') {
      sessionDeducted = true;
      
      // Check if client has available sessions
      const client = await User.findByPk(session.userId);
      if (client && client.availableSessions > 0) {
        client.availableSessions -= 1;
        await client.save();
        
        session.sessionDeducted = true;
        session.deductionDate = new Date();
      } else {
        // No sessions to deduct, but we'll still allow the reschedule
        console.warn(`Client ${session.userId} has no available sessions to deduct for late reschedule`);
      }
    }

    // Update session date
    session.sessionDate = newSessionDate;
    await session.save();

    // Notify relevant parties
    const user = await User.findByPk(session.userId);
    
    if (user) {
      const notifyClient = req.body.notifyClient !== undefined ? req.body.notifyClient : session.notifyClient !== false;
      const sessionDateFormatted = new Date(newSessionDate).toLocaleString(
        'en-US', 
        { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      );

      // Send email notification
      if (user.email && shouldNotifyClient({ user, channel: 'email', notifyClient })) {
        await sendEmailNotification({
          to: user.email,
          subject: "Session Rescheduled", 
          text: `Your session has been rescheduled to ${sessionDateFormatted}. ${
            sessionDeducted ? "A session was deducted due to late rescheduling." : ""
          }`,
          html: `<p>Your session has been rescheduled to <strong>${sessionDateFormatted}</strong>.</p>
                 ${sessionDeducted ? "<p>A session was deducted due to late rescheduling.</p>" : ""}
                 <p>Location: ${session.location || 'Main Studio'}</p>`
        });
      }
      
      // Send SMS if enabled
      if (user.phone && shouldNotifyClient({ user, channel: 'sms', notifyClient })) {
        await sendSmsNotification({
          to: user.phone,
          body: `Swan Studios: Your session has been rescheduled to ${sessionDateFormatted}. ${
            sessionDeducted ? "A session was deducted." : ""
          }`
        });
      }

      if (shouldNotifyClient({ user, channel: 'push', notifyClient })) {
        logger.info(`Push notification queued for user ${user.id}: session rescheduled`);
      }
    }

    // Notify trainer if assigned
    if (session.trainerId) {
      const trainer = await User.findByPk(session.trainerId);
      
      if (trainer && trainer.email) {
        const sessionDateFormatted = new Date(newSessionDate).toLocaleString(
          'en-US', 
          { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }
        );

        await sendEmailNotification({
          to: trainer.email,
          subject: "Session Rescheduled", 
          text: `A session has been rescheduled to ${sessionDateFormatted}.`,
          html: `<p>A session has been rescheduled to <strong>${sessionDateFormatted}</strong>.</p>
                 <p>Client: ${user ? `${user.firstName} ${user.lastName}` : 'Unknown'}</p>
                 <p>Location: ${session.location || 'Main Studio'}</p>`
        });
      }
    }

    res.status(200).json({
      message: `Session rescheduled successfully. ${
        sessionDeducted
          ? "A session was deducted due to late rescheduling."
          : "No session was deducted."
      }`,
      session,
    });
  } catch (error) {
    console.error("Error rescheduling session:", error.message);
    res.status(500).json({ message: "Server error rescheduling session." });
  }
});

/**
 * @route   GET /api/sessions/:sessionId/cancel-warning
 * @desc    Get late cancellation warning info before cancelling
 * @access  Private
 *
 * Phase E: Late Cancel Warning
 * Returns information about whether cancellation would be "late" (< 24 hours)
 * and what fees may apply.
 */
router.get("/:sessionId/cancel-warning", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { sessionId } = req.params;

    const session = await Session.findByPk(sessionId, {
      include: [
        { model: User, as: 'client', attributes: ['id', 'firstName', 'lastName'] },
        { model: User, as: 'trainer', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found."
      });
    }

    // Check authorization - user must be admin, trainer, or session owner
    const isAdmin = req.user.role === 'admin';
    const isTrainer = req.user.role === 'trainer' && session.trainerId === req.user.id;
    const isOwner = session.userId === req.user.id;

    if (!isAdmin && !isTrainer && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this session."
      });
    }

    // Check if session is cancellable
    if (!['scheduled', 'confirmed', 'requested'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: `Session cannot be cancelled. Current status: ${session.status}`,
        canCancel: false
      });
    }

    // Calculate hours until session
    const sessionTime = new Date(session.sessionDate).getTime();
    const now = Date.now();
    const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
    const isLateCancellation = hoursUntilSession < 24;

    // Define cancellation policy
    const defaultLateFee = 25; // Could be configured per client/package
    const cancellationPolicyHours = 24;

    // Format session date for display
    const sessionDateFormatted = new Date(session.sessionDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Build warning response
    const response = {
      success: true,
      canCancel: true,
      sessionId: session.id,
      sessionDate: session.sessionDate,
      sessionDateFormatted,
      trainerName: session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : null,
      clientName: session.client ? `${session.client.firstName} ${session.client.lastName}` : null,
      isLateCancellation,
      hoursUntilSession: Math.max(0, Math.round(hoursUntilSession * 10) / 10),
      cancellationPolicy: {
        requiredNoticeHours: cancellationPolicyHours,
        lateFeeAmount: defaultLateFee,
        creditRestored: !isLateCancellation // Credit only restored for early cancellations
      },
      warningMessage: isLateCancellation
        ? `This is a late cancellation. Sessions cancelled less than ${cancellationPolicyHours} hours in advance may be subject to a $${defaultLateFee} late cancellation fee. Your session credit may not be restored.`
        : `You may cancel this session without penalty. Your session credit will be restored.`,
      confirmationRequired: isLateCancellation
    };

    logger.info(`Cancel warning requested for session ${sessionId} by user ${req.user.id}. Late: ${isLateCancellation}`);

    res.status(200).json(response);

  } catch (error) {
    logger.error("Error fetching cancel warning:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching cancellation info."
    });
  }
});

/**
 * @route   DELETE /api/sessions/cancel/:sessionId
 * @desc    CLIENT: Cancel a scheduled session.
 * @access  Private
 */
router.delete("/cancel/:sessionId", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { sessionId } = req.params;
    const { reason, notifyClient, suppressNotifications } = req.body || {};
    
    const session = await Session.findByPk(sessionId);

    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }

    if (!['scheduled', 'confirmed', 'requested'].includes(session.status)) {
      return res.status(400).json({ 
        message: "Only scheduled, confirmed, or requested sessions can be cancelled." 
      });
    }

    // Check authorization
    if (session.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: "You can only cancel your own sessions." 
      });
    }

    // Update session instead of deleting it
    session.status = "cancelled";
    session.cancellationReason = reason || "No reason provided";
    session.cancelledBy = req.user.id;
    await session.save();

    // Notify relevant parties
    const user = await User.findByPk(session.userId);
    const resolvedNotifyClient = notifyClient !== undefined ? notifyClient : session.notifyClient !== false;
    const isUrgentCancellation = moment(session.sessionDate).diff(moment(), 'hours') < 24;
    const shouldSuppressNotifications = req.user.role === 'admin' && suppressNotifications === true;
    const forceNotifyClient = isUrgentCancellation && !shouldSuppressNotifications;
    
    if (user && user.email && user.id !== req.user.id) {
      const sessionDateFormatted = new Date(session.sessionDate).toLocaleString(
        'en-US', 
        { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      );

      if (shouldNotifyClient({ user, channel: 'email', notifyClient: resolvedNotifyClient, force: forceNotifyClient })) {
        await sendEmailNotification({
          to: user.email,
          subject: "Session Cancelled",
          text: `Your session scheduled for ${sessionDateFormatted} has been cancelled.`,
          html: `<p>Your session scheduled for <strong>${sessionDateFormatted}</strong> has been cancelled.</p>
                 <p>Reason: ${session.cancellationReason}</p>`
        });
      }
      
      if (user.phone && shouldNotifyClient({ user, channel: 'sms', notifyClient: resolvedNotifyClient, force: forceNotifyClient })) {
        await sendSmsNotification({
          to: user.phone,
          body: `Swan Studios: Your session on ${sessionDateFormatted} has been cancelled.`
        });
      }

      if (shouldNotifyClient({ user, channel: 'push', notifyClient: resolvedNotifyClient, force: forceNotifyClient })) {
        logger.info(`Push notification queued for user ${user.id}: session cancelled`);
      }
    }

    // Notify trainer if assigned
    if (session.trainerId) {
      const trainer = await User.findByPk(session.trainerId);
      
      if (trainer && trainer.email && trainer.id !== req.user.id) {
        const sessionDateFormatted = new Date(session.sessionDate).toLocaleString(
          'en-US', 
          { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }
        );

        await sendEmailNotification({
          to: trainer.email,
          subject: "Session Cancelled",
          text: `A session scheduled for ${sessionDateFormatted} has been cancelled.`,
          html: `<p>A session scheduled for <strong>${sessionDateFormatted}</strong> has been cancelled.</p>
                 <p>Reason: ${session.cancellationReason}</p>`
        });
      }
    }

    res.json({ message: "Session cancelled successfully." });
  } catch (error) {
    console.error("Error canceling session:", error.message);
    res.status(500).json({ message: "Server error canceling session." });
  }
});

/**
 * @route   PATCH /api/sessions/:sessionId/cancel
 * @desc    Cancel a session with MindBody-style charge options
 * @access  Private (Admin/Trainer or session owner)
 *
 * @body {string} reason - Cancellation reason
 * @body {string} chargeType - 'none' | 'full' | 'partial' | 'late_fee'
 * @body {number} chargeAmount - Amount to charge (for partial charges)
 * @body {boolean} restoreCredit - Whether to restore session credit to client
 * @body {boolean} notifyClient - Whether to send email notification
 * @body {boolean} notifyTrainer - Whether to notify the assigned trainer
 */
router.patch("/:sessionId/cancel", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { sessionId } = req.params;
    const {
      reason,
      chargeType = 'none',
      chargeAmount = 0,
      restoreCredit = true,
      notifyClient = true,
      notifyTrainer = true
    } = req.body || {};

    // Validate charge type
    const validChargeTypes = ['none', 'full', 'partial', 'late_fee'];
    if (!validChargeTypes.includes(chargeType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid charge type. Must be one of: ${validChargeTypes.join(', ')}`
      });
    }

    const session = await Session.findByPk(sessionId, {
      include: [
        { model: User, as: 'client', attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'availableSessions'] },
        { model: User, as: 'trainer', attributes: ['id', 'firstName', 'lastName', 'email'] }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found."
      });
    }

    if (!['scheduled', 'confirmed', 'requested'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: "Only scheduled, confirmed, or requested sessions can be cancelled."
      });
    }

    // Check authorization - admin, trainer, or session owner
    const isAdmin = req.user.role === 'admin';
    const isTrainer = req.user.role === 'trainer' && session.trainerId === req.user.id;
    const isOwner = session.userId === req.user.id;

    if (!isAdmin && !isTrainer && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to cancel this session."
      });
    }

    // Calculate hours until session (for late cancellation policy)
    const hoursUntilSession = moment(session.sessionDate).diff(moment(), 'hours');
    const isLateCancellation = hoursUntilSession < 24;

    // Determine actual charge amount based on type
    let actualChargeAmount = 0;
    const sessionRate = 75; // Default session rate - could be pulled from user's package

    switch (chargeType) {
      case 'none':
        actualChargeAmount = 0;
        break;
      case 'full':
        actualChargeAmount = sessionRate;
        break;
      case 'partial':
        actualChargeAmount = parseFloat(chargeAmount) || (sessionRate * 0.5);
        break;
      case 'late_fee':
        actualChargeAmount = parseFloat(chargeAmount) || 25; // Default late fee
        break;
    }

    // Update session with cancellation details
    session.status = 'cancelled';
    session.cancellationReason = reason || (isLateCancellation ? 'Late cancellation' : 'No reason provided');
    session.cancellationDate = new Date();
    session.cancelledBy = req.user.id;
    session.cancellationChargeType = chargeType;
    session.cancellationChargeAmount = actualChargeAmount;
    session.sessionCreditRestored = restoreCredit && chargeType === 'none';
    session.cancellationChargedAt = actualChargeAmount > 0 ? new Date() : null;

    await session.save();

    // Restore session credit to client if applicable
    let creditRestored = false;
    if (restoreCredit && chargeType === 'none' && session.sessionDeducted && session.userId) {
      const client = await User.findByPk(session.userId);
      if (client) {
        const currentSessions = client.availableSessions || 0;
        await client.update({ availableSessions: currentSessions + 1 });
        creditRestored = true;
        logger.info(`Session credit restored for user ${session.userId}. New balance: ${currentSessions + 1}`);
      }
    }

    // Format session date for notifications
    const sessionDateFormatted = new Date(session.sessionDate).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Build charge message for notifications
    let chargeMessage = '';
    if (chargeType !== 'none' && actualChargeAmount > 0) {
      const chargeTypeLabels = {
        'full': 'Full session charge',
        'partial': 'Partial charge',
        'late_fee': 'Late cancellation fee'
      };
      chargeMessage = `
${chargeTypeLabels[chargeType]}: $${actualChargeAmount.toFixed(2)}`;
    } else if (creditRestored) {
      chargeMessage = `
Your session credit has been restored to your account.`;
    }

    // Send client notification
    if (notifyClient && session.client && session.client.email && session.client.id !== req.user.id) {
      await sendEmailNotification({
        to: session.client.email,
        subject: chargeType !== 'none' ? "Session Cancelled - Charge Applied" : "Session Cancelled",
        text: `Your session scheduled for ${sessionDateFormatted} has been cancelled.

Reason: ${session.cancellationReason}${chargeMessage}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${chargeType !== 'none' ? '#dc2626' : '#2563eb'};">Session Cancelled</h2>
            <p>Your session scheduled for <strong>${sessionDateFormatted}</strong> has been cancelled.</p>
            <p><strong>Reason:</strong> ${session.cancellationReason}</p>
            ${chargeType !== 'none' && actualChargeAmount > 0 ? `
              <div style="background: #fef2f2; border: 1px solid #dc2626; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #dc2626; font-weight: bold; margin: 0;">Charge Applied</p>
                <p style="margin: 8px 0 0 0;">
                  ${chargeType === 'full' ? 'Full session charge' : chargeType === 'late_fee' ? 'Late cancellation fee' : 'Partial charge'}:
                  <strong>$${actualChargeAmount.toFixed(2)}</strong>
                </p>
              </div>
            ` : creditRestored ? `
              <div style="background: #f0fdf4; border: 1px solid #16a34a; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="color: #16a34a; font-weight: bold; margin: 0;">Credit Restored</p>
                <p style="margin: 8px 0 0 0;">Your session credit has been restored to your account.</p>
              </div>
            ` : ''}
            <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact Swan Studios.</p>
          </div>
        `
      });

      // Send SMS if client has phone
      if (session.client.phone) {
        const smsChargeMsg = chargeType !== 'none' && actualChargeAmount > 0
          ? ` Charge: $${actualChargeAmount.toFixed(2)}`
          : creditRestored ? ' Credit restored.' : '';

        await sendSmsNotification({
          to: session.client.phone,
          body: `Swan Studios: Your session on ${sessionDateFormatted} has been cancelled.${smsChargeMsg}`
        });
      }
    }

    // Send trainer notification
    if (notifyTrainer && session.trainer && session.trainer.email && session.trainer.id !== req.user.id) {
      const clientName = session.client ? `${session.client.firstName} ${session.client.lastName}` : 'Unknown Client';

      await sendEmailNotification({
        to: session.trainer.email,
        subject: "Session Cancelled",
        text: `A session with ${clientName} scheduled for ${sessionDateFormatted} has been cancelled.

Reason: ${session.cancellationReason}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Session Cancelled</h2>
            <p>A session with <strong>${clientName}</strong> scheduled for <strong>${sessionDateFormatted}</strong> has been cancelled.</p>
            <p><strong>Reason:</strong> ${session.cancellationReason}</p>
            ${isLateCancellation ? '<p style="color: #dc2626;"><strong>Note:</strong> This was a late cancellation (less than 24 hours notice).</p>' : ''}
          </div>
        `
      });
    }

    // Log the cancellation
    logger.info(`Session ${sessionId} cancelled by user ${req.user.id}`, {
      sessionId,
      chargeType,
      chargeAmount: actualChargeAmount,
      creditRestored,
      isLateCancellation,
      cancelledBy: req.user.id
    });

    res.json({
      success: true,
      message: "Session cancelled successfully.",
      data: {
        sessionId: session.id,
        status: session.status,
        cancellationReason: session.cancellationReason,
        chargeType: session.cancellationChargeType,
        chargeAmount: actualChargeAmount,
        creditRestored,
        isLateCancellation,
        notificationsSent: {
          client: notifyClient && session.client?.email ? true : false,
          trainer: notifyTrainer && session.trainer?.email ? true : false
        }
      }
    });
  } catch (error) {
    console.error("Error cancelling session with charge:", error);
    logger.error("Error cancelling session with charge:", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Server error cancelling session."
    });
  }
});

/**
 * @route   GET /api/sessions/analytics
 * @desc    Get session analytics for the current user
 * @access  Private
 */
router.get("/analytics", protect, async (req, res) => {
  try {
    const Session = getSession();
    if (!Session) {
      throw new Error("Session model not initialized");
    }

    const userId = req.user?.id;

    // Return empty analytics if no user ID (graceful degradation)
    if (!userId) {
      console.warn('[Analytics] No user ID found in request, returning empty analytics', {
        hasUser: !!req.user,
        userKeys: req.user ? Object.keys(req.user) : []
      });
      return res.json({
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
      return res.json({
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
    today.setHours(23, 59, 59, 999);
    
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(checkDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const hasSession = userSessions.some(session => {
        const sessionDate = new Date(session.sessionDate);
        return sessionDate >= checkDate && sessionDate <= dayEnd;
      });
      
      if (hasSession) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedSessions = [...userSessions].sort((a, b) => 
      new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
    );
    
    for (let i = 0; i < sortedSessions.length; i++) {
      const currentDate = new Date(sortedSessions[i].sessionDate).toDateString();
      const prevDate = i > 0 ? new Date(sortedSessions[i-1].sessionDate) : null;
      
      if (prevDate) {
        const diffTime = new Date(currentDate).getTime() - prevDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    const analytics = {
      totalSessions,
      totalDuration,
      averageDuration,
      caloriesBurned: userSessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0),
      favoriteExercises: [], // TODO: Implement when exercise tracking is added
      weeklyProgress,
      currentStreak,
      longestStreak
    };
    
    res.json(analytics);
  } catch (error) {
    console.error("Error fetching session analytics:", error.message, error.stack);
    res.status(500).json({
      message: "Server error fetching analytics.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/sessions/available
 * @desc    ADMIN & CLIENT: Get all available sessions.
 * @access  Public
 */
router.get("/available", async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const availableSessions = await Session.findAll({
      where: { 
        status: "available",
        sessionDate: {
          [Op.gt]: new Date() // Only future sessions
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
    
    res.json(availableSessions);
  } catch (error) {
    console.error("Error fetching available sessions:", error.message);
    res.status(500).json({ message: "Server error fetching sessions." });
  }
});

/**
 * POST /api/sessions/recurring
 * Admin route: Create recurring available slots
 */
router.post("/recurring", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const { 
      startDate, 
      endDate, 
      daysOfWeek, 
      times, 
      trainerId, 
      location,
      duration,
      sessionType,
      notifyClient,
      recurrenceRule,
      status,
      isBlocked,
      reason
    } = req.body;
    
    if (!startDate) {
      return res.status(400).json({ 
        message: "startDate is required" 
      });
    }

    const recurringGroupId = uuidv4();
    const baseStatus = isBlocked ? 'blocked' : (status || 'available');
    const resolvedNotifyClient = notifyClient !== undefined ? notifyClient : !isBlocked;

    let dates = [];

    if (recurrenceRule) {
      dates = buildRecurrenceDates({ startDate, recurrenceRule });
    } else {
      if (!endDate || !daysOfWeek || !times || times.length === 0) {
        return res.status(400).json({ 
          message: "Missing required fields (endDate, daysOfWeek, times) when recurrenceRule is not provided" 
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const maxEnd = moment(start).add(MAX_RECURRING_MONTHS, 'months').toDate();

      if (start > end) {
        return res.status(400).json({ message: "Start date must be before end date" });
      }

      if (end > maxEnd) {
        return res.status(400).json({ message: "Recurring series exceeds max range" });
      }

      const currentDate = new Date(start);
      let exceededLimit = false;
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        if (daysOfWeek.includes(dayOfWeek)) {
          for (const time of times) {
            const [hours, minutes] = time.split(":").map(Number);
            const slotDate = new Date(currentDate);
            slotDate.setHours(hours, minutes, 0, 0);
            dates.push(new Date(slotDate));
          }
        }
        if (dates.length >= MAX_RECURRING_OCCURRENCES) {
          exceededLimit = currentDate < end;
          break;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (dates.length > MAX_RECURRING_OCCURRENCES || exceededLimit) {
        return res.status(400).json({ message: "Recurring series exceeds max occurrences" });
      }
    }

    if (dates.length === 0) {
      return res.status(400).json({ message: "No recurrence dates generated" });
    }

    const createdSlots = await Session.bulkCreate(
      dates.map((date) => ({
        sessionDate: date,
        duration: duration || 60,
        trainerId: trainerId || null,
        location: location || 'Main Studio',
        status: baseStatus,
        sessionType: sessionType || 'Standard Training',
        notifyClient: resolvedNotifyClient,
        isRecurring: true,
        recurringGroupId,
        recurrenceRule: recurrenceRule || null,
        isBlocked: isBlocked === true,
        reason: reason || null
      })),
      { returning: true }
    );
    
    res.status(201).json({ 
      message: `${createdSlots.length} recurring slots created`,
      count: createdSlots.length,
      recurringGroupId
    });
  } catch (error) {
    console.error("Error creating recurring slots:", error);
    res.status(500).json({ message: error.message || "Server error creating recurring slots" });
  }
});

/**
 * @route   PUT /api/sessions/recurring/:groupId
 * @desc    Update fields across a recurring series (Admin)
 * @access  Private (Admin Only)
 */
router.put("/recurring/:groupId", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const { groupId } = req.params;
    const {
      trainerId,
      location,
      duration,
      sessionType,
      notifyClient,
      status,
      isBlocked,
      reason,
      recurrenceRule
    } = req.body;

    const updateFields = {};
    if (trainerId !== undefined) updateFields.trainerId = trainerId || null;
    if (location !== undefined) updateFields.location = location;
    if (duration !== undefined) updateFields.duration = duration;
    if (sessionType !== undefined) updateFields.sessionType = sessionType;
    if (notifyClient !== undefined) updateFields.notifyClient = notifyClient;
    if (status !== undefined) updateFields.status = status;
    if (isBlocked !== undefined) updateFields.isBlocked = isBlocked;
    if (reason !== undefined) updateFields.reason = reason;
    if (recurrenceRule !== undefined) updateFields.recurrenceRule = recurrenceRule;

    const [updatedCount] = await Session.update(updateFields, {
      where: { recurringGroupId: groupId }
    });

    if (updatedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No sessions found for recurring group"
      });
    }

    res.status(200).json({
      success: true,
      message: `Updated ${updatedCount} sessions in recurring series`,
      count: updatedCount
    });
  } catch (error) {
    console.error("Error updating recurring series:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error updating recurring series"
    });
  }
});

/**
 * @route   DELETE /api/sessions/recurring/:groupId
 * @desc    Cancel an entire recurring series (Admin)
 * @access  Private (Admin Only)
 */
router.delete("/recurring/:groupId", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const { groupId } = req.params;
    const { reason } = req.body;

    const [updatedCount] = await Session.update({
      status: 'cancelled',
      cancellationReason: reason || 'Recurring series cancelled',
      cancelledBy: req.user.id
    }, {
      where: { recurringGroupId: groupId }
    });

    if (updatedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No sessions found for recurring group"
      });
    }

    res.status(200).json({
      success: true,
      message: `Cancelled ${updatedCount} sessions in recurring series`,
      count: updatedCount
    });
  } catch (error) {
    console.error("Error cancelling recurring series:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error cancelling recurring series"
    });
  }
});

/**
 * @route   POST /api/sessions/block
 * @desc    Block a time slot (Admin/Trainer)
 * @access  Private (Admin/Trainer)
 */
router.post("/block", protect, async (req, res) => {
  try {
    if (!['admin', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Admin or trainer access required"
      });
    }

    const Session = getSession();
    const {
      sessionDate,
      duration,
      trainerId,
      location,
      reason,
      recurrenceRule
    } = req.body;

    if (!sessionDate) {
      return res.status(400).json({
        success: false,
        message: "sessionDate is required"
      });
    }

    const assignedTrainerId = req.user.role === 'trainer' ? req.user.id : (trainerId || null);

    if (recurrenceRule) {
      const recurringGroupId = uuidv4();
      const dates = buildRecurrenceDates({ startDate: sessionDate, recurrenceRule });
      const createdBlocks = await Session.bulkCreate(
        dates.map((date) => ({
          sessionDate: date,
          duration: duration || 60,
          trainerId: assignedTrainerId,
          location: location || 'Main Studio',
          status: 'blocked',
          isBlocked: true,
          reason: reason || 'Blocked time',
          notifyClient: false,
          isRecurring: true,
          recurringGroupId,
          recurrenceRule
        })),
        { returning: true }
      );

      return res.status(201).json({
        success: true,
        message: `${createdBlocks.length} blocked slots created`,
        count: createdBlocks.length,
        recurringGroupId
      });
    }

    const blockedSession = await Session.create({
      sessionDate: new Date(sessionDate),
      duration: duration || 60,
      trainerId: assignedTrainerId,
      location: location || 'Main Studio',
      status: 'blocked',
      isBlocked: true,
      reason: reason || 'Blocked time',
      notifyClient: false
    });

    res.status(201).json({
      success: true,
      message: "Blocked time created",
      data: blockedSession
    });
  } catch (error) {
    console.error("Error creating blocked time:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error creating blocked time"
    });
  }
});

/**
 * @route   DELETE /api/sessions/block/:id
 * @desc    Unblock a time slot (Admin/Trainer)
 * @access  Private (Admin/Trainer)
 */
router.delete("/block/:id", protect, async (req, res) => {
  try {
    if (!['admin', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Admin or trainer access required"
      });
    }

    const Session = getSession();
    const { id } = req.params;
    const { makeAvailable } = req.body;

    const session = await Session.findByPk(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Blocked session not found"
      });
    }

    if (session.status !== 'blocked' && !session.isBlocked) {
      return res.status(400).json({
        success: false,
        message: "Session is not blocked"
      });
    }

    if (makeAvailable === true) {
      session.status = 'available';
      session.isBlocked = false;
      session.reason = null;
      await session.save();
    } else {
      await session.destroy();
    }

    res.status(200).json({
      success: true,
      message: "Blocked time removed",
      data: session
    });
  } catch (error) {
    console.error("Error removing blocked time:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error removing blocked time"
    });
  }
});

/**
 * PUT /api/schedule/notes/:sessionId
 * Protected route: adds private notes to a session
 */
router.put("/notes/:sessionId", protect, async (req, res) => {
  try {
    const Session = getSession();
    // Ensure only trainers and admins can add notes
    if (req.user.role !== "admin" && req.user.role !== "trainer") {
      return res.status(403).json({ message: "Not authorized to add notes" });
    }
    
    const { sessionId } = req.params;
    const { notes } = req.body;
    
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    session.privateNotes = notes;
    await session.save();
    
    res.json({ message: "Notes updated successfully", session });
  } catch (error) {
    console.error("Error updating notes:", error);
    res.status(500).json({ message: "Server error updating notes" });
  }
});

/**
 * PUT /api/schedule/complete/:sessionId
 * Protected route: marks a session as completed
 */
router.put("/complete/:sessionId", protect, async (req, res) => {
  try {
    const Session = getSession();
    // Ensure only trainers and admins can mark sessions complete
    if (req.user.role !== "admin" && req.user.role !== "trainer") {
      return res.status(403).json({ message: "Not authorized to complete session" });
    }
    
    const { sessionId } = req.params;
    const { notes } = req.body;
    
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    
    session.status = "completed";
    if (notes) {
      session.privateNotes = notes;
    }
    
    await session.save();
    
    res.json({ message: "Session marked as completed", session });
  } catch (error) {
    console.error("Error completing session:", error);
    res.status(500).json({ message: "Server error completing session" });
  }
});

/**
 * @route   PATCH /api/sessions/:sessionId/attendance
 * @desc    Record attendance for a session (Mark Present/No-Show/Late)
 * @access  Private (Trainer/Admin only)
 *
 * Body:
 * - attendanceStatus: 'present' | 'no_show' | 'late' (required)
 * - checkInTime: ISO8601 timestamp (optional, defaults to now for 'present'/'late')
 * - checkOutTime: ISO8601 timestamp (optional)
 * - noShowReason: string (optional, for 'no_show')
 * - notes: string (optional, additional notes)
 */
router.patch("/:sessionId/attendance", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { sessionId } = req.params;
    const { attendanceStatus, checkInTime, checkOutTime, noShowReason, notes } = req.body;

    // Only trainers and admins can record attendance
    if (req.user.role !== 'admin' && req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to record attendance'
      });
    }

    // Validate attendance status
    const validStatuses = ['present', 'no_show', 'late'];
    if (!attendanceStatus || !validStatuses.includes(attendanceStatus)) {
      return res.status(400).json({
        success: false,
        message: `Attendance status must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Find the session
    const session = await Session.findByPk(sessionId, {
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
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Trainers can only record attendance for their own sessions
    if (req.user.role === 'trainer' && session.trainerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Trainers can only record attendance for their own sessions'
      });
    }

    // Validate session is in a state where attendance can be recorded
    const validStatesForAttendance = ['scheduled', 'confirmed'];
    if (!validStatesForAttendance.includes(session.status) && session.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot record attendance for session with status: ${session.status}. Session must be scheduled or confirmed.`
      });
    }

    // Record attendance
    const now = new Date();
    session.attendanceStatus = attendanceStatus;
    session.markedPresentBy = req.user.id;
    session.attendanceRecordedAt = now;

    // Set check-in time
    if (attendanceStatus === 'present' || attendanceStatus === 'late') {
      session.checkInTime = checkInTime ? new Date(checkInTime) : now;
    }

    // Set check-out time if provided
    if (checkOutTime) {
      session.checkOutTime = new Date(checkOutTime);
    }

    // Set no-show reason if applicable
    if (attendanceStatus === 'no_show' && noShowReason) {
      session.noShowReason = noShowReason;
    }

    // Add notes if provided
    if (notes) {
      session.notes = session.notes
        ? `${session.notes}\n\nAttendance Note (${now.toISOString()}): ${notes}`
        : `Attendance Note (${now.toISOString()}): ${notes}`;
    }

    // If marking present/late, also mark session as completed
    if (attendanceStatus === 'present' || attendanceStatus === 'late') {
      session.status = 'completed';
    }

    await session.save();

    // Broadcast real-time update
    try {
      if (attendanceStatus === 'present' || attendanceStatus === 'late') {
        realTimeScheduleService.broadcastSessionCompleted(session, session.client);
      } else {
        realTimeScheduleService.broadcastSessionUpdated(session);
      }
    } catch (broadcastError) {
      logger.warn('Failed to broadcast attendance update:', broadcastError.message);
    }

    // Send notifications for no-show
    if (attendanceStatus === 'no_show' && session.client) {
      const client = session.client;
      const sessionDateFormatted = new Date(session.sessionDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      if (client.email && shouldNotifyClient({ user: client, channel: 'email', notifyClient: true })) {
        await sendEmailNotification({
          to: client.email,
          subject: 'Missed Session Notification',
          text: `You were marked as a no-show for your session on ${sessionDateFormatted}.`,
          html: `<p>You were marked as a <strong>no-show</strong> for your session on <strong>${sessionDateFormatted}</strong>.</p>
                 ${noShowReason ? `<p>Reason noted: ${noShowReason}</p>` : ''}
                 <p>If you believe this is an error, please contact us.</p>`
        });
      }
    }

    // Fetch updated session with associations
    const updatedSession = await Session.findByPk(sessionId, {
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
      ]
    });

    logger.info(`Attendance recorded for session ${sessionId}: ${attendanceStatus} by user ${req.user.id}`);

    res.status(200).json({
      success: true,
      message: `Attendance recorded: ${attendanceStatus}`,
      session: updatedSession
    });
  } catch (error) {
    logger.error('Error recording attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recording attendance',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sessions/attendance-report
 * @desc    Get attendance statistics for a trainer or all sessions (Admin)
 * @access  Private (Trainer/Admin)
 */
router.get("/attendance-report", protect, async (req, res) => {
  try {
    const Session = getSession();
    const { trainerId, startDate, endDate, clientId } = req.query;

    // Build query conditions
    const where = {
      attendanceStatus: { [Op.not]: null }
    };

    // Trainers can only see their own sessions
    if (req.user.role === 'trainer') {
      where.trainerId = req.user.id;
    } else if (trainerId) {
      where.trainerId = parseInt(trainerId);
    }

    if (clientId) {
      where.userId = parseInt(clientId);
    }

    if (startDate) {
      where.sessionDate = { ...where.sessionDate, [Op.gte]: new Date(startDate) };
    }

    if (endDate) {
      where.sessionDate = { ...where.sessionDate, [Op.lte]: new Date(endDate) };
    }

    // Get attendance counts
    const sessions = await Session.findAll({
      where,
      attributes: ['attendanceStatus'],
      raw: true
    });

    const stats = {
      total: sessions.length,
      present: sessions.filter(s => s.attendanceStatus === 'present').length,
      noShow: sessions.filter(s => s.attendanceStatus === 'no_show').length,
      late: sessions.filter(s => s.attendanceStatus === 'late').length,
      attendanceRate: 0,
      noShowRate: 0
    };

    if (stats.total > 0) {
      stats.attendanceRate = Math.round(((stats.present + stats.late) / stats.total) * 100);
      stats.noShowRate = Math.round((stats.noShow / stats.total) * 100);
    }

    res.status(200).json({
      success: true,
      stats,
      filters: { trainerId, clientId, startDate, endDate }
    });
  } catch (error) {
    logger.error('Error fetching attendance report:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching attendance report',
      error: error.message
    });
  }
});

// ==================== UNIVERSAL MASTER SCHEDULE ENHANCEMENTS ====================
// Enhanced endpoints for production-ready Universal Master Schedule

/**
 * @route   POST /api/sessions/bulk-update
 * @desc    Update multiple sessions (Admin only) - For drag-and-drop operations
 * @access  Private (Admin Only)
 */
router.post("/bulk-update", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { updates } = req.body;
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "No valid updates provided" 
      });
    }
    
    const updatedSessions = [];
    const errors = [];
    
    // Process each update
    for (const update of updates) {
      try {
        const { id, ...updateData } = update;
        
        const session = await Session.findByPk(id);
        if (!session) {
          errors.push({ id, error: "Session not found" });
          continue;
        }
        
        // Update session fields
        Object.keys(updateData).forEach(key => {
          if (updateData[key] !== undefined) {
            session[key] = updateData[key];
          }
        });
        
        await session.save();
        
        // Fetch updated session with relations
        const updatedSession = await Session.findByPk(id, {
          include: [
            {
              model: User,
              as: 'client',
              attributes: ['id', 'firstName', 'lastName', 'email', 'photo']
            },
            {
              model: User,
              as: 'trainer',
              attributes: ['id', 'firstName', 'lastName', 'email', 'photo']
            }
          ]
        });
        
        updatedSessions.push(updatedSession);
        
      } catch (updateError) {
        console.error(`Error updating session ${update.id}:`, updateError);
        errors.push({ id: update.id, error: updateError.message });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Updated ${updatedSessions.length} sessions successfully`,
      data: {
        updated: updatedSessions,
        errors: errors
      }
    });
    
  } catch (error) {
    console.error("Error in bulk update:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error during bulk update" 
    });
  }
});

/**
 * @route   POST /api/sessions/bulk-assign-trainer
 * @desc    Assign trainer to multiple sessions (Admin only)
 * @access  Private (Admin Only)
 */
router.post("/bulk-assign-trainer", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { sessionIds, trainerId, assignedBy } = req.body;
    
    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "No session IDs provided" 
      });
    }
    
    if (!trainerId) {
      return res.status(400).json({ 
        success: false,
        message: "Trainer ID is required" 
      });
    }
    
    // Verify trainer exists
    const trainer = await User.findOne({
      where: { id: trainerId, role: 'trainer' }
    });
    
    if (!trainer) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid trainer ID" 
      });
    }
    
    // Update sessions
    const [updatedCount] = await Session.update(
      { 
        trainerId: trainerId,
        assignedBy: assignedBy || req.user.id,
        assignedAt: new Date()
      },
      { 
        where: { 
          id: { [Op.in]: sessionIds }
        }
      }
    );
    
    // Fetch updated sessions with relations
    const updatedSessions = await Session.findAll({
      where: { id: { [Op.in]: sessionIds } },
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo']
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: `Assigned trainer to ${updatedCount} sessions`,
      data: {
        updatedSessions,
        trainer: {
          id: trainer.id,
          firstName: trainer.firstName,
          lastName: trainer.lastName
        }
      }
    });
    
  } catch (error) {
    console.error("Error in bulk trainer assignment:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error during bulk trainer assignment" 
    });
  }
});

/**
 * @route   POST /api/sessions/bulk-delete
 * @desc    Delete multiple sessions (Admin only)
 * @access  Private (Admin Only)
 */
router.post("/bulk-delete", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const { sessionIds } = req.body;
    
    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: "No session IDs provided" 
      });
    }
    
    // Check for booked sessions that shouldn't be deleted
    const bookedSessions = await Session.findAll({
      where: {
        id: { [Op.in]: sessionIds },
        status: { [Op.in]: ['scheduled', 'confirmed', 'completed'] },
        userId: { [Op.not]: null }
      }
    });
    
    if (bookedSessions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete ${bookedSessions.length} sessions that are booked or completed`,
        data: {
          bookedSessionIds: bookedSessions.map(s => s.id)
        }
      });
    }
    
    // Delete sessions (soft delete if paranoid is enabled)
    const deletedCount = await Session.destroy({
      where: { id: { [Op.in]: sessionIds } }
    });
    
    res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} sessions successfully`,
      data: {
        deletedCount,
        deletedIds: sessionIds
      }
    });
    
  } catch (error) {
    console.error("Error in bulk delete:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error during bulk delete" 
    });
  }
});

/**
 * @route   GET /api/sessions/statistics
 * @desc    Get comprehensive session statistics for dashboard analytics
 * @access  Private (Admin Only)
 */
router.get("/statistics", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { startDate, endDate, trainerId } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.sessionDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.sessionDate = {
        [Op.gte]: thirtyDaysAgo
      };
    }
    
    // Add trainer filter if provided
    if (trainerId) {
      dateFilter.trainerId = trainerId;
    }
    
    // Get session counts by status
    const sessionCounts = await Session.findAll({
      where: dateFilter,
      attributes: [
        'status',
        [Session.sequelize.fn('COUNT', Session.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    // Get total sessions and utilization
    const totalSessions = await Session.count({ where: dateFilter });
    const bookedSessions = await Session.count({ 
      where: { 
        ...dateFilter, 
        status: { [Op.in]: ['scheduled', 'confirmed', 'completed'] }
      }
    });
    
    const utilizationRate = totalSessions > 0 ? Math.round((bookedSessions / totalSessions) * 100) : 0;
    
    // Get trainer statistics
    const trainerStats = await Session.findAll({
      where: {
        ...dateFilter,
        trainerId: { [Op.not]: null }
      },
      attributes: [
        'trainerId',
        [Session.sequelize.fn('COUNT', Session.sequelize.col('Session.id')), 'sessionCount']
      ],
      include: [
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      group: ['trainerId', 'trainer.id'],
      order: [[Session.sequelize.literal('sessionCount'), 'DESC']]
    });
    
    // Get upcoming sessions count
    const upcomingSessions = await Session.count({
      where: {
        sessionDate: { [Op.gt]: new Date() },
        status: { [Op.in]: ['available', 'scheduled', 'confirmed'] }
      }
    });
    
    // Get revenue potential (if sessions had pricing)
    const avgSessionPrice = 75; // This could come from a settings table
    const potentialRevenue = bookedSessions * avgSessionPrice;
    
    // Calculate the actual start date for response
    const actualStartDate = startDate || (() => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return thirtyDaysAgo.toISOString();
    })();
    
    const statistics = {
      overview: {
        totalSessions,
        bookedSessions,
        availableSessions: totalSessions - bookedSessions,
        utilizationRate,
        upcomingSessions,
        potentialRevenue
      },
      sessionsByStatus: sessionCounts.reduce((acc, item) => {
        acc[item.dataValues.status] = parseInt(item.dataValues.count);
        return acc;
      }, {}),
      topTrainers: trainerStats.map(stat => ({
        trainer: stat.trainer,
        sessionCount: parseInt(stat.dataValues.sessionCount)
      })),
      dateRange: {
        startDate: actualStartDate,
        endDate: endDate || new Date().toISOString()
      }
    };
    
    res.status(200).json({
      success: true,
      data: statistics
    });
    
  } catch (error) {
    console.error("Error fetching session statistics:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error fetching statistics" 
    });
  }
});

/**
 * @route   GET /api/sessions/calendar-events
 * @desc    Get sessions formatted for calendar display
 * @access  Private (Admin/Trainer)
 */
router.get("/calendar-events", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { start, end, trainerId, clientId, view } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "Start and end dates are required"
      });
    }
    
    // Build filter
    const filter = {
      sessionDate: {
        [Op.between]: [new Date(start), new Date(end)]
      }
    };
    
    // Role-based filtering
    if (req.user.role === 'trainer') {
      filter.trainerId = req.user.id;
    } else if (req.user.role === 'client') {
      filter[Op.or] = [
        { userId: req.user.id },
        { status: 'available' }
      ];
    }
    
    // Additional filters
    if (trainerId && req.user.role === 'admin') {
      filter.trainerId = trainerId;
    }
    
    if (clientId && (req.user.role === 'admin' || req.user.role === 'trainer')) {
      filter.userId = clientId;
    }
    
    const sessions = await Session.findAll({
      where: filter,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo']
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo']
        }
      ],
      order: [['sessionDate', 'ASC']]
    });
    
    // Format sessions for calendar display
    const calendarEvents = sessions.map(session => {
      const startTime = new Date(session.sessionDate);
      const endTime = new Date(startTime.getTime() + (session.duration * 60 * 1000));
      
      let title = 'Available Session';
      let backgroundColor = '#3b82f6'; // Blue for available
      
      if (session.status === 'scheduled' || session.status === 'confirmed') {
        const clientName = session.client ? 
          `${session.client.firstName} ${session.client.lastName}` : 'Unknown Client';
        title = `Session - ${clientName}`;
        backgroundColor = '#10b981'; // Green for booked
      } else if (session.status === 'completed') {
        const clientName = session.client ? 
          `${session.client.firstName} ${session.client.lastName}` : 'Unknown Client';
        title = `Completed - ${clientName}`;
        backgroundColor = '#6b7280'; // Gray for completed
      } else if (session.status === 'cancelled') {
        title = 'Cancelled Session';
        backgroundColor = '#ef4444'; // Red for cancelled
      }
      
      return {
        id: session.id,
        title,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        backgroundColor,
        borderColor: backgroundColor,
        allDay: false,
        extendedProps: {
          sessionId: session.id,
          status: session.status,
          duration: session.duration,
          location: session.location,
          notes: session.notes,
          client: session.client,
          trainer: session.trainer,
          userId: session.userId,
          trainerId: session.trainerId
        }
      };
    });
    
    res.status(200).json({
      success: true,
      data: calendarEvents
    });
    
  } catch (error) {
    console.error("Error fetching calendar events:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error fetching calendar events" 
    });
  }
});

/**
 * @route   PUT /api/sessions/drag-drop/:id
 * @desc    Optimized endpoint for drag-and-drop session updates
 * @access  Private (Admin Only)
 */
router.put("/drag-drop/:id", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { id } = req.params;
    const { sessionDate, duration, trainerId, userId } = req.body;
    
    const session = await Session.findByPk(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }
    
    // Update only the fields that can be changed via drag-and-drop
    if (sessionDate) {
      session.sessionDate = new Date(sessionDate);
    }
    
    if (duration) {
      session.duration = duration;
    }
    
    if (trainerId !== undefined) {
      session.trainerId = trainerId;
      if (trainerId) {
        session.assignedBy = req.user.id;
        session.assignedAt = new Date();
      }
    }
    
    if (userId !== undefined) {
      session.userId = userId;
      // Update status based on assignment
      if (userId && session.status === 'available') {
        session.status = 'scheduled';
      } else if (!userId && session.status === 'scheduled') {
        session.status = 'available';
      }
    }
    
    await session.save();
    
    // Fetch updated session with relations for response
    const updatedSession = await Session.findByPk(id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo']
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      message: "Session updated successfully",
      data: updatedSession
    });
    
  } catch (error) {
    console.error("Error in drag-drop update:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error updating session" 
    });
  }
});

/**
 * @route   GET /api/sessions/utilization-stats
 * @desc    Get detailed utilization statistics by time period
 * @access  Private (Admin Only)
 */
router.get("/utilization-stats", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const { period = 'week', trainerId } = req.query;
    
    let periodStart, periodEnd, groupBy;
    
    // Define period and grouping
    switch (period) {
      case 'day':
        periodStart = new Date();
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date();
        periodEnd.setHours(23, 59, 59, 999);
        groupBy = Session.sequelize.fn('DATE_FORMAT', Session.sequelize.col('sessionDate'), '%H');
        break;
      case 'week':
        periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - 7);
        periodEnd = new Date();
        groupBy = Session.sequelize.fn('DATE_FORMAT', Session.sequelize.col('sessionDate'), '%Y-%m-%d');
        break;
      case 'month':
        periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - 30);
        periodEnd = new Date();
        groupBy = Session.sequelize.fn('DATE_FORMAT', Session.sequelize.col('sessionDate'), '%Y-%m-%d');
        break;
      default:
        periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - 7);
        periodEnd = new Date();
        groupBy = Session.sequelize.fn('DATE_FORMAT', Session.sequelize.col('sessionDate'), '%Y-%m-%d');
    }
    
    const filter = {
      sessionDate: {
        [Op.between]: [periodStart, periodEnd]
      }
    };
    
    if (trainerId) {
      filter.trainerId = trainerId;
    }
    
    const utilizationData = await Session.findAll({
      where: filter,
      attributes: [
        [groupBy, 'period'],
        'status',
        [Session.sequelize.fn('COUNT', Session.sequelize.col('id')), 'count']
      ],
      group: [groupBy, 'status'],
      order: [[Session.sequelize.literal('period'), 'ASC']]
    });
    
    // Transform data for chart display
    const chartData = {};
    utilizationData.forEach(item => {
      const period = item.dataValues.period;
      const status = item.dataValues.status;
      const count = parseInt(item.dataValues.count);
      
      if (!chartData[period]) {
        chartData[period] = { period };
      }
      
      chartData[period][status] = count;
    });
    
    const formattedData = Object.values(chartData);
    
    res.status(200).json({
      success: true,
      data: {
        utilizationData: formattedData,
        period,
        dateRange: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error("Error fetching utilization stats:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error fetching utilization statistics" 
    });
  }
});


/**
 * @route   PUT /api/sessions/assign/:sessionId
 * @desc    Admin route: Assign a trainer to a session with real-time updates
 * @access  Private (Admin Only)
 */
router.put("/assign/:sessionId", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { sessionId } = req.params;
    const { trainerId } = req.body;
    
    if (!trainerId) {
      return res.status(400).json({ 
        success: false,
        message: "Trainer ID is required" 
      });
    }
    
    // Verify trainer exists and has trainer role
    const trainer = await User.findOne({
      where: { id: trainerId, role: 'trainer' }
    });
    
    if (!trainer) {
      return res.status(404).json({ 
        success: false,
        message: "Trainer not found or user does not have trainer role" 
      });
    }
    
    // Find the session
    const session = await Session.findByPk(sessionId, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          required: false
        }
      ]
    });
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        message: "Session not found" 
      });
    }
    
    // Store previous trainer for notifications
    const previousTrainerId = session.trainerId;
    
    // Assign trainer
    session.trainerId = trainerId;
    
    // If session was requested, update to scheduled
    if (session.status === 'requested') {
      session.status = 'scheduled';
    }
    
    await session.save();
    
    // Send notifications to all relevant parties
    try {
      // Notify new trainer
      if (trainer.email) {
        await sendEmailNotification({
          to: trainer.email,
          subject: "Session Assignment - SwanStudios",
          text: `You have been assigned a training session on ${new Date(session.sessionDate).toLocaleString()}`,
          html: `
            <h2>Session Assignment</h2>
            <p>You have been assigned a training session:</p>
            <ul>
              <li><strong>Date & Time:</strong> ${new Date(session.sessionDate).toLocaleString()}</li>
              <li><strong>Duration:</strong> ${session.duration} minutes</li>
              <li><strong>Location:</strong> ${session.location || 'Main Studio'}</li>
              ${session.client ? `<li><strong>Client:</strong> ${session.client.firstName} ${session.client.lastName}</li>` : ''}
            </ul>
            <p>Please check your schedule for additional details.</p>
          `
        });
      }
      
      // Notify client if session has a client
      if (session.client && session.client.email) {
        await sendEmailNotification({
          to: session.client.email,
          subject: "Trainer Assigned - SwanStudios",
          text: `${trainer.firstName} ${trainer.lastName} has been assigned to your session on ${new Date(session.sessionDate).toLocaleString()}`,
          html: `
            <h2>Trainer Assignment</h2>
            <p><strong>${trainer.firstName} ${trainer.lastName}</strong> has been assigned to your session:</p>
            <ul>
              <li><strong>Date & Time:</strong> ${new Date(session.sessionDate).toLocaleString()}</li>
              <li><strong>Duration:</strong> ${session.duration} minutes</li>
              <li><strong>Location:</strong> ${session.location || 'Main Studio'}</li>
            </ul>
            <p>Your trainer will contact you with any additional information.</p>
          `
        });
      }
    } catch (notificationError) {
      logger.error('Error sending assignment notifications:', notificationError);
      // Continue execution - assignment succeeded even if notifications failed
    }
    
    // Broadcast real-time assignment event
    realTimeScheduleService.broadcastTrainerAssignment({
      sessionId: session.id,
      trainerId,
      previousTrainerId,
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    });
    
    // Fetch updated session with all associations
    const updatedSession = await Session.findByPk(sessionId, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo'],
          required: false
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 'specialties', 'bio'],
          required: false
        }
      ]
    });
    
    res.status(200).json({ 
      success: true,
      message: "Trainer assigned successfully", 
      session: updatedSession,
      assignment: {
        trainerId,
        trainerName: `${trainer.firstName} ${trainer.lastName}`,
        assignedBy: req.user.id,
        assignedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error("Error assigning trainer:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error assigning trainer",
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/sessions/confirm/:sessionId
 * @desc    Confirm a session (Admin/Trainer only) with enhanced notifications
 * @access  Private (Admin/Trainer Only)
 */
router.put("/confirm/:sessionId", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    
    // Check permission - admin or trainer only
    if (req.user.role !== "admin" && req.user.role !== "trainer") {
      return res.status(403).json({ 
        success: false,
        message: "Admin or trainer access required" 
      });
    }
    
    const { sessionId } = req.params;
    const { notes } = req.body; // Optional confirmation notes
    
    const session = await Session.findByPk(sessionId, {
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
      ]
    });
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        message: "Session not found" 
      });
    }
    
    // Additional check for trainers - they can only confirm sessions assigned to them
    if (req.user.role === "trainer" && session.trainerId !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: "You can only confirm sessions assigned to you" 
      });
    }
    
    // Check if session can be confirmed
    if (!['scheduled', 'requested'].includes(session.status)) {
      return res.status(400).json({
        success: false,
        message: "Only scheduled or requested sessions can be confirmed"
      });
    }
    
    // Update session
    session.confirmed = true;
    session.status = "confirmed";
    session.confirmedBy = req.user.id;
    session.confirmationDate = new Date();
    
    if (notes) {
      session.confirmationNotes = notes;
    }
    
    await session.save();
    
    // Send confirmation notification to client
    if (session.client) {
      const notifyClient = session.notifyClient !== false;
      try {
        if (session.client.email && shouldNotifyClient({ user: session.client, channel: 'email', notifyClient })) {
          await sendEmailNotification({
            to: session.client.email,
            subject: "Session Confirmed - SwanStudios",
            text: `Your training session on ${new Date(session.sessionDate).toLocaleString()} has been confirmed.`,
            html: `
              <h2>Session Confirmation</h2>
              <p>Your training session has been confirmed:</p>
              <ul>
                <li><strong>Date & Time:</strong> ${new Date(session.sessionDate).toLocaleString()}</li>
                <li><strong>Duration:</strong> ${session.duration} minutes</li>
                <li><strong>Location:</strong> ${session.location || 'Main Studio'}</li>
                ${session.trainer ? `<li><strong>Trainer:</strong> ${session.trainer.firstName} ${session.trainer.lastName}</li>` : ''}
              </ul>
              ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ''}
              <p><strong>Please arrive 10 minutes early for your session.</strong></p>
            `
          });
        }

        if (shouldNotifyClient({ user: session.client, channel: 'push', notifyClient })) {
          logger.info(`Push notification queued for user ${session.client.id}: session confirmed`);
        }
      } catch (notificationError) {
        logger.error('Error sending confirmation notification:', notificationError);
      }
    }
    
    // Broadcast real-time confirmation event
    realTimeScheduleService.broadcastSessionConfirmation({
      sessionId: session.id,
      confirmedBy: req.user.id,
      confirmedByRole: req.user.role,
      timestamp: new Date().toISOString(),
      clientId: session.userId,
      trainerId: session.trainerId
    });
    
    res.status(200).json({ 
      success: true,
      message: "Session confirmed successfully", 
      session: {
        id: session.id,
        status: session.status,
        confirmed: session.confirmed,
        confirmedBy: session.confirmedBy,
        confirmationDate: session.confirmationDate,
        confirmationNotes: session.confirmationNotes
      }
    });
    
  } catch (error) {
    logger.error("Error confirming session:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error confirming session",
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/sessions/book
 * @desc    Book an available session with enhanced validation and notifications
 * @access  Private (Client)
 */
router.post("/book", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { sessionId, notes } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ 
        success: false,
        message: "Session ID is required" 
      });
    }
    
    // Find available session
    const session = await Session.findOne({ 
      where: { 
        id: sessionId, 
        status: 'available' 
      },
      include: [
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          required: false
        }
      ]
    });
    
    if (!session) {
      return res.status(400).json({ 
        success: false,
        message: "Session is not available for booking" 
      });
    }
    
    // Check if session is in the past
    if (new Date(session.sessionDate) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot book sessions in the past"
      });
    }
    
    // Get client information
    const client = await User.findByPk(req.user.id);
    if (!client) {
      return res.status(404).json({ 
        success: false,
        message: "Client not found" 
      });
    }
    
    // Book the session
    session.userId = client.id;
    session.status = "scheduled";
    session.bookingDate = new Date();
    
    if (notes) {
      session.notes = notes;
    }
    
    await session.save();
    
    // Broadcast real-time booking event
    realTimeScheduleService.broadcastSessionBooked(session, client);
    
    // Fetch updated session with all associations
    const updatedSession = await Session.findByPk(session.id, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo'],
          required: false
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo'],
          required: false
        }
      ]
    });
    
    res.status(200).json({ 
      success: true,
      message: "Session booked successfully", 
      session: updatedSession
    });
    
  } catch (error) {
    logger.error("Error booking session:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error booking session",
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/sessions/request
 * @desc    Request a custom session time with admin approval workflow
 * @access  Private (Client)
 */
router.post("/request", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { start, end, duration, notes, sessionType, location, preferredTrainerId } = req.body;
    
    if (!start) {
      return res.status(400).json({
        success: false,
        message: "Session start time is required"
      });
    }
    
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;
    
    // Validate dates
    if (isNaN(startDate.getTime()) || (endDate && isNaN(endDate.getTime()))) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }
    
    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Cannot request sessions in the past"
      });
    }
    
    // Get client information
    const client = await User.findByPk(req.user.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }
    
    // Create session request
    const sessionRequest = await Session.create({
      sessionDate: startDate,
      endDate: endDate,
      duration: duration || 60,
      status: 'requested',
      userId: client.id,
      trainerId: preferredTrainerId || null,
      notes: notes || null,
      sessionType: sessionType || 'Standard Training',
      location: location || 'Main Studio',
      confirmed: false,
      bookingDate: new Date()
    });
    
    // Broadcast real-time session request event
    realTimeScheduleService.broadcastSessionRequest({
      sessionId: sessionRequest.id,
      clientId: client.id,
      requestedDate: startDate.toISOString(),
      timestamp: new Date().toISOString()
    });
    
    res.status(201).json({ 
      success: true,
      message: "Session request submitted successfully", 
      session: sessionRequest
    });
    
  } catch (error) {
    logger.error("Error creating session request:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error creating session request",
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/sessions/:userId
 * @desc    CLIENT: Get all sessions scheduled by a user.
 * @access  Private
 */
router.get("/:userId", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { userId } = req.params;
    
    // Ensure users can only view their own sessions (unless admin)
    if (req.user.id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: "You can only view your own sessions." 
      });
    }

    const sessions = await Session.findAll({
      where: { 
        userId,
        // Optionally filter by date range if query params provided
        ...(req.query.startDate && req.query.endDate ? {
          sessionDate: {
            [Op.between]: [new Date(req.query.startDate), new Date(req.query.endDate)]
          }
        } : {})
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
    
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching user sessions:", error.message);
    res.status(500).json({ message: "Server error fetching sessions." });
  }
});

/**
 * @route   GET /api/sessions/admin/cancelled
 * @desc    ADMIN: Get all cancelled sessions with cancellation details
 * @access  Private (Admin only)
 */
router.get("/admin/cancelled", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();

    const {
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      chargeStatus // 'charged', 'uncharged', 'all'
    } = req.query;

    // Build where clause
    const whereClause = { status: 'cancelled' };

    // Date range filter
    if (startDate && endDate) {
      whereClause.cancellationDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Charge status filter
    if (chargeStatus === 'charged') {
      whereClause.cancellationChargedAt = { [Op.ne]: null };
    } else if (chargeStatus === 'uncharged') {
      whereClause.cancellationChargedAt = null;
    }

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
        }
      ],
      order: [['cancellationDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Process each session to add derived fields
    const processedSessions = cancelledSessions.map(session => {
      const sessionData = session.toJSON();

      // Calculate if it was a late cancellation (within 24 hours)
      const sessionTime = new Date(sessionData.sessionDate);
      const cancellationTime = new Date(sessionData.cancellationDate);
      const hoursUntilSession = (sessionTime - cancellationTime) / (1000 * 60 * 60);
      const isLateCancellation = hoursUntilSession < 24 && hoursUntilSession >= 0;

      // Calculate if charge is pending (late cancellation but not charged)
      const chargePending = isLateCancellation &&
        !sessionData.cancellationChargedAt &&
        sessionData.cancellationChargeType !== 'none';

      return {
        ...sessionData,
        isLateCancellation,
        hoursUntilSession: Math.max(0, hoursUntilSession),
        chargePending,
        clientName: sessionData.client
          ? `${sessionData.client.firstName} ${sessionData.client.lastName}`
          : 'Unknown Client',
        trainerName: sessionData.trainer
          ? `${sessionData.trainer.firstName} ${sessionData.trainer.lastName}`
          : 'Unassigned'
      };
    });

    res.json({
      success: true,
      data: processedSessions,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + processedSessions.length) < count
      }
    });

  } catch (error) {
    logger.error("Error fetching cancelled sessions:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching cancelled sessions",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sessions/:sessionId/client-package-price
 * @desc    ADMIN: Get the client's package price per session for a cancelled session
 * @access  Private (Admin only)
 */
router.get("/:sessionId/client-package-price", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const Order = getOrder();
    const OrderItem = getOrderItem();
    const StorefrontItem = getStorefrontItem();

    const { sessionId } = req.params;

    const session = await Session.findByPk(sessionId, {
      include: [{
        model: User,
        as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    if (!session.userId) {
      return res.json({
        success: true,
        data: {
          sessionId: session.id,
          pricePerSession: null,
          packageName: null,
          fallbackPrice: session.duration >= 60 ? 175 : 100,
          sessionDuration: session.duration || 60,
          message: "No client associated with session"
        }
      });
    }

    // Look up client's package price from their most recent completed order
    let packagePricePerSession = null;
    let packageName = null;

    const clientOrder = await Order.findOne({
      where: {
        userId: session.userId,
        status: 'completed'
      },
      order: [['completedAt', 'DESC'], ['createdAt', 'DESC']],
      include: [{
        model: OrderItem,
        as: 'orderItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem',
          attributes: ['id', 'name', 'pricePerSession', 'sessions', 'totalSessions']
        }]
      }]
    });

    if (clientOrder && clientOrder.orderItems && clientOrder.orderItems.length > 0) {
      for (const item of clientOrder.orderItems) {
        if (item.storefrontItem && item.storefrontItem.pricePerSession) {
          packagePricePerSession = parseFloat(item.storefrontItem.pricePerSession);
          packageName = item.storefrontItem.name;
          break;
        }
      }
    }

    const sessionDuration = session.duration || 60;
    const fallbackPrice = sessionDuration >= 60 ? 175 : 100;

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        clientId: session.userId,
        clientName: session.client ? `${session.client.firstName || ''} ${session.client.lastName || ''}`.trim() : null,
        pricePerSession: packagePricePerSession,
        packageName: packageName,
        fallbackPrice: fallbackPrice,
        sessionDuration: sessionDuration,
        defaultChargeAmount: packagePricePerSession || fallbackPrice,
        lateFeeAmount: Math.round((packagePricePerSession || fallbackPrice) * 0.5)
      }
    });
  } catch (error) {
    logger.error("Error fetching client package price:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch client package price",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/sessions/:sessionId/charge-cancellation
 * @desc    ADMIN: Charge a client for a late cancellation
 * @access  Private (Admin only)
 */
router.post("/:sessionId/charge-cancellation", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { sessionId } = req.params;
    const { chargeType = 'late_fee', chargeAmount } = req.body;

    const session = await Session.findByPk(sessionId, {
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    if (session.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: "Only cancelled sessions can be charged"
      });
    }

    if (session.cancellationChargedAt) {
      return res.status(400).json({
        success: false,
        message: "This cancellation has already been charged"
      });
    }

    // Handle 'none' chargeType - mark as processed without charging
    if (chargeType === 'none') {
      session.cancellationChargeType = 'none';
      session.cancellationChargeAmount = 0;
      session.cancellationChargedAt = new Date();
      await session.save();

      logger.info(`Cancellation marked as no charge for session ${sessionId}`, {
        sessionId,
        chargeType: 'none',
        processedBy: req.user.id
      });

      return res.json({
        success: true,
        message: "Cancellation processed - no charge applied",
        data: {
          sessionId: session.id,
          chargeType: 'none',
          chargeAmount: 0,
          chargedAt: session.cancellationChargedAt
        }
      });
    }

    // Look up client's package price from their most recent completed order
    let packagePricePerSession = null;
    let packageDuration = 60; // Default 60 minutes

    if (session.userId) {
      try {
        const Order = getOrder();
        const OrderItem = getOrderItem();
        const StorefrontItem = getStorefrontItem();

        const clientOrder = await Order.findOne({
          where: {
            userId: session.userId,
            status: 'completed'
          },
          order: [['completedAt', 'DESC'], ['createdAt', 'DESC']],
          include: [{
            model: OrderItem,
            as: 'orderItems',
            include: [{
              model: StorefrontItem,
              as: 'storefrontItem',
              attributes: ['id', 'name', 'pricePerSession', 'sessions', 'totalSessions']
            }]
          }]
        });

        if (clientOrder && clientOrder.orderItems && clientOrder.orderItems.length > 0) {
          // Find the first order item with a storefront item that has pricePerSession
          for (const item of clientOrder.orderItems) {
            if (item.storefrontItem && item.storefrontItem.pricePerSession) {
              packagePricePerSession = parseFloat(item.storefrontItem.pricePerSession);
              logger.info(`Found client package price: $${packagePricePerSession}`, {
                sessionId,
                userId: session.userId,
                storefrontItemId: item.storefrontItem.id,
                packageName: item.storefrontItem.name
              });
              break;
            }
          }
        }
      } catch (orderError) {
        logger.warn(`Could not fetch client package price: ${orderError.message}`, {
          sessionId,
          userId: session.userId
        });
      }
    }

    // Determine session duration for fallback pricing
    const sessionDuration = session.duration || 60;

    // Default charge amount based on type
    let actualChargeAmount = chargeAmount;
    if (!actualChargeAmount && actualChargeAmount !== 0) {
      // Use package price if available, otherwise use duration-based defaults
      const defaultRate = packagePricePerSession || (sessionDuration >= 60 ? 175 : 100);

      switch (chargeType) {
        case 'full':
          actualChargeAmount = defaultRate; // Full session rate from package
          break;
        case 'late_fee':
          actualChargeAmount = Math.round(defaultRate * 0.5); // 50% for late fee
          break;
        case 'partial':
          actualChargeAmount = Math.round(defaultRate * 0.5); // Half session
          break;
        default:
          actualChargeAmount = Math.round(defaultRate * 0.5); // Default to 50%
      }
    }

    // Update session with charge details
    session.cancellationChargeType = chargeType;
    session.cancellationChargeAmount = actualChargeAmount;
    session.cancellationChargedAt = new Date();
    await session.save();

    // Send notification to client
    if (session.client && session.client.email) {
      const sessionDateFormatted = moment(session.sessionDate).format('MMMM D, YYYY [at] h:mm A');

      try {
        await sendEmailNotification({
          to: session.client.email,
          subject: 'Swan Studios - Cancellation Charge Applied',
          text: `A cancellation charge of $${actualChargeAmount} has been applied to your cancelled session from ${sessionDateFormatted}.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a2e;">Cancellation Charge Applied</h2>
              <p>A cancellation charge has been applied to your account for the following session:</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p><strong>Session Date:</strong> ${sessionDateFormatted}</p>
                <p><strong>Charge Type:</strong> ${chargeType === 'late_fee' ? 'Late Cancellation Fee' : chargeType === 'full' ? 'Full Session Charge' : 'Partial Charge'}</p>
                <p><strong>Amount:</strong> $${actualChargeAmount}</p>
              </div>
              <p>If you have any questions, please contact us.</p>
            </div>
          `
        });
      } catch (emailError) {
        logger.warn("Failed to send charge notification email:", emailError);
      }
    }

    logger.info(`Cancellation charge applied to session ${sessionId}`, {
      sessionId,
      chargeType,
      chargeAmount: actualChargeAmount,
      chargedBy: req.user.id
    });

    res.json({
      success: true,
      message: "Cancellation charge applied successfully",
      data: {
        sessionId: session.id,
        chargeType: session.cancellationChargeType,
        chargeAmount: session.cancellationChargeAmount,
        chargedAt: session.cancellationChargedAt
      }
    });

  } catch (error) {
    logger.error("Error charging cancellation:", error);
    res.status(500).json({
      success: false,
      message: "Server error processing cancellation charge",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sessions/export
 * @desc    ADMIN: Export sessions to CSV format
 * @access  Private (Admin only)
 */
router.get("/export", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { startDate, endDate, status, trainerId, format = 'csv' } = req.query;

    // Build filter criteria
    const whereClause = {};

    if (startDate && endDate) {
      whereClause.sessionDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.sessionDate = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      whereClause.sessionDate = { [Op.lte]: new Date(endDate) };
    }

    if (status) {
      whereClause.status = status;
    }

    if (trainerId) {
      whereClause.trainerId = trainerId;
    }

    // Fetch sessions with associations
    const sessions = await Session.findAll({
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
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        }
      ],
      order: [['sessionDate', 'ASC']]
    });

    if (format === 'json') {
      return res.json({
        success: true,
        count: sessions.length,
        data: sessions
      });
    }

    // Generate CSV
    const csvHeaders = [
      'Session ID',
      'Date',
      'Time',
      'Duration (min)',
      'Status',
      'Client Name',
      'Client Email',
      'Client Phone',
      'Trainer Name',
      'Trainer Email',
      'Location',
      'Notes',
      'Cancellation Reason',
      'Cancellation Charge Type',
      'Cancellation Charge Amount'
    ].join(',');

    const csvRows = sessions.map(session => {
      const sessionDate = new Date(session.sessionDate);
      const clientName = session.client
        ? `${session.client.firstName || ''} ${session.client.lastName || ''}`.trim()
        : '';
      const trainerName = session.trainer
        ? `${session.trainer.firstName || ''} ${session.trainer.lastName || ''}`.trim()
        : '';

      return [
        session.id,
        sessionDate.toLocaleDateString(),
        sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        session.duration || 60,
        session.status,
        `"${clientName}"`,
        session.client?.email || '',
        session.client?.phone || '',
        `"${trainerName}"`,
        session.trainer?.email || '',
        `"${session.location || ''}"`,
        `"${(session.notes || '').replace(/"/g, '""')}"`,
        `"${(session.cancellationReason || '').replace(/"/g, '""')}"`,
        session.cancellationChargeType || '',
        session.cancellationChargeAmount || ''
      ].join(',');
    });

    const csvContent = [csvHeaders, ...csvRows].join('\n');

    // Set headers for CSV download
    const filename = `sessions-export-${moment().format('YYYY-MM-DD')}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

    logger.info(`Sessions exported to CSV by admin ${req.user.id}`, {
      count: sessions.length,
      filters: { startDate, endDate, status, trainerId }
    });

  } catch (error) {
    logger.error("Error exporting sessions:", error);
    res.status(500).json({
      success: false,
      message: "Server error exporting sessions",
      error: error.message
    });
  }
});

/**
 * @route   POST /api/sessions/:sessionId/feedback
 * @desc    CLIENT: Submit feedback for a completed session
 * @access  Private (Client who attended the session)
 */
router.post("/:sessionId/feedback", protect, async (req, res) => {
  try {
    const Session = getSession();
    const { sessionId } = req.params;
    const { rating, comment, wouldRecommend } = req.body;
    const userId = req.user.id;

    // Find the session
    const session = await Session.findByPk(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found"
      });
    }

    // Verify user is the client of this session or admin
    if (session.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You can only leave feedback for your own sessions"
      });
    }

    // Only allow feedback for completed sessions
    if (session.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: "Feedback can only be submitted for completed sessions"
      });
    }

    // Check if feedback already exists
    if (session.feedbackProvided) {
      return res.status(400).json({
        success: false,
        message: "Feedback has already been submitted for this session"
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Save feedback (uses existing model fields: rating, feedback, feedbackProvided)
    session.rating = rating;
    session.feedback = comment || null;
    session.feedbackProvided = true;
    await session.save();

    logger.info(`Feedback submitted for session ${sessionId}`, {
      sessionId,
      rating,
      userId
    });

    res.json({
      success: true,
      message: "Thank you for your feedback!",
      data: {
        sessionId: session.id,
        rating: session.rating,
        feedbackProvided: session.feedbackProvided
      }
    });

  } catch (error) {
    logger.error("Error submitting feedback:", error);
    res.status(500).json({
      success: false,
      message: "Server error submitting feedback",
      error: error.message
    });
  }
});

/**
 * @route   GET /api/sessions/trainer/:trainerId/feedback-summary
 * @desc    ADMIN: Get feedback summary for a trainer
 * @access  Private (Admin only)
 */
router.get("/trainer/:trainerId/feedback-summary", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { trainerId } = req.params;

    // Get all sessions with feedback for this trainer
    const sessions = await Session.findAll({
      where: {
        trainerId,
        feedbackProvided: true,
        rating: { [Op.ne]: null }
      },
      attributes: ['rating', 'feedback', 'feedbackProvided', 'sessionDate', 'updatedAt'],
      order: [['updatedAt', 'DESC']]
    });

    if (sessions.length === 0) {
      return res.json({
        success: true,
        data: {
          trainerId,
          totalFeedback: 0,
          averageRating: null,
          recentFeedback: []
        }
      });
    }

    // Calculate statistics
    const totalFeedback = sessions.length;
    const averageRating = sessions.reduce((sum, s) => sum + s.rating, 0) / totalFeedback;

    // Get 5 most recent feedback entries
    const recentFeedback = sessions
      .slice(0, 5)
      .map(s => ({
        rating: s.rating,
        comment: s.feedback,
        sessionDate: s.sessionDate,
        submittedAt: s.updatedAt
      }));

    res.json({
      success: true,
      data: {
        trainerId,
        totalFeedback,
        averageRating: Math.round(averageRating * 10) / 10,
        recentFeedback
      }
    });

  } catch (error) {
    logger.error("Error fetching feedback summary:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching feedback summary",
      error: error.message
    });
  }
});

export default router;


