/**
 * minimal-layout.tsx
 * Simple layout for authentication pages and minimal UI sections
 * Combines functionality of both previous implementations
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { ScrollToTop } from '../../common';

// Styled component for minimal layout wrapper
const MinimalLayoutWrapper = styled('div')(({ theme }) => ({
  height: '100%',
  minHeight: '100vh',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
  overflow: 'hidden'
}));

interface MinimalLayoutProps {
  children?: React.ReactNode;
  hideWrapper?: boolean; // Optional prop to render without the wrapper (like the index.js version)
}

/**
 * Minimal Layout Component
 * Provides a simple wrapper with theme support
 * Renders both direct children and nested routes via Outlet
 */
const MinimalLayout: React.FC<MinimalLayoutProps> = ({ children, hideWrapper = false }) => {
  // If hideWrapper is true, just render the Outlet directly (like the simple version)
  if (hideWrapper) {
    return (
      <>
        {children}
        <Outlet />
      </>
    );
  }
  
  // Otherwise render with the styled wrapper
  return (
    <MinimalLayoutWrapper>
      {/* Output child components if provided */}
      {children}
      
      {/* Outlet for nested routes */}
      <Outlet />
      
      {/* Scroll to top button for minimal layout */}
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