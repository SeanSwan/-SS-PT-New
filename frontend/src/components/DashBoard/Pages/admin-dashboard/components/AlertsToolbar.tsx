/**
 * AlertsToolbar — header chrome for the Business Intelligence Alerts widget
 * (SWA-138 S14): Active|Archived switch, Clear all (archives, never destroys),
 * mark-all-read, unread filter, and refresh. Extracted to keep the widget
 * under the 300-line cap (Rule 4).
 */
import React from 'react';
import { Archive, Bell, CheckCheck, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react';
import {
  HeaderControls, HeaderTitle, NotificationBadge, NotificationHeader,
} from './ContactNotifications.styles';
import { ControlButton, ViewTab } from './ContactNotifications.controls.styles';

interface AlertsToolbarProps {
  unreadCount: number;
  visibleCount: number;
  showActions: boolean;
  refreshing: boolean;
  showUnreadOnly: boolean;
  view: 'active' | 'archived';
  onSetView: (view: 'active' | 'archived') => void;
  onToggleUnreadOnly: () => void;
  onClearAll: () => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
}

const AlertsToolbar: React.FC<AlertsToolbarProps> = ({
  unreadCount, visibleCount, showActions, refreshing, showUnreadOnly, view,
  onSetView, onToggleUnreadOnly, onClearAll, onMarkAllRead, onRefresh,
}) => (
  <NotificationHeader>
    <HeaderTitle>
      <Bell size={20} />
      Business Intelligence Alerts
      {unreadCount > 0 && <NotificationBadge>{unreadCount}</NotificationBadge>}
    </HeaderTitle>
    {showActions && (
      <HeaderControls>
        <ViewTab type="button" $active={view === 'active'} onClick={() => onSetView('active')}>
          Active
        </ViewTab>
        <ViewTab type="button" $active={view === 'archived'} onClick={() => onSetView('archived')}>
          <Archive size={13} aria-hidden="true" /> Archived
        </ViewTab>
        <ControlButton
          disabled={refreshing || visibleCount === 0 || view === 'archived'}
          onClick={onClearAll}
          title="Clear all — moves every listed alert to the archive"
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Trash2 size={16} />
        </ControlButton>
        <ControlButton
          disabled={refreshing || unreadCount === 0}
          onClick={onMarkAllRead}
          title="Mark all as read"
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <CheckCheck size={16} />
        </ControlButton>
        <ControlButton
          className={showUnreadOnly ? 'active' : ''}
          onClick={onToggleUnreadOnly}
          title={showUnreadOnly ? 'Show all notifications' : 'Show unread only'}
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {showUnreadOnly ? <Eye size={16} /> : <EyeOff size={16} />}
        </ControlButton>
        <ControlButton
          disabled={refreshing}
          onClick={onRefresh}
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
);

export default AlertsToolbar;
