/**
 * SHARED LOGIC: Client overview social-tab Teach Me refiners.
 * PURPOSE: Keeps /dashboard/client/overview/:tab guidance tied to logged
 * training proof instead of falling back to generic client dashboard copy.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

type ClientOverviewTab = 'reels' | 'friends' | 'challenges';

const tabConfig: Record<ClientOverviewTab, { title: string; label: string; prompt: string }> = {
  reels: {
    title: 'Client reels proof',
    label: 'Open Reels',
    prompt: 'teach me the client reels workflow for turning logged training into useful proof',
  },
  friends: {
    title: 'Client friends accountability',
    label: 'Open Friends',
    prompt: 'teach me the client friends workflow for support that leads back to training',
  },
  challenges: {
    title: 'Client challenge proof',
    label: 'Open Challenges',
    prompt: 'teach me the client challenge workflow for competing from real logged progress',
  },
};

function overviewTab(path: string): ClientOverviewTab | null {
  if (includesAny(path, ['overview/reels'])) return 'reels';
  if (includesAny(path, ['overview/friends'])) return 'friends';
  if (includesAny(path, ['overview/challenges'])) return 'challenges';
  return null;
}

function isOverviewRoot(path: string): boolean {
  return path === '/dashboard/client/overview'
    || path.startsWith('/dashboard/client/overview?')
    || path.startsWith('/dashboard/client/overview#');
}

export function refineClientOverviewGuide(
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy | null {
  const tab = overviewTab(path);
  if (!tab && isOverviewRoot(path)) {
    return applyPatch(base, {
      title: 'Client daily command',
      summary: 'Use client Home as the daily command center: current workout, Coach This, Plan Vault, progress, booking, and social proof stay together.',
      focus: 'Start with the Current Workout card. Log the assigned work first, ask Coach only for a next-action check, then review progress or book before sharing.',
      primaryAction: { label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' },
      fastPath: [
        'Start with Current Workout.',
        'Use Coach This or Plan Vault.',
        'Book or share only after logging.',
      ],
      steps: [
        'Use the Current Workout card to log the assigned workout or review the plan that owns today.',
        'Tap Coach This when you need an explanation or next-action check, but save the actual workout in Logger.',
        'Use Training Plan Vault to inspect the plan horizon before assuming today is a free-build workout.',
        'Do not treat overview as the saved record. Finish logging, progress review, booking, or sharing in the owning screen.',
      ],
      actions: [
        { label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' },
        { label: 'Coach This', to: '/dashboard/client/coach-assistant' },
        { label: 'Plan Vault', to: '/dashboard/client/overview' },
        { label: 'Progress', to: '/dashboard/client/progress' },
        { label: 'Book Session', to: '/dashboard/client/schedule' },
      ],
      primaryPrompt: 'teach me the client overview daily command workflow',
    });
  }
  if (!tab) return null;
  const config = tabConfig[tab];
  const to = `/dashboard/client/overview/${tab}`;

  return applyPatch(base, {
    title: config.title,
    summary: 'Use this overview tab after the workout story is current so social proof, support, and competition stay tied to real training.',
    focus: 'Log or review the training proof first, then use this tab to reinforce the next action instead of distracting from it.',
    primaryAction: { label: config.label, to },
    fastPath: [
      'Confirm the training proof.',
      'Open the tab-specific social action.',
      'Return to logging or progress before the story gets stale.',
    ],
    actions: [
      { label: config.label, to },
      { label: "Log Today's Workout", to: '/dashboard/client/log-workout?loadPlan=today' },
      { label: 'Progress', to: '/dashboard/client/progress' },
      { label: 'Ask Coach', to: '/dashboard/client/coach-assistant' },
    ],
    primaryPrompt: config.prompt,
  });
}
