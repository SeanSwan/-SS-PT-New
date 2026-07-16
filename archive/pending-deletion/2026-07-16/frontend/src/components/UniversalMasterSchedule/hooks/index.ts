/**
 * Universal Master Schedule Hooks - Index (PHASE 3: UI/UX EXCELLENCE)
 * ====================================================================
 * Central export point for all custom hooks used in the Universal Master Schedule
 * 
 * ARCHITECTURE: Specialized Hook Pattern
 * - Each hook has a single, well-defined responsibility
 * - Clean separation of concerns for maintainability
 * - Optimized for performance and testability
 * 
 * PHASE 3 ENHANCEMENTS:
 * ✅ Advanced Micro-interactions
 * ✅ Haptic Feedback System
 * ✅ Performance Optimization
 * ✅ Accessibility Enhancements
 */

// Core Data Management Hooks
export { useCalendarState } from './useCalendarState';
export { useCalendarData } from './useCalendarData';
export { useCalendarHandlers } from './useCalendarHandlers';
export { useBulkOperations } from './useBulkOperations';
export { useBusinessIntelligence } from './useBusinessIntelligence';

// Real-time & Collaboration Hooks (Phase 2/3)
export { useFilteredCalendarEvents } from './useFilteredCalendarEvents';
export { useRealTimeUpdates } from './useRealTimeUpdates';
export { useAdminNotifications } from './useAdminNotifications';
export { useCollaborativeScheduling } from './useCollaborativeScheduling';

// PHASE 2: Mobile-First Responsive Optimization Hooks
export { useMobileCalendarOptimization } from './useMobileCalendarOptimization';

// PHASE 3: UI/UX Excellence Hooks
export { useMicroInteractions } from './useMicroInteractions';

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

// Real-time & Collaboration Hook Types (Phase 2/3)
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

// PHASE 3: UI/UX Excellence Hook Types
export type {
  UseMicroInteractionsReturn,
  HapticType,
  AnimationType,
  SoundType,
  MicroInteractionOptions
} from './useMicroInteractions';
