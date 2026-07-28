/**
 * Canonical notification types shared by the Redux slice and notification presenters.
 */
import type { NotificationCategory } from './notificationMetadata';

export type NotificationType =
  | 'orientation'
  | 'system'
  | 'order'
  | 'workout'
  | 'client'
  | 'admin'
  | 'session'
  | 'achievement'
  | 'reward'
  | 'social'
  | 'message'
  | 'measurement'
  | 'reminder'
  | 'progress'
  | 'info';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export interface NotificationAction {
  label: string;
  type: string;
  href?: string;
  endpoint?: string;
  durationMinutes?: number;
  metadata?: Record<string, unknown>;
}

export interface NotificationSender {
  id?: string | number;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  photo?: string;
  profileImageUrl?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  link?: string;
  image?: string;
  userId?: string | number;
  sender?: NotificationSender;
  category?: NotificationCategory;
  actionLabel?: string;
  priority?: NotificationPriority;
  requiresAction?: boolean;
  actionStatus?: string | null;
  actions?: NotificationAction[];
  status?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
}
