/**
 * FloatingCart.tsx - Floating Cart Component (EW Theme v2.0)
 * ================================================================
 * Ethereal Wilderness token migration. Cart FAB with pulse states.
 *
 * Responsibilities:
 * - Floating cart button display
 * - Cart count indicator
 * - Pulsing animation states
 * - Cart toggle functionality
 *
 * Performance Optimized:
 * - Memoized to prevent unnecessary re-renders
 * - Reduced-motion gated animations
 */

import React, { memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';

// EW Design Tokens
const T = {
  bg: '#0a0a1a',
  surface: 'rgba(15, 25, 35, 0.92)',
  primary: '#00D4AA',
  secondary: '#7851A9',
  accent: '#48E8C8',
  text: '#F0F8FF',
  textSecondary: '#8AA8B8',
  warningRed: '#ff416c',
} as const;

const noMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition: none !important;
  }
`;

// Component Props Interface
interface FloatingCartProps {
  isAuthenticated: boolean;
  cartItemCount: number;
  showPulse: boolean;
  onToggleCart: () => void;
}

// Keyframe animations
const stellarPulse = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(0, 212, 170, 0.3), 0 0 40px rgba(120, 81, 169, 0.2);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 30px rgba(0, 212, 170, 0.5), 0 0 60px rgba(120, 81, 169, 0.35);
    transform: scale(1.05);
  }
`;

const cartBounce = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

// Styled Components
const CartButton = styled(motion.button)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${T.secondary}, ${T.primary});
  border: 1px solid rgba(0, 212, 170, 0.3);
  color: white;
  font-size: 1.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 8px 25px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(0, 212, 170, 0.3);
  z-index: 1000;
  backdrop-filter: blur(15px);
  ${noMotion}

  @media (prefers-reduced-motion: no-preference) {
    transition: all 0.3s ease;
  }

  &:focus-visible {
    outline: 2px solid ${T.primary};
    outline-offset: 3px;
  }

  @media (hover: hover) and (prefers-reduced-motion: no-preference) {
    &:hover {
      transform: scale(1.1);
      border-color: rgba(0, 212, 170, 0.5);
      box-shadow:
        0 12px 35px rgba(0, 0, 0, 0.5),
        0 0 30px rgba(0, 212, 170, 0.4);
    }
  }

  @media (max-width: 768px) {
    bottom: 1.5rem;
    right: 1.5rem;
    width: 60px;
    height: 60px;
    font-size: 1.5rem;
  }
`;

const PulsingCartButton = styled(CartButton)`
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.4),
    0 0 25px rgba(0, 212, 170, 0.4);
  ${noMotion}

  @media (prefers-reduced-motion: no-preference) {
    animation: ${stellarPulse} 2.5s infinite;
  }

  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, ${T.primary}, ${T.secondary}, ${T.primary});
    border-radius: 50%;
    z-index: -1;
    opacity: 0.6;
    ${noMotion}

    @media (prefers-reduced-motion: no-preference) {
      animation: ${stellarPulse} 2.5s infinite;
    }
  }
`;

const CartCount = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, ${T.warningRed}, #ff6b9d);
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  border: 2px solid ${T.bg};
  box-shadow: 0 2px 8px rgba(255, 65, 108, 0.5);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  ${noMotion}

  @media (prefers-reduced-motion: no-preference) {
    animation: ${cartBounce} 0.6s ease-in-out;
  }

  @media (max-width: 768px) {
    width: 24px;
    height: 24px;
    font-size: 0.75rem;
    top: -6px;
    right: -6px;
  }
`;

// Animation variants
const cartButtonVariants = {
  initial: {
    scale: 0.6,
    opacity: 0,
    rotate: -180
  },
  animate: {
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      duration: 0.6
    }
  },
  exit: {
    scale: 0.6,
    opacity: 0,
    rotate: 180,
    transition: {
      duration: 0.3,
      ease: [0.55, 0.06, 0.68, 0.19]
    }
  },
  tap: {
    scale: 0.9,
    transition: { duration: 0.1 }
  }
};

const countVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 600,
      damping: 20,
      delay: 0.2
    }
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Memoized FloatingCart Component
const FloatingCart: React.FC<FloatingCartProps> = memo(({
  isAuthenticated,
  cartItemCount,
  showPulse,
  onToggleCart
}) => {
  // Don't render if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const handleCartClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Add haptic feedback for supported devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    onToggleCart();
  };

  const cartLabel = `View Cart (${cartItemCount || 0} items)`;

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        {showPulse ? (
          <PulsingCartButton
            className="cart-follow-button"
            key="pulsing-cart"
            onClick={handleCartClick}
            variants={cartButtonVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            whileTap="tap"
            aria-label={cartLabel}
            title={cartLabel}
          >
            🛒
            <AnimatePresence>
              {cartItemCount > 0 && (
                <CartCount
                  as={motion.span}
                  variants={countVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  key={cartItemCount}
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </CartCount>
              )}
            </AnimatePresence>
          </PulsingCartButton>
        ) : (
          <CartButton
            className="cart-follow-button"
            key="static-cart"
            onClick={handleCartClick}
            variants={cartButtonVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            whileTap="tap"
            aria-label={cartLabel}
            title={cartLabel}
          >
            🛒
            <AnimatePresence>
              {cartItemCount > 0 && (
                <CartCount
                  as={motion.span}
                  variants={countVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  key={cartItemCount}
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </CartCount>
              )}
            </AnimatePresence>
          </CartButton>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
});

FloatingCart.displayName = 'FloatingCart';

export default FloatingCart;