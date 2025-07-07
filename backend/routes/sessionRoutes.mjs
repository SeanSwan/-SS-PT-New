/**
 * sessionRoutes.mjs
 * ================
 * Express routes for session management including creation, booking,
 * rescheduling, and cancellation.
 */

import express from "express";
const router = express.Router(); // Define router first

import { protect, adminOnly } from "../middleware/authMiddleware.mjs";
import Session from "../models/Session.mjs";
import User from "../models/User.mjs";
import { Op } from "sequelize";
import stripe from "stripe";
import moment from "moment";
import {
  sendEmailNotification,
  sendSmsNotification, // Correct case matches the export in notification.mjs
} from "../utils/notification.mjs";
import sessionAllocationService from '../services/SessionAllocationService.mjs';
import trainerAssignmentService from '../services/TrainerAssignmentService.mjs';

// Session management test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Session API is working!' });
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
 */
router.post("/book/:userId", protect, async (req, res) => {
  try {
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

    // Update session details to mark as scheduled
    session.userId = userId;
    session.status = "scheduled";
    await session.save();

    // Notify the user via email and SMS if user exists
    const user = await User.findByPk(userId);
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

export default router;