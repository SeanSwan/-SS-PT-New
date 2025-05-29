/**
 * scheduleRoutes.mjs
 * ==================
 * Express routes for client and admin calendar schedule management.
 * Handles retrieving, booking, and cancelling sessions.
 */

import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.mjs";
import Session from "../models/Session.mjs";
import User from "../models/User.mjs";
import { Op } from "sequelize";
import { sendEmailNotification, sendSmsNotification } from "../utils/notification.mjs";

const router = express.Router();

/**
 * GET /api/schedule
 * Protected route: returns all sessions.
 * Includes associated user details (name, phone, photo if available) for admin view.
 */
router.get("/", protect, async (req, res) => {
  try {
    // First, try to fetch sessions with associations
    let sessions;
    
    try {
      // Try with associations first
      sessions = await Session.findAll({
        include: [
          {
            model: User,
            as: 'client', // Match the association name in setupAssociations.mjs
            attributes: ['id', 'firstName', 'lastName', 'phone', 'photo'],
            required: false // Make it a LEFT JOIN so we get available sessions too
          },
          {
            model: User,
            as: 'trainer', // Match the association name in setupAssociations.mjs
            attributes: ['id', 'firstName', 'lastName', 'phone', 'photo', 'specialties'],
            required: false // Make it a LEFT JOIN
          }
        ],
        order: [['sessionDate', 'ASC']] // Sort by date
      });
    } catch (associationError) {
      console.warn('Session associations not available, fetching basic session data:', associationError.message);
      
      // Fallback: fetch sessions without associations
      sessions = await Session.findAll({
        order: [['sessionDate', 'ASC']]
      });
      
      // Manually add user data if needed
      for (let session of sessions) {
        if (session.userId) {
          try {
            const client = await User.findByPk(session.userId, {
              attributes: ['id', 'firstName', 'lastName', 'phone', 'photo']
            });
            session.dataValues.client = client;
          } catch (err) {
            console.warn('Could not fetch client for session:', err.message);
          }
        }
        
        if (session.trainerId) {
          try {
            const trainer = await User.findByPk(session.trainerId, {
              attributes: ['id', 'firstName', 'lastName', 'phone', 'photo', 'specialties']
            });
            session.dataValues.trainer = trainer;
          } catch (err) {
            console.warn('Could not fetch trainer for session:', err.message);
          }
        }
      }
    }
    
    res.json({
      success: true,
      sessions: sessions,
      message: sessions.length === 0 ? 'No sessions found' : `Found ${sessions.length} sessions`
    });
  } catch (error) {
    console.error("Error fetching schedule:", error.message);
    res.status(500).json({ 
      success: false,
      message: "Server error fetching sessions.",
      error: error.message
    });
  }
});

/**
 * POST /api/schedule/book
 * Protected route: allows a logged-in client to book an available session.
 */
