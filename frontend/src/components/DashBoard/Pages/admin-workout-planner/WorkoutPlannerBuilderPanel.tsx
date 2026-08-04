/**
 * COMPONENT: WorkoutPlannerBuilderPanel
 * PURPOSE: Composes the manual workout builder shell around focused render sections.
 */

import React from 'react';
import { Zap } from 'lucide-react';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { OPTPhaseParams, PlanExercise } from './WorkoutPlannerTypes';
import type { RolodexSwapTarget } from './useWorkoutPlannerRolodexState';
import type {
  SwanCoachGenerationMode,
  WorkoutGuidedCandidateExercise,
  WorkoutGuidedCandidatesResponse,
} from './WorkoutPlannerGuidedCandidateTypes';
import type { SavedPlanSummary } from './WorkoutPlannerSavedPlansSection';
import WorkoutPlannerGeneratedPlanSection from './WorkoutPlannerGeneratedPlanSection';
import WorkoutPlannerGuidedCandidatesPanel from './WorkoutPlannerGuidedCandidatesPanel';
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

type GeneratedPlanSectionProps = React.ComponentProps<typeof WorkoutPlannerGeneratedPlanSection>;

interface WorkoutPlannerBuilderPanelProps extends GeneratedPlanSectionProps {
  degradedIntelligence: boolean;
  saving: boolean;
  planExercises: PlanExercise[];
  hasGeneratedHorizonPlan: boolean;
  loadedPlanId: string | null;
  savedPlans: SavedPlanSummary[];
  isDirty: boolean;
  generating: boolean;
  generatingCandidates: boolean;
  guidedCandidates: WorkoutGuidedCandidatesResponse | null;
  generationMode: SwanCoachGenerationMode;
  phase: OPTPhaseParams;
  explanations: WorkoutPlannerBuilderExplanation[];
  showExplanations: boolean;
  onSaveDraft: () => void;
  onSaveAndActivate: () => void;
  onUpdateLoaded: () => void;
  onUpdateAndActivate: () => void;
  onDuplicateLoadedPlan: () => void;
  onCreatePdf: () => void;
  /** S17: the V2 SaveBar owns save/activate — hides the header matrix under PLANNER_IA_V2. */
  legacyActionsHidden?: boolean;
  swapTarget: RolodexSwapTarget | null;
  onSelectExercise: (exercise: ExerciseSlim) => void;
  onUpdateExercise: (id: string, field: keyof PlanExercise, value: unknown) => void;
  onRemoveExercise: (id: string) => void;
  onBeginSwap: (rowId: string, exerciseName: string) => void;
  onCancelSwap: () => void;
  onBrowseAddExercise: () => void;
  onSelectGuidedCandidate: (candidate: WorkoutGuidedCandidateExercise) => void;
  onClearGuidedCandidates: () => void;
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
  generatingCandidates,
  guidedCandidates,
  generationMode,
  phase,
  explanations,
  showExplanations,
  generatedPlan,
  selectedMesoDay,
  phaseNumber,
  selectedClient,
  coachReviewRoute,
  onSaveDraft,
  onSaveAndActivate,
  onUpdateLoaded,
  onUpdateAndActivate,
  onDuplicateLoadedPlan,
  onCreatePdf,
  legacyActionsHidden = false,
  swapTarget,
  onSelectExercise,
  onUpdateExercise,
  onRemoveExercise,
  onBeginSwap,
  onCancelSwap,
  onBeginHorizonSwap,
  onRemoveHorizonExercise,
  onHorizonSelectionChange,
  onBrowseAddExercise,
  onSelectGuidedCandidate,
  onClearGuidedCandidates,
  onToggleExplanations,
  onSelectedMesoDayChange,
  onPhaseNumberChange,
}) => {
  const hasExercises = planExercises.length > 0 || hasGeneratedHorizonPlan;
  const loadedPlan = loadedPlanId
    ? savedPlans.find(plan => plan.id === loadedPlanId)
    : null;
  const loadedIsCurrent = isWorkoutPlanActiveStatus(loadedPlan?.status);

  return (
    <DegradedPanel $degraded={degradedIntelligence}>
      <PanelHeader>
        <PanelTitle><Zap size={16} /> Plan Builder</PanelTitle>
        {!legacyActionsHidden && <BuilderActionMatrix
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
          onCreatePdf={onCreatePdf}
          showCreatePdf={!generatedPlan}
        />}
      </PanelHeader>

      <PanelBody>
        <BuilderPhaseSummary phase={phase} />
        {generatedPlan ? (
          <WorkoutPlannerGeneratedPlanSection
            generatedPlan={generatedPlan}
            selectedMesoDay={selectedMesoDay}
            phaseNumber={phaseNumber}
            selectedClient={selectedClient}
            coachReviewRoute={coachReviewRoute}
            onSelectedMesoDayChange={onSelectedMesoDayChange}
            onPhaseNumberChange={onPhaseNumberChange}
            planSwapTarget={swapTarget}
            onBeginHorizonSwap={onBeginHorizonSwap}
            onRemoveHorizonExercise={onRemoveHorizonExercise}
            onCancelPlanSwap={onCancelSwap}
            onHorizonSelectionChange={onHorizonSelectionChange}
          />
        ) : (
          <>
            <WorkoutPlannerGuidedCandidatesPanel
              candidates={guidedCandidates}
              generationMode={generationMode}
              generatingCandidates={generatingCandidates}
              onSelectCandidate={onSelectGuidedCandidate}
              onClearCandidates={onClearGuidedCandidates}
            />
            <BuilderWorkoutContent
              generating={generating}
              planExercises={planExercises}
              swapTarget={swapTarget}
              onSelectExercise={onSelectExercise}
              onUpdateExercise={onUpdateExercise}
              onRemoveExercise={onRemoveExercise}
              onBeginSwap={onBeginSwap}
              onCancelSwap={onCancelSwap}
            />
            <BuilderAddExerciseAction
              planExercises={planExercises}
              onBrowseAddExercise={onBrowseAddExercise}
            />
          </>
        )}
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
