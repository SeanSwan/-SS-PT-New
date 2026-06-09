/**
 * COMPONENT: WorkoutPlannerBuilderPanel
 * PURPOSE: Composes the manual workout builder shell around focused render sections.
 */

import React from 'react';
import { Zap } from 'lucide-react';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { OPTPhaseParams, PlanExercise } from './WorkoutPlannerTypes';
import type { SavedPlanSummary } from './WorkoutPlannerSavedPlansSection';
import { isWorkoutPlanActiveStatus } from './workoutPlanStatus';
import { PanelBody, PanelHeader, PanelTitle } from './WorkoutPlannerStyles';
import { DegradedPanel } from './WorkoutPlannerPage.styles';
import {
  BuilderActionMatrix,
  BuilderAddExerciseAction,
  BuilderExplanationsPanel,
  BuilderPhaseSummary,
  BuilderWorkoutContent,
  type WorkoutPlannerBuilderExplanation,
} from './WorkoutPlannerBuilderPanel.sections';

export type { WorkoutPlannerBuilderExplanation } from './WorkoutPlannerBuilderPanel.sections';

interface WorkoutPlannerBuilderPanelProps {
  degradedIntelligence: boolean;
  saving: boolean;
  planExercises: PlanExercise[];
  hasGeneratedHorizonPlan: boolean;
  loadedPlanId: string | null;
  savedPlans: SavedPlanSummary[];
  isDirty: boolean;
  generating: boolean;
  phase: OPTPhaseParams;
  explanations: WorkoutPlannerBuilderExplanation[];
  showExplanations: boolean;
  onSaveDraft: () => void;
  onSaveAndActivate: () => void;
  onUpdateLoaded: () => void;
  onUpdateAndActivate: () => void;
  onDuplicateLoadedPlan: () => void;
  onSelectExercise: (exercise: ExerciseSlim) => void;
  onUpdateExercise: (id: string, field: keyof PlanExercise, value: unknown) => void;
  onRemoveExercise: (id: string) => void;
  onBrowseAddExercise: () => void;
  onToggleExplanations: () => void;
}

const WorkoutPlannerBuilderPanel: React.FC<WorkoutPlannerBuilderPanelProps> = ({
  degradedIntelligence,
  saving,
  planExercises,
  hasGeneratedHorizonPlan,
  loadedPlanId,
  savedPlans,
  isDirty,
  generating,
  phase,
  explanations,
  showExplanations,
  onSaveDraft,
  onSaveAndActivate,
  onUpdateLoaded,
  onUpdateAndActivate,
  onDuplicateLoadedPlan,
  onSelectExercise,
  onUpdateExercise,
  onRemoveExercise,
  onBrowseAddExercise,
  onToggleExplanations,
}) => {
  const hasExercises = planExercises.length > 0 || hasGeneratedHorizonPlan;
  const loadedPlan = loadedPlanId
    ? savedPlans.find(plan => plan.id === loadedPlanId)
    : null;
  const loadedIsCurrent = isWorkoutPlanActiveStatus(loadedPlan?.status);

  return (
    <DegradedPanel $degraded={degradedIntelligence}>
      <PanelHeader>
        <PanelTitle><Zap size={16} /> Workout Builder</PanelTitle>
        <BuilderActionMatrix
          saving={saving}
          hasExercises={hasExercises}
          loadedPlanId={loadedPlanId}
          loadedIsCurrent={loadedIsCurrent}
          isDirty={isDirty}
          onSaveDraft={onSaveDraft}
          onSaveAndActivate={onSaveAndActivate}
          onUpdateLoaded={onUpdateLoaded}
          onUpdateAndActivate={onUpdateAndActivate}
          onDuplicateLoadedPlan={onDuplicateLoadedPlan}
        />
      </PanelHeader>

      <PanelBody>
        <BuilderPhaseSummary phase={phase} />
        <BuilderWorkoutContent
          generating={generating}
          planExercises={planExercises}
          onSelectExercise={onSelectExercise}
          onUpdateExercise={onUpdateExercise}
          onRemoveExercise={onRemoveExercise}
        />
        <BuilderAddExerciseAction
          planExercises={planExercises}
          onBrowseAddExercise={onBrowseAddExercise}
        />
        <BuilderExplanationsPanel
          explanations={explanations}
          showExplanations={showExplanations}
          onToggleExplanations={onToggleExplanations}
        />
      </PanelBody>
    </DegradedPanel>
  );
};

export default WorkoutPlannerBuilderPanel;
