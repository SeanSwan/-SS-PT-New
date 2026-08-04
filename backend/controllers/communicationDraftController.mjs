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

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy model loader
// PURPOSE: Avoid circular imports — load model at runtime
// ─────────────────────────────────────────────────────────────
let CommunicationDraft = null;
/**
 * May this requester act on this draft?
 *
 * ONE definition, used by every mutating handler. Previously the ownership rule lived inline in
 * `approveDraft` only — `rejectDraft` and `deleteDraft` had NO check at all, so any trainer could
 * reject or permanently `destroy()` another trainer's pending client communications. The router is
 * gated to `['trainer','admin']`, so this was trainer-to-trainer tampering, not public exposure.
 *
 * Admins are intentionally unscoped (they administer every trainer's queue). Trainers are scoped to
 * their own drafts. Anything else is denied rather than defaulted-open.
 */
function canActOnDraft(user, draft) {
  if (!user || !draft) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'trainer') return String(draft.trainerId) === String(user.id);
  return false;
}

const getDraftModel = async () => {
  if (!CommunicationDraft) {
    const mod = await import('../models/CommunicationDraft.mjs');
    CommunicationDraft = mod.default;
  }
  return CommunicationDraft;
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

    // 404 rather than 403: a 403 confirms the draft exists, letting an attacker enumerate IDs.
    if (!canActOnDraft(req.user, draft)) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
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

    // Ownership BEFORE state: a foreign draft must look identical to a missing one, so an
    // attacker cannot learn another trainer's draft status from the error message.
    if (!canActOnDraft(req.user, draft)) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    if (draft.status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: `Draft is already ${draft.status}` });
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

    // This is an irreversible destroy(). Without this check any trainer could permanently delete
    // another trainer's pending client communications.
    if (!canActOnDraft(req.user, draft)) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    await draft.destroy();
    return res.json({ success: true, message: 'Draft deleted' });
  } catch (error) {
    logger.error('[CommunicationDrafts] Delete failed:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to delete draft' });
  }
};
