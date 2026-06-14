/**
 * SHARED LOGIC: Public user dashboard Teach Me route refiners.
 * PURPOSE: Keeps Studio, community, and profile teaching tied to real training
 * proof instead of turning the public dashboard into disconnected social tabs.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

export const refineUserGuide = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (includesAny(path, ['creative', 'studio', 'photos'])) {
    return applyPatch(base, {
      title: 'Studio proof flow',
      summary: 'Use Studio after the training proof exists so creative posts reinforce the real transformation.',
      focus: 'Package progress, photos, and creative expression after the workout story is current.',
      primaryAction: { label: 'Open Studio', to: '/user-dashboard/creative' },
      fastPath: [
        'Confirm the training proof.',
        'Pick the media or creative piece.',
        'Share the clean milestone.',
      ],
    });
  }

  if (includesAny(path, ['challenges'])) {
    return applyPatch(base, {
      title: 'Challenge flow',
      summary: 'Use Challenges to turn real training proof into public accountability.',
      focus: 'Join or review challenges after your workout proof is current so the competition stays truthful.',
      primaryAction: { label: 'Open Challenges', to: '/user-dashboard/challenges' },
      fastPath: [
        'Check active challenges.',
        'Log the proof behind the result.',
        'Share the milestone.',
      ],
    });
  }

  if (includesAny(path, ['friends'])) {
    return applyPatch(base, {
      title: 'Friends flow',
      primaryAction: { label: 'Open Friends', to: '/user-dashboard/friends' },
      fastPath: [
        'Find the right people.',
        'React to real progress.',
        'Bring them back to training.',
      ],
    });
  }

  if (includesAny(path, ['notifications'])) {
    return applyPatch(base, {
      title: 'Notification triage',
      summary: 'Use notifications as a short queue of actions, then return to training proof.',
      focus: 'React to what matters, ignore noise, and move the next real action into training, progress, or messages.',
      primaryAction: { label: 'Open Notifications', to: '/user-dashboard/notifications' },
      fastPath: [
        'Scan the newest signal.',
        'Act only on the real item.',
        'Return to training proof.',
      ],
    });
  }

  if (includesAny(path, ['nutrition'])) {
    return applyPatch(base, {
      title: 'Nutrition support',
      summary: 'Use nutrition to support training energy, recovery, and consistency.',
      focus: 'Connect food context to the current training goal, then ask Coach or log the next workout.',
      primaryAction: { label: 'Open Nutrition', to: '/user-dashboard/nutrition' },
      fastPath: [
        'Log the food context.',
        'Compare it with the training goal.',
        'Ask Coach what to adjust.',
      ],
    });
  }

  if (includesAny(path, ['reels'])) {
    return applyPatch(base, {
      title: 'Reels proof flow',
      primaryAction: { label: 'Open Reels', to: '/user-dashboard/reels' },
      fastPath: [
        'Pick the training moment.',
        'Keep the story specific.',
        'Bring viewers back to progress.',
      ],
    });
  }

  if (includesAny(path, ['about'])) {
    return applyPatch(base, {
      title: 'About proof setup',
      primaryAction: { label: 'Open About', to: '/user-dashboard/about' },
      fastPath: [
        'Update the identity detail.',
        'Connect it to training.',
        'Return to progress proof.',
      ],
    });
  }

  if (includesAny(path, ['progress', 'activity'])) {
    return applyPatch(base, {
      title: 'User progress proof',
      primaryAction: { label: 'Review Progress', to: '/user-dashboard/progress' },
      fastPath: [
        'Check the training proof.',
        'Find the next gap.',
        'Share only meaningful progress.',
      ],
    });
  }

  if (includesAny(path, ['profile'])) {
    return applyPatch(base, {
      title: 'Profile proof setup',
      focus: 'Use profile changes to support identity and accountability, then return to training proof.',
      primaryAction: { label: 'Open Profile', to: '/user-dashboard/profile' },
      fastPath: [
        'Update the public-facing detail.',
        'Check progress proof.',
        'Share only what supports the training story.',
      ],
    });
  }

  return base;
};