router.post("/book", protect, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await Session.findOne({ 
      where: { id: sessionId, status: 'available' } 
    });
    
    if (!session) {
      return res.status(400).json({ message: "Session is not available for booking." });
    }
    
    // Assign the session to the client and update status
    session.userId = req.user.id;
    session.status = "scheduled";
    await session.save();
    
    // Get the user for notification
    const user = await User.findByPk(req.user.id);
    
    // Send notification
    if (user) {
      await sendEmailNotification({
        to: user.email,
        subject: "Session Booked Successfully",
        text: `Your session has been booked for ${new Date(session.sessionDate).toLocaleString()}`,
        html: `<p>Your session has been booked for <strong>${new Date(session.sessionDate).toLocaleString()}</strong>.</p>`
      });
      
      if (user.phone && user.smsNotifications) {
        await sendSmsNotification({
          to: user.phone,
          body: `Swan Studios: Your session has been booked for ${new Date(session.sessionDate).toLocaleString()}`
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
 * POST /api/schedule/request
 * Protected route: allows a client to request a new session for an empty slot.
 * Creates a new session with status 'requested'.
 */
router.post("/request", protect, async (req, res) => {
  try {
    const { start, duration, notes } = req.body;
    
    // Create a new session request
    const newSession = await Session.create({
      sessionDate: new Date(start),
      duration: duration || 60,
      status: "requested",
      userId: req.user.id,
      notes
    });
    
    // Get the user for notification
    const user = await User.findByPk(req.user.id);
    
    // Notify admin about the request
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
    
    for (const email of adminEmails) {
      await sendEmailNotification({
        to: email,
        subject: "New Session Request",
        text: `${user.firstName} ${user.lastName} has requested a session on ${new Date(start).toLocaleString()}`,
        html: `<p><strong>${user.firstName} ${user.lastName}</strong> has requested a session on <strong>${new Date(start).toLocaleString()}</strong>.</p>
               <p>Please review and confirm this request in the admin dashboard.</p>`
      });
    }
    
    res.status(201).json({ 
      message: "Session request submitted.", 
      session: newSession 
    });
  } catch (error) {
    console.error("Error requesting session:", error.message);
    res.status(500).json({ message: "Server error requesting session." });
  }
});

/**
 * PUT /api/schedule/assign/:sessionId
 * Admin route: allows assigning a trainer to a session.
 */
router.put("/assign/:sessionId", protect, adminOnly, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { trainerId } = req.body;
    
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    
    // Assign trainer
    session.trainerId = trainerId;
    
    // If was requested, update to scheduled
    if (session.status === 'requested') {
      session.status = 'scheduled';
    }
    
    await session.save();
    
    // Get trainer and client for notifications
    const trainer = await User.findByPk(trainerId);
    const client = session.userId ? await User.findByPk(session.userId) : null;
    
    // Notify trainer
    if (trainer && trainer.email) {
      await sendEmailNotification({
        to: trainer.email,
        subject: "Session Assignment",
        text: `You have been assigned a session on ${new Date(session.sessionDate).toLocaleString()}`,
        html: `<p>You have been assigned a session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong>.</p>
               <p>Please check your schedule for details.</p>`
      });
    }
    
    // Notify client if exists
    if (client && client.email) {
      await sendEmailNotification({
        to: client.email,
        subject: "Trainer Assigned to Your Session",
        text: `${trainer.firstName} ${trainer.lastName} has been assigned to your session on ${new Date(session.sessionDate).toLocaleString()}`,
        html: `<p><strong>${trainer.firstName} ${trainer.lastName}</strong> has been assigned to your session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong>.</p>`
      });
    }
    
    res.json({ 
      message: "Trainer assigned successfully.", 
      session 
    });
  } catch (error) {
    console.error("Error assigning trainer:", error.message);
    res.status(500).json({ message: "Server error assigning trainer." });
  }
});

/**
 * DELETE /api/schedule/cancel/:sessionId
 * Protected route: allows a client to cancel their own booking.
 */
router.delete("/cancel/:sessionId", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findByPk(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    
    // Check if user is authorized to cancel
    if (session.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "You are not authorized to cancel this session." });
    }
    
    // Store cancelled by info
    session.cancelledBy = req.user.id;
    session.status = "cancelled";
    session.cancellationReason = req.body.reason || "No reason provided";
    
    await session.save();
    
    // Notify relevant parties
    const client = session.userId ? await User.findByPk(session.userId) : null;
    const trainer = session.trainerId ? await User.findByPk(session.trainerId) : null;
    
    // Notify client if they didn't cancel themselves
    if (client && client.email && client.id !== req.user.id) {
      await sendEmailNotification({
        to: client.email,
        subject: "Session Cancelled",
        text: `Your session on ${new Date(session.sessionDate).toLocaleString()} has been cancelled.`,
        html: `<p>Your session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong> has been cancelled.</p>
               <p>Reason: ${session.cancellationReason}</p>`
      });
    }
    
    // Notify trainer if they exist and didn't cancel
    if (trainer && trainer.email && trainer.id !== req.user.id) {
      await sendEmailNotification({
        to: trainer.email,
        subject: "Session Cancelled",
        text: `The session on ${new Date(session.sessionDate).toLocaleString()} has been cancelled.`,
        html: `<p>The session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong> has been cancelled.</p>
               <p>Reason: ${session.cancellationReason}</p>`
      });
    }
    
    res.json({ 
      message: "Session cancelled successfully.", 
      session 
    });
  } catch (error) {
    console.error("Error cancelling session:", error.message);
    res.status(500).json({ message: "Server error cancelling session." });
  }
});

/**
 * PUT /api/schedule/confirm/:sessionId
 * Protected route: allows an admin to mark a session as confirmed.
 */
router.put("/confirm/:sessionId", protect, async (req, res) => {
  try {
    // Ensure only admin users can confirm a session
    if (req.user.role !== "admin" && req.user.role !== "trainer") {
      return res.status(403).json({ message: "Admin or trainer access required." });
    }
    
    const { sessionId } = req.params;
    const session = await Session.findByPk(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    
    // If trainer is confirming, ensure they are assigned to this session
    if (req.user.role === "trainer" && session.trainerId !== req.user.id) {
      return res.status(403).json({ message: "You can only confirm sessions assigned to you." });
    }
    
    session.confirmed = true;
    session.status = "confirmed";
    await session.save();
    
    // Notify client
    if (session.userId) {
      const client = await User.findByPk(session.userId);
      if (client && client.email) {
        await sendEmailNotification({
          to: client.email,
          subject: "Session Confirmed",
          text: `Your session on ${new Date(session.sessionDate).toLocaleString()} has been confirmed.`,
          html: `<p>Your session on <strong>${new Date(session.sessionDate).toLocaleString()}</strong> has been confirmed.</p>
                 <p>Please arrive 10 minutes early.</p>`
        });
      }
    }
    
    res.json({ 
      message: "Session confirmed successfully.", 
      session 
    });
  } catch (error) {
    console.error("Error confirming session:", error.message);
    res.status(500).json({ message: "Server error confirming session." });
  }
});

/**
 * GET /api/schedule/admin
 * Admin route: Get all sessions with detailed information for admin views.
 */
router.get("/admin", protect, adminOnly, async (req, res) => {
  try {
    const sessions = await Session.findAll({
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
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'photo', 'specialties'],
          required: false
        }
      ],
      order: [['sessionDate', 'ASC']]
    });
    
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching admin schedule:", error.message);
    res.status(500).json({ message: "Server error fetching admin schedule." });
  }
});

export default router;