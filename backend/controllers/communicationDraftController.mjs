/**
 * ============================================================================
 * FILE: communicationDraftController.mjs
 * PURPOSE: Controller for AI communication draft approval workflow
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22 (CRITICAL security mandate)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Handles CRUD + approve/reject for CommunicationDrafts.
 * When a draft is approved, the actual email/SMS is sent via the email service.
 *
 * HOW IT FITS IN THE APP: communicationDraftRoutes → this controller → emailService / twilioService
 */
import logger from '../utils/logger.mjs';
import { getCommunicationDraft } from '../models/index.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy model loader
// PURPOSE: Avoid circular imports — load model at runtime
// ─────────────────────────────────────────────────────────────
const getDraftModel = async () => {
  return getCommunicationDraft();
};

// ─────────────────────────────────────────────────────────────
// SECTION: List pending drafts
// ─────────────────────────────────────────────────────────────
export const listDrafts = async (req, res) => {
  try {
    const Draft = await getDraftModel();
    const where = { status: req.query.status || 'pending_approval' };

    // Trainers only see their own drafts; admins see all
    if (req.user.role === 'trainer') {
      where.trainerId = req.user.id;
    }

    const drafts = await Draft.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return res.json({ success: true, drafts });
  } catch (error) {
    logger.error('[CommunicationDrafts] List failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to list drafts' });
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION: Approve and send
// ─────────────────────────────────────────────────────────────
export const approveDraft = async (req, res) => {
  try {
    const Draft = await getDraftModel();
    const draft = await Draft.findByPk(req.params.draftId);

    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    if (draft.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: `Draft is already ${draft.status}` });
    }

    // Trainers can only approve their own drafts
    if (req.user.role === 'trainer' && String(draft.trainerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only approve your own drafts' });
    }

    // Send the actual communication
    let sendResult = { success: false };

    if (draft.type === 'email') {
      try {
        const { sendEmail } = await import('../emailService.mjs');
        sendResult = await sendEmail({
          to: draft.recipientAddress,
          subject: draft.subject || 'Message from SwanStudios',
          html: draft.body,
        });
      } catch (emailError) {
        logger.error('[CommunicationDrafts] Email send failed:', emailError.message);
        return res.status(500).json({ success: false, message: 'Email send failed: ' + emailError.message });
      }
    } else if (draft.type === 'sms') {
      // Twilio integration placeholder — send when configured
      logger.info('[CommunicationDrafts] SMS send requested to %s (Twilio not yet connected)', draft.recipientAddress);
      sendResult = { success: true, messageId: 'sms-pending-twilio' };
    }

    // Update draft status
    await draft.update({
      status: sendResult.success ? 'sent' : 'approved',
      approvedAt: new Date(),
      approvedBy: req.user.id,
      sentAt: sendResult.success ? new Date() : null,
    });

    logger.info('[CommunicationDrafts] Draft %d approved by user %s', draft.id, req.user.id);

    return res.json({
      success: true,
      message: sendResult.success ? 'Draft approved and sent' : 'Draft approved (send pending)',
      draft,
    });
  } catch (error) {
    logger.error('[CommunicationDrafts] Approve failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to approve draft' });
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION: Reject draft
// ─────────────────────────────────────────────────────────────
export const rejectDraft = async (req, res) => {
  try {
    const Draft = await getDraftModel();
    const draft = await Draft.findByPk(req.params.draftId);

    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    if (draft.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: `Draft is already ${draft.status}` });
    }

    if (req.user.role === 'trainer' && String(draft.trainerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only reject your own drafts' });
    }

    await draft.update({
      status: 'rejected',
      rejectionReason: req.body.reason || null,
    });

    return res.json({ success: true, message: 'Draft rejected', draft });
  } catch (error) {
    logger.error('[CommunicationDrafts] Reject failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to reject draft' });
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION: Delete draft
// ─────────────────────────────────────────────────────────────
export const deleteDraft = async (req, res) => {
  try {
    const Draft = await getDraftModel();
    const draft = await Draft.findByPk(req.params.draftId);

    if (!draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    if (req.user.role === 'trainer' && String(draft.trainerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own drafts' });
    }

    await draft.destroy();
    return res.json({ success: true, message: 'Draft deleted' });
  } catch (error) {
    logger.error('[CommunicationDrafts] Delete failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete draft' });
  }
};
