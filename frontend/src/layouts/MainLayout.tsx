import React from 'react';
import styled from 'styled-components';
// Assuming MainHeader.tsx has been moved to a more appropriate location
import MainHeader from '../../MainHeader';

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--dark-bg, #0a0e1a);
`;

const Content = styled.main`
  flex: 1;
  /* The padding-top prevents content from being hidden behind the sticky header */
  padding-top: 80px; 
`;

/**
 * This is the primary layout for the application. It includes the
 * main header and renders the page content passed as children.
 */
const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <LayoutContainer>
      <MainHeader />
      <Content>{children}</Content>
    </LayoutContainer>
  );
};

export default MainLayout;
