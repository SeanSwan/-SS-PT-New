/**
 * COMPONENT: WorkoutPlannerBuilderPanel
 * PURPOSE: Renders the manual workout builder, save matrix, skeleton state,
 * exercise parameter rows, and Swan Coach reasoning panel.
 */

import React from 'react';
import { ChevronDown, ChevronUp, Info, Loader2, Plus, Save, X, Zap } from 'lucide-react';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { OPTPhaseParams, PlanExercise } from './WorkoutPlannerTypes';
import type { SavedPlanSummary } from './WorkoutPlannerSavedPlansSection';
import { workoutPlannerExplanationKey } from './WorkoutPlannerRowKeys';
import {
  ActionBtn,
  BuilderRow,
  BuilderRowInfo,
  BuilderRowNumber,
  EmptyMessage,
  ExerciseMeta,
  ExplanationBadge,
  ExplanationItem,
  ExplanationsPanel,
  ExplanationsToggle,
  GeneratingLabel,
  GeneratingSkeletonWrap,
  MiniInput,
  PanelBody,
  PanelHeader,
  PanelTitle,
  PhaseBadge,
  PhaseLabel,
  PhaseParams,
  RemoveBtn,
  SkeletonBar,
  SkeletonCircle,
} from './WorkoutPlannerStyles';
import {
  ActionWrap,
  BuilderActionRow,
  BuilderParamGroup,
  ClickableExerciseName,
  DegradedPanel,
  ExplanationDetails,
  ParamField,
  ParamLabel,
  RepsInput,
  SkeletonDelayRow,
  SkeletonTextStack,
  TempoInput,
} from './WorkoutPlannerPage.styles';

const SKELETON_ROW_WIDTHS: ReadonlyArray<readonly [number, number]> = [
  [78, 42], [65, 35], [82, 48], [70, 38], [88, 45], [72, 41],
];

