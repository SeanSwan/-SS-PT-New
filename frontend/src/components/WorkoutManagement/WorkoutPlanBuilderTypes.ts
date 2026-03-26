/**
 * ============================================================================
 * FILE: WorkoutPlanBuilderTypes.ts
 * PURPOSE: Shared types and constant arrays for WorkoutPlanBuilder
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exports the WorkoutPlanBuilderProps interface plus all
 * constant arrays (steps, muscleGroups, equipmentOptions, difficulties, goals,
 * mockClients) used by the builder and its step sub-components.
 *
 * HOW IT FITS IN THE APP: Imported by WorkoutPlanBuilder.tsx and step components.
 *
 * KEY DECISIONS: Centralised to avoid circular imports between step files.
 */

import type { WorkoutPlan } from '../../hooks/useWorkoutMcp';

// ─────────────────────────────────────────────────────────────
// SECTION: Component Props
// PURPOSE: Top-level props for the WorkoutPlanBuilder orchestrator
// ─────────────────────────────────────────────────────────────
export interface WorkoutPlanBuilderProps {
  clientId?: string;
  clientName?: string;
  onPlanCreated?: (plan: WorkoutPlan) => void;
  existingPlan?: WorkoutPlan;
  mode?: 'create' | 'edit';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// PURPOSE: Shared option arrays used across multiple steps
// ─────────────────────────────────────────────────────────────

/** Stepper labels displayed in the horizontal progress bar. */
export const steps = [
  'Plan Details',
  'Training Schedule',
  'Exercise Selection',
  'Review & Save',
];

/** Muscle group options for focus-area chip pickers. */
export const muscleGroups = [
  'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes', 'Calves',
];

/** Equipment options for the chip picker in the schedule step. */
export const equipmentOptions = [
  'Bodyweight', 'Dumbbells', 'Barbell', 'Machines', 'Resistance Bands',
  'Kettlebells', 'Medicine Ball', 'Cable Machine',
];

/** Difficulty presets for workout generation. */
export const difficulties = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

/** Goal presets shown in the plan-details step. */
export const goals = [
  { value: 'general', label: 'General Fitness' },
  { value: 'strength', label: 'Strength Building' },
  { value: 'hypertrophy', label: 'Muscle Building' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'rehabilitation', label: 'Rehabilitation' },
];

/** Mock clients for the demo client selector. */
export const mockClients = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: '3', name: 'Mike Johnson', email: 'mike@example.com' },
];
