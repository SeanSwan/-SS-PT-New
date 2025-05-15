import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

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
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#0a0a1a',
      color: '#e0e0e0'
    }}
  >
    <CircularProgress 
      size={60} 
      thickness={4}
      sx={{ 
        color: '#00ffff',
        mb: 3
      }} 
    />
    <Typography variant="h6" align="center">
      Verifying access...
    </Typography>
    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
      Please wait while we check your credentials
    </Typography>
  </Box>
);

/**
 * Error component for access denied
 */
const AccessDeniedScreen: React.FC<{ 
  message: string; 
  onRetry?: () => void;
}> = ({ message, onRetry }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#0a0a1a',
      color: '#e0e0e0',
      padding: 3
    }}
  >
    <Alert 
      severity="error" 
      sx={{ 
        mb: 3,
        maxWidth: 400,
        bgcolor: 'rgba(244, 67, 54, 0.1)',
        border: '1px solid rgba(244, 67, 54, 0.3)'
      }}
    >
      <Typography variant="h6" gutterBottom>
        Access Denied
      </Typography>
      <Typography variant="body2">
        {message}
      </Typography>
    </Alert>
    
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          color: '#0a0a1a',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Try Again
      </button>
    )}
  </Box>
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
  
  // Check allowed roles (new logic for multiple roles)
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
  // Check specific role requirement (legacy single role check)
  else if (requiredRole && auth.user.role !== requiredRole) {
    // Special case: admin users can access trainer areas
    if (requiredRole === 'trainer' && auth.user.role === 'admin') {
      // Allow admin to access trainer dashboard
    } else {
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
