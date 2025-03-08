/**
 * MinimalLayout.tsx
 * Simple layout for authentication pages
 */
import React from 'react';
import { Outlet } from 'react-router-dom';
import { styled } from '@mui/material/styles';

// Styled component for minimal layout wrapper
const MinimalLayoutWrapper = styled('div')(({ theme }) => ({
  height: '100%',
  minHeight: '100vh',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default
}));

// Minimal layout component with proper TypeScript types
const MinimalLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <MinimalLayoutWrapper>
      {/* Output child components if provided */}
      {children}
      
      {/* Outlet for nested routes */}
      <Outlet />
    </MinimalLayoutWrapper>
  );
};

export default MinimalLayout;