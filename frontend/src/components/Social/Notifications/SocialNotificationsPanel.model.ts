/**
 * FILE: SocialNotificationsPanel.model.ts
 * PURPOSE: Pure normalization helpers for the Social notifications panel.
 */
import type { SocialNotification } from '../../../hooks/useSocialNotifications';

type NotificationPanelLinkAction = {
  label: string;
  href: string;
  type: 'link';
};

type NotificationPanelSnoozeAction = {
  label: string;
  durationMinutes: number;
  type: 'snooze';
};

export type NotificationPanelAction = NotificationPanelLinkAction | NotificationPanelSnoozeAction;

const SNOOZE_MIN_MINUTES = 5;
const SNOOZE_MAX_MINUTES = 10080;
const DEFAULT_SNOOZE_MINUTES = 60;

const TYPE_LABELS: Record<string, string> = {
  achievement: 'Achievement',
  reward: 'Reward',
  admin: 'Admin',
  session: 'Session',
  workout: 'Workout',
  measurement: 'Measurement',
  order: 'Order',
  system: 'System',
};

function isSafeInternalHref(href: string) {
  return href.startsWith('/') && !href.startsWith('//');
}

function normalizeSnoozeDuration(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SNOOZE_MINUTES;
  return Math.min(SNOOZE_MAX_MINUTES, Math.max(SNOOZE_MIN_MINUTES, Math.round(parsed)));
}

export function getNotificationTypeLabel(type?: string) {
  return TYPE_LABELS[type || ''] || type || 'Update';
}

export function getNotificationActions(notification: SocialNotification): NotificationPanelAction[] {
  const canonicalActions = (notification.actions || []).flatMap((action): NotificationPanelAction[] => {
    const label = action.label?.trim();
    if (!label) return [];

    if (action.type === 'snooze') {
      return [
        {
          label,
          durationMinutes: normalizeSnoozeDuration(action.durationMinutes),
          type: 'snooze',
        },
      ];
    }

    const href = action.href?.trim();
    if (!href || !isSafeInternalHref(href)) return [];
    return [{ label, href, type: 'link' }];
  });

  if (canonicalActions.length > 0) return canonicalActions.slice(0, 3);

  const fallbackHref = notification.link?.trim();
  if (notification.actionLabel && fallbackHref && isSafeInternalHref(fallbackHref)) {
    return [{ label: notification.actionLabel, href: fallbackHref, type: 'link' }];
  }

  return [];
}

export function formatNotificationDate(value?: string) {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

export function getNotificationSenderName(notification: SocialNotification) {
  const sender = notification.sender;
  if (!sender) return null;
  return [sender.firstName, sender.lastName].filter(Boolean).join(' ') || null;
}