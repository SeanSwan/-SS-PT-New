/**
 * BLUEPRINT: WorkoutPlannerBuilderPanel.sections
 * Purpose: house builder actions, phase summary, and reasoning sections.
 * Data: receives planner state and emits callback-only UI.
 * Safety: preserves disabled rules, stable reasoning row keys, and styled 44px actions.
 */

import React from 'react';
import { ChevronDown, ChevronUp, Download, Info, Loader2, Save } from 'lucide-react';
import type { OPTPhaseParams } from './WorkoutPlannerTypes';
import { workoutPlannerExplanationKey } from './WorkoutPlannerRowKeys';
import {
  ActionBtn,
  ExplanationBadge,
  ExplanationItem,
  ExplanationsPanel,
  ExplanationsToggle,
  PhaseBadge,
  PhaseLabel,
  PhaseParams,
} from './WorkoutPlannerStyles';
import { ActionWrap, ExplanationDetails } from './WorkoutPlannerPage.styles';

export {
  BuilderAddExerciseAction,
  BuilderWorkoutContent,
} from './WorkoutPlannerBuilderPanel.exerciseRows';

export interface WorkoutPlannerBuilderExplanation {
  type: string;
  message: string;
  details?: string | string[];
}

const SaveIcon: React.FC<{ saving: boolean }> = ({ saving }) => (
  saving ? <Loader2 size={14} /> : <Save size={14} />
);

interface BuilderActionMatrixProps {
  saving: boolean;
  hasExercises: boolean;
  loadedPlanId: string | null;
  loadedIsCurrent: boolean;
  isDirty: boolean;
  onSaveDraft: () => void;
  onSaveAndActivate: () => void;
  onUpdateLoaded: () => void;
  onUpdateAndActivate: () => void;
  onDuplicateLoadedPlan: () => void;
  onCreatePdf: () => void;
  showCreatePdf?: boolean;
}

const NewPlanActions: React.FC<Pick<
  BuilderActionMatrixProps,
  'saving' | 'hasExercises' | 'onSaveDraft' | 'onSaveAndActivate'
>> = ({ saving, hasExercises, onSaveDraft, onSaveAndActivate }) => (
  <>
    <ActionBtn
      onClick={onSaveDraft}
      disabled={saving || !hasExercises}
      aria-label="Save current builder as a new draft plan"
    >
      <SaveIcon saving={saving} />
      Save Draft
    </ActionBtn>
    <ActionBtn
      onClick={onSaveAndActivate}
      disabled={saving || !hasExercises}
      aria-label="Save and make current"
    >
      <SaveIcon saving={saving} />
      Save & Make Current
    </ActionBtn>
  </>
);

const updateLoadedDisabled = (saving: boolean, hasExercises: boolean, isDirty: boolean) => (
  saving || !hasExercises || !isDirty
);

const updateAndActivateDisabled = (saving: boolean, hasExercises: boolean) => (
  saving || !hasExercises
);

const BuilderCreatePdfAction: React.FC<Pick<
  BuilderActionMatrixProps,
  'saving' | 'hasExercises' | 'onCreatePdf'
>> = ({ saving, hasExercises, onCreatePdf }) => (
  <ActionBtn
    type="button"
    onClick={onCreatePdf}
    disabled={saving || !hasExercises}
    aria-label="Create PDF from current workout builder"
  >
    <Download size={14} />
    Create PDF
  </ActionBtn>
);

const LoadedPlanActions: React.FC<Omit<
  BuilderActionMatrixProps,
  'loadedPlanId' | 'onSaveDraft' | 'onSaveAndActivate' | 'onCreatePdf' | 'showCreatePdf'
