/**
 * sessionRoutes.js
 * Express routes for session management including creation, booking, rescheduling, and cancellation.
 * Uses middleware for authentication and role-based authorization.
 */

import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.mjs";
import Session from "../models/Session.mjs";
import User from "../models/User.mjs";
import { Op } from "sequelize";
import stripe from "stripe";
import moment from "moment";
import {
  sendEmailNotification,
  sendSMSNotification,
} from "../utils/notification.mjs";

// Initialize router and Stripe instance using secret key from environment variables.
const router = express.Router();
const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

/**
 * @route   POST /api/sessions/admin/create
 * @desc    ADMIN: Create an available session slot.
 * @access  Private (Admin Only)
 */
router.post("/admin/create", protect, adminOnly, async (req, res) => {
  try {
    const { sessionDate, notes } = req.body;

    // Prevent creating sessions in the past
    if (new Date(sessionDate) < new Date()) {
      return res
        .status(400)
        .json({ message: "Cannot create past session slots." });
    }

    const newSession = await Session.create({
      sessionDate,
      notes,
      status: "available",
      userId: null,
    });

    res.status(201).json({ message: "Session slot created.", session: newSession });
  } catch (error) {
    console.error("Error creating session:", error.message);
    res.status(500).json({ message: "Server error creating session." });
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
      await sendEmailNotification(user.email, session.sessionDate, false);
      await sendSMSNotification(user.phone, session.sessionDate, false);
    }

    res.status(200).json({ message: "Session booked successfully.", session });
  } catch (error) {
    console.error("Error booking session:", error.message);
    res.status(500).json({ message: "Server error booking session." });
  }
});

/**
 * @route   PUT /api/sessions/reschedule/:sessionId
 * @desc    CLIENT: Reschedule a session.
 *          Deducts a session if rescheduled within 24 hours.
 * @access  Private
 */
router.put("/reschedule/:sessionId", protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { newSessionDate, userId } = req.body;

    const session = await Session.findByPk(sessionId);
    if (!session || session.status !== "scheduled") {
      return res
        .status(400)
        .json({ message: "Invalid session for rescheduling." });
    }

    const oldDate = moment(session.sessionDate);
    const newDate = moment(newSessionDate);
    const hoursDiff = newDate.diff(oldDate, "hours");

    let sessionDeducted = false;
    if (hoursDiff < 24) {
      sessionDeducted = true; // Deduct session if rescheduled within 24 hours
    }

    session.sessionDate = newSessionDate;
    await session.save();

    // Notify user of the reschedule and whether a session was deducted.
    const user = await User.findByPk(userId);
    if (user) {
      await sendEmailNotification(user.email, newSessionDate, sessionDeducted);
      await sendSMSNotification(user.phone, newSessionDate, sessionDeducted);
    }

    res.status(200).json({
      message: `Session rescheduled successfully. ${
        sessionDeducted
          ? "A session was deducted."
          : "Your session was retained."
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
    const session = await Session.findByPk(sessionId);

    if (!session || session.status !== "scheduled") {
      return res
        .status(400)
        .json({ message: "Invalid session for cancellation." });
    }

    await session.destroy();
    res.json({ message: "Session cancelled successfully." });
  } catch (error) {
    console.error("Error canceling session:", error.message);
    res.status(500).json({ message: "Server error canceling session." });
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
      where: { status: "available" },
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
    const sessions = await Session.findAll({
      where: { userId },
    });
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching user sessions:", error.message);
    res.status(500).json({ message: "Server error fetching sessions." });
  }
});

export default router;
