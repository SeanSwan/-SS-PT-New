/**
 * SHARED LOGIC: Public user dashboard Teach Me route refiners.
 * PURPOSE: Keeps Creative, community, and profile teaching tied to real training
 * proof instead of turning the public dashboard into disconnected social tabs.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

type GuideAction = DashboardTeachMeGuideCopy['actions'][number];

const askCoach: GuideAction = { label: 'Ask Coach', to: '/dashboard/client/coach-assistant' };
const logWorkout: GuideAction = { label: 'Log Workout', to: '/dashboard/client/log-workout?loadPlan=today' };
const logTodayWorkout: GuideAction = { label: "Log Today's Workout", to: '/dashboard/client/log-workout?loadPlan=today' };
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

const isUserHomePath = (path: string): boolean => (
  path === '/user-dashboard' || path.includes('#home')
);

export const refineUserGuide = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (isUserHomePath(path)) {
    return applyPatch(base, {
      title: 'User home daily command',
      summary: 'Use Home as the fastest training cockpit: Command Strip, real proof, Daily Health Loop, Coach, and share-after-log stay together.',
      focus: 'Start from the training command strip. Log first, read proof, use Coach for the smallest next action, then share only after the work is saved.',
      primaryAction: logWorkout,
      primaryPrompt: 'teach me the user home daily command workflow',
      fastPath: [
        'Step 1: Log Workout.',
        'Step 2: View Progress.',
        'Step 3: Ask Coach, then share after the work is logged.',
      ],
      steps: [
        'Step 1: use HomeTrainingCommandStrip to start Log Workout instead of hunting through tabs.',
        'Step 2: open Progress and Training Proof to see whether the story is current or missing a saved workout.',
        'Step 3: ask Coach for a quick next-action check, but do not treat Coach text as a logged workout.',
        'Use Creative or share proof only after the workout is saved and the progress story is truthful.',
      ],
      actions: actionRail(logWorkout, { label: 'Creative', to: '/user-dashboard/creative' }),
    });
  }

  if (includesAny(path, ['photos'])) {
    const primaryAction = { label: 'Open Photo Library', to: '/user-dashboard/photos' };
    return applyPatch(base, {
      title: 'Photo library flow',
      summary: 'Use the Photo Library to browse uploaded photos once, then reuse them across profile, progress, and creative posts.',
      focus: 'Keep uploaded photos easy to find, then tie the useful ones back to real training progress.',
      primaryAction,
      actions: actionRail(primaryAction, { label: 'Open Creative', to: '/user-dashboard/creative' }),
      primaryPrompt: 'teach me the user photo library workflow for finding uploaded photos and reusing them with logged workout proof',
      fastPath: [
        'Open the uploaded photo.',
        'Reuse it where it supports the profile or training proof.',
        'Share only the useful milestone.',
      ],
    });
  }

  if (includesAny(path, ['creative', 'studio'])) {
    const primaryAction = { label: 'Open Creative', to: '/user-dashboard/creative' };
    return applyPatch(base, {
      title: 'Creative proof flow',
      summary: 'Use Creative after the training proof exists so creative posts reinforce the real transformation.',
      focus: 'Package progress, photos, and creative expression after the workout story is current.',
      primaryAction,
      actions: actionRail(primaryAction, { label: 'Open Photo Library', to: '/user-dashboard/photos' }),
      primaryPrompt: 'teach me the user creative workflow for turning logged progress into clean creative proof',
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
      actions: actionRail(primaryAction, { label: 'Open Creative', to: '/user-dashboard/creative' }),
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
    const primaryAction = logTodayWorkout;
    return applyPatch(base, {
      title: 'User workout proof loop',
      summary: 'Use the Progress tab as Exercise Usage: read logged workout history, hit Log Today, or ask Coach what to train next.',
      focus: "Start from the logged workout history, then save today's workout before using Coach or sharing the proof.",
      primaryAction,
      actions: [
        primaryAction,
        askCoach,
        { label: 'Progress Tab', to: '/user-dashboard/progress' },
        home,
      ],
      primaryPrompt: "teach me the progress workouts tab. Help me read Exercise Usage, choose Log Today or Ask Coach, and save today's session safely.",
      fastPath: [
        'Read Exercise Usage.',
        'Choose Log Today or Ask Coach.',
        "Save today's session before sharing proof.",
      ],
      steps: [
        'Use Exercise Usage to see which movements and categories are actually logged.',
        'Tap Log Today when the workout already happened so charts and Coach stay truthful.',
        'Use Ask Coach when the history should shape the next workout, then save the chosen work in the logger.',
        'Return to Home after the workout is logged so sharing and community actions point to current proof.',
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
