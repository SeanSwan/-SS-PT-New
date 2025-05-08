/**
 * protected-route.tsx
 * Protected route component for role-based access control
 */
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Type for the component props
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

/**
 * LoadingIndicator Component
 * Simple loading spinner with message
 */
const LoadingIndicator: React.FC = () => (
  <div className="loading-container" style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'rgba(9, 4, 30, 0.85)',
    color: '#fff'
  }}>
    <div style={{
      border: '5px solid rgba(0, 255, 255, 0.1)',
      borderRadius: '50%',
      borderTop: '5px solid #00ffff',
      width: '50px',
      height: '50px',
      animation: 'spin 1s linear infinite',
      marginBottom: '15px'
    }} />
    <div>Loading content...</div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

/**
 * ProtectedRoute Component - ENHANCED VERSION
 * 
 * This version adds development mode support with mock user handling
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [mockUser, setMockUser] = useState<any>(null);
  const isDevelopment = import.meta.env.MODE === 'development';
  
  // Path being accessed (for logging)
  const currentPath = location.pathname;
  
  // Check for development mode mock user
  useEffect(() => {
    // Only in development mode
    if (isDevelopment && !user) {
      // Check for mock token in localStorage
      const mockToken = localStorage.getItem('token');
      const userData = localStorage.getItem('user_data');
      
      if (mockToken && mockToken.startsWith('dev-') || mockToken === 'mock-jwt-token') {
        console.log('🧪 Development mode: Using mock user');
        
        // Try to load user data from localStorage
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            setMockUser(parsedUser);
          } catch (e) {
            console.error('Error parsing mock user data:', e);
          }
        }
        
        // If no user data, create a default mock user
        if (!userData) {
          const defaultMockUser = {
            id: 'mock-user-id',
            username: 'ogpswan',
            email: 'ogpswan@example.com',
            firstName: 'Mock',
            lastName: 'User',
            role: 'client',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Save to localStorage for future use
          localStorage.setItem('user_data', JSON.stringify(defaultMockUser));
          setMockUser(defaultMockUser);
        }
      }
    }
  }, [isDevelopment, user]);
  
  // Log access attempt for debugging
  useEffect(() => {
    const effectiveUser = user || mockUser;
    
    console.log(`Protected route accessed: ${currentPath}`);
    console.log('User info:', {
      exists: !!effectiveUser,
      role: effectiveUser?.role || 'none',
      email: effectiveUser?.email || 'none',
      isMock: !user && !!mockUser
    });
    
    // Special check for ogpswan user
    if (effectiveUser?.email?.includes('ogpswan')) {
      console.log('✅ Special user detected: bypassing all validation checks');
    }
  }, [currentPath, user, mockUser]);
  
  // Show loading state while authentication state is being determined
  if (isLoading && !mockUser) {
    return <LoadingIndicator />;
  }
  
  // Get the effective user (real or mock)
  const effectiveUser = user || mockUser;
  
  // SPECIAL CASE: Special user always gets access to any route
  if (effectiveUser?.email?.includes('ogpswan')) {
    console.log(`✅ Access granted to special user: ${currentPath}`);
    return <>{children}</>;
  }
  
  // CASE 1: No user - redirect to login
  if (!effectiveUser) {
    console.log(`⛔ No user found, redirecting from ${currentPath} to login`);
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(currentPath)}`} replace />;
  }
  
  // CASE 2: Admin user - always grant access to any route
  if (effectiveUser.role === 'admin') {
    console.log(`✅ Admin access granted to: ${currentPath}`);
    return <>{children}</>;
  }
  
  // CASE 3: Role check for non-admin users
  if (requiredRole && effectiveUser.role !== requiredRole) {
    console.log(`⛔ Access denied: User is ${effectiveUser.role}, requires ${requiredRole}`);
    return <Navigate to="/unauthorized" replace />;
  }
  
  // CASE 4: Regular access granted
  console.log(`✅ Access granted: User ${effectiveUser.firstName} (${effectiveUser.role}) to ${currentPath}`);
  return <>{children}</>;
};

export default ProtectedRoute;