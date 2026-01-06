/**
 * UnifiedAdminDashboardLayout.tsx
 * ================================
 * Executive Command Intelligence Admin Dashboard Layout
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from 'styled-components';
import { useAuth } from '../../context/AuthContext';

import AdminStellarSidebar from './Pages/admin-dashboard/AdminStellarSidebar';
import UnifiedAdminRoutes from './UnifiedAdminRoutes';
import { executiveCommandTheme, ExecutiveGlobalStyles } from './AdminLayoutTheme';
import {
  ExecutiveLayoutContainer,
  ExecutiveMainContent,
  ExecutiveLoadingContainer,
  ExecutiveLoadingSpinner,
  ExecutiveErrorContainer,
  ExecutiveButton,
} from './AdminLayout.styles';

// === MAIN COMPONENT ===
const UnifiedAdminDashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verify admin access
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        if (!user) {
          setError('Authentication required. Please log in with admin credentials.');
        } else if (user.role !== 'admin' && user.email !== 'ogpswan@gmail.com') {
          setError('Administrator access required.');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Admin access verification error:', err);
        setError('Unable to verify admin access.');
      } finally {
        setIsLoading(false);
      }
    };

    setTimeout(verifyAccess, 300);
  }, [user]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    navigate('/login?returnUrl=' + encodeURIComponent(location.pathname));
  };

  const LoadingState = () => (
    <ExecutiveLoadingContainer>
      <ExecutiveLoadingSpinner
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      <h2
        style={{
          fontSize: '1.25rem',
          fontWeight: 500,
          color: executiveCommandTheme.colors.platinumSilver,
          marginBottom: '0.5rem',
        }}
      >
        Initializing Command Center...
      </h2>
      <p style={{ color: executiveCommandTheme.colors.cosmicGray, fontSize: '0.9rem' }}>
        Loading Executive Command Intelligence
      </p>
    </ExecutiveLoadingContainer>
  );

  const ErrorState = () => (
    <ExecutiveErrorContainer>
      <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>!</div>
      <h2>Access Restricted</h2>
      <p>{error}</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <ExecutiveButton
          onClick={handleRetry}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Retry admin access verification"
        >
          Retry Access
        </ExecutiveButton>
        <ExecutiveButton
          onClick={handleLogout}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          aria-label="Logout from admin dashboard"
        >
          Logout
        </ExecutiveButton>
      </div>
    </ExecutiveErrorContainer>
  );

  if (isLoading) {
    return (
      <ThemeProvider theme={executiveCommandTheme}>
        <ExecutiveGlobalStyles />
        <ExecutiveLayoutContainer>
          <LoadingState />
        </ExecutiveLayoutContainer>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={executiveCommandTheme}>
        <ExecutiveGlobalStyles />
        <ExecutiveLayoutContainer>
          <ErrorState />
        </ExecutiveLayoutContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={executiveCommandTheme}>
      <ExecutiveGlobalStyles />
      <ExecutiveLayoutContainer>
        <AdminStellarSidebar />
        <ExecutiveMainContent
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          role="main"
          aria-label="Admin dashboard main content"
        >
          <AnimatePresence mode="wait">
            <Suspense fallback={<LoadingState />}>
              <UnifiedAdminRoutes />
            </Suspense>
          </AnimatePresence>
        </ExecutiveMainContent>
      </ExecutiveLayoutContainer>
    </ThemeProvider>
  );
};

export default UnifiedAdminDashboardLayout;
