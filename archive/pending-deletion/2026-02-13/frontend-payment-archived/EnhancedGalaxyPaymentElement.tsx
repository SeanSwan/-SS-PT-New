/**
 * Enhanced GalaxyPaymentElement with Improved Error Handling
 * ========================================================
 * Fixes React Stripe Elements lifecycle issues
 * Follows personal training industry best practices
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

// Enhanced Stripe Elements options for personal training business
const createStripeElementsOptions = (clientSecret) => ({
  clientSecret,
  appearance: {
    theme: 'night',
    variables: {
      colorPrimary: '#00ffff',
      colorBackground: '#0a0a1a',
      colorText: '#ffffff',
      fontFamily: 'Inter, SF Pro Display, Roboto, sans-serif',
      borderRadius: '12px'
    }
  },
  // Personal training specific payment methods
  payment_method_types: [
    'card',           // Credit/debit cards (most common)
    'us_bank_account', // ACH/bank transfers (lower fees)
    'affirm',         // Buy now, pay later for expensive packages
    'klarna',         // Alternative BNPL option
  ],
  // Enhanced for fitness business
  business_type: 'personal_trainer',
  // Better mobile experience for on-the-go clients
  layout: {
    type: 'tabs',
    defaultCollapsed: false,
    radios: false,
    spacedAccordionItems: true
  }
});

// Enhanced PaymentForm component with proper lifecycle management
const EnhancedPaymentForm = ({ clientSecret, onSuccess, onError, embedded = false }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { cart } = useCart();
  
  // Refs to prevent component destruction issues
  const paymentElementRef = useRef(null);
  const mountedRef = useRef(true);
  const processingRef = useRef(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('info');
  const [elementReady, setElementReady] = useState(false);
  const [elementError, setElementError] = useState(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      processingRef.current = false;
    };
  }, []);

  // Enhanced Payment Element ready handler
  const handlePaymentElementReady = useCallback(() => {
    if (!mountedRef.current) return;
    
    console.log('💳 Payment Element ready for personal training payments');
    setElementReady(true);
    setElementError(null);
  }, []);

  // Enhanced error handling for payment element changes
  const handlePaymentElementChange = useCallback((event) => {
    if (!mountedRef.current) return;
    
    console.log('💳 Payment Element change:', event);
    
    if (event.error) {
      console.error('❌ Payment Element error:', event.error);
      setElementError(event.error.message);
    } else {
      setElementError(null);
    }
    
    if (event.complete) {
      console.log('✅ Payment information complete and valid');
    }
  }, []);

  // Enhanced submit handler with better error recovery
  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    // Prevent double submission
    if (processingRef.current || !mountedRef.current) {
      console.log('⚠️ Payment already processing or component unmounted');
      return;
    }

    console.log('💳 Processing personal training package payment');
    
    if (!stripe || !elements) {
      setMessage('Payment system loading...');
      setMessageType('info');
      return;
    }

    if (!elementReady) {
      setMessage('Payment form still loading. Please wait...');
      setMessageType('info');
      return;
    }

    const paymentElement = elements.getElement('payment');
    if (!paymentElement) {
      setMessage('Payment form not properly loaded. Please refresh and try again.');
      setMessageType('error');
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setMessage(null);

    try {
      console.log('🏋️ Processing payment for SwanStudios training session(s)');
      
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/CheckoutSuccess`,
          receipt_email: user?.email,
          // Personal training specific metadata
          metadata: {
            business_type: 'personal_training',
            trainer: 'SwanStudios',
            session_count: cart?.items?.length || 1,
            total_sessions: cart?.totalSessions || 1
          }
        },
        redirect: 'if_required',
      });

      if (!mountedRef.current) {
        console.log('Component unmounted during payment processing');
        return;
      }

      if (error) {
        console.error('💳 Payment failed:', error);
        
        // Enhanced error messages for personal training context
        let userMessage = error.message;
        
        if (error.code === 'card_declined') {
          userMessage = 'Your payment method was declined. Please try a different card or contact your bank.';
        } else if (error.code === 'insufficient_funds') {
          userMessage = 'Insufficient funds. Please try a different payment method or add funds to your account.';
        } else if (error.code === 'payment_intent_authentication_failure') {
          userMessage = 'Payment authentication failed. Please verify your payment details and try again.';
        }
        
        setMessage(userMessage);
        setMessageType('error');
        onError(userMessage);
        
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('🎉 Personal training payment successful!', paymentIntent);
        
        setMessage('🎉 Payment successful! Your training sessions are confirmed. Redirecting...');
        setMessageType('success');
        
        // Success with personal training context
        onSuccess(paymentIntent);
        
      } else {
        console.log('ℹ️ Payment requires additional processing:', paymentIntent);
        setMessage('💳 Payment processing... Please wait for confirmation.');
        setMessageType('info');
      }
      
    } catch (err) {
      console.error('💥 Payment processing error:', err);
      
      if (!mountedRef.current) return;
      
      let errorMessage = 'Payment processing failed. Please try again.';
      
      if (err.type === 'card_error') {
        errorMessage = err.message || 'Your card was declined. Please try a different payment method.';
      } else if (err.type === 'validation_error') {
        errorMessage = 'Please check your payment information and try again.';
      }
      
      setMessage(errorMessage);
      setMessageType('error');
      onError(errorMessage);
      
    } finally {
      if (mountedRef.current) {
        processingRef.current = false;
        setIsProcessing(false);
      }
    }
  }, [stripe, elements, elementReady, user?.email, cart, onSuccess, onError]);

  // Enhanced PaymentElement with better error boundaries
  const renderPaymentElement = useMemo(() => {
    if (!clientSecret) return null;
    
    return (
      <PaymentElement
        ref={paymentElementRef}
        options={{
          // Personal training optimized layout
          layout: {
            type: 'tabs',
            defaultCollapsed: false,
            radios: false,
            spacedAccordionItems: true
          },
          // Enhanced payment method types for fitness business
          paymentMethodTypes: ['card', 'us_bank_account'],
          // Better styling for training business
          style: {
            base: {
              fontSize: '16px',
              color: '#ffffff',
              fontFamily: '"Inter", "SF Pro Display", "Roboto", sans-serif',
              '::placeholder': {
                color: 'rgba(255, 255, 255, 0.5)',
              },
              backgroundColor: 'transparent',
              iconColor: '#00ffff',
              lineHeight: '24px'
            },
            invalid: {
              color: '#ef4444',
              iconColor: '#ef4444',
            },
            complete: {
              color: '#10b981',
              iconColor: '#10b981',
            }
          },
          // Business-specific features
          business: {
            name: 'SwanStudios Personal Training'
          }
        }}
        onReady={handlePaymentElementReady}
        onChange={handlePaymentElementChange}
      />
    );
  }, [clientSecret, handlePaymentElementReady, handlePaymentElementChange]);

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Enhanced payment form UI would go here */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        {renderPaymentElement}
        
        {/* Loading state */}
        {!elementReady && (
          <div style={{ 
            textAlign: 'center', 
            padding: '1rem',
            color: '#00ffff' 
          }}>
            <div>Loading secure payment form...</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
              Optimized for personal training payments
            </div>
          </div>
        )}
        
        {/* Error state */}
        {elementError && (
          <div style={{ 
            color: '#ef4444', 
            fontSize: '0.9rem', 
            marginTop: '0.5rem',
            padding: '0.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '6px'
          }}>
            {elementError}
          </div>
        )}
      </div>

      {/* Enhanced submit button for personal training */}
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing || !elementReady}
        style={{
          width: '100%',
          background: isProcessing 
            ? 'rgba(0, 255, 255, 0.5)' 
            : 'linear-gradient(135deg, #00ffff, #0099ff)',
          border: 'none',
          borderRadius: '12px',
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: '#0a0a1a',
          cursor: isProcessing || !elementReady ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          minHeight: '56px',
          transition: 'all 0.3s ease'
        }}
      >
        {isProcessing ? (
          <>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              border: '2px solid rgba(10, 10, 26, 0.3)',
              borderTop: '2px solid #0a0a1a',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Processing Training Payment...
          </>
        ) : !elementReady ? (
          'Loading Payment Form...'
        ) : (
          <>
            🏋️ Complete Training Payment (${cart?.total?.toFixed(2) || '0.00'})
          </>
        )}
      </button>

      {/* Message display */}
      {message && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '8px',
          fontSize: '0.9rem',
          background: messageType === 'success' 
            ? 'rgba(16, 185, 129, 0.1)' 
            : messageType === 'error'
            ? 'rgba(239, 68, 68, 0.1)'
            : 'rgba(59, 130, 246, 0.1)',
          border: `1px solid ${messageType === 'success' 
            ? 'rgba(16, 185, 129, 0.3)' 
            : messageType === 'error'
            ? 'rgba(239, 68, 68, 0.3)'
            : 'rgba(59, 130, 246, 0.3)'}`,
          color: messageType === 'success' 
            ? '#10b981' 
            : messageType === 'error'
            ? '#ef4444'
            : '#3b82f6'
        }}>
          {message}
        </div>
      )}
    </form>
  );
};

export default EnhancedPaymentForm;
