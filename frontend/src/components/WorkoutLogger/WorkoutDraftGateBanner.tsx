/**
 * Blueprint: WorkoutDraftGateBanner
 * Parent: WorkoutLogger (extracted for the shell line cap)
 * Purpose: the C4a draft-wins moment — offers a stored draft on mount,
 * including on `?loadPlan=today` (the canonical client URL, where the offer
 * was previously dead code). Restore blocks the plan auto-load for the
 * mount; discard re-opens it. The gate value itself lives in WorkoutLogger
 * so useWorkoutPlanLoading can consume it.
 */
import React from 'react';
import type { ExerciseEntry } from '../../services/nasmApiService';
import { WorkoutDraftRestoreBanner, type UseWorkoutDraftResult } from './useWorkoutDraft';
import { ensureWorkoutLoggerExerciseRowIdentity } from './WorkoutLogger.helpers';

export type WorkoutDraftGate = 'none' | 'pending' | 'restored' | 'discarded';

interface WorkoutDraftGateBannerProps {
  workoutDraft: UseWorkoutDraftResult;
  visible: boolean;
  setDraftGate: (gate: WorkoutDraftGate) => void;
  setExercises: (exercises: ExerciseEntry[]) => void;
  setSessionNotes: (notes: string) => void;
  setOverallIntensity: (intensity: number | null) => void;
}

const WorkoutDraftGateBanner: React.FC<WorkoutDraftGateBannerProps> = ({
  workoutDraft,
  visible,
  setDraftGate,
  setExercises,
  setSessionNotes,
  setOverallIntensity,
}) => {
  if (!visible || !workoutDraft.pendingDraft) return null;
  return (
    <WorkoutDraftRestoreBanner
      draft={workoutDraft.pendingDraft}
      onRestore={() => {
        const draft = workoutDraft.restore();
        if (!draft) return;
        setDraftGate('restored');
        setExercises(draft.exercises.map((entry) => ensureWorkoutLoggerExerciseRowIdentity(entry)));
        setSessionNotes(draft.sessionNotes);
        setOverallIntensity(draft.overallIntensity);
      }}
      onDiscard={() => {
        setDraftGate('discarded');
        workoutDraft.discard();
      }}
    />
  );
};

export default WorkoutDraftGateBanner;
