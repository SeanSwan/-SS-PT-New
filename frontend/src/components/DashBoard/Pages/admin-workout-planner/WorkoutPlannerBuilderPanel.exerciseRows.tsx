/**
 * BLUEPRINT: WorkoutPlannerBuilderPanel.exerciseRows
 * Purpose: render builder exercise rows, generation skeletons, and the add-exercise action.
 * Data: PlanExercise rows from the planner builder state.
 * Safety: preserves exercise callbacks, numeric fallbacks, row keys, and add/remove controls.
 */

import React from 'react';
import { Plus, X } from 'lucide-react';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { PlanExercise } from './WorkoutPlannerTypes';
import {
  ActionBtn,
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
  onSelectExercise: (exercise: ExerciseSlim) => void;
  onUpdateExercise: ExerciseUpdateHandler;
  onRemoveExercise: (id: string) => void;
}

const exerciseMeta = (planExercise: PlanExercise) => (
  planExercise.exerciseSlim.primaryMuscles.slice(0, 2).join(', ')
    || planExercise.exerciseSlim.bodyPartCategory
);

const BuilderExerciseRow: React.FC<BuilderExerciseRowProps> = ({
  planExercise,
  index,
  onSelectExercise,
  onUpdateExercise,
  onRemoveExercise,
}) => {
  const exerciseDisplayName = formatWorkoutPlannerExerciseName(planExercise.exerciseSlim.name);

  return (
    <BuilderRow key={planExercise.id}>
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
  onSelectExercise: (exercise: ExerciseSlim) => void;
  onUpdateExercise: ExerciseUpdateHandler;
  onRemoveExercise: (id: string) => void;
}

export const BuilderWorkoutContent: React.FC<BuilderWorkoutContentProps> = ({
  generating,
  planExercises,
  onSelectExercise,
  onUpdateExercise,
  onRemoveExercise,
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
    <>
      {planExercises.map((planExercise, index) => (
        <BuilderExerciseRow
          key={planExercise.id}
          planExercise={planExercise}
          index={index}
          onSelectExercise={onSelectExercise}
          onUpdateExercise={onUpdateExercise}
          onRemoveExercise={onRemoveExercise}
        />
      ))}
    </>
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
