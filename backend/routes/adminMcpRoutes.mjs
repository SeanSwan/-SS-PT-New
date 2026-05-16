/**
 * Retired Admin MCP Routes
 *
 * This route file remains as an import-compatible stub. MCP server management,
 * analytics, and test endpoints are retired because SwanStudios now uses
 * first-party REST APIs for workout, gamification, analytics, and AI workflows.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/authMiddleware.mjs';
import { requireAdmin } from '../middleware/adminMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

const MCP_REPLACEMENTS = [
  '/api/workout',
  '/api/v1/gamification',
  '/api/social',
  '/api/client/analytics',
  '/api/form-analysis'
];

const mcpIntegrationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    status: 'retired',
    message: 'MCP admin endpoints are retired. Use SwanStudios first-party APIs instead.'
  }
});

router.use(protect);
router.use(requireAdmin);
router.use(mcpIntegrationRateLimit);

const retiredAdminMcpRoute = (req, res) => {
  logger.warn(`Retired MCP admin endpoint blocked for ${req.user?.email || 'unknown admin'}: ${req.method} ${req.originalUrl}`);

  return res.status(410).json({
    success: false,
    status: 'retired',
    message: 'MCP admin endpoints are retired. SwanStudios now uses first-party REST APIs instead.',
    replacements: MCP_REPLACEMENTS,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
};

router.use(retiredAdminMcpRoute);

export default router;
