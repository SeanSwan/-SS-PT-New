// frontend/src/components/Layout/layout.tsx
import React from 'react';
import styled from 'styled-components';
// Corrected Import: Only import EnhancedHeader
import Header from '../../components/Header/header';
import Footer from '../../components/Footer/Footer';
const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  // Ensure background covers full page, can be adjusted based on theme
  background-color: var(--background-color, #0a0a0a); // Example using a theme variable or default
`;

// Apply padding-top to account for fixed header height
// Adjust height based on EnhancedHeader's actual height + breakpoints
const Content = styled.main`
  flex: 1;
  padding-top: 80px; // Match initial height of EnhancedHeader

  @media (max-width: 480px) {
    padding-top: 70px; // Match EnhancedHeader mobile height
  }

  @media (min-width: 2560px) {
    padding-top: 100px; // Match EnhancedHeader large screen height
  }
`;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <MainContainer>
      {/* Corrected Usage: Use the imported EnhancedHeader */}
      <Header />
      <Content>
        {children}
      </Content>
      <Footer />
    </MainContainer>
  );
};

export default Layout;