// src/layouts/MainLayout/MainContent.tsx
import React from 'react';
import styled from 'styled-components';

// Import UI components
import Breadcrumbs from '../../components/ui/Breadcrumbs';

interface MainContentProps {
  withExternalHeader: boolean;
  drawerOpen: boolean;
  borderRadius: number;
  content: React.ReactNode;
}

const MainWrapper = styled.main<{ $drawerOpen: boolean; $borderRadius: number }>`
  flex-grow: 1;
  width: 100%;
  background-color: #0a0a1a;
  border-radius: ${props => props.$borderRadius}px;
  position: relative;
  box-sizing: border-box;
  transition: width 0.3s ease-out, margin 0.3s ease-out;

  @media (min-width: 960px) {
    width: ${props => props.$drawerOpen ? 'calc(100% - 220px)' : '100%'};
    margin-left: ${props => props.$drawerOpen ? '220px' : '0'};
  }
`;

const InnerWrapper = styled.div<{ $withExternalHeader: boolean }>`
  padding: 0 8px;
  min-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  margin-top: ${props => props.$withExternalHeader ? '0' : '64px'};

  @media (min-width: 600px) {
    padding: 0 16px;
  }

  @media (min-width: 960px) {
    padding: 0 24px;
  }
`;

const ContentBox = styled.div<{ $borderRadius: number }>`
  flex: 1;
  padding: 8px 0;
  background-color: rgba(15, 15, 30, 0.6);
  border-radius: ${props => props.$borderRadius}px;
  overflow: hidden;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
`;

/**
 * MainContent component for the main layout
 * Manages the content area with responsive styling
 */
const MainContent: React.FC<MainContentProps> = ({
  withExternalHeader,
  drawerOpen,
  borderRadius,
  content
}) => {
  return (
    <MainWrapper $drawerOpen={drawerOpen} $borderRadius={borderRadius}>
      <InnerWrapper $withExternalHeader={withExternalHeader}>
        <Breadcrumbs />
        <ContentBox $borderRadius={borderRadius}>
          {content}
        </ContentBox>
      </InnerWrapper>
    </MainWrapper>
  );
};

export default MainContent;
