/**
 * Berry Admin Dashboard Integration Configuration
 * 
 * This file contains configuration settings, constants, and shared options
 * for integrating the Berry Admin dashboard components with the main application.
 * 
 * It provides a central point for managing paths, theme settings, and feature flags
 * that affect both the Berry Admin components and custom dashboard components.
 */

import { Theme } from '@mui/material/styles';

// Session status configuration
export const sessionStatusConfig = {
  'available': { 
    label: 'Available', 
    color: 'success',
    bgColor: (theme: Theme) => theme.palette.success.light,
    textColor: (theme: Theme) => theme.palette.success.dark,
    icon: 'AccessTimeIcon'
  },
  'requested': { 
    label: 'Requested', 
    color: 'warning',
    bgColor: (theme: Theme) => theme.palette.warning.light,
    textColor: (theme: Theme) => theme.palette.warning.dark,
    icon: 'PendingIcon'
  },
  'scheduled': { 
    label: 'Scheduled', 
    color: 'primary',
    bgColor: (theme: Theme) => theme.palette.primary.light,
    textColor: (theme: Theme) => theme.palette.primary.dark,
    icon: 'ScheduleIcon'
  },
  'confirmed': { 
    label: 'Confirmed', 
    color: 'secondary',
    bgColor: (theme: Theme) => theme.palette.secondary.light,
    textColor: (theme: Theme) => theme.palette.secondary.dark,
    icon: 'DoneIcon'
  },
  'completed': { 
    label: 'Completed', 
    color: 'success',
    bgColor: (theme: Theme) => theme.palette.success.light,
    textColor: (theme: Theme) => theme.palette.success.dark,
    icon: 'CheckCircleIcon'
  },
  'cancelled': { 
    label: 'Cancelled', 
    color: 'error',
    bgColor: (theme: Theme) => theme.palette.error.light,
    textColor: (theme: Theme) => theme.palette.error.dark,
    icon: 'CloseIcon'
  },
  'no-show': { 
    label: 'No Show', 
    color: 'warning',
    bgColor: (theme: Theme) => theme.palette.warning.light,
    textColor: (theme: Theme) => theme.palette.warning.dark,
    icon: 'CancelIcon'
  }
};

// Session types
export const sessionTypes = [
  'Personal',
  'Group',
  'Assessment',
  'Consultation',
  'Introduction'
];

// Base paths for consistent routing
export const adminPaths = {
  dashboard: '/admin-dashboard',
  sessions: '/admin-dashboard/admin-sessions',
  clients: '/admin-dashboard/clients',
  trainers: '/admin-dashboard/trainers',
  settings: '/admin-dashboard/settings',
  reports: '/admin-dashboard/reports',
  schedules: '/admin-dashboard/schedules'
};

// API endpoints for session management
export const sessionApiEndpoints = {
  getSessions: '/api/sessions',
  updateSession: (id: string) => `/api/sessions/${id}`,
  createSession: '/api/sessions',
  deleteSession: (id: string) => `/api/sessions/${id}`,
  updateSessionStatus: (id: string) => `/api/sessions/${id}/status`,
  getTrainers: '/api/auth/users/trainers',
  getClients: '/api/auth/users/clients'
};

// Calendar view configuration
export const calendarConfig = {
  defaultView: 'week' as 'month' | 'week' | 'day',
  availableViews: ['month', 'week', 'day'] as ('month' | 'week' | 'day')[],
  stepMinutes: 30,
  defaultSessionDuration: 60, // minutes
  workDayStart: 6, // 6 AM
  workDayEnd: 21, // 9 PM
  firstDayOfWeek: 0 // 0 = Sunday, 1 = Monday
};

// Grid spacing for consistent layout
export const gridSpacing = 3;

// Table configuration
export const tableConfig = {
  defaultRowsPerPage: 10,
  rowsPerPageOptions: [5, 10, 25, 50, 100]
};

// Feature flags
export const featureFlags = {
  enableCalendarView: true,
  enableDragAndDrop: true,
  enableMultiDay: true,
  enableClientPortal: true,
  enableTrainerPortal: true,
  enableNotifications: true,
  enableReporting: true
};

// Theme settings specifically for Berry Admin integration
export const berryThemeSettings = {
  fontFamily: `'Roboto', sans-serif`,
  borderRadius: 8,
  container: false,
  useCustomization: true,
  mode: 'dark' as 'light' | 'dark'
};

// The main configuration object
const berryAdminConfig = {
  sessionStatusConfig,
  sessionTypes,
  adminPaths,
  sessionApiEndpoints,
  calendarConfig,
  gridSpacing,
  tableConfig,
  featureFlags,
  berryThemeSettings
};

export default berryAdminConfig;