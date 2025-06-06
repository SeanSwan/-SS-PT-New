// src/components/Layout/layout.tsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Header from '../Header/header'; // Adjust the import path based on your project structure
import Footer from '../Footer/Footer';
import { SimpleScrollToTop, ConstructionBannerContainer } from '../common';
import FloatingSessionWidget from '../SessionDashboard/FloatingSessionWidget';
import { useAuth } from '../../context/AuthContext';

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
  const { isAuthenticated, user } = useAuth();
  
  // Construction banner state management
  const [showConstructionBanner, setShowConstructionBanner] = useState(true);
  
  // Remember user preference to hide banner
  useEffect(() => {
    const bannerClosed = sessionStorage.getItem('construction-banner-closed');
    if (bannerClosed === 'true') {
      setShowConstructionBanner(false);
    }
  }, []);
  
  const handleCloseBanner = () => {
    setShowConstructionBanner(false);
    sessionStorage.setItem('construction-banner-closed', 'true');
  };
  
  return (
    <MainContainer>
      <Header />
      
      <ContentWrapper>
        {/* Construction Banner - Right below fixed header */}
        <ConstructionBannerContainer 
          isVisible={showConstructionBanner}
          onClose={handleCloseBanner}
          showCloseButton={true}
          customMessage="SwanStudios Platform Enhanced - Nearly Complete"
          customSubMessage="We're putting the finishing touches on your upgraded experience"
        />
        
        <Content>
          {children}
        </Content>
      </ContentWrapper>
      
      <Footer />
      
      {/* Production scroll-to-top button - appears when scrolling down */}
      <SimpleScrollToTop scrollThreshold={300} />
      
      {/* Floating Session Widget - only for authenticated users */}
      {isAuthenticated && user && (
        <FloatingSessionWidget 
          onOpenDashboard={() => {
            // Navigate to appropriate dashboard based on role
            const dashboardRoute = user.role === 'admin' ? '/dashboard' :
                                 user.role === 'trainer' ? '/trainer-dashboard' :
                                 user.role === 'client' ? '/client-dashboard' :
                                 '/user-dashboard';
            window.location.href = dashboardRoute;
          }}
        />
      )}
    </MainContainer>
  );
};

export default Layout;