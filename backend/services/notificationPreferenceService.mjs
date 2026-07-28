/**
 * Normalizes notification preference JSON stored on Users.notificationPreferences.
 * Keeps the API schema stable without adding notification preference tables.
 */

export const NOTIFICATION_PREFERENCE_CATEGORIES = [
  'action_required',
  'messages',
  'schedule',
  'training',
  'billing',
  'community',
  'achievements',
  'system',
  'admin',
];

export const NOTIFICATION_DIGEST_FREQUENCIES = ['immediate', 'hourly', 'daily'];

const LEGACY_CATEGORY_ALIASES = {
  billing: ['commerce'],
  community: ['social'],
};

const CHANNEL_KEYS = ['email', 'sms', 'push'];
const DEFAULT_QUIET_HOURS = Object.freeze({
  enabled: false,
  start: '21:00',
  end: '07:00',
  timezone: 'local',
});
const DEFAULT_DIGEST_FREQUENCY = 'immediate';

const isRecord = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const isValidTime = (value) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const booleanOr = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
const normalizeDigestFrequency = (value, fallback = DEFAULT_DIGEST_FREQUENCY) => (
  typeof value === 'string' && NOTIFICATION_DIGEST_FREQUENCIES.includes(value)
    ? value
    : fallback
);

const channelDefaults = ({ email, sms }) => ({ inApp: true, email, sms, push: false });

const userDefaults = (user = {}) => {
  const email = user.emailNotifications !== false;
  const sms = user.smsNotifications === true;

  return {
    channels: { inApp: true, email, sms, push: false },
    categories: {
      action_required: channelDefaults({ email, sms }),
      messages: channelDefaults({ email: false, sms: false }),
      schedule: channelDefaults({ email, sms }),
      training: channelDefaults({ email, sms: false }),
      billing: channelDefaults({ email, sms }),
      community: channelDefaults({ email: false, sms: false }),
      achievements: channelDefaults({ email: false, sms: false }),
      system: channelDefaults({ email, sms: false }),
      admin: channelDefaults({ email, sms }),
    },
    quietHours: { ...DEFAULT_QUIET_HOURS },
    digestFrequency: DEFAULT_DIGEST_FREQUENCY,
    showPreview: true,
  };
};

const normalizeChannels = (raw, fallback) => {
  const input = isRecord(raw) ? raw : {};
  return CHANNEL_KEYS.reduce(
    (channels, key) => ({ ...channels, [key]: booleanOr(input[key], fallback[key]) }),
    { inApp: true },
  );
};

const categoryInput = (rawCategories, category) => {
  if (isRecord(rawCategories[category])) return rawCategories[category];
  const aliases = LEGACY_CATEGORY_ALIASES[category] || [];
  const alias = aliases.find((key) => isRecord(rawCategories[key]));
  return alias ? rawCategories[alias] : undefined;
};

const normalizeQuietHours = (raw, fallback = DEFAULT_QUIET_HOURS) => {
  const input = isRecord(raw) ? raw : {};
  const timezone = typeof input.timezone === 'string' && input.timezone.trim()
    ? input.timezone.trim().slice(0, 80)
    : fallback.timezone;

  return {
    enabled: booleanOr(input.enabled, fallback.enabled),
    start: isValidTime(input.start) ? input.start : fallback.start,
    end: isValidTime(input.end) ? input.end : fallback.end,
    timezone,
  };
};

export const normalizeNotificationPreferences = (rawPreferences, user = {}) => {
  const defaults = userDefaults(user);
  const input = isRecord(rawPreferences) ? rawPreferences : {};
  const rawCategories = isRecord(input.categories) ? input.categories : {};

  const categories = NOTIFICATION_PREFERENCE_CATEGORIES.reduce((acc, category) => ({
    ...acc,
    [category]: normalizeChannels(categoryInput(rawCategories, category), defaults.categories[category]),
  }), {});

  return {
    channels: normalizeChannels(input.channels, defaults.channels),
    categories,
    quietHours: normalizeQuietHours(input.quietHours, defaults.quietHours),
    digestFrequency: normalizeDigestFrequency(input.digestFrequency, defaults.digestFrequency),
    showPreview: booleanOr(input.showPreview, defaults.showPreview),
  };
};

export const mergeNotificationPreferences = (currentPreferences, updatePreferences, user = {}) => {
  const current = normalizeNotificationPreferences(currentPreferences, user);
  const update = isRecord(updatePreferences) ? updatePreferences : {};
  const updateCategories = isRecord(update.categories) ? update.categories : {};

  const categories = NOTIFICATION_PREFERENCE_CATEGORIES.reduce((acc, category) => ({
    ...acc,
    [category]: normalizeChannels(categoryInput(updateCategories, category), current.categories[category]),
  }), {});

  return {
    channels: normalizeChannels(update.channels, current.channels),
    categories,
    quietHours: normalizeQuietHours(update.quietHours, current.quietHours),
    digestFrequency: normalizeDigestFrequency(update.digestFrequency, current.digestFrequency),
    showPreview: booleanOr(update.showPreview, current.showPreview),
  };
};
