/**
 * Normalizes canonical backend notification payloads for Redux and presenters.
 */
import {
  deriveNotificationActionLabel,
  deriveNotificationCategory,
} from './notificationMetadata';
import type {
  Notification,
  NotificationAction,
  NotificationPriority,
  NotificationSender,
  NotificationType,
} from './notificationTypes';

interface NotificationListBody {
  notifications?: Partial<Notification>[];
  unreadCount?: number;
}

interface NotificationApiEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

type NotificationListResponse = NotificationListBody | NotificationApiEnvelope<NotificationListBody>;
type NotificationDetailResponse = Partial<Notification> | NotificationApiEnvelope<Partial<Notification>>;

const unwrapApiData = <T>(payload: NotificationApiEnvelope<T> | T | undefined): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const data = (payload as NotificationApiEnvelope<T>).data;
    if (data !== undefined && data !== null) return data;
  }
  return (payload ?? {}) as T;
};

const normalizeSender = (sender: NotificationSender | undefined): NotificationSender | undefined => {
  if (!sender) return undefined;
  const name = sender.name || [sender.firstName, sender.lastName].filter(Boolean).join(' ').trim();
  return {
    ...sender,
    id: sender.id,
    name: name || undefined,
    avatar: sender.avatar || sender.photo || sender.profileImageUrl,
  };
};

const NOTIFICATION_PRIORITIES = new Set<NotificationPriority>(['low', 'normal', 'high', 'urgent', 'critical']);
const SNOOZE_MIN_MINUTES = 5;
const SNOOZE_MAX_MINUTES = 10080;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizePriority = (priority: unknown): NotificationPriority | undefined => {
  if (typeof priority !== 'string') return undefined;
  return NOTIFICATION_PRIORITIES.has(priority as NotificationPriority) ? priority as NotificationPriority : undefined;
};

const normalizeDurationMinutes = (durationMinutes: unknown): number | undefined => {
  const value = Number(durationMinutes);
  if (!Number.isInteger(value)) return undefined;
  return value >= SNOOZE_MIN_MINUTES && value <= SNOOZE_MAX_MINUTES ? value : undefined;
};

const normalizeActions = (actions: unknown): NotificationAction[] | undefined => {
  if (!Array.isArray(actions)) return undefined;

  const normalized = actions.flatMap((action): NotificationAction[] => {
    if (!isRecord(action)) return [];
    const label = typeof action.label === 'string' ? action.label.trim() : '';
    const type = typeof action.type === 'string' ? action.type.trim() : '';
    if (!label || !type) return [];

    const normalizedAction: NotificationAction = { label, type };
    const durationMinutes = normalizeDurationMinutes(action.durationMinutes);
    if (typeof action.href === 'string' && action.href.trim()) normalizedAction.href = action.href.trim();
    if (typeof action.endpoint === 'string' && action.endpoint.trim()) normalizedAction.endpoint = action.endpoint.trim();
    if (durationMinutes !== undefined) normalizedAction.durationMinutes = durationMinutes;
    if (isRecord(action.metadata)) normalizedAction.metadata = action.metadata;
    return [normalizedAction];
  });

  return normalized.length > 0 ? normalized : undefined;
};

const normalizeActionStatus = (actionStatus: unknown): string | null | undefined => {
  if (actionStatus === null) return null;
  if (typeof actionStatus !== 'string') return undefined;
  const status = actionStatus.trim();
  return status || undefined;
};

export const normalizeNotification = (notification: Partial<Notification>): Notification => {
  const actions = normalizeActions(notification.actions);
  const normalizedInput = { ...notification, actions };
  const category = deriveNotificationCategory(normalizedInput);
  return {
    ...notification,
    id: String(notification.id ?? globalThis.crypto?.randomUUID?.() ?? Date.now()),
    title: notification.title || 'Notification',
    message: notification.message || '',
    type: (notification.type || 'system') as NotificationType,
    read: Boolean(notification.read),
    createdAt: notification.createdAt || new Date().toISOString(),
    userId: notification.userId,
    sender: normalizeSender(notification.sender),
    category,
    actionLabel: deriveNotificationActionLabel(normalizedInput, category),
    priority: normalizePriority(notification.priority),
    requiresAction: Boolean(notification.requiresAction),
    actionStatus: normalizeActionStatus(notification.actionStatus),
    actions,
    metadata: isRecord(notification.metadata) ? notification.metadata : undefined,
  };
};

export const normalizeNotificationsPayload = (payload?: NotificationListResponse) => {
  const body = unwrapApiData<NotificationListBody>(payload);
  const notifications = Array.isArray(body.notifications)
    ? body.notifications.map(normalizeNotification)
    : [];
  const unreadCount = Number.isFinite(body.unreadCount)
    ? Number(body.unreadCount)
    : notifications.filter((notification) => !notification.read).length;

  return { notifications, unreadCount };
};

export const normalizeNotificationDetailPayload = (
  payload: NotificationDetailResponse | undefined,
  fallbackId: string,
) => {
  const notification = unwrapApiData<Partial<Notification>>(payload);
  return normalizeNotification({
    ...notification,
    id: notification.id ?? fallbackId,
    read: notification.read ?? true,
  });
};