export interface WorkoutPlannerBuilderExplanation {
  type: string;
  message: string;
  details?: string | string[];
}

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
  const noLoaded = !loadedPlanId;
  const loadedPlan = loadedPlanId
    ? savedPlans.find(plan => plan.id === loadedPlanId)
    : null;
  const loadedIsCurrent = loadedPlan?.status === 'active';

  return (
    <DegradedPanel $degraded={degradedIntelligence}>
      <PanelHeader>
        <PanelTitle><Zap size={16} /> Workout Builder</PanelTitle>
        <ActionWrap>
          {noLoaded && (
            <>
              <ActionBtn
                onClick={onSaveDraft}
                disabled={saving || !hasExercises}
                aria-label="Save current builder as a new draft plan"
              >
                {saving ? <Loader2 size={14} /> : <Save size={14} />}
                Save Draft
              </ActionBtn>
              <ActionBtn
                onClick={onSaveAndActivate}
                disabled={saving || !hasExercises}
                aria-label="Save and make current"
              >
                {saving ? <Loader2 size={14} /> : <Save size={14} />}
                Save & Make Current
              </ActionBtn>
            </>
          )}
          {loadedPlanId && (
            <>
              <ActionBtn
                onClick={onUpdateLoaded}
                disabled={saving || !hasExercises || !isDirty}
                aria-label="Update the loaded plan with current builder state"
              >
                {saving ? <Loader2 size={14} /> : <Save size={14} />}
                Update Plan
              </ActionBtn>
              {!loadedIsCurrent && (
                <ActionBtn
                  onClick={onUpdateAndActivate}
                  disabled={saving || !hasExercises}
                  aria-label="Update the loaded plan and make it current"
                >
                  {saving ? <Loader2 size={14} /> : <Save size={14} />}
                  Update & Make Current
                </ActionBtn>
              )}
              <ActionBtn
                onClick={onDuplicateLoadedPlan}
                disabled={saving}
                aria-label="Save current as a new copy"
              >
                {saving ? <Loader2 size={14} /> : <Save size={14} />}
                Save as Copy
              </ActionBtn>
            </>
          )}
        </ActionWrap>
      </PanelHeader>

      <PanelBody>
        <PhaseBadge>
          <PhaseLabel>Phase {phase.phase}</PhaseLabel>
          <PhaseParams>
            {phase.name} - {phase.sets} sets x {phase.reps} reps - {phase.tempo} - {phase.rest}
          </PhaseParams>
        </PhaseBadge>

        {generating ? (
          <GeneratingSkeletonWrap role="status" aria-live="polite" aria-label="Generating workout">
            <GeneratingLabel>Swan Coach is analyzing client data and building your workout...</GeneratingLabel>
            {SKELETON_ROW_WIDTHS.map(([w1, w2], index) => (
              <SkeletonDelayRow key={index} $delayMs={index * 100}>
                <SkeletonCircle />
                <SkeletonTextStack>
                  <SkeletonBar $width={`${w1}%`} />
                  <SkeletonBar $width={`${w2}%`} />
                </SkeletonTextStack>
              </SkeletonDelayRow>
            ))}
          </GeneratingSkeletonWrap>
        ) : planExercises.length === 0 ? (
          <EmptyMessage>
            Click exercises in the Rolodex to add them, or use Swan Coach Generate for an intelligent program.
          </EmptyMessage>
        ) : (
          planExercises.map((planExercise, index) => (
            <BuilderRow key={planExercise.id}>
              <BuilderRowNumber>{index + 1}</BuilderRowNumber>
              <BuilderRowInfo>
                <ClickableExerciseName onClick={() => onSelectExercise(planExercise.exerciseSlim)}>
                  {planExercise.exerciseSlim.name}
                </ClickableExerciseName>
                <ExerciseMeta>
                  {planExercise.exerciseSlim.primaryMuscles.slice(0, 2).join(', ') || planExercise.exerciseSlim.bodyPartCategory}
                </ExerciseMeta>
              </BuilderRowInfo>
              <BuilderParamGroup>
                <ParamField>
                  <ParamLabel>Sets</ParamLabel>
                  <MiniInput
                    type="number"
                    value={planExercise.sets}
                    onChange={event => onUpdateExercise(planExercise.id, 'sets', parseInt(event.target.value) || 1)}
                    min={1}
                    max={10}
                  />
                </ParamField>
                <ParamField>
                  <ParamLabel>Reps</ParamLabel>
                  <RepsInput
                    value={planExercise.reps}
                    onChange={event => onUpdateExercise(planExercise.id, 'reps', event.target.value)}
                  />
                </ParamField>
                <ParamField>
                  <ParamLabel>Tempo</ParamLabel>
                  <TempoInput
                    value={planExercise.tempo}
                    onChange={event => onUpdateExercise(planExercise.id, 'tempo', event.target.value)}
                  />
                </ParamField>
                <ParamField>
                  <ParamLabel>Rest(s)</ParamLabel>
                  <MiniInput
                    type="number"
                    value={planExercise.restSeconds}
                    onChange={event => onUpdateExercise(planExercise.id, 'restSeconds', parseInt(event.target.value) || 0)}
                    min={0}
                    max={600}
                  />
                </ParamField>
              </BuilderParamGroup>
              <RemoveBtn onClick={() => onRemoveExercise(planExercise.id)} aria-label={`Remove ${planExercise.exerciseSlim.name}`}>
                <X size={14} />
              </RemoveBtn>
            </BuilderRow>
          ))
        )}

        {planExercises.length > 0 && (
          <BuilderActionRow>
            <ActionBtn onClick={onBrowseAddExercise}>
              <Plus size={14} />
              Add Exercise
            </ActionBtn>
          </BuilderActionRow>
        )}

        {explanations.length > 0 && (
          <ExplanationsPanel>
            <ExplanationsToggle onClick={onToggleExplanations}>
              <Info size={16} />
              Swan Coach Reasoning ({explanations.length} insight{explanations.length !== 1 ? 's' : ''})
              {showExplanations ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </ExplanationsToggle>
            {showExplanations && explanations.map(explanation => (
              <ExplanationItem key={workoutPlannerExplanationKey(explanation)} $type={explanation.type}>
                <ExplanationBadge $type={explanation.type}>
                  {explanation.type.replace(/_/g, ' ')}
                </ExplanationBadge>
                <div>
                  <div>{explanation.message}</div>
                  {explanation.details && (
                    <ExplanationDetails>
                      {Array.isArray(explanation.details)
                        ? explanation.details.join(' - ')
                        : explanation.details}
                    </ExplanationDetails>
                  )}
                </div>
              </ExplanationItem>
            ))}
          </ExplanationsPanel>
        )}
      </PanelBody>
    </DegradedPanel>
  );
};

export default WorkoutPlannerBuilderPanel;
