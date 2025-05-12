import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

// Import Dashboard Layouts
import AdminDashboardLayout from '../components/DashBoard/AdminDashboardLayout';
import ClientDashboard from '../components/ClientDashboard/ClientDashboard';
import TrainerDashboardLayout from '../components/TrainerDashboard/TrainerDashboardLayout';
import DashboardPage from '../components/DashboardView/DashboardPage';

// Import Protected Route component
import ProtectedRoute from '../components/ProtectedRoutes/ProtectedRoute';

/**
 * DashboardRoutes Component
 * 
 * Centralized routing for all dashboard types (Admin, Trainer, Client)
 * Ensures consistent navigation and authorization across the application
 */
const DashboardRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Dashboard Selection Page */}
      <Route 
        path="/dashboards" 
        element={
          <ProtectedRoute 
            allowedRoles={['admin', 'trainer', 'client']} 
            fallbackPath="/login"
          >
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      
      {/* Admin Dashboard Routes */}
      <Route 
        path="/dashboard/*" 
        element={
          <ProtectedRoute 
            allowedRoles={['admin']} 
            fallbackPath="/unauthorized"
          >
            <AdminDashboardLayout />
          </ProtectedRoute>
        } 
      />
      
      {/* Trainer Dashboard Routes */}
      <Route 
        path="/trainer/*" 
        element={
          <ProtectedRoute 
            allowedRoles={['trainer', 'admin']} 
            fallbackPath="/unauthorized"
          >
            <TrainerDashboardLayout />
          </ProtectedRoute>
        } 
      />
      
      {/* Client Dashboard Routes */}
      <Route 
        path="/client/*" 
        element={
          <ProtectedRoute 
            allowedRoles={['client', 'trainer', 'admin']} 
            fallbackPath="/unauthorized"
          >
            <ClientDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboards" replace />} />
    </Routes>
  );
};

export default DashboardRoutes;