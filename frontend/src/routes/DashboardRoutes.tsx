import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';

// Import the Revolutionary Universal Dashboard Layout
import UniversalDashboardLayout from '../components/DashBoard/UniversalDashboardLayout';
import DashboardPage from '../components/DashboardView/DashboardPage';

// Import Protected Route component
import ProtectedRoute from '../components/ProtectedRoutes/ProtectedRoute';

/**
 * DashboardRoutes Component - REVOLUTIONARY UNIFIED EDITION
 * 
 * THE GRAND UNIFICATION: Single routing system for all dashboard types
 * Implements the dashboard revolution from Alchemist's Opus v42
 * 
 * BREAKING CHANGES:
 * - All dashboards now use unified /dashboard/* pattern
 * - Role-based rendering through UniversalDashboardLayout
 * - Eliminates fragmented routing (no more /trainer/*, /client/*)
 * - Single source of truth for all dashboard navigation
 * 
 * UNIFIED ARCHITECTURE:
 * - Admin: /dashboard/admin/*
 * - Trainer: /dashboard/trainer/*  
 * - Client: /dashboard/client/*
 * 
 * The UniversalDashboardLayout intelligently renders the appropriate
 * sidebar and content based on the user's role, creating seamless
 * data sharing and unified user experience.
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
      
      {/* UNIVERSAL DASHBOARD SYSTEM - All roles use /dashboard/* */}
      <Route 
        path="/dashboard/*" 
        element={
          <ProtectedRoute 
            allowedRoles={['admin', 'trainer', 'client']} 
            fallbackPath="/unauthorized"
          >
            <UniversalDashboardLayout />
          </ProtectedRoute>
        } 
      />
      
      {/* LEGACY ROUTE REDIRECTS - Maintain backward compatibility */}
      {/* Redirect old trainer routes to unified system */}
      <Route 
        path="/trainer/*" 
        element={
          <ProtectedRoute 
            allowedRoles={['trainer', 'admin']} 
            fallbackPath="/unauthorized"
          >
            <Navigate to="/dashboard/trainer/overview" replace />
          </ProtectedRoute>
        } 
      />
      
      {/* Redirect old client routes to unified system */}
      <Route 
        path="/client/*" 
        element={
          <ProtectedRoute 
            allowedRoles={['client', 'trainer', 'admin']} 
            fallbackPath="/unauthorized"
          >
            <Navigate to="/dashboard/client/overview" replace />
          </ProtectedRoute>
        } 
      />
      
      {/* Redirect old admin routes to unified system */}
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute 
            allowedRoles={['admin']} 
            fallbackPath="/unauthorized"
          >
            <Navigate to="/dashboard/admin/overview" replace />
          </ProtectedRoute>
        } 
      />
      
      {/* Default redirect to unified dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default DashboardRoutes;