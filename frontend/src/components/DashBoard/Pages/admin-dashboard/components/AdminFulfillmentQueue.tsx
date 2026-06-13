/**
 * AdminFulfillmentQueue.tsx
 * ============================================================
 * Item-level fulfillment queue for paid physical-product orders.
 * Mounted inside PendingOrdersAdminPanel so admin payment and fulfillment work
 * stay in one order command surface without competing routes.
 */
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { CheckCircle, MapPin, PackageCheck, RefreshCw, Search, Truck } from 'lucide-react';
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
  StatusBadge,
  StoreButton,
  STORE_TOKENS,
  formatCurrency,
} from '../../store-shared/StoreDesignSystem';

type FulfillmentStatus = 'pending_fulfillment' | 'fulfilled' | 'not_required';

interface FulfillmentItem {
  orderId: number;
  orderNumber: string;
  orderItemId: number;
  orderDate: string | null;
  customer: { id: number | null; name: string; email: string | null };
  product: { id: number | null; name: string; itemType: string };
  variant: { id: number | null; label: string | null; sku: string | null; stockQuantity: number | null };
  quantity: number;
  price: number;
  subtotal: number;
  fulfillmentStatus: FulfillmentStatus;
  fulfillment: {
    mode: string;
    type: string;
    details: {
      recipientName?: string;
      phone?: string;
      streetAddress?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      pickupWindow?: string;
      notes?: string;
    };
  };
}

interface QueueResponse {
  items: FulfillmentItem[];
  stats: { pending: number; fulfilled: number; total: number };
}

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

const ItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const ItemTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
`;

const MetaGrid = styled.div`
  display: grid;
  gap: 0.65rem;
  margin: 1rem 0;
`;

const MetaLine = styled.div`
  color: var(--text-secondary, #B6C2CC);
  font-size: 0.85rem;
  line-height: 1.45;
  overflow-wrap: anywhere;

  strong {
    color: var(--text-primary, #E0ECF4);
  }
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;

  button {
    min-height: 46px;
  }
`;

const EmptyState = styled(GlassCard)`
  text-align: center;
  color: ${STORE_TOKENS.color.muted};
`;

const modeLabel = (mode: string) => (
  mode === 'pickup' ? 'Pickup' : mode === 'local_delivery' ? 'Local delivery' : 'Local delivery / pickup'
);

const detailLine = (item: FulfillmentItem) => {
  const details = item.fulfillment.details || {};
  if (item.fulfillment.mode === 'pickup') {
    return details.pickupWindow || 'Pickup window not provided';
  }
  return [details.streetAddress, details.city, details.state, details.postalCode]
    .filter(Boolean)
    .join(', ') || 'Delivery address not provided';
};

const itemStatus = (status: FulfillmentStatus): 'completed' | 'pending' | 'inactive' => (
  status === 'fulfilled' ? 'completed' : status === 'pending_fulfillment' ? 'pending' : 'inactive'
);

const FulfillmentQueueCard: React.FC<{
  fulfillingId: number | null;
  item: FulfillmentItem;
  onMarkFulfilled: (item: FulfillmentItem) => void;
}> = ({ fulfillingId, item, onMarkFulfilled }) => (
  <GlassCard>
    <ItemHeader>
      <div>
        <ItemTitle>{item.product.name}</ItemTitle>
        <MetaLine>#{item.orderNumber} - {item.customer.name}</MetaLine>
      </div>
      <StatusBadge $status={itemStatus(item.fulfillmentStatus)}>{item.fulfillmentStatus.replace('_', ' ')}</StatusBadge>
    </ItemHeader>

    <MetaGrid>
      <MetaLine><strong>Variant:</strong> {item.variant.label || 'Default'} {item.variant.sku ? ` - ${item.variant.sku}` : ''}</MetaLine>
      <MetaLine><strong>Inventory:</strong> {item.variant.stockQuantity === null ? 'Not tracked' : `Stock: ${item.variant.stockQuantity}`}</MetaLine>
      <MetaLine><strong>Quantity:</strong> {item.quantity} - {formatCurrency(item.subtotal || item.price * item.quantity)}</MetaLine>
      <MetaLine><strong>Method:</strong> {modeLabel(item.fulfillment.mode)}</MetaLine>
      <MetaLine><MapPin size={14} aria-hidden="true" /> {detailLine(item)}</MetaLine>
      {item.fulfillment.details.notes && <MetaLine><strong>Notes:</strong> {item.fulfillment.details.notes}</MetaLine>}
    </MetaGrid>

    <ActionRow>
      <StoreButton
        onClick={() => onMarkFulfilled(item)}
        disabled={item.fulfillmentStatus === 'fulfilled' || fulfillingId === item.orderItemId}
      >
        <CheckCircle size={16} />
        {item.fulfillmentStatus === 'fulfilled' ? 'Fulfilled' : 'Mark fulfilled'}
      </StoreButton>
    </ActionRow>
  </GlassCard>
);

const AdminFulfillmentQueue: React.FC = () => {
  const { authAxios } = useAuth();
  const [items, setItems] = useState<FulfillmentItem[]>([]);
  const [stats, setStats] = useState<QueueResponse['stats']>({ pending: 0, fulfilled: 0, total: 0 });
  const [status, setStatus] = useState<'pending_fulfillment' | 'fulfilled' | 'all'>('pending_fulfillment');
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
          <FulfillmentQueueCard
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
