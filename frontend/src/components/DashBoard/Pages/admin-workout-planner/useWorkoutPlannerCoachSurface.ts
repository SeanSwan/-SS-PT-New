/**
 * HOOK: useWorkoutPlannerCoachSurface
 * PURPOSE: One wiring point for the Planner's whole Swan Coach surface —
 * mounts the dock transport (useWorkoutPlannerCoachDock), the AI_PLANNER_*
 * edit events, the deterministic sequence events (rearrange + guarded Undo),
 * and the receipt-action dispatcher, then returns ready-to-render dock props.
 * All receipts flow through the ONE shared sink so dictated edits, sequence
 * receipts, and chat fallbacks land in the same dock feed.
 * Extracted from WorkoutPlannerPage when Slice 5 sequencing pushed the page
 * over its 300-line contract (Rule 4).
 */
import { useCallback } from 'react';
import type React from 'react';
import { dispatchAIWorkoutEvent } from '../../../../utils/aiWorkoutEvents';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import {
  useWorkoutPlannerCoachDock, pushWorkoutPlannerCoachReceipt, type CoachDockReceiptAction,
} from './useWorkoutPlannerCoachDock';
import { useWorkoutPlannerAiEvents } from './useWorkoutPlannerAiEvents';
import { useWorkoutPlannerSequenceEvents } from './useWorkoutPlannerSequenceEvents';
import type { GeneratedPlan, OPTPhaseParams, PlanExercise } from './WorkoutPlannerTypes';
import type { PlannerHorizonSelection } from './workoutPlannerAiEvents.types';

export interface UseWorkoutPlannerCoachSurfaceArgs {
  selectedClientId: number | null;
  planExercises: PlanExercise[];
  setPlanExercises: React.Dispatch<React.SetStateAction<PlanExercise[]>>;
  generatedPlan: GeneratedPlan | null;
  setGeneratedPlan: React.Dispatch<React.SetStateAction<GeneratedPlan | null>>;
  selectedHorizonTarget: PlannerHorizonSelection | null;
  searchExercises: (query: string) => Promise<ExerciseSlim[]>;
  onGenerate: () => void;
  phase: OPTPhaseParams;
  phaseNumber: number;
}

export function useWorkoutPlannerCoachSurface(args: UseWorkoutPlannerCoachSurfaceArgs) {
  const {
    selectedClientId, planExercises, setPlanExercises, generatedPlan, setGeneratedPlan,
    selectedHorizonTarget, searchExercises, onGenerate, phase, phaseNumber,
  } = args;

  const coachDock = useWorkoutPlannerCoachDock({ selectedClientId, pushReceipt: pushWorkoutPlannerCoachReceipt });
  useWorkoutPlannerAiEvents({
    planExercises, setPlanExercises, generatedPlan, setGeneratedPlan, selectedHorizonTarget,
    searchExercises, onGenerate, pushReceipt: pushWorkoutPlannerCoachReceipt, phase,
  });
  useWorkoutPlannerSequenceEvents({
    planExercises, setPlanExercises, generatedPlan, setGeneratedPlan, selectedHorizonTarget,
    phaseNumber, pushReceipt: pushWorkoutPlannerCoachReceipt,
  });

  const onReceiptAction = useCallback((_receiptId: string, action: CoachDockReceiptAction) => {
    dispatchAIWorkoutEvent(action.eventName, action.payload ?? {});
  }, []);

  return { ...coachDock, onReceiptAction };
}
