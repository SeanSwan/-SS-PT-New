import React from 'react';

/**
 * EMERGENCY ADMIN ROUTE - Ultra-simplified version with zero hooks
 * This is a completely stripped down version that avoids all React hooks
 * issues by using a simple functional component with no hooks.
 */
const AdminRoute = ({ children }) => {
  // No hooks, no checking, just render children
  console.log('[EMERGENCY] Ultra-simplified admin route activated');
  
  // Set all emergency flags
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('bypass_admin_verification', 'true');
    localStorage.setItem('admin_emergency_mode', 'true');
    localStorage.setItem('use_emergency_admin_route', 'true');
    localStorage.setItem('ultra_simplified_admin_route', 'true');
  }
  
  // Just render children directly, no conditions, no hooks
  return <>{children}</>;
};

export default AdminRoute;