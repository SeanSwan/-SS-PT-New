import express from "express";
import { protect } from "../middleware/authMiddleware.mjs";
import Session from "../models/Session.mjs";
import User from "../models/User.mjs"; // For including user details

const router = express.Router();

/**
 * GET /api/schedule
 * Protected route: returns all sessions.
 * Includes associated user details (name, phone, photo if available) for admin view.
 */
router.get("/", protect, async (req, res) => {
  try {
    const sessions = await Session.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'phone', 'photo'] // Ensure your User model supports 'photo' (optional)
        }
      ]
    });
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching schedule:", error.message);
    res.status(500).json({ message: "Server error fetching schedule." });
  }
});

/**
 * POST /api/schedule/book
 * Protected route: allows a logged-in client to book an available session.
 */
router.post("/book", protect, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await Session.findOne({ where: { id: sessionId, status: 'available' } });
    if (!session) {
      return res.status(400).json({ message: "Session is not available for booking." });
    }
    // Assign the session to the client and update status.
    session.userId = req.user.id;
    session.status = "scheduled";
    await session.save();
    res.status(200).json({ message: "Session booked successfully.", session });
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
    const { start, end } = req.body;
    // Create a new session request
    const newSession = await Session.create({
      sessionDate: start, // you could also store 'end' if needed
      status: "requested",
      userId: req.user.id,
      // Optionally, store additional info in 'notes'
    });
    res.status(201).json({ message: "Session request submitted.", session: newSession });
  } catch (error) {
    console.error("Error requesting session:", error.message);
    res.status(500).json({ message: "Server error requesting session." });
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
    // Only the client who booked the session can cancel it.
    if (session.userId !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to cancel this session." });
    }
    session.status = "cancelled";
    await session.save();
    res.json({ message: "Session cancelled successfully.", session });
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
    // Ensure only admin users can confirm a session.
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }
    const { sessionId } = req.params;
    const session = await Session.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found." });
    }
    session.confirmed = true;
    await session.save();
    // Optionally, trigger a notification to the client.
    res.json({ message: "Session confirmed successfully.", session });
  } catch (error) {
    console.error("Error confirming session:", error.message);
    res.status(500).json({ message: "Server error confirming session." });
  }
});

export default router;
