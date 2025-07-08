/**
 * FloatingCart.tsx - Decomposed Floating Cart Component
 * ================================================================
 * Extracted from monolithic GalaxyThemedStoreFront.tsx
 * 
 * Responsibilities:
 * - Floating cart button display
 * - Cart count indicator
 * - Pulsing animation states
 * - Cart toggle functionality
 * 
 * Performance Optimized:
 * - Memoized to prevent unnecessary re-renders
 * - Stable animation references
 * - Efficient state management
 */

import React, { memo } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// Galaxy Theme Constants
const GALAXY_COLORS = {
  cosmicPurple: '#7851a9',
  cyberCyan: '#00ffff',
  warningRed: '#ff416c',
  nebulaPurple: '#1e1e3f'
};

// Component Props Interface
interface FloatingCartProps {
  isAuthenticated: boolean;
  cartItemCount: number;
  showPulse: boolean;
  onToggleCart: () => void;
}

// AAA 7-STAR ANIMATION KEYFRAMES
const stellarPulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 25px rgba(0, 255, 255, 0.4), 0 0 50px rgba(120, 81, 169, 0.3);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 40px rgba(0, 255, 255, 0.7), 0 0 80px rgba(120, 81, 169, 0.5);
    transform: scale(1.05);
  }
`;

const cartBounce = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

// AAA 7-STAR STYLED COMPONENTS
const CartButton = styled(motion.button)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 75px;
  height: 75px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${GALAXY_COLORS.cosmicPurple}, ${GALAXY_COLORS.cyberCyan});
  border: 3px solid rgba(0, 255, 255, 0.6);
  color: white;
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.5), 
    0 0 35px rgba(0, 255, 255, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  z-index: 1000;
  transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  backdrop-filter: blur(15px);
  
  /* Professional accessibility */
  &:focus {
    outline: 3px solid rgba(0, 255, 255, 0.6);
    outline-offset: 2px;
  }
  
  &:hover {
    transform: scale(1.2) rotate(5deg);
    box-shadow: 
      0 15px 40px rgba(0, 0, 0, 0.6), 
      0 0 50px rgba(0, 255, 255, 0.7),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    animation: ${stellarPulse} 1.8s ease-in-out infinite;
  }
  
  /* Mobile optimization */
  @media (max-width: 768px) {
    bottom: 1.5rem;
    right: 1.5rem;
    width: 70px;
    height: 70px;
    font-size: 1.8rem;
  }
`;

const PulsingCartButton = styled(CartButton)`
  animation: ${stellarPulse} 2.5s infinite;
  box-shadow: 
    0 12px 35px rgba(0, 0, 0, 0.5), 
    0 0 40px rgba(0, 255, 255, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, #00ffff, #7851a9, #00ffff);
    border-radius: 50%;
    z-index: -1;
    animation: ${stellarPulse} 2.5s infinite;
    opacity: 0.8;
  }
`;

const CartCount = styled.span`
  position: absolute;
  top: -10px;
  right: -10px;
  background: linear-gradient(135deg, ${GALAXY_COLORS.warningRed}, #ff6b9d);
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 700;
  border: 3px solid rgba(10, 10, 26, 0.9);
  box-shadow: 
    0 0 15px rgba(255, 65, 108, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  animation: ${cartBounce} 0.6s ease-in-out;
  
  /* Ensure readability */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  
  @media (max-width: 768px) {
    width: 28px;
    height: 28px;
    font-size: 0.85rem;
    top: -8px;
    right: -8px;
  }
`;

// AAA 7-STAR ANIMATION VARIANTS
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
                key={cartItemCount} // Re-animate when count changes
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
                key={cartItemCount} // Re-animate when count changes
              >
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </CartCount>
            )}
          </AnimatePresence>
        </CartButton>
      )}
    </AnimatePresence>
  );
});

FloatingCart.displayName = 'FloatingCart';

export default FloatingCart;