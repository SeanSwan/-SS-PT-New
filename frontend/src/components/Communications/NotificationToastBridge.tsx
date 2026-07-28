/**
 * FILE: NotificationToastBridge.tsx
 * PURPOSE: Bridge canonical real-time notifications into the app toast layer.
 */
import { useEffect, useRef, type FC } from 'react';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import { useToast, type ToastVariant } from '../../hooks/use-toast';
import type { Notification } from '../../store/slices/notificationSlice';

interface NotificationToastBridgeProps {
  onOpenNotification?: (link: string) => void;
}

const DESCRIPTION_LIMIT = 160;

const clipText = (value: string, limit = DESCRIPTION_LIMIT): string => {
  const compact = value.trim().replace(/\s+/g, ' ');
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit - 1).trim()}...`;
};

const toastVariantForNotification = (notification: Notification): ToastVariant => {
  if (notification.type === 'order' || notification.category === 'commerce' || notification.category === 'billing') return 'warning';
  if (notification.type === 'system' || notification.type === 'admin') return 'info';
  return 'info';
};

const getNotificationId = (notification: Notification): string => String(notification.id || '').trim();

export const buildNotificationToast = (
  notification: Notification,
  onOpenNotification?: (link: string) => void,
) => ({
  title: notification.title || 'New notification',
  description: clipText(notification.message || 'Open your notification center for the latest update.'),
  variant: toastVariantForNotification(notification),
  duration: 6500,
  action: notification.link && onOpenNotification
    ? {
        label: notification.actionLabel || 'Open',
        onClick: () => onOpenNotification(notification.link as string),
      }
    : undefined,
});

const NotificationToastBridge: FC<NotificationToastBridgeProps> = ({ onOpenNotification }) => {
  const { notifications } = useNotificationCenter({ subscribeToSocket: true });
  const { toast } = useToast();
  const seededRef = useRef(false);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!seededRef.current) {
      notifications.forEach((notification) => {
        const id = getNotificationId(notification);
        if (id) seenNotificationIdsRef.current.add(id);
      });
      seededRef.current = true;
      return;
    }

    const nextNotification = notifications.find((notification) => {
      const id = getNotificationId(notification);
      return Boolean(id && !seenNotificationIdsRef.current.has(id) && !notification.read);
    });

    notifications.forEach((notification) => {
      const id = getNotificationId(notification);
      if (id) seenNotificationIdsRef.current.add(id);
    });

    if (!nextNotification || nextNotification.read) return;
    toast(buildNotificationToast(nextNotification, onOpenNotification));
  }, [notifications, onOpenNotification, toast]);

  return null;
};

export default NotificationToastBridge;
