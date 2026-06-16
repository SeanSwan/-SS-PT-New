/**
 * SHARED LOGIC: Client Teach Me support-route refiners.
 * PURPOSE: Keeps booking, progress, workout history, messaging, and nutrition
 * routes from inheriting generic client dashboard action rails.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch } from './DashboardTeachMeGuide.routeRefiners.shared';

const logToday = {
  label: 'Log Workout',
  to: '/dashboard/client/log-workout?loadPlan=today',
};

const askCoach = { label: 'Ask Coach', to: '/dashboard/client/coach-assistant' };
const progress = { label: 'Review Progress', to: '/dashboard/client/progress' };
const workouts = { label: 'Review Workouts', to: '/dashboard/client/workouts' };
const booking = { label: 'Book My Session', to: '/dashboard/client/schedule' };
const messages = { label: 'Message Coach', to: '/dashboard/client/messages' };

export const clientBookingFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client booking flow',
  summary: 'Use scheduling to lock the next coached session while your recent training context is still clear.',
  focus: 'Book the next session after reviewing your current training state so your coach sees the right context.',
  primaryAction: booking,
  fastPath: [
    'Pick the next training window.',
    'Confirm the session.',
    'Message the coach if context changed.',
  ],
  actions: [
    booking,
    messages,
    askCoach,
    logToday,
    progress,
  ],
  primaryPrompt: 'teach me the client booking workflow',
});

export const clientProgressProof = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client progress proof',
  summary: 'Use progress routes to see what changed from real workout logs, then decide what to do next.',
  focus: 'Progress is proof, not decoration: if the story is stale, log the missing work before judging the trend.',
  primaryAction: progress,
  fastPath: [
    'Read the current trend.',
    'Check whether logging is current.',
    'Ask Coach or book next.',
  ],
  actions: [
    progress,
    workouts,
    logToday,
    askCoach,
    booking,
  ],
  primaryPrompt: 'teach me the client progress workflow',
});

export const clientWorkoutHistory = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client workout history',
  summary: 'Use workout history to understand what was saved, spot missing logs, and feed the next Coach question.',
  focus: 'Review history only after today is logged; stale history means the next chart and Coach answer will be off.',
  primaryAction: workouts,
  fastPath: [
    'Check the latest saved workout.',
    'Spot missing sets or notes.',
    'Log or ask Coach before moving on.',
  ],
  actions: [
    workouts,
    logToday,
    askCoach,
    progress,
    messages,
  ],
  primaryPrompt: 'teach me the client workout history workflow',
});

export const clientMessageFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client coach messaging',
  summary: 'Use messages to give your coach the context they need before the next session or plan change.',
  focus: 'Message with the specific training signal: pain, fatigue, missed work, schedule change, or progress question.',
  primaryAction: messages,
  fastPath: [
    'Name the issue or update.',
    'Attach the training context.',
    'Book, log, or ask Coach if action is needed.',
  ],
  actions: [
    messages,
    askCoach,
    booking,
    logToday,
    progress,
  ],
  primaryPrompt: 'teach me the client messaging workflow',
});

export const clientNutritionFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Client nutrition support',
  summary: 'Use nutrition after the training goal is clear so meal logging supports the plan instead of becoming a separate chore.',
  focus: 'Connect nutrition to the current training goal, energy, recovery, and coach follow-up.',
  primaryAction: { label: 'Open Nutrition', to: '/dashboard/client/meal-planner' },
  fastPath: [
    'Log the meal or macro context.',
    'Compare it to the training goal.',
    'Ask Coach what to adjust next.',
  ],
  actions: [
    { label: 'Open Nutrition', to: '/dashboard/client/meal-planner' },
    askCoach,
    logToday,
    progress,
    messages,
  ],
  primaryPrompt: 'teach me the client nutrition workflow',
});
