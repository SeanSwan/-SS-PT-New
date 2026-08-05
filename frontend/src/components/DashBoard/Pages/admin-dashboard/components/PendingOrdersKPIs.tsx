/**
 * PendingOrdersKPIs — the server-truth KPI row for the Orders Command Center
 * (SWA-138 S6). Values come from /api/admin/orders/analytics (completed, 30d);
 * a null summary renders em-dashes, never a client-side sum.
 */
import React from 'react';
import {
  KPIGrid,
  KPICard,
  KPIValue,
  KPILabel,
  formatCurrency,
  STORE_TOKENS,
} from '../../store-shared/StoreDesignSystem';
import type { OrderAnalyticsSummary } from './PendingOrdersAdminPanel.logic';

interface PendingOrdersKPIsProps {
  analytics: OrderAnalyticsSummary | null;
  pendingCount: number;
}

const PendingOrdersKPIs: React.FC<PendingOrdersKPIsProps> = ({ analytics, pendingCount }) => (
  <KPIGrid>
    <KPICard $accent="color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)">
      <KPILabel>Revenue (30d, completed)</KPILabel>
      <KPIValue $color={STORE_TOKENS.color.revenue}>
        {analytics ? formatCurrency(analytics.totalRevenue) : '—'}
      </KPIValue>
    </KPICard>
    <KPICard $accent="color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)">
      <KPILabel>Orders (30d, completed)</KPILabel>
      <KPIValue $color={STORE_TOKENS.color.purple}>
        {analytics ? analytics.totalOrders : '—'}
      </KPIValue>
    </KPICard>
    <KPICard $accent="color-mix(in srgb, var(--accent-gold, #C6A84B) 15%, transparent)">
      <KPILabel>Avg Order Value (30d)</KPILabel>
      <KPIValue $color={STORE_TOKENS.color.revenue}>
        {analytics ? formatCurrency(analytics.averageOrderValue) : '—'}
      </KPIValue>
    </KPICard>
    <KPICard $accent="color-mix(in srgb, var(--warning, #EAB308) 15%, transparent)">
      <KPILabel>Pending Payment (in view)</KPILabel>
      <KPIValue $color={STORE_TOKENS.color.pending}>{pendingCount}</KPIValue>
    </KPICard>
  </KPIGrid>
);

export default PendingOrdersKPIs;
