/**
 * Migration Routes
 * HTTP endpoints to manage database migrations
 */

import express from 'express';
import { runMigrations } from '../controllers/migrationController.mjs';

const router = express.Router();

// POST /api/migrations/run - Run pending migrations
router.post('/run', runMigrations);

// GET /api/migrations/status - Check migration status  
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Migration system is available',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

export default router;
