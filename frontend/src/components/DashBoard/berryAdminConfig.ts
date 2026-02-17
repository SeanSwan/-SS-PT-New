/**
 * Berry Admin Dashboard Integration Configuration
 * 
 * This file contains configuration settings, constants, and shared options
 * for integrating the Berry Admin dashboard components with the main application.
 * 
 * It provides a central point for managing paths, theme settings, and feature flags
 * that affect both the Berry Admin components and custom dashboard components.
 */

// Session status configuration — Galaxy-Swan hardcoded colors (no MUI Theme dependency)
export const sessionStatusConfig = {
  'available': {
    label: 'Available',
    color: 'success',
    bgColor: '#66bb6a',
    textColor: '#1b5e20',
    icon: 'AccessTimeIcon'
  },
  'requested': {
    label: 'Requested',
    color: 'warning',
    bgColor: '#ffb74d',
    textColor: '#e65100',
    icon: 'PendingIcon'
  },
  'scheduled': {
    label: 'Scheduled',
    color: 'primary',
    bgColor: '#64b5f6',
    textColor: '#1565c0',
    icon: 'ScheduleIcon'
  },
  'confirmed': {
    label: 'Confirmed',
    color: 'secondary',
    bgColor: '#ce93d8',
    textColor: '#7b1fa2',
    icon: 'DoneIcon'
  },
  'completed': {
    label: 'Completed',
    color: 'success',
    bgColor: '#66bb6a',
    textColor: '#1b5e20',
    icon: 'CheckCircleIcon'
  },
  'cancelled': {
    label: 'Cancelled',
    color: 'error',
    bgColor: '#ef5350',
    textColor: '#b71c1c',
    icon: 'CloseIcon'
  },
  'no-show': {
    label: 'No Show',
    color: 'warning',
    bgColor: '#ffb74d',
    textColor: '#e65100',
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