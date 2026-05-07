/**
 * coachProposalRoutes.mjs
 * =======================
 * Deterministic approval API for Swan Coach action proposals.
 */
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import {
  approveCoachActionProposal,
  getCoachActionProposal,
  rejectCoachActionProposal,
} from '../services/ai/coachActionProposalApprovalService.mjs';

const router = express.Router();

router.use(protect);
router.use(authorize(['admin', 'trainer']));

router.get('/:id', async (req, res) => {
  try {
    const result = await getCoachActionProposal({ id: req.params.id, req });
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'PROPOSAL_DETAIL_FAILED',
      error: err.message || 'Proposal detail failed',
    });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const result = await approveCoachActionProposal({ id: req.params.id, req });
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'PROPOSAL_APPROVAL_FAILED',
      error: err.message || 'Proposal approval failed',
    });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const result = await rejectCoachActionProposal({ id: req.params.id, req });
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'PROPOSAL_REJECTION_FAILED',
      error: err.message || 'Proposal rejection failed',
    });
  }
});

export default router;
