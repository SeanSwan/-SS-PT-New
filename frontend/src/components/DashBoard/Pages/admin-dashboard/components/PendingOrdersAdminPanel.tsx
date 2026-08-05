/**
 * PendingOrdersAdminPanel.tsx - Orders Command Center (Gemini 3.1 Pro Design)
 * ===========================================================================
 * Admin interface for managing orders. Fetches from /api/admin/orders endpoints.
 *
 * SWA-138 S6 (money truth):
 *  - KPI cards read SERVER aggregates (/api/admin/orders/analytics, completed
 *    orders, 30d) — the old cards summed the currently-fetched 50-row page and
 *    silently under-reported at scale.
 *  - The unconditional CA-tax display (7.25% on every order regardless of
 *    jurisdiction) is REMOVED until real tax logic exists.
 *  - Split per Rule 4: styles in .styles.ts, types+mapping in .logic.ts.
 *
 * Design Authority: Gemini 3.1 Pro
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ShoppingBag, AlertTriangle, RefreshCw, Eye, EyeOff, Search,
  SortAsc, SortDesc
} from 'lucide-react';

import {
  KPIGrid,
  KPICard,
  ViewModeTabs,
  ViewModeTab,
  SectionHeader,
  SectionTitle,
  StoreButton,
  SearchBar,
  SearchInput,
  ErrorBanner,
  ShimmerBlock,
  formatCurrency,
  STORE_TOKENS,
} from '../../store-shared/StoreDesignSystem';
import AdminFulfillmentQueue from './AdminFulfillmentQueue';
import { StyledBox } from '@/components/ui/StyledBox';
import {
  ControlsRow,
  EmptyOrders,
  FilterSelect,
  OrdersGrid,
  OrdersWrapper,
} from './PendingOrdersAdminPanel.styles';
import PendingOrderCard from './PendingOrderCard';
import PendingOrdersKPIs from './PendingOrdersKPIs';
import {
  mapOrder,
  OrderAnalyticsSummary,
  parseAnalyticsSummary,
  PendingOrder,
  ViewMode,
} from './PendingOrdersAdminPanel.logic';

const PendingOrdersAdminPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [analytics, setAnalytics] = useState<OrderAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [partialWarning, setPartialWarning] = useState<string | null>(null);

  // Server-truth aggregates — tolerant: a failure degrades the KPI cards to
  // "—", it never blocks the work queue below.
  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await authAxios.get('/api/admin/orders/analytics', {
        params: { timeRange: '30d' },
      });
      setAnalytics(parseAnalyticsSummary(res.data));
    } catch {
      setAnalytics(null);
    }
  }, [authAxios]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPartialWarning(null);

      const endpoint = viewMode === 'completed'
        ? '/api/admin/orders/completed'
        : '/api/admin/orders/pending';

      const response = await authAxios.get(endpoint, {
        params: {
          sortBy,
          sortOrder,
          limit: 50,
          search: searchTerm || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
        },
      });

      if (response.data.success) {
        const rawOrders = response.data.orders || response.data.data || [];
        const mappedOrders = rawOrders.map((o: any) => mapOrder(o, 'pending_manual_payment'));

        // For 'all' mode, also fetch the other endpoint
        if (viewMode === 'all') {
          try {
            const completedRes = await authAxios.get('/api/admin/orders/completed', {
              params: { limit: 50, sortBy: 'createdAt', sortOrder: 'desc' },
            });
            if (completedRes.data.success) {
              const completedRaw = completedRes.data.orders || completedRes.data.data || [];
              const completedMapped = completedRaw.map((o: any) => mapOrder(o, 'paid'));
              for (const co of completedMapped) {
                if (!mappedOrders.find((o: any) => o.id === co.id)) {
                  mappedOrders.push(co);
                }
              }
              mappedOrders.sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            } else {
              setPartialWarning('Completed orders unavailable. The list below may exclude completed orders.');
            }
          } catch {
            setPartialWarning('Completed orders unavailable. The list below may exclude completed orders.');
          }
        }

        setOrders(mappedOrders);
      } else {
        setError(response.data.message || 'Failed to load orders');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [authAxios, statusFilter, sortBy, sortOrder, searchTerm, viewMode]);

  const markAsPaid = useCallback(async (orderId: string) => {
    try {
      const response = await authAxios.post(`/api/admin/orders/${orderId}/complete`, {
        adminNotes: 'Manually verified payment',
        verifiedBy: 'Admin',
      });
      if (response.data.success) {
        fetchOrders();
        fetchAnalytics();
      } else {
        setError(response.data.message || 'Failed to mark payment as paid');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark payment as paid');
    }
  }, [authAxios, fetchOrders, fetchAnalytics]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchOrders]);

  // Filter
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      String(order.orderReference).toLowerCase().includes(s) ||
      order.customer.name.toLowerCase().includes(s) ||
      order.customer.email.toLowerCase().includes(s)
    );
  });

  // Queue-scoped count (labeled as such — NOT a business total)
  const pendingCount = orders.filter(o => o.status === 'pending_manual_payment').length;

  // ── Loading ──
  if (loading && orders.length === 0) {
    return (
      <OrdersWrapper>
        <SectionHeader>
          <SectionTitle><ShoppingBag size={24} /> Orders</SectionTitle>
        </SectionHeader>
        <KPIGrid>
          {[1,2,3,4].map(i => <KPICard key={i}><ShimmerBlock $height="50px" /></KPICard>)}
        </KPIGrid>
        <ShimmerBlock $height="300px" />
      </OrdersWrapper>
    );
  }

  // ── Error ──
  if (error && orders.length === 0) {
    return (
      <OrdersWrapper>
        <SectionHeader>
          <SectionTitle><ShoppingBag size={24} /> Orders</SectionTitle>
        </SectionHeader>
        <ErrorBanner><AlertTriangle size={18} /> {error}</ErrorBanner>
        <StoreButton onClick={fetchOrders}><RefreshCw size={16} /> Retry</StoreButton>
      </OrdersWrapper>
    );
  }

  return (
    <OrdersWrapper>
      {/* View Mode Tabs */}
      <ViewModeTabs>
        <ViewModeTab $active={viewMode === 'all'} onClick={() => setViewMode('all')}>
          All Orders
        </ViewModeTab>
        <ViewModeTab $active={viewMode === 'pending'} onClick={() => setViewMode('pending')}>
          Pending
        </ViewModeTab>
        <ViewModeTab $active={viewMode === 'completed'} onClick={() => setViewMode('completed')}>
          Completed
        </ViewModeTab>
      </ViewModeTabs>

      {/* KPI Summary Row — server aggregates (completed orders, last 30d) */}
      <PendingOrdersKPIs analytics={analytics} pendingCount={pendingCount} />

      {/* Controls */}
      <ControlsRow>
        <SearchBar>
          <Search size={18} />
          <SearchInput
            placeholder="Search by order ID, customer name, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </SearchBar>

        <FilterSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending_manual_payment">Pending Payment</option>
          <option value="paid">Paid</option>
          <option value="expired">Expired</option>
        </FilterSelect>

        <FilterSelect value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="createdAt">Created Date</option>
          <option value="total">Amount</option>
          <option value="status">Status</option>
        </FilterSelect>

        <StoreButton $variant="ghost" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
          {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
        </StoreButton>

        <StoreButton onClick={() => { fetchOrders(); fetchAnalytics(); }} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </StoreButton>

        <StyledBox as={StoreButton}
          onClick={() => setAutoRefresh(!autoRefresh)}
          $style={autoRefresh ? { borderColor: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent)' } : undefined}
        >
          {autoRefresh ? <Eye size={16} /> : <EyeOff size={16} />}
          {autoRefresh ? 'Live' : 'Manual'}
        </StyledBox>
      </ControlsRow>

      {partialWarning && (
        <ErrorBanner role="status"><AlertTriangle size={18} /> {partialWarning}</ErrorBanner>
      )}

      <AdminFulfillmentQueue />

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <EmptyOrders>
          <ShoppingBag size={48} />
          <h3>No Orders Found</h3>
          <p>All orders are processed or no payments are pending.</p>
        </EmptyOrders>
      ) : (
        <OrdersGrid>
          <AnimatePresence>
            {filteredOrders.map((order, index) => (
              <PendingOrderCard key={order.id} order={order} index={index} onMarkPaid={markAsPaid} />
            ))}
          </AnimatePresence>
        </OrdersGrid>
      )}
    </OrdersWrapper>
  );
};

export default PendingOrdersAdminPanel;
