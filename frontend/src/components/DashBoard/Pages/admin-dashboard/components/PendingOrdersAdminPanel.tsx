/**
 * PendingOrdersAdminPanel.tsx - Orders Command Center (Gemini 3.1 Pro Design)
 * ===========================================================================
 * Admin interface for managing orders with revenue summary, tax calculations,
 * and glass card order display. Fetches from /api/admin/orders endpoints.
 *
 * Design Authority: Gemini 3.1 Pro
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ShoppingBag, User, DollarSign, Calendar, Clock, CheckCircle,
  AlertTriangle, RefreshCw, Eye, EyeOff, Mail, Search,
  SortAsc, SortDesc
} from 'lucide-react';

import {
  GlassCard,
  KPIGrid,
  KPICard,
  KPIValue,
  KPILabel,
  StatusBadge,
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

// ── Page-specific styled components ─────────────────────

const OrdersWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ControlsRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const FilterSelect = styled.select`
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.button};
  color: var(--text-primary, #E0ECF4);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  min-height: 44px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${STORE_TOKENS.color.cyan};
  }

  option {
    background: var(--bg-elevated, #141419);
    color: var(--text-primary, #E0ECF4);
  }
`;

const OrdersGrid = styled.div`
  display: grid;
  gap: 20px;
`;

const OrderCardWrapper = styled(GlassCard)<{ $priority?: string }>`
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ $priority }) => {
      switch ($priority) {
        case 'high': return `linear-gradient(90deg, ${STORE_TOKENS.color.inactive}, ${STORE_TOKENS.color.pending})`;
        case 'medium': return `linear-gradient(90deg, ${STORE_TOKENS.color.pending}, ${STORE_TOKENS.color.completed})`;
        default: return `linear-gradient(90deg, ${STORE_TOKENS.color.cyan}, ${STORE_TOKENS.color.purple})`;
      }
    }};
  }
`;

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const OrderId = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${STORE_TOKENS.color.cyan};
  margin-bottom: 0.5rem;
`;

const OrderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
`;

const AmountDisplay = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${STORE_TOKENS.color.completed};
`;

const TaxBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  background: color-mix(in srgb, ${STORE_TOKENS.color.tax} 15%, transparent);
  color: ${STORE_TOKENS.color.tax};
  font-weight: 600;
`;

const CustomerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary, #B6C2CC);

  svg { color: ${STORE_TOKENS.color.muted}; flex-shrink: 0; }
`;

const OrderItemsBox = styled.div`
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 64%, transparent);
  border-radius: ${STORE_TOKENS.radius.button};
  padding: 1rem;
  margin-top: 0.5rem;
`;

const OrderItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent);
  font-size: 0.875rem;

  &:last-child { border-bottom: none; }
`;

const EmptyOrders = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: ${STORE_TOKENS.color.muted};

  svg { margin-bottom: 1rem; opacity: 0.3; }
  h3 { color: var(--text-primary, #E0ECF4); margin-bottom: 0.5rem; }
`;

// ── Types ───────────────────────────────────────────────

interface PendingOrder {
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

const CA_TAX_RATE = 0.0725;
type ViewMode = 'pending' | 'completed' | 'all';

const normalizeOrderStatus = (status: unknown, defaultStatus: PendingOrder['status']): PendingOrder['status'] => {
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

// ── Component ───────────────────────────────────────────

const PendingOrdersAdminPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [partialWarning, setPartialWarning] = useState<string | null>(null);

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
        const mapOrder = (order: any, defaultStatus: PendingOrder['status']): PendingOrder => ({
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
            parseFloat(order.totalAmount || order.total || 0) > 200 ? 'high' as const
            : parseFloat(order.totalAmount || order.total || 0) > 100 ? 'medium' as const
            : 'low' as const,
        });

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
              setPartialWarning('Completed orders unavailable. Totals may exclude completed orders.');
            }
          } catch {
            setPartialWarning('Completed orders unavailable. Totals may exclude completed orders.');
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
      } else {
        setError(response.data.message || 'Failed to mark payment as paid');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark payment as paid');
    }
  }, [authAxios, fetchOrders]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

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

  // Stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
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

      {/* KPI Summary Row */}
      <KPIGrid>
        <KPICard $accent="color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)">
          <KPILabel>Total Revenue</KPILabel>
          <KPIValue $color={STORE_TOKENS.color.revenue}>{formatCurrency(totalRevenue)}</KPIValue>
        </KPICard>
        <KPICard $accent="color-mix(in srgb, var(--danger, #C92A54) 15%, transparent)">
          <KPILabel>CA Tax Liability</KPILabel>
          <KPIValue $color={STORE_TOKENS.color.tax}>{formatCurrency(totalRevenue * CA_TAX_RATE)}</KPIValue>
        </KPICard>
        <KPICard $accent="color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)">
          <KPILabel>Total Orders</KPILabel>
          <KPIValue $color={STORE_TOKENS.color.purple}>{orders.length}</KPIValue>
        </KPICard>
        <KPICard $accent="color-mix(in srgb, var(--accent-gold, #C6A84B) 15%, transparent)">
          <KPILabel>Pending Payment</KPILabel>
          <KPIValue $color={STORE_TOKENS.color.pending}>{pendingCount}</KPIValue>
        </KPICard>
      </KPIGrid>

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

        <StoreButton onClick={fetchOrders} disabled={loading}>
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
              <OrderCardWrapper
                key={order.id}
                $priority={order.priority}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <OrderHeader>
                  <StyledBox as="div" $style={{ flex: 1 }}>
                    <OrderId>#{order.orderReference}</OrderId>
                    <OrderMeta>
                      <StatusBadge
                        $status={
                          order.status === 'paid' ? 'completed'
                          : order.status === 'expired' ? 'inactive'
                          : 'pending'
                        }
                      >
                        {order.status === 'paid' ? 'COMPLETED'
                         : order.status === 'pending_manual_payment' ? 'PENDING'
                         : order.status.toUpperCase()}
                      </StatusBadge>
                      <AmountDisplay>{formatCurrency(order.amount)}</AmountDisplay>
                      <TaxBadge>
                        <DollarSign size={10} />
                        Tax: {formatCurrency(order.amount * CA_TAX_RATE)}
                      </TaxBadge>
                    </OrderMeta>
                  </StyledBox>

                  {order.status === 'pending_manual_payment' && (
                    <StyledBox as={StoreButton} onClick={() => markAsPaid(order.id)} $style={{
                      background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent))',
                      borderColor: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent)',
                    }}>
                      <CheckCircle size={16} /> Mark Paid
                    </StyledBox>
                  )}
                </OrderHeader>

                <CustomerGrid>
                  <InfoItem><User size={16} /> {order.customer.name}</InfoItem>
                  <InfoItem><Mail size={16} /> {order.customer.email}</InfoItem>
                  <InfoItem><Calendar size={16} /> {new Date(order.createdAt).toLocaleDateString()}</InfoItem>
                  <InfoItem>
                    <Clock size={16} />
                    {order.status === 'paid' ? 'Completed' : `Expires: ${new Date(order.expiresAt).toLocaleDateString()}`}
                  </InfoItem>
                </CustomerGrid>

                {order.items.length > 0 && (
                  <OrderItemsBox>
                    {order.items.map((item, i) => (
                      <OrderItemRow key={i}>
                        <div>
                          <StyledBox as="span" $style={{ fontWeight: 500 }}>{item.name}</StyledBox>
                          {item.sessions && (
                            <StyledBox as="span" $style={{ fontSize: '0.75rem', color: STORE_TOKENS.color.muted, marginLeft: '0.5rem' }}>
                              {item.sessions} sessions
                            </StyledBox>
                          )}
                        </div>
                        <StyledBox as="span" $style={{ fontWeight: 500 }}>
                          {formatCurrency(item.price)} x {item.quantity}
                        </StyledBox>
                      </OrderItemRow>
                    ))}
                  </OrderItemsBox>
                )}
              </OrderCardWrapper>
            ))}
          </AnimatePresence>
        </OrdersGrid>
      )}
    </OrdersWrapper>
  );
};

export default PendingOrdersAdminPanel;
