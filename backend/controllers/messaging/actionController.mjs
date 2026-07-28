/**
 * FILE: actionController.mjs
 * PURPOSE: Governed message actions for edit/delete/reactions/pins/conversation state.
 */

import { validationResult } from 'express-validator';
import { ensureMessagingTables, getConversationMembership } from '../../services/messagingRepository.mjs';
import { assertCanMessageConversation, MESSAGING_POLICY_DENIED_MESSAGE } from '../../services/messagingPolicyService.mjs';
import {
  archiveConversationForUser,
  deleteMessageReaction,
  editMessageRecord,
  getMessageActionContext,
  markConversationUnreadForUser,
  normalizeEditMessagePayload,
  normalizeReactionPayload,
  pinMessageRecord,
  saveMessageRecord,
  softDeleteMessageRecord,
  unpinMessageRecord,
  unsaveMessageRecord,
  upsertMessageReaction,
} from '../../services/messagingActionService.mjs';

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const requestHasValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ error: errors.array()[0]?.msg || 'Invalid messaging action request.' });
  return true;
};

async function requireMessageAccess({ messageId, userId }) {
  await ensureMessagingTables();
  const message = await getMessageActionContext(messageId);
  if (!message || message.deletedAt) return { ok: false, statusCode: 404, error: 'Message not found.' };

  const membership = await getConversationMembership(message.conversationId, userId);
  if (!membership) return { ok: false, statusCode: 403, error: 'You are not a member of this conversation.' };

  const policy = await assertCanMessageConversation({ actorId: userId, conversationId: message.conversationId });
  if (!policy.allowed) return { ok: false, statusCode: 403, error: MESSAGING_POLICY_DENIED_MESSAGE };

  return { ok: true, message, membership };
}

async function requireConversationAccess({ conversationId, userId }) {
  await ensureMessagingTables();
  const membership = await getConversationMembership(conversationId, userId);
  if (!membership) return { ok: false, statusCode: 403, error: 'You are not a member of this conversation.' };
  return { ok: true, membership };
}

export const editConversationMessage = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const messageId = toPositiveInt(req.params.messageId);
  const userId = req.user?.id;
  const normalized = normalizeEditMessagePayload(req.body || {});
  if (!messageId || !userId) return res.status(400).json({ error: 'Valid message ID is required.' });
  if (normalized.error) return res.status(400).json({ error: normalized.error });

  try {
    const access = await requireMessageAccess({ messageId, userId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });
    if (Number(access.message.senderId) !== Number(userId)) return res.status(403).json({ error: 'Only the sender can edit this message.' });
    const message = await editMessageRecord({ messageId, content: normalized.content, updatedBy: userId });
    return res.json({ success: true, message });
  } catch (error) {
    console.error('Error editing message:', error);
    return res.status(500).json({ error: 'Failed to edit message.' });
  }
};

export const deleteConversationMessage = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const messageId = toPositiveInt(req.params.messageId);
  const userId = req.user?.id;
  if (!messageId || !userId) return res.status(400).json({ error: 'Valid message ID is required.' });

  try {
    const access = await requireMessageAccess({ messageId, userId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });
    if (Number(access.message.senderId) !== Number(userId)) return res.status(403).json({ error: 'Only the sender can delete this message.' });
    const message = await softDeleteMessageRecord({ messageId, deletedBy: userId });
    return res.json({ success: true, message });
  } catch (error) {
    console.error('Error deleting message:', error);
    return res.status(500).json({ error: 'Failed to delete message.' });
  }
};

export const reactToConversationMessage = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const messageId = toPositiveInt(req.params.messageId);
  const userId = req.user?.id;
  const normalized = normalizeReactionPayload(req.body || {});
  if (!messageId || !userId) return res.status(400).json({ error: 'Valid message ID is required.' });
  if (normalized.error) return res.status(400).json({ error: normalized.error });

  try {
    const access = await requireMessageAccess({ messageId, userId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });
    const reaction = await upsertMessageReaction({ messageId, userId, reaction: normalized.reaction });
    return res.status(201).json({ success: true, reaction });
  } catch (error) {
    console.error('Error reacting to message:', error);
    return res.status(500).json({ error: 'Failed to react to message.' });
  }
};

