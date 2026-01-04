/**
 * Schedule Routes
 * ===============
 *
 * Defines API endpoints for the Unified Schedule component.
 */

import { Router } from 'express';
import { getScheduleEvents } from '../controllers/scheduleController.mjs';
import { protect } from '../middleware/auth.mjs';

const router = Router();

router.get('/', protect, getScheduleEvents);

export default router;
