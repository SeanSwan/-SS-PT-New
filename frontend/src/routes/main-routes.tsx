/**
 * main-routes.tsx
 * Main application routes configuration for the live monitoring/patrol security service website.
 */
import React from 'react';
import { RouteObject, Navigate, Outlet } from 'react-router-dom';

import Layout from '../components/Layout/layout';
import ErrorBoundary from './error-boundary';

// Route protection components
import AdminRoute from './admin-route';
import ProtectedRoute from './protected-route';

// Pages
import HomePage from '../pages/HomePage/components/HomePage.component';
import LoginModal from '../pages/LoginModal.component';
import SignupModal from '../pages/SignupModal.component';
import ContactPage from '../pages/contactpage/ContactPage';
import AboutPage from '../pages/about/About';
import StoreFront from '../pages/shop/StoreFront.component';
import UnauthorizedPage from '../pages/UnauthorizedPage.component';

// Checkout pages
import CheckoutSuccess from '../pages/checkout/CheckoutSuccess';
import CheckoutCancel from '../pages/checkout/CheckoutCancel';

// Dashboard components
import ClientDashboard from '../components/ClientDashboard/ClientDashboard';
// AdminDashboard route is kept here if needed; otherwise remove AdminRoute usage if not required
// import AdminDashboard from '../components/AdminDashboard/AdminDashboard';

const MainRoutes: RouteObject = {
  path: '/',
  element: (
    // Wrap Layout with Outlet to provide required children prop
    <Layout>
      <Outlet />
    </Layout>
  ),
  errorElement: <ErrorBoundary />,
  children: [
    { index: true, element: <HomePage /> },
    { path: 'login', element: <LoginModal /> },
    { path: 'signup', element: <SignupModal /> },
    { path: 'contact', element: <ContactPage /> },
    { path: 'about', element: <AboutPage /> },
    { path: 'store', element: <StoreFront /> },
    { path: 'unauthorized', element: <UnauthorizedPage /> },
    // Checkout routes
    { path: 'checkout/success', element: <CheckoutSuccess /> },
    { path: 'checkout/cancel', element: <CheckoutCancel /> },
    // Protected client dashboard route
    {
      path: 'client-dashboard/*',
      element: (
        <ProtectedRoute requiredRole="client">
          <ClientDashboard />
        </ProtectedRoute>
      )
    },
    // Optional Admin route (remove if not needed)
    {
      path: 'admin-dashboard/*',
      element: (
        <AdminRoute>
          {/* <AdminDashboard /> */}
          <div>Admin dashboard is not implemented</div>
        </AdminRoute>
      )
    },
    { path: '*', element: <Navigate to="/" replace /> }
  ]
};

export default MainRoutes;
