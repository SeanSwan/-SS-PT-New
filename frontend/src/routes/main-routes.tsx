/**
 * main-routes.tsx
 * Main application routes configuration
 */
import React from 'react';
import { RouteObject, Navigate } from 'react-router-dom';
import Layout from '../components/Layout/layout';
import ErrorBoundary from './error-boundary';

// Route protection components
import AdminRoute from './admin-route';
import ProtectedRoute from './protected-route';

// Pages
import HomePage from '../pages/HomePage.component';
import LoginModal from '../pages/LoginModal.component';
import SignupModal from '../pages/SignupModal.component';
import ContactPage from '../pages/contactpage/ContactPage';
import AboutPage from '../pages/about/About';
import StoreFront from '../pages/shop/StoreFront.component';
import UnauthorizedPage from '../pages/UnauthorizedPage.component';

// Dashboard components
import ClientDashboard from '../components/ClientDashboard/ClientDashboard';
import AdminDashboard from '../components/AdminDashboard/AdminDashboard';

// Main routes configuration
const MainRoutes: RouteObject = {
  path: '/',
  element: <Layout />,
  errorElement: <ErrorBoundary />,
  children: [
    {
      index: true,
      element: <HomePage />
    },
    {
      path: 'login',
      element: <LoginModal />
    },
    {
      path: 'signup',
      element: <SignupModal />
    },
    {
      path: 'contact',
      element: <ContactPage />
    },
    {
      path: 'about',
      element: <AboutPage />
    },
    {
      path: 'store',
      element: <StoreFront />
    },
    {
      path: 'unauthorized',
      element: <UnauthorizedPage />
    },
    {
      path: 'client-dashboard/*',
      element: (
        <ProtectedRoute requiredRole="client">
          <ClientDashboard />
        </ProtectedRoute>
      )
    },
    {
      path: 'admin-dashboard/*',
      element: (
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      )
    },
    {
      path: '*',
      element: <Navigate to="/" replace />
    }
  ]
};

export default MainRoutes;