/**
 * COMPONENT: OrderReviewStep
 * PURPOSE: Render checkout cart items, pricing, and session value proof.
 * OWNER: Codex | LAST VALIDATED: 2026-06-09
 *
 * WIREFRAME:
 * [order summary heading]
 * [cart item rows]
 * [session count proof]
 * [subtotal + tax + total]
 * [secure checkout note]
 *
 * DATA FLOW:
 * Props In: cart, subtotal, tax, total, sessionCount, display options.
 * State: none.
 * API Calls: none.
 * Events: none.
 * Children: styled summary rows and icons.
 *
 * ARCHITECTURE: OrderReviewStep -> OrderReviewStep.styles.
 */
import React from 'react';
import { Calendar, Package, Star, Trophy, Zap } from 'lucide-react';
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateText,
  EmptyStateTitle,
  ItemDescription,
  ItemDetail,
  ItemDetails,
  ItemInfo,
  ItemName,
  ItemPrice,
  OrderItem,
  OrderSummaryContainer,
  PriceRow,
  PricingSection,
  SecurityNote,
  SecurityText,
  SessionValueLabel,
  SessionsCount,
  SessionsDescription,
  SessionsSummary,
  SessionsTitle,
  SummaryHeader,
} from './OrderReviewStep.styles';

interface OrderReviewStepProps {
  cart: any;
  subtotal: number;
  tax: number;
  total: number;
  sessionCount: number;
  showDetailedBreakdown?: boolean;
  compact?: boolean;
}

const truncateDescription = (description: string): string => (
  description.length > 80 ? `${description.substring(0, 80)}...` : description
);

const OrderReviewStep: React.FC<OrderReviewStepProps> = ({
  cart,
  subtotal,
  tax,
  total,
  sessionCount,
  showDetailedBreakdown = true,
}) => {
  const cartItems = cart?.items || [];

  if (cartItems.length === 0) {
    return (
      <OrderSummaryContainer
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SummaryHeader>
          <Package size={20} aria-hidden="true" />
          Order Summary
        </SummaryHeader>
        <EmptyState>
          <EmptyStateIcon>
            <Package size={48} aria-hidden="true" />
          </EmptyStateIcon>
          <EmptyStateTitle>Your cart is empty</EmptyStateTitle>
          <EmptyStateText>Add some training packages to continue</EmptyStateText>
        </EmptyState>
      </OrderSummaryContainer>
    );
  }

  return (
    <OrderSummaryContainer
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <SummaryHeader>
        <Package size={20} aria-hidden="true" />
        Order Summary
      </SummaryHeader>

      {cartItems.map((item: any, index: number) => {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQuantity = item.quantity || 0;
        const itemTotal = itemPrice * itemQuantity;
        const itemSessions = (item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || 0) * itemQuantity;

        return (
          <OrderItem key={item.id || index}>
            <ItemInfo>
              <ItemName>
                {item.storefrontItem?.name || `Training Package #${item.storefrontItemId}`}
              </ItemName>
              <ItemDetails>
                <ItemDetail>
                  <span>Qty: {itemQuantity}</span>
                  <span aria-hidden="true">|</span>
                  <span>${itemPrice.toFixed(2)} each</span>
                </ItemDetail>
                {itemSessions > 0 && (
                  <ItemDetail>
                    <Zap size={12} aria-hidden="true" />
                    <span>{itemSessions} training sessions</span>
                  </ItemDetail>
                )}
                {item.storefrontItem?.description && (
                  <ItemDescription>
                    {truncateDescription(item.storefrontItem.description)}
                  </ItemDescription>
                )}
              </ItemDetails>
            </ItemInfo>
            <ItemPrice>${itemTotal.toFixed(2)}</ItemPrice>
          </OrderItem>
        );
      })}

      {sessionCount > 0 && (
        <SessionsSummary>
          <SessionsTitle>
            <Calendar size={16} aria-hidden="true" />
            Total Training Sessions
          </SessionsTitle>
          <SessionsCount>{sessionCount}</SessionsCount>
          <SessionsDescription>
            sessions will be added to your account
          </SessionsDescription>
        </SessionsSummary>
      )}

      <PricingSection>
        {showDetailedBreakdown && (
          <>
            <PriceRow>
              <span>Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}):</span>
              <span>${subtotal.toFixed(2)}</span>
            </PriceRow>
            <PriceRow>
              <span>Tax (8%):</span>
              <span>${tax.toFixed(2)}</span>
            </PriceRow>
          </>
        )}

        <PriceRow $variant="total">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </PriceRow>

        {sessionCount > 0 && (
          <PriceRow $variant="sessions">
            <SessionValueLabel>
              <Trophy size={16} aria-hidden="true" />
              Value: {sessionCount} Premium Sessions
            </SessionValueLabel>
            <span>${(sessionCount * 150).toFixed(2)} value</span>
          </PriceRow>
        )}
      </PricingSection>

      <SecurityNote>
        <Star size={16} aria-hidden="true" />
        <SecurityText>
          Secure checkout powered by Stripe with a 30-day money back guarantee
        </SecurityText>
      </SecurityNote>
    </OrderSummaryContainer>
  );
};

export default OrderReviewStep;
