export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationType =
  | 'purchase'
  | 'new_user'
  | 'contact'
  | 'system_alert'
  | 'high_value_purchase'
  | 'payment_failed'
  | 'security_alert'
  | 'refund_request'
  | 'performance_alert'
  | 'revenue_milestone';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  amount?: number;
  timestamp: string;
  priority: NotificationPriority;
  isRead: boolean;
  actionRequired?: boolean;
  userId?: number;
  userName?: string;
  /** Numeric Contact row id — present only for type 'contact' (SWA-138 S3 read-state). */
  contactId?: number | string;
}

export interface FinanceNotificationPayload {
  id?: string;
  type?: NotificationType;
  title?: string;
  message?: string;
  amount?: number;
  timestamp?: string;
  createdAt?: string;
  priority?: NotificationPriority;
  userId?: number;
  userName?: string;
}

export interface ContactPayload {
  id: string | number;
  name?: string;
  email?: string;
  message?: string;
  createdAt?: string;
  priority?: string;
  /** Persisted read-state (SWA-138 S3) — null/absent means unread. */
  viewedAt?: string | null;
}

export interface ContactNotificationsProps {
  autoRefresh?: boolean;
  initialPageSize?: number;
  showActions?: boolean;
}
