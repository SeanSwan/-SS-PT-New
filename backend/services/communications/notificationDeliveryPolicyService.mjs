/**
 * Notification delivery policy service.
 * Resolves requested channels against user preferences, records delivery ledger
 * state, and keeps external provider dispatch separate from notification writes.
 */

import logger from '../../utils/logger.mjs';
import { getNotification, getUser } from '../../models/index.mjs';
import { getIO } from '../../socket/socketManager.mjs';
import {
  DELIVERY_CHANNELS,
  recordNotificationDelivery,
} from './notificationDeliveryLedgerService.mjs';
import { normalizeNotificationPreferences } from '../notificationPreferenceService.mjs';

const DEFAULT_CHANNELS = ['in_app'];
const PROVIDER_CHANNELS = new Set(['email', 'sms', 'push']);
const QUIET_HOURS_BYPASS_PRIORITIES = new Set(['urgent', 'critical']);
const DIGEST_DEFERRED_FREQUENCIES = new Set(['hourly', 'daily']);
const CHANNEL_ALIASES = {
  'in-app': 'in_app',
  in_app: 'in_app',
  inapp: 'in_app',
  email: 'email',
  sms: 'sms',
  push: 'push',
};
const CHANNEL_TO_PREFERENCE_KEY = {
  in_app: 'inApp',
  email: 'email',
  sms: 'sms',
  push: 'push',
};

const normalizeChannelToken = (channel) => {
  const token = String(channel || '').trim().toLowerCase();
  const normalized = CHANNEL_ALIASES[token] || token;
  return DELIVERY_CHANNELS.includes(normalized) ? normalized : null;
};

export function normalizeRequestedDeliveryChannels(channels) {
  const input = Array.isArray(channels) && channels.length ? channels : DEFAULT_CHANNELS;
  const seen = new Set();
  const normalized = [];

  for (const channel of input) {
    const value = normalizeChannelToken(channel);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
  }

  return normalized.length ? normalized : DEFAULT_CHANNELS;
}

const toPlainUser = (user) => {
  if (!user) return null;
  if (typeof user.get === 'function') return user.get({ plain: true });
  return user;
};

async function loadRecipientPreferences(userId) {
  try {
    const User = getUser();
    if (!User?.findByPk) return { available: false, preferences: null };

    const user = await User.findByPk(userId, {
      attributes: ['id', 'emailNotifications', 'smsNotifications', 'notificationPreferences'],
    });
    const plainUser = toPlainUser(user);
    if (!plainUser) return { available: false, preferences: null };

    return {
      available: true,
      preferences: normalizeNotificationPreferences(plainUser.notificationPreferences, plainUser),
    };
  } catch (error) {
    logger.warn(`Notification preference lookup failed for user ${userId}: ${error.message}`);
    return { available: false, preferences: null };
  }
}

const skippedDecision = (channel, errorCode, errorMessage) => ({
  channel,
  status: 'skipped',
  errorCode,
  errorMessage,
});

const parseTimeToMinutes = (value) => {
  const match = typeof value === 'string' ? value.match(/^([01]\d|2[0-3]):([0-5]\d)$/) : null;
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const dateForPolicy = (now) => {
  const date = now instanceof Date ? now : new Date(now || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const minutesForTimezone = (now, timezone) => {
  const date = dateForPolicy(now);
  const zone = typeof timezone === 'string' && timezone.trim() ? timezone.trim() : 'local';
  if (zone.toUpperCase() === 'UTC') return date.getUTCHours() * 60 + date.getUTCMinutes();
  if (zone === 'local') return date.getHours() * 60 + date.getMinutes();

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      timeZone: zone,
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === 'hour')?.value);
    const minute = Number(parts.find((part) => part.type === 'minute')?.value);
    if (Number.isInteger(hour) && Number.isInteger(minute)) return hour * 60 + minute;
  } catch (error) {
    logger.warn(`Quiet-hours timezone fallback used: ${error.message}`);
  }

  return date.getHours() * 60 + date.getMinutes();
};

const isWithinQuietHours = (quietHours = {}, now) => {
  if (quietHours.enabled !== true) return false;
  const start = parseTimeToMinutes(quietHours.start);
  const end = parseTimeToMinutes(quietHours.end);
  if (start === null || end === null || start === end) return false;

  const current = minutesForTimezone(now, quietHours.timezone);
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
};

