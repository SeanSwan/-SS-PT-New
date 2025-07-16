/**
 * Universal Master Schedule - Main Export
 * ======================================
 * Main entry point for the Universal Master Schedule system
 * 
 * This file exports all the components, services, and utilities
 * needed to integrate the Universal Master Schedule into the
 * SwanStudios admin dashboard.
 */

// Main Component
export { default as UniversalMasterSchedule } from './UniversalMasterSchedule';

// Types and Interfaces
export * from './types';

// Theme Configuration
export {
  stellarTheme,
  CommandCenterTheme,
  calendarTheme,
  stellarColors,
  stellarGradients,
  stellarSpacing,
  stellarBreakpoints,
  stellarTypography,
  stellarShadows,
  stellarBorderRadius,
  stellarAnimations
} from './UniversalMasterScheduleTheme';

// Services
export { default as sessionService } from '../../services/sessionService';
export { default as clientTrainerAssignmentService } from '../../services/clientTrainerAssignmentService';

// Utility Functions
export const formatSessionDate = (date: string | Date): string => {
  const sessionDate = typeof date === 'string' ? new Date(date) : date;
  return sessionDate.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatSessionTime = (date: string | Date): string => {
  const sessionDate = typeof date === 'string' ? new Date(date) : date;
  return sessionDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getSessionStatusColor = (status: string): string => {
  switch (status) {
    case 'available':
      return '#22c55e';
    case 'scheduled':
      return '#3b82f6';
    case 'confirmed':
      return '#0ea5e9';
    case 'completed':
      return '#6c757d';
    case 'cancelled':
      return '#ef4444';
    case 'requested':
      return '#f59e0b';
    default:
      return '#3b82f6';
  }
};

export const calculateUtilizationRate = (sessions: any[]): number => {
  if (sessions.length === 0) return 0;
  
  const bookedSessions = sessions.filter(s => 
    ['scheduled', 'confirmed', 'completed'].includes(s.status)
  ).length;
  
  return Math.round((bookedSessions / sessions.length) * 100);
};

export const getSessionDuration = (start: Date, end: Date): number => {
  return Math.round((end.getTime() - start.getTime()) / 60000);
};

export const isSessionConflict = (session1: any, session2: any): boolean => {
  const start1 = new Date(session1.sessionDate);
  const end1 = new Date(start1.getTime() + (session1.duration || 60) * 60000);
  const start2 = new Date(session2.sessionDate);
  const end2 = new Date(start2.getTime() + (session2.duration || 60) * 60000);
  
  return start1 < end2 && start2 < end1;
};

export const validateSessionData = (sessionData: any): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!sessionData.sessionDate) {
    errors.push('Session date is required');
  }
  
  if (!sessionData.duration || sessionData.duration < 15) {
    errors.push('Session duration must be at least 15 minutes');
  }
  
  if (sessionData.duration > 480) {
    errors.push('Session duration cannot exceed 8 hours');
  }
  
  if (sessionData.sessionDate) {
    const sessionDate = new Date(sessionData.sessionDate);
    if (sessionDate < new Date()) {
      errors.push('Session date cannot be in the past');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Constants
export const SESSION_STATUSES = [
  { value: 'available', label: 'Available', color: '#22c55e' },
  { value: 'requested', label: 'Requested', color: '#f59e0b' },
  { value: 'scheduled', label: 'Scheduled', color: '#3b82f6' },
  { value: 'confirmed', label: 'Confirmed', color: '#0ea5e9' },
  { value: 'completed', label: 'Completed', color: '#6c757d' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

export const CALENDAR_VIEWS = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'agenda', label: 'Agenda' },
];

export const BULK_ACTIONS = [
  { value: 'confirm', label: 'Confirm Sessions', color: '#22c55e' },
  { value: 'cancel', label: 'Cancel Sessions', color: '#ef4444' },
  { value: 'delete', label: 'Delete Sessions', color: '#dc2626' },
  { value: 'reassign', label: 'Reassign Trainer', color: '#3b82f6' },
  { value: 'reschedule', label: 'Reschedule Sessions', color: '#f59e0b' },
  { value: 'duplicate', label: 'Duplicate Sessions', color: '#8b5cf6' },
  { value: 'export', label: 'Export Sessions', color: '#6c757d' },
];

export const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

// Error Messages
export const ERROR_MESSAGES = {
  FETCH_SESSIONS_ERROR: 'Failed to load sessions. Please try again.',
  CREATE_SESSION_ERROR: 'Failed to create session. Please check your input.',
  UPDATE_SESSION_ERROR: 'Failed to update session. Please try again.',
  DELETE_SESSION_ERROR: 'Failed to delete session. Please try again.',
  ASSIGN_TRAINER_ERROR: 'Failed to assign trainer. Please try again.',
  BULK_ACTION_ERROR: 'Failed to perform bulk action. Please try again.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  SESSION_CREATED: 'Session created successfully',
  SESSION_UPDATED: 'Session updated successfully',
  SESSION_DELETED: 'Session deleted successfully',
  SESSION_CONFIRMED: 'Session confirmed successfully',
  SESSION_CANCELLED: 'Session cancelled successfully',
  TRAINER_ASSIGNED: 'Trainer assigned successfully',
  CLIENT_ASSIGNED: 'Client assigned successfully',
  BULK_ACTION_COMPLETED: 'Bulk action completed successfully',
  DATA_EXPORTED: 'Data exported successfully',
  SESSIONS_IMPORTED: 'Sessions imported successfully',
};

// Default Configuration
export const DEFAULT_CONFIG = {
  defaultSessionDuration: 60,
  defaultLocation: 'Main Studio',
  autoRefreshInterval: 30000, // 30 seconds
  maxBulkOperations: 50,
  calendarTimeSlots: 2,
  calendarStep: 30,
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm',
  datetimeFormat: 'YYYY-MM-DD HH:mm',
};

// Permissions
export const PERMISSIONS = {
  VIEW_ALL_SESSIONS: 'view_all_sessions',
  CREATE_SESSIONS: 'create_sessions',
  EDIT_SESSIONS: 'edit_sessions',
  DELETE_SESSIONS: 'delete_sessions',
  ASSIGN_TRAINERS: 'assign_trainers',
  BULK_OPERATIONS: 'bulk_operations',
  VIEW_STATISTICS: 'view_statistics',
  EXPORT_DATA: 'export_data',
  IMPORT_DATA: 'import_data',
};

// Component Props Interfaces
export interface UniversalMasterScheduleProps {
  initialView?: 'month' | 'week' | 'day' | 'agenda';
  initialDate?: Date;
  autoRefresh?: boolean;
  refreshInterval?: number;
  permissions?: string[];
  onSessionSelect?: (session: any) => void;
  onSessionCreate?: (session: any) => void;
  onSessionUpdate?: (session: any) => void;
  onSessionDelete?: (sessionId: string) => void;
  onError?: (error: string) => void;
  theme?: 'light' | 'dark';
  compactMode?: boolean;
  showStatistics?: boolean;
  showFilters?: boolean;
  showBulkActions?: boolean;
  customActions?: Array<{
    label: string;
    action: (selectedSessions: string[]) => void;
    icon?: React.ReactNode;
    color?: string;
  }>;
}

// Hook for Universal Master Schedule
export const useUniversalMasterSchedule = () => {
  // This would contain common logic for the schedule component
  // For now, it's a placeholder
  return {
    // Add common hooks and utilities here
  };
};

// Export default component
export default UniversalMasterSchedule;
