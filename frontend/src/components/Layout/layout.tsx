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

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-top: 56px; /* Account for fixed header height */
  
  @media (max-width: 480px) {
    margin-top: 56px; /* Header height on mobile */
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

  const isDashboardRoute =
    location.pathname.startsWith('/user-dashboard') ||
    location.pathname.startsWith('/client-dashboard') ||
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/trainer-dashboard');
  
  return (
    <MainContainer>
      <Header />
      
      <ContentWrapper>
        <Content>
          {children}
        </Content>
      </ContentWrapper>
      
      {!isDashboardRoute && <Footer />}
    </MainContainer>
  );
};

export default Layout;
