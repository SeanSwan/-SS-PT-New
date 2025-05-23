/**
 * DashboardWrapper.tsx
 * Wrapper component to handle dashboard routing and role detection
 */
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface DashboardWrapperProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  fallbackRoute?: string;
}

const DashboardWrapper: React.FC<DashboardWrapperProps> = ({
  children,
  requiredRole,
  fallbackRoute = '/'
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Log debug information
  useEffect(() => {
    console.log('DashboardWrapper - Current path:', location.pathname);
    console.log('DashboardWrapper - User:', user);
    console.log('DashboardWrapper - Required role:', requiredRole);
    console.log('DashboardWrapper - Fallback route:', fallbackRoute);
  }, [location.pathname, user, requiredRole, fallbackRoute]);
  
  // Check if user has required role
  const hasRequiredRole = () => {
    if (!user) return false;
    
    // Admin can access everything
    if (user.role === 'admin') return true;
    
    // If no specific role required, just check if user exists
    if (!requiredRole) return true;
    
    // Check single role
    if (typeof requiredRole === 'string') {
      return user.role === requiredRole;
    }
    
    // Check multiple roles
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }
    
    return false;
  };
  
  // Redirect if user doesn't have required role
  useEffect(() => {
    if (!hasRequiredRole()) {
      console.log(`DashboardWrapper - Role check failed, redirecting to ${fallbackRoute}`);
      navigate(fallbackRoute, { replace: true });
    }
  }, [user, requiredRole, navigate, fallbackRoute]);
  
  // Only render children if user has proper role
  if (!hasRequiredRole()) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: 'white',
        background: '#0a0a1a'
      }}>
        <div>
          <p>Checking permissions...</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
            {user ? `User role: ${user.role}` : 'No user found'}
          </p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

export default DashboardWrapper;