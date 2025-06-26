/**
 * GalaxyPaymentElement.tsx - SwanStudios Premium Payment Component
 * ================================================================
 * Revolutionary Galaxy-themed embedded payment experience
 * Built with Stripe Elements for seamless checkout
 * 
 * Features:
 * - Embedded Stripe Elements (no redirects)
 * - Galaxy-themed styling with cosmic animations
 * - Real-time payment validation
 * - Progressive enhancement
 * - Mobile-optimized responsive design
 * - Accessibility compliance (WCAG AA)
 * 
 * Master Prompt v28 Alignment:
 * - Sensational aesthetics with Galaxy theme
 * - Revolutionary user experience
 * - Production-ready error handling
 * - Performance optimized
 */

import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { CreditCard, Shield, Zap, CheckCircle, AlertCircle, Loader } from 'lucide-react';

// Import enhanced error handling
import PaymentErrorHandler from './PaymentErrorHandler';

// Load Stripe with proper fallback
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey && stripePublishableKey !== 'pk_test_placeholder_key_for_development' && stripePublishableKey !== 'pk_test_placeholder_production_key'
  ? loadStripe(stripePublishableKey)
  : null;

// Galaxy-themed animations
const galaxyShimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const cosmicPulse = keyframes`
  0% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.6); }
  100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
`;

const stellarFloat = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

// Styled Components
const PaymentContainer = styled(motion.div)<{ $embedded?: boolean }>`
  background: ${props => props.$embedded 
    ? 'transparent' 
    : 'linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #0a0a1a 100%)'
  };
  border-radius: ${props => props.$embedded ? '0' : '20px'};
  padding: ${props => props.$embedded ? '1rem' : '2rem'};
  border: ${props => props.$embedded ? 'none' : '1px solid rgba(0, 255, 255, 0.3)'};
  position: relative;
  overflow: hidden;
  max-width: ${props => props.$embedded ? 'none' : '600px'};
  margin: 0 auto;
  width: 100%;
  
  /* Enhanced mobile responsiveness */
  min-height: ${props => props.$embedded ? '100%' : 'auto'};
  
  ${props => !props.$embedded && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        45deg,
        transparent 30%,
        rgba(0, 255, 255, 0.1) 50%,
        transparent 70%
      );
      background-size: 200% 200%;
      animation: ${galaxyShimmer} 3s ease-in-out infinite;
      pointer-events: none;
    }
  `}
  
  /* Mobile-first responsive design - Enhanced */
  @media (max-width: 768px) {
    padding: ${props => props.$embedded ? '1rem' : '1.5rem'};
    border-radius: ${props => props.$embedded ? '0' : '15px'};
    min-height: ${props => props.$embedded ? '100vh' : 'auto'};
    
    /* Full viewport on mobile when embedded */
    ${props => props.$embedded && `
      margin: 0;
      width: 100vw;
      height: 100vh;
      position: relative;
    `}
  }
  
  @media (max-width: 480px) {
    padding: ${props => props.$embedded ? '1rem' : '1rem'};
    min-height: ${props => props.$embedded ? '100vh' : 'auto'};
    
    /* Ensure full mobile coverage */
    ${props => props.$embedded && `
      padding: 1rem;
      padding-top: 2rem; /* Account for close button */
    `}
  }
`;

const PaymentHeader = styled.div<{ $embedded?: boolean }>`
  text-align: center;
  margin-bottom: ${props => props.$embedded ? '1.5rem' : '2rem'};
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 0.75rem;
  }
`;

const PaymentTitle = styled.h2<{ $embedded?: boolean }>`
  font-size: ${props => props.$embedded ? '1.5rem' : '1.75rem'};
  font-weight: 600;
  background: linear-gradient(135deg, #00ffff, #0099ff, #ffffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
  animation: ${stellarFloat} 4s ease-in-out infinite;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.1rem;
  }
`;

const PaymentSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

const OrderSummary = styled(motion.div)<{ $embedded?: boolean }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: ${props => props.$embedded ? '1.25rem' : '1.5rem'};
  margin-bottom: ${props => props.$embedded ? '1.5rem' : '2rem'};
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }
`;

