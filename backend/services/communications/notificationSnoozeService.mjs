import { Op } from 'sequelize';

export const SNOOZE_ACTION_STATUS = 'snoozed';
export const SNOOZE_MIN_MINUTES = 5;
export const SNOOZE_MAX_MINUTES = 10080;
export const SNOOZE_DEFAULT_MINUTES = 60;
export const SNOOZE_DURATION_ERROR = `Snooze duration must be between ${SNOOZE_MIN_MINUTES} and ${SNOOZE_MAX_MINUTES} minutes.`;

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export const normalizeSnoozeDurationMinutes = (value = SNOOZE_DEFAULT_MINUTES) => {
  const source = value === undefined || value === null || value === ''
    ? SNOOZE_DEFAULT_MINUTES
    : Number(value);
  if (!Number.isInteger(source)) return null;
  if (source < SNOOZE_MIN_MINUTES || source > SNOOZE_MAX_MINUTES) return null;
  return source;
};

export const buildVisibleNotificationWhere = (userId, now = new Date()) => ({
  userId,
  [Op.or]: [
    { actionStatus: { [Op.ne]: SNOOZE_ACTION_STATUS } },
    { actionStatus: null },
    { expiresAt: { [Op.lte]: now } },
    { expiresAt: null },
  ],
});

export const applyNotificationSnooze = (notification, options = {}) => {
  if (!notification) {
    return { success: false, error: 'Notification is required.' };
  }

  const durationMinutes = normalizeSnoozeDurationMinutes(options.durationMinutes);
  if (!durationMinutes) {
    return { success: false, error: SNOOZE_DURATION_ERROR };
  }

  const snoozedAt = normalizeDate(options.now);
  const snoozedUntil = new Date(snoozedAt.getTime() + (durationMinutes * 60 * 1000));
  const metadata = isPlainObject(notification.metadata) ? { ...notification.metadata } : {};
  const currentAction = isPlainObject(metadata.notificationAction) ? metadata.notificationAction : {};

  Object.assign(notification, {
    read: true,
    status: SNOOZE_ACTION_STATUS,
    actionStatus: SNOOZE_ACTION_STATUS,
    expiresAt: snoozedUntil,
    metadata: {
      ...metadata,
      notificationAction: {
        ...currentAction,
        type: 'snooze',
        durationMinutes,
        snoozedAt: snoozedAt.toISOString(),
        snoozedUntil: snoozedUntil.toISOString(),
      },
    },
  });

  return {
    success: true,
    durationMinutes,
    snoozedAt,
    snoozedUntil,
  };
};
