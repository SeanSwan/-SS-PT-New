/**
 * SHARED LOGIC: Admin Teach Me care and trust route refiners.
 * PURPOSE: Keeps client-care and access-control guidance isolated from the
 * main admin route router so new dashboard lessons remain maintainable.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

export const adminClientHubCommand = (
  base: DashboardTeachMeGuideCopy,
) => applyPatch(base, {
  eyebrow: 'Teach Client Hub',
  title: 'Admin Client Hub command',
  summary: 'Use Client Hub as the one-client cockpit for training state, workout logging, progress proof, plans, notes, and Coach handoff.',
  focus: 'Choose the client first, keep the Training tab as home base, then log, review progress, plan, or ask Coach without jumping into disconnected admin tools.',
  primaryAction: {
    label: 'Open Client Hub Training',
    to: '/dashboard/admin/client-management?tab=training',
  },
  fastPath: [
    'Choose the client record.',
    'Open the Training tab.',
    'Log, review progress, plan, or ask Coach.',
  ],
  steps: [
    'Start by selecting the client so workout history, notes, sessions, and Coach context belong to the right record.',
    'Use Training as the hub for logging, plan review, progress proof, and workout notes before switching to separate admin tools.',
    'Send unclear workout questions to Coach, but save final training changes only after the client, date, and work performed are verified.',
  ],
  actions: [
    { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
    { label: 'Log Client Workout', to: '/dashboard/admin/client-management?intent=log_workout' },
    { label: 'Workout Planner', to: '/dashboard/admin/workout-planner' },
    { label: 'Ask Coach', to: '/dashboard/admin/coach-assistant' },
    { label: 'Client Progress', to: '/dashboard/admin/client-progress-tracking' },
  ],
  primaryPrompt: 'teach me the admin Client Hub training workflow',
});

const adminClientCarePrimaryAction = (path: string) => {
  if (includesAny(path, ['meal-planner', 'nutrition'])) {
    return { label: 'Open Nutrition', to: '/dashboard/admin/meal-planner' };
  }
  if (includesAny(path, ['messages'])) {
    return { label: 'Open Messages', to: '/dashboard/admin/messages' };
  }
  if (includesAny(path, ['video-call', 'videos'])) {
    return { label: 'Open Video Assessment', to: '/dashboard/admin/video-call' };
  }
  if (includesAny(path, ['photos'])) {
    return { label: 'Open Photos', to: '/dashboard/admin/photos' };
  }
  if (includesAny(path, ['notes'])) {
    return { label: 'Open Notes', to: '/dashboard/admin/notes' };
  }
  return { label: 'Open Pain Chart', to: '/dashboard/admin/body-map' };
};

export const adminClientCareLoop = (
  path: string,
  base: DashboardTeachMeGuideCopy,
) => applyPatch(base, {
  eyebrow: 'Teach client care',
  title: 'Admin client care loop',
  summary: 'Use admin-as-trainer tools to turn pain, nutrition, messages, and assessment signals into the next client action.',
  focus: 'Pick the client signal first, connect it to training context, then decide whether the next move is log, plan, message, or schedule.',
  primaryAction: adminClientCarePrimaryAction(path),
  fastPath: [
    'Find the client signal.',
    'Tie it to training context.',
    'Log, message, schedule, or adjust.',
  ],
  actions: [
    { label: 'Pain Chart', to: '/dashboard/admin/body-map' },
    { label: 'Nutrition', to: '/dashboard/admin/meal-planner' },
    { label: 'Messages', to: '/dashboard/admin/messages' },
    { label: 'Video Assessment', to: '/dashboard/admin/video-call' },
    { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
  ],
  primaryPrompt: 'teach me the admin client care workflow',
});

export const adminTrustAndAccess = (
  base: DashboardTeachMeGuideCopy,
) => applyPatch(base, {
  eyebrow: 'Teach trust operations',
  title: 'Admin trust and access',
  summary: 'Use trust routes to verify security posture, feature access, waivers, and communication logs before granting or changing access.',
  focus: 'Protect the business before moving fast: confirm access, consent, waiver state, and delivery evidence.',
  primaryAction: { label: 'Review Security', to: '/dashboard/admin/security' },
  fastPath: [
    'Check security and access posture.',
    'Confirm consent, waiver, or delivery evidence.',
    'Adjust access only after the record is clear.',
  ],
  actions: [
    { label: 'Security', to: '/dashboard/admin/security' },
    { label: 'Feature Access', to: '/dashboard/admin/feature-access' },
    { label: 'Waivers', to: '/dashboard/admin/waivers' },
    { label: 'SMS Logs', to: '/dashboard/admin/sms-logs' },
  ],
  primaryPrompt: 'teach me the admin trust and access workflow',
});
