/**
 * Universal Master Schedule Hooks - Index (REFACTORED)
 * ===================================================
 * Central export point for all custom hooks used in the Universal Master Schedule
 * 
 * ARCHITECTURE: Specialized Hook Pattern
 * - Each hook has a single, well-defined responsibility
 * - Clean separation of concerns for maintainability
 * - Optimized for performance and testability
 */

// Core Data Management Hooks
export { useCalendarState } from './useCalendarState';
export { useCalendarData } from './useCalendarData';
export { useCalendarHandlers } from './useCalendarHandlers';
export { useBulkOperations } from './useBulkOperations';
export { useBusinessIntelligence } from './useBusinessIntelligence';

// NEW: Real-time & Collaboration Hooks (Phase 3)
export { useFilteredCalendarEvents } from './useFilteredCalendarEvents';
export { useRealTimeUpdates } from './useRealTimeUpdates';
export { useAdminNotifications } from './useAdminNotifications';
export { useCollaborativeScheduling } from './useCollaborativeScheduling';

// PHASE 2: Mobile-First Responsive Optimization Hooks
export { useMobileCalendarOptimization } from './useMobileCalendarOptimization';

// Type exports for external consumption
export type { CalendarStateValues, CalendarStateActions } from './useCalendarState';
export type { CalendarDataValues, CalendarDataActions } from './useCalendarData';
export type { CalendarHandlersValues, CalendarHandlersActions } from './useCalendarHandlers';
export type { BulkOperationsValues, BulkOperationsActions } from './useBulkOperations';
export type { 
  BusinessIntelligenceValues, 
  BusinessIntelligenceActions,
  BusinessMetrics,
  ExecutiveKPIs 
} from './useBusinessIntelligence';

// NEW: Real-time & Collaboration Hook Types (Phase 3)
export type { 
  FilteredCalendarEventsValues, 
  FilteredCalendarEventsActions 
} from './useFilteredCalendarEvents';
export type { 
  RealTimeUpdatesValues, 
  RealTimeUpdatesActions 
} from './useRealTimeUpdates';
export type {
  AdminNotificationValues,
  AdminNotificationActions,
  AdminNotification,
  NotificationPreferences,
  NotificationPriority,
  NotificationCategory
} from './useAdminNotifications';
export type {
  CollaborativeSchedulingValues,
  CollaborativeSchedulingActions,
  CollaborativeUser,
  CollaborationConflict,
  LiveMessage
} from './useCollaborativeScheduling';

// PHASE 2: Mobile Optimization Hook Types
export type {
  MobileCalendarState,
  MobileCalendarActions,
  MobileCalendarOptimizations
} from './useMobileCalendarOptimization';
