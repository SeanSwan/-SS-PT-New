/**
 * SocialNotificationsPanel
 * ========================
 * Social Hub notification center backed by /api/notifications.
 */

import React from 'react';
import { Bell, CheckCheck, Inbox, RefreshCw } from 'lucide-react';
import styled from 'styled-components';
import type { SocialNotification } from '../../../hooks/useSocialNotifications';

interface SocialNotificationsPanelProps {
  notifications: SocialNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  onOpenNotification: (notification: SocialNotification) => void;
}

const TYPE_LABELS: Record<string, string> = {
  achievement: 'Achievement',
  reward: 'Reward',
  session: 'Session',
  workout: 'Workout',
  measurement: 'Measurement',
  order: 'Order',
  system: 'System',
};

function formatDate(value?: string) {
  if (!value) return 'Recent';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recent';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function getSenderName(notification: SocialNotification) {
  const sender = notification.sender;
  if (!sender) return null;
  return [sender.firstName, sender.lastName].filter(Boolean).join(' ') || null;
}

const SocialNotificationsPanel: React.FC<SocialNotificationsPanelProps> = ({
  notifications,
  unreadCount,
  loading,
  error,
  onRefresh,
  onMarkAllRead,
  onOpenNotification,
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

      {loading ? (
        <Stack aria-label="Loading notifications">
          {[0, 1, 2].map((item) => (
            <SkeletonRow key={item} />
          ))}
        </Stack>
      ) : error ? (
        <StateBlock>
          <Inbox size={34} />
          <StateTitle>Notifications unavailable</StateTitle>
          <StateText>{error}</StateText>
          <ActionButton type="button" onClick={onRefresh}>
            <RefreshCw size={16} />
            Retry
          </ActionButton>
        </StateBlock>
      ) : notifications.length === 0 ? (
        <StateBlock>
          <Inbox size={34} />
          <StateTitle>All clear</StateTitle>
          <StateText>New session, progress, and reward updates will land here.</StateText>
        </StateBlock>
      ) : (
        <Stack>
          {notifications.map((notification) => {
            const senderName = getSenderName(notification);
            return (
              <NotificationRow
                key={notification.id}
                type="button"
                $unread={!notification.read}
                onClick={() => onOpenNotification(notification)}
              >
                <StatusRail $unread={!notification.read} />
                <NotificationCopy>
                  <MetaRow>
                    <TypePill>{TYPE_LABELS[notification.type] || notification.type || 'Update'}</TypePill>
                    <TimeText>{formatDate(notification.createdAt)}</TimeText>
                  </MetaRow>
                  <NotificationTitle>{notification.title}</NotificationTitle>
                  <NotificationMessage>{notification.message}</NotificationMessage>
                  {senderName && <SenderText>From {senderName}</SenderText>}
                </NotificationCopy>
              </NotificationRow>
            );
          })}
        </Stack>
      )}
    </PanelShell>
  );
};

const PanelShell = styled.section`
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgba(0, 32, 96, 0.72), rgba(10, 10, 15, 0.88)),
    var(--bg-elevated, #003080);
  padding: clamp(18px, 3vw, 28px);
  color: var(--text-primary, #E0ECF4);
`;

const PanelHeader = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;

  @media (max-width: 680px) {
    flex-direction: column;
  }
`;

const TitleBlock = styled.div`display: grid; gap: 6px;`;

const Kicker = styled.span`
  color: var(--accent-luxury, #C6A84B);
  font: 700 0.72rem/1 'Fira Code', monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const PanelTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font: 700 clamp(1.35rem, 3vw, 2rem)/1.1 'Plus Jakarta Sans', sans-serif;
`;

const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`;

const UnreadPill = styled.span`
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--accent-luxury, #C6A84B) 34%, transparent);
  border-radius: 999px;
  padding: 0 12px;
  color: var(--accent-luxury, #C6A84B);
  font: 700 0.78rem/1 'Fira Code', monospace;
`;

const ActionButton = styled.button`
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-primary, #003080) 68%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font: 700 0.82rem/1 'Sora', sans-serif;
  padding: 0 14px;
`;

const IconButton = styled(ActionButton)`
  width: 44px;
  justify-content: center;
  padding: 0;
`;

const Stack = styled.div`display: grid; gap: 12px;`;

const NotificationRow = styled.button<{ $unread: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: 5px minmax(0, 1fr);
  min-height: 92px;
  width: 100%;
  overflow: hidden;
  border: 1px solid ${({ $unread }) =>
    $unread
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)'};
  border-radius: 8px;
  background: ${({ $unread }) =>
    $unread
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 9%, var(--bg-card, #141419))'
      : 'color-mix(in srgb, var(--bg-card, #141419) 92%, transparent)'};
  color: inherit;
  cursor: pointer;
  text-align: left;
  padding: 0;
`;

const StatusRail = styled.span<{ $unread: boolean }>`
  background: ${({ $unread }) =>
    $unread ? 'var(--accent-primary, #60C0F0)' : 'color-mix(in srgb, var(--text-muted, #4070C0) 38%, transparent)'};
`;

const NotificationCopy = styled.div`
  display: grid;
  gap: 8px;
  padding: 14px 16px 16px;
  min-width: 0;
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
`;

const TypePill = styled.span`
  color: var(--accent-primary, #60C0F0);
  font: 700 0.7rem/1 'Fira Code', monospace;
  text-transform: uppercase;
`;

const TimeText = styled.span`color: var(--text-muted, #4070C0); font: 600 0.72rem/1 'Sora', sans-serif;`;

const NotificationTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 700 1rem/1.2 'Plus Jakarta Sans', sans-serif;
`;

const NotificationMessage = styled.p`
  margin: 0;
  color: var(--text-secondary, #B7C7D8);
  font: 400 0.9rem/1.45 'Sora', sans-serif;
`;

const SenderText = styled.span`color: var(--accent-luxury, #C6A84B); font: 600 0.78rem/1 'Sora', sans-serif;`;

const StateBlock = styled.div`
  display: grid;
  justify-items: center;
  gap: 10px;
  min-height: 220px;
  align-content: center;
  text-align: center;
  border: 1px dashed color-mix(in srgb, var(--accent-secondary, #8B5CF6) 26%, transparent);
  border-radius: 8px;
  padding: 26px;
`;

const StateTitle = styled.h3`margin: 0; font: 700 1.15rem/1.2 'Plus Jakarta Sans', sans-serif;`;

const StateText = styled.p`
  max-width: 32rem;
  margin: 0;
  color: var(--text-secondary, #B7C7D8);
  font: 400 0.9rem/1.5 'Sora', sans-serif;
`;

const SkeletonRow = styled.div`
  min-height: 92px;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(96, 192, 240, 0.08), rgba(139, 92, 246, 0.12), rgba(96, 192, 240, 0.08));
`;

export default SocialNotificationsPanel;
