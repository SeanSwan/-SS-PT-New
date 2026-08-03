/**
 * COMPONENT: SuccessPage
 * PURPOSE: Verify a paid checkout return, refresh account truth, and route the client to activation.
 * OWNER: Codex | LAST VALIDATED: 2026-06-09
 *
 * WIREFRAME:
 * [success seal + title]
 * [sessions added highlight]
 * [order details grid]
 * [activation CTA | receipt | home]
 *
 * DATA FLOW:
 * Props In: none; URL: session_id.
 * State: isLoading, error, orderData, activationStatus.
 * API Calls: POST /api/v2/payments/verify-session; GET /api/v2/payments/activation-status.
 * Events: clear cart, refresh auth user, download receipt, navigate to activation CTA.
 * Children: SuccessPageLoadingState, SuccessPageErrorState, SuccessPage.styles sections.
 *
 * ARCHITECTURE: SuccessPage -> checkoutActivation + checkoutReceipt + stateViews + styled sections.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/use-toast';
import GlowButton from '../ui/buttons/GlowButton';
import api from '../../services/api.service';
import { buildOrderDataFromActivationStatus, fetchCheckoutActivationStatus, getActivationCta } from './checkoutActivation';
import type { CheckoutActivationStatus, CheckoutSuccessOrderData } from './checkoutActivation';
import { downloadCheckoutReceipt } from './checkoutReceipt';
import { CheckCircle, Star, Trophy, Calendar, Package, ArrowRight, Home, Download } from 'lucide-react';
import { logger } from '@/utils/logger';
import { ActionGrid } from './SuccessPage.styles';
import { SessionsCount, SessionsDescription, SessionsHighlight, SessionsTitle, SuccessContainer } from './SuccessPage.styles';
import { SuccessContent, SuccessHeader, SuccessIcon, SuccessSubtitle, SuccessTitle } from './SuccessPage.styles';
import { SuccessPageErrorState, SuccessPageInventoryReviewState, SuccessPageLoadingState } from './SuccessPage.stateViews';
import SuccessPageOrderDetails from './SuccessPageOrderDetails';

const SuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { clearCart } = useCart();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportReviewMessage, setSupportReviewMessage] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<CheckoutSuccessOrderData | null>(null);
  const [activationStatus, setActivationStatus] = useState<CheckoutActivationStatus | null>(null);

  const sessionId = searchParams.get('session_id');

  const refreshCheckoutUser = useCallback(async () => {
    const result = await refreshUser();
    if (!result.success) {
      logger.warn('[Success Page] User refresh after checkout failed:', result.error);
    }
  }, [refreshUser]);

  const verifyAndCompleteOrder = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSupportReviewMessage(null);

      logger.log('[Success Page] Verifying Stripe session:', sessionId);

      const response = await api.post('/api/v2/payments/verify-session', {
        sessionId
      });

      if (response.data.success) {
        const orderData = response.data.data;
        setOrderData(orderData);

        logger.log('[Success Page] Order verified:', orderData);

        clearCart();
        await refreshCheckoutUser();

        try {
          const status = await fetchCheckoutActivationStatus(api, sessionId || '');
          setActivationStatus(status);
          logger.log('[Success Page] Activation status resolved:', {
            nextStep: status.activation.nextStep,
            nextRoute: status.activation.nextRoute,
          });
        } catch (activationError) {
          logger.warn('[Success Page] Activation status unavailable:', activationError);
          setActivationStatus(null);
        }

        const toastDescription = typeof orderData.sessionsAdded === 'number' && orderData.sessionsAdded > 0
          ? `${orderData.sessionsAdded} training sessions added to your account.`
          : 'Your payment is confirmed. Continue to your next setup step.';

        toast({
          title: "Payment Successful!",
          description: toastDescription,
          duration: 5000,
        });

      } else {
        throw new Error(response.data.message || 'Order verification failed');
      }

    } catch (error: any) {
      logger.error('[Success Page] Verification failed:', error.message);
      const responseError = error.response?.data?.error;

      if (responseError?.requiresSupportReview) {
        const message = error.response?.data?.message || responseError.details || 'Payment confirmed. Inventory changed before fulfillment could complete.';
        setSupportReviewMessage(message);
        clearCart();
        await refreshCheckoutUser();
        toast({
          title: "Payment Confirmed",
          description: "Our team is reviewing your order and will follow up with the next step.",
          duration: 5000,
        });
        return;
      }

      try {
        const status = await fetchCheckoutActivationStatus(api, sessionId || '');
        if (status.activation.paid) {
          setActivationStatus(status);
          setOrderData(buildOrderDataFromActivationStatus(status, user?.email));
          clearCart();
          await refreshCheckoutUser();
          toast({
            title: "Payment Confirmed",
            description: status.activation.nextAction || 'Continue to your next setup step.',
            duration: 5000,
          });
          return;
        }
      } catch (activationError) {
        logger.warn('[Success Page] Activation status recovery failed:', activationError);
      }

      // This buyer has already been through Stripe. Never show them a raw
      // transport string here — "Request failed with status code 500" or
      // "Network Error" in front of someone who just paid reads like their money
      // vanished. Server-authored copy is written for humans and is safe to
      // show; anything else becomes reassurance that does not over-claim (we do
      // not know the charge settled) but does stop them paying twice.
      const serverDetails = error.response?.data?.error?.details;
      const serverMessage = serverDetails || error.response?.data?.message;
      logger.error('[Success Page] Verification failed:', error);
      setError(
        serverMessage ||
        "We couldn't confirm your order automatically. If your payment went through it has been received — please don't pay again. Contact support with your order reference below and we'll finish activating your sessions."
      );
    } finally {
      setIsLoading(false);
    }
  }, [clearCart, refreshCheckoutUser, sessionId, toast, user?.email]);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    verifyAndCompleteOrder();
  }, [sessionId, verifyAndCompleteOrder]);

  const handlePrimaryActivationAction = () => {
    navigate(getActivationCta(activationStatus).route);
  };

  const handleGoToHome = () => {
    navigate('/');
  };

  const handleDownloadReceipt = () => {
    if (!orderData) {
      toast({
        title: "Receipt Unavailable",
        description: "Payment details are still loading. Please refresh and try again.",
        duration: 3000,
      });
      return;
    }

    downloadCheckoutReceipt({
      ...orderData,
      customerName: customerDisplayName,
      customerEmail: customerEmailDisplay,
      orderDate: orderData.orderDate || new Date().toISOString(),
    });

    toast({
      title: "Receipt Download",
      description: "Your receipt file has been generated.",
      duration: 3000,
    });
  };

  if (isLoading) {
    return <SuccessPageLoadingState />;
  }

  if (error) {
    return (
      <SuccessPageErrorState
        error={error}
        onGoHome={handleGoToHome}
        onRetry={sessionId ? verifyAndCompleteOrder : undefined}
        sessionId={sessionId}
      />
    );
  }

  if (supportReviewMessage) {
    return <SuccessPageInventoryReviewState message={supportReviewMessage} onGoHome={handleGoToHome} />;
  }

  const primaryCta = getActivationCta(activationStatus);
  const customerDisplayName = orderData?.customerName
    || [user?.firstName, user?.lastName].filter(Boolean).join(' ')
    || 'Account holder';
  const customerEmailDisplay = orderData?.customerEmail || user?.email || 'Email on account';
  const orderDateDisplay = orderData?.orderDate
    ? new Date(orderData.orderDate).toLocaleDateString()
    : 'Today';

  return (
    <SuccessContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <SuccessHeader>
        <SuccessIcon
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <CheckCircle size={50} aria-hidden="true" />
        </SuccessIcon>
        <SuccessTitle>Payment Successful!</SuccessTitle>
        <SuccessSubtitle>
          Your training package purchase has been completed successfully
        </SuccessSubtitle>
      </SuccessHeader>

      <SuccessContent>
        {orderData && typeof orderData.sessionsAdded === 'number' && orderData.sessionsAdded > 0 && (
          <SessionsHighlight
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <SessionsTitle>
              <Calendar size={24} />
              Training Sessions Added
            </SessionsTitle>
            <SessionsCount>{orderData.sessionsAdded}</SessionsCount>
            <SessionsDescription>
              Premium training sessions are now available in your account
            </SessionsDescription>
          </SessionsHighlight>
        )}

        {orderData && (
          <SuccessPageOrderDetails
            orderData={orderData}
            customerDisplayName={customerDisplayName}
            customerEmailDisplay={customerEmailDisplay}
            orderDateDisplay={orderDateDisplay}
          />
        )}

        <ActionGrid>
          <GlowButton
            variant="primary"
            size="large"
            fullWidth
            onClick={handlePrimaryActivationAction}
            rightIcon={<ArrowRight size={20} aria-hidden="true" />}
          >
            <Trophy size={20} aria-hidden="true" />
            {primaryCta.label}
          </GlowButton>
          
          <GlowButton
            variant="success"
            size="large"
            fullWidth
            onClick={handleDownloadReceipt}
            rightIcon={<Download size={20} aria-hidden="true" />}
          >
            <Package size={20} aria-hidden="true" />
            Download Receipt
          </GlowButton>
          
          <GlowButton
            variant="ghost"
            size="large"
            fullWidth
            onClick={handleGoToHome}
            rightIcon={<Home size={20} aria-hidden="true" />}
          >
            <Star size={20} aria-hidden="true" />
            Return Home
          </GlowButton>
        </ActionGrid>
      </SuccessContent>
    </SuccessContainer>
  );
};

export default SuccessPage;
