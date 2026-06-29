/**
 * SHARED LOGIC: Trainer Teach Me copy for training-system routes.
 * PURPOSE: Keeps trainer Plan Library, equipment, bootcamp, and Build Plan tabs from
 * collapsing into one generic builder lesson.
 */

import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

const trainerBuilderFlow = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer Build Plan flow',
  summary: 'Use Build Plan to create the client workout, save it, then continue through Log Today or Open Plan Library while the session context is fresh.',
  focus: 'Pick the client first, build with the real constraints, then use the saved-workout handoff: Log Today for the floor, Open Plan Library for review.',
  primaryAction: { label: 'Build Plan', to: '/dashboard/trainer/build-plan' },
  fastPath: [
    'Confirm client, goal, and constraints.',
    'Build manually or with Swan Coach.',
    'Save, then choose Log Today or Open Plan Library.',
  ],
  actions: [
    { label: 'Build Plan', to: '/dashboard/trainer/build-plan' },
    { label: 'Log Today', to: '/dashboard/trainer/clients?intent=log_workout' },
    { label: 'Plan Library', to: '/dashboard/trainer/workout-planner' },
    { label: 'Equipment', to: '/dashboard/trainer/equipment' },
    { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
  ],
  primaryPrompt: 'teach me the trainer Build Plan workflow from client draft to logger and Plan Library handoff',
});

const trainerWorkoutPlanner = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer Plan Library',
  summary: 'Use Plan Library to place the next client workout where logging and progress review can actually use it.',
  focus: 'Pick the client and day first, then save the plan into the trainer-to-client logging loop.',
  primaryAction: { label: 'Open Plan Library', to: '/dashboard/trainer/workout-planner' },
  fastPath: [
    'Choose the client and target day.',
    'Review equipment, goals, and pain constraints.',
    'Save the workout for logging.',
  ],
  actions: [
    { label: 'Plan Library', to: '/dashboard/trainer/workout-planner' },
    { label: 'My Clients', to: '/dashboard/trainer/clients' },
    { label: 'Equipment', to: '/dashboard/trainer/equipment' },
    { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
  ],
  primaryPrompt: 'teach me the trainer Plan Library workflow for assigning a client workout',
});

const trainerEquipmentSetup = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer equipment setup',
  summary: 'Use Equipment to keep available tools clear before planning a workout for a real client.',
  focus: 'Set the equipment constraints first so Coach and Planner do not recommend movements the session cannot run.',
  primaryAction: { label: 'Open Equipment', to: '/dashboard/trainer/equipment' },
  fastPath: [
    'Confirm the equipment available today.',
    'Match constraints to the client workout.',
    'Return to Plan Library or Coach.',
  ],
  actions: [
    { label: 'Equipment', to: '/dashboard/trainer/equipment' },
    { label: 'Plan Library', to: '/dashboard/trainer/workout-planner' },
    { label: 'My Clients', to: '/dashboard/trainer/clients' },
    { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
  ],
  primaryPrompt: 'teach me the trainer equipment workflow for workout planning',
});

const trainerBootcampDelivery = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer bootcamp delivery',
  summary: 'Use Bootcamp to prepare a group session that still connects back to scheduling, equipment, and logged proof.',
  focus: 'Confirm the group format, equipment, and schedule before presenting the bootcamp flow.',
  primaryAction: { label: 'Open Bootcamp', to: '/dashboard/trainer/bootcamp' },
  fastPath: [
    'Confirm the bootcamp format.',
    'Check schedule and equipment limits.',
    'Keep follow-up tied to logged work.',
  ],
  actions: [
    { label: 'Bootcamp', to: '/dashboard/trainer/bootcamp' },
    { label: 'Schedule', to: '/dashboard/trainer/schedule' },
    { label: 'Equipment', to: '/dashboard/trainer/equipment' },
    { label: 'Plan Library', to: '/dashboard/trainer/workout-planner' },
  ],
  primaryPrompt: 'teach me the trainer bootcamp workflow',
});

export const trainerTrainingSystems = (
  path: string,
  base: DashboardTeachMeGuideCopy,
): DashboardTeachMeGuideCopy => {
  if (includesAny(path, ['workout-planner'])) return trainerWorkoutPlanner(base);
  if (includesAny(path, ['equipment'])) return trainerEquipmentSetup(base);
  if (includesAny(path, ['bootcamp'])) return trainerBootcampDelivery(base);
  return trainerBuilderFlow(base);
};
