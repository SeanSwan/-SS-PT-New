/**
 * SHARED LOGIC: Trainer dashboard Teach Me route refiners.
 * PURPOSE: Keeps trainers one click from the client, builder, assessment,
 * intake, and communication jobs that make the floor workflow teachable.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';
import { trainerSupportRoutes } from './DashboardTeachMeGuide.trainerSupportRefiners';
import { trainerTrainingSystems } from './DashboardTeachMeGuide.trainerTrainingRefiners';

const trainerTodayCommand = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer today command',
  summary: 'Use Home as the trainer floor launcher: the next client card turns today into Coach -> Log -> Progress.',
  focus: 'Start with the next client card so the trainer follows Coach -> Log -> Progress in seconds instead of hunting through tabs.',
  primaryAction: { label: 'Today Command', to: '/dashboard/trainer/overview' },
  fastPath: [
    'Step 1: Coach the next session.',
    'Step 2: Log the performed workout.',
    'Step 3: Review Progress for the next move.',
  ],
  steps: [
    'Step 1: Use the next client card to Coach the session before the floor conversation starts.',
    'Step 2: Log the performed workout while sets, reps, load, and notes are fresh.',
    'Step 3: Review Progress next so the next plan is based on saved proof.',
    'Plan and Schedule only when the session needs a change or follow-up slot.',
  ],
  actions: [
    { label: 'Today Command', to: '/dashboard/trainer/overview' },
    { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
    { label: 'Plan Next Workout', to: '/dashboard/trainer/workout-planner' },
    { label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' },
    { label: 'Client Progress', to: '/dashboard/trainer/client-progress' },
    { label: 'Schedule', to: '/dashboard/trainer/schedule' },
  ],
  primaryPrompt: 'teach me the trainer overview workflow for using the next client Coach Plan Log command',
});

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

const trainerSprintPlanning = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer sprint planning',
  summary: 'Use Sprint Planner to turn the next training cycle into client work, programming, and follow-up the trainer can execute.',
  focus: 'Plan from real client progress first, then connect the sprint to workouts, schedule, and Coach follow-up.',
  primaryAction: { label: 'Open Sprint Planner', to: '/dashboard/trainer/sprint-planner' },
  fastPath: [
    'Pick the sprint outcome.',
    'Connect it to client progress.',
    'Move the next action into planner, schedule, or Coach.',
  ],
  actions: [
    { label: 'Sprint Planner', to: '/dashboard/trainer/sprint-planner' },
    { label: 'Workout Planner', to: '/dashboard/trainer/workout-planner' },
    { label: 'Client Progress', to: '/dashboard/trainer/client-progress' },
    { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
  ],
  primaryPrompt: 'teach me the trainer sprint planning workflow',
});

export const refineTrainerGuide = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (includesAny(path, ['overview'])) return trainerTodayCommand(base);
  if (includesAny(path, ['client-progress', 'progress'])) return trainerProgressReview(base);
  if (includesAny(path, ['log-workout'])) return trainerWorkoutLogging(base);
  if (includesAny(path, ['clients'])) return trainerClientCommand(base);
  if (includesAny(path, ['workout-forge', 'workout-planner', 'bootcamp', 'equipment'])) {
    return trainerTrainingSystems(path, base);
  }
  if (includesAny(path, ['meal-planner', 'nutrition'])) return trainerNutritionFlow(base);
  if (includesAny(path, ['sprint-planner'])) return trainerSprintPlanning(base);
  if (includesAny(path, ['assessments', 'body-map', 'video-call', 'videos'])) {
    return trainerAssessmentFlow(base);
  }
  if (includesAny(path, [
    'schedule',
    'coach-assistant',
    'messages',
    'plaud',
    'live',
    'creators',
    'virtual-olympics',
    'my-home',
  ])) {
    return trainerSupportRoutes(path, base);
  }
  return base;
};
