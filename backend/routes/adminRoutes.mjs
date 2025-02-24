// backend/routes/adminRoutes.mjs
import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.mjs";
// Example: import Session from "../models/Session.js";
// Example: import User from "../models/User.js";

const router = express.Router();

/**
 * GET /api/admin/clients
 * Returns a list of all clients (for admin only).
 */
router.get("/clients", protect, adminOnly, async (req, res) => {
  try {
    // Example: fetch from DB
    // const clients = await User.findAll({ where: { role: "user" } });
    // For demonstration, returning mock data:
    const clients = [
      { id: 1, name: "John Doe", progress: 75 },
      { id: 2, name: "Jane Smith", progress: 60 },
      { id: 3, name: "Alice Johnson", progress: 85 },
    ];
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching clients." });
  }
});

/**
 * GET /api/admin/messages
 * Returns a list of admin messages or announcements.
 */
router.get("/messages", protect, adminOnly, async (req, res) => {
  try {
    // Example: fetch from DB
    const messages = [
      { id: 1, sender: "Admin", text: "Remember to update your progress weekly." },
    ];
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching messages." });
  }
});

/**
 * PUT /api/admin/update-prices
 * Admin can update session or package prices.
 */
router.put("/update-prices", protect, adminOnly, async (req, res) => {
  try {
    const { gold, platinum, rhodium } = req.body;
    // Example: update DB with new prices
    // For demonstration:
    res.json({
      message: "Prices updated successfully",
      prices: { gold, platinum, rhodium },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error updating prices." });
  }
});

export default router;
