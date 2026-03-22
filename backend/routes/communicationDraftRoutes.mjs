/**
 * ============================================================================
 * FILE: communicationDraftRoutes.mjs
 * PURPOSE: Routes for AI-generated communication draft approval workflow
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22 (CRITICAL security mandate)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides endpoints for trainers/admins to list, approve,
 * reject, and delete communication drafts created by the AI assistant.
 *
 * HOW IT FITS IN THE APP: AI creates draft → trainer sees pending list → approves → email/SMS sent
 */
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import {
  listDrafts,
  approveDraft,
  rejectDraft,
  deleteDraft
} from '../controllers/communicationDraftController.mjs';

const router = express.Router();

// All routes require trainer or admin
router.use(protect);
router.use(authorize(['trainer', 'admin']));

/**
 * @route   GET /api/trainer/drafts
 * @desc    List pending communication drafts for the trainer
 * @access  Trainer, Admin
 */
router.get('/', listDrafts);

/**
 * @route   POST /api/trainer/drafts/:draftId/approve
 * @desc    Approve and send a communication draft
 * @access  Trainer, Admin
 */
router.post('/:draftId/approve', approveDraft);

/**
 * @route   POST /api/trainer/drafts/:draftId/reject
 * @desc    Reject a communication draft with optional reason
 * @access  Trainer, Admin
 */
router.post('/:draftId/reject', rejectDraft);

/**
 * @route   DELETE /api/trainer/drafts/:draftId
 * @desc    Delete a communication draft
 * @access  Trainer, Admin
 */
router.delete('/:draftId', deleteDraft);

export default router;
