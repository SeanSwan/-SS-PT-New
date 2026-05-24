/**
 * Admin Analytics System Routes
 * =============================
 *
 * Purpose:
 * - Provide system health and executive intelligence endpoints for admins.
 *
 * Blueprint Reference:
 * - docs/ai-workflow/ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md
 *
 * Architecture Overview (ASCII):
 * Admin UI -> /api/admin/analytics/system-health -> System metrics -> runtime
 * Admin UI -> /api/admin/analytics/statistics/system-health -> System stats -> runtime
 * Admin UI -> /api/admin/analytics/business-intelligence/executive-summary -> BI snapshot
 *
 * Middleware Flow:
 * Request -> authenticateToken -> authorizeAdmin -> rateLimit -> handler -> response
 *
 * API Endpoints:
 * - GET /api/admin/analytics/system-health
 * - GET /api/admin/analytics/statistics/system-health
 * - GET /api/admin/analytics/business-intelligence/executive-summary
 *
 * Security:
 * - JWT auth required
 * - Admin role enforced
 * - Rate limiting applied
 *
 * Testing:
 * - See ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md (testing checklist)
 */

import express from 'express';
import rateLimit from 'express-rate-limit';

import { authenticateToken, authorizeAdmin } from '../../middleware/auth.mjs';
import {
  buildExecutiveSummary,
  buildSystemHealthSnapshot,
  buildSystemHealthStatistics,
} from '../../services/adminSystemAnalyticsService.mjs';

const router = express.Router();
const INTERNAL_ERROR = 'internal_error';

const analyticsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many analytics requests. Please try again later.',
  },
});

router.use(authenticateToken);
router.use(authorizeAdmin);
router.use(analyticsRateLimit);

// =====================================================
// STATISTICS ALIAS ENDPOINTS (frontend expects /statistics/*)
// =====================================================

router.get('/statistics/system-health', async (req, res) => {
  try {
    res.json({
      success: true,
      data: await buildSystemHealthStatistics(),
    });
  } catch (error) {
    console.error('Statistics system health error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system health statistics' });
  }
});

// =====================================================
// SYSTEM HEALTH ENDPOINT
// =====================================================

router.get('/system-health', async (req, res) => {
  try {
    res.json({
      success: true,
      data: await buildSystemHealthSnapshot(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system health',
      error: INTERNAL_ERROR,
    });
  }
});

// =====================================================
// BUSINESS INTELLIGENCE ENDPOINT
// =====================================================

router.get('/business-intelligence/executive-summary', async (req, res) => {
  try {
    res.json({
      success: true,
      data: await buildExecutiveSummary(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Business intelligence error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business intelligence',
      error: INTERNAL_ERROR,
    });
  }
});

export default router;
