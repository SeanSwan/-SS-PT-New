/**
 * FILE: attachmentController.mjs
 * PURPOSE: Fail-closed binary attachment upload gate for messaging.
 */

import { validationResult } from 'express-validator';
import { ensureMessagingTables, getConversationMembership } from '../../services/messagingRepository.mjs';
import { normalizeAttachmentUploadGate } from '../../services/messagingAttachmentService.mjs';

const ATTACHMENT_UPLOAD_SCANNER_REQUIRED = 'scanner_required';

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const requestHasValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ error: errors.array()[0]?.msg || 'Invalid attachment request.' });
  return true;
};

export const rejectMessageAttachmentUpload = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const conversationId = toPositiveInt(req.params.id);
  const userId = req.user?.id;
  if (!conversationId || !userId) return res.status(400).json({ error: 'Valid conversation ID is required.' });

  try {
    await ensureMessagingTables();
    const membership = await getConversationMembership(conversationId, userId);
    if (!membership) return res.status(403).json({ error: 'You are not a member of this conversation.' });

    const gate = normalizeAttachmentUploadGate();
    return res.status(501).json({
      success: false,
      code: gate.reason || ATTACHMENT_UPLOAD_SCANNER_REQUIRED,
      message: gate.message,
    });
  } catch (error) {
    console.error('Error evaluating messaging attachment upload gate:', error);
    return res.status(500).json({ error: 'Failed to evaluate attachment upload.' });
  }
};