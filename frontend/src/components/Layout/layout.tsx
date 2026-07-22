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
      {!isDesignPreviewRoute && <Header />}

      <ContentWrapper $withHeader={!isDesignPreviewRoute} data-swan-app-content-wrapper>
        <Content>
          {children}
        </Content>
      </ContentWrapper>

      {!isDashboardRoute && !isAuthRoute && !isDesignPreviewRoute && <Footer />}
    </MainContainer>
  );
};

export default Layout;
