/**
 * Movement Analysis Routes
 * ========================
 * NASM + Squat University Guided Movement Analysis API.
 *
 * Phase 13 — Movement Analysis System
 */
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import {
  createMovementAnalysis,
  updateMovementAnalysis,
  listMovementAnalyses,
  getMovementAnalysisDetail,
  getClientMovementHistory,
  approveMatch,
  rejectMatch,
  attachUser,
} from '../controllers/movementAnalysisController.mjs';

const router = express.Router();

// Admin/Trainer: CRUD
router.post('/', protect, authorize(['admin', 'trainer']), createMovementAnalysis);
router.put('/:id', protect, authorize(['admin', 'trainer']), updateMovementAnalysis);
router.get('/', protect, authorize(['admin', 'trainer']), listMovementAnalyses);
router.get('/:id', protect, authorize(['admin', 'trainer']), getMovementAnalysisDetail);
router.get('/client/:userId', protect, authorize(['admin', 'trainer']), getClientMovementHistory);

// Admin-only: match management
router.post('/matches/:matchId/approve', protect, authorize(['admin']), approveMatch);
router.post('/matches/:matchId/reject', protect, authorize(['admin']), rejectMatch);
router.post('/:id/attach-user', protect, authorize(['admin']), attachUser);

export default router;
