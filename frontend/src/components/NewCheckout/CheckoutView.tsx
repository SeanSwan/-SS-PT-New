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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/use-toast';
import api from '../../services/api.service';
import { logger } from '@/utils/logger';
import { readAcquisitionParams } from '../../utils/acquisitionAttribution';
import { AuthRequiredCheckout, CheckoutReadyView } from './CheckoutView.sections';
import type { CheckoutState } from './CheckoutView.types';
import type { CheckoutFulfillmentDetails } from './CheckoutView.logic';
import {
  buildCheckoutFulfillmentIntent,
  calculateCheckoutTotals,
  createDefaultFulfillmentDetails,
  mergeCheckoutFulfillmentDetails,
  validateCheckoutFulfillment,
} from './CheckoutView.logic';

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
    fulfillmentDetails: createDefaultFulfillmentDetails({
      recipientName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
      phone: user?.phone || '',
    }),
  });

  const cartItems = useMemo(() => cart?.items || [], [cart?.items]);
  const checkoutTotals = useMemo(() => calculateCheckoutTotals(cartItems), [cartItems]);
  const baseFulfillmentIntent = useMemo(() => buildCheckoutFulfillmentIntent(cartItems), [cartItems]);
  const fulfillmentIntent = useMemo(
    () => mergeCheckoutFulfillmentDetails(baseFulfillmentIntent, checkoutState.fulfillmentDetails),
    [baseFulfillmentIntent, checkoutState.fulfillmentDetails]
  );
  const { subtotal, tax, taxLabel, total, sessionCount } = checkoutTotals;

  useEffect(() => {
    if (isAuthenticated) {
      refreshCart();
    }
  }, [isAuthenticated, refreshCart]);

  useEffect(() => {
    if (!user) return;
    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

    setCheckoutState(prev => ({
      ...prev,
      customerInfo: {
        name: displayName,
        email: user.email || '',
        phone: user.phone || '',
      },
      fulfillmentDetails: {
        ...prev.fulfillmentDetails,
        recipientName: prev.fulfillmentDetails.recipientName || displayName,
        phone: prev.fulfillmentDetails.phone || user.phone || '',
      },
    }));
  }, [user]);

  useEffect(() => {
    if (!baseFulfillmentIntent.required || baseFulfillmentIntent.mode === 'none') return;
    const nextMode = baseFulfillmentIntent.mode as CheckoutFulfillmentDetails['mode'];
    setCheckoutState(prev => {
      if (prev.fulfillmentDetails.mode === nextMode) return prev;
      return {
        ...prev,
        fulfillmentDetails: {
          ...prev.fulfillmentDetails,
          mode: nextMode,
        },
      };
    });
  }, [baseFulfillmentIntent]);

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

    const fulfillmentError = validateCheckoutFulfillment(fulfillmentIntent);
    if (fulfillmentError) {
      setCheckoutState(prev => ({
        ...prev,
        error: fulfillmentError,
      }));
      toastError(`Checkout Error: ${fulfillmentError}`);
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
        fulfillmentIntent,
        metadata: {
          userId: user.id,
          cartId: cart.id,
          sessionCount,
          source: 'swan_checkout',
          ...readAcquisitionParams(),
        },
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create checkout session');
      }

      const { checkoutUrl, sessionId } = response.data.data;
      if (!sessionId || !checkoutUrl) {
        // The diagnostic detail belongs in the log, not in front of a buyer. The
        // previous throw interpolated the two boolean flags into its message and
        // that string rendered verbatim on the payment screen.
        logger.error('[Checkout] Incomplete session payload', {
          hasSessionId: !!sessionId,
          hasCheckoutUrl: !!checkoutUrl,
        });
        throw new Error('We could not start the secure payment page. Please try again.');
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

      // isProcessing deliberately stays TRUE through the redirect. Clearing it
      // here re-enabled the pay button for the full second before
      // window.location.href fires, and a second click in that window creates a
      // SECOND Stripe Checkout Session for the same cart.
      setCheckoutState(prev => ({
        ...prev,
        success: 'Redirecting to secure payment...',
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
        const errorCode = error.response.data?.error?.code;

        if (status === 500) {
          // Rule 75: do NOT claim the team was notified. Server 5xx are captured
          // and grouped (services/monitoring/errorReporter.mjs) but no forwarding
          // sink is registered, so nothing reaches a human until someone reads the
          // log. Point at the support channel instead — /support is a real, linked
          // surface (CompactFooter -> POST /api/support/issues).
          errorMessage = 'Server error occurred. Please try again — if it keeps happening, report it from the Support page.';
          errorDetails = 'This may be due to payment system configuration. Please try again in a moment.';
        } else if (status === 503 && errorCode === 'STRIPE_TAX_NOT_CONFIGURED') {
          errorMessage = serverMessage || 'Physical product checkout is temporarily unavailable.';
          errorDetails = 'Stripe Tax setup is required before this item can be purchased online.';
        } else if (status === 503) {
          errorMessage = 'Payment processing temporarily unavailable.';
          errorDetails = 'Stripe payment service is not configured. Please contact support.';
        } else if (status === 400) {
          errorMessage = serverMessage || 'Invalid checkout request.';
        } else {
          // Never surface a bare HTTP status to a buyer — "Server error (502)"
          // tells them nothing they can act on. A server-supplied message is
          // written for humans (the 429 throttle message is the common case);
          // anything else falls back to plain recoverable copy.
          errorMessage = serverMessage || 'Checkout could not be completed. Please try again in a moment.';
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to payment service.';
        errorDetails = 'Please check your internet connection and try again.';
      } else {
        // Reached only for non-HTTP throws. Our own throws here are deliberate,
        // human-written copy (e.g. the secure-payment-page failure) and use a
        // plain Error, so they should show. A genuine runtime fault —
        // TypeError, ReferenceError — must NOT: "Cannot read properties of
        // undefined" in front of a buyer at the payment step is worse than
        // saying nothing useful.
        const isDeliberateCopy = error instanceof Error && error.name === 'Error';
        errorMessage = (isDeliberateCopy && error.message?.trim())
          ? error.message
          : 'An unexpected error occurred. Please try again.';
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
    fulfillmentIntent,
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
      && !validateCheckoutFulfillment(fulfillmentIntent)
    )
  ), [isAuthenticated, user, cart, total, checkoutState.customerInfo, fulfillmentIntent]);

  if (!isAuthenticated) {
    return <AuthRequiredCheckout />;
  }

  return (
    <CheckoutReadyView
      cart={cart}
      checkoutReady={isCheckoutReady()}
      customerInfo={checkoutState.customerInfo}
      error={checkoutState.error}
      fulfillmentDetails={checkoutState.fulfillmentDetails}
      isProcessing={checkoutState.isProcessing}
      onCancel={onCancel}
      onCheckout={handleCreateCheckoutSession}
      onFulfillmentDetailsChange={(details) => setCheckoutState(prev => ({
        ...prev,
        fulfillmentDetails: details,
      }))}
      sessionCount={sessionCount}
      subtotal={subtotal}
      success={checkoutState.success}
      tax={tax}
      taxLabel={taxLabel}
      total={total}
      fulfillmentIntent={fulfillmentIntent}
    />
  );
};

export default CheckoutView;
