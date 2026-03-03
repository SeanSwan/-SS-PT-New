/**
 * header.tsx - REFORGED Galaxy-Themed Header Component
 * Clean orchestrator using extracted child components and centralized logic
 * Apple Phone-level architecture with "Galaxy-Swan" aesthetic preservation
 */
import React, { memo } from "react";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";

// Import the centralized state hook (The Brain)
import { useHeaderState } from "./useHeaderState";

// Import child components (The Limbs)
import Logo from "./components/Logo";
import NavigationLinks from "./components/NavigationLinks";
import ActionIcons from "./components/ActionIcons";
import MobileMenu from "./components/MobileMenu";

// Import remaining dependencies
import ShoppingCart from "../ShoppingCart/ShoppingCart";
import Debug from '../Debug/Debug';
import { UserSwitcher } from '../UserSwitcher';

// ===================== Galaxy Animation Keyframes =====================
const nebulaPulse = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

// ===================== Main Container Styled Components =====================
const HeaderContainer = styled(motion.header)<{
  $isScrolled: boolean;
  $isVisible: boolean;
  $isMobile: boolean;
}>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 0 ${({ $isMobile }) => $isMobile ? '16px' : '24px'};
  height: ${({ $isMobile }) => $isMobile ? '60px' : '64px'};
  display: flex;
  justify-content: space-between;
  align-items: center;

  /* Theme-aware background using CSS variables */
  background: ${({ $isScrolled }) =>
    $isScrolled
      ? `color-mix(in srgb, var(--bg-base) 95%, transparent)`
      : `color-mix(in srgb, var(--bg-base) 85%, transparent)`
  };

  /* Enhanced backdrop effects */
  backdrop-filter: ${({ $isScrolled }) => $isScrolled ? 'blur(20px) saturate(1.8)' : 'blur(12px) saturate(1.2)'};

  /* Theme-aware border */
  border-bottom: 1px solid var(--border-soft);
  box-shadow: ${({ $isScrolled }) =>
    $isScrolled
      ? `0 8px 32px rgba(0, 0, 0, 0.25),
         0 0 24px color-mix(in srgb, var(--accent-primary) 15%, transparent),
         inset 0 1px 0 rgba(255, 255, 255, 0.1)`
      : `0 4px 16px rgba(0, 0, 0, 0.15),
         0 0 12px color-mix(in srgb, var(--accent-primary) 8%, transparent),
         inset 0 1px 0 rgba(255, 255, 255, 0.05)`
  };

  /* Smooth transitions */
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(${({ $isVisible }) => $isVisible ? '0' : '-100%'});

  /* Mobile optimizations */
  @media (max-width: 768px) {
    padding: 0 16px;
    height: 60px;
  }

  @media (max-width: 480px) {
    padding: 0 12px;
    height: 56px;
  }

  /* Add subtle nebula effect with better contrast */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg,
      color-mix(in srgb, var(--accent-primary) 4%, transparent) 0%,
      transparent 25%,
      color-mix(in srgb, var(--accent-secondary, #ff4081) 3%, transparent) 50%,
      transparent 75%,
      color-mix(in srgb, var(--accent-primary) 4%, transparent) 100%
    );
    background-size: 400% 400%;
    animation: ${nebulaPulse} 8s ease-in-out infinite;
    pointer-events: none;
    z-index: -1;
  }
`;

const HeaderContent = styled.div`
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  width: 100%; 
  max-width: 1400px; 
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

// ===================== REFORGED HEADER COMPONENT =====================
const ReforgedGalaxyHeader: React.FC = memo(() => {
  // The Brain: Get all state and logic from the centralized hook
  const headerState = useHeaderState();
  
  return (
    <>
      {/* Main Galaxy Header Container */}
      <HeaderContainer
        ref={headerState.headerRef}
        $isScrolled={headerState.isScrolled}
        $isVisible={headerState.isVisible}
        $isMobile={headerState.isMobile}
        initial="hidden"
        animate="visible"
        variants={headerState.containerVariants}
        role="banner"
        aria-label="Main navigation"
      >
        <HeaderContent>
          {/* Logo Component */}
          <Logo 
            onLogoClick={headerState.navigateToHome}
            variants={headerState.itemVariants}
          />
          
          {/* Desktop Navigation Links Component */}
          <NavigationLinks 
            user={headerState.user}
            isActive={headerState.isActive}
            itemVariants={headerState.itemVariants}
            containerVariants={headerState.containerVariants}
          />

          {/* Action Icons Component */}
          <ActionIcons 
            user={headerState.user}
            cart={headerState.cart}
            isMobile={headerState.isMobile}
            onCartOpen={headerState.openCart}
            onLogout={headerState.handleLogout}
            itemVariants={headerState.itemVariants}
            containerVariants={headerState.containerVariants}
          />

          {/* Mobile Menu Component */}
          <MobileMenu 
            isOpen={headerState.mobileMenuOpen}
            onToggle={headerState.toggleMobileMenu}
            user={headerState.user}
            isActive={headerState.isActive}
            isRoleEnabled={headerState.isRoleEnabled}
            onLogout={headerState.handleLogout}
          />
        </HeaderContent>
      </HeaderContainer>

      {/* Shopping Cart Modal */}
      {headerState.cartOpen && (
        <ShoppingCart onClose={headerState.closeCart} />
      )}
      
      {/* Development Tools */}
      <Debug />
      <UserSwitcher />
    </>
  );
});

// Set display name for debugging
ReforgedGalaxyHeader.displayName = 'ReforgedGalaxyHeader';

export default ReforgedGalaxyHeader;