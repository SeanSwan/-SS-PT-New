/**
 * coachProposalRoutes.mjs
 * =======================
 * Deterministic approval API for Swan Coach action proposals.
 */
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import {
  answerCoachActionProposalClarification,
  approveCoachActionProposal,
  getCoachActionProposal,
  rejectCoachActionProposal,
} from '../services/ai/coachActionProposalApprovalService.mjs';
import { buildCoachProposalRouteErrorBody } from '../services/ai/coachActionProposalErrorPresenter.mjs';
import { createWorkoutDraftRequest } from '../services/ai/coachWorkoutDraftRequestService.mjs';

const router = express.Router();

router.use(protect);
router.use(authorize(['admin', 'trainer']));

router.post('/workout-drafts', async (req, res) => {
  try {
    const result = await createWorkoutDraftRequest({ user: req.user, body: req.body, db: req.app.get('sequelize') || req.app.db });
    return res.status(result.status).json({
      success: true,
      intentId: result.intentId,
      proposalId: result.proposalId,
      idempotent: result.idempotent,
      recovered: result.recovered,
    });
  } catch (err) {
    const status = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
    const code = status >= 500 ? 'WORKOUT_DRAFT_CREATE_FAILED' : (err?.code || 'WORKOUT_DRAFT_CREATE_FAILED');
    const body = status >= 500
      ? buildCoachProposalRouteErrorBody('WORKOUT_DRAFT_CREATE_FAILED')
      : { success: false, code, error: code };
    return res.status(status).json(body);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await getCoachActionProposal({ id: req.params.id, req });
    return res.status(result.status).json(result.body);
  } catch (_err) {
    return res.status(500).json(buildCoachProposalRouteErrorBody('PROPOSAL_DETAIL_FAILED'));
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const result = await approveCoachActionProposal({ id: req.params.id, req });
    return res.status(result.status).json(result.body);
  } catch (_err) {
    return res.status(500).json(buildCoachProposalRouteErrorBody('PROPOSAL_APPROVAL_FAILED'));
  }
});

router.post('/:id/clarification-answer', async (req, res) => {
  try {
    const result = await answerCoachActionProposalClarification({
      id: req.params.id,
      answer: req.body?.answer,
      req,
    });
    return res.status(result.status).json(result.body);
  } catch (_err) {
    return res.status(500).json(buildCoachProposalRouteErrorBody('PROPOSAL_CLARIFICATION_ANSWER_FAILED'));
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const result = await rejectCoachActionProposal({ id: req.params.id, req });
    return res.status(result.status).json(result.body);
  } catch (_err) {
    return res.status(500).json(buildCoachProposalRouteErrorBody('PROPOSAL_REJECTION_FAILED'));
  }
});

export default router;
