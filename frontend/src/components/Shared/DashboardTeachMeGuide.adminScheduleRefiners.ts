import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

const adminSchedulePrimaryAction = (path: string) => {
  if (includesAny(path, ['master-schedule'])) return { label: 'Open Master Schedule', to: '/dashboard/admin/master-schedule' };
  if (includesAny(path, ['session-allocation'])) return { label: 'Manage Session Allocation', to: '/dashboard/admin/session-allocation' };
  return { label: 'Review Sessions', to: '/dashboard/admin/admin-sessions' };
};

export const adminScheduleControl = (
  path: string,
  base: DashboardTeachMeGuideCopy,
) => {
  const primaryAction = adminSchedulePrimaryAction(path);
  return applyPatch(base, {
    eyebrow: 'Teach the schedule loop',
    title: 'Admin schedule control',
    summary: 'Use schedule routes to connect booked time, trainer assignment, session credits, and client follow-up.',
    focus: 'Check the appointment, trainer, client, and credit state together so scheduling does not drift from billing truth.',
    primaryAction,
    fastPath: [
      'Find the booked session.',
      'Confirm trainer, client, and credit state.',
      'Adjust schedule or allocation.',
    ],
    actions: [
      primaryAction,
      { label: 'Master Schedule', to: '/dashboard/admin/master-schedule' },
      { label: 'Session Allocation', to: '/dashboard/admin/session-allocation' },
      { label: 'Client Hub', to: '/dashboard/admin/client-management' },
    ],
    primaryPrompt: 'teach me the admin schedule workflow',
  });
};
