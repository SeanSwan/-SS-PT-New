/**
 * COMPONENT: SuccessPageOrderDetails
 * PURPOSE: Shows customer-safe paid order and physical-product fulfillment details.
 */
import React from 'react';
import styled from 'styled-components';
import { Calendar, DollarSign, Mail, MapPin, Package, PackageCheck, Users } from 'lucide-react';
import type { CheckoutSuccessOrderData } from './checkoutActivation';
import { CardTitle, DetailGrid, DetailIcon, DetailItem, DetailLabel, DetailValue, OrderDetailsCard } from './SuccessPage.styles';

interface SuccessPageOrderDetailsProps {
  orderData: CheckoutSuccessOrderData;
  customerDisplayName: string;
  customerEmailDisplay: string;
  orderDateDisplay: string;
}

const FulfillmentPanel = styled.div`
  margin-top: 1.5rem;
  padding: 1.25rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 28%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent),
    color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)
  );
`;

const FulfillmentHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const FulfillmentTitle = styled.h4`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--accent-gold, #C6A84B);
  font-size: 1rem;
  margin: 0;
`;

const FulfillmentBadge = styled.span`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  font-size: 0.82rem;
`;

const FulfillmentText = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 82%, transparent));
  margin: 0 0 0.75rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
`;

const FulfillmentItems = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: grid;
  gap: 0.65rem;
`;

const FulfillmentItem = styled.li`
  color: var(--text-primary, #E0ECF4);
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  padding-top: 0.65rem;
  font-size: 0.9rem;
`;

const labelFromMode = (mode: string) => {
  if (mode === 'pickup') return 'Pickup';
  if (mode === 'local_delivery') return 'Local delivery';
  return 'Local delivery / pickup';
};

const labelFromStatus = (status: string) => status.replace(/_/g, ' ');

const fulfillmentLocation = (orderData: CheckoutSuccessOrderData) => {
  const fulfillment = orderData.fulfillment;
  const details = fulfillment?.details || {};
  if (fulfillment?.mode === 'pickup') return details.pickupWindow || 'Pickup window pending confirmation';
  return [details.streetAddress, details.city, details.state, details.postalCode]
    .filter(Boolean)
    .join(', ') || 'Delivery address pending confirmation';
};

const SuccessPageOrderDetails: React.FC<SuccessPageOrderDetailsProps> = ({
  orderData,
  customerDisplayName,
  customerEmailDisplay,
  orderDateDisplay,
}) => (
  <OrderDetailsCard
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.3 }}
  >
    <CardTitle>
      <Package size={20} />
      Order Details
    </CardTitle>

    <DetailGrid>
      <DetailItem>
        <DetailIcon><DollarSign size={20} /></DetailIcon>
        <DetailLabel>Amount Paid</DetailLabel>
        <DetailValue>${orderData.amount.toFixed(2)}</DetailValue>
      </DetailItem>
      <DetailItem>
        <DetailIcon><Users size={20} /></DetailIcon>
        <DetailLabel>Customer</DetailLabel>
        <DetailValue>{customerDisplayName}</DetailValue>
      </DetailItem>
      <DetailItem>
        <DetailIcon><Mail size={20} /></DetailIcon>
        <DetailLabel>Email</DetailLabel>
        <DetailValue>{customerEmailDisplay}</DetailValue>
      </DetailItem>
      <DetailItem>
        <DetailIcon><Calendar size={20} /></DetailIcon>
        <DetailLabel>Date</DetailLabel>
        <DetailValue>{orderDateDisplay}</DetailValue>
      </DetailItem>
    </DetailGrid>

    {orderData.fulfillment?.required && (
      <FulfillmentPanel>
        <FulfillmentHeader>
          <FulfillmentTitle><PackageCheck size={18} /> Product Fulfillment</FulfillmentTitle>
          <FulfillmentBadge>{labelFromStatus(orderData.fulfillment.status)}</FulfillmentBadge>
        </FulfillmentHeader>
        <FulfillmentText>
          <MapPin size={16} aria-hidden="true" />
          <span>{labelFromMode(orderData.fulfillment.mode)}: {fulfillmentLocation(orderData)}</span>
        </FulfillmentText>
        {orderData.fulfillment.details.notes && (
          <FulfillmentText>{orderData.fulfillment.details.notes}</FulfillmentText>
        )}
        <FulfillmentItems>
          {orderData.fulfillment.items.map((item) => (
            <FulfillmentItem key={item.orderItemId}>
              {item.productName}{item.variantLabel ? ` - ${item.variantLabel}` : ''}{item.sku ? ` (${item.sku})` : ''} x {item.quantity}
            </FulfillmentItem>
          ))}
        </FulfillmentItems>
      </FulfillmentPanel>
    )}
  </OrderDetailsCard>
);

export default SuccessPageOrderDetails;
