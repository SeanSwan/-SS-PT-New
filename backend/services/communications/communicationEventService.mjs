/**
 * FILE: communicationEventService.mjs
 * PURPOSE: Structured server-side CommunicationEvent fanout through canonical notifications.
 */

import { createNotification } from '../notificationDeliveryService.mjs';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
} from '../notificationPayloadService.mjs';
import { normalizeSnoozeDurationMinutes } from './notificationSnoozeService.mjs';

const DEFAULT_CHANNELS = ['in-app'];
const MAX_EVENT_TYPE_LENGTH = 80;
const MAX_TITLE_LENGTH = 160;
const MAX_BODY_LENGTH = 4000;
const MAX_STRING_LENGTH = 500;
const MAX_IDEMPOTENCY_BASE_LENGTH = 130;
const MAX_GROUP_KEY_LENGTH = 120;

const NOTIFICATION_TYPES = new Set([
  'orientation',
  'system',
  'order',
  'workout',
  'client',
  'admin',
  'session',
  'achievement',
  'reward',
  'message',
  'measurement',
]);

const CATEGORY_TO_NOTIFICATION_TYPE = {
  action_required: 'admin',
  messages: 'message',
  schedule: 'session',
  training: 'workout',
  billing: 'order',
  community: 'system',
  achievements: 'achievement',
  system: 'system',
  admin: 'admin',
};

const CHANNEL_ALIASES = {
  'in-app': 'in-app',
  in_app: 'in-app',
  inapp: 'in-app',
  email: 'email',
  sms: 'sms',
  push: 'push',
};

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const cleanText = (value, maxLength = MAX_STRING_LENGTH) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim().replace(/\s+/g, ' ');
  if (!text) return null;
  return text.slice(0, maxLength);
};

const normalizeKey = (value, maxLength = MAX_STRING_LENGTH) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim().replace(/\s+/g, '.').toLowerCase();
  if (!text) return null;
  return text.slice(0, maxLength);
};

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const normalizeEnum = (value, allowed, fallback) => {
  const text = cleanText(value, 60)?.toLowerCase();
  return text && allowed.includes(text) ? text : fallback;
};

const normalizeNotificationType = (value, category) => {
  const text = cleanText(value, 40)?.toLowerCase();
  if (text && NOTIFICATION_TYPES.has(text)) return text;
  return CATEGORY_TO_NOTIFICATION_TYPE[category] || 'system';
};

const safeJsonObject = (value) => {
  if (!isRecord(value)) return {};
  return JSON.parse(JSON.stringify(value));
};

const safeInternalPath = (value) => {
  const text = cleanText(value, MAX_STRING_LENGTH);
  return text && text.startsWith('/') && !text.startsWith('//') ? text : null;
};

