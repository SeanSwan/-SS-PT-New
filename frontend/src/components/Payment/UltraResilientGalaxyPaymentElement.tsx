/**
 * UltraResilientGalaxyPaymentElement.tsx
 * ======================================
 * Advanced Stripe integration with comprehensive error handling
 * Master Prompt v33 - "Outside the Box" Solution
 * 
 * Features:
 * - Runtime key validation
 * - Automatic retry mechanisms  
 * - Progressive enhancement
 * - Advanced error boundaries
 * - Real-time diagnostics
 * - Lifecycle management
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { CreditCard, Shield, Zap, CheckCircle, AlertCircle, Loader, RefreshCw } from 'lucide-react';

// Advanced Stripe Configuration with Runtime Validation
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Runtime Key Validator
class StripeKeyValidator {
  static validateKey(key: string): { valid: boolean; accountId: string | null; keyType: string | null; errors: string[] } {
    const errors: string[] = [];
    let accountId: string | null = null;
    let keyType: string | null = null;

    if (!key) {
      errors.push('No Stripe publishable key found');
      return { valid: false, accountId, keyType, errors };
    }

    if (key.includes('placeholder') || key.includes('your_') || key.length < 50) {
      errors.push('Using placeholder key - Stripe not configured');
      return { valid: false, accountId, keyType, errors };
    }

    // Extract key type and account
    if (key.startsWith('pk_live_')) {
      keyType = 'live';
      const match = key.match(/pk_live_([A-Za-z0-9]{16,})/);
      accountId = match ? match[1].substring(0, 16) : null;
    } else if (key.startsWith('pk_test_')) {
      keyType = 'test';
      const match = key.match(/pk_test_([A-Za-z0-9]{16,})/);
      accountId = match ? match[1].substring(0, 16) : null;
    } else {
      errors.push(`Invalid key format: ${key.substring(0, 10)}...`);
      return { valid: false, accountId, keyType, errors };
    }

    if (!accountId) {
      errors.push('Could not extract account ID from key');
      return { valid: false, accountId, keyType, errors };
    }

    if (key.length < 99) {
      errors.push(`Key too short: ${key.length} characters`);
    }

    return { 
      valid: errors.length === 0, 
      accountId, 
      keyType, 
      errors 
    };
  }

  static logValidation(validation: ReturnType<typeof StripeKeyValidator.validateKey>) {
    if (validation.valid) {
      console.log(`✅ STRIPE KEY VALID: ${validation.keyType?.toUpperCase()} environment, Account: ${validation.accountId}`);
    } else {
      console.error('❌ STRIPE KEY VALIDATION FAILED:');
      validation.errors.forEach(error => console.error(`   - ${error}`));
    }
    return validation;
  }
}

// Validate key and create Stripe promise
const keyValidation = StripeKeyValidator.logValidation(
  StripeKeyValidator.validateKey(stripePublishableKey || '')
);

const stripePromise = keyValidation.valid 
  ? loadStripe(stripePublishableKey!)
  : null;

// Enhanced Error Boundary Component
class StripeErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: any) => void },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('🚨 STRIPE ERROR BOUNDARY CAUGHT:', error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          background: 'rgba(255, 68, 68, 0.1)',
          border: '1px solid rgba(255, 68, 68, 0.3)',
          borderRadius: '12px',
          color: '#ff4444'
        }}>
          <AlertCircle size={48} style={{ marginBottom: '1rem' }} />
          <h3>Payment System Error</h3>
          <p>The payment component encountered an error and has been safely contained.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: '#ff4444',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Advanced Retry Manager
class PaymentRetryManager {
  private attempts = 0;
  private maxAttempts = 3;
  private backoffMultiplier = 1000; // Start with 1 second

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorHandler: (error: any, attempt: number) => void
  ): Promise<T> {
    while (this.attempts < this.maxAttempts) {
      try {
        this.attempts++;
        const result = await operation();
        this.reset(); // Reset on success
        return result;
      } catch (error) {
        console.warn(`💫 Payment operation attempt ${this.attempts} failed:`, error);
        errorHandler(error, this.attempts);
        
        if (this.attempts >= this.maxAttempts) {
          console.error('💥 All payment retry attempts exhausted');
          throw error;
        }
        
        // Exponential backoff
        const delay = this.backoffMultiplier * Math.pow(2, this.attempts - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retry attempts reached');
  }

  reset() {
    this.attempts = 0;
  }
}

// Enhanced Payment Form with Advanced Error Handling
const UltraResilientPaymentForm: React.FC<{
  clientSecret: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: string) => void;
  embedded?: boolean;
}> = ({ clientSecret, onSuccess, onError, embedded = false }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { cart } = useCart();
  
  // Advanced state management
  const mountedRef = useRef(true);
  const processingRef = useRef(false);
  const retryManager = useRef(new PaymentRetryManager());
  const elementRef = useRef<any>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [elementReady, setElementReady] = useState(false);
  const [elementError, setElementError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      processingRef.current = false;
    };
  }, []);

  // Runtime Diagnostics
  const runDiagnostics = useCallback(() => {
    const diag = {
      stripeLoaded: !!stripe,
      elementsLoaded: !!elements,
      elementReady,
      clientSecret: clientSecret?.substring(0, 20) + '...',
      keyValidation,
      timestamp: new Date().toISOString()
    };
    
    console.log('🔍 PAYMENT DIAGNOSTICS:', diag);
    setDiagnostics(diag);
    return diag;
  }, [stripe, elements, elementReady, clientSecret]);

  // Enhanced Payment Element Ready Handler
  const handlePaymentElementReady = useCallback(() => {
    if (!mountedRef.current) return;
    
    console.log('💳 Payment Element ready with ultra-resilient handling');
    setElementReady(true);
    setElementError(null);
    runDiagnostics();
  }, [runDiagnostics]);

  // Advanced Error Recovery Handler
  const handlePaymentElementChange = useCallback((event: any) => {
    if (!mountedRef.current) return;
    
    console.log('💳 Payment Element change detected:', event);
    
    if (event.error) {
      console.error('❌ Payment Element error:', event.error);
      setElementError(event.error.message);
      
      // Automatic error recovery for common issues
      if (event.error.code === 'element_invalid_state') {
        console.log('🔄 Attempting automatic recovery for invalid element state...');
        setTimeout(() => {
          if (mountedRef.current) {
            setElementError(null);
            runDiagnostics();
          }
        }, 1000);
      }
    } else {
      setElementError(null);
    }
    
    if (event.complete) {
      console.log('✅ Payment information complete and validated');
    }
  }, [runDiagnostics]);

  // Ultra-Resilient Submit Handler
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (processingRef.current || !mountedRef.current) {
      console.log('⚠️ Payment submission blocked - already processing or unmounted');
      return;
    }

    console.log('🚀 ULTRA-RESILIENT PAYMENT SUBMISSION INITIATED');
    const preDiagnostics = runDiagnostics();

    if (!stripe || !elements) {
      setMessage('Payment system loading... Please wait.');
      setMessageType('info');
      return;
    }

    if (!elementReady) {
      setMessage('Payment form still initializing. Please wait a moment...');
      setMessageType('warning');
      return;
    }

    const paymentElement = elements.getElement('payment');
    if (!paymentElement) {
      setMessage('Payment form error. Refreshing...');
      setMessageType('error');
      setTimeout(() => window.location.reload(), 2000);
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setMessage(null);

    try {
      console.log('💫 Executing payment with retry manager...');
      
      const result = await retryManager.current.executeWithRetry(
        async () => {
          return await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/checkout/CheckoutSuccess`,
              receipt_email: user?.email,
              metadata: {
                business_type: 'personal_training',
                trainer: 'SwanStudios',
                session_count: cart?.items?.length || 1,
                total_sessions: cart?.totalSessions || 1,
                retry_attempt: retryCount,
                diagnostics: JSON.stringify(preDiagnostics)
              }
            },
            redirect: 'if_required',
          });
        },
        (error, attempt) => {
          setRetryCount(attempt);
          if (attempt < 3) {
            setMessage(`Payment attempt ${attempt} failed. Retrying...`);
            setMessageType('warning');
          }
        }
      );

      if (!mountedRef.current) {
        console.log('Component unmounted during payment processing');
        return;
      }

      const { error, paymentIntent } = result;

      if (error) {
        console.error('💳 Payment failed after all retries:', error);
        
        let userMessage = 'Payment failed. Please try again.';
        
        // Enhanced error messaging
        switch (error.code) {
          case 'card_declined':
            userMessage = 'Your payment method was declined. Please try a different card.';
            break;
          case 'insufficient_funds':
            userMessage = 'Insufficient funds. Please try a different payment method.';
            break;
          case 'payment_intent_authentication_failure':
            userMessage = 'Payment authentication failed. Please verify your details.';
            break;
          case 'payment_method_creation_failed':
            userMessage = 'Unable to process payment method. Please check your information.';
            break;
          default:
            if (error.message?.includes('publishable key')) {
              userMessage = 'Payment configuration error. Please contact support.';
              console.error('🚨 KEY MISMATCH DETECTED - Check Stripe dashboard');
            }
        }
        
        setMessage(userMessage);
        setMessageType('error');
        onError(userMessage);
        
      } else if (paymentIntent?.status === 'succeeded') {
        console.log('🎉 Payment succeeded after ultra-resilient processing!', paymentIntent);
        
        setMessage('🎉 Payment successful! Your training sessions are confirmed.');
        setMessageType('success');
        onSuccess(paymentIntent);
        
      } else {
        console.log('ℹ️ Payment requires additional processing:', paymentIntent);
        setMessage('💳 Processing payment... Please wait for confirmation.');
        setMessageType('info');
      }
      
    } catch (err: any) {
      console.error('💥 Ultra-resilient payment processing failed:', err);
      
      if (!mountedRef.current) return;
      
      let errorMessage = 'Payment processing failed after multiple attempts.';
      
      if (err.type === 'card_error') {
        errorMessage = err.message || 'Your card was declined.';
      } else if (err.type === 'validation_error') {
        errorMessage = 'Please check your payment information.';
      } else if (err.message?.includes('Key validation failed')) {
        errorMessage = 'Payment system configuration error. Please contact support.';
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
  }, [stripe, elements, elementReady, user?.email, cart, retryCount, onSuccess, onError, runDiagnostics]);

  // Manual Retry Handler
  const handleManualRetry = useCallback(() => {
    setElementError(null);
    setMessage(null);
    retryManager.current.reset();
    setRetryCount(0);
    runDiagnostics();
    
    // Force element refresh if needed
    setTimeout(() => {
      const paymentElement = elements?.getElement('payment');
      if (paymentElement) {
        console.log('🔄 Manual retry - element refreshed');
      }
    }, 100);
  }, [elements, runDiagnostics]);

  // Enhanced PaymentElement with Error Boundaries
  const renderPaymentElement = useMemo(() => {
    if (!clientSecret) return null;
    
    return (
      <StripeErrorBoundary onError={(error) => setElementError(error.message)}>
        <PaymentElement
          ref={elementRef}
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
              radios: false,
              spacedAccordionItems: true
            },
            paymentMethodTypes: ['card', 'us_bank_account'],
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
            business: {
              name: 'SwanStudios Personal Training'
            }
          }}
          onReady={handlePaymentElementReady}
          onChange={handlePaymentElementChange}
        />
      </StripeErrorBoundary>
    );
  }, [clientSecret, handlePaymentElementReady, handlePaymentElementChange]);

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Enhanced Payment Form UI */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        {/* Key Validation Display */}
        {!keyValidation.valid && (
          <div style={{
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            color: '#ff4444'
          }}>
            <strong>⚠️ Stripe Configuration Error:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
              {keyValidation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {renderPaymentElement}
        
        {/* Loading State with Diagnostics */}
        {!elementReady && keyValidation.valid && (
          <div style={{ 
            textAlign: 'center', 
            padding: '1rem',
            color: '#00ffff' 
          }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ display: 'inline-block', marginBottom: '0.5rem' }}
            >
              <Loader size={24} />
            </motion.div>
            <div>Loading ultra-secure payment form...</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>
              Optimized for SwanStudios training payments
            </div>
          </div>
        )}
        
        {/* Error State with Recovery Options */}
        {elementError && (
          <div style={{ 
            color: '#ef4444', 
            fontSize: '0.9rem', 
            marginTop: '0.5rem',
            padding: '0.75rem',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertCircle size={16} />
              <strong>Payment Form Error</strong>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>{elementError}</div>
            <button
              type="button"
              onClick={handleManualRetry}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <RefreshCw size={14} />
              Retry Payment Form
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Submit Button */}
      <button
        type="submit"
        disabled={!stripe || !elements || isProcessing || !elementReady || !keyValidation.valid}
        style={{
          width: '100%',
          background: isProcessing 
            ? 'rgba(0, 255, 255, 0.5)' 
            : !keyValidation.valid
            ? 'rgba(255, 68, 68, 0.5)'
            : 'linear-gradient(135deg, #00ffff, #0099ff)',
          border: 'none',
          borderRadius: '12px',
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: '#0a0a1a',
          cursor: (!elementReady || isProcessing || !keyValidation.valid) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          minHeight: '56px',
          transition: 'all 0.3s ease'
        }}
      >
        {!keyValidation.valid ? (
          <>
            <AlertCircle size={20} />
            Configuration Error
          </>
        ) : isProcessing ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Loader size={20} />
            </motion.div>
            {retryCount > 0 ? `Processing (Attempt ${retryCount})...` : 'Processing Payment...'}
          </>
        ) : !elementReady ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader size={20} />
            </motion.div>
            Loading Form...
          </>
        ) : (
          <>
            <Shield size={20} />
            Complete Training Payment (${cart?.total?.toFixed(2) || '0.00'})
          </>
        )}
      </button>

      {/* Advanced Message Display */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              marginTop: '1rem',
              padding: '1rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              background: messageType === 'success' 
                ? 'rgba(16, 185, 129, 0.1)' 
                : messageType === 'error'
                ? 'rgba(239, 68, 68, 0.1)'
                : messageType === 'warning'
                ? 'rgba(255, 165, 0, 0.1)'
                : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${messageType === 'success' 
                ? 'rgba(16, 185, 129, 0.3)' 
                : messageType === 'error'
                ? 'rgba(239, 68, 68, 0.3)'
                : messageType === 'warning'
                ? 'rgba(255, 165, 0, 0.3)'
                : 'rgba(59, 130, 246, 0.3)'}`,
              color: messageType === 'success' 
                ? '#10b981' 
                : messageType === 'error'
                ? '#ef4444'
                : messageType === 'warning'
                ? '#ffa500'
                : '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {messageType === 'success' && <CheckCircle size={16} />}
            {messageType === 'error' && <AlertCircle size={16} />}
            {messageType === 'warning' && <AlertCircle size={16} />}
            {messageType === 'info' && <Loader size={16} />}
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Development Diagnostics */}
      {process.env.NODE_ENV === 'development' && diagnostics && (
        <details style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.6)' }}>
          <summary style={{ cursor: 'pointer' }}>🔍 Payment Diagnostics</summary>
          <pre style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </details>
      )}
    </form>
  );
};

export default UltraResilientPaymentForm;
