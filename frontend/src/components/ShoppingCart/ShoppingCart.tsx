/**
 * ShoppingCart.tsx — Crystalline Swan cart modal (canonical, header-mounted)
 * ===========================================================================
 * The purchase-critical cart surface rendered by Header/header.tsx for every
 * authenticated page. Shows cart lines with session math, quantity controls,
 * and routes into the Genesis checkout at /checkout.
 *
 * Architecture:
 * - ShoppingCart.styles.ts — modal chrome (tokens-only, reduced-motion safe)
 * - ShoppingCartItem.tsx  — line-item card
 * - ShoppingCart.motion.ts — variants factory (fade-only under reduced motion)
 *
 * Data: useCart() (CartContext → /api/cart family). No API paths change here.
 */
import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import GlowButton from '../ui/buttons/GlowButton';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import {
  useAdvancedCartInteractions,
  SessionProgressIndicator,
  CelebrationParticles,
  SmartNotifications
} from '../AdvancedCartInteractions';
import { logger } from '@/utils/logger';
import ShoppingCartItem from './ShoppingCartItem';
import ShoppingCartFooter from './ShoppingCartFooter';
import { buildCartMotion, useViewportSize } from './ShoppingCart.motion';
import {
  CartModalOverlay,
  CartModalContent,
  CartHeader,
  CartTitle,
  ModalCloseButton,
  CartBody,
  CartItemsList,
  EmptyCartMessage
} from './ShoppingCart.styles';
import {
  StatusMessage,
  LoaderContainer,
  LoadingSpinner
} from './ShoppingCart.summaryStyles';

interface ShoppingCartProps {
  onClose: () => void;
}

const formatPrice = (price: number | undefined): string =>
  price ? price.toLocaleString() : '0';

