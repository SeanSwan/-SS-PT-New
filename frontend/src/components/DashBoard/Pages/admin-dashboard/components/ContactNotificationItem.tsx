import React from 'react';
import { Clock, X } from 'lucide-react';
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
import { ClaimChip, DismissButton } from './ContactNotifications.controls.styles';
import type { AlertClaim } from './ContactNotifications.alertState';

interface ContactNotificationItemProps {
  notification: Notification;
  index: number;
  isExpanded: boolean;
  onClick: (notification: Notification) => void;
  onKeyDown: (event: React.KeyboardEvent, notification: Notification) => void;
  onToggleMessage: (id: string) => void;
  /** Cross-admin claim on this alert, if any (SWA-138 S4b). */
  claim?: AlertClaim | null;
  onToggleClaim?: (notification: Notification) => void;
  /** Archive this alert out of the active list (SWA-138 S14). */
  onDismiss?: (notification: Notification) => void;
}

const ContactNotificationItem: React.FC<ContactNotificationItemProps> = ({
  notification,
  index,
  isExpanded,
  onClick,
  onKeyDown,
  onToggleMessage,
  claim = null,
  onToggleClaim,
  onDismiss,
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
        {onDismiss && (
          <DismissButton
            type="button"
            aria-label={`Dismiss: move "${notification.title}" to the archive`}
            title="Dismiss to archive"
            onClick={(e) => { e.stopPropagation(); onDismiss(notification); }}
          >
            <X size={16} aria-hidden="true" />
          </DismissButton>
        )}
        {onToggleClaim && (
          <ClaimChip
            type="button"
            $mine={Boolean(claim?.mine)}
            aria-label={claim
              ? (claim.mine ? 'Release your claim on this alert' : `Claimed by admin #${claim.adminId}`)
              : 'Claim this alert so other admins know you are handling it'}
            onClick={(e) => { e.stopPropagation(); onToggleClaim(notification); }}
          >
            {claim ? (claim.mine ? 'Mine · release' : `Admin #${claim.adminId}`) : 'Claim'}
          </ClaimChip>
        )}
      </NotificationContent>
    </NotificationItemShell>
  );
};

export default ContactNotificationItem;
