/**
 * enhancedScheduleRoutes.mjs
 * ==================
 * Express routes for comprehensive calendar schedule management.
 * Handles retrieving, booking, and cancelling sessions with enhanced notification support.
 */

import express from "express";
import { protect, adminOnly, trainerOrAdminOnly } from "../middleware/authMiddleware.mjs";
import sessionController from "../controllers/enhancedSessionController.mjs";

const router = express.Router();

// Base routes for session management
router.get("/", protect, sessionController.getAllSessions);
router.get("/stats", protect, sessionController.getScheduleStats);
router.get("/:id", protect, sessionController.getSessionById);

// Routes for booking and managing sessions
router.post("/:id/book", protect, sessionController.bookSession);
router.patch("/:id/cancel", protect, sessionController.cancelSession);
router.patch("/:id/confirm", protect, trainerOrAdminOnly, sessionController.confirmSession);
router.patch("/:id/complete", protect, trainerOrAdminOnly, sessionController.completeSession);
router.patch("/:id/assign", protect, adminOnly, sessionController.assignTrainer);

// Routes for creating sessions (admin only)
router.post("/", protect, adminOnly, sessionController.createAvailableSessions);
router.post("/recurring", protect, adminOnly, sessionController.createRecurringSessions);

// Routes for getting users for dropdown selection
router.get("/users/trainers", protect, sessionController.getTrainers);
router.get("/users/clients", protect, trainerOrAdminOnly, sessionController.getClients);

export default router;
