/**
 * NotificationBell
 *
 * Retained full Social feed notification dropdown. Notification data is owned by
 * the shared notification center so this implementation does not maintain a
 * polling copy of the notifications API state.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Bell, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useNotificationCenter } from '../../../hooks/useNotificationCenter';

const NotificationBell: React.FC = memo(() => {
  const { notifications, unreadCount, markAllAsRead } = useNotificationCenter({
    fetchOnMount: true,
    subscribeToSocket: true,
  });
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recentNotifications = notifications.slice(0, 10);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const markAllRead = () => {
    void markAllAsRead();
  };

  return (
    <BellWrap ref={dropdownRef}>
      <BellBtn type="button" onClick={() => setIsOpen(!isOpen)} aria-label="Notifications">
        <Bell size={20} />
        {unreadCount > 0 && <Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>}
      </BellBtn>

      {isOpen && (
        <Dropdown>
          <DropdownHeader>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <MarkAllBtn type="button" onClick={markAllRead}>
                <Check size={12} /> Mark all read
              </MarkAllBtn>
            )}
          </DropdownHeader>

          {recentNotifications.length > 0 ? (
            <NotifList>
              {recentNotifications.map((notification) => (
                <NotifItem key={notification.id} $unread={!notification.read}>
                  <NotifTitle>{notification.title}</NotifTitle>
                  <NotifMessage>{notification.message}</NotifMessage>
                  <NotifTime>
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </NotifTime>
                </NotifItem>
              ))}
            </NotifList>
          ) : (
            <EmptyNotif>No notifications yet</EmptyNotif>
          )}
        </Dropdown>
      )}
    </BellWrap>
  );
});

NotificationBell.displayName = 'NotificationBell';
export default NotificationBell;

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const BellWrap = styled.div`
  position: relative;
`;

const BellBtn = styled.button`
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const Badge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--danger, #ef4444);
  color: var(--text-on-danger, #FFFFFF);
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: min(340px, 90vw);
  max-height: 400px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;
  animation: ${slideIn} 0.2s cubic-bezier(0.16, 1, 0.3, 1);
`;

const DropdownHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
`;

const MarkAllBtn = styled.button`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &:hover { text-decoration: underline; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const NotifList = styled.div`
  overflow-y: auto;
  max-height: 340px;

  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
    border-radius: 2px;
  }
`;

const NotifItem = styled.div<{ $unread: boolean }>`
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.04));
  transition: background 0.15s ease;
  background: ${({ $unread }) =>
    $unread ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, transparent)' : 'transparent'};

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent); }
`;

const NotifTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const NotifMessage = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  margin-top: 2px;
`;

const NotifTime = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
  margin-top: 4px;
`;

const EmptyNotif = styled.div`
  padding: 32px 16px;
  text-align: center;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.3));
`;
