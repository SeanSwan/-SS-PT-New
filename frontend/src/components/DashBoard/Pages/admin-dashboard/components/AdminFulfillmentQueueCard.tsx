/**
 * COMPONENT: AdminFulfillmentQueueCard
 * PURPOSE: Item-level physical-product fulfillment card with inventory warnings.
 */
import React from 'react';
import styled from 'styled-components';
import { AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import {
  GlassCard,
  StatusBadge,
  StoreButton,
  STORE_TOKENS,
  formatCurrency,
} from '../../store-shared/StoreDesignSystem';
import type { FulfillmentItem, FulfillmentStatus } from './AdminFulfillmentQueue.types';

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

const InventoryWarning = styled.div`
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.65rem 0.75rem;
  border-radius: ${STORE_TOKENS.radius.button};
  color: var(--warning, #FBBF24);
  background: color-mix(in srgb, var(--warning, #FBBF24) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning, #FBBF24) 30%, transparent);
  font-size: 0.85rem;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;

  button {
    min-height: 46px;
  }
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

const inventoryWarning = (item: FulfillmentItem) => {
  const stock = item.variant.stockQuantity;
  if (stock === null) return null;
  if (stock <= 0) return 'Out of stock';
  if (stock < item.quantity || stock <= 3) return `Low inventory: ${stock} left for quantity ${item.quantity}`;
  return null;
};

interface AdminFulfillmentQueueCardProps {
  fulfillingId: number | null;
  item: FulfillmentItem;
  onMarkFulfilled: (item: FulfillmentItem) => void;
}

const AdminFulfillmentQueueCard: React.FC<AdminFulfillmentQueueCardProps> = ({
  fulfillingId,
  item,
  onMarkFulfilled,
}) => {
  const warning = inventoryWarning(item);

  return (
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
        {warning && (
          <InventoryWarning role="status">
            <AlertTriangle size={15} aria-hidden="true" />
            {warning}
          </InventoryWarning>
        )}
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
};

export default AdminFulfillmentQueueCard;
