/**
 * AuthenticationRoutes.tsx
 * Authentication routes with TypeScript types
 */
import React, { lazy } from 'react';
import Loadable from '../ui-component/Loadable';
import MinimalLayout from '../layout/MinimalLayout';

// Types for route items
interface RouteItem {
  path: string;
  element: React.ReactNode;
  children?: RouteItem[];
}

// Type for the authentication routes structure
interface AuthRoutesType {
  path: string;
  element: React.ReactNode;
  children: RouteItem[];
}

// Use existing login and signup modals
const LoginPage = Loadable(lazy(() => import('../../pages/LoginModal.component')));
const RegisterPage = Loadable(lazy(() => import('../../pages/SignupModal.component')));

// Define authentication routes with proper TypeScript types
const AuthenticationRoutes: AuthRoutesType = {
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