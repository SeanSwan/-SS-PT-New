import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * EMERGENCY ADMIN ROUTE - Hard-coded version
 * This is a completely simplified version that avoids all React hooks issues
 */
const AdminRoute: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // In development mode, always render children - no hooks, no checks
  if (process.env.NODE_ENV === 'development') {
    console.log('[EMERGENCY] Development mode - bypassing all admin auth checks');
    // Set bypass flag for other components
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bypass_admin_verification', 'true');
      localStorage.setItem('admin_emergency_mode', 'true');
    }
    return <>{children}</>;
  }
  
  // For production, we need to check for admin status
  // This code should never run in development mode
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user && user.role === 'admin') {
      return <>{children}</>;
    }
    // If not admin, redirect to login
    return <Navigate to="/login" replace />;
  } catch (e) {
    console.error('Error in admin route:', e);
    return <Navigate to="/login" replace />;
  }
};

export default AdminRoute;
