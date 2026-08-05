import React from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CreditCard,
  MessageCircle,
  RotateCcw,
  ShieldAlert,
  ShoppingBag,
  Star,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import type {
  ContactPayload,
  FinanceNotificationPayload,
  Notification,
  NotificationPriority,
} from './ContactNotifications.types';

export const PAGE_SIZE = 20;
export const ACCENT_PRIMARY = 'var(--accent-primary, #60C0F0)';
export const ACCENT_SECONDARY = 'var(--accent-secondary, #8B5CF6)';
export const ACCENT_TERTIARY = 'var(--accent-tertiary, #4070C0)';
export const PRIORITY_LOW = 'var(--text-muted, #94A3B8)';
export const PRIORITY_MEDIUM = ACCENT_TERTIARY;
export const PRIORITY_HIGH = 'var(--warning, #F59E0B)';
export const PRIORITY_CRITICAL = 'var(--error, #EF4444)';
export const TEXT_PRIMARY = 'var(--text-primary, #E0ECF4)';
export const TEXT_SECONDARY = 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent))';
export const TEXT_MUTED = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent))';

const PRIORITY_COLOR_BY_LEVEL: Record<NotificationPriority, string> = {
  low: PRIORITY_LOW,
  medium: PRIORITY_MEDIUM,
  high: PRIORITY_HIGH,
  critical: PRIORITY_CRITICAL,
};

export const getPriorityColor = (priority: string) =>
  PRIORITY_COLOR_BY_LEVEL[priority as NotificationPriority] || PRIORITY_MEDIUM;

export const getTypeIcon = (type: string): React.ReactNode => {
  const iconMap: Record<string, React.ReactNode> = {
    purchase: <ShoppingBag size={18} />,
    high_value_purchase: <Star size={18} />,
    new_user: <UserPlus size={18} />,
    contact: <MessageCircle size={18} />,
    system_alert: <AlertTriangle size={18} />,
    payment_failed: <CreditCard size={18} />,
    security_alert: <ShieldAlert size={18} />,
    refund_request: <RotateCcw size={18} />,
    performance_alert: <Activity size={18} />,
    revenue_milestone: <TrendingUp size={18} />,
  };
  return iconMap[type] || <Bell size={18} />;
};

export const formatTimeAgo = (timestamp: string) => {
  const diffInSeconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

export const isDegradedError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'isDegraded' in err && Boolean((err as { isDegraded?: boolean }).isDegraded);

export const getErrorMessage = (err: unknown, fallback: string): string => {
  if (typeof err !== 'object' || err === null) return fallback;
  const response = (err as { response?: { data?: { message?: string } } }).response;
  return response?.data?.message || fallback;
};

const sanitizeNotificationIdPart = (value: unknown): string =>
  String(value ?? 'missing')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'missing';

const stableFinanceNotificationId = (notif: FinanceNotificationPayload, index: number): string => {
  if (notif.id) return notif.id;
  return [
    'fin',
    sanitizeNotificationIdPart(notif.type || 'system_alert'),
    sanitizeNotificationIdPart(notif.timestamp || notif.createdAt || 'no-time'),
    sanitizeNotificationIdPart(notif.title || 'business-notification'),
    sanitizeNotificationIdPart(notif.amount ?? 'no-amount'),
    sanitizeNotificationIdPart(notif.userId ?? notif.userName ?? index),
  ].join('_');
};

export const mapFinanceNotifications = (data: FinanceNotificationPayload[]): Notification[] =>
  data.map((notif, index) => ({
    id: stableFinanceNotificationId(notif, index),
    type: notif.type || 'system_alert',
    title: notif.title || 'Business notification',
    message: notif.message || 'A business event needs review.',
    amount: notif.amount,
    timestamp: notif.timestamp || notif.createdAt || new Date().toISOString(),
    priority: notif.priority || 'medium',
    isRead: false,
    actionRequired: notif.type === 'payment_failed',
    userId: notif.userId,
    userName: notif.userName,
  }));

export const mapContactNotifications = (contacts: ContactPayload[]): Notification[] =>
  contacts.map((contact) => ({
    id: `contact_${contact.id}`,
    type: 'contact',
    title: 'New Contact Form Submission',
    message: `${contact.name || 'Unknown'} (${contact.email || 'no email'}) sent: "${contact.message || 'No message'}"`,
    timestamp: contact.createdAt || new Date().toISOString(),
    priority: contact.priority === 'urgent' ? 'high' : 'medium',
    // SWA-138 S3: read-state is now REAL — backed by contacts.viewedAt.
    isRead: Boolean(contact.viewedAt),
    actionRequired: true,
    userName: contact.name || 'Unknown',
    contactId: contact.id,
  }));

export const upsertNotifications = (existing: Notification[], ...newBatches: Notification[][]): Notification[] => {
  const merged = new Map<string, Notification>();
  for (const n of existing) merged.set(n.id, n);
  for (const batch of newBatches) {
    for (const n of batch) merged.set(n.id, n);
  }
  return [...merged.values()].sort((a, b) => {
    const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    return timeDiff !== 0 ? timeDiff : b.id.localeCompare(a.id);
  });
};

export const NOTIFICATION_ROUTE_DESTINATIONS: Record<Notification['type'], string> = {
  contact: '/dashboard/admin/messages',
  purchase: '/dashboard/admin/revenue',
  high_value_purchase: '/dashboard/admin/revenue',
  new_user: '/dashboard/admin/client-management',
  payment_failed: '/dashboard/admin/pending-orders',
  system_alert: '/dashboard/admin/overview',
  security_alert: '/dashboard/admin/security',
  refund_request: '/dashboard/admin/pending-orders',
  performance_alert: '/dashboard/admin/overview',
  revenue_milestone: '/dashboard/admin/revenue',
};
