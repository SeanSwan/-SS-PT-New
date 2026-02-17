/**
 * minimal-layout.tsx
 * Simple layout for authentication pages and minimal UI sections
 * Combines functionality of both previous implementations
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { ScrollToTop } from '../../common';

const MinimalLayoutWrapper = styled.div`
  height: 100%;
  min-height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #0a0a1a;
  overflow: hidden;
`;

interface MinimalLayoutProps {
  children?: React.ReactNode;
  hideWrapper?: boolean;
}

/**
 * Minimal Layout Component
 * Provides a simple wrapper with theme support
 * Renders both direct children and nested routes via Outlet
 */
const MinimalLayout: React.FC<MinimalLayoutProps> = ({ children, hideWrapper = false }) => {
  if (hideWrapper) {
    return (
      <>
        {children}
        <Outlet />
      </>
    );
  }

  return (
    <MinimalLayoutWrapper>
      {children}
      <Outlet />
      <ScrollToTop
        theme="purple"
        size="small"
        scrollThreshold={300}
        onScrollToTop={() => {
          console.log('Minimal layout scroll to top clicked');
        }}
      />
    </MinimalLayoutWrapper>
  );
};

export default MinimalLayout;
