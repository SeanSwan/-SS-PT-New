/**
 * BLUEPRINT: WorkoutPlannerBuilderPanel.exerciseRows
 * Purpose: render builder exercise rows, generation skeletons, and the add-exercise action.
 * Data: PlanExercise rows from the planner builder state.
 * Safety: preserves exercise callbacks, numeric fallbacks, row keys, and add/remove controls.
 */

import React from 'react';
import { ArrowLeftRight, Plus, X } from 'lucide-react';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { PlanExercise } from './WorkoutPlannerTypes';
import type { RolodexSwapTarget } from './useWorkoutPlannerRolodexState';
import {
  ActionBtn,
  BuilderExerciseList,
  BuilderRow,
  BuilderRowInfo,
  BuilderRowNumber,
  EmptyMessage,
  ExerciseMeta,
  GeneratingLabel,
  GeneratingSkeletonWrap,
  MiniInput,
  RemoveBtn,
  SkeletonBar,
  SkeletonCircle,
  SwapBtn,
  SwapCancelBtn,
  SwapModeBanner,
} from './WorkoutPlannerStyles';
import {
  BuilderActionRow,
  BuilderParamGroup,
  ClickableExerciseName,
  ParamField,
  ParamLabel,
  RepsInput,
  SkeletonDelayRow,
  SkeletonTextStack,
  TempoInput,
} from './WorkoutPlannerPage.styles';
import { formatWorkoutPlannerExerciseName } from './workoutPlannerExerciseDisplay';

const SKELETON_ROW_WIDTHS: ReadonlyArray<readonly [number, number]> = [
  [78, 42], [65, 35], [82, 48], [70, 38], [88, 45], [72, 41],
];

const GeneratingWorkoutState: React.FC = () => (
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
);

type ExerciseUpdateHandler = (id: string, field: keyof PlanExercise, value: unknown) => void;

interface BuilderExerciseRowProps {
  planExercise: PlanExercise;
  index: number;
  isSwapTarget: boolean;
  onSelectExercise: (exercise: ExerciseSlim) => void;
  onUpdateExercise: ExerciseUpdateHandler;
  onRemoveExercise: (id: string) => void;
  onBeginSwap: (rowId: string, exerciseName: string) => void;
}

const exerciseMeta = (planExercise: PlanExercise) => (
  planExercise.exerciseSlim.primaryMuscles.slice(0, 2).join(', ')
    || planExercise.exerciseSlim.bodyPartCategory
);

const BuilderExerciseRow: React.FC<BuilderExerciseRowProps> = ({
  planExercise,
  index,
  isSwapTarget,
  onSelectExercise,
  onUpdateExercise,
  onRemoveExercise,
  onBeginSwap,
}) => {
  const exerciseDisplayName = formatWorkoutPlannerExerciseName(planExercise.exerciseSlim.name);

  return (
    <BuilderRow key={planExercise.id} aria-current={isSwapTarget ? 'true' : undefined}>
      <BuilderRowNumber>{index + 1}</BuilderRowNumber>
      <BuilderRowInfo>
        <ClickableExerciseName onClick={() => onSelectExercise(planExercise.exerciseSlim)}>
          {exerciseDisplayName}
        </ClickableExerciseName>
        <ExerciseMeta>{exerciseMeta(planExercise)}</ExerciseMeta>
      </BuilderRowInfo>
      <BuilderParamGroup>
        <ParamField>
          <ParamLabel>Sets</ParamLabel>
          <MiniInput
            type="number"
            value={planExercise.sets}
            onChange={event => onUpdateExercise(planExercise.id, 'sets', parseInt(event.target.value, 10) || 1)}
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
            onChange={event => onUpdateExercise(planExercise.id, 'restSeconds', parseInt(event.target.value, 10) || 0)}
            min={0}
            max={600}
          />
        </ParamField>
      </BuilderParamGroup>
      <SwapBtn
        onClick={() => onBeginSwap(planExercise.id, exerciseDisplayName)}
        aria-label={`Swap ${exerciseDisplayName} for another exercise`}
        aria-pressed={isSwapTarget}
        title="Swap this exercise"
      >
        <ArrowLeftRight size={14} />
      </SwapBtn>
      <RemoveBtn
        onClick={() => onRemoveExercise(planExercise.id)}
        aria-label={`Remove ${exerciseDisplayName}`}
      >
        <X size={14} />
      </RemoveBtn>
    </BuilderRow>
  );
};

interface BuilderWorkoutContentProps {
  generating: boolean;
  planExercises: PlanExercise[];
  swapTarget: RolodexSwapTarget | null;
  onSelectExercise: (exercise: ExerciseSlim) => void;
  onUpdateExercise: ExerciseUpdateHandler;
  onRemoveExercise: (id: string) => void;
  onBeginSwap: (rowId: string, exerciseName: string) => void;
  onCancelSwap: () => void;
}

export const BuilderWorkoutContent: React.FC<BuilderWorkoutContentProps> = ({
  generating,
  planExercises,
  swapTarget,
  onSelectExercise,
  onUpdateExercise,
  onRemoveExercise,
  onBeginSwap,
  onCancelSwap,
}) => {
  if (generating) return <GeneratingWorkoutState />;
  if (planExercises.length === 0) {
    return (
      <EmptyMessage>
        Click exercises in the Rolodex to add them, or use Swan Coach Generate for an intelligent program.
      </EmptyMessage>
    );
  }

  return (
    <BuilderExerciseList>
      {swapTarget && (
        <SwapModeBanner role="status" aria-live="polite">
          <span>
            Swapping <strong>{swapTarget.exerciseName}</strong> — pick its replacement from the Exercise Rolodex.
          </span>
          <SwapCancelBtn onClick={onCancelSwap}>Cancel swap</SwapCancelBtn>
        </SwapModeBanner>
      )}
      {planExercises.map((planExercise, index) => (
        <BuilderExerciseRow
          key={planExercise.id}
          planExercise={planExercise}
          index={index}
          isSwapTarget={swapTarget?.kind === 'builder' && swapTarget.rowId === planExercise.id}
          onSelectExercise={onSelectExercise}
          onUpdateExercise={onUpdateExercise}
          onRemoveExercise={onRemoveExercise}
          onBeginSwap={onBeginSwap}
        />
      ))}
    </BuilderExerciseList>
  );
};

export const BuilderAddExerciseAction: React.FC<{
  planExercises: PlanExercise[];
  onBrowseAddExercise: () => void;
}> = ({ planExercises, onBrowseAddExercise }) => {
  if (planExercises.length === 0) return null;

  return (
    <BuilderActionRow>
      <ActionBtn onClick={onBrowseAddExercise}>
        <Plus size={14} />
        Add Exercise
      </ActionBtn>
    </BuilderActionRow>
  );
};
