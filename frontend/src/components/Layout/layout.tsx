// src/components/Layout/layout.tsx
import React from 'react';
import styled from 'styled-components';
import Header from '../Header/header'; // Adjust the import path based on your project structure
import Footer from '../Footer/Footer';
import { ScrollToTop } from '../common';

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
  return (
    <MainContainer>
      <Header />
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