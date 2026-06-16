/**
 * SHARED LOGIC: Trainer Teach Me support-route refiners.
 * PURPOSE: Keeps schedule, communication, PLAUD, live, and creator routes on
 * the exact next trainer action instead of a generic trainer dashboard loop.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

const coach = { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' };
const logWorkout = { label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' };
const planNext = { label: 'Plan Next Workout', to: '/dashboard/trainer/workout-planner' };
const progress = { label: 'Client Progress', to: '/dashboard/trainer/client-progress' };
const schedule = { label: 'Open Schedule', to: '/dashboard/trainer/schedule' };
const messages = { label: 'Open Messages', to: '/dashboard/trainer/messages' };
const plaud = { label: 'Open PLAUD', to: '/dashboard/trainer/plaud' };

const trainerScheduleControl = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer schedule control',
  summary: 'Use Schedule to protect the next appointment, trainer assignment, and after-session follow-up in one pass.',
  focus: 'Start from the next session, confirm the client and time, then leave the route through logging or messaging.',
  primaryAction: schedule,
  fastPath: [
    'Check today and the next session.',
    'Confirm the client, time, and trainer context.',
    'Log the session or message the client before moving on.',
  ],
  actions: [
    schedule,
    logWorkout,
    { label: 'Message Client', to: '/dashboard/trainer/messages' },
    coach,
    progress,
  ],
  primaryPrompt: 'teach me the trainer schedule control workflow',
});

const trainerCoachTerminal = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer Coach terminal',
  summary: 'Use Coach as the client-action terminal for workout questions, plan drafts, logging help, and intake review.',
  focus: 'Pick the client context first, ask for the exact action, then review before logging, planning, messaging, or scheduling.',
  primaryAction: coach,
  fastPath: [
    'Confirm the client you are coaching.',
    'Ask Coach for the draft, check, or next action.',
    'Review before sending it to Log Workout, Planner, or Schedule.',
  ],
  actions: [coach, logWorkout, planNext, plaud, schedule],
  primaryPrompt: 'teach me the trainer Coach terminal workflow for client workout actions',
});

const trainerMessageFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer client messaging',
  summary: 'Use Messages to close the training loop with a clear client-specific next action.',
  focus: 'Message only after the action is clear: missed work, pain, schedule change, progress question, or plan follow-up.',
  primaryAction: messages,
  fastPath: [
    'Open the client thread.',
    'Name the exact training signal.',
    'Log, schedule, or Coach-review the next action.',
  ],
  actions: [
    messages,
    logWorkout,
    coach,
    schedule,
    progress,
  ],
  primaryPrompt: 'teach me the trainer client messaging workflow',
});

const trainerPlaudFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer PLAUD intake',
  summary: 'Use PLAUD to turn a recording or transcript into reviewed client work, not loose notes.',
  focus: 'Attach the transcript to the right client, extract the next training action, then review before logging or planning.',
  primaryAction: plaud,
  fastPath: [
    'Open the recording or transcript.',
    'Match it to the client context.',
    'Send the reviewed action to Coach, Log Workout, or Planner.',
  ],
  actions: [
    plaud,
    coach,
    { label: 'My Clients', to: '/dashboard/trainer/clients' },
    logWorkout,
    planNext,
  ],
  primaryPrompt: 'teach me the trainer PLAUD intake workflow',
});

const broadcastTitle = (path: string): string => {
  if (includesAny(path, ['my-home'])) return 'Trainer achievement space';
  if (includesAny(path, ['virtual-olympics'])) return 'Trainer competition flow';
  if (includesAny(path, ['creators'])) return 'Trainer creator handoff';
  return 'Trainer live coaching';
};

const broadcastPrimaryAction = (path: string) => {
  if (includesAny(path, ['creators'])) return { label: 'Open Creators', to: '/dashboard/trainer/creators' };
  if (includesAny(path, ['virtual-olympics'])) return { label: 'Open Virtual Olympics', to: '/dashboard/trainer/virtual-olympics' };
  if (includesAny(path, ['my-home'])) return { label: 'Open My Home', to: '/dashboard/trainer/my-home' };
  return { label: 'Open Live Streams', to: '/dashboard/trainer/live' };
};

const trainerBroadcastFlow = (path: string, base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: broadcastTitle(path),
  summary: 'Use live, creator, and achievement routes only when they point back to client coaching or follow-up.',
  focus: 'Tie the content moment to a client, class, competition, or follow-up so it supports training instead of becoming noise.',
  primaryAction: broadcastPrimaryAction(path),
  fastPath: [
    'Confirm the client or group purpose.',
    'Run the stream, creator task, or achievement action.',
    'Return to logging, scheduling, or follow-up.',
  ],
  actions: [
    { label: 'Live Streams', to: '/dashboard/trainer/live' },
    { label: 'Creators', to: '/dashboard/trainer/creators' },
    { label: 'Virtual Olympics', to: '/dashboard/trainer/virtual-olympics' },
    { label: 'My Home', to: '/dashboard/trainer/my-home' },
    logWorkout,
    { label: 'Schedule', to: '/dashboard/trainer/schedule' },
  ],
  primaryPrompt: includesAny(path, ['my-home'])
    ? 'teach me the trainer achievement workflow'
    : 'teach me the trainer live and creator workflow',
});

export const trainerSupportRoutes = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (includesAny(path, ['schedule'])) return trainerScheduleControl(base);
  if (includesAny(path, ['coach-assistant'])) return trainerCoachTerminal(base);
  if (includesAny(path, ['messages'])) return trainerMessageFlow(base);
  if (includesAny(path, ['plaud'])) return trainerPlaudFlow(base);
  if (includesAny(path, ['live', 'creators', 'virtual-olympics', 'my-home'])) {
    return trainerBroadcastFlow(path, base);
  }
  return base;
};
