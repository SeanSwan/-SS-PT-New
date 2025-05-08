/**
 * dashboard.ts
 * Dashboard menu item configuration for the fitness application
 */
import { IconDashboard, IconCalendarEvent, IconUsers, IconReportAnalytics, IconSettings, IconChartLine, IconActivity, IconUserCheck, IconPackage } from '@tabler/icons-react';
import { MenuGroup } from './menu-types';

/**
 * Dashboard menu items definition
 * 
 * Provides a structured navigation configuration for the admin dashboard,
 * organized into logical groups with appropriate icons and URLs.
 * 
 * Enhanced with additional menu items for better navigation and feature access.
 */
const dashboard: MenuGroup[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    type: 'group',
    children: [
      {
        id: 'default',
        title: 'Overview',
        type: 'item',
        url: '/dashboard/default',
        icon: IconDashboard,
        breadcrumbs: false
      },
      {
        id: 'user-management',
        title: 'User Management',
        type: 'item',
        url: '/dashboard/user-management',
        icon: IconUsers,
        breadcrumbs: false
      },
      {
        id: 'admin-sessions',
        title: 'Training Sessions',
        type: 'item',
        url: '/dashboard/admin-sessions',
        icon: IconCalendarEvent,
        breadcrumbs: false
      },
      {
        id: 'client-progress',
        title: 'Client Progress',
        type: 'item',
        url: '/dashboard/client-progress',
        icon: IconChartLine,
        breadcrumbs: false
      },
      {
        id: 'admin-packages',
        title: 'Session Packages',
        type: 'item',
        url: '/dashboard/admin-packages',
        icon: IconPackage,
        breadcrumbs: false
      },
      {
        id: 'client-management',
        title: 'Client Management',
        type: 'item',
        url: '/dashboard/client-management',
        icon: IconUserCheck,
        breadcrumbs: false
      },
      {
        id: 'nasm-exercises',
        title: 'NASM Exercises',
        type: 'item',
        url: '/dashboard/nasm-exercises',
        icon: IconActivity,
        breadcrumbs: false
      },
      {
        id: 'reports',
        title: 'Reports & Analytics',
        type: 'item',
        url: '/dashboard/reports',
        icon: IconReportAnalytics,
        breadcrumbs: false
      },
      {
        id: 'settings',
        title: 'Settings',
        type: 'item',
        url: '/dashboard/settings',
        icon: IconSettings,
        breadcrumbs: false
      }
    ]
  }
];

export default dashboard;