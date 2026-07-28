import type { Notification } from '../../store/slices/notificationSlice';

export type CommunicationInboxBucketKey =
  | 'action_required'
  | 'messages'
  | 'schedule'
  | 'training'
  | 'billing'
  | 'community'
  | 'achievements'
  | 'system'
  | 'admin';

export interface CommunicationInboxBucketDefinition {
  key: CommunicationInboxBucketKey;
  label: string;
}

export interface CommunicationInboxBucket extends CommunicationInboxBucketDefinition {
  total: number;
  unread: number;
  latest: Notification | null;
  notifications: Notification[];
}

export const COMMUNICATION_INBOX_BUCKETS: CommunicationInboxBucketDefinition[] = [
  { key: 'action_required', label: 'Action Required' },
  { key: 'messages', label: 'Messages' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'training', label: 'Training' },
  { key: 'billing', label: 'Billing' },
  { key: 'community', label: 'Community' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'system', label: 'System' },
  { key: 'admin', label: 'Admin' },
];

const TERMINAL_ACTION_STATUSES = new Set(['completed', 'resolved', 'dismissed', 'done']);

const normalizeBucketKey = (category?: string): CommunicationInboxBucketKey => {
  switch (category) {
    case 'action_required':
    case 'messages':
    case 'schedule':
    case 'training':
    case 'billing':
    case 'community':
    case 'achievements':
    case 'system':
    case 'admin':
      return category;
    case 'commerce':
      return 'billing';
    case 'social':
      return 'community';
    default:
      return 'system';
  }
};

const hasOpenRequiredAction = (notification: Pick<Notification, 'requiresAction' | 'actionStatus'>): boolean => {
  if (!notification.requiresAction) return false;
  const status = String(notification.actionStatus || '').toLowerCase();
  return !status || !TERMINAL_ACTION_STATUSES.has(status);
};

export const getCommunicationNotificationBucket = (notification: Notification): CommunicationInboxBucketKey => {
  if (hasOpenRequiredAction(notification)) return 'action_required';
  return normalizeBucketKey(notification.category);
};

export const buildCommunicationInboxBuckets = (notifications: Notification[]): CommunicationInboxBucket[] => {
  const bucketMap = new Map<CommunicationInboxBucketKey, Notification[]>();
  COMMUNICATION_INBOX_BUCKETS.forEach(bucket => bucketMap.set(bucket.key, []));

  notifications.forEach((notification) => {
    const key = getCommunicationNotificationBucket(notification);
    bucketMap.get(key)?.push(notification);
  });

  return COMMUNICATION_INBOX_BUCKETS.map((bucket) => {
    const bucketNotifications = bucketMap.get(bucket.key) || [];
    return {
      ...bucket,
      total: bucketNotifications.length,
      unread: bucketNotifications.filter(notification => !notification.read).length,
      latest: bucketNotifications[0] || null,
      notifications: bucketNotifications,
    };
  });
};