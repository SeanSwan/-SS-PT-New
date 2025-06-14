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

// Keyframe animations
const stellarPulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), 0 0 40px rgba(120, 81, 169, 0.2);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.6), 0 0 60px rgba(120, 81, 169, 0.4);
    transform: scale(1.02);
  }
`;

// Styled Components
const CartButton = styled(motion.button)`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${GALAXY_COLORS.cosmicPurple}, ${GALAXY_COLORS.cyberCyan});
  border: 3px solid rgba(0, 255, 255, 0.6);
  color: white;
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 
    0 8px 25px rgba(0, 0, 0, 0.4), 
    0 0 30px rgba(0, 255, 255, 0.4);
  z-index: 1000;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    transform: scale(1.15);
    box-shadow: 
      0 12px 35px rgba(0, 0, 0, 0.5), 
      0 0 40px rgba(0, 255, 255, 0.6);
    animation: ${stellarPulse} 1.5s ease-in-out infinite;
  }
  
  outline: none;
  &:focus {
    outline: none;
  }
`;

const PulsingCartButton = styled(CartButton)`
  animation: ${stellarPulse} 2s infinite;
  box-shadow: 
    0 8px 25px rgba(0, 0, 0, 0.4), 
    0 0 30px rgba(0, 255, 255, 0.6);
`;

const CartCount = styled.span`
  position: absolute;
  top: -8px;
  right: -8px;
  background: ${GALAXY_COLORS.warningRed};
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: bold;
  border: 3px solid rgba(30, 30, 60, 0.8);
  box-shadow: 0 0 10px rgba(255, 65, 108, 0.6);
`;

// Animation variants
const cartButtonVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 }
};

const cartButtonTransition = {
  type: 'spring',
  stiffness: 500,
  damping: 30
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
    onToggleCart();
  };

  const cartLabel = `View Cart (${cartItemCount || 0} items)`;

  return (
    <AnimatePresence>
      {showPulse ? (
        <PulsingCartButton 
          className="cart-follow-button"
          key="pulsing-cart" 
          onClick={handleCartClick}
          variants={cartButtonVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={cartButtonTransition}
          aria-label={cartLabel}
        >
          🛒
          {cartItemCount > 0 && (
            <CartCount>{cartItemCount}</CartCount>
          )}
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
          transition={cartButtonTransition}
          aria-label={cartLabel}
        >
          🛒
          {cartItemCount > 0 && (
            <CartCount>{cartItemCount}</CartCount>
          )}
        </CartButton>
      )}
    </AnimatePresence>
  );
});

FloatingCart.displayName = 'FloatingCart';

export default FloatingCart;