const quietHoursBlockProvider = ({ quietHours, priority, now }) => (
  !QUIET_HOURS_BYPASS_PRIORITIES.has(String(priority || '').toLowerCase())
  && isWithinQuietHours(quietHours, now)
);

const digestDefersProvider = ({ preferences, priority }) => (
  !QUIET_HOURS_BYPASS_PRIORITIES.has(String(priority || '').toLowerCase())
  && DIGEST_DEFERRED_FREQUENCIES.has(String(preferences?.digestFrequency || '').toLowerCase())
);

const providerDecisionFor = ({ channel, category, priority, preferences, preferencesAvailable, now }) => {
  if (!preferencesAvailable) {
    return skippedDecision(
      channel,
      'preference_unavailable',
      'Notification preferences were unavailable for provider-channel delivery.',
    );
  }

  const preferenceKey = CHANNEL_TO_PREFERENCE_KEY[channel];
  const categoryPreferences = preferences.categories?.[category] || preferences.categories?.system || {};
  const channelEnabled = preferences.channels?.[preferenceKey] === true;
  const categoryEnabled = categoryPreferences[preferenceKey] === true;

  if (!channelEnabled || !categoryEnabled) {
    return skippedDecision(
      channel,
      'preference_disabled',
      'Recipient notification preferences disabled this channel.',
    );
  }

  if (quietHoursBlockProvider({ quietHours: preferences.quietHours, priority, now })) {
    return skippedDecision(
      channel,
      'quiet_hours_active',
      'Recipient quiet hours are active for provider-channel delivery.',
    );
  }

  if (digestDefersProvider({ preferences, priority })) {
    return skippedDecision(
      channel,
      'digest_deferred',
      `Recipient prefers ${preferences.digestFrequency} digest delivery for provider-channel notifications.`,
    );
  }

  return { channel, status: 'pending' };
};

export async function resolveNotificationDeliveryPlan({ userId, category = 'system', priority = 'normal', channels, now } = {}) {
  const requestedChannels = normalizeRequestedDeliveryChannels(channels);
  const needsPreferences = requestedChannels.some((channel) => PROVIDER_CHANNELS.has(channel));
  const preferenceState = needsPreferences
    ? await loadRecipientPreferences(userId)
    : { available: true, preferences: null };

  return requestedChannels.map((channel) => {
    if (channel === 'in_app') return { channel, status: 'emit' };
    return providerDecisionFor({
      channel,
      category,
      priority,
      preferences: preferenceState.preferences,
      preferencesAvailable: preferenceState.available,
      now,
    });
  });
}

export async function emitNotificationToUser(userId, notification) {
  try {
    const io = getIO();
    if (!io) return 'pending';

    io.to(`user:${userId}`).emit('notification:new', notification);

    const Notification = getNotification();
    if (Notification) {
      const unreadCount = await Notification.count({
        where: { userId, read: false },
      });
      io.to(`user:${userId}`).emit('notification:count', { unreadCount });
    }

    return 'sent';
  } catch (error) {
    logger.warn(`Socket emit failed for user ${userId}: ${error.message}`);
    return 'failed';
  }
}

async function recordDeliveryDecision({ notificationPayload, notification, decision, status }) {
  const deliveryResult = await recordNotificationDelivery({
    notificationId: notification.id,
    userId: notificationPayload.userId,
    channel: decision.channel,
    status,
    errorCode: decision.errorCode,
    errorMessage: decision.errorMessage,
    metadata: {
      policy: {
        category: notificationPayload.category,
        priority: notificationPayload.priority,
      },
    },
  });

  if (!deliveryResult.success) {
    logger.warn(`Notification delivery ledger skipped: ${deliveryResult.error}`);
  }
}

export async function deliverNotificationWithPolicy({ notificationPayload, notification, channels, now } = {}) {
  const plan = await resolveNotificationDeliveryPlan({
    userId: notificationPayload.userId,
    category: notificationPayload.category,
    priority: notificationPayload.priority,
    channels,
    now,
  });
  const channelStatuses = {};

  for (const decision of plan) {
    const status = decision.channel === 'in_app'
      ? await emitNotificationToUser(notificationPayload.userId, notification)
      : decision.status;
    channelStatuses[decision.channel] = status;
    await recordDeliveryDecision({ notificationPayload, notification, decision, status });
  }

  return { plan, channelStatuses };
}