import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { AdminPanelSettings, Security } from '@mui/icons-material';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Admin-specific loading screen
 */
const AdminLoadingScreen: React.FC = () => (
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
    <AdminPanelSettings 
      sx={{ 
        fontSize: 48, 
        color: '#00ffff', 
        mb: 2,
        animation: 'pulse 2s infinite'
      }} 
    />
    <CircularProgress 
      size={60} 
      thickness={4}
      sx={{ 
        color: '#00ffff',
        mb: 3
      }} 
    />
    <Typography variant="h6" align="center">
      Verifying Admin Access...
    </Typography>
    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
      Checking administrative privileges
    </Typography>
  </Box>
);

/**
 * Admin access denied screen
 */
const AdminAccessDeniedScreen: React.FC<{
  user: any;
  onRetry: () => void;
  onLogout: () => void;
}> = ({ user, onRetry, onLogout }) => (
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
    <Security 
      sx={{ 
        fontSize: 64, 
        color: '#ff416c', 
        mb: 3
      }} 
    />
    
    <Alert 
      severity="error" 
      sx={{ 
        mb: 3,
        maxWidth: 500,
        bgcolor: 'rgba(244, 67, 54, 0.1)',
        border: '1px solid rgba(244, 67, 54, 0.3)'
      }}
    >
      <Typography variant="h5" gutterBottom>
        Admin Access Required
      </Typography>
      <Typography variant="body1" paragraph>
        You need administrative privileges to access this area.
      </Typography>
      
      <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Current User:</strong> {user?.username || 'Unknown'}<br />
          <strong>Role:</strong> {user?.role || 'None'}<br />
          <strong>Email:</strong> {user?.email || 'Unknown'}
        </Typography>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Please contact an administrator to request access, or log in with admin credentials.
      </Typography>
    </Alert>
    
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <Button
        variant="outlined"
        onClick={onRetry}
        sx={{
          borderColor: '#00ffff',
          color: '#00ffff',
          '&:hover': {
            borderColor: '#00b8ff',
            backgroundColor: 'rgba(0, 255, 255, 0.1)'
          }
        }}
      >
        Retry Access
      </Button>
      
      <Button
        variant="contained"
        onClick={onLogout}
        sx={{
          background: 'linear-gradient(135deg, #ff416c, #ff4081)',
          '&:hover': {
            background: 'linear-gradient(135deg, #e5274e, #e91e63)'
          }
        }}
      >
        Logout & Login as Admin
      </Button>
    </Box>
  </Box>
);

/**
 * AdminRoute Component
 * 
 * Specialized route protection for admin-only areas.
 * Provides enhanced security checks and user feedback.
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const auth = useAuth();
  const location = useLocation();
  
  // Show loading while authentication is being verified
  if (auth.loading) {
    return <AdminLoadingScreen />;
  }
  
  // If not authenticated at all, redirect to login
  if (!auth.isAuthenticated || !auth.user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />;
  }
  
  // Check for admin permission using the new permission system
  if (!auth.checkPermission('admin:all')) {
    console.error(
      `AdminRoute: Access denied for user "${auth.user.username}" (${auth.user.role})`
    );
    
    return (
      <AdminAccessDeniedScreen
        user={auth.user}
        onRetry={() => window.location.reload()}
        onLogout={() => {
          auth.logout();
          window.location.href = '/login?returnUrl=' + encodeURIComponent(location.pathname);
        }}
      />
    );
  }
  
  // User has admin access
  console.log(`AdminRoute: Access granted for admin user "${auth.user.username}"`);
  return <>{children}</>;
};

export default AdminRoute;
