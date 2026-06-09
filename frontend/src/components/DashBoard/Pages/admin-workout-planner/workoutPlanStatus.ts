/**
 * Workout-plan status helpers for admin/trainer planning surfaces.
 *
 * Backend paths can return legacy casing such as "ACTIVE"; UI decisions should
 * treat those as current without mutating the display value.
 */
export const isWorkoutPlanActiveStatus = (status: string | null | undefined) => (
  String(status || '').trim().toLowerCase() === 'active'
);
