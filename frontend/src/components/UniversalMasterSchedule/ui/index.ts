/**
 * UI Components Index
 * ===================
 * Central export point for all reusable UI components
 */

// Typography
export * from './Typography';

// Buttons
export * from './StyledButton';

// Inputs
export * from './StyledInput';

// Cards & Layout
export * from './StyledCard';

// Loading
export { Spinner, LoadingContainer, InlineSpinner } from './Spinner';

// Skeletons (P1-14)
export {
  Skeleton,
  SkeletonCard,
  SessionCardSkeleton,
  SkeletonGrid,
  SkeletonRow,
  SkeletonTimeCell,
  SkeletonSlotCell,
  DayViewSkeleton,
  SkeletonDayCell,
  MonthViewSkeleton,
  AgendaSkeleton,
} from './Skeleton';

// Modal
export { Modal, ModalHeader, ModalBody, ModalFooter } from './CustomModal';
export type { ModalProps } from './CustomModal';

// Select
export { CustomSelect } from './CustomSelect';
export type { CustomSelectProps, SelectOption } from './CustomSelect';

// Time Picker
export { TimeWheelPicker } from './TimeWheelPicker';
export type { TimeWheelPickerProps } from './TimeWheelPicker';
export {
  combineDateAndTime,
  getLocalToday,
  getMinTimeForToday,
  getTimezoneAbbr,
  roundUpToStep,
  validateTimeRange,
} from './TimeWheelPicker';