const normalizeChannels = (channels) => {
  const input = Array.isArray(channels) && channels.length ? channels : DEFAULT_CHANNELS;
  const seen = new Set();
  const normalized = [];

  for (const channel of input) {
    const token = String(channel || '').trim().toLowerCase();
    const value = CHANNEL_ALIASES[token];
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized.length ? normalized : DEFAULT_CHANNELS;
};

const normalizeRecipients = (event = {}) => {
  const source = Array.isArray(event.recipients) ? event.recipients : event.recipientIds;
  const rows = Array.isArray(source) ? source : [];
  const seen = new Set();
  const recipients = [];

  for (const row of rows) {
    const userId = isRecord(row) ? toPositiveInt(row.userId ?? row.id) : toPositiveInt(row);
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    recipients.push({ userId, role: isRecord(row) ? cleanText(row.role, 40) : null });
  }

  return recipients;
};

const normalizeActions = (actions) => {
  const rows = Array.isArray(actions) ? actions : [];
  return rows
    .map((action) => {
      if (!isRecord(action)) return null;
      const label = cleanText(action.label, 80);
      const type = cleanText(action.type, 30)?.toLowerCase() || 'link';
      if (!label) return null;

      if (type === 'link') {
        const href = safeInternalPath(action.href ?? action.link ?? action.url);
        return href ? { label, type, href } : null;
      }

      if (type === 'snooze') {
        const durationMinutes = normalizeSnoozeDurationMinutes(action.durationMinutes ?? action.minutes);
        return durationMinutes ? { label, type, durationMinutes } : null;
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 4);
};

const idempotencyKeyForRecipient = (baseKey, userId) => (
  baseKey ? `${baseKey}:recipient:${userId}` : null
);

export function normalizeCommunicationEvent(event = {}) {
  if (!isRecord(event)) return { error: 'Communication event payload is required', value: null };

  const eventType = normalizeKey(event.eventType, MAX_EVENT_TYPE_LENGTH);
  const recipients = normalizeRecipients(event);
  const title = cleanText(event.title, MAX_TITLE_LENGTH);
  const body = cleanText(event.body ?? event.message, MAX_BODY_LENGTH);
  const category = normalizeEnum(event.category, NOTIFICATION_CATEGORIES, 'system');

  if (!eventType) return { error: 'eventType is required', value: null };
  if (recipients.length === 0) return { error: 'At least one recipient is required', value: null };
  if (!title) return { error: 'title is required', value: null };
  if (!body) return { error: 'body is required', value: null };

  return {
    error: null,
    value: {
      eventType,
      actorId: toPositiveInt(event.actorId),
      recipients,
      notificationType: normalizeNotificationType(event.notificationType ?? event.type, category),
      category,
      priority: normalizeEnum(event.priority, NOTIFICATION_PRIORITIES, 'normal'),
      title,
      body,
      link: safeInternalPath(event.link),
      image: safeInternalPath(event.image),
      channels: normalizeChannels(event.channels),
      actions: normalizeActions(event.actions),
      entityType: cleanText(event.entityType, 80)?.toLowerCase() || null,
      entityId: toPositiveInt(event.entityId),
      metadata: safeJsonObject(event.metadata),
      requiresAction: event.requiresAction === true,
      idempotencyKey: cleanText(event.idempotencyKey, MAX_IDEMPOTENCY_BASE_LENGTH),
      groupKey: cleanText(event.groupKey, MAX_GROUP_KEY_LENGTH),
      grouping: isRecord(event.grouping) ? safeJsonObject(event.grouping) : undefined,
      expiresAt: event.expiresAt || null,
      deliveryPolicyNow: event.deliveryPolicyNow || event.now,
    },
  };
}

export async function createCommunicationEvent(event = {}) {
  const normalized = normalizeCommunicationEvent(event);
  if (normalized.error) {
    return { success: false, error: normalized.error, attempted: 0, notifications: [], failures: [] };
  }

  const value = normalized.value;
  const notifications = [];
  const failures = [];

  for (const recipient of value.recipients) {
    const result = await createNotification({
      userId: recipient.userId,
      senderId: value.actorId,
      title: value.title,
      message: value.body,
      type: value.notificationType,
      category: value.category,
      priority: value.priority,
      status: 'unread',
      link: value.link,
      image: value.image,
      channels: value.channels,
      actions: value.actions,
      metadata: { eventType: value.eventType, ...value.metadata },
      relatedEntityType: value.entityType,
      relatedEntityId: value.entityId,
      requiresAction: value.requiresAction,
      expiresAt: value.expiresAt,
      groupKey: value.groupKey,
      grouping: value.grouping,
      idempotencyKey: idempotencyKeyForRecipient(value.idempotencyKey, recipient.userId),
      deliveryPolicyNow: value.deliveryPolicyNow,
    });

    if (result.success && result.notification) {
      notifications.push(result.notification);
    } else {
      failures.push({ userId: recipient.userId, error: result.error || 'Notification creation failed' });
    }
  }

  return {
    success: failures.length === 0,
    attempted: value.recipients.length,
    notifications,
    failures,
  };
}