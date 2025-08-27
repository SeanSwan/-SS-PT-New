/**
 * TEST ROUTES - Uses simple layout to bypass complex Header
 * If this works but main-routes doesn't, then Header is the problem
 */
import React, { lazy, Suspense } from 'react';
import { RouteObject, Navigate, Outlet } from 'react-router-dom';

// Test Layout (bypasses complex Header)
import TestLayout from '../components/Layout/test-layout';
import ErrorBoundary from './error-boundary';

// Loading Component
const PageLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
    background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)',
    color: 'white'
  }}>
    <div style={{
      border: '4px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '50%',
      borderTop: '4px solid #00ffff',
      width: '50px',
      height: '50px',
      animation: 'spin 1s linear infinite'
    }}>
    </div>
  </div>
);

// Simple lazy loading without complex error handling
const HomePage = lazy(() => import('../pages/HomePage/components/HomePage.component'));

/**
 * Test Routes Configuration - Minimal dependencies
 */
const TestRoutes: RouteObject = {
  path: '/',
  element: (
    <TestLayout>
      <Outlet />
    </TestLayout>
  ),
  errorElement: <ErrorBoundary />,
  children: [
    {
      index: true,
      element: (
        <Suspense fallback={<PageLoader />}>
          <HomePage />
        </Suspense>
      )
    },
    {
      path: '*',
      element: <Navigate to="/" replace />
    }
  ]
};

export default TestRoutes;
