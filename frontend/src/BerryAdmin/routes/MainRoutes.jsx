/**
 * MainRoutes.jsx
 * Defines the main routes for the Berry Admin dashboard
 */
import { lazy } from 'react';
import MainLayout from '../layout/MainLayout';
import Loadable from '../ui-component/Loadable';

// Dashboard
const DashboardDefault = Loadable(lazy(() => import('../views/dashboard/Default')));

// Schedule Management
const ScheduleManagement = Loadable(lazy(() => import('../views/ScheduleManagement')));

// Sample page
const SamplePage = Loadable(lazy(() => import('../views/sample-page')));

// Utilities
const UtilsTypography = Loadable(lazy(() => import('../views/berryUtilities/Typography')));
const UtilsColor = Loadable(lazy(() => import('../views/berryUtilities/Color')));
const UtilsShadow = Loadable(lazy(() => import('../views/berryUtilities/Shadow')));

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
  path: '/',
  element: <MainLayout />,
  children: [
    {
      path: '',
      element: <DashboardDefault />
    },
    {
      path: 'dashboard',
      children: [
        {
          path: 'default',
          element: <DashboardDefault />
        }
      ]
    },
    {
      path: 'schedule',
      element: <ScheduleManagement />
    },
    {
      path: 'typography',
      element: <UtilsTypography />
    },
    {
      path: 'color',
      element: <UtilsColor />
    },
    {
      path: 'shadow',
      element: <UtilsShadow />
    },
    {
      path: 'sample-page',
      element: <SamplePage />
    }
  ]
};

export default MainRoutes;