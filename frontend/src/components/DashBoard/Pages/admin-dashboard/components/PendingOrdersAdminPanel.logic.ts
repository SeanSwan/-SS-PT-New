/**
 * PendingOrdersAdminPanel.logic — types + pure mapping helpers,
 * extracted in SWA-138 S6 (Rule 4 split of the 588-line panel).
 */

export interface PendingOrder {
  id: string;
  orderReference: string;
  paymentReference: string;
  customer: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  amount: number;
  currency: string;
  status: 'pending_manual_payment' | 'paid' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    sessions?: number;
  }>;
  priority: 'high' | 'medium' | 'low';
}

/** Server-truth 30d completed-order aggregates from /api/admin/orders/analytics. */
export interface OrderAnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export type ViewMode = 'pending' | 'completed' | 'all';

export const normalizeOrderStatus = (
  status: unknown,
  defaultStatus: PendingOrder['status'],
): PendingOrder['status'] => {
  switch (String(status || '').toLowerCase()) {
    case 'pending':
    case 'pending_payment':
    case 'active':
    case 'pending_manual_payment':
      return 'pending_manual_payment';
    case 'completed':
    case 'paid':
      return 'paid';
    case 'expired':
      return 'expired';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    default:
      return defaultStatus;
  }
};

export const mapOrder = (order: any, defaultStatus: PendingOrder['status']): PendingOrder => ({
  id: String(order.id),
  orderReference: String(order.id),
  paymentReference: order.checkoutSessionId || 'N/A',
  customer: {
    id: order.user?.id || order.userId || 0,
    name: order.user
      ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim()
      : 'Unknown Customer',
    email: order.user?.email || 'N/A',
    phone: order.user?.phone || undefined,
  },
  amount: parseFloat(order.totalAmount || order.total || 0),
  currency: 'USD',
  status: normalizeOrderStatus(order.status, defaultStatus),
  createdAt: order.createdAt,
  expiresAt: order.expiresAt || order.completedAt || new Date(Date.now() + 86400000).toISOString(),
  items: (order.cartItems || order.items || []).map((item: any) => ({
    id: item.id,
    name: item.storefrontItem?.name || item.name || 'Unknown Item',
    quantity: item.quantity || 1,
    price: parseFloat(item.price || 0),
    sessions: item.storefrontItem?.sessions || item.sessions || undefined,
  })),
  priority:
    parseFloat(order.totalAmount || order.total || 0) > 200 ? ('high' as const)
    : parseFloat(order.totalAmount || order.total || 0) > 100 ? ('medium' as const)
    : ('low' as const),
});

export const parseAnalyticsSummary = (payload: any): OrderAnalyticsSummary | null => {
  const summary = payload?.analytics?.summary;
  if (!summary) return null;
  return {
    totalOrders: Number(summary.totalOrders ?? 0),
    totalRevenue: Number(summary.totalRevenue ?? 0),
    averageOrderValue: Number(summary.averageOrderValue ?? 0),
  };
};
