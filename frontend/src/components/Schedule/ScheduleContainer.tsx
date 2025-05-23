/**
 * ScheduleContainer.tsx
 * 
 * This file serves as a passthrough to the enhanced schedule.tsx component,
 * which contains the updated calendar implementation with:
 * - 30px spacing for improved readability
 * - Enhanced tools for easier schedule reading
 * - Blocking functionality for trainers and admins to create their own schedules
 * - Accessibility improvements
 */

import UnifiedCalendar from './schedule';

// Simply re-export the UnifiedCalendar component under the ScheduleContainer name
// This ensures backward compatibility with existing imports
const ScheduleContainer = UnifiedCalendar;

export default ScheduleContainer;
