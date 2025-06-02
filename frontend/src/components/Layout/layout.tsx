// src/components/Layout/layout.tsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Header from '../Header/header'; // Adjust the import path based on your project structure
import Footer from '../Footer/Footer';
import { ScrollToTop, ConstructionBannerContainer } from '../common';

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Content = styled.main`
  flex: 1;
`;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
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
      
      {/* Construction Banner - Between Header and Content */}
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
      <Footer />
      <ScrollToTop 
        theme="cosmic"
        size="medium"
        scrollThreshold={400}
        onScrollToTop={() => {
          // Optional: Add analytics tracking here
          console.log('Scroll to top clicked');
        }}
      />
    </MainContainer>
  );
};

export default Layout;