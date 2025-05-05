/**
 * admin-route.tsx
 * Protected route component for admin-only access
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Type for the component props
interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute Component
 * Ensures only users with admin role can access protected routes
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  // Show loading state while authentication state is being determined
  if (isLoading) {
    console.log("Admin route: Loading authentication state...");
    return <div className="loading-container">Loading authentication...</div>;
  }
  
  // Redirect if user is not logged in
  if (!user) {
    console.error("Admin route blocked: No user logged in - token issue detected");
    // Clear any invalid session data to force a clean login
    localStorage.removeItem('token');
    localStorage.removeItem('login_timestamp');
    return <Navigate to="/login" replace />;
  }
  
  // Redirect if user is not an admin
  if (user.role !== 'admin') {
    console.log("Admin route blocked: User is not admin", user.role);
    return <Navigate to="/unauthorized" replace />;
  }
  
  // User is authenticated as admin
  console.log("Admin access granted to:", user.username);
  return <>{children}</>;
};

export default AdminRoute;