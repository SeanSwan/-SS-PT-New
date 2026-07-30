/**
 * FILE: canonical-surface-names.ts
 * PURPOSE: Machine-readable single source of truth for product surface
 * naming (SUPER-PROMPT §4 naming streamline). ONE user-facing name per
 * surface — sidebars, route titles, coach labels, teach-me guides, and
 * tests consume these entries instead of re-typing strings.
 * LAW: If a surface needs a different display name somewhere, that is a
 * naming-law change — update THIS file, never fork a local string.
 * Naming ruling receipts: docs/ai-workflow/brainstorms/lane1-b-pack-p0-slice-plan-2026-07-13.md §3.
 */

export type SurfaceRole = 'admin' | 'trainer' | 'client';

export interface CanonicalSurface {
  /** Stable kebab-case surface id (matches the route slug where one exists). */
  id: string;
  /** THE one user-facing name for this surface. */
  name: string;
  /** Absolute dashboard route per role that mounts this surface. */
  routes: Partial<Record<SurfaceRole, string>>;
  /** Role-appropriate one-line subtitle (sidebar / nav descriptions). */
  subtitles: Partial<Record<SurfaceRole, string>>;
  /** Stable test id for QA hooks. */
  testId: string;
  /** Default accessible label for links/buttons that open the surface. */
  ariaLabel: string;
}

export const CANONICAL_SURFACES = {
  workoutPlanner: {
    id: 'workout-planner',
    name: 'Workout Planner',
    routes: {
      admin: '/dashboard/admin/workout-planner',
      trainer: '/dashboard/trainer/workout-planner',
    },
    subtitles: {
      admin: 'Program lab for plans, templates, rolodex, and AI generation',
      trainer: 'Build, review, and assign client training programs',
    },
    testId: 'surface-workout-planner',
    ariaLabel: 'Open Workout Planner',
  },
  // Workout-OS C7 (2026-07-29): the Build Plan surface (TrainerWorkoutForgePage)
  // was retired as a strict subset of the Workout Planner. The key stays so
  // legacy consumers resolve, but it now points at the planner mount; the old
  // /build-plan and /workout-forge URLs redirect there preserving query params.
  buildPlan: {
    id: 'build-plan',
    name: 'Build Plan',
    routes: { trainer: '/dashboard/trainer/workout-planner' },
    subtitles: { trainer: 'Absorbed into Workout Planner (C7)' },
    testId: 'surface-build-plan',
    ariaLabel: 'Open Build Plan',
  },
  logWorkout: {
    id: 'log-workout',
    name: 'Log Workout',
    routes: { client: '/dashboard/client/log-workout' },
    subtitles: { client: 'Log your workout session' },
    testId: 'surface-log-workout',
    ariaLabel: 'Open Log Workout',
  },
  logClientWorkout: {
    id: 'log-client-workout',
    name: 'Log Client Workout',
    routes: {
      trainer: '/dashboard/trainer/log-workout',
      admin: '/dashboard/admin/log-workout',
    },
    subtitles: {
      trainer: 'NASM-compliant workout logging for assigned clients',
      admin: 'Log a workout through the Client Hub logger',
    },
    testId: 'surface-log-client-workout',
    ariaLabel: 'Open Log Client Workout',
  },
  logMyWorkout: {
    id: 'log-my-workout',
    name: 'Log My Workout',
    routes: { admin: '/dashboard/admin/log-my-workout' },
    subtitles: { admin: 'Owner personal workout logger' },
    testId: 'surface-log-my-workout',
    ariaLabel: 'Open Log My Workout',
  },
  myWorkouts: {
    id: 'my-workouts',
    name: 'My Workouts',
    routes: { client: '/dashboard/client/workouts' },
    subtitles: { client: 'Workout history with per-set detail' },
    testId: 'surface-my-workouts',
    ariaLabel: 'Open My Workouts',
  },
} as const satisfies Record<string, CanonicalSurface>;

export type CanonicalSurfaceKey = keyof typeof CANONICAL_SURFACES;

/** THE one name for a surface. */
export const surfaceName = (key: CanonicalSurfaceKey): string => CANONICAL_SURFACES[key].name;

/** Role route for a surface (undefined when the role has no mount). */
export const surfaceRoute = (key: CanonicalSurfaceKey, role: SurfaceRole): string | undefined =>
  CANONICAL_SURFACES[key].routes[role];