const ShoppingCart: React.FC<ShoppingCartProps> = ({ onClose }) => {
  const { cart, loading, error, updateQuantity, removeItem, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const viewport = useViewportSize();
  const prefersReducedMotion = useReducedMotion();
  const modalRef = useRef<HTMLDivElement>(null);

  const {
    celebrations,
    notifications,
    triggerHaptic,
    triggerCelebration,
    showNotification,
    updateSessionProgress
  } = useAdvancedCartInteractions();

  const motionSet = useMemo(
    () => buildCartMotion(viewport.isMobile, !!prefersReducedMotion),
    [viewport.isMobile, prefersReducedMotion]
  );

  const celebrate = useCallback((x: number, y: number, kind: string) => {
    if (!prefersReducedMotion) {
      triggerCelebration(x, y, kind as Parameters<typeof triggerCelebration>[2]);
    }
  }, [prefersReducedMotion, triggerCelebration]);

  const handleUpdateQuantity = useCallback(async (itemId: number, newQuantity: number) => {
    const item = cart?.items.find(i => i.id === itemId);
    if (!item) return;

    const oldQuantity = item.quantity;
    try {
      await updateQuantity(itemId, newQuantity);
      if (newQuantity > oldQuantity) {
        celebrate(window.innerWidth / 2, window.innerHeight / 2, 'add');
        showNotification(
          `Increased ${item.storefrontItem?.name || 'item'} quantity to ${newQuantity}`,
          'success'
        );
      }
      triggerHaptic('light');
    } catch (err) {
      logger.error('Failed to update quantity:', err);
    }
  }, [cart, updateQuantity, celebrate, showNotification, triggerHaptic]);

  const handleRemoveItem = useCallback(async (itemId: number) => {
    const item = cart?.items.find(i => i.id === itemId);
    if (!item) return;

    try {
      await removeItem(itemId);
      celebrate(window.innerWidth / 2, window.innerHeight / 3, 'remove');
      showNotification(
        `Removed ${item.storefrontItem?.name || 'item'} from cart`,
        'info'
      );
      triggerHaptic('medium');
    } catch (err) {
      logger.error('Failed to remove item:', err);
    }
  }, [cart, removeItem, celebrate, showNotification, triggerHaptic]);

  const handleClearCart = useCallback(async () => {
    if (!cart?.items?.length) return;

    const itemCount = cart.items.length;
    try {
      await clearCart();
      showNotification(
        `Cleared ${itemCount} item${itemCount !== 1 ? 's' : ''} from cart`,
        'warning'
      );
      triggerHaptic('heavy');
    } catch (err) {
      logger.error('Failed to clear cart:', err);
    }
  }, [cart, clearCart, showNotification, triggerHaptic]);

  const handleExplorePackages = useCallback(() => {
    onClose();
    navigate('/store');
  }, [onClose, navigate]);

  const handleCheckout = useCallback((): void => {
    if (!cart || cart.items.length === 0) {
      toast({
        title: 'Cart Empty',
        description: 'Please add items to your cart before checkout.',
        variant: 'destructive',
        duration: 5000
      });
      return;
    }

    if (!isAuthenticated || !user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to complete your purchase.',
        variant: 'destructive',
        duration: 5000
      });
      navigate('/login');
      return;
    }

    celebrate(window.innerWidth / 2, window.innerHeight / 2, 'checkout');
    toast({
      title: 'Proceeding to Checkout',
      description: 'Redirecting to secure payment...',
      duration: 2000
    });

    setTimeout(() => {
      onClose();
      navigate('/checkout');
    }, prefersReducedMotion ? 0 : 300);
  }, [cart, isAuthenticated, user, toast, navigate, onClose, celebrate, prefersReducedMotion]);

  useEffect(() => {
    if (cart?.totalSessions) {
      updateSessionProgress(cart.totalSessions);
    }
  }, [cart?.totalSessions, updateSessionProgress]);

  // Escape to close, plus a real focus trap. This dialog declares
  // aria-modal="true", which promises assistive tech that the rest of the page
  // is inert — but Tab used to walk straight out into the page behind it. The
  // cycle below mirrors the working pattern in PricingInquiryModal.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus the dialog on open; restore focus to the opener on close (WCAG 2.4.3)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();
    return () => {
      opener?.focus?.();
    };
  }, []);

  const hasItems = !loading && !error && !!cart && cart.items?.length > 0;

  return (
    <AnimatePresence>
      <CartModalOverlay
        onClick={onClose}
        variants={motionSet.overlay}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <CartModalContent
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
          variants={motionSet.container}
          initial="hidden"
          animate="visible"
          exit="exit"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-title"
        >
          <CartHeader variants={motionSet.header}>
            <CartTitle id="cart-title">
              <ShoppingBag size={26} aria-hidden="true" />
              <span className="title-text">Your Shopping Cart</span>
            </CartTitle>
            <ModalCloseButton onClick={onClose} aria-label="Close cart">
              <X size={20} aria-hidden="true" />
            </ModalCloseButton>
          </CartHeader>

          <CartBody>
            {loading ? (
              <LoaderContainer>
                <LoadingSpinner aria-label="Loading cart" role="status" />
              </LoaderContainer>
            ) : error ? (
              <StatusMessage $isError>{error}</StatusMessage>
            ) : (!cart || cart.items?.length === 0) ? (
              <EmptyCartMessage>
                <span className="empty-icon">
                  <ShoppingBag size={56} aria-hidden="true" />
                </span>
                <h3>Your cart is empty</h3>
                <p>Discover our premium training packages and start your transformation journey.</p>
                <GlowButton
                  text="Explore Packages"
                  theme="cosmic"
                  size="large"
                  onClick={handleExplorePackages}
                />
              </EmptyCartMessage>
            ) : (
              <CartItemsList>
                {cart.totalSessions > 0 && (
                  <SessionProgressIndicator
                    currentSessions={cart.totalSessions}
                    targetSessions={12}
                  />
                )}
                <AnimatePresence>
                  {cart.items.map((item) => (
                    <ShoppingCartItem
                      key={item.id}
                      item={item}
                      variants={motionSet.item}
                      formatPrice={formatPrice}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemoveItem}
                    />
                  ))}
                </AnimatePresence>
              </CartItemsList>
            )}
          </CartBody>

          {hasItems && (
            <ShoppingCartFooter
              total={cart!.total}
              itemCount={cart!.itemCount}
              totalSessions={cart!.totalSessions}
              variants={motionSet.footer}
              formatPrice={formatPrice}
              onClearCart={handleClearCart}
              onCheckout={handleCheckout}
            />
          )}
        </CartModalContent>

        <CelebrationParticles celebrations={celebrations} />
        <SmartNotifications
          notifications={notifications}
          onDismiss={(id) => logger.log('Dismiss notification:', id)}
        />
      </CartModalOverlay>
    </AnimatePresence>
  );
};

export default ShoppingCart;
