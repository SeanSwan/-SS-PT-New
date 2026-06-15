/**
 * SHARED LOGIC: Public user dashboard Teach Me route refiners.
 * PURPOSE: Keeps Studio, community, and profile teaching tied to real training
 * proof instead of turning the public dashboard into disconnected social tabs.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

type GuideAction = DashboardTeachMeGuideCopy['actions'][number];

const askCoach: GuideAction = { label: 'Ask Coach', to: '/dashboard/client/coach-assistant' };
const logWorkout: GuideAction = { label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' };
const progress: GuideAction = { label: 'Progress', to: '/user-dashboard/progress' };
const home: GuideAction = { label: 'Home', to: '/user-dashboard' };

const actionRail = (primaryAction: GuideAction, ...extras: GuideAction[]): GuideAction[] => {
  const seen = new Set<string>();
  return [primaryAction, ...extras, askCoach, logWorkout, progress, home].filter((action) => {
    const key = `${action.label}|${action.to}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const refineUserGuide = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (includesAny(path, ['photos'])) {
    const primaryAction = { label: 'Open Photos', to: '/user-dashboard/photos' };
    return applyPatch(base, {
      title: 'Photos proof flow',
      summary: 'Use Photos to keep transformation evidence organized after the workout proof is current.',
      focus: 'Tie photos to real training progress so the visual story stays useful, not random.',
      primaryAction,
      actions: actionRail(primaryAction, { label: 'Open Studio', to: '/user-dashboard/creative' }),
      primaryPrompt: 'teach me the user photos workflow for tying progress photos to logged workouts',
      fastPath: [
        'Pick the progress photo.',
        'Connect it to the training proof.',
        'Share only the useful milestone.',
      ],
    });
  }

  if (includesAny(path, ['creative', 'studio'])) {
    const primaryAction = { label: 'Open Studio', to: '/user-dashboard/creative' };
    return applyPatch(base, {
      title: 'Studio proof flow',
      summary: 'Use Studio after the training proof exists so creative posts reinforce the real transformation.',
      focus: 'Package progress, photos, and creative expression after the workout story is current.',
      primaryAction,
      actions: actionRail(primaryAction, { label: 'Open Photos', to: '/user-dashboard/photos' }),
      primaryPrompt: 'teach me the user studio workflow for turning logged progress into clean creative proof',
      fastPath: [
        'Confirm the training proof.',
        'Pick the media or creative piece.',
        'Share the clean milestone.',
      ],
    });
  }

  if (includesAny(path, ['challenges'])) {
    const primaryAction = { label: 'Open Challenges', to: '/user-dashboard/challenges' };
    return applyPatch(base, {
      title: 'Challenge flow',
      summary: 'Use Challenges to turn real training proof into public accountability.',
      focus: 'Join or review challenges after your workout proof is current so the competition stays truthful.',
      primaryAction,
      actions: actionRail(primaryAction, { label: 'Open Friends', to: '/user-dashboard/friends' }),
      primaryPrompt: 'teach me the user challenges workflow for joining accountability without losing training proof',
      fastPath: [
        'Check active challenges.',
        'Log the proof behind the result.',
        'Share the milestone.',
      ],
    });
  }

  if (includesAny(path, ['friends'])) {
    const primaryAction = { label: 'Open Friends', to: '/user-dashboard/friends' };
    return applyPatch(base, {
      title: 'Friends flow',
      summary: 'Use Friends to reinforce real training, not distract from it.',
      focus: 'React to useful progress signals, then return to your own training action.',
      primaryAction,
      actions: actionRail(primaryAction, { label: 'Open Challenges', to: '/user-dashboard/challenges' }),
      primaryPrompt: 'teach me the user friends workflow for finding support and getting back to training',
      fastPath: [
        'Find the right people.',
        'React to real progress.',
        'Bring them back to training.',
      ],
    });
  }

  if (includesAny(path, ['notifications'])) {
    const primaryAction = { label: 'Open Notifications', to: '/user-dashboard/notifications' };
    return applyPatch(base, {
      title: 'Notification triage',
      summary: 'Use notifications as a short queue of actions, then return to training proof.',
      focus: 'React to what matters, ignore noise, and move the next real action into training, progress, or messages.',
      primaryAction,
      actions: actionRail(primaryAction),
      primaryPrompt: 'teach me the user notifications workflow for handling alerts without losing the training loop',
      fastPath: [
        'Scan the newest signal.',
        'Act only on the real item.',
        'Return to training proof.',
      ],
    });
  }

  if (includesAny(path, ['nutrition'])) {
    const primaryAction = { label: 'Open Nutrition', to: '/user-dashboard/nutrition' };
    return applyPatch(base, {
      title: 'Nutrition support',
      summary: 'Use nutrition to support training energy, recovery, and consistency.',
      focus: 'Connect food context to the current training goal, then ask Coach or log the next workout.',
      primaryAction,
      actions: actionRail(primaryAction),
      primaryPrompt: 'teach me the user nutrition workflow for connecting food context to training progress',
      fastPath: [
        'Log the food context.',
        'Compare it with the training goal.',
        'Ask Coach what to adjust.',
      ],
    });
  }

  if (includesAny(path, ['reels'])) {
    const primaryAction = { label: 'Open Reels', to: '/user-dashboard/reels' };
    return applyPatch(base, {
      title: 'Reels proof flow',
      summary: 'Use Reels to share a clear training moment after the proof is logged.',
      focus: 'Keep the clip tied to a real workout, progress marker, or coaching lesson.',
      primaryAction,
      actions: actionRail(primaryAction, { label: 'Open Studio', to: '/user-dashboard/creative' }),
      primaryPrompt: 'teach me the user reels workflow for turning a training moment into useful proof',
      fastPath: [
        'Pick the training moment.',
        'Keep the story specific.',
        'Bring viewers back to progress.',
      ],
    });
  }

  if (includesAny(path, ['about'])) {
    const primaryAction = { label: 'Open About', to: '/user-dashboard/about' };
    return applyPatch(base, {
      title: 'About proof setup',
      summary: 'Use About to make the public profile explain the training journey clearly.',
      focus: 'Update identity details that support accountability, then return to progress proof.',
      primaryAction,
      actions: actionRail(primaryAction, { label: 'Open Profile', to: '/user-dashboard/profile' }),
      primaryPrompt: 'teach me the user about workflow for making the profile support training accountability',
      fastPath: [
        'Update the identity detail.',
        'Connect it to training.',
        'Return to progress proof.',
      ],
    });
  }

  if (includesAny(path, ['activity'])) {
    const primaryAction = { label: 'Review Activity', to: '/user-dashboard/activity' };
    return applyPatch(base, {
      title: 'Activity proof review',
      summary: 'Use Activity to see what changed recently and decide the next useful training action.',
      focus: 'Review the latest proof, spot the next gap, then log, ask Coach, or share only what matters.',
      primaryAction,
      actions: actionRail(primaryAction),
      primaryPrompt: 'teach me the user activity workflow for turning recent activity into the next training action',
      fastPath: [
        'Scan recent activity.',
        'Find the training signal.',
        'Take the next action.',
      ],
    });
  }

  if (includesAny(path, ['progress'])) {
    const primaryAction = { label: 'Review Progress', to: '/user-dashboard/progress' };
    return applyPatch(base, {
      title: 'User progress proof',
      summary: 'Use Progress as the source of truth before changing training or sharing proof.',
      focus: 'Read the chart, compare it to recent logs, and ask Coach what the next training action should be.',
      primaryAction,
      actions: actionRail(primaryAction),
      primaryPrompt: 'teach me the user progress workflow for reading training proof and choosing the next action',
      fastPath: [
        'Check the training proof.',
        'Find the next gap.',
        'Share only meaningful progress.',
      ],
    });
  }

  if (includesAny(path, ['profile'])) {
    const primaryAction = { label: 'Open Profile', to: '/user-dashboard/profile' };
    return applyPatch(base, {
      title: 'Profile proof setup',
      summary: 'Use Profile to keep public identity, proof, and training accountability aligned.',
      focus: 'Use profile changes to support identity and accountability, then return to training proof.',
      primaryAction,
      actions: actionRail(primaryAction, { label: 'Open About', to: '/user-dashboard/about' }),
      primaryPrompt: 'teach me the user profile workflow for keeping identity, proof, and training aligned',
      fastPath: [
        'Update the public-facing detail.',
        'Check progress proof.',
        'Share only what supports the training story.',
      ],
    });
  }

  return base;
};
