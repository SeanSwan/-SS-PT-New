/**
 * ============================================================================
 * FILE: DashboardNotificationsTab.tsx
 * PURPOSE: Notifications tab for the V3 user dashboard (workstream N —
 *          "Observatory absorbs Social"). Wraps SocialNotificationsPanel with
 *          the live useSocialNotifications feed, preserving the /social
 *          behavior: opening a notification marks it read and follows its
 *          in-app link.
 * HOW IT FITS: Mounted by UserDashboardTabsV3 on the 'notifications' tab.
 * ============================================================================
 */
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SocialNotificationsPanel from '../../Social/Notifications/SocialNotificationsPanel';
import {
  useSocialNotifications,
  type SocialNotification,
} from '../../../hooks/useSocialNotifications';

const DashboardNotificationsTab: React.FC = () => {
  const navigate = useNavigate();
  const socialNotifications = useSocialNotifications();

  const handleNotificationSelect = useCallback(
    async (notification: SocialNotification) => {
      await socialNotifications.markAsClicked(notification.id);
      const link = typeof notification.link === 'string' ? notification.link.trim() : '';
      if (link.startsWith('/') && !link.startsWith('//')) navigate(link);
    },
    [navigate, socialNotifications],
  );

  return (
    <SocialNotificationsPanel
      notifications={socialNotifications.notifications}
      unreadCount={socialNotifications.unreadCount}
      loading={socialNotifications.loading}
      error={socialNotifications.error}
      onRefresh={socialNotifications.refresh}
      onMarkAllRead={socialNotifications.markAllAsRead}
      onOpenNotification={handleNotificationSelect}
      onSnoozeNotification={socialNotifications.snoozeNotification}
    />
  );
};

export default DashboardNotificationsTab;
