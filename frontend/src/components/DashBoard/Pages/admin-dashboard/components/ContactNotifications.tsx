/**
 * ContactNotifications.tsx - SwanStudios Business Intelligence Alert System
 * Crystalline Swan-themed professional aesthetics for finance and contact alerts.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronDown, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { useAlertReadState } from './ContactNotifications.alertState';
import ContactNotificationItem from './ContactNotificationItem';
import type { ContactNotificationsProps, Notification } from './ContactNotifications.types';
import {
  getErrorMessage,
  isDegradedError,
  mapContactNotifications,
  mapFinanceNotifications,
  NOTIFICATION_ROUTE_DESTINATIONS,
  PAGE_SIZE,
  upsertNotifications,
} from './ContactNotifications.helpers';
import {
  ControlButton,
  EmptyCheckIcon,
  EmptyState,
  ErrorBanner,
  HeaderControls,
  HeaderTitle,
  LoadMoreControl,
  LoadMoreLabel,
  LoadMoreRow,
  LoadingSpinner,
  NotificationBadge,
  NotificationHeader,
  NotificationsContainer,
  NotificationsList,
} from './ContactNotifications.styles';

type ApiResponse = { data: any };

const readNotificationResult = (
  result: PromiseSettledResult<ApiResponse>,
  fallbackMessage: string,
) => {
  if (result.status === 'fulfilled') return { response: result.value, error: null };
  return {
    response: null,
    error: isDegradedError(result.reason)
      ? 'Some data temporarily unavailable'
      : getErrorMessage(result.reason, fallbackMessage),
  };
};

const ContactNotifications: React.FC<ContactNotificationsProps> = ({
  autoRefresh = true,
  initialPageSize = PAGE_SIZE,
  showActions = true,
}) => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const { refreshReadState, ackAlert, bulkAck, isRead: isAckedRemotely, isArchived } =
    useAlertReadState(authAxios);
  const pageSize = initialPageSize;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [financeOffset, setFinanceOffset] = useState(0);
  const [contactOffset, setContactOffset] = useState(0);
  const [financeHasMore, setFinanceHasMore] = useState(true);
  const [contactHasMore, setContactHasMore] = useState(true);

  const fetchPage = useCallback(async (fOffset: number, cOffset: number, _isRefresh: boolean) => {
    try {
      setRefreshing(true);
      setError(null);

      const [financeResult, contactResult] = await Promise.allSettled([
        authAxios.get(`/api/admin/finance/notifications?limit=${pageSize}&offset=${fOffset}`),
        authAxios.get(`/api/contact?limit=${pageSize}&offset=${cOffset}`),
      ]);

      const financeRead = readNotificationResult(financeResult, 'Finance notifications unavailable');
      const contactRead = readNotificationResult(contactResult, 'Contact notifications unavailable');
      const financeRes = financeRead.response;
      const contactRes = contactRead.response;
      const newFinance = financeRes?.data.success
        ? mapFinanceNotifications(financeRes.data.data?.notifications || [])
        : [];
      const newContacts = contactRes?.data.success
        ? mapContactNotifications(contactRes.data.contacts || [])
        : [];

      if (financeRes?.data.data?.pagination) setFinanceHasMore(financeRes.data.data.pagination.hasMore);
      if (contactRes?.data.pagination) setContactHasMore(contactRes.data.pagination.hasMore);
      setNotifications((prev) => upsertNotifications(prev, newFinance, newContacts));

      const sourceErrors = [financeRead.error, contactRead.error].filter(Boolean);
      setError(sourceErrors.length ? sourceErrors.join(' | ') : null);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load notifications'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authAxios, pageSize]);

  useEffect(() => {
    fetchPage(0, 0, false);
    refreshReadState();
  }, [fetchPage, refreshReadState]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => fetchPage(0, 0, true), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchPage]);

  const handleLoadMore = useCallback(() => {
    const nextFinanceOffset = financeHasMore ? financeOffset + pageSize : financeOffset;
    const nextContactOffset = contactHasMore ? contactOffset + pageSize : contactOffset;
    if (financeHasMore) setFinanceOffset(nextFinanceOffset);
    if (contactHasMore) setContactOffset(nextContactOffset);
    fetchPage(nextFinanceOffset, nextContactOffset, false);
  }, [contactHasMore, contactOffset, fetchPage, financeHasMore, financeOffset, pageSize]);

  const handleNotificationClick = (notification: Notification) => {
    // SWA-138 S3: opening a contact alert persists its read-state server-side.
    if (notification.type === 'contact' && !notification.isRead && notification.contactId != null) {
      authAxios.patch(`/api/contact/${notification.contactId}/viewed`).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
    }
    // SWA-138 S4: computed finance alerts persist through the alert-state API.
    if (notification.type !== 'contact' && !notification.isRead) {
      ackAlert(notification);
    }
    navigate(NOTIFICATION_ROUTE_DESTINATIONS[notification.type]);
  };

  const handleMarkAllRead = useCallback(async () => {
    try {
      await authAxios.patch('/api/contact/mark-all-viewed');
      // SWA-138 S4: finance alerts join mark-all through the alert-state bulk op.
      await bulkAck(notifications.filter((n) => n.type !== 'contact' && !n.isRead));
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      setError('Could not mark all as read — try again.');
    }
  }, [authAxios, bulkAck, notifications]);

  const handleNotificationKeyDown = (event: React.KeyboardEvent, notification: Notification) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNotificationClick(notification);
    }
  };

  const toggleMessageExpand = (id: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // SWA-138 S4: overlay per-admin read-state (finance acks) + drop archived.
  const visibleNotifications = notifications
    .filter((n) => !isArchived(n))
    .map((n) => (!n.isRead && n.type !== 'contact' && isAckedRemotely(n) ? { ...n, isRead: true } : n));
  const filteredNotifications = showUnreadOnly
    ? visibleNotifications.filter((n) => !n.isRead)
    : visibleNotifications;
  const unreadCount = visibleNotifications.filter((n) => !n.isRead).length;

  if (loading && notifications.length === 0) {
    return (
      <NotificationsContainer>
        <LoadingSpinner />
      </NotificationsContainer>
    );
  }

  return (
    <NotificationsContainer
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
    >
      <NotificationHeader>
        <HeaderTitle>
          <Bell size={20} />
          Business Intelligence Alerts
          {unreadCount > 0 && <NotificationBadge>{unreadCount}</NotificationBadge>}
        </HeaderTitle>
        {showActions && (
          <HeaderControls>
            <ControlButton
              disabled={refreshing || unreadCount === 0}
              onClick={handleMarkAllRead}
              title="Mark all as read"
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <CheckCheck size={16} />
            </ControlButton>
            <ControlButton
              className={showUnreadOnly ? 'active' : ''}
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              title={showUnreadOnly ? 'Show all notifications' : 'Show unread only'}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {showUnreadOnly ? <Eye size={16} /> : <EyeOff size={16} />}
            </ControlButton>
            <ControlButton
              disabled={refreshing}
              onClick={() => fetchPage(0, 0, true)}
              title="Refresh notifications"
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </ControlButton>
          </HeaderControls>
        )}
      </NotificationHeader>

      {error && <ErrorBanner role="status">{error}</ErrorBanner>}

      <NotificationsList>
        <AnimatePresence>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification, index) => (
              <ContactNotificationItem
                index={index}
                isExpanded={expandedMessages.has(notification.id)}
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
                onKeyDown={handleNotificationKeyDown}
                onToggleMessage={toggleMessageExpand}
              />
            ))
          ) : (
            <EmptyState>
              <EmptyCheckIcon size={48} />
              <div>All caught up! No new notifications.</div>
            </EmptyState>
          )}
        </AnimatePresence>
      </NotificationsList>

      {(financeHasMore || contactHasMore) && (
        <LoadMoreRow>
          <LoadMoreControl
            disabled={refreshing}
            onClick={handleLoadMore}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronDown size={16} />
            <LoadMoreLabel>Load More</LoadMoreLabel>
          </LoadMoreControl>
        </LoadMoreRow>
      )}
    </NotificationsContainer>
  );
};

export default ContactNotifications;
