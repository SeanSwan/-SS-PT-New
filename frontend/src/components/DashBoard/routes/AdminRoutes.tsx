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
const UniversalMasterSchedule = React.lazy(() => import('../../UniversalMasterSchedule/UniversalMasterSchedule'));
const AdminDashboardOverview = React.lazy(() => import('../Pages/admin-dashboard/AdminDashboardOverview'));
const TrainerManagement = React.lazy(() => import('../Pages/admin-dashboard/TrainerManagement'));
const FinancialDashboard = React.lazy(() => import('../Pages/admin-dashboard/FinancialDashboard'));
const SystemSettings = React.lazy(() => import('../Pages/admin-dashboard/SystemSettings'));

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
        <Route path="/overview" element={<AdminDashboardOverview />} />
        
        {/* CLIENT MANAGEMENT - Primary business function */}
        <Route path="/clients" element={<ClientManagementDashboard />} />
        <Route path="/clients/:clientId" element={<ClientManagementDashboard />} />
        
        {/* SCHEDULING - Universal Master Schedule */}
        <Route path="/schedule" element={<UniversalMasterSchedule />} />
        <Route path="/master-schedule" element={<UniversalMasterSchedule />} />
        
        {/* TRAINER MANAGEMENT */}
        <Route path="/trainers" element={<TrainerManagement />} />
        
        {/* FINANCIAL MANAGEMENT */}
        <Route path="/financial" element={<FinancialDashboard />} />
        <Route path="/revenue" element={<FinancialDashboard />} />
        
        {/* SYSTEM SETTINGS */}
        <Route path="/settings" element={<SystemSettings />} />
        
        {/* Catch all - redirect to overview */}
        <Route path="*" element={<Navigate to="/overview" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AdminRoutes;