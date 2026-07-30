/**
 * SHARED LOGIC: Trainer Teach Me copy for training-system routes.
 * PURPOSE: Keeps trainer Workout Planner, equipment, and bootcamp tabs from
 * collapsing into one generic builder lesson. The retired Build Plan /
 * workout-forge paths (Workout-OS C7, 2026-07-29) redirect into the Workout
 * Planner, so they teach the planner flow here.
 */

import { CANONICAL_SURFACES } from '../../config/canonical-surface-names';
import type { DashboardTeachMeGuideCopy } from './DashboardTeachMeGuide.logic';
import { applyPatch, includesAny } from './DashboardTeachMeGuide.routeRefiners.shared';

const trainerWorkoutPlanner = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer Workout Planner',
  summary: 'Use Workout Planner to place the next client workout where logging and progress review can actually use it.',
  focus: 'Pick the client and day first, then save the plan into the trainer-to-client logging loop.',
  primaryAction: { label: CANONICAL_SURFACES.workoutPlanner.ariaLabel, to: CANONICAL_SURFACES.workoutPlanner.routes.trainer },
  fastPath: [
    'Choose the client and target day.',
    'Review equipment, goals, and pain constraints.',
    'Save the workout for logging.',
  ],
  actions: [
    { label: CANONICAL_SURFACES.workoutPlanner.name, to: CANONICAL_SURFACES.workoutPlanner.routes.trainer },
    { label: 'My Clients', to: '/dashboard/trainer/clients' },
    { label: 'Equipment', to: '/dashboard/trainer/equipment' },
    { label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' },
  ],
  primaryPrompt: 'teach me the trainer Workout Planner workflow for assigning a client workout',
});

const trainerEquipmentSetup = (base: DashboardTeachMeGuideCopy) => applyPatch(base, {
  title: 'Trainer equipment setup',
  summary: 'Use Equipment to keep available tools clear before planning a workout for a real client.',
  focus: 'Set the equipment constraints first so Coach and Planner do not recommend movements the session cannot run.',
  primaryAction: { label: 'Open Equipment', to: '/dashboard/trainer/equipment' },
  fastPath: [
    'Confirm the equipment available today.',
    'Match constraints to the client workout.',
    'Return to Workout Planner or Coach.',
  ],
  actions: [
    { label: 'Equipment', to: '/dashboard/trainer/equipment' },
    { label: CANONICAL_SURFACES.workoutPlanner.name, to: CANONICAL_SURFACES.workoutPlanner.routes.trainer },
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
    { label: CANONICAL_SURFACES.workoutPlanner.name, to: CANONICAL_SURFACES.workoutPlanner.routes.trainer },
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
  // Retired build-plan / workout-forge paths redirect into the planner (C7).
  return trainerWorkoutPlanner(base);
};
