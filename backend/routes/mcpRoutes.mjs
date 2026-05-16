/**
 * Retired MCP Integration Routes
 *
 * The old MCP bridge is no longer an active runtime path. This file stays in
 * place as a compatibility stub because backend/core/routes.mjs still imports it
 * when ENABLE_MCP_ROUTES is explicitly enabled for historical diagnostics.
 */

import express from 'express';
import logger from '../utils/logger.mjs';

const router = express.Router();

const MCP_REPLACEMENTS = [
  '/api/workout',
  '/api/v1/gamification',
  '/api/social',
  '/api/client/analytics',
  '/api/form-analysis'
];

const retiredLegacyMcpRoute = (req, res) => {
  logger.warn(`Retired MCP bridge blocked: ${req.method} ${req.originalUrl}`);

  return res.status(410).json({
    success: false,
    status: 'retired',
    message: 'The legacy MCP bridge is retired. Use SwanStudios first-party APIs instead.',
    replacements: MCP_REPLACEMENTS,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
};

router.get('/status', (req, res) => {
  return res.status(200).json({
    success: false,
    status: 'retired',
    message: 'MCP services are retired. SwanStudios first-party APIs are the runtime path.',
    servers: {
      workout: { status: 'retired', replacement: '/api/workout' },
      gamification: { status: 'retired', replacement: '/api/v1/gamification' }
    },
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

router.get('/health', (req, res) => {
  return res.status(200).json({
    success: false,
    status: 'retired',
    healthy: false,
    mcpServicesEnabled: false,
    message: 'MCP health checks are retired. Use SwanStudios service health endpoints instead.',
    replacements: MCP_REPLACEMENTS,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

router.use(retiredLegacyMcpRoute);

export default router;
