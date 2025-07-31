/**
 * Universal Master Schedule Hooks - Index
 * ======================================
 * Central export point for all custom hooks used in the Universal Master Schedule
 */

// Core Hooks
export { useCalendarState } from './useCalendarState';
export { useCalendarData } from './useCalendarData';
export { useCalendarHandlers } from './useCalendarHandlers';
export { useBulkOperations } from './useBulkOperations';
export { useBusinessIntelligence } from './useBusinessIntelligence';

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
