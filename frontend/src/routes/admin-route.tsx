/**
 * admin-route.tsx
 * Protected route component for admin-only access
 */
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Type for the component props
interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminLoadingIndicator Component
 * Admin-themed loading spinner with message
 */
const AdminLoadingIndicator: React.FC = () => (
  <div className="admin-loading-container" style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)',
    color: '#fff'
  }}>
    <div style={{
      border: '5px solid rgba(120, 81, 169, 0.1)',
      borderRadius: '50%',
      borderTop: '5px solid #7851a9',
      width: '50px',
      height: '50px',
      animation: 'spin 1s linear infinite',
      marginBottom: '15px'
    }} />
    <div style={{ fontWeight: 'bold' }}>Verifying admin credentials...</div>
    <div style={{ 
      marginTop: '10px',
      fontSize: '0.9rem',
      opacity: 0.8,
      maxWidth: '400px',
      textAlign: 'center',
      padding: '0 20px'
    }}>
      This area is restricted to administrators only. Validating your access rights.
    </div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/**
 * AdminRoute Component
 * Ensures only users with admin role can access admin routes
 * 
 * Enhanced with:
 * - Direct role check instead of complex validation
 * - Simplified access flow
 * - Improved debugging for admin access
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  // Debug output for troubleshooting
  useEffect(() => {
    // Log detailed information about the user attempting to access the admin route
    console.log('ADMIN ACCESS DEBUG INFO:', {
      userExists: !!user,
      userRole: user?.role || 'none',
      isLoading,
      path: location.pathname,
      timestamp: new Date().toISOString()
    });
    
    // For ogpswan user specifically, force admin role recognition
    if (user?.email === 'ogpswan@gmail.com' || user?.email === 'ogpswan') {
      console.log('Special user detected:', user.email);
    }
  }, [user, isLoading, location.pathname]);
  
  // Show loading state while authentication state is being determined
  if (isLoading) {
    console.log("Admin route: Loading authentication state...");
    return <AdminLoadingIndicator />;
  }
  
  // Redirect if user is not logged in
  if (!user) {
    console.error("Admin route blocked: No user logged in - redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  // SIMPLIFIED ROLE CHECK
  // Redirect if user role is not admin (strict equality check)
  if (user.role !== 'admin') {
    console.log(`Admin route blocked: User role is "${user.role}", not "admin"`);
    return <Navigate to="/unauthorized" replace />;
  }
  
  // User is authenticated as admin - allow access
  console.log(`Admin access granted to: ${user.firstName} ${user.lastName} (${user.role})`);
  
  // Return the admin dashboard component
  return <>{children}</>;
};

export default AdminRoute;