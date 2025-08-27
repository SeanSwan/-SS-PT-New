/**
 * Complete Admin Routes - Production Ready
 * =====================================
 * 
 * Replaces the minimal fallback admin routing with full functionality
 * Connects all admin components for comprehensive business management
 */

import React, { Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

// Lazy load admin components for performance
const ClientManagementDashboard = React.lazy(() => import('../Pages/admin-clients/ClientManagementDashboard'));
const ConnectedAdminScheduleIntegration = React.lazy(() => import('../../UniversalMasterSchedule/ConnectedAdminScheduleIntegration'));
const RevolutionaryAdminDashboard = React.lazy(() => import('../Pages/admin-dashboard/admin-dashboard-view'));
const TrainersManagementSection = React.lazy(() => import('../Pages/admin-dashboard/TrainersManagementSection'));
const RevenueAnalyticsPanel = React.lazy(() => import('../Pages/admin-dashboard/components/RevenueAnalyticsPanel'));
const SystemHealthManagementSection = React.lazy(() => import('../Pages/admin-dashboard/SystemHealthManagementSection'));

// Loading component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
    <CircularProgress />
  </Box>
);

/**
 * Complete Admin Dashboard Routes
 * Provides full admin functionality for business management
 */
const AdminRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Admin Dashboard Overview */}
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<RevolutionaryAdminDashboard />} />
        
        {/* CLIENT MANAGEMENT - Primary business function */}
        <Route path="/clients" element={<ClientManagementDashboard />} />
        <Route path="/clients/:clientId" element={<ClientManagementDashboard />} />
        
        {/* SCHEDULING - Universal Master Schedule */}
        <Route path="/schedule" element={<ConnectedAdminScheduleIntegration />} />
        <Route path="/master-schedule" element={<ConnectedAdminScheduleIntegration />} />
        
        {/* TRAINER MANAGEMENT */}
        <Route path="/trainers" element={<TrainersManagementSection />} />
        
        {/* FINANCIAL MANAGEMENT */}
        <Route path="/financial" element={<RevenueAnalyticsPanel />} />
        <Route path="/revenue" element={<RevenueAnalyticsPanel />} />
        
        {/* SYSTEM SETTINGS */}
        <Route path="/settings" element={<SystemHealthManagementSection />} />
        
        {/* Catch all - redirect to overview */}
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AdminRoutes;