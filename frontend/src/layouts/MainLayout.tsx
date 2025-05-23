// src/layouts/MainLayout.tsx - Temporary adapter component
import React from 'react';

// Import the actual MainLayout component from DashBoard 
import OriginalMainLayout from '../components/DashBoard/MainLayout/main-layout';

/**
 * This is a temporary adapter component to fix the import path issue
 * It simply re-exports the original MainLayout component
 */
const MainLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return <OriginalMainLayout>{children}</OriginalMainLayout>;
};

export default MainLayout;
