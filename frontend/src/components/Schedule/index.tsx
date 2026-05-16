/**
 * Schedule Component - Main Export File (UPDATED)
 * 
 * Compatibility entry point for older imports.
 *
 * The canonical implementation is UniversalSchedule, which delegates to
 * UniversalMasterSchedule and first-party API services.
 */

import ScheduleContainer from './ScheduleContainer';
import UnifiedCalendar from './schedule';
import UniversalSchedule from './UniversalSchedule';

import EnhancedScheduleWrapper from './EnhancedScheduleWrapper';

// Export the container as the default
export default ScheduleContainer;

// Also export individual components for compatibility
export { ScheduleContainer, UnifiedCalendar, EnhancedScheduleWrapper, UniversalSchedule };
