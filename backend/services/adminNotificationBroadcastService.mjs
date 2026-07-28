/**
 * Admin notification broadcast service.
 * Normalizes role-aware audiences, writes the admin audit row, then uses the
 * canonical notification orchestrator so recipients receive real-time events.
 */

import { getAllModels } from '../models/index.mjs';
import { createAdminBroadcastNotificationEvent } from './communications/notificationOrchestratorService.mjs';

const AUDIENCES = new Set(['all', 'clients', 'trainers', 'admins', 'specific']);
const DEFAULT_CHANNELS = ['in-app'];

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');
const isSafeInternalPath = (value) => !value || (value.startsWith('/') && !value.startsWith('//'));

const normalizeUserIds = (userIds) => {
  const seen = new Set();
  const rows = Array.isArray(userIds) ? userIds : [];
  return rows.reduce((ids, value) => {
    const id = toPositiveInt(value);
    if (!id || seen.has(id)) return ids;
    seen.add(id);
    ids.push(id);
    return ids;
  }, []);
};

const normalizeChannels = (channels) => {
  const values = Array.isArray(channels) ? channels : DEFAULT_CHANNELS;
  const seen = new Set();
  const normalized = values.reduce((acc, channel) => {
    const value = cleanText(channel).toLowerCase();
    if (!value || seen.has(value)) return acc;
    seen.add(value);
    acc.push(value);
    return acc;
  }, []);
  return normalized.length ? normalized : DEFAULT_CHANNELS;
};

export const normalizeBroadcastRequest = (body = {}) => {
  const title = cleanText(body.title);
  const content = cleanText(body.content);
  const requestedAudience = cleanText(body.audience).toLowerCase();
  const audience = AUDIENCES.has(requestedAudience) ? requestedAudience : 'all';
  const userIds = normalizeUserIds(body.userIds);
  const link = cleanText(body.link);

  if (!title || !content) return { error: 'Title and content are required', value: null };
  if (audience === 'specific' && userIds.length === 0) {
    return { error: 'userIds are required for specific audience broadcasts', value: null };
  }
  if (!isSafeInternalPath(link)) {
    return { error: 'Broadcast links must be internal SwanStudios paths', value: null };
  }

  return {
    error: null,
    value: {
      title,
      content,
      type: cleanText(body.type) || 'system',
      audience,
      channels: normalizeChannels(body.channels),
      userIds,
      link: link || null,
      image: cleanText(body.image) || null,
    },
  };
};

export const buildBroadcastRecipientWhere = ({ audience, userIds = [] }) => {
  if (audience === 'clients') return { role: 'client' };
  if (audience === 'trainers') return { role: 'trainer' };
  if (audience === 'admins') return { role: 'admin' };
  if (audience === 'specific') return { id: userIds };
  return {};
};

const metadataFor = ({ request, senderId, attempted, created, failed }) => ({
  audience: { type: request.audience, count: attempted },
  channels: request.channels,
  type: request.type,
  senderId,
  delivery: { attempted, created, failed },
});

export async function broadcastAdminNotification({ requestBody, adminUserId }) {
  const normalized = normalizeBroadcastRequest(requestBody || {});
  if (normalized.error) {
    return { statusCode: 400, body: { success: false, message: normalized.error } };
  }

  const request = normalized.value;
  const models = getAllModels();
  const User = models.User;
  const AdminNotification = models.AdminNotification;

  if (!User || !AdminNotification) {
    return { statusCode: 500, body: { success: false, message: 'Notification models unavailable' } };
  }

  const recipients = await User.findAll({
    where: buildBroadcastRecipientWhere(request),
    attributes: ['id', 'role'],
    raw: true,
  });
  const recipientRows = recipients.map((recipient) => ({ userId: recipient.id, role: recipient.role }));
  const senderId = toPositiveInt(adminUserId);

  const notification = await AdminNotification.create({
    type: 'system_alert',
    title: request.title,
    message: request.content,
    priority: request.type === 'alert' ? 'high' : 'medium',
    actionRequired: request.type === 'alert',
    metadata: JSON.stringify(metadataFor({
      request,
      senderId,
      attempted: recipientRows.length,
      created: 0,
      failed: 0,
    })),
  });

  const broadcast = await createAdminBroadcastNotificationEvent({
    recipients: recipientRows,
    senderId,
    title: request.title,
    content: request.content,
    link: request.link,
    image: request.image,
    adminNotificationId: notification.id,
    channels: request.channels,
  });

  const created = broadcast.notifications?.length || 0;
  const failed = broadcast.failures?.length || 0;
  await notification.update({
    metadata: JSON.stringify(metadataFor({
      request,
      senderId,
      attempted: recipientRows.length,
      created,
      failed,
    })),
  });

  return {
    statusCode: 201,
    body: {
      success: true,
      notificationsCreated: created,
      notificationsFailed: failed,
      audienceCount: recipientRows.length,
      notification,
    },
  };
}