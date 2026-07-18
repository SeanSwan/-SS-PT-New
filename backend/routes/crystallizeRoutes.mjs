/**
 * crystallizeRoutes — Dashboards v2 (Slice-3). POST /api/achievements/:id/crystallize.
 * Auth: `protect` (session JWT); the controller scopes the write to the authenticated owner.
 */
import express from 'express';
import { protect } from '../middleware/authMiddleware.mjs';
import { postCrystallize } from '../controllers/crystallizeController.mjs';

const router = express.Router();

router.post('/:id/crystallize', protect, postCrystallize);

export default router;
