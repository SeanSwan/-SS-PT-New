/**
 * FILE: ActionRequiredInbox.tsx
 * PURPOSE: Dedicated Communications OS queue for unresolved action-required notifications.
 */
import React, { useMemo } from 'react';
import { AlertCircle, ArrowRight, CheckCheck, CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react';

import { useCommunicationCenter } from '../../hooks/useCommunicationCenter';
import type { Notification, NotificationAction } from '../../store/slices/notificationSlice';
import {
  ActionButton,
  ActionCard,
  ActionCardTitle,
  ActionInboxHeader,
  ActionInboxShell,
  ActionKicker,
  ActionLink,
  ActionList,
  ActionMessage,
  ActionMeta,
  ActionRow,
  ActionState,
  ActionTitle,
  ActionTitleBlock,
  PriorityPill,
  RefreshButton,
} from './ActionRequiredInbox.styles';

type LinkAction = {
  href: string;
  label: string;
  type: 'link';
};

type SnoozeAction = {
  durationMinutes: number;
  label: string;
  type: 'snooze';
};

type SafeAction = LinkAction | SnoozeAction;

const SNOOZE_MIN_MINUTES = 5;
const SNOOZE_MAX_MINUTES = 10080;
const DEFAULT_SNOOZE_MINUTES = 60;
const MAX_VISIBLE_ACTIONS = 3;

const safeInternalHref = (href: unknown): string | null => {
  if (typeof href !== 'string') return null;
  const value = href.trim();
  return value.startsWith('/') && !value.startsWith('//') ? value : null;
};

const normalizeSnoozeDuration = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return DEFAULT_SNOOZE_MINUTES;
  return parsed >= SNOOZE_MIN_MINUTES && parsed <= SNOOZE_MAX_MINUTES
    ? parsed
    : DEFAULT_SNOOZE_MINUTES;
};

const normalizeAction = (action: NotificationAction): SafeAction | null => {
  const label = action.label?.trim();
  if (!label) return null;

  if (action.type === 'snooze') {
    return { label, type: 'snooze', durationMinutes: normalizeSnoozeDuration(action.durationMinutes) };
  }

  const href = safeInternalHref(action.href);
  if (!href) return null;
  return { label, type: 'link', href };
};

const getSafeActions = (notification: Notification): SafeAction[] => (
  (notification.actions || [])
    .map(normalizeAction)
    .filter((action): action is SafeAction => Boolean(action))
    .slice(0, MAX_VISIBLE_ACTIONS)
);

const formatActionDate = (value?: string) => {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
};

interface ActionRequiredInboxProps {
  fetchOnMount?: boolean;
  subscribeToSocket?: boolean;
}

const ActionRequiredInbox: React.FC<ActionRequiredInboxProps> = ({
  fetchOnMount = false,
  subscribeToSocket = false,
}) => {
  const {
    buckets,
    loading,
    error,
    refresh,
    markAsClicked,
    markAsRead,
    resolveNotificationAction,
    snoozeNotification,
  } = useCommunicationCenter({
    fetchOnMount,
    subscribeToSocket,
    initialBucket: 'action_required',
  });

  const actionBucket = useMemo(
    () => buckets.find(bucket => bucket.key === 'action_required'),
    [buckets],
  );
  const actions = actionBucket?.notifications || [];

  return (
    <ActionInboxShell aria-label="Action required inbox">
      <ActionInboxHeader>
        <ActionTitleBlock>
          <ActionKicker>Action Required</ActionKicker>
          <ActionTitle>
            <AlertCircle size={20} aria-hidden="true" />
            Review Queue
          </ActionTitle>
        </ActionTitleBlock>
        <RefreshButton type="button" onClick={refresh} aria-label="Refresh action required inbox">
          <RefreshCw size={16} />
          Refresh
        </RefreshButton>
      </ActionInboxHeader>

      {loading ? (
        <ActionState>Syncing required actions...</ActionState>
      ) : error ? (
        <ActionState>Action queue unavailable. Refresh when the connection recovers.</ActionState>
      ) : actions.length === 0 ? (
        <ActionState>No open required actions.</ActionState>
      ) : (
        <ActionList>
          {actions.map((notification) => {
            const safeActions = getSafeActions(notification);
            return (
              <ActionCard key={notification.id}>
                <ActionMeta>
                  <PriorityPill>{notification.priority || 'normal'}</PriorityPill>
                  <span>{formatActionDate(notification.createdAt)}</span>
                  {notification.actionStatus && <span>{notification.actionStatus}</span>}
                </ActionMeta>
                <ActionCardTitle>{notification.title}</ActionCardTitle>
                <ActionMessage>{notification.message}</ActionMessage>

                <ActionRow>
                  {safeActions.map((action) => (
                    action.type === 'link' ? (
                      <ActionLink
                        key={`${notification.id}:${action.href}:${action.label}`}
                        href={action.href}
                        onClick={() => void markAsClicked(notification.id)}
                      >
                        <span>{action.label}</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </ActionLink>
                    ) : (
                      <ActionButton
                        key={`${notification.id}:snooze:${action.durationMinutes}:${action.label}`}
                        type="button"
                        onClick={() => void snoozeNotification(notification.id, action.durationMinutes)}
                      >
                        <span>{action.label}</span>
                        <Clock size={15} aria-hidden="true" />
                      </ActionButton>
                    )
                  ))}
                  <ActionButton
                    type="button"
                    onClick={() => void resolveNotificationAction(notification.id, 'resolved')}
                    aria-label={`Resolve ${notification.title}`}
                  >
                    <span>Resolve</span>
                    <CheckCircle2 size={15} aria-hidden="true" />
                  </ActionButton>
                  <ActionButton
                    type="button"
                    onClick={() => void resolveNotificationAction(notification.id, 'dismissed')}
                    aria-label={`Dismiss ${notification.title}`}
                  >
                    <span>Dismiss</span>
                    <XCircle size={15} aria-hidden="true" />
                  </ActionButton>
                  <ActionButton
                    type="button"
                    onClick={() => void markAsRead(notification.id)}
                    aria-label={`Mark ${notification.title} read`}
                  >
                    <span>Mark read</span>
                    <CheckCheck size={15} aria-hidden="true" />
                  </ActionButton>
                </ActionRow>
              </ActionCard>
            );
          })}
        </ActionList>
      )}
    </ActionInboxShell>
  );
};

export default React.memo(ActionRequiredInbox);