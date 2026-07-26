// src/components/Layout/layout.tsx
import React from 'react';
import styled from 'styled-components';
import { useLocation } from 'react-router-dom';
import Header from '../Header/header'; // FIXED: Import EnhancedHeader as Header
import Footer from '../Footer/Footer';

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const ContentWrapper = styled.div<{ $withHeader: boolean }>`
  display: flex;
  flex-direction: column;
  flex: 1;
  /* Offset for the fixed header — MUST use the shared token. A hardcoded
     56px here vs the real 64px header hid the top 8px of every page. */
  margin-top: ({ $withHeader }) =>
    $withHeader ? 'calc(var(--header-height, 64px) + env(safe-area-inset-top, 0px))' : '0';
`;

const SkipLink = styled.a`
  position: fixed;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 10000;
  transform: translateY(-160%);
  padding: 0.7rem 1rem;
  border-radius: 0.5rem;
  color: var(--text-primary, #E0ECF4);
  background: var(--bg-base, #030712);
  text-decoration: none;
  transition: transform 0.2s ease;

  &:focus {
    transform: translateY(0);
    outline: 3px solid var(--focus-ring, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
const Content = styled.main`
  flex: 1;
`;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const isDesignPreviewRoute = location.pathname.startsWith('/design-previews/');

  const isDashboardRoute =
    location.pathname.startsWith('/user-dashboard') ||
    location.pathname.startsWith('/client-dashboard') ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/trainer-dashboard');

  // Auth pages render their own CompactFooter inside AuthLayout — stacking
  // the full marketing Footer under them produced a double footer on the
  // first screen every new customer sees.
  const isAuthRoute =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/signup');

  return (
    <MainContainer>
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      {!isDesignPreviewRoute && <Header />}

      <ContentWrapper $withHeader={!isDesignPreviewRoute} data-swan-app-content-wrapper>
        <Content id="main-content" tabIndex={-1}>
          {children}
        </Content>
      </ContentWrapper>

      {!isDashboardRoute && !isAuthRoute && !isDesignPreviewRoute && <Footer />}
    </MainContainer>
  );
};

export default Layout;
