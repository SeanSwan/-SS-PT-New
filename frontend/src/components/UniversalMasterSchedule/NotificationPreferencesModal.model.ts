/**
 * Notification Preferences Modal Model
 * ====================================
 * Normalizes the schedule notification settings payload for the canonical
 * /api/notifications/preferences endpoint.
 */
export type NotificationChannelKey = 'email' | 'sms' | 'push';
export type NotificationDigestFrequency = 'immediate' | 'hourly' | 'daily';

export type NotificationCategoryKey =
  | 'action_required'
  | 'messages'
  | 'schedule'
  | 'training'
  | 'billing'
  | 'community'
  | 'achievements'
  | 'system'
  | 'admin';

export interface QuietHours {
  start: string;
  end: string;
}

export interface NotificationCategoryPreferences {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export type NotificationCategoryMap = Record<NotificationCategoryKey, NotificationCategoryPreferences>;

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  digestFrequency: NotificationDigestFrequency;
  showPreview: boolean;
  categories: NotificationCategoryMap;
  quietHours: QuietHours;
}

export const NOTIFICATION_CHANNEL_OPTIONS: Array<{ key: NotificationChannelKey; label: string }> = [
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'push', label: 'Push' },
];

export const NOTIFICATION_DIGEST_OPTIONS: Array<{ key: NotificationDigestFrequency; label: string }> = [
  { key: 'immediate', label: 'Immediate' },
  { key: 'hourly', label: 'Hourly digest' },
  { key: 'daily', label: 'Daily digest' },
];

export const NOTIFICATION_CATEGORY_OPTIONS: Array<{
  key: NotificationCategoryKey;
  label: string;
  description: string;
}> = [
  { key: 'action_required', label: 'Action required', description: 'Critical account and coaching actions' },
  { key: 'messages', label: 'Messages', description: 'Message and chat notifications' },
  { key: 'schedule', label: 'Schedule', description: 'Bookings, reminders, and session changes' },
  { key: 'training', label: 'Training', description: 'Workout plans, logs, and progress notes' },
  { key: 'billing', label: 'Billing', description: 'Purchases, package credits, and payment updates' },
  { key: 'community', label: 'Community', description: 'Social feed, comments, and community activity' },
  { key: 'achievements', label: 'Achievements', description: 'Badges, streaks, milestones, and awards' },
  { key: 'system', label: 'System', description: 'Security, account, and service notices' },
  { key: 'admin', label: 'Admin', description: 'Staff operations and owner-level updates' },
];

const LEGACY_CATEGORY_ALIASES: Partial<Record<NotificationCategoryKey, string[]>> = {
  billing: ['commerce'],
  community: ['social'],
};

const isRecord = (value: unknown): value is Record<string, any> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const booleanOr = (value: unknown, fallback: boolean) => (
  typeof value === 'boolean' ? value : fallback
);

const normalizeDigestFrequency = (
  value: unknown,
  fallback: NotificationDigestFrequency = 'immediate',
): NotificationDigestFrequency => (
  typeof value === 'string' && NOTIFICATION_DIGEST_OPTIONS.some((option) => option.key === value)
    ? value as NotificationDigestFrequency
    : fallback
);

const categoryDefaultsFromChannels = (channels: Pick<NotificationPreferences, 'email' | 'sms' | 'push'>) => ({
  action_required: { inApp: true, email: channels.email, sms: channels.sms, push: false },
  messages: { inApp: true, email: false, sms: false, push: false },
  schedule: { inApp: true, email: channels.email, sms: channels.sms, push: false },
  training: { inApp: true, email: channels.email, sms: false, push: false },
  billing: { inApp: true, email: channels.email, sms: channels.sms, push: false },
  community: { inApp: true, email: false, sms: false, push: false },
  achievements: { inApp: true, email: false, sms: false, push: false },
  system: { inApp: true, email: channels.email, sms: false, push: false },
  admin: { inApp: true, email: channels.email, sms: channels.sms, push: false },
});