const SummaryTitle = styled.h3`
  color: #00ffff;
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SummaryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  color: rgba(255, 255, 255, 0.9);
  
  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const SummaryTotal = styled(SummaryItem)`
  font-weight: 600;
  font-size: 1.1rem;
  color: #00ffff;
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 2px solid rgba(0, 255, 255, 0.3);
`;

const PaymentFormContainer = styled.div<{ $embedded?: boolean }>`
  position: relative;
  z-index: 1;
  margin-bottom: ${props => props.$embedded ? '1.5rem' : '2rem'};
  
  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    margin-bottom: 0.75rem;
  }
`;

const StripeElementContainer = styled.div<{ $embedded?: boolean }>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 12px;
  padding: ${props => props.$embedded ? '1.25rem' : '1.5rem'};
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
  
  &:focus-within {
    border-color: rgba(0, 255, 255, 0.6);
    animation: ${cosmicPulse} 2s infinite;
  }
  
  .StripeElement {
    background: transparent;
    color: white;
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }
`;

const SecurityBadges = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
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
`;

const PaymentButton = styled(motion.button)<{ $embedded?: boolean }>`
  width: 100%;
  background: linear-gradient(135deg, #00ffff, #0099ff);
  border: none;
  border-radius: 12px;
  padding: ${props => props.$embedded ? '1.25rem 2rem' : '1rem 2rem'};
  font-size: 1.1rem;
  font-weight: 600;
  color: #0a0a1a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 56px;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #00cccc, #0088cc);
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(0, 255, 255, 0.4);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover::before {
    left: 100%;
  }
  
  /* Mobile optimization */
  @media (max-width: 768px) {
    padding: 1.25rem;
    font-size: 1rem;
    min-height: 56px;
  }
  
  @media (max-width: 480px) {
    padding: 1rem;
    font-size: 0.95rem;
    min-height: 52px;
  }
`;

const LoadingSpinner = styled(motion.div)`
  width: 20px;
  height: 20px;
  border: 2px solid rgba(10, 10, 26, 0.3);
  border-top: 2px solid #0a0a1a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const PaymentMethodSelector = styled.div`
  margin-bottom: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PaymentMethodButton = styled(motion.button)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  border: 1px solid ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.3)'};
  background: ${props => props.$active ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.8)'};
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  font-weight: 500;
  text-align: left;
  
  &:hover {
    border-color: #00ffff;
    background: rgba(0, 255, 255, 0.1);
    color: #00ffff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.2);
  }
  
  svg {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }
  
  .method-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .method-title {
    font-weight: 600;
  }
  
  .method-subtitle {
    font-size: 0.8rem;
    opacity: 0.8;
  }
`;

const SubscriptionToggle = styled.div`
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
`;

const ToggleSwitch = styled.div<{ $active: boolean }>`
  width: 48px;
  height: 24px;
  border-radius: 12px;
  background: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.2)'};
  position: relative;
  transition: all 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${props => props.$active ? '26px' : '2px'};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.$active ? '#0a0a1a' : '#ffffff'};
    transition: all 0.3s ease;
  }
`;

const SubscriptionInfo = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 255, 255, 0.05);
  border-radius: 8px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
`;

const MessageContainer = styled(motion.div)`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  
  &.success {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
  }
  
  &.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }
  
  &.info {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
  }
`;

