/**
 * PendingOrderCard — one order's glass card in the Orders Command Center,
 * extracted from PendingOrdersAdminPanel in SWA-138 S6 (Rule 4 split).
 * The per-order CA-tax badge was removed with the unconditional tax display.
 */
import React from 'react';
import { User, Calendar, Clock, CheckCircle, Mail } from 'lucide-react';
import {
  StatusBadge,
  StoreButton,
  formatCurrency,
  STORE_TOKENS,
} from '../../store-shared/StoreDesignSystem';
import { StyledBox } from '@/components/ui/StyledBox';
import {
  AmountDisplay,
  CustomerGrid,
  InfoItem,
  OrderCardWrapper,
  OrderHeader,
  OrderId,
  OrderItemRow,
  OrderItemsBox,
  OrderMeta,
} from './PendingOrdersAdminPanel.styles';
import type { PendingOrder } from './PendingOrdersAdminPanel.logic';

interface PendingOrderCardProps {
  order: PendingOrder;
  index: number;
  onMarkPaid: (orderId: string) => void;
}

const PendingOrderCard: React.FC<PendingOrderCardProps> = ({ order, index, onMarkPaid }) => (
  <OrderCardWrapper
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
        </OrderMeta>
      </StyledBox>

      {order.status === 'pending_manual_payment' && (
        <StyledBox as={StoreButton} onClick={() => onMarkPaid(order.id)} $style={{
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
);

export default PendingOrderCard;
