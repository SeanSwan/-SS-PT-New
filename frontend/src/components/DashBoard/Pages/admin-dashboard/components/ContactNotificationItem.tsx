import React from 'react';
import { Clock } from 'lucide-react';
import type { Notification } from './ContactNotifications.types';
import { formatTimeAgo, getPriorityColor, getTypeIcon } from './ContactNotifications.helpers';
import {
  ActionRequiredBadge,
  MessageToggle,
  NotificationAmount,
  NotificationContent,
  NotificationDetails,
  NotificationIcon,
  NotificationItemShell,
  NotificationMessage,
  NotificationMeta,
  NotificationTime,
  NotificationTitle,
} from './ContactNotifications.styles';

interface ContactNotificationItemProps {
  notification: Notification;
  index: number;
  isExpanded: boolean;
  onClick: (notification: Notification) => void;
  onKeyDown: (event: React.KeyboardEvent, notification: Notification) => void;
  onToggleMessage: (id: string) => void;
}

const ContactNotificationItem: React.FC<ContactNotificationItemProps> = ({
  notification,
  index,
  isExpanded,
  onClick,
  onKeyDown,
  onToggleMessage,
}) => {
  const priorityColor = getPriorityColor(notification.priority);
  const isLongMessage = notification.message.length > 150;
  const visibleMessage = isLongMessage && !isExpanded
    ? `${notification.message.slice(0, 150)}...`
    : notification.message;

  return (
    <NotificationItemShell
      $priorityColor={priorityColor}
      animate={{ opacity: 1, x: 0 }}
      className={`${!notification.isRead ? 'unread' : ''} ${notification.priority === 'critical' ? 'urgent' : ''}`}
      exit={{ opacity: 0, x: -100 }}
      initial={{ opacity: 0, x: 100 }}
      key={notification.id}
      onClick={() => onClick(notification)}
      onKeyDown={(e) => onKeyDown(e, notification)}
      role="button"
      tabIndex={0}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      <NotificationContent>
        <NotificationIcon $color={priorityColor}>{getTypeIcon(notification.type)}</NotificationIcon>
        <NotificationDetails>
          <NotificationTitle>{notification.title}</NotificationTitle>
          <NotificationMessage>
            {visibleMessage}
            {isLongMessage && (
              <MessageToggle
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMessage(notification.id);
                }}
                type="button"
              >
                {isExpanded ? 'show less' : 'show more'}
              </MessageToggle>
            )}
          </NotificationMessage>
          <NotificationMeta>
            <NotificationTime>
              <Clock size={12} />
              {formatTimeAgo(notification.timestamp)}
            </NotificationTime>
            {notification.amount && (
              <NotificationAmount>${notification.amount.toLocaleString()}</NotificationAmount>
            )}
          </NotificationMeta>
        </NotificationDetails>
        {notification.actionRequired && <ActionRequiredBadge>Action Required</ActionRequiredBadge>}
      </NotificationContent>
    </NotificationItemShell>
  );
};

export default ContactNotificationItem;