// Stripe Elements styling options
const stripeElementOptions = {
  layout: 'tabs',
  style: {
    base: {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: '"Inter", "SF Pro Display", "Roboto", sans-serif',
      '::placeholder': {
        color: 'rgba(255, 255, 255, 0.5)',
      },
      backgroundColor: 'transparent',
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
  variables: {
    colorPrimary: '#00ffff',
    colorBackground: 'transparent',
    colorText: '#ffffff',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, SF Pro Display, Roboto, sans-serif',
    spacingUnit: '6px',
    borderRadius: '8px',
  },
};

// Payment method types
type PaymentMethodType = 'card' | 'bank' | 'bnpl';

// Interface definitions
interface PaymentFormProps {
  clientSecret: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  embedded?: boolean;
}

interface GalaxyPaymentElementProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  embedded?: boolean; // New prop for embedded mode
}

// Payment Form Component
const PaymentForm: React.FC<PaymentFormProps> = ({ clientSecret, onSuccess, onError, embedded = false }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { cart } = useCart();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>('card');
  const [enableSubscription, setEnableSubscription] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setMessage('Payment system is loading...');
      setMessageType('info');
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/CheckoutSuccess`,
          receipt_email: user?.email,
        },
        redirect: 'if_required',
      });

      if (error) {
        setMessage(error.message || 'An unexpected error occurred.');
        setMessageType('error');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setMessage('Payment successful! Redirecting...');
        setMessageType('success');
        onSuccess(paymentIntent);
      } else {
        setMessage('Payment processing...');
        setMessageType('info');
      }
    } catch (err) {
      setMessage('An unexpected error occurred.');
      setMessageType('error');
      onError('Payment processing error');
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentFormContainer $embedded={embedded}>
        {/* Order Summary */}
        <OrderSummary
          $embedded={embedded}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SummaryTitle>
            <CreditCard size={20} />
            Order Summary
          </SummaryTitle>
          
          {cart?.items?.map((item, index) => (
            <SummaryItem key={index}>
              <span>
                {item.storefrontItem?.name || 'Training Package'} × {item.quantity}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </SummaryItem>
          ))}
          
          <SummaryTotal>
            <span>Total</span>
            <span>${cart?.total?.toFixed(2) || '0.00'}</span>
          </SummaryTotal>
        </OrderSummary>

        {/* Payment Method Selection */}
        <PaymentMethodSelector>
          <PaymentMethodButton
            $active={selectedPaymentMethod === 'card'}
            onClick={() => setSelectedPaymentMethod('card')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CreditCard />
            <div className="method-info">
              <div className="method-title">Credit/Debit Card</div>
              <div className="method-subtitle">Visa, Mastercard, Amex</div>
            </div>
          </PaymentMethodButton>
          
          <PaymentMethodButton
            $active={selectedPaymentMethod === 'bank'}
            onClick={() => setSelectedPaymentMethod('bank')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Shield />
            <div className="method-info">
              <div className="method-title">Bank Transfer (EFT)</div>
              <div className="method-subtitle">Direct from your bank</div>
            </div>
          </PaymentMethodButton>
          
          <PaymentMethodButton
            $active={selectedPaymentMethod === 'bnpl'}
            onClick={() => setSelectedPaymentMethod('bnpl')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Zap />
            <div className="method-info">
              <div className="method-title">Buy Now, Pay Later</div>
              <div className="method-subtitle">Affirm, Klarna options</div>
            </div>
          </PaymentMethodButton>
        </PaymentMethodSelector>
        
        {/* Subscription Toggle */}
        <SubscriptionToggle>
          <ToggleLabel>
            <ToggleSwitch 
              $active={enableSubscription}
              onClick={() => setEnableSubscription(!enableSubscription)}
            />
            <span>Enable Monthly Auto-Pay</span>
          </ToggleLabel>
          {enableSubscription && (
            <SubscriptionInfo>
              <strong>🎯 Auto-Pay Benefits:</strong><br/>
              • 10% discount on all future sessions<br/>
              • Priority booking for appointments<br/>
              • Cancel anytime, no commitment<br/>
              • Automatic session credit renewal
            </SubscriptionInfo>
          )}
        </SubscriptionToggle>

        {/* Payment Element */}
        <StripeElementContainer $embedded={embedded}>
          <PaymentElement 
            options={{
              ...stripeElementOptions,
              paymentMethodTypes: selectedPaymentMethod === 'card' ? ['card'] :
                                selectedPaymentMethod === 'bank' ? ['us_bank_account'] :
                                ['affirm', 'klarna']
            }} 
          />
        </StripeElementContainer>

        {/* Security Badges */}
        <SecurityBadges>
          <SecurityBadge>
            <Shield size={16} />
            256-bit SSL
          </SecurityBadge>
          <SecurityBadge>
            <Zap size={16} />
            Instant Processing
          </SecurityBadge>
          <SecurityBadge>
            <CheckCircle size={16} />
            PCI Compliant
          </SecurityBadge>
        </SecurityBadges>

        {/* Submit Button */}
        <PaymentButton
          $embedded={embedded}
          type="submit"
          disabled={!stripe || !elements || isProcessing}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isProcessing ? (
            <>
              <LoadingSpinner />
              Processing...
            </>
          ) : (
            <>
              <CreditCard size={20} />
              Complete Payment
            </>
          )}
        </PaymentButton>

        {/* Message Display */}
        <AnimatePresence>
          {message && (
            <MessageContainer
              className={messageType}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {messageType === 'success' && <CheckCircle size={16} />}
              {messageType === 'error' && <AlertCircle size={16} />}
              {messageType === 'info' && <Loader size={16} />}
              {message}
            </MessageContainer>
          )}
        </AnimatePresence>
      </PaymentFormContainer>
    </form>
  );
};

// Main Galaxy Payment Element Component
const GalaxyPaymentElement: React.FC<GalaxyPaymentElementProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  embedded = false // Default to false for backward compatibility
}) => {
  const { authAxios, token } = useAuth();
  const { cart } = useCart();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null); // Enhanced to handle error objects

  // Create Payment Intent when component opens
  useEffect(() => {
    if (isOpen && cart?.id && !clientSecret) {
      createPaymentIntent();
    }
  }, [isOpen, cart?.id]);

  const createPaymentIntent = async () => {
    if (!cart?.id || !token) {
      setError('Cart or authentication not available');
      return;
    }

    // Check if Stripe is properly configured
    if (!stripePromise) {
      setError('Payment system is not configured. Please contact support.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authAxios.post('/api/payments/create-payment-intent', {
        cartId: cart.id
      });

      if (response.data.success) {
        setClientSecret(response.data.data.clientSecret);
      } else {
        setError(response.data.message || 'Failed to initialize payment');
      }
    } catch (err: any) {
      console.error('Payment intent creation error:', err);
      
      // Handle specific error types
      if (err.response?.status === 503) {
        // Service unavailable - show enhanced error with fallback options
        const errorData = err.response.data;
        setError({
          code: 'PAYMENT_SERVICE_UNAVAILABLE',
          message: errorData.message || 'Payment processing temporarily unavailable',
          details: errorData.error?.details,
          retryAfter: errorData.error?.retryAfter,
          supportContact: errorData.error?.supportContact,
          fallbackOptions: errorData.fallbackOptions
        });
      } else if (err.response?.status === 400) {
        setError({
          code: 'INVALID_REQUEST',
          message: err.response.data.message || 'Invalid payment request',
          details: err.response.data.error?.details
        });
      } else if (err.response?.status === 500) {
        setError({
          code: 'INTERNAL_ERROR',
          message: 'Internal server error. Please try again.',
          details: 'Payment processing encountered an error'
        });
      } else if (err.code === 'ERR_NETWORK') {
        setError({
          code: 'CONNECTION_ERROR',
          message: 'Network connection error. Please check your internet connection.',
          details: 'Unable to connect to payment service'
        });
      } else {
        setError({
          code: 'UNKNOWN_ERROR',
          message: err.response?.data?.message || 'Failed to initialize payment',
          details: 'An unexpected error occurred'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntent: any) => {
    try {
      // Confirm payment with backend
      await authAxios.post('/api/payments/confirm-payment', {
        paymentIntentId: paymentIntent.id
      });

      // Success! Navigate to success page or trigger success callback
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = `/checkout/CheckoutSuccess?payment_intent=${paymentIntent.id}`;
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (!isOpen) return null;

  // Embedded mode - render without overlay
  if (embedded) {
    // Show configuration error if Stripe is not properly set up
    if (!stripePromise) {
      return (
        <PaymentContainer
        $embedded={false}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
          >
          <PaymentHeader $embedded={embedded}>
          <PaymentTitle $embedded={embedded}>Payment System Unavailable</PaymentTitle>
          <PaymentSubtitle>Payment processing is currently being configured</PaymentSubtitle>
          </PaymentHeader>

          <PaymentErrorHandler 
            error={{
              code: 'STRIPE_NOT_CONFIGURED',
              message: 'Payment system is not configured. Please contact support or try again later.',
              details: 'Payment processing temporarily unavailable',
              fallbackOptions: [
                {
                  method: 'contact',
                  description: 'Contact our support team to complete your purchase',
                  contact: 'support@swanstudios.com'
                },
                {
                  method: 'retry',
                  description: 'Try again in a few minutes',
                  retryAfter: 300
                }
              ]
            }}
            onRetry={() => window.location.reload()}
            onClose={onClose}
          />
        </PaymentContainer>
      );
    }

    return (
      <PaymentContainer
        $embedded={embedded}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PaymentHeader $embedded={embedded}>
          <PaymentTitle $embedded={embedded}>Secure Payment</PaymentTitle>
          <PaymentSubtitle>Complete your SwanStudios training package purchase</PaymentSubtitle>
        </PaymentHeader>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <LoadingSpinner />
            <p style={{ marginTop: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              Initializing secure payment...
            </p>
          </div>
        )}

        {error && (
          <PaymentErrorHandler 
            error={typeof error === 'string' ? {
              code: 'GENERIC_ERROR',
              message: error
            } : error}
            onRetry={() => {
              setError(null);
              setClientSecret(null);
              createPaymentIntent();
            }}
            onClose={onClose}
          />
        )}

        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              clientSecret={clientSecret}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              embedded={embedded}
            />
          </Elements>
        )}
      </PaymentContainer>
    );
  }

  // Show configuration error if Stripe is not properly set up
  if (!stripePromise) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <PaymentContainer
          $embedded={false}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PaymentHeader $embedded={false}>
          <PaymentTitle $embedded={false}>Payment System Unavailable</PaymentTitle>
          <PaymentSubtitle>Payment processing is currently being configured</PaymentSubtitle>
          </PaymentHeader>

          <PaymentErrorHandler 
            error={{
              code: 'STRIPE_NOT_CONFIGURED',
              message: 'Payment system is not configured. Please contact support or try again later.',
              details: 'Payment processing temporarily unavailable',
              fallbackOptions: [
                {
                  method: 'contact',
                  description: 'Contact our support team to complete your purchase',
                  contact: 'support@swanstudios.com'
                },
                {
                  method: 'retry',
                  description: 'Try again in a few minutes',
                  retryAfter: 300
                }
              ]
            }}
            onRetry={() => window.location.reload()}
            onClose={onClose}
          />

          <motion.button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: 'pointer'
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ✕
          </motion.button>
        </PaymentContainer>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <PaymentContainer
        $embedded={embedded}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PaymentHeader $embedded={false}>
        <PaymentTitle $embedded={false}>Secure Payment</PaymentTitle>
        <PaymentSubtitle>Complete your SwanStudios training package purchase</PaymentSubtitle>
        </PaymentHeader>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <LoadingSpinner />
            <p style={{ marginTop: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
              Initializing secure payment...
            </p>
          </div>
        )}

        {error && (
          <PaymentErrorHandler 
            error={typeof error === 'string' ? {
              code: 'GENERIC_ERROR',
              message: error
            } : error}
            onRetry={() => {
              setError(null);
              setClientSecret(null);
              createPaymentIntent();
            }}
            onClose={onClose}
          />
        )}

        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm
              clientSecret={clientSecret}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              embedded={embedded}
            />
          </Elements>
        )}

        <motion.button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            cursor: 'pointer'
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          ✕
        </motion.button>
      </PaymentContainer>
    </motion.div>
  );
};

export default GalaxyPaymentElement;
