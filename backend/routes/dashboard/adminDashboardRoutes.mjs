/**
 * Admin Dashboard Routes
 * ======================
 *
 * Privileged dashboard endpoints mounted at /api/admin/dashboard.
 * Route ownership stays here; implementation lives in controllers.
 */

import express from 'express';
import { protect, adminOnly, trainerOrAdminOnly } from '../../middleware/authMiddleware.mjs';
import {
  getAdminDashboardHealth,
  getAdminDashboardStats,
  getDashboardMetrics,
} from '../../controllers/adminDashboardMetricsController.mjs';
import {
  getAnonymousVisitors,
  getVisitorGeo,
  getVisitorHistory,
} from '../../controllers/adminDashboardVisitorController.mjs';

const router = express.Router();

/**
 * GET /api/admin/dashboard/metrics
 * Performance metrics for trainers and admins.
 */
router.get('/metrics', protect, trainerOrAdminOnly, getDashboardMetrics);

/**
 * GET /api/admin/dashboard/stats
 * Video-library statistics for admin dashboard banner.
 */
router.get('/stats', protect, adminOnly, getAdminDashboardStats);

/**
 * GET /api/admin/dashboard/health
 * System health status for admin dashboard.
 */
router.get('/health', protect, adminOnly, getAdminDashboardHealth);

/**
 * GET /api/admin/dashboard/visitor-geo
 * Registered and gallery visitor geo aggregation.
 */
router.get('/visitor-geo', protect, adminOnly, getVisitorGeo);

/**
 * GET /api/admin/dashboard/anonymous-visitors
 * In-memory anonymous visitor data. Admin only.
 */
router.get('/anonymous-visitors', protect, adminOnly, getAnonymousVisitors);

/**
 * GET /api/admin/dashboard/visitor-history
 * Persistent page-view history. Admin only.
 */
router.get('/visitor-history', protect, adminOnly, getVisitorHistory);

export default router;
