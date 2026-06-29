/**
 * SHARED LOGIC: Admin engagement Teach Me route refiners.
 * PURPOSE: Keeps gamification, competition, and sprint planning tied back to
 * truthful training proof instead of generic admin navigation.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

export const adminEngagementSystems = (
  path: string,
  base: DashboardTeachMeGuideCopy,
) => {
  if (includesAny(path, ['sprint-planner'])) {
    return applyPatch(base, {
      eyebrow: 'Teach sprint planning',
      title: 'Admin sprint planning',
      summary: 'Use sprint planning to turn the next 90 days into clear programming, content, and follow-up work.',
      focus: 'Keep the sprint connected to training proof: what clients need, what trainers must execute, and what should be measured.',
      primaryAction: { label: 'Open Sprint Planner', to: '/dashboard/admin/sprint-planner' },
      fastPath: [
        'Pick the sprint outcome.',
        'Attach training and content work.',
        'Review progress before the next sprint change.',
      ],
      actions: [
        { label: 'Sprint Planner', to: '/dashboard/admin/sprint-planner' },
        { label: 'Plan Library', to: '/dashboard/admin/workout-planner' },
        { label: 'Marketing', to: '/dashboard/admin/marketing' },
        { label: 'Client Progress', to: '/dashboard/admin/client-progress-tracking' },
      ],
      primaryPrompt: 'teach me the admin sprint planning workflow',
    });
  }

  const primaryAction = includesAny(path, ['virtual-olympics'])
    ? { label: 'Open Virtual Olympics', to: '/dashboard/admin/virtual-olympics' }
    : includesAny(path, ['my-home'])
      ? { label: 'Open My Home', to: '/dashboard/admin/my-home' }
      : { label: 'Open Gamification', to: '/dashboard/admin/gamification' };

  return applyPatch(base, {
    eyebrow: 'Teach engagement systems',
    title: 'Admin engagement engine',
    summary: 'Use engagement systems to turn real workout proof into rewards, competition, and retention loops.',
    focus: 'Do not reward noise. Check logged training truth first, then use achievements, competitions, and unlocks to pull people back into action.',
    primaryAction,
    fastPath: [
      'Confirm the training proof.',
      'Pick the reward or competition loop.',
      'Route the next client or trainer action.',
    ],
    actions: [
      { label: 'Gamification', to: '/dashboard/admin/gamification' },
      { label: 'Virtual Olympics', to: '/dashboard/admin/virtual-olympics' },
      { label: 'Client Progress', to: '/dashboard/admin/client-progress-tracking' },
      { label: 'Content Studio', to: '/dashboard/admin/content' },
    ],
    primaryPrompt: 'teach me the admin engagement workflow',
  });
};
