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
 * Middleware Strategy:
 *   All routes protected with JWT authentication (protect middleware)
 *   Ownership validation enforced in controller (user can only access own notifications)
 *
 * WHY No POST Endpoint for Creating Notifications?
 * - Notifications created internally by controllers (session, gamification, order)
 * - Prevents spam and abuse (users cannot create arbitrary notifications)
 * - Centralized notification logic (consistent format, audit trail)
 * - Direct API access only for reading/managing existing notifications
 */

import express from 'express';
import {
  getAllNotifications,
  getUnreadNotificationCount,
  getNotificationPreferences,
  updateNotificationPreferences,
  markAsRead,
  markAsClicked,
  snoozeNotification,
  resolveNotificationAction,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.mjs';
import { protect, rateLimiter } from '../middleware/authMiddleware.mjs';

const router = express.Router();
const notificationReadLimiter = rateLimiter({ windowMs: 60 * 1000, max: 120, message: 'Too many notification requests.' });
const notificationMutationLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 120, message: 'Too many notification changes.' });
const notificationPreferencesLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 30, message: 'Too many notification preference changes.' });

router.get('/', protect, notificationReadLimiter, getAllNotifications);
router.get('/count', protect, notificationReadLimiter, getUnreadNotificationCount);
router.get('/preferences', protect, notificationReadLimiter, getNotificationPreferences);
router.put('/preferences', protect, notificationPreferencesLimiter, updateNotificationPreferences);
router.patch('/preferences', protect, notificationPreferencesLimiter, updateNotificationPreferences);
router.put('/read-all', protect, notificationMutationLimiter, markAllAsRead);
router.patch('/read-all', protect, notificationMutationLimiter, markAllAsRead);
router.put('/:id/read', protect, notificationMutationLimiter, markAsRead);
router.patch('/:id/read', protect, notificationMutationLimiter, markAsRead);
router.put('/:id/click', protect, notificationMutationLimiter, markAsClicked);
router.patch('/:id/click', protect, notificationMutationLimiter, markAsClicked);
router.put('/:id/snooze', protect, notificationMutationLimiter, snoozeNotification);
router.patch('/:id/snooze', protect, notificationMutationLimiter, snoozeNotification);
router.put('/:id/action-status', protect, notificationMutationLimiter, resolveNotificationAction);
router.patch('/:id/action-status', protect, notificationMutationLimiter, resolveNotificationAction);
router.delete('/:id', protect, notificationMutationLimiter, deleteNotification);

export default router;