>> = ({
  saving,
  hasExercises,
  loadedIsCurrent,
  isDirty,
  onUpdateLoaded,
  onUpdateAndActivate,
  onDuplicateLoadedPlan,
}) => (
  <>
    <ActionBtn
      onClick={onUpdateLoaded}
      disabled={updateLoadedDisabled(saving, hasExercises, isDirty)}
      aria-label="Update the loaded plan with current builder state"
    >
      <SaveIcon saving={saving} />
      Update Plan
    </ActionBtn>
    {!loadedIsCurrent && (
      <ActionBtn
        onClick={onUpdateAndActivate}
        disabled={updateAndActivateDisabled(saving, hasExercises)}
        aria-label="Update the loaded plan and make it current"
      >
        <SaveIcon saving={saving} />
        Update & Make Current
      </ActionBtn>
    )}
    <ActionBtn
      onClick={onDuplicateLoadedPlan}
      disabled={saving}
      aria-label="Save current as a new copy"
    >
      <SaveIcon saving={saving} />
      Save as Copy
    </ActionBtn>
  </>
);

export const BuilderActionMatrix: React.FC<BuilderActionMatrixProps> = ({
  loadedPlanId,
  onCreatePdf,
  showCreatePdf = true,
  ...props
}) => (
  <ActionWrap className="lens2-actions">
    {showCreatePdf && (
      <BuilderCreatePdfAction
        saving={props.saving}
        hasExercises={props.hasExercises}
        onCreatePdf={onCreatePdf}
      />
    )}
    {loadedPlanId
      ? <LoadedPlanActions {...props} />
      : <NewPlanActions {...props} />}
  </ActionWrap>
);

export const BuilderPhaseSummary: React.FC<{ phase: OPTPhaseParams }> = ({ phase }) => (
  <PhaseBadge>
    <PhaseLabel>Phase {phase.phase}</PhaseLabel>
    <PhaseParams>
      {phase.name} - {phase.sets} sets x {phase.reps} reps - {phase.tempo} - {phase.rest}
    </PhaseParams>
  </PhaseBadge>
);

const BuilderExplanationDetails: React.FC<{ details: string | string[] | undefined }> = ({ details }) => {
  if (!details) return null;

  return (
    <ExplanationDetails>
      {Array.isArray(details) ? details.join(' - ') : details}
    </ExplanationDetails>
  );
};

const BuilderExplanationItem: React.FC<{ explanation: WorkoutPlannerBuilderExplanation }> = ({ explanation }) => (
  <ExplanationItem key={workoutPlannerExplanationKey(explanation)} $type={explanation.type}>
    <ExplanationBadge $type={explanation.type}>
      {explanation.type.replace(/_/g, ' ')}
    </ExplanationBadge>
    <div>
      <div>{explanation.message}</div>
      <BuilderExplanationDetails details={explanation.details} />
    </div>
  </ExplanationItem>
);

const insightLabel = (count: number) => (
  `${count} insight${count === 1 ? '' : 's'}`
);

const ToggleChevron: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
);

const VisibleExplanations: React.FC<{
  explanations: WorkoutPlannerBuilderExplanation[];
  showExplanations: boolean;
}> = ({ explanations, showExplanations }) => {
  if (!showExplanations) return null;

  return (
    <>
      {explanations.map(explanation => (
        <BuilderExplanationItem
          key={workoutPlannerExplanationKey(explanation)}
          explanation={explanation}
        />
      ))}
    </>
  );
};

export const BuilderExplanationsPanel: React.FC<{
  explanations: WorkoutPlannerBuilderExplanation[];
  showExplanations: boolean;
  onToggleExplanations: () => void;
}> = ({ explanations, showExplanations, onToggleExplanations }) => {
  if (explanations.length === 0) return null;

  return (
    <ExplanationsPanel>
      <ExplanationsToggle onClick={onToggleExplanations}>
        <Info size={16} />
        Swan Coach Reasoning ({insightLabel(explanations.length)})
        <ToggleChevron expanded={showExplanations} />
      </ExplanationsToggle>
      <VisibleExplanations
        explanations={explanations}
        showExplanations={showExplanations}
      />
    </ExplanationsPanel>
  );
};
