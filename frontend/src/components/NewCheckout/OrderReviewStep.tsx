/**
 * OrderReviewStep.tsx - Genesis Order Summary Component
 * ====================================================
 * 
 * Clean, reusable order summary component for the Genesis Checkout system
 * 
 * Features:
 * ✅ Galaxy-themed design consistency
 * ✅ Mobile-first responsive layout
 * ✅ Session count display for training packages
 * ✅ Tax calculation display
 * ✅ Clean pricing breakdown
 * ✅ Admin dashboard data integration ready
 * 
 * Master Prompt v35 Compliance:
 * - Simple, focused component
 * - No complex state management
 * - Clean prop interface
 * - Galaxy theme preservation
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import {
  Package, DollarSign, Calculator, Star,
  Zap, Calendar, Users, Trophy
} from 'lucide-react';

// Galaxy-themed animations
const stellarGlow = keyframes`
  0% { text-shadow: 0 0 10px rgba(0, 255, 255, 0.5); }
  50% { text-shadow: 0 0 20px rgba(0, 255, 255, 0.8); }
  100% { text-shadow: 0 0 10px rgba(0, 255, 255, 0.5); }
`;

const priceShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Styled Components
const OrderSummaryContainer = styled(motion.div)`
  background: rgba(0, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  padding: 1.5rem;
  height: fit-content;
  position: sticky;
  top: 2rem;
  
  @media (max-width: 768px) {
    position: static;
    margin-bottom: 2rem;
    padding: 1.25rem;
  }
`;

const SummaryHeader = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #00ffff;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    font-size: 1.1rem;
    margin-bottom: 1.25rem;
  }
`;

const OrderItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  
  &:first-child {
    padding-top: 0;
  }
`;

const ItemInfo = styled.div`
  flex: 1;
  margin-right: 1rem;
`;

const ItemName = styled.h4`
  color: #ffffff;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  line-height: 1.3;
`;

const ItemDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ItemDetail = styled.p`
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const ItemPrice = styled.div`
  color: #00ffff;
  font-weight: 600;
  font-size: 0.9rem;
  text-align: right;
  min-width: 80px;
`;

const PricingSection = styled.div`
  border-top: 2px solid rgba(0, 255, 255, 0.3);
  margin-top: 1.5rem;
  padding-top: 1.5rem;
`;

const PriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.75rem 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  
  &.total {
    font-size: 1.25rem;
    font-weight: 700;
    color: #00ffff;
    margin: 1rem 0 0 0;
    padding-top: 1rem;
    border-top: 1px solid rgba(0, 255, 255, 0.2);
    animation: ${stellarGlow} 2s infinite;
  }
  
  &.sessions {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    border-radius: 8px;
    padding: 0.75rem;
    margin: 1rem 0;
    color: #10b981;
    font-weight: 600;
  }
`;

const SessionsSummary = styled.div`
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  padding: 1rem;
  margin: 1.5rem 0;
  text-align: center;
`;

const SessionsTitle = styled.h4`
  color: #00ffff;
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const SessionsCount = styled.div`
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0.5rem 0;
  background: linear-gradient(90deg, #00ffff, #3b82f6);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${priceShimmer} 3s infinite;
`;

const SessionsDescription = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 0.8rem;
`;

const SecurityNote = styled.div`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
`;

const SecurityText = styled.span`
  color: #10b981;
  font-size: 0.8rem;
  font-weight: 500;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.6);
`;

// Component Props Interface
interface OrderReviewStepProps {
  cart: any;
  subtotal: number;
  tax: number;
  total: number;
  sessionCount: number;
  showDetailedBreakdown?: boolean;
  compact?: boolean;
}

const OrderReviewStep: React.FC<OrderReviewStepProps> = ({
  cart,
  subtotal,
  tax,
  total,
  sessionCount,
  showDetailedBreakdown = true,
  compact = false
}) => {
  const cartItems = cart?.items || [];

  // If no items, show empty state
  if (cartItems.length === 0) {
    return (
      <OrderSummaryContainer
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SummaryHeader>
          <Package size={20} />
          Order Summary
        </SummaryHeader>
        <EmptyState>
          <Package size={48} color="rgba(255, 255, 255, 0.3)" />
          <h4 style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '1rem 0 0.5rem 0' }}>
            Your cart is empty
          </h4>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Add some training packages to continue
          </p>
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
        <Package size={20} />
        Order Summary
      </SummaryHeader>
      
      {/* Order Items */}
      {cartItems.map((item: any, index: number) => {
        const itemPrice = parseFloat(item.price) || 0;
        const itemQuantity = item.quantity || 0;
        const itemTotal = itemPrice * itemQuantity;
        const itemSessions = (item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || 0) * itemQuantity; // 🎯 SESSIONS FIX: Handle both package types
        
        return (
          <OrderItem key={item.id || index}>
            <ItemInfo>
              <ItemName>
                {item.storefrontItem?.name || `Training Package #${item.storefrontItemId}`}
              </ItemName>
              <ItemDetails>
                <ItemDetail>
                  <span>Qty: {itemQuantity}</span>
                  <span>•</span>
                  <span>${itemPrice.toFixed(2)} each</span>
                </ItemDetail>
                {itemSessions > 0 && (
                  <ItemDetail>
                    <Zap size={12} />
                    <span>{itemSessions} training sessions</span>
                  </ItemDetail>
                )}
                {item.storefrontItem?.description && (
                  <ItemDetail style={{ marginTop: '0.25rem', opacity: 0.8 }}>
                    {item.storefrontItem.description.substring(0, 80)}
                    {item.storefrontItem.description.length > 80 ? '...' : ''}
                  </ItemDetail>
                )}
              </ItemDetails>
            </ItemInfo>
            <ItemPrice>${itemTotal.toFixed(2)}</ItemPrice>
          </OrderItem>
        );
      })}
      
      {/* Sessions Summary */}
      {sessionCount > 0 && (
        <SessionsSummary>
          <SessionsTitle>
            <Calendar size={16} />
            Total Training Sessions
          </SessionsTitle>
          <SessionsCount>{sessionCount}</SessionsCount>
          <SessionsDescription>
            sessions will be added to your account
          </SessionsDescription>
        </SessionsSummary>
      )}
      
      {/* Pricing Breakdown */}
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
        
        <PriceRow className="total">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </PriceRow>
        
        {sessionCount > 0 && (
          <PriceRow className="sessions">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={16} />
              Value: {sessionCount} Premium Sessions
            </span>
            <span>${(sessionCount * 150).toFixed(2)} value</span>
          </PriceRow>
        )}
      </PricingSection>
      
      {/* Security Note */}
      <SecurityNote>
        <Star size={16} />
        <SecurityText>
          Secure checkout powered by Stripe • 30-day money back guarantee
        </SecurityText>
      </SecurityNote>
    </OrderSummaryContainer>
  );
};

export default OrderReviewStep;
