/**
 * MinimalLayout Adapter
 * ====================
 * Acts as an adapter to provide access to the MinimalLayout component
 */

import React from 'react';

// Import the actual MinimalLayout component
import OriginalMinimalLayout from '../components/DashBoard/MinimalLayout.tsx/MinimalLayout';

/**
 * MinimalLayout Adapter Component
 * 
 * This is a simple wrapper/adapter component to fix import path issues
 */
const MinimalLayout: React.FC<{
  children?: React.ReactNode;
  hideWrapper?: boolean;
}> = ({ children, hideWrapper }) => {
  return (
    <OriginalMinimalLayout hideWrapper={hideWrapper}>
      {children}
    </OriginalMinimalLayout>
  );
};

export default MinimalLayout;