export const removeConversationMessageReaction = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const messageId = toPositiveInt(req.params.messageId);
  const userId = req.user?.id;
  const normalized = normalizeReactionPayload({ ...(req.query || {}), ...(req.body || {}) });
  if (!messageId || !userId) return res.status(400).json({ error: 'Valid message ID is required.' });
  if (normalized.error) return res.status(400).json({ error: normalized.error });

  try {
    const access = await requireMessageAccess({ messageId, userId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });
    await deleteMessageReaction({ messageId, userId, reaction: normalized.reaction });
    return res.json({ success: true, removed: true });
  } catch (error) {
    console.error('Error removing message reaction:', error);
    return res.status(500).json({ error: 'Failed to remove reaction.' });
  }
};

export const pinConversationMessage = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const messageId = toPositiveInt(req.params.messageId);
  const userId = req.user?.id;
  if (!messageId || !userId) return res.status(400).json({ error: 'Valid message ID is required.' });

  try {
    const access = await requireMessageAccess({ messageId, userId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });
    const pin = await pinMessageRecord({ messageId, userId });
    return res.status(201).json({ success: true, pin });
  } catch (error) {
    console.error('Error pinning message:', error);
    return res.status(500).json({ error: 'Failed to pin message.' });
  }
};

export const unpinConversationMessage = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const messageId = toPositiveInt(req.params.messageId);
  const userId = req.user?.id;
  if (!messageId || !userId) return res.status(400).json({ error: 'Valid message ID is required.' });

  try {
    const access = await requireMessageAccess({ messageId, userId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });
    await unpinMessageRecord({ messageId, userId });
    return res.json({ success: true, pinned: false });
  } catch (error) {
    console.error('Error unpinning message:', error);
    return res.status(500).json({ error: 'Failed to unpin message.' });
  }
};

export const saveConversationMessage = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const messageId = toPositiveInt(req.params.messageId);
  const userId = req.user?.id;
  if (!messageId || !userId) return res.status(400).json({ error: 'Valid message ID is required.' });

  try {
    const access = await requireMessageAccess({ messageId, userId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });
    const save = await saveMessageRecord({ messageId, userId });
    return res.status(201).json({ success: true, save });
  } catch (error) {
    console.error('Error saving message:', error);
    return res.status(500).json({ error: 'Failed to save message.' });
  }
};

export const unsaveConversationMessage = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const messageId = toPositiveInt(req.params.messageId);
  const userId = req.user?.id;
  if (!messageId || !userId) return res.status(400).json({ error: 'Valid message ID is required.' });

  try {
    const access = await requireMessageAccess({ messageId, userId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });
    await unsaveMessageRecord({ messageId, userId });
    return res.json({ success: true, saved: false });
  } catch (error) {
    console.error('Error unsaving message:', error);
    return res.status(500).json({ error: 'Failed to unsave message.' });
  }
};

export const archiveMessagingConversation = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const conversationId = toPositiveInt(req.params.id);
  const userId = req.user?.id;
  if (!conversationId || !userId) return res.status(400).json({ error: 'Valid conversation ID is required.' });

  try {
    const access = await requireConversationAccess({ conversationId, userId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });
    const result = await archiveConversationForUser({ conversationId, userId });
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    return res.status(500).json({ error: 'Failed to archive conversation.' });
  }
};

export const markMessagingConversationUnread = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const conversationId = toPositiveInt(req.params.id);
  const userId = req.user?.id;
  if (!conversationId || !userId) return res.status(400).json({ error: 'Valid conversation ID is required.' });

  try {
    const access = await requireConversationAccess({ conversationId, userId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });
    const result = await markConversationUnreadForUser({ conversationId, userId });
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error marking conversation unread:', error);
    return res.status(500).json({ error: 'Failed to mark conversation unread.' });
  }
};