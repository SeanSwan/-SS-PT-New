/**
 * SHARED LOGIC: Admin self Build Plan Teach Me refiner.
 * PURPOSE: Keeps Sean's owner-plan workflow distinct from client workout
 * programming when the admin Plan Library opens with self mode enabled.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

export const isAdminSelfPlannerRoute = (path: string) => (
  path.includes('workout-planner')
  && includesAny(path, ['?self=1', '&self=1', '?self=true', '&self=true'])
);

export const adminSelfWorkoutPlanning = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach owner planning',
  title: 'Admin self workout planning',
  summary: 'Use this route when Sean is building his own training day inside the admin shell instead of programming for a client.',
  focus: 'Keep the target on your owner profile, build the plan, then move straight into Log My Workout so the workout becomes saved proof.',
  primaryAction: { label: 'Build My Plan', to: '/dashboard/admin/workout-planner?self=1' },
  fastPath: [
    'Keep the target on your owner profile.',
    "Build or generate today's plan.",
    'Save it or send it to Log My Workout.',
  ],
  steps: [
    'Confirm the Plan Library is in self mode before adding exercises so client programming and owner training do not mix.',
    'Build from the same constraints you would use for a client: goal, equipment, pain signals, schedule, and training phase.',
    'Use Swan Coach when you need a cleaner draft, then review the plan before saving it.',
    'Open Log My Workout after planning so sets, reps, load, and notes become real progress proof.',
  ],
  actions: [
    { label: 'Build My Plan', to: '/dashboard/admin/workout-planner?self=1' },
    { label: 'Log My Workout', to: '/dashboard/admin/log-my-workout?loadPlan=today' },
    { label: 'Ask Coach', to: '/dashboard/admin/coach-assistant' },
    { label: 'Plan Library', to: '/dashboard/admin/workout-planner' },
  ],
  primaryPrompt: 'teach me the admin self workout planning workflow',
});
