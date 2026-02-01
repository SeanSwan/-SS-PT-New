/**
 * Session Type Routes - Universal Master Schedule (Phase 5)
 * ========================================================
 *
 * Purpose:
 * Route definitions for session type management (CRUD + reorder).
 * Admin-only for mutations; read endpoints require authentication.
 *
 * Blueprint Reference:
 * docs/ai-workflow/blueprints/UNIVERSAL-SCHEDULE-PHASE-5-BUFFER-TIMES.md
 *
 * Routes:
 * - GET    /api/session-types           (auth)
 * - GET    /api/session-types/:id       (auth)
 * - POST   /api/session-types           (admin)
 * - PUT    /api/session-types/:id       (admin)
 * - DELETE /api/session-types/:id       (admin)
 * - POST   /api/session-types/reorder   (admin)
 */

import express from 'express';
import {
  listSessionTypes,
  getSessionTypeById,
  createSessionType,
  updateSessionType,
  deleteSessionType,
  reorderSessionTypes
} from '../controllers/sessionTypeController.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';

const router = express.Router();

router.get('/', protect, listSessionTypes);
router.get('/:id', protect, getSessionTypeById);

router.post('/', protect, adminOnly, createSessionType);
router.put('/:id', protect, adminOnly, updateSessionType);
router.delete('/:id', protect, adminOnly, deleteSessionType);
router.post('/reorder', protect, adminOnly, reorderSessionTypes);

export default router;
