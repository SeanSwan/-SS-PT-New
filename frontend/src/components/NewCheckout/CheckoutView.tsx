/**
 * COMPONENT: CheckoutView
 * PURPOSE: Own live paid-checkout state, create Stripe sessions, and render checkout sections.
 * OWNER: Codex | LAST VALIDATED: 2026-06-09
 *
 * WIREFRAME:
 * [secure checkout header]
 * [trust badges]
 * [customer info + payment action] [order summary]
 * [status messages]
 *
 * DATA FLOW:
 * Props In: optional onSuccess/onCancel callbacks.
 * State: CheckoutState with processing, error, success, and customerInfo.
 * API Calls: GET /api/v2/payments/health; POST /api/v2/payments/create-checkout-session.
 * Events: refresh cart, hydrate account contact, track checkout start, redirect to Stripe.
 * Children: AuthRequiredCheckout, CheckoutReadyView, OrderReviewStep through sections.
 *
 * ARCHITECTURE: CheckoutView -> CheckoutView.sections -> CheckoutView.styles + payment services.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/use-toast';
import api from '../../services/api.service';
import { logger } from '@/utils/logger';
import { AuthRequiredCheckout, CheckoutReadyView } from './CheckoutView.sections';
import type { CheckoutState } from './CheckoutView.types';

interface CheckoutViewProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CheckoutView: React.FC<CheckoutViewProps> = ({
  onCancel,
}) => {
  const { user, isAuthenticated } = useAuth();
  const { cart, refreshCart } = useCart();
  const { success: toastSuccess, error: toastError } = useToast();

  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    isProcessing: false,
    error: null,
    success: null,
    customerInfo: {
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
      email: user?.email || '',
      phone: user?.phone || '',
    },
  });

  const cartItems = cart?.items || [];
  const subtotal = cartItems.reduce((sum, item) => {
    const itemPrice = Number(item.price) || 0;
    const itemQuantity = item.quantity || 0;
    return sum + (itemPrice * itemQuantity);
  }, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  const sessionCount = cartItems.reduce((sum, item) => {
    const itemSessions = item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || 0;
    return sum + (itemSessions * (item.quantity || 0));
  }, 0);

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    }
  }, [isAuthenticated, refreshCart]);

  useEffect(() => {
    if (!user) return;

    setCheckoutState(prev => ({
      ...prev,
      customerInfo: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || '',
        phone: user.phone || '',
      },
    }));
  }, [user]);

  const handleCreateCheckoutSession = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setCheckoutState(prev => ({
        ...prev,
        error: 'Please log in to complete your purchase',
      }));
      return;
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      setCheckoutState(prev => ({
        ...prev,
        error: 'Your cart is empty. Please add items before checkout.',
      }));
      return;
    }

    setCheckoutState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
      success: null,
    }));

    try {
      logger.log('[Checkout] Creating Stripe Checkout Session');
      logger.log('[Checkout] Total:', total.toFixed(2));
      logger.log('[Checkout] Sessions:', sessionCount);
      logger.log('[Checkout] Cart ID:', cart.id);
      logger.log('[Checkout] User ID:', user.id);

      try {
        const healthResponse = await api.get('/api/v2/payments/health');
        logger.log('[Checkout] Payment system health:', healthResponse.data);

        if (!healthResponse.data?.success || healthResponse.data?.data?.status !== 'healthy') {
          logger.warn('[Checkout] Payment system not fully healthy:', healthResponse.data);
        }
      } catch (healthError) {
        logger.warn('[Checkout] Payment health check failed:', healthError);
      }

      const response = await api.post('/api/v2/payments/create-checkout-session', {
        cartId: cart.id,
        customerInfo: checkoutState.customerInfo,
        metadata: {
          userId: user.id,
          cartId: cart.id,
          sessionCount,
          source: 'swan_checkout',
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create checkout session');
      }

      const { checkoutUrl, sessionId } = response.data.data;
      if (!sessionId || !checkoutUrl) {
        throw new Error(`Missing critical checkout data: sessionId=${!!sessionId}, checkoutUrl=${!!checkoutUrl}`);
      }

      logger.log('[Checkout] Session created successfully');
      logger.log('[Checkout] Session ID:', sessionId);
      logger.log('[Checkout] Redirecting to Stripe');

      try {
        await api.post('/api/financial/track-checkout-start', {
          sessionId,
          userId: user.id,
          cartId: cart.id,
          amount: total,
          sessionCount,
          timestamp: new Date().toISOString(),
        });
        logger.log('[Admin Dashboard] Checkout tracked for analytics');
      } catch (trackingError) {
        logger.warn('[Admin Dashboard] Checkout tracking failed:', trackingError);
      }

      setCheckoutState(prev => ({
        ...prev,
        success: 'Redirecting to secure payment...',
        isProcessing: false,
      }));

      toastSuccess('Checkout Ready! Redirecting to secure Stripe payment...');

      setTimeout(() => {
        window.location.href = checkoutUrl;
      }, 1000);
    } catch (error: any) {
      logger.error('[Checkout] Failed:', error);
      logger.error('[Checkout] Error response:', error.response);
      logger.error('[Checkout] Error data:', error.response?.data);

      let errorMessage = 'Checkout failed. Please try again.';
      let errorDetails = '';

      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data?.message || error.response.data?.error?.details;

        if (status === 500) {
          errorMessage = 'Server error occurred. Our team has been notified.';
          errorDetails = 'This may be due to payment system configuration. Please try again in a moment.';
        } else if (status === 503) {
          errorMessage = 'Payment processing temporarily unavailable.';
          errorDetails = 'Stripe payment service is not configured. Please contact support.';
        } else if (status === 400) {
          errorMessage = serverMessage || 'Invalid checkout request.';
        } else {
          errorMessage = serverMessage || `Server error (${status})`;
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to payment service.';
        errorDetails = 'Please check your internet connection and try again.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred.';
      }

      const fullErrorMessage = errorDetails ? `${errorMessage} ${errorDetails}` : errorMessage;
      setCheckoutState(prev => ({
        ...prev,
        error: fullErrorMessage,
        isProcessing: false,
      }));

      toastError(`Checkout Error: ${fullErrorMessage}`);
    }
  }, [
    isAuthenticated,
    user,
    cart,
    checkoutState.customerInfo,
    total,
    sessionCount,
    toastSuccess,
    toastError,
  ]);

  const isCheckoutReady = useCallback(() => (
    Boolean(
      isAuthenticated
      && user
      && cart
      && cart.items
      && cart.items.length > 0
      && total > 0
      && checkoutState.customerInfo.name.trim()
      && checkoutState.customerInfo.email.trim()
    )
  ), [isAuthenticated, user, cart, total, checkoutState.customerInfo]);

  if (!isAuthenticated) {
    return <AuthRequiredCheckout />;
  }

  return (
    <CheckoutReadyView
      cart={cart}
      checkoutReady={isCheckoutReady()}
      customerInfo={checkoutState.customerInfo}
      error={checkoutState.error}
      isProcessing={checkoutState.isProcessing}
      onCancel={onCancel}
      onCheckout={handleCreateCheckoutSession}
      sessionCount={sessionCount}
      subtotal={subtotal}
      success={checkoutState.success}
      tax={tax}
      total={total}
    />
  );
};

export default CheckoutView;
