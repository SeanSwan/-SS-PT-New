/**
 * COMPONENT: CheckoutCancel
 * PURPOSE: Recover cancelled paid checkouts while preserving cart and next actions.
 * OWNER: Codex | LAST VALIDATED: 2026-06-09
 *
 * WIREFRAME:
 * [brand mark]
 * [recovery card: icon, title, no-charge copy]
 * [optional order summary]
 * [return/retry/support/help actions]
 *
 * DATA FLOW:
 * Props In: none; URL params session_id, reason, step.
 * State: none.
 * API Calls: none.
 * Events: local abandonment log, navigate to store/contact/home/help.
 * Children: OrderReviewStep and styled recovery controls.
 *
 * ARCHITECTURE: CheckoutCancel -> CheckoutCancel.styles + OrderReviewStep.
 */
import React, { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, HelpCircle, MessageCircle, RefreshCw, ShoppingCart } from 'lucide-react';
import { OrderReviewStep } from '../../components/NewCheckout';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/use-toast';
import logoImg from '../../assets/Logo.png';
import { logger } from '@/utils/logger';
import {
  ActionButton,
  ActionCard,
  ActionDescription,
  ActionGrid,
  ActionIcon,
  ActionTitle,
  CancelCard,
  CancelContent,
  CancelIcon,
  CancelMessage,
  CancelPageContainer,
  CancelSubtitle,
  CancelTitle,
  ContentContainer,
  HelpSection,
  HelpText,
  HelpTitle,
  LogoContainer,
  OrderSummaryMotion,
  PrimaryActions,
} from './CheckoutCancel.styles';

const CheckoutCancel: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { cart } = useCart();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(location.search);
  const sessionId = searchParams.get('session_id');
  const reason = searchParams.get('reason') || 'user_cancelled';
  const step = searchParams.get('step') || 'unknown';
  const cartItems = cart?.items || [];
  const subtotal = cartItems.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (item.quantity || 0), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  const sessionCount = cartItems.reduce((sum: number, item: any) => {
    const itemSessions = item.storefrontItem?.sessions || item.storefrontItem?.totalSessions || item.sessions || item.totalSessions || 0;
    return sum + itemSessions * (item.quantity || 0);
  }, 0);

  useEffect(() => {
    logger.log('[CheckoutCancel] Checkout cancelled:', {
      sessionId,
      reason,
      step,
      userId: user?.id,
      cartItems: cart?.itemCount || 0,
      timestamp: new Date().toISOString(),
    });
  }, [sessionId, reason, step, user, cart]);

  const handleReturnToCart = useCallback(() => {
    if (cart && cart.items && cart.items.length > 0) {
      navigate('/store?openCart=true');
      return;
    }

    navigate('/store');
  }, [navigate, cart]);

  const handleRetryCheckout = useCallback(() => {
    if (cart && cart.items && cart.items.length > 0) {
      navigate('/store?openCart=true&retryCheckout=true');
      return;
    }

    toast({
      title: 'Cart is Empty',
      description: 'Please add items to your cart before checkout.',
      variant: 'destructive',
      duration: 5000,
    });
    navigate('/store');
  }, [navigate, cart, toast]);

  const handleGoHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleContactSupport = useCallback(() => {
    navigate('/contact');
  }, [navigate]);

  const handleViewFAQ = useCallback(() => {
    window.open('https://help.sswanstudios.com/checkout-issues', '_blank');
  }, []);

  const actionCards = [
    {
      icon: <ShoppingCart size={24} aria-hidden="true" />,
      title: 'Return to Cart',
      description: 'Review your items and try checkout again',
      action: handleReturnToCart,
    },
    {
      icon: <RefreshCw size={24} aria-hidden="true" />,
      title: 'Retry Checkout',
      description: 'Restart the payment process with your current cart',
      action: handleRetryCheckout,
    },
    {
      icon: <MessageCircle size={24} aria-hidden="true" />,
      title: 'Contact Support',
      description: 'Get help if you encountered technical issues',
      action: handleContactSupport,
    },
    {
      icon: <HelpCircle size={24} aria-hidden="true" />,
      title: 'View Help',
      description: 'Common checkout questions and solutions',
      action: handleViewFAQ,
    },
  ];

  return (
    <CancelPageContainer>
      <LogoContainer
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <img src={logoImg} alt="Swan Studios" />
      </LogoContainer>

      <ContentContainer>
        <CancelCard
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <CancelContent>
            <CancelIcon
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <CreditCard size={34} aria-hidden="true" />
            </CancelIcon>

            <CancelTitle>Checkout Cancelled</CancelTitle>
            <CancelSubtitle>No worries. Your cart items are still saved.</CancelSubtitle>
            <CancelMessage>
              Your payment was not processed and no charges were made to your account.
              You can return to your cart anytime to complete your purchase.
            </CancelMessage>

            {cart && cart.items && cart.items.length > 0 && (
              <OrderSummaryMotion
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <OrderReviewStep
                  cart={cart}
                  subtotal={subtotal}
                  tax={tax}
                  total={total}
                  sessionCount={sessionCount}
                  showDetailedBreakdown={false}
                  compact={true}
                />
              </OrderSummaryMotion>
            )}

            <PrimaryActions>
              <ActionButton
                $variant="primary"
                type="button"
                onClick={handleReturnToCart}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeft size={18} aria-hidden="true" />
                Return to Cart
              </ActionButton>

              <ActionButton
                $variant="secondary"
                type="button"
                onClick={handleGoHome}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Go to Home
              </ActionButton>
            </PrimaryActions>

            <ActionGrid>
              {actionCards.map((card, index) => (
                <ActionCard
                  key={card.title}
                  type="button"
                  onClick={card.action}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <ActionIcon>{card.icon}</ActionIcon>
                  <ActionTitle>{card.title}</ActionTitle>
                  <ActionDescription>{card.description}</ActionDescription>
                </ActionCard>
              ))}
            </ActionGrid>

            <HelpSection
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              <HelpTitle>
                <HelpCircle size={16} aria-hidden="true" />
                Need Help?
              </HelpTitle>
              <HelpText>
                If you encountered any issues during checkout or have questions about our training packages,
                our support team is here to help. We typically respond within 24 hours.
              </HelpText>
            </HelpSection>
          </CancelContent>
        </CancelCard>
      </ContentContainer>
    </CancelPageContainer>
  );
};

export default CheckoutCancel;
