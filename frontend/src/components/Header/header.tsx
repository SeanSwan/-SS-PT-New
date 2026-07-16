/**
 * header.tsx - REFORGED Galaxy-Themed Header Component
 * Clean orchestrator using extracted child components and centralized logic
 * Apple Phone-level architecture with "Crystalline Swan" aesthetic preservation
 */
import React, { memo, Suspense } from "react";
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

const Debug = import.meta.env.DEV
  ? React.lazy(() => import('../Debug/Debug'))
  : null;
const UserSwitcher = import.meta.env.DEV
  ? React.lazy(() => import('../UserSwitcher').then((module) => ({ default: module.UserSwitcher })))
  : null;

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
  z-index: var(--z-header, 1250);
  padding: 0 ${({ $isMobile }) => $isMobile ? '16px' : '24px'};
  /* Height comes from the shared --header-height token (tokens.css) so the
     layout content offset can never drift out of sync with the header again.
     safe-area padding keeps the notch/status bar from overlapping the logo
     on installed/notched phones (index.html sets viewport-fit=cover). */
  height: calc(var(--header-height, 64px) + env(safe-area-inset-top, 0px));
  padding-top: env(safe-area-inset-top, 0px);
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

  /* Smooth transitions — explicit properties only. 'transition: all' animated
     backdrop-filter/box-shadow on a full-width blur layer during scroll. */
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              background 0.4s ease,
              box-shadow 0.4s ease;
  transform: translateY(${({ $isVisible }) => $isVisible ? '0' : '-100%'});

  /* Mobile optimizations (heights come from the --header-height token) */
  @media (max-width: 768px) {
    padding: env(safe-area-inset-top, 0px) 16px 0;
  }

  @media (max-width: 480px) {
    padding: env(safe-area-inset-top, 0px) 12px 0;
  }

  @media (max-width: 375px) {
    padding: env(safe-area-inset-top, 0px) 8px 0;
  }

  /* Ultra-wide scaling */
  @media (min-width: 2560px) {
    padding: env(safe-area-inset-top, 0px) 48px 0;
  }

  @media (min-width: 3840px) {
    padding: env(safe-area-inset-top, 0px) 64px 0;
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
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 3%, transparent) 50%,
      transparent 75%,
      color-mix(in srgb, var(--accent-primary) 4%, transparent) 100%
    );
    background-size: 400% 400%;
    pointer-events: none;
    z-index: -1;

    /* Desktop-only: an infinite gradient animation inside a backdrop-filter
       layer forces continuous repaints of the blur — a gummy-scroll tax on
       phones. Static gradient on mobile, ambient motion on desktop. */
    @media (min-width: 1025px) {
      animation: ${nebulaPulse} 8s ease-in-out infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
`;

const HeaderContent = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  column-gap: clamp(0.75rem, 1.1vw, 1.25rem);
  align-items: center;
  width: 100%;
  max-width: 1800px;
  margin: 0 auto;
  position: relative;
  z-index: 2;

  & > * {
    min-width: 0;
  }

  @media (min-width: 2560px) {
    max-width: 2400px;
  }

  @media (min-width: 3840px) {
    max-width: 3200px;
  }

  @media (max-width: 768px) {
    display: flex;
    justify-content: space-between;
  }
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
        data-swan-app-header
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
      {Debug && UserSwitcher && (
        <Suspense fallback={null}>
          <Debug />
          <UserSwitcher />
        </Suspense>
      )}
    </>
  );
});

// Set display name for debugging
ReforgedGalaxyHeader.displayName = 'ReforgedGalaxyHeader';

export default ReforgedGalaxyHeader;
