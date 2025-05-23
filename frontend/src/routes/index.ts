/**
 * index.ts
 * Main router configuration using React Router v6
 */
import { createBrowserRouter } from 'react-router-dom';

// Routes
import MainRoutes from './main-routes';
import AuthenticationRoutes from './authentication-routes';

// Create browser router with all routes
const router = createBrowserRouter(
  [MainRoutes, AuthenticationRoutes], 
  {
    basename: import.meta.env.VITE_APP_BASE_NAME || '/'
  }
);

export default router;