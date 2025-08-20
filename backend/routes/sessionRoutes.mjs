/**
 * sessionRoutes.mjs
 * ================
 * Express routes for session management including creation, booking,
 * rescheduling, and cancellation.
 */

import express from "express";
const router = express.Router(); // Define router first

import { protect, adminOnly } from "../middleware/authMiddleware.mjs";
import { getSession, getUser } from "../models/index.mjs";
import { Op } from "sequelize";
import stripe from "stripe";
import moment from "moment";
import {
  sendEmailNotification,
  sendSmsNotification, // Correct case matches the export in notification.mjs
} from "../utils/notification.mjs";
import sessionAllocationService from '../services/SessionAllocationService.mjs';
import trainerAssignmentService from '../services/TrainerAssignmentService.mjs';

// Import Real-Time Schedule Service for WebSocket broadcasting
import realTimeScheduleService from '../services/realTimeScheduleService.mjs';
import logger from '../utils/logger.mjs';

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
    const statistics = await trainerAssignmentService.getAssignmentStatistics();
    
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

// Initialize router and Stripe instance using secret key from environment variables

const stripeInstance = process.env.STRIPE_SECRET_KEY ? 
  stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * @route   GET /api/sessions
 * @desc    Get all sessions with client and trainer info (admin view)
 * @access  Private (Admin Only)
 */
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    
    const sessions = await Session.findAll({
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 'availableSessions']
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'photo', 'specialties']
        }
      ],
      order: [['sessionDate', 'ASC']]
    });
    
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error.message);
    res.status(500).json({ message: "Server error fetching sessions." });
  }
});

/**
 * @route   POST /api/sessions/admin/create
 * @desc    ADMIN: Create an available session slot.
 * @access  Private (Admin Only)
 */
router.post("/admin/create", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    
    const { sessionDate, notes, duration, location, trainerId } = req.body;

    // Prevent creating sessions in the past
    if (new Date(sessionDate) < new Date()) {
      return res
        .status(400)
        .json({ message: "Cannot create past session slots." });
    }

    const newSession = await Session.create({
      sessionDate,
      notes,
      duration: duration || 60,
      location,
      trainerId,
      status: "available",
      userId: null,
    });

    res.status(201).json({ 
      message: "Session slot created.", 
      session: newSession 
    });
  } catch (error) {
    console.error("Error creating session:", error.message);
    res.status(500).json({ message: "Server error creating session." });
  }
});

