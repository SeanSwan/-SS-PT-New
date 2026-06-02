/**
 * Shared session form options for create and edit workflows.
 */

export const SESSION_DURATION_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 minutes (1 hour)' },
  { value: '90', label: '90 minutes (1.5 hours)' },
  { value: '120', label: '120 minutes (2 hours)' },
] as const;

export const SESSION_LOCATION_OPTIONS = [
  { value: 'Main Studio', label: 'Main Studio' },
  { value: 'Park', label: 'Park' },
  { value: 'Home', label: 'Home' },
  { value: 'Office', label: 'Office' },
  { value: '__custom__', label: 'Other (Custom)' },
] as const;
