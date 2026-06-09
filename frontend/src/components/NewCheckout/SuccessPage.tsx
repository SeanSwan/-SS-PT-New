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
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/use-toast';
import GlowButton from '../ui/buttons/GlowButton';
import api from '../../services/api.service';
import { buildOrderDataFromActivationStatus, fetchCheckoutActivationStatus, getActivationCta } from './checkoutActivation';
import type { CheckoutActivationStatus, CheckoutSuccessOrderData } from './checkoutActivation';
import { downloadCheckoutReceipt } from './checkoutReceipt';
import { CheckCircle, Star, Trophy, Calendar, DollarSign, Package, Users, ArrowRight, Home, Download, Mail } from 'lucide-react';
import { logger } from '@/utils/logger';
import { ActionGrid, CardTitle, DetailGrid, DetailIcon, DetailItem, DetailLabel, DetailValue, OrderDetailsCard } from './SuccessPage.styles';
import { SessionsCount, SessionsDescription, SessionsHighlight, SessionsTitle, SuccessContainer } from './SuccessPage.styles';
import { SuccessContent, SuccessHeader, SuccessIcon, SuccessSubtitle, SuccessTitle } from './SuccessPage.styles';
import { SuccessPageErrorState, SuccessPageLoadingState } from './SuccessPage.stateViews';

const SuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { clearCart } = useCart();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<CheckoutSuccessOrderData | null>(null);
  const [activationStatus, setActivationStatus] = useState<CheckoutActivationStatus | null>(null);

  const sessionId = searchParams.get('session_id');

  const refreshCheckoutUser = async () => {
    const result = await refreshUser();
    if (!result.success) {
      logger.warn('[Success Page] User refresh after checkout failed:', result.error);
    }
  };

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided');
      setIsLoading(false);
      return;
    }

    verifyAndCompleteOrder();
  }, [sessionId]);

  const verifyAndCompleteOrder = async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      const serverDetails = error.response?.data?.error?.details;
      setError(serverDetails || error.response?.data?.message || error.message || 'Order verification failed');
    } finally {
      setIsLoading(false);
    }
  };

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
    return <SuccessPageErrorState error={error} onGoHome={handleGoToHome} />;
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
                <DetailIcon>
                  <DollarSign size={20} />
                </DetailIcon>
                <DetailLabel>Amount Paid</DetailLabel>
                <DetailValue>${orderData.amount.toFixed(2)}</DetailValue>
              </DetailItem>
              
              <DetailItem>
                <DetailIcon>
                  <Users size={20} />
                </DetailIcon>
                <DetailLabel>Customer</DetailLabel>
                <DetailValue>{customerDisplayName}</DetailValue>
              </DetailItem>
              
              <DetailItem>
                <DetailIcon>
                  <Mail size={20} />
                </DetailIcon>
                <DetailLabel>Email</DetailLabel>
                <DetailValue>{customerEmailDisplay}</DetailValue>
              </DetailItem>
              
              <DetailItem>
                <DetailIcon>
                  <Calendar size={20} />
                </DetailIcon>
                <DetailLabel>Date</DetailLabel>
                <DetailValue>{orderDateDisplay}</DetailValue>
              </DetailItem>
            </DetailGrid>
          </OrderDetailsCard>
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