/**
 * @route   POST /api/sessions
 * @desc    Create a new session (admin version)
 * @access  Private (Admin Only)
 */
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { sessionDate, notes, duration, location, trainerId, userId, status } = req.body;

    const newSession = await Session.create({
      sessionDate,
      notes: notes || '',
      duration: duration || 60,
      location: location || 'Main Studio',
      trainerId: trainerId || null,
      userId: userId || null,
      status: status || 'available'
    });

    // Fetch the complete session with associated client and trainer
    const createdSession = await Session.findByPk(newSession.id, {
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

    res.status(201).json({
      message: "Session created successfully",
      session: createdSession
    });
  } catch (error) {
    console.error("Error creating session:", error.message);
    res.status(500).json({ message: "Server error creating session." });
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
      session: updatedSession
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

    // 🚨 CRITICAL FIX: Check and deduct available sessions BEFORE booking
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
      
      console.log(`✅ Session deducted for user ${userId}. Remaining sessions: ${user.availableSessions}`);
    }

    // Notify the user via email and SMS
    if (user) {
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
      await sendEmailNotification({
        to: user.email,
        subject: "Session Booked Successfully",
        text: `Your session has been booked for ${sessionDateFormatted}`,
        html: `<p>Your session has been booked for <strong>${sessionDateFormatted}</strong>.</p>
               <p>Location: ${session.location || 'Main Studio'}</p>
               <p>Please arrive 10 minutes before your session.</p>`
      });
      
      // Send SMS notification if the user has a phone number and SMS notifications enabled
      if (user.phone && user.smsNotifications !== false) {
        await sendSmsNotification({
          to: user.phone,
          body: `Swan Studios: Your session has been booked for ${sessionDateFormatted}. Please arrive 10 minutes early.`
        });
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
      
      // Send SMS if enabled
      if (user.phone && user.smsNotifications !== false) {
        await sendSmsNotification({
          to: user.phone,
          body: `Swan Studios: Your session has been rescheduled to ${sessionDateFormatted}. ${
            sessionDeducted ? "A session was deducted." : ""
          }`
        });
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
 * @route   DELETE /api/sessions/cancel/:sessionId
 * @desc    CLIENT: Cancel a scheduled session.
 * @access  Private
 */
router.delete("/cancel/:sessionId", protect, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    const { sessionId } = req.params;
    const { reason } = req.body;
    
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

      await sendEmailNotification({
        to: user.email,
        subject: "Session Cancelled",
        text: `Your session scheduled for ${sessionDateFormatted} has been cancelled.`,
        html: `<p>Your session scheduled for <strong>${sessionDateFormatted}</strong> has been cancelled.</p>
               <p>Reason: ${session.cancellationReason}</p>`
      });
      
      if (user.phone && user.smsNotifications !== false) {
        await sendSmsNotification({
          to: user.phone,
          body: `Swan Studios: Your session on ${sessionDateFormatted} has been cancelled.`
        });
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
 * @route   GET /api/sessions/analytics
 * @desc    Get session analytics for the current user
 * @access  Private
 */
router.get("/analytics", protect, async (req, res) => {
  try {
    const Session = getSession();
    const userId = req.user.id;
    
    // Get all completed sessions for the user
    const userSessions = await Session.findAll({
      where: {
        userId,
        status: 'completed'
      },
      order: [['sessionDate', 'DESC']]
    });

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
    console.error("Error fetching session analytics:", error.message);
    res.status(500).json({ 
      message: "Server error fetching analytics.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
 * Additional routes to add to your scheduleRoutes.mjs file
 */

/**
 * POST /api/schedule/available
 * Admin route: Create one or more available slots
 */
router.post("/available", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const { slots } = req.body;
    
    if (!slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ message: "No valid slots provided" });
    }
    
    const createdSlots = [];
    
    for (const slot of slots) {
      const { date, duration, trainerId, location } = slot;
      
      // Create a new session
      const newSession = await Session.create({
        sessionDate: new Date(date),
        duration: duration || 60,
        trainerId: trainerId || null,
        location: location || 'Main Studio',
        status: 'available'
      });
      
      createdSlots.push(newSession);
    }
    
    res.status(201).json({ 
      message: `${createdSlots.length} slot(s) created`,
      slots: createdSlots
    });
  } catch (error) {
    console.error("Error creating available slots:", error);
    res.status(500).json({ message: "Server error creating slots" });
  }
});

/**
 * POST /api/schedule/recurring
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
      duration 
    } = req.body;
    
    if (!startDate || !endDate || !daysOfWeek || !times || times.length === 0) {
      return res.status(400).json({ 
        message: "Missing required fields (startDate, endDate, daysOfWeek, times)" 
      });
    }
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return res.status(400).json({ message: "Start date must be before end date" });
    }
    
    // Create slots for each day and time
    const createdSlots = [];
    const currentDate = new Date(start);
    
    // Loop through days until we reach end date
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay(); // 0-6 (Sunday-Saturday)
      
      // Check if current day is in our requested days
      if (daysOfWeek.includes(dayOfWeek)) {
        // Create slots for each time on this day
        for (const time of times) {
          // Parse time (format: "HH:MM")
          const [hours, minutes] = time.split(":").map(Number);
          
          // Create slot date with correct time
          const slotDate = new Date(currentDate);
          slotDate.setHours(hours, minutes, 0, 0);
          
          // Create the session
          const newSession = await Session.create({
            sessionDate: slotDate,
            duration: duration || 60,
            trainerId: trainerId || null,
            location: location || 'Main Studio',
            status: 'available'
          });
          
          createdSlots.push(newSession);
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.status(201).json({ 
      message: `${createdSlots.length} recurring slots created`,
      count: createdSlots.length
    });
  } catch (error) {
    console.error("Error creating recurring slots:", error);
    res.status(500).json({ message: "Server error creating recurring slots" });
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
 * ========================================================================================
 * UNIVERSAL MASTER SCHEDULE - ENHANCED ADMIN ROUTES
 * ========================================================================================
 * Merged from scheduleRoutes.mjs.obsolete to provide comprehensive admin functionality
 * with real-time WebSocket integration and role-based access control
 */

/**
 * @route   GET /api/sessions/admin
 * @desc    Admin route: Get all sessions with detailed information for Universal Master Schedule
 * @access  Private (Admin Only)
 */
router.get("/admin", protect, adminOnly, async (req, res) => {
  try {
    const Session = getSession();
    const User = getUser();
    
    // Enhanced query with filtering options for Universal Master Schedule
    const { startDate, endDate, status, trainerId, clientId } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Date range filter
    if (startDate && endDate) {
      filter.sessionDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      filter.sessionDate = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      filter.sessionDate = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Status filter
    if (status) {
      if (Array.isArray(status)) {
        filter.status = { [Op.in]: status };
      } else {
        filter.status = status;
      }
    }
    
    // Trainer filter
    if (trainerId) {
      filter.trainerId = trainerId;
    }
    
    // Client filter  
    if (clientId) {
      filter.userId = clientId;
    }
    
    const sessions = await Session.findAll({
      where: filter,
      include: [
        {
          model: User,
          as: 'client',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 'availableSessions'],
          required: false
        },
        {
          model: User,
          as: 'trainer',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 'specialties', 'bio'],
          required: false
        }
      ],
      order: [['sessionDate', 'ASC']]
    });
    
    // Log admin data access for security monitoring
    logger.info(`Admin ${req.user.id} accessed session data`, {
      adminId: req.user.id,
      sessionCount: sessions.length,
      filters: { startDate, endDate, status, trainerId, clientId },
      timestamp: new Date().toISOString()
    });
    
    // Broadcast real-time admin data access event
    realTimeScheduleService.broadcastAdminEvent({
      type: 'admin:dataAccess',
      adminId: req.user.id,
      sessionCount: sessions.length,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({
      success: true,
      sessions,
      meta: {
        total: sessions.length,
        filters: filter,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error("Error fetching admin schedule data:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error fetching admin schedule data",
      error: error.message 
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
    if (session.client && session.client.email) {
      try {
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
    realTimeScheduleService.broadcastSessionBooking({
      sessionId: session.id,
      clientId: client.id,
      trainerId: session.trainerId,
      timestamp: new Date().toISOString()
    });
    
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

export default router;