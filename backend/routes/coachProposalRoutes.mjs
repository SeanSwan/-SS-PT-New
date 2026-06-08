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

const router = express.Router();

router.use(protect);
router.use(authorize(['admin', 'trainer']));

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
