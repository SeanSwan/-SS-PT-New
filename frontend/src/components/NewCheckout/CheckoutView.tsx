/**
 * CheckoutView.tsx - Swan Alchemist's Genesis Checkout
 * ===================================================
 * 
 * THE ULTIMATE CHECKOUT ORCHESTRATOR - Master Prompt v35 Compliance
 * 
 * Core Philosophy: SIMPLICITY & RELIABILITY
 * - Single Stripe Checkout redirect flow (NO Elements complexity)
 * - Admin dashboard connectivity guaranteed
 * - GlowButton integration throughout
 * - Galaxy theme preservation
 * - Zero breaking changes
 * 
 * User Flow:
 * 1. User reviews order on this component
 * 2. Clicks GlowButton "Proceed to Secure Payment"
 * 3. Backend creates Stripe Checkout Session
 * 4. User redirects to checkout.stripe.com
 * 5. Returns to SuccessPage.tsx on completion
 * 
 * Features:
 * ✅ Admin dashboard data integration
 * ✅ Financial routes connectivity  
 * ✅ Customer data capture (ALWAYS)
 * ✅ Session management integration
 * ✅ Galaxy-themed premium design
 * ✅ Mobile-first responsive
 * ✅ GlowButton compliance
 * ✅ Error handling & user feedback
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/use-toast';
import GlowButton from '../ui/buttons/GlowButton';
import OrderReviewStep from './OrderReviewStep';
import CheckoutButton from './CheckoutButton';
import api from '../../services/api.service';
import {
  ShoppingCart, CreditCard, Shield, Lock, CheckCircle,
  AlertTriangle, Loader, ArrowRight, Star, Sparkles,
  Package, DollarSign, User, Mail, Phone, Home
} from 'lucide-react';

// Galaxy-themed animations
const galaxyPulse = keyframes`
  0% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.6); }
  100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
`;

const stellarShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const cosmicFloat = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
`;

// Styled Components - Galaxy Theme Preservation
const CheckoutContainer = styled(motion.div)`
  background: linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #0a0a1a 100%);
  border-radius: 24px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0;
  
  @media (max-width: 768px) {
    max-width: 100%;
    margin: 1rem;
    border-radius: 16px;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #00ffff, #3b82f6, #00ffff);
    animation: ${stellarShimmer} 3s infinite;
  }
`;

const CheckoutHeader = styled.div`
  padding: 2rem;
  text-align: center;
  background: rgba(0, 255, 255, 0.05);
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  
  @media (max-width: 768px) {
    padding: 1.5rem 1rem;
  }
`;

const CheckoutTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00ffff, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;
  animation: ${cosmicFloat} 4s ease-in-out infinite;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const CheckoutSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const CheckoutContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  padding: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr 350px;
    gap: 1.5rem;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 1.5rem;
  }
`;

const MainSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const SecurityBadges = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
`;

const SecurityBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 255, 255, 0.1);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  
  svg {
    color: #00ffff;
  }
  
  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }
`;

const CheckoutSection = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 2rem;
  
  @media (max-width: 768px) {
    padding: 1.5rem;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #00ffff;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CheckoutInfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const InfoCard = styled.div`
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
`;

const InfoCardIcon = styled.div`
  color: #00ffff;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: center;
`;

const InfoCardTitle = styled.h4`
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
`;

const InfoCardValue = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
  margin: 0;
`;

const ErrorMessage = styled(motion.div)`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 1rem;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const SuccessMessage = styled(motion.div)`
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 12px;
  padding: 1rem;
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const ActionButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
`;

interface CheckoutState {
  isProcessing: boolean;
  error: string | null;
  success: string | null;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

interface CheckoutViewProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CheckoutView: React.FC<CheckoutViewProps> = ({
  onSuccess,
  onCancel
}) => {
  const { user, isAuthenticated } = useAuth();
  const { cart, refreshCart } = useCart();
  const { toast } = useToast();

  // State management
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    isProcessing: false,
    error: null,
    success: null,
    customerInfo: {
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
      email: user?.email || '',
      phone: user?.phone || ''
    }
  });

  // Calculate totals
  const cartItems = cart?.items || [];
  const subtotal = cartItems.reduce((sum, item) => {
    const itemPrice = parseFloat(item.price) || 0;
    const itemQuantity = item.quantity || 0;
    return sum + (itemPrice * itemQuantity);
  }, 0);
  
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;
  const sessionCount = cartItems.reduce((sum, item) => {
    return sum + ((item.storefrontItem?.sessions || 0) * (item.quantity || 0));
  }, 0);

  // Load cart data on mount
  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    }
  }, [isAuthenticated, refreshCart]);

  // Update customer info when user changes
  useEffect(() => {
    if (user) {
      setCheckoutState(prev => ({
        ...prev,
        customerInfo: {
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email || '',
          phone: user.phone || ''
        }
      }));
    }
  }, [user]);

  /**
   * CORE FUNCTION: Create Stripe Checkout Session
   * This is the ONLY payment method - simple, reliable, Stripe-hosted
   */
  const handleCreateCheckoutSession = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setCheckoutState(prev => ({
        ...prev,
        error: 'Please log in to complete your purchase'
      }));
      return;
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      setCheckoutState(prev => ({
        ...prev,
        error: 'Your cart is empty. Please add items before checkout.'
      }));
      return;
    }

    setCheckoutState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
      success: null
    }));

    try {
      console.log('🚀 [Genesis Checkout] Creating Stripe Checkout Session...');
      console.log('💰 [Genesis Checkout] Total:', total.toFixed(2));
      console.log('🎯 [Genesis Checkout] Sessions:', sessionCount);

      const response = await api.post('/api/v2/payments/create-checkout-session', {
        cartId: cart.id,
        customerInfo: checkoutState.customerInfo,
        metadata: {
          userId: user.id,
          cartId: cart.id,
          sessionCount,
          source: 'genesis_checkout'
        }
      });

      if (response.data.success) {
        const { checkoutUrl, sessionId } = response.data;
        
        console.log('✅ [Genesis Checkout] Session created successfully');
        console.log('🔗 [Genesis Checkout] Redirecting to Stripe...');

        // ADMIN DASHBOARD CONNECTION: Track checkout initiation
        try {
          await api.post('/api/financial/track-checkout-start', {
            sessionId,
            userId: user.id,
            cartId: cart.id,
            amount: total,
            sessionCount,
            timestamp: new Date().toISOString()
          });
          console.log('📊 [Admin Dashboard] Checkout tracked for analytics');
        } catch (trackingError) {
          console.warn('⚠️ [Admin Dashboard] Tracking failed:', trackingError);
          // Don't fail checkout for tracking errors
        }

        // Success message before redirect
        setCheckoutState(prev => ({
          ...prev,
          success: 'Redirecting to secure payment...',
          isProcessing: false
        }));

        // Show success toast
        toast({
          title: "Checkout Ready!",
          description: "Redirecting to secure Stripe payment...",
          duration: 2000,
        });

        // Redirect to Stripe Checkout
        setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 1000);

      } else {
        throw new Error(response.data.message || 'Failed to create checkout session');
      }

    } catch (error: any) {
      console.error('💥 [Genesis Checkout] Failed:', error.message);
      
      const errorMessage = error.response?.data?.message || error.message || 'Checkout failed. Please try again.';
      
      setCheckoutState(prev => ({
        ...prev,
        error: errorMessage,
        isProcessing: false
      }));

      toast({
        title: "Checkout Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [isAuthenticated, user, cart, checkoutState.customerInfo, total, sessionCount, toast]);

  /**
   * Validation function
   */
  const isCheckoutReady = useCallback(() => {
    return (
      isAuthenticated &&
      user &&
      cart &&
      cart.items &&
      cart.items.length > 0 &&
      total > 0 &&
      checkoutState.customerInfo.name.trim() &&
      checkoutState.customerInfo.email.trim()
    );
  }, [isAuthenticated, user, cart, total, checkoutState.customerInfo]);

  if (!isAuthenticated) {
    return (
      <CheckoutContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <CheckoutHeader>
          <CheckoutTitle>Authentication Required</CheckoutTitle>
          <CheckoutSubtitle>Please log in to complete your purchase</CheckoutSubtitle>
        </CheckoutHeader>
      </CheckoutContainer>
    );
  }

  return (
    <CheckoutContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <CheckoutHeader>
        <CheckoutTitle>Secure Checkout</CheckoutTitle>
        <CheckoutSubtitle>Complete your SwanStudios training package purchase</CheckoutSubtitle>
      </CheckoutHeader>

      {/* Security Badges */}
      <SecurityBadges>
        <SecurityBadge>
          <Shield size={16} />
          Stripe Secure
        </SecurityBadge>
        <SecurityBadge>
          <Lock size={16} />
          SSL Encrypted
        </SecurityBadge>
        <SecurityBadge>
          <CheckCircle size={16} />
          PCI Compliant
        </SecurityBadge>
        <SecurityBadge>
          <Star size={16} />
          Money Back Guarantee
        </SecurityBadge>
      </SecurityBadges>

      {/* Main Content */}
      <CheckoutContent>
        {/* Left Section - Checkout Details */}
        <MainSection>
          {/* Customer Information */}
          <CheckoutSection
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <SectionTitle>
              <User size={20} />
              Customer Information
            </SectionTitle>
            
            <CheckoutInfoGrid>
              <InfoCard>
                <InfoCardIcon>
                  <User size={20} />
                </InfoCardIcon>
                <InfoCardTitle>Name</InfoCardTitle>
                <InfoCardValue>{checkoutState.customerInfo.name || 'Not provided'}</InfoCardValue>
              </InfoCard>
              
              <InfoCard>
                <InfoCardIcon>
                  <Mail size={20} />
                </InfoCardIcon>
                <InfoCardTitle>Email</InfoCardTitle>
                <InfoCardValue>{checkoutState.customerInfo.email || 'Not provided'}</InfoCardValue>
              </InfoCard>
              
              <InfoCard>
                <InfoCardIcon>
                  <Phone size={20} />
                </InfoCardIcon>
                <InfoCardTitle>Phone</InfoCardTitle>
                <InfoCardValue>{checkoutState.customerInfo.phone || 'Not provided'}</InfoCardValue>
              </InfoCard>
            </CheckoutInfoGrid>
          </CheckoutSection>

          {/* Payment Method */}
          <CheckoutSection
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <SectionTitle>
              <CreditCard size={20} />
              Payment Method
            </SectionTitle>
            
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              border: '2px solid rgba(59, 130, 246, 0.5)',
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              animation: `${galaxyPulse} 3s infinite`
            }}>
              <CreditCard size={24} color="#ffffff" />
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem' }}>
                  Stripe Secure Checkout
                </h4>
                <p style={{ margin: '0.25rem 0 0 0', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.875rem' }}>
                  Credit/debit cards, Apple Pay, Google Pay, and more
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Shield size={20} color="#ffffff" />
                <Sparkles size={20} color="#ffffff" />
              </div>
            </div>
          </CheckoutSection>

          {/* Action Buttons */}
          <ActionButtonContainer>
            <CheckoutButton
              onClick={handleCreateCheckoutSession}
              disabled={!isCheckoutReady() || checkoutState.isProcessing}
              isLoading={checkoutState.isProcessing}
              amount={total}
            />
            
            {onCancel && (
              <GlowButton
                variant="cosmic"
                size="large"
                fullWidth
                onClick={onCancel}
                disabled={checkoutState.isProcessing}
              >
                <Home size={20} />
                Return to Cart
              </GlowButton>
            )}
          </ActionButtonContainer>

          {/* Status Messages */}
          <AnimatePresence>
            {checkoutState.error && (
              <ErrorMessage
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AlertTriangle size={16} />
                {checkoutState.error}
              </ErrorMessage>
            )}
            
            {checkoutState.success && (
              <SuccessMessage
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <CheckCircle size={16} />
                {checkoutState.success}
              </SuccessMessage>
            )}
          </AnimatePresence>
        </MainSection>

        {/* Right Section - Order Summary */}
        <OrderReviewStep 
          cart={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          sessionCount={sessionCount}
        />
      </CheckoutContent>
    </CheckoutContainer>
  );
};

export default CheckoutView;
