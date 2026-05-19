/**
 * ┌─── SUB-COMPONENT: NotificationBell ────────────────────────┐
 * │ PARENT: SocialFeed / DashboardHeader                        │
 * │ PURPOSE: Shows unread count badge + dropdown of recent      │
 * │          notifications with mark-as-read                    │
 * │ WIREFRAME:                                                  │
 * │ 🔔(3) → dropdown:                                          │
 * │ ┌──────────────────────────────┐                            │
 * │ │ New achievement unlocked!    │                            │
 * │ │ Sean liked your post         │                            │
 * │ │ Workout streak: 7 days!      │                            │
 * │ │ [Mark all read]              │                            │
 * │ └──────────────────────────────┘                            │
 * │ Props: none (self-fetching)                                 │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Bell] → toggles dropdown                                   │
 * │ [Notification] → navigates to related entity                │
 * │ [Mark all] → PUT /api/notifications/read-all                │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useEffect, useState, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Bell, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../../../services/api';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const NotificationBell: React.FC = memo(() => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const [countRes, listRes] = await Promise.all([
        api.get('/api/notifications/count'),
        api.get('/api/notifications'),
      ]);
      setUnreadCount(countRes.data.count || countRes.data.unreadCount || 0);
      setNotifications((listRes.data.notifications || listRes.data || []).slice(0, 10));
    } catch {
      // Notifications not critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* best-effort notification refresh */ }
  };

  return (
    <BellWrap ref={dropdownRef}>
      <BellBtn onClick={() => setIsOpen(!isOpen)} aria-label="Notifications">
        <Bell size={20} />
        {unreadCount > 0 && <Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>}
      </BellBtn>

      {isOpen && (
        <Dropdown>
          <DropdownHeader>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <MarkAllBtn onClick={markAllRead}>
                <Check size={12} /> Mark all read
              </MarkAllBtn>
            )}
          </DropdownHeader>

          {notifications.length > 0 ? (
            <NotifList>
              {notifications.map(n => (
                <NotifItem key={n.id} $unread={!n.isRead}>
                  <NotifTitle>{n.title}</NotifTitle>
                  <NotifMessage>{n.message}</NotifMessage>
                  <NotifTime>
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
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

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

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
  background: #ef4444;
  color: #fff;
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
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
`;

const MarkAllBtn = styled.button`
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

  &:hover { text-decoration: underline; }
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
  cursor: pointer;
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
