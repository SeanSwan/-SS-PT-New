import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styled, { keyframes } from 'styled-components';
import { Loader2, AlertTriangle } from 'lucide-react';

// ===================== Styled Components =====================

// Loading Screen Containers
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #0a0a1a;
  color: #e0e0e0;
`;

// Loading Spinner Animation
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div`
  animation: ${spin} 1s linear infinite;
  margin-bottom: 24px;
  color: #00ffff;
`;

// Typography Components
const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
  color: #e0e0e0;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  margin: 8px 0 0 0;
  text-align: center;
  color: #9ca3af;
  line-height: 1.4;
`;

// Alert Components
const AlertContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #0a0a1a;
  color: #e0e0e0;
  padding: 24px;
`;

const AlertBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  margin-bottom: 24px;
  max-width: 400px;
  background-color: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  color: #f44336;
`;

const AlertIconContainer = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AlertContent = styled.div`
  flex: 1;
`;

const AlertTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #f44336;
`;

const AlertMessage = styled.p`
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.4;
  color: #f44336;
`;

// Retry Button
const RetryButton = styled.button`
  background: linear-gradient(135deg, #00ffff, #00c8ff);
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  color: #0a0a1a;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'trainer' | 'client' | 'user';
  allowedRoles?: ('admin' | 'trainer' | 'client' | 'user')[];
  requiredPermission?: string;
  fallbackPath?: string;
}

/**
 * Loading component for authentication checks
 */
const AuthLoadingScreen: React.FC = () => (
  <LoadingContainer>
    <SpinnerContainer>
      <Loader2 size={60} />
    </SpinnerContainer>
    <Title>
      Verifying access...
    </Title>
    <Subtitle>
      Please wait while we check your credentials
    </Subtitle>
  </LoadingContainer>
);

/**
 * Error component for access denied
 */
const AccessDeniedScreen: React.FC<{ 
  message: string; 
  onRetry?: () => void;
}> = ({ message, onRetry }) => (
  <AlertContainer>
    <AlertBox>
      <AlertIconContainer>
        <AlertTriangle size={20} />
      </AlertIconContainer>
      <AlertContent>
        <AlertTitle>
          Access Denied
        </AlertTitle>
        <AlertMessage>
          {message}
        </AlertMessage>
      </AlertContent>
    </AlertBox>
    
    {onRetry && (
      <RetryButton onClick={onRetry}>
        Try Again
      </RetryButton>
    )}
  </AlertContainer>
);

/**
 * ProtectedRoute Component
 * 
 * Provides route protection based on authentication status and permissions.
 * Integrates with the enhanced AuthContext for comprehensive access control.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowedRoles,
  requiredPermission,
  fallbackPath = '/login'
}) => {
  const auth = useAuth();
  const location = useLocation();
  
  // Show loading while authentication is being verified
  if (auth.loading) {
    return <AuthLoadingScreen />;
  }
  
  // If not authenticated, redirect to login with return URL
  if (!auth.isAuthenticated || !auth.user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${fallbackPath}?returnUrl=${returnUrl}`} replace />;
  }
  
  // Special case for development mode: EMERGENCY FIX
  if (process.env.NODE_ENV === 'development') {
    const bypass = localStorage.getItem('bypass_admin_verification') === 'true';
    if (bypass) {
      console.log('[EMERGENCY FIX] Using bypass flag to skip role checks in ProtectedRoute');
      return <>{children}</>;
    }
  }
  
  // Special case: admin users can access any role-protected route
  if (auth.user.role === 'admin') {
    console.log('Admin accessing role-protected area - access granted');
  }
  // For non-admin users, perform detailed role checks
  else if ((allowedRoles && allowedRoles.length > 0) || requiredRole) {
    // Check against allowedRoles array if provided
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(auth.user.role as any)) {
        const message = `This area requires one of these roles: ${allowedRoles.join(', ')}. Your current role: ${auth.user.role}`;
        return (
          <AccessDeniedScreen 
            message={message}
            onRetry={() => window.location.reload()}
          />
        );
      }
    }
    // Check against single requiredRole
    else if (requiredRole && auth.user.role !== requiredRole) {
      const message = `This area requires ${requiredRole} privileges. Your current role: ${auth.user.role}`;
      return (
        <AccessDeniedScreen 
          message={message}
          onRetry={() => window.location.reload()}
        />
      );
    }
  }
  
  // Check specific permission requirement
  if (requiredPermission && !auth.checkPermission(requiredPermission)) {
    const message = `You don't have the required permission: ${requiredPermission}`;
    return (
      <AccessDeniedScreen 
        message={message}
        onRetry={() => window.location.reload()}
      />
    );
  }
  
  // User is authenticated and has required permissions
  return <>{children}</>;
};

export default ProtectedRoute;