const normalizeCategoryChannels = (
  raw: unknown,
  fallback: NotificationCategoryPreferences,
): NotificationCategoryPreferences => {
  const input = isRecord(raw) ? raw : {};

  return {
    inApp: true,
    email: booleanOr(input.email, fallback.email),
    sms: booleanOr(input.sms, fallback.sms),
    push: booleanOr(input.push, fallback.push),
  };
};

const categoryInput = (rawCategories: Record<string, any>, category: NotificationCategoryKey) => {
  if (isRecord(rawCategories[category])) return rawCategories[category];
  const aliases = LEGACY_CATEGORY_ALIASES[category] || [];
  const alias = aliases.find((key) => isRecord(rawCategories[key]));
  return alias ? rawCategories[alias] : undefined;
};

const normalizeCategoryMap = (
  rawCategories: unknown,
  channelPrefs: Pick<NotificationPreferences, 'email' | 'sms' | 'push'>,
): NotificationCategoryMap => {
  const input = isRecord(rawCategories) ? rawCategories : {};
  const defaults = categoryDefaultsFromChannels(channelPrefs);

  return NOTIFICATION_CATEGORY_OPTIONS.reduce((categories, { key }) => ({
    ...categories,
    [key]: normalizeCategoryChannels(categoryInput(input, key), defaults[key]),
  }), {} as NotificationCategoryMap);
};

export const createDefaultPreferences = (): NotificationPreferences => {
  const channels = { email: true, sms: true, push: false };

  return {
    ...channels,
    digestFrequency: 'immediate',
    showPreview: true,
    categories: normalizeCategoryMap({}, channels),
    quietHours: { start: '', end: '' },
  };
};

export const preferenceEnvelope = (payload: any) => (
  payload?.data?.preferences
  || payload?.preferences
  || payload?.data?.notificationPreferences
  || payload?.notificationPreferences
  || payload
);

export const normalizePreferences = (prefs: any): NotificationPreferences => {
  if (!isRecord(prefs)) return createDefaultPreferences();

  const rawChannels = isRecord(prefs.channels) ? prefs.channels : prefs;
  const channels = {
    email: rawChannels.email !== undefined ? Boolean(rawChannels.email) : true,
    sms: rawChannels.sms !== undefined ? Boolean(rawChannels.sms) : true,
    push: rawChannels.push !== undefined ? Boolean(rawChannels.push) : false,
  };
  const quietHours = isRecord(prefs.quietHours) ? prefs.quietHours : {};
  const quietHoursEnabled = quietHours.enabled === true;

  return {
    ...channels,
    digestFrequency: normalizeDigestFrequency(prefs.digestFrequency),
    showPreview: booleanOr(prefs.showPreview, true),
    categories: normalizeCategoryMap(prefs.categories, channels),
    quietHours: {
      start: quietHoursEnabled ? quietHours.start || '' : '',
      end: quietHoursEnabled ? quietHours.end || '' : '',
    },
  };
};

export const toCanonicalPreferences = (prefs: NotificationPreferences) => {
  const quietHoursEnabled = Boolean(prefs.quietHours.start && prefs.quietHours.end);
  const categories = NOTIFICATION_CATEGORY_OPTIONS.reduce((categoryMap, { key }) => ({
    ...categoryMap,
    [key]: normalizeCategoryChannels(
      prefs.categories[key],
      categoryDefaultsFromChannels(prefs)[key],
    ),
  }), {} as NotificationCategoryMap);

  return {
    channels: {
      email: prefs.email,
      sms: prefs.sms,
      push: prefs.push,
    },
    categories,
    digestFrequency: prefs.digestFrequency,
    showPreview: prefs.showPreview,
    quietHours: {
      enabled: quietHoursEnabled,
      start: prefs.quietHours.start || '21:00',
      end: prefs.quietHours.end || '07:00',
      timezone: 'local',
    },
  };
};

export const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;
