/**
 * Notification Routes (In-App Notification API)
 * ==============================================
 *
 * Purpose: REST API for in-app notification management with real-time bell icon updates
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Notification System
 *
 * Base Path: /api/notifications
 *
 * Architecture Overview:
 * ┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Client Dashboard   │─────▶│  Notification    │─────▶│  Notification   │
 * │  (Bell Icon)        │      │  Routes          │      │  Controller     │
 * └─────────────────────┘      └──────────────────┘      └─────────────────┘
 *
 * API Endpoints (4 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ METHOD  ENDPOINT                         ACCESS         PURPOSE              │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ GET     /                                Client/T/A     Get all notifications│
 * │ PUT     /:id/read                        Client/T/A     Mark as read         │
 * │ PUT     /read-all                        Client/T/A     Mark all as read     │
 * │ DELETE  /:id                             Client/T/A     Delete notification  │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Middleware Strategy:
 *   All routes protected with JWT authentication (protect middleware)
 *   Ownership validation enforced in controller (user can only access own notifications)
 *
 * Business Logic:
 *
 * WHY No POST Endpoint for Creating Notifications?
 * - Notifications created internally by controllers (session, gamification, order)
 * - Prevents spam and abuse (users cannot create arbitrary notifications)
 * - Centralized notification logic (consistent format, audit trail)
 * - Direct API access only for reading/managing existing notifications
 *
 * Created: 2024-XX-XX
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

// backend/routes/notificationRoutes.mjs
import express from 'express';
import {
  getAllNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notificationController.mjs';
import { protect } from '../middleware/authMiddleware.mjs';

const router = express.Router();

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for the logged-in user
 * @access  Private
 */
router.get('/', protect, getAllNotifications);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.put('/:id/read', protect, markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', protect, markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', protect, deleteNotification);

export default router;
