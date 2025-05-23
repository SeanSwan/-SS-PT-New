// File: frontend/src/components/ProtectedRoutes/protected-routes.component.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import config from '../../../config';

const ProtectedRoute = ({ children, requiredRole, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  // Show loading state while auth is being checked
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If protection is disabled via config, just render the component
  if (!config.useProtectedRoutes) {
    return children;
  }

  // If no user is logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle role-based access checks
  if (requiredRole || allowedRoles) {
    // Get the list of allowed roles, prioritizing allowedRoles if provided
    const rolesToCheck = allowedRoles || (Array.isArray(requiredRole) ? requiredRole : [requiredRole]);
    
    // Always allow admin access to all protected routes
    const hasRequiredRole = user.role === 'admin' || rolesToCheck.some(role => {
      // Special cases
      if (role === 'admin' && user.role && user.role.includes('admin_')) return true;
      
      // Direct match
      return user.role === role;
    });
    
    console.log('Role check:', { userRole: user.role, rolesToCheck, hasAccess: hasRequiredRole });
    
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // If all checks pass, render the protected component
  return children;
};

export default ProtectedRoute;