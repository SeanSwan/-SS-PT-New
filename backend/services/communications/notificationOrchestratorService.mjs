/**
 * FILE: notificationOrchestratorService.mjs
 * PURPOSE: Canonical in-app notification creation for communication events.
 */

import logger from '../../utils/logger.mjs';
import { createNotification } from '../../controllers/notificationController.mjs';
import { createCommunicationEvent } from './communicationEventService.mjs';
import { getUser } from '../../models/index.mjs';
import { normalizeNotificationPreferences } from '../notificationPreferenceService.mjs';

const MESSAGE_PREVIEW_LIMIT = 160;
const GENERIC_MESSAGE_BODY = 'New message received.';

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const displayNameForActor = (actor = {}) => {
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim();
  return name || actor.username || 'SwanStudios';
};

const previewMessage = (content) => {
  const text = typeof content === 'string' ? content.trim() : '';
  if (text.length <= MESSAGE_PREVIEW_LIMIT) return text;
  return `${text.slice(0, MESSAGE_PREVIEW_LIMIT - 3)}...`;
};

const toPlainUser = (user) => {
  if (!user) return null;
  if (typeof user.get === 'function') return user.get({ plain: true });
  return user;
};

const shouldShowMessagePreview = async (userId) => {
  try {
    const User = getUser();
    if (!User?.findByPk) return false;

    const user = await User.findByPk(userId, {
      attributes: ['id', 'emailNotifications', 'smsNotifications', 'notificationPreferences'],
    });
    const plainUser = toPlainUser(user);
    if (!plainUser) return false;

    const preferences = normalizeNotificationPreferences(plainUser.notificationPreferences, plainUser);
    return preferences.showPreview !== false;
  } catch (error) {
    logger.warn(
      `Notification preview preference lookup failed for user ${userId}: ${error?.message || 'unknown error'}`
    );
    return false;
  }
};

const messageBodyForRecipient = async ({ userId, content }) => {
  if (!(await shouldShowMessagePreview(userId))) return GENERIC_MESSAGE_BODY;
  return previewMessage(content) || GENERIC_MESSAGE_BODY;
};

const dashboardMessagePathForRole = (role, conversationId) => {
  const normalizedRole = String(role || '').toLowerCase();
  const dashboardRole = normalizedRole === 'admin'
    ? 'admin'
    : normalizedRole === 'trainer'
      ? 'trainer'
      : 'client';
  return `/dashboard/${dashboardRole}/messages?conversationId=${encodeURIComponent(String(conversationId))}`;
};

const normalizeRecipients = (recipients) => {
  const rows = Array.isArray(recipients) ? recipients : [];
  const seen = new Set();
  return rows
    .map((recipient) => {
      if (typeof recipient === 'object' && recipient !== null) {
        return { userId: toPositiveInt(recipient.userId ?? recipient.id), role: recipient.role };
      }
      return { userId: toPositiveInt(recipient), role: null };
    })
    .filter((recipient) => {
      if (!recipient.userId || seen.has(recipient.userId)) return false;
      seen.add(recipient.userId);
      return true;
    });
};

export async function createMessageNotificationEvent({
  actor,
  recipients,
  conversationId,
  messageId,
  content,
}) {
  const normalizedConversationId = toPositiveInt(conversationId);
  const normalizedMessageId = toPositiveInt(messageId);
  const actorId = toPositiveInt(actor?.id);
  const recipientRows = normalizeRecipients(recipients).filter((recipient) => recipient.userId !== actorId);

  if (!actorId || !normalizedConversationId || !normalizedMessageId || recipientRows.length === 0) {
    return { success: true, notifications: [], skipped: true };
  }

  const actorName = displayNameForActor(actor);
  const notifications = [];
  const failures = [];

  for (const recipient of recipientRows) {
    const link = dashboardMessagePathForRole(recipient.role, normalizedConversationId);
    const body = await messageBodyForRecipient({ userId: recipient.userId, content });
    const result = await createNotification({
      userId: recipient.userId,
      senderId: actorId,
      title: `${actorName} sent you a message`,
      message: body,
      type: 'message',
      category: 'messages',
      priority: 'normal',
      status: 'unread',
      channels: ['in-app', 'push'],
      link,
      actions: [{ label: 'Open message', type: 'link', href: link }],
      metadata: { conversationId: normalizedConversationId, messageId: normalizedMessageId },
      groupKey: `conversation:${normalizedConversationId}`,
      grouping: { mode: 'message_thread' },
      idempotencyKey: `message:${normalizedMessageId}:recipient:${recipient.userId}`,
      relatedEntityType: 'conversation',
      relatedEntityId: normalizedConversationId,
    });

    if (result.success && result.notification) {
      notifications.push(result.notification);
    } else {
      failures.push({ userId: recipient.userId, error: result.error || 'Notification creation failed' });
      logger.warn(`Message notification failed for user ${recipient.userId}: ${result.error || 'unknown error'}`);
    }
  }

  return { success: failures.length === 0, notifications, failures };
}

export async function createAdminBroadcastNotificationEvent({
  recipients,
  senderId,
  title,
  content,
  link = null,
  image = null,
  adminNotificationId = null,
  channels = ['in-app'],
}) {
  const senderUserId = toPositiveInt(senderId);
  const relatedEntityId = toPositiveInt(adminNotificationId);
  const recipientRows = normalizeRecipients(recipients);

  if (recipientRows.length === 0) {
    return { success: true, notifications: [], skipped: true };
  }

  return createCommunicationEvent({
    eventType: 'admin.broadcast.created',
    actorId: senderUserId,
    recipients: recipientRows,
    notificationType: 'admin',
    category: 'admin',
    priority: 'high',
    title,
    body: content,
    link,
    image,
    channels,
    actions: link ? [{ label: 'Open broadcast', type: 'link', href: link }] : [],
    metadata: { adminNotificationId: relatedEntityId },
    entityType: 'admin_broadcast',
    entityId: relatedEntityId,
    groupKey: relatedEntityId ? `admin-broadcast:${relatedEntityId}` : null,
    idempotencyKey: relatedEntityId ? `admin-broadcast:${relatedEntityId}` : null,
  });
}