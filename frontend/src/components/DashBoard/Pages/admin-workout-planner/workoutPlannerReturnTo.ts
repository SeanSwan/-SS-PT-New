export type WorkoutPlannerReturnRole = string | null | undefined;
export type WorkoutPlannerReturnLabelMode = 'back' | 'return';

const UNSAFE_RETURN_TO_PATTERN = /[\r\n\t\\]|%(?:0a|0d|09|2e|2f|5c)/i;

const returnTargetPathname = (returnTo: string | null | undefined): string => (
  String(returnTo || '').split(/[?#]/, 1)[0]
);

const returnLabelPrefix = (mode: WorkoutPlannerReturnLabelMode): string => (
  mode === 'back' ? 'Back to' : 'Return to'
);

export const isWorkoutPlannerPersonalLoggerRoute = (returnTo: string | null | undefined): boolean => (
  returnTargetPathname(returnTo) === '/dashboard/admin/log-my-workout'
);

export const workoutPlannerReturnLabel = (
  returnTo: string | null | undefined,
  mode: WorkoutPlannerReturnLabelMode = 'return',
): string => {
  const prefix = returnLabelPrefix(mode);
  const pathname = returnTargetPathname(returnTo);

  if (pathname === '/dashboard/admin/log-my-workout' || pathname === '/dashboard/trainer/log-workout') {
    return `${prefix} Workout Logger`;
  }
  if (pathname.startsWith('/dashboard/admin/client-management')) return `${prefix} Client Hub`;
  if (pathname.startsWith('/dashboard/trainer/')) return `${prefix} Trainer Dashboard`;
  if (pathname.startsWith('/dashboard/admin/')) return `${prefix} Admin Dashboard`;
  if (pathname.startsWith('/dashboard/client/')) return `${prefix} Client Dashboard`;
  return `${prefix} Dashboard`;
};

const roleDashboardPrefix = (userRole: WorkoutPlannerReturnRole): string | null => {
  const normalizedRole = typeof userRole === 'string' ? userRole.toLowerCase() : '';
  if (normalizedRole === 'admin') return '/dashboard/admin/';
  if (normalizedRole === 'trainer') return '/dashboard/trainer/';
  if (normalizedRole === 'client') return '/dashboard/client/';
  return null;
};

const hasDotOrDoubleSlashSegment = (value: string): boolean => {
  const pathname = value.split(/[?#]/, 1)[0];
  return pathname.includes('//') || pathname.split('/').some((segment) => segment === '.' || segment === '..');
};

export const resolveWorkoutPlannerReturnTo = (
  rawReturnTo: string | null | undefined,
  userRole: WorkoutPlannerReturnRole,
): string | null => {
  const prefix = roleDashboardPrefix(userRole);
  const returnTo = rawReturnTo?.trim();

  if (!prefix || !returnTo) return null;
  if (!returnTo.startsWith(prefix)) return null;
  if (UNSAFE_RETURN_TO_PATTERN.test(returnTo)) return null;
  if (hasDotOrDoubleSlashSegment(returnTo)) return null;

  return returnTo;
};