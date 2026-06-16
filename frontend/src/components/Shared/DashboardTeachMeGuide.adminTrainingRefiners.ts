/**
 * SHARED LOGIC: Admin training Teach Me route refiners.
 * PURPOSE: Makes planner, equipment, and bootcamp routes teach the right first
 * click without implying hidden workout writes.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

type TrainingRouteKind = 'equipment' | 'bootcamp' | 'planner';

const routeKind = (path: string): TrainingRouteKind => {
  if (includesAny(path, ['equipment'])) return 'equipment';
  if (includesAny(path, ['bootcamp'])) return 'bootcamp';
  return 'planner';
};

const adminEquipmentCommand = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach equipment setup',
  title: 'Admin equipment command',
  summary: 'Use equipment setup to keep generated plans realistic before a trainer or client tries to log them.',
  focus: 'Confirm what equipment exists, what is missing, and how it changes today\'s plan before sending anyone into the builder.',
  primaryAction: { label: 'Open Equipment', to: '/dashboard/admin/equipment' },
  fastPath: [
    'Check available equipment.',
    'Flag missing or limited tools.',
    'Return to the planner with constraints clear.',
  ],
  steps: [
    'Start here when the workout depends on tools, substitutions, or facility setup.',
    'Treat equipment truth as a constraint, not decoration.',
    'Return to Workout Planner or Client Hub only after the available setup is clear.',
    'Use Coach to ask for substitutions, but review the plan before saving it.',
  ],
  actions: [
    { label: 'Equipment', to: '/dashboard/admin/equipment' },
    { label: 'Workout Planner', to: '/dashboard/admin/workout-planner' },
    { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
    { label: 'Ask Coach', to: '/dashboard/admin/coach-assistant' },
  ],
  primaryPrompt: 'teach me the admin equipment setup workflow for workout planning',
});

const adminBootcampBuilder = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach group training',
  title: 'Admin bootcamp builder',
  summary: 'Use Bootcamp for group-class programming where station flow, timing, and coach delivery matter as much as exercises.',
  focus: 'Build for the room: group level, station order, timing, equipment, and the schedule slot before publishing.',
  primaryAction: { label: 'Open Bootcamp', to: '/dashboard/admin/bootcamp' },
  fastPath: [
    'Pick the group goal.',
    'Build stations and timing.',
    'Schedule or save the class plan.',
  ],
  steps: [
    'Use Bootcamp for group-class flow, not one-client programming.',
    'Check equipment and station timing before accepting the plan.',
    'Use Schedule once the class plan is ready so delivery has a real time slot.',
    'Keep one-client plans in Workout Planner or Client Hub Training.',
  ],
  actions: [
    { label: 'Bootcamp', to: '/dashboard/admin/bootcamp' },
    { label: 'Workout Planner', to: '/dashboard/admin/workout-planner' },
    { label: 'Schedule', to: '/dashboard/admin/master-schedule' },
    { label: 'Equipment', to: '/dashboard/admin/equipment' },
  ],
  primaryPrompt: 'teach me the admin bootcamp group training workflow',
});

const adminWorkoutPlanner = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  eyebrow: 'Teach the training builder',
  title: 'Admin workout systems',
  summary: 'Use builder routes to turn client goals, equipment, pain signals, and training phase into a usable plan.',
  focus: 'Build from client context first: goal, equipment, pain, schedule, then generate or save the plan where the trainer can use it.',
  primaryAction: { label: 'Open Workout Planner', to: '/dashboard/admin/workout-planner' },
  fastPath: [
    'Choose client context.',
    'Generate or assemble the plan.',
    'Save it where logging can use it.',
  ],
  steps: [
    'Start in Client Hub when the plan belongs to one client; use Workout Planner when the plan structure is the main task.',
    'Confirm equipment and pain constraints before accepting generated work.',
    'Use Bootcamp only for group-class flow; do not mix it with one-client programming unless that is intentional.',
    'Save the plan before leaving the builder so it can feed future logging and progress proof.',
  ],
  actions: [
    { label: 'Workout Planner', to: '/dashboard/admin/workout-planner' },
    { label: 'Client Hub Training', to: '/dashboard/admin/client-management?tab=training' },
    { label: 'Equipment', to: '/dashboard/admin/equipment' },
    { label: 'Bootcamp', to: '/dashboard/admin/bootcamp' },
  ],
  primaryPrompt: 'teach me the admin workout builder workflow',
});

export const adminTrainingSystems = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (routeKind(path) === 'equipment') return adminEquipmentCommand(base);
  if (routeKind(path) === 'bootcamp') return adminBootcampBuilder(base);
  return adminWorkoutPlanner(base);
};
