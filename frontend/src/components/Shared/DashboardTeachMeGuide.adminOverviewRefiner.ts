/**
 * SHARED LOGIC: Admin overview Teach Me route refiner.
 * PURPOSE: Teaches the mounted admin overview as the First Moves launcher, not
 * a write surface, so operators start with Coach, client logging, owner logging,
 * or onboarding before moving into deeper source screens.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch } from './DashboardTeachMeGuide.routeRefiners.shared';

export const adminOverviewTriage = (
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => applyPatch(base, {
  eyebrow: 'Teach admin triage',
  title: 'Admin overview first moves',
  summary: 'Use Command Center Overview as the first-screen launcher: Coach Command, client logging, owner workout logging, and onboarding are the first moves.',
  focus: 'Follow the First Moves rail before hunting through tabs: Coach stages, Client Hub logs client work, My Workout handles owner training, and onboarding starts new clients.',
  primaryAction: { label: 'Coach Command', to: '/dashboard/admin/coach-assistant' },
  fastPath: [
    'Step 1: Coach Command.',
    'Step 2: Log Client.',
    'Step 3: My Workout, then onboard when needed.',
  ],
  steps: [
    'Step 1: open Coach Command when the job needs a staged client, owner, PLAUD, or planning action.',
    'Step 2: use Log Client when the work belongs to a client record and needs the logger or Client Hub.',
    'Step 3: use My Workout when Sean is training as his own client, then use Onboard Client when the person is not ready for training yet.',
    'Do not write from overview. Finish the save, approval, message, or billing check inside the source screen that owns the record.',
  ],
  actions: [
    { label: 'Coach Command', to: '/dashboard/admin/coach-assistant' },
    { label: 'Log Client', to: '/dashboard/admin/client-management?intent=log_workout' },
    { label: 'My Workout', to: '/dashboard/admin/log-my-workout?loadPlan=today' },
    { label: 'Onboard Client', to: '/dashboard/admin/client-onboarding' },
    { label: 'Orders', to: '/dashboard/admin/pending-orders' },
    { label: 'Sessions', to: '/dashboard/admin/admin-sessions' },
    { label: 'Revenue', to: '/dashboard/admin/revenue' },
  ],
  primaryPrompt: 'teach me the admin overview first moves workflow',
});
