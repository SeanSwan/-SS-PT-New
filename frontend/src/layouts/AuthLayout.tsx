/**
 * AuthLayout.tsx
 * =============
 * 
 * Specialized layout for authentication pages (login, signup, password reset)
 * Features a compact footer to maximize space for the auth form.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import CompactFooter from '../components/Footer/CompactFooter';

// Styled container for auth pages.
// min-height + document scroll — the previous height:100vh + overflow:hidden
// + inner overflow-y:auto made the first screen a paying customer sees a
// nested scroll trap (and fought the iOS keyboard/URL bar). The container
// subtracts the fixed header so form + compact footer fit one viewport.
const AuthLayoutContainer = styled.div`
  min-height: calc(100dvh - var(--header-height, 64px) - env(safe-area-inset-top, 0px));
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
  position: relative;
  z-index: 1;
`;

// Content area that takes most of the space (no inner scroller — the
// document owns scrolling)
const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
  padding-top: 10px;
  padding-bottom: 20px;
`;

interface AuthLayoutProps {
  children?: React.ReactNode;
}

/**
 * AuthLayout Component
 * 
 * Special layout for authentication pages with a compact footer
 * to minimize distraction and vertical space consumption.
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <AuthLayoutContainer className="auth-layout-container">
      <ContentArea className="auth-layout-content">
        {/* Content can be provided as children or via outlet */}
        {children || <Outlet />}
      </ContentArea>
      
      {/* Compact footer specifically for auth pages */}
      <CompactFooter />
    </AuthLayoutContainer>
  );
};

export default AuthLayout;