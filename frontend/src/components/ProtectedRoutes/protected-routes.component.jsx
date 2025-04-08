// File: frontend/src/components/ProtectedRoutes/protected-routes.component.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import config from '../../../config';

const ProtectedRoute = ({ children, requiredRole }) => {
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

  // If a specific role is required, check if user has it
  if (requiredRole) {
    // Handle array of roles
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // Check if user role is in the required roles
    const hasRequiredRole = requiredRoles.some(role => {
      // Special cases
      if (role === 'admin' && user.role && user.role.includes('admin_')) return true;
      
      // Direct match
      return user.role === role;
    });
    
    if (!hasRequiredRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // If all checks pass, render the protected component
  return children;
};

export default ProtectedRoute;