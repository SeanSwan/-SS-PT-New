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

// Styled container for auth pages
const AuthLayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0a0a1a, #1e1e3f);
  overflow: hidden;
  max-height: 100vh;
  position: relative;
  z-index: 1;
`;

// Content area that takes most of the space
const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
  height: calc(100vh - 40px); /* 40px for compact footer */
  position: relative;
  z-index: 2;
  padding-top: 10px; /* Add padding at the top */
  padding-bottom: 20px; /* Add padding to ensure content doesn't touch footer */
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
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