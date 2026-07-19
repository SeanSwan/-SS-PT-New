/**
 * dashboardV2Routes — GET /api/dashboard/v2/summary (KIMI-DASHBOARDS §2.3).
 * Auth: `protect`. The controller resolves the effective role + finance gate + audit log.
 */
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { getSummary } from '../controllers/dashboardV2Controller.mjs';

const router = express.Router();

router.get('/v2/summary', protect, getSummary);

export default router;
