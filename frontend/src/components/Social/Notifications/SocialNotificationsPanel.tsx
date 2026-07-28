/**
 * SocialNotificationsPanel
 * ========================
 * Social Hub notification center backed by /api/notifications.
 */

import React from 'react';
import { ArrowRight, Bell, CheckCheck, Clock, Inbox, RefreshCw } from 'lucide-react';
import type { SocialNotification } from '../../../hooks/useSocialNotifications';
import {
  ActionButton,
  HeaderActions,
  IconButton,
  Kicker,
  MetaRow,
  NotificationActionButton,
  NotificationActions,
  NotificationCopy,
  NotificationMessage,
  NotificationOpenButton,
  NotificationRow,
  NotificationTitle,
  PanelHeader,
  PanelShell,
  PanelTitle,
  SenderText,
  SkeletonRow,
  Stack,
  StateBlock,
  StateText,
  StateTitle,
  StatusRail,
  TimeText,
  TitleBlock,
  TypePill,
  UnreadPill,
} from './SocialNotificationsPanel.styles';
import {
  formatNotificationDate,
  getNotificationActions,
  getNotificationSenderName,
  getNotificationTypeLabel,
} from './SocialNotificationsPanel.model';

interface SocialNotificationsPanelProps {
  notifications: SocialNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  onOpenNotification: (notification: SocialNotification) => void;
  onSnoozeNotification?: (
    notificationId: SocialNotification['id'],
    durationMinutes?: number,
  ) => void | Promise<void>;
}

interface NotificationPanelBodyProps {
  notifications: SocialNotification[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenNotification: (notification: SocialNotification) => void;
  onSnoozeNotification?: SocialNotificationsPanelProps['onSnoozeNotification'];
}

interface NotificationListProps {
  notifications: SocialNotification[];
  onOpenNotification: (notification: SocialNotification) => void;
  onSnoozeNotification?: SocialNotificationsPanelProps['onSnoozeNotification'];
}

function LoadingNotificationsState() {
  return (
    <Stack aria-label="Loading notifications">
      {[0, 1, 2].map((item) => (
        <SkeletonRow key={item} />
      ))}
    </Stack>
  );
}

function ErrorNotificationsState({ error, onRefresh }: Pick<NotificationPanelBodyProps, 'error' | 'onRefresh'>) {
  return (
    <StateBlock>
      <Inbox size={34} />
      <StateTitle>Notifications unavailable</StateTitle>
      <StateText>{error}</StateText>
      <ActionButton type="button" onClick={onRefresh}>
        <RefreshCw size={16} />
        Retry
      </ActionButton>
    </StateBlock>
  );
}

function EmptyNotificationsState() {
  return (
    <StateBlock>
      <Inbox size={34} />
      <StateTitle>All clear</StateTitle>
      <StateText>New session, progress, and reward updates will land here.</StateText>
    </StateBlock>
  );
}

function NotificationItem({
  notification,
  onOpenNotification,
  onSnoozeNotification,
}: {
  notification: SocialNotification;
  onOpenNotification: (notification: SocialNotification) => void;
  onSnoozeNotification?: SocialNotificationsPanelProps['onSnoozeNotification'];
}) {
  const senderName = getNotificationSenderName(notification);
  const actions = getNotificationActions(notification);
  const visibleActions = actions.filter((action) => action.type !== 'snooze' || onSnoozeNotification);

  return (
    <NotificationRow $unread={!notification.read}>
      <StatusRail $unread={!notification.read} />
      <NotificationCopy>
        <NotificationOpenButton
          type="button"
          onClick={() => onOpenNotification(notification)}
          aria-label={`Open notification: ${notification.title}`}
        >
          <MetaRow>
            <TypePill>{getNotificationTypeLabel(notification.type)}</TypePill>
            <TimeText>{formatNotificationDate(notification.createdAt)}</TimeText>
          </MetaRow>
          <NotificationTitle>{notification.title}</NotificationTitle>
          <NotificationMessage>{notification.message}</NotificationMessage>
          {senderName && <SenderText>From {senderName}</SenderText>}
        </NotificationOpenButton>
        {visibleActions.length > 0 && (
          <NotificationActions aria-label={`Actions for ${notification.title}`}>
            {visibleActions.map((action, index) =>
              action.type === 'snooze' ? (
                <NotificationActionButton
                  key={`${notification.id}:snooze:${action.durationMinutes}:${index}`}
                  type="button"
                  onClick={() => onSnoozeNotification?.(notification.id, action.durationMinutes)}
                >
                  <span>{action.label}</span>
                  <Clock size={16} />
                </NotificationActionButton>
              ) : (
                <NotificationActionButton
                  key={`${action.href}:${action.label}:${index}`}
                  type="button"
                  onClick={() => onOpenNotification({ ...notification, link: action.href, actionLabel: action.label })}
                >
                  <span>{action.label}</span>
                  <ArrowRight size={16} />
                </NotificationActionButton>
              ),
            )}
          </NotificationActions>
        )}
      </NotificationCopy>
    </NotificationRow>
  );
}

function NotificationList({ notifications, onOpenNotification, onSnoozeNotification }: NotificationListProps) {
  return (
    <Stack>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onOpenNotification={onOpenNotification}
          onSnoozeNotification={onSnoozeNotification}
        />
      ))}
    </Stack>
  );
}

function NotificationPanelBody({
  notifications,
  loading,
  error,
  onRefresh,
  onOpenNotification,
  onSnoozeNotification,
}: NotificationPanelBodyProps) {
  if (loading) return <LoadingNotificationsState />;
  if (error) return <ErrorNotificationsState error={error} onRefresh={onRefresh} />;
  if (notifications.length === 0) return <EmptyNotificationsState />;

  return (
    <NotificationList
      notifications={notifications}
      onOpenNotification={onOpenNotification}
      onSnoozeNotification={onSnoozeNotification}
    />
  );
}

const SocialNotificationsPanel: React.FC<SocialNotificationsPanelProps> = ({
  notifications,
  unreadCount,
  loading,
  error,
  onRefresh,
  onMarkAllRead,
  onOpenNotification,
  onSnoozeNotification,
}) => {
  return (
    <PanelShell aria-label="Social notifications">
      <PanelHeader>
        <TitleBlock>
          <Kicker>Signal Center</Kicker>
          <PanelTitle>
            <Bell size={22} />
            Notifications
          </PanelTitle>
        </TitleBlock>
        <HeaderActions>
          <UnreadPill>{unreadCount} unread</UnreadPill>
          {unreadCount > 0 && (
            <ActionButton type="button" onClick={onMarkAllRead}>
              <CheckCheck size={16} />
              Mark read
            </ActionButton>
          )}
          <IconButton type="button" onClick={onRefresh} aria-label="Refresh notifications">
            <RefreshCw size={18} />
          </IconButton>
        </HeaderActions>
      </PanelHeader>
      <NotificationPanelBody
        notifications={notifications}
        loading={loading}
        error={error}
        onRefresh={onRefresh}
        onOpenNotification={onOpenNotification}
        onSnoozeNotification={onSnoozeNotification}
      />
    </PanelShell>
  );
};

export default SocialNotificationsPanel;
