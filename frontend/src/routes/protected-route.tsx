/**
 * protected-route.tsx
 * Protected route component for role-based access control
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Type for the component props
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

/**
 * ProtectedRoute Component
 * Ensures only users with correct permissions can access protected routes
 * Allows admin users to access all protected routes
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, isLoading } = useAuth();
  
  // Show loading state while authentication state is being determined
  if (isLoading) {
    return <div className="loading-container">Loading authentication...</div>;
  }
  
  // Redirect if user is not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has the required role (admin can access all)
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    console.log(`Access blocked: User is ${user.role}, needs ${requiredRole}`);
    return <Navigate to="/unauthorized" replace />;
  }
  
  // Log successful access
  console.log(`Access granted: User ${user.firstName} (${user.role}) accessing ${requiredRole || 'protected'} route`);
  
  // User is authenticated and has correct permissions
  return <>{children}</>;
};

export default ProtectedRoute;