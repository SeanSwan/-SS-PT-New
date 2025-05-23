/**
 * DirectAppRoutes.tsx
 * Direct implementation of routes for the app that doesn't use Router
 */
import React from 'react';
import { useRoutes } from 'react-router-dom';

// Routes
import MainRoutes from './routes/main-routes';
import AuthenticationRoutes from './routes/authentication-routes';

/**
 * DirectAppRoutes Component
 * 
 * Renders routes using useRoutes hook rather than a Router component
 */
const DirectAppRoutes: React.FC = () => {
  const routes = useRoutes([MainRoutes, AuthenticationRoutes]);
  return routes;
};

export default DirectAppRoutes;
