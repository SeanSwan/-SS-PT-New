/**
 * Dashboard Tabs Configuration
 * 
 * Centralized configuration for dashboard tabs across different user roles.
 * This ensures consistency between admin, trainer, and client dashboards.
 */

// Common tabs that are shared across all dashboard types
export const COMMON_DASHBOARD_TABS = [
  {
    key: 'overview',
    label: 'Dashboard',
    icon: 'Dashboard',
    order: 1
  },
  {
    key: 'client-progress',
    label: 'Client Progress',
    icon: 'BarChart',
    order: 2
  },
  {
    key: 'workouts',
    label: 'Workouts',
    icon: 'FitnessCenter',
    order: 3
  },
  {
    key: 'sessions',
    label: 'Sessions',
    icon: 'CalendarMonth',
    order: 4
  },
  {
    key: 'gamification',
    label: 'Gamification',
    icon: 'EmojiEvents',
    order: 5
  },
  {
    key: 'community',
    label: 'Community',
    icon: 'Group',
    order: 6
  }
];

// Admin-specific tabs
export const ADMIN_DASHBOARD_TABS = [
  ...COMMON_DASHBOARD_TABS,
  {
    key: 'user-management',
    label: 'Users',
    icon: 'People',
    order: 7
  },
  {
    key: 'admin-packages',
    label: 'Packages',
    icon: 'ShoppingBag',
    order: 8
  }
];

// Trainer-specific tabs
export const TRAINER_DASHBOARD_TABS = [
  ...COMMON_DASHBOARD_TABS,
  {
    key: 'clients',
    label: 'Clients',
    icon: 'People',
    order: 7
  },
  {
    key: 'packages',
    label: 'Packages',
    icon: 'ShoppingBag',
    order: 8
  }
];

// Client-specific tabs
export const CLIENT_DASHBOARD_TABS = [
  ...COMMON_DASHBOARD_TABS,
  {
    key: 'creative',
    label: 'Creative Hub',
    icon: 'Palette',
    order: 7
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'AccountCircle',
    order: 8
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'Settings',
    order: 9
  }
];

export default {
  COMMON_DASHBOARD_TABS,
  ADMIN_DASHBOARD_TABS,
  TRAINER_DASHBOARD_TABS,
  CLIENT_DASHBOARD_TABS
};