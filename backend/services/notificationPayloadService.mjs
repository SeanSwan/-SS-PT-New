import {
  normalizeSnoozeDurationMinutes,
} from './communications/notificationSnoozeService.mjs';

const MAX_TITLE_LENGTH = 160;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_STRING_LENGTH = 500;
const MAX_GROUP_KEY_LENGTH = 120;
const MAX_IDEMPOTENCY_KEY_LENGTH = 160;

export const NOTIFICATION_CATEGORIES = Object.freeze([
  'action_required',
  'messages',
  'schedule',
  'training',
  'billing',
  'community',
  'achievements',
  'system',
  'admin',
]);

export const NOTIFICATION_PRIORITIES = Object.freeze(['low', 'normal', 'high', 'urgent', 'critical']);
export const NOTIFICATION_STATUSES = Object.freeze(['unread', 'read', 'archived', 'expired']);
export const NOTIFICATION_ACTION_STATUSES = Object.freeze(['open', 'completed', 'dismissed', 'snoozed', 'expired']);

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeString = (value, maxLength = MAX_STRING_LENGTH) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, maxLength);
};

const normalizePositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const normalizeEnum = (value, allowed, fallback) => {
  const text = normalizeString(value, 60);
  return text && allowed.includes(text) ? text : fallback;
};

const normalizeDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeJsonObject = (value) => {
  if (!isRecord(value)) return {};
  return JSON.parse(JSON.stringify(value));
};

const isSafeInternalPath = (value) => {
  const text = normalizeString(value, MAX_STRING_LENGTH);
  return Boolean(text && text.startsWith('/') && !text.startsWith('//'));
};

const normalizeActions = (value) => {
  const actions = Array.isArray(value) ? value : [];
  return actions
    .map((action) => {
      if (!isRecord(action)) return null;
      const label = normalizeString(action.label, 80);
      const type = normalizeString(action.type, 30) || 'link';
      if (!label) return null;

      if (type === 'link') {
        const href = normalizeString(action.href ?? action.link ?? action.url, MAX_STRING_LENGTH);
        if (!isSafeInternalPath(href)) return null;
        return { label, type, href };
      }

      if (type === 'snooze') {
        const durationMinutes = normalizeSnoozeDurationMinutes(action.durationMinutes ?? action.minutes);
        if (!durationMinutes) return null;
        return { label, type, durationMinutes };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 4);
};

export const isNotificationIdempotencyConflict = (error) => (
  error?.name === 'SequelizeUniqueConstraintError'
  || error?.parent?.code === '23505'
  || error?.original?.code === '23505'
);

export const normalizeNotificationCreateOptions = (options = {}) => {
  const source = isRecord(options) ? options : {};
  const statusInput = normalizeEnum(source.status, NOTIFICATION_STATUSES, null);
  const read = source.read === true || statusInput === 'read';

  return {
    userId: normalizePositiveInt(source.userId),
    title: normalizeString(source.title, MAX_TITLE_LENGTH) || 'Notification',
    message: normalizeString(source.message, MAX_MESSAGE_LENGTH) || 'You have a new notification.',
    type: normalizeString(source.type, 20) || 'system',
    link: normalizeString(source.link, MAX_STRING_LENGTH),
    image: normalizeString(source.image, MAX_STRING_LENGTH),
    senderId: normalizePositiveInt(source.senderId),
    relatedEntityType: normalizeString(source.relatedEntityType, 50),
    relatedEntityId: normalizePositiveInt(source.relatedEntityId),
    read,
    category: normalizeEnum(source.category, NOTIFICATION_CATEGORIES, 'system'),
    priority: normalizeEnum(source.priority, NOTIFICATION_PRIORITIES, 'normal'),
    status: read ? 'read' : (statusInput || 'unread'),
    metadata: normalizeJsonObject(source.metadata),
    actions: normalizeActions(source.actions),
    groupKey: normalizeString(source.groupKey, MAX_GROUP_KEY_LENGTH),
    idempotencyKey: normalizeString(source.idempotencyKey, MAX_IDEMPOTENCY_KEY_LENGTH),
    requiresAction: source.requiresAction === true,
    actionStatus: normalizeEnum(source.actionStatus, NOTIFICATION_ACTION_STATUSES, null),
    expiresAt: normalizeDate(source.expiresAt),
    deliveredAt: normalizeDate(source.deliveredAt),
    openedAt: normalizeDate(source.openedAt),
    clickedAt: normalizeDate(source.clickedAt),
    archivedAt: normalizeDate(source.archivedAt),
  };
};
