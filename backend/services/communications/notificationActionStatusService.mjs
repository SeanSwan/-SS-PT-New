export const ACTION_STATUS_RESOLVED = 'resolved';
export const ACTION_STATUS_DISMISSED = 'dismissed';

const STATUS_ALIASES = new Map([
  ['resolve', ACTION_STATUS_RESOLVED],
  ['resolved', ACTION_STATUS_RESOLVED],
  ['complete', ACTION_STATUS_RESOLVED],
  ['completed', ACTION_STATUS_RESOLVED],
  ['dismiss', ACTION_STATUS_DISMISSED],
  ['dismissed', ACTION_STATUS_DISMISSED],
]);

const normalizeDate = (value) => {
  const date = value instanceof Date ? value : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

export const normalizeActionResolutionStatus = (value) => {
  if (typeof value !== 'string') return null;
  return STATUS_ALIASES.get(value.trim().toLowerCase()) || null;
};

export const applyNotificationActionStatus = (notification, {
  status,
  actorUserId,
  now = new Date(),
} = {}) => {
  const normalizedStatus = normalizeActionResolutionStatus(status);
  if (!normalizedStatus) {
    return {
      success: false,
      error: 'Notification action status must be resolved or dismissed.',
      statusCode: 400,
    };
  }

  if (!notification?.requiresAction) {
    return {
      success: false,
      error: 'Notification does not require action.',
      statusCode: 400,
    };
  }

  const actedAt = normalizeDate(now);
  const actionType = normalizedStatus === ACTION_STATUS_DISMISSED ? 'dismiss' : 'resolve';
  const timestampKey = normalizedStatus === ACTION_STATUS_DISMISSED ? 'dismissedAt' : 'resolvedAt';

  notification.read = true;
  notification.status = 'read';
  notification.actionStatus = normalizedStatus;
  notification.openedAt = notification.openedAt || actedAt;
  notification.metadata = {
    ...(notification.metadata && typeof notification.metadata === 'object' ? notification.metadata : {}),
    notificationAction: {
      ...(
        notification.metadata?.notificationAction
        && typeof notification.metadata.notificationAction === 'object'
          ? notification.metadata.notificationAction
          : {}
      ),
      type: actionType,
      status: normalizedStatus,
      actorUserId,
      [timestampKey]: actedAt.toISOString(),
    },
  };

  return {
    success: true,
    actionStatus: normalizedStatus,
    actedAt,
  };
};
