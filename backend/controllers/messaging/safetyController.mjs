/**
 * FILE: safetyController.mjs
 * PURPOSE: Message search, reports, blocks, and mute governance handlers.
 */

import { validationResult } from 'express-validator';
import { ensureMessagingTables, getConversationMembership } from '../../services/messagingRepository.mjs';
import { assertCanMessageConversation, MESSAGING_POLICY_DENIED_MESSAGE } from '../../services/messagingPolicyService.mjs';
import {
  blockMessagingUserRecord,
  createMessageReport,
  getMessageConversationContext,
  muteConversationRecord,
  normalizeMessageSearchQuery,
  normalizeMuteUntil,
  normalizeReportPayload,
  searchMessagesForConversation,
  unblockMessagingUserRecord,
  unmuteConversationRecord,
} from '../../services/messagingSafetyService.mjs';
import {
  listMessageReportsForAdmin,
  normalizeMessageReportQueueQuery,
  normalizeMessageReportResolutionPayload,
  resolveMessageReportForAdmin,
} from '../../services/messagingReportModerationService.mjs';

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const requestHasValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ error: errors.array()[0]?.msg || 'Invalid messaging request.' });
  return true;
};

async function requireConversationAccess({ conversationId, userId, enforcePolicy = true }) {
  await ensureMessagingTables();
  const membership = await getConversationMembership(conversationId, userId);
  if (!membership) return { ok: false, statusCode: 403, error: 'You are not a member of this conversation.' };

  if (enforcePolicy) {
    const policy = await assertCanMessageConversation({ actorId: userId, conversationId });
    if (!policy.allowed) return { ok: false, statusCode: 403, error: MESSAGING_POLICY_DENIED_MESSAGE };
  }

  return { ok: true, membership };
}

export const searchConversationMessages = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const conversationId = toPositiveInt(req.params.id);
  const userId = req.user?.id;
  const normalized = normalizeMessageSearchQuery(req.query);
  if (!conversationId || !userId) return res.status(400).json({ error: 'Valid conversation ID is required.' });
  if (normalized.error) return res.status(400).json({ error: normalized.error });

  try {
    const access = await requireConversationAccess({ conversationId, userId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });

    const results = await searchMessagesForConversation({
      conversationId,
      query: normalized.query,
      limit: normalized.limit,
    });
    return res.json({ results, query: normalized.query });
  } catch (error) {
    console.error('Error searching conversation messages:', error);
    return res.status(500).json({ error: 'Failed to search messages.' });
  }
};

export const reportConversationMessage = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const messageId = toPositiveInt(req.params.messageId);
  const reporterId = req.user?.id;
  const normalized = normalizeReportPayload(req.body || {});
  if (!messageId || !reporterId) return res.status(400).json({ error: 'Valid message ID is required.' });
  if (normalized.error) return res.status(400).json({ error: normalized.error });

  try {
    await ensureMessagingTables();
    const message = await getMessageConversationContext(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found.' });

    const access = await requireConversationAccess({ conversationId: message.conversationId, userId: reporterId });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });

    const report = await createMessageReport({
      messageId,
      reporterId,
      reason: normalized.reason,
      details: normalized.details,
    });
    return res.status(201).json({ success: true, report });
  } catch (error) {
    console.error('Error reporting message:', error);
    return res.status(500).json({ error: 'Failed to report message.' });
  }
};

export const listAdminMessageReports = async (req, res) => {
  const normalized = normalizeMessageReportQueueQuery(req.query || {});
  if (normalized.error) return res.status(400).json({ error: normalized.error });

  try {
    await ensureMessagingTables();
    const reports = await listMessageReportsForAdmin({
      status: normalized.status,
      limit: normalized.limit,
    });
    return res.json({ success: true, reports, status: normalized.status, limit: normalized.limit });
  } catch (error) {
    console.error('Error listing message reports:', error);
    return res.status(500).json({ error: 'Failed to list message reports.' });
  }
};

export const resolveAdminMessageReport = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const reportId = toPositiveInt(req.params.reportId);
  const resolverId = req.user?.id;
  const normalized = normalizeMessageReportResolutionPayload(req.body || {});
  if (!reportId || !resolverId) return res.status(400).json({ error: 'Valid report ID is required.' });
  if (normalized.error) return res.status(400).json({ error: normalized.error });

  try {
    await ensureMessagingTables();
    const result = await resolveMessageReportForAdmin({
      reportId,
      resolverId,
      status: normalized.status,
      resolutionNote: normalized.resolutionNote,
    });
    if (result.error) return res.status(result.statusCode || 400).json({ error: result.error, report: result.report || null });
    return res.json({ success: true, report: result.report });
  } catch (error) {
    console.error('Error resolving message report:', error);
    return res.status(500).json({ error: 'Failed to resolve message report.' });
  }
};

export const blockMessagingUser = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const blockedUserId = toPositiveInt(req.params.userId);
  const blockerId = req.user?.id;
  if (!blockedUserId || !blockerId) return res.status(400).json({ error: 'Valid user ID is required.' });

  try {
    await ensureMessagingTables();
    const result = await blockMessagingUserRecord({ blockerId, blockedUserId });
    if (result.error) return res.status(result.error === 'User not found.' ? 404 : 400).json({ error: result.error });
    return res.status(201).json({ success: true, block: result.block });
  } catch (error) {
    console.error('Error blocking messaging user:', error);
    return res.status(500).json({ error: 'Failed to block user.' });
  }
};

export const unblockMessagingUser = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const blockedUserId = toPositiveInt(req.params.userId);
  const blockerId = req.user?.id;
  if (!blockedUserId || !blockerId) return res.status(400).json({ error: 'Valid user ID is required.' });

  try {
    await ensureMessagingTables();
    await unblockMessagingUserRecord({ blockerId, blockedUserId });
    return res.json({ success: true, unblocked: true });
  } catch (error) {
    console.error('Error unblocking messaging user:', error);
    return res.status(500).json({ error: 'Failed to unblock user.' });
  }
};

export const muteMessagingConversation = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const conversationId = toPositiveInt(req.params.id);
  const userId = req.user?.id;
  if (!conversationId || !userId) return res.status(400).json({ error: 'Valid conversation ID is required.' });

  try {
    const access = await requireConversationAccess({ conversationId, userId, enforcePolicy: false });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });

    const mute = await muteConversationRecord({
      conversationId,
      userId,
      mutedUntil: normalizeMuteUntil(req.body?.mutedUntil),
    });
    return res.json({ success: true, mute });
  } catch (error) {
    console.error('Error muting conversation:', error);
    return res.status(500).json({ error: 'Failed to mute conversation.' });
  }
};

export const unmuteMessagingConversation = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;
  const conversationId = toPositiveInt(req.params.id);
  const userId = req.user?.id;
  if (!conversationId || !userId) return res.status(400).json({ error: 'Valid conversation ID is required.' });

  try {
    const access = await requireConversationAccess({ conversationId, userId, enforcePolicy: false });
    if (!access.ok) return res.status(access.statusCode).json({ error: access.error });

    await unmuteConversationRecord({ conversationId, userId });
    return res.json({ success: true, muted: false });
  } catch (error) {
    console.error('Error unmuting conversation:', error);
    return res.status(500).json({ error: 'Failed to unmute conversation.' });
  }
};
