/**
 * authentication-routes.tsx
 * Routes configuration for authentication pages
 */
import React, { lazy } from 'react';
import { RouteObject } from 'react-router-dom';
import Loadable from '../components/ui/Loadable';
import MinimalLayout from '../components/DashBoard/MinimalLayout/minimal-layout';

// Lazy load authentication pages
const LoginPage = Loadable(lazy(() => import('../pages/LoginModal.component')));
const RegisterPage = Loadable(lazy(() => import('../pages/SignupModal.component')));

// Authentication routes configuration
const AuthenticationRoutes: RouteObject = {
  path: '/',
  element: <MinimalLayout />,
  children: [
    {
      path: 'login',
      element: <LoginPage />
    },
    {
      path: 'register',
      element: <RegisterPage />
    }
  ]
};

export default AuthenticationRoutes;