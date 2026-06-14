/**
 * AdminFulfillmentQueue.tsx
 * ============================================================
 * Item-level fulfillment queue for paid physical-product orders.
 * Mounted inside PendingOrdersAdminPanel so admin payment and fulfillment work
 * stay in one order command surface without competing routes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { PackageCheck, RefreshCw, Search, Truck } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import {
  ErrorBanner,
  GlassCard,
  KPICard,
  KPIGrid,
  KPILabel,
  KPIValue,
  SearchBar,
  SearchInput,
  SectionHeader,
  SectionTitle,
  ShimmerBlock,
  StoreButton,
  STORE_TOKENS,
} from '../../store-shared/StoreDesignSystem';
import AdminFulfillmentQueueCard from './AdminFulfillmentQueueCard';
import type { FulfillmentItem, FulfillmentStatus, QueueResponse } from './AdminFulfillmentQueue.types';

const QueueWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const StatusSelect = styled.select`
  min-height: 44px;
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.button};
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 0.5rem 0.875rem;
`;

const QueueGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
`;

const EmptyState = styled(GlassCard)`
  text-align: center;
  color: ${STORE_TOKENS.color.muted};
`;

const AdminFulfillmentQueue: React.FC = () => {
  const { authAxios } = useAuth();
  const [items, setItems] = useState<FulfillmentItem[]>([]);
  const [stats, setStats] = useState<QueueResponse['stats']>({ pending: 0, fulfilled: 0, total: 0 });
  const [status, setStatus] = useState<FulfillmentStatus | 'all'>('pending_fulfillment');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fulfillingId, setFulfillingId] = useState<number | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAxios.get('/api/admin/orders/fulfillment', {
        params: { status, search: search || undefined, limit: 50 },
      });
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Failed to load fulfillment queue');
      }
      setItems(response.data.items || []);
      setStats(response.data.stats || { pending: 0, fulfilled: 0, total: 0 });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load fulfillment queue');
    } finally {
      setLoading(false);
    }
  }, [authAxios, search, status]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const markFulfilled = async (item: FulfillmentItem) => {
    try {
      setFulfillingId(item.orderItemId);
      setError(null);
      await authAxios.patch(`/api/admin/orders/fulfillment-items/${item.orderItemId}/complete`, {
        notes: 'Fulfilled from admin order queue',
      });
      await fetchQueue();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete fulfillment item');
    } finally {
      setFulfillingId(null);
    }
  };

  return (
    <QueueWrapper>
      <SectionHeader>
        <SectionTitle><PackageCheck size={24} /> Physical Product Fulfillment</SectionTitle>
      </SectionHeader>

      <KPIGrid>
        <KPICard><KPILabel>Pending</KPILabel><KPIValue $color={STORE_TOKENS.color.pending}>{stats.pending}</KPIValue></KPICard>
        <KPICard><KPILabel>Fulfilled</KPILabel><KPIValue $color={STORE_TOKENS.color.completed}>{stats.fulfilled}</KPIValue></KPICard>
        <KPICard><KPILabel>Total Items</KPILabel><KPIValue $color={STORE_TOKENS.color.purple}>{stats.total}</KPIValue></KPICard>
        <KPICard><KPILabel>Queue Mode</KPILabel><KPIValue $color={STORE_TOKENS.color.cyan}>{status === 'all' ? 'All' : status === 'fulfilled' ? 'Done' : 'Open'}</KPIValue></KPICard>
      </KPIGrid>

      <ControlsRow>
        <SearchBar>
          <Search size={18} />
          <SearchInput
            aria-label="Search fulfillment queue"
            placeholder="Search product, SKU, customer, or order..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </SearchBar>
        <StatusSelect
          aria-label="Filter fulfillment status"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
        >
          <option value="pending_fulfillment">Pending fulfillment</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="all">All fulfillment</option>
        </StatusSelect>
        <StoreButton onClick={fetchQueue} disabled={loading}><RefreshCw size={16} /> Refresh</StoreButton>
      </ControlsRow>

      {error && <ErrorBanner role="alert">{error}</ErrorBanner>}
      {loading && items.length === 0 && <ShimmerBlock $height="180px" />}
      {!loading && items.length === 0 && (
        <EmptyState><Truck size={32} /><p>No physical products need action in this queue.</p></EmptyState>
      )}

      <QueueGrid>
        {items.map((item) => (
          <AdminFulfillmentQueueCard
            key={item.orderItemId}
            fulfillingId={fulfillingId}
            item={item}
            onMarkFulfilled={markFulfilled}
          />
        ))}
      </QueueGrid>
    </QueueWrapper>
  );
};

export default AdminFulfillmentQueue;
