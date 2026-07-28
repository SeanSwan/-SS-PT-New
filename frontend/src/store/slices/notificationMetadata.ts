/**
 * Derived presentation metadata for canonical backend notifications.
 */

export type NotificationCategory =
  | 'action_required'
  | 'messages'
  | 'schedule'
  | 'training'
  | 'billing'
  | 'community'
  | 'achievements'
  | 'system'
  | 'admin'
  | 'commerce'
  | 'social';

interface NotificationActionInput {
  label?: string;
}

interface NotificationMetadataInput {
  type?: string;
  category?: string;
  actionLabel?: string;
  link?: string;
  requiresAction?: boolean;
  actionStatus?: string | null;
  actions?: NotificationActionInput[];
}

const TERMINAL_ACTION_STATUSES = new Set(['completed', 'resolved', 'dismissed', 'done']);

const CATEGORY_BY_TYPE: Record<string, NotificationCategory> = {
  message: 'messages',
  session: 'schedule',
  reminder: 'schedule',
  workout: 'training',
  measurement: 'training',
  progress: 'training',
  achievement: 'achievements',
  reward: 'achievements',
  social: 'community',
  order: 'billing',
  admin: 'admin',
  client: 'system',
  info: 'system',
  orientation: 'system',
  system: 'system',
};

const ACTION_LABEL_BY_CATEGORY: Record<Exclude<NotificationCategory, 'commerce' | 'social'>, string> = {
  action_required: 'Review',
  messages: 'Open messages',
  schedule: 'View schedule',
  training: 'View training',
  billing: 'Review billing',
  community: 'View community',
  achievements: 'View achievements',
  system: 'Open update',
  admin: 'Review admin signal',
};

const CATEGORIES = new Set<NotificationCategory>([
  'action_required',
  'messages',
  'schedule',
  'training',
  'billing',
  'community',
  'achievements',
  'system',
  'admin',
  'commerce',
  'social',
]);

const normalizeCategory = (category?: string): NotificationCategory | undefined => {
  if (!category || !CATEGORIES.has(category as NotificationCategory)) return undefined;
  if (category === 'commerce') return 'billing';
  if (category === 'social') return 'community';
  return category as NotificationCategory;
};

const hasOpenRequiredAction = (notification: NotificationMetadataInput): boolean => {
  if (!notification.requiresAction) return false;
  const status = String(notification.actionStatus || '').toLowerCase();
  return !status || !TERMINAL_ACTION_STATUSES.has(status);
};

const categoryFromLink = (link?: string): NotificationCategory | undefined => {
  if (!link) return undefined;
  if (/messages?|conversation|inbox/i.test(link)) return 'messages';
  if (/schedule|session|calendar/i.test(link)) return 'schedule';
  if (/workout|training|progress|measurement|waiver/i.test(link)) return 'training';
  if (/reward|achievement|badge|milestone/i.test(link)) return 'achievements';
  if (/admin|broadcast|moderation|escalation|signal/i.test(link)) return 'admin';
  if (/social|feed|community|challenge/i.test(link)) return 'community';
  if (/billing|invoice|order|store|shop|checkout|payment/i.test(link)) return 'billing';
  return undefined;
};

export const deriveNotificationCategory = (notification: NotificationMetadataInput): NotificationCategory => {
  if (hasOpenRequiredAction(notification)) return 'action_required';
  const explicitCategory = normalizeCategory(notification.category);
  if (explicitCategory) return explicitCategory;
  return CATEGORY_BY_TYPE[notification.type || ''] || categoryFromLink(notification.link) || 'system';
};

export const deriveNotificationActionLabel = (
  notification: NotificationMetadataInput,
  category = deriveNotificationCategory(notification),
): string | undefined => {
  if (typeof notification.actionLabel === 'string' && notification.actionLabel.trim()) {
    return notification.actionLabel.trim();
  }
  const primaryAction = Array.isArray(notification.actions)
    ? notification.actions.find(action => typeof action.label === 'string' && action.label.trim())
    : null;
  if (primaryAction?.label) return primaryAction.label.trim();
  if (!notification.link && category !== 'action_required') return undefined;
  const normalizedCategory = normalizeCategory(category) || 'system';
  return ACTION_LABEL_BY_CATEGORY[normalizedCategory as Exclude<NotificationCategory, 'commerce' | 'social'>];
};