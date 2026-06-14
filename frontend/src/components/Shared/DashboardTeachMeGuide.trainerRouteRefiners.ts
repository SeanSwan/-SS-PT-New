/**
 * SHARED LOGIC: Trainer dashboard Teach Me route refiners.
 * PURPOSE: Keeps trainers one click from the client, builder, assessment,
 * intake, and communication jobs that make the floor workflow teachable.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

const trainerProgressReview = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer progress review',
  summary: 'Use progress review to decide whether the client needs logging cleanup, plan adjustment, scheduling, or follow-up.',
  focus: 'Read the last proof first: logged work, missed sessions, pain signals, and trend direction before changing the plan.',
  primaryAction: { label: 'Review Client Progress', to: '/dashboard/trainer/client-progress' },
  fastPath: [
    'Pick the client.',
    'Review logged proof and pain signals.',
    'Log, adjust, or message next.',
  ],
  actions: [
    { label: 'Client Progress', to: '/dashboard/trainer/client-progress' },
    { label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' },
    { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
    { label: 'Schedule', to: '/dashboard/trainer/schedule' },
  ],
  primaryPrompt: 'teach me the trainer progress workflow',
});

const trainerWorkoutLogging = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer workout logging',
  summary: 'Use this route to capture what actually happened while the session is still fresh.',
  focus: 'Log real sets, reps, load, pain notes, and completion context before switching into plan changes.',
  primaryAction: { label: 'Log Client Workout', to: '/dashboard/trainer/clients?intent=log_workout' },
  fastPath: [
    'Choose the client.',
    'Enter the performed work.',
    'Save notes and next action.',
  ],
  primaryPrompt: 'teach me the trainer workout logging workflow',
});

const trainerClientCommand = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer client command',
  summary: 'Use My Clients to pick the person first, then log, review, message, or adjust from the right record.',
  focus: 'Client choice comes before the action. Pick the client, then use the lowest-click path for logging or progress.',
  primaryAction: { label: 'Open My Clients', to: '/dashboard/trainer/clients' },
  fastPath: [
    'Pick the assigned client.',
    'Open their current training state.',
    'Log, review, message, or plan next.',
  ],
  actions: [
    { label: 'My Clients', to: '/dashboard/trainer/clients' },
    { label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' },
    { label: 'Progress', to: '/dashboard/trainer/client-progress' },
    { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
  ],
  primaryPrompt: 'teach me the trainer client workflow',
});

const trainerBuilderFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer workout build flow',
  summary: 'Use builder routes to turn the client goal, equipment, pain signals, and schedule into the next usable workout.',
  focus: 'Build only after the client context is clear; keep the result connected to logging and progress review.',
  primaryAction: { label: 'Build Client Workout', to: '/dashboard/trainer/workout-forge' },
  fastPath: [
    'Confirm client, goal, and constraints.',
    'Build or adjust the workout.',
    'Save it where logging can use it.',
  ],
  actions: [
    { label: 'Workout Forge', to: '/dashboard/trainer/workout-forge' },
    { label: 'Workout Planner', to: '/dashboard/trainer/workout-planner' },
    { label: 'Equipment', to: '/dashboard/trainer/equipment' },
    { label: 'Bootcamp', to: '/dashboard/trainer/bootcamp' },
  ],
  primaryPrompt: 'teach me the trainer workout builder workflow',
});

const trainerNutritionFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer nutrition support',
  summary: 'Use Nutrition when food context affects client energy, recovery, and plan adherence.',
  focus: 'Connect nutrition notes to the client goal, recent training proof, and the next coaching action.',
  primaryAction: { label: 'Open Nutrition', to: '/dashboard/trainer/meal-planner' },
  fastPath: [
    'Pick the client context.',
    'Review meal or macro signals.',
    'Tie the note back to training.',
  ],
  actions: [
    { label: 'Nutrition', to: '/dashboard/trainer/meal-planner' },
    { label: 'My Clients', to: '/dashboard/trainer/clients' },
    { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
    { label: 'Client Progress', to: '/dashboard/trainer/client-progress' },
  ],
  primaryPrompt: 'teach me the trainer nutrition workflow',
});

const trainerAssessmentFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer assessment loop',
  summary: 'Use assessment routes to capture form, pain, and movement signals before changing training load or exercise selection.',
  focus: 'Treat assessment evidence as a guardrail for the next workout, not as a separate note buried away from the plan.',
  primaryAction: { label: 'Open Assessments', to: '/dashboard/trainer/assessments' },
  fastPath: [
    'Capture the movement or pain signal.',
    'Attach it to the client context.',
    'Adjust the next training action.',
  ],
  actions: [
    { label: 'Assessments', to: '/dashboard/trainer/assessments' },
    { label: 'Pain Charts', to: '/dashboard/trainer/body-map' },
    { label: 'Video Assessment', to: '/dashboard/trainer/video-call' },
    { label: 'Progress', to: '/dashboard/trainer/client-progress' },
  ],
  primaryPrompt: 'teach me the trainer assessment workflow',
});

const trainerCommunicationFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer communication loop',
  summary: 'Use messages, PLAUD, and Coach intake to turn client context into a clear reviewed next action.',
  focus: 'Capture the signal, tie it to the client, then decide whether it becomes a log, plan change, message, or schedule task.',
  primaryAction: { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
  fastPath: [
    'Open the client signal.',
    'Review the staged action.',
    'Send, log, or schedule the follow-up.',
  ],
  actions: [
    { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
    { label: 'Messages', to: '/dashboard/trainer/messages' },
    { label: 'PLAUD', to: '/dashboard/trainer/plaud' },
    { label: 'Schedule', to: '/dashboard/trainer/schedule' },
  ],
  primaryPrompt: 'teach me the trainer communication workflow',
});

const trainerBroadcastFlow = (path: string, base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: includesAny(path, ['creators']) ? 'Trainer creator flow' : 'Trainer live flow',
  summary: 'Use broadcast and creator routes only after the training action is clear so content supports coaching instead of distracting from it.',
  focus: 'Connect the stream, creator task, or competition moment back to clients, programming, and follow-up.',
  primaryAction: includesAny(path, ['creators'])
    ? { label: 'Open Creators', to: '/dashboard/trainer/creators' }
    : includesAny(path, ['virtual-olympics'])
      ? { label: 'Open Virtual Olympics', to: '/dashboard/trainer/virtual-olympics' }
      : { label: 'Open Live Streams', to: '/dashboard/trainer/live' },
  fastPath: [
    'Confirm the client or group purpose.',
    'Run the stream or content task.',
    'Return to logging and follow-up.',
  ],
  actions: [
    { label: 'Live Streams', to: '/dashboard/trainer/live' },
    { label: 'Creators', to: '/dashboard/trainer/creators' },
    { label: 'Virtual Olympics', to: '/dashboard/trainer/virtual-olympics' },
    { label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' },
  ],
  primaryPrompt: 'teach me the trainer live and creator workflow',
});

export const refineTrainerGuide = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (includesAny(path, ['client-progress', 'progress'])) return trainerProgressReview(base);
  if (includesAny(path, ['log-workout'])) return trainerWorkoutLogging(base);
  if (includesAny(path, ['clients'])) return trainerClientCommand(base);
  if (includesAny(path, ['workout-forge', 'workout-planner', 'bootcamp', 'equipment'])) {
    return trainerBuilderFlow(base);
  }
  if (includesAny(path, ['meal-planner', 'nutrition'])) return trainerNutritionFlow(base);
  if (includesAny(path, ['assessments', 'body-map', 'video-call', 'videos'])) {
    return trainerAssessmentFlow(base);
  }
  if (includesAny(path, ['live', 'creators', 'virtual-olympics'])) {
    return trainerBroadcastFlow(path, base);
  }
  if (includesAny(path, ['coach-assistant', 'messages', 'plaud'])) return trainerCommunicationFlow(base);
  if (includesAny(path, ['schedule'])) {
    return applyPatch(base, {
      title: 'Trainer schedule flow',
      primaryAction: { label: 'Open Schedule', to: '/dashboard/trainer/schedule' },
      fastPath: [
        'Check today and next session.',
        'Confirm the client context.',
        'Log or message after the session.',
      ],
      primaryPrompt: 'teach me the trainer schedule workflow',
    });
  }
  return base;
};
