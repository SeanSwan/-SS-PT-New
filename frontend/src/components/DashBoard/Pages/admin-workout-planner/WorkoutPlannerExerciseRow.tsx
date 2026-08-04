/**
 * COMPONENT: WorkoutPlannerExerciseRow
 * PURPOSE: Media-aware virtualized exercise row for the admin Workout Planner.
 * OWNER: Codex
 * LAST VALIDATED: 2026-06-22
 *
 * WIREFRAME:
 * +--------------------------------------------------------------+
 * | media thumbnail | exercise name + metadata tags | add button |
 * +--------------------------------------------------------------+
 *
 * DATA FLOW:
 * Props in: ExerciseSlim plus planner filter labels and handlers.
 * State: none.
 * API calls: none.
 * Events: select row, double-click/add, keyboard add, explicit add button.
 */

import React from 'react';
import styled from 'styled-components';
import { Plus } from 'lucide-react';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import ExerciseMediaPreview from '../../../WorkoutLogger/ExerciseMediaPreview';
import {
  ExerciseAddBtn,
  ExerciseDetailLine,
  ExerciseItem,
  ExerciseMeta,
  ExerciseName,
  ExerciseRowContent,
  MetaTag,
  PlannerMediaThumb,
} from './WorkoutPlannerStyles';
import { formatWorkoutPlannerExerciseName } from './workoutPlannerExerciseDisplay';
import { StyledBox } from '@/components/ui/StyledBox';

function formatImpactLabel(impact: string): string {
  return impact.replace(' Impact', '');
}

function formatMuscles(exercise: ExerciseSlim): string {
  const muscles = exercise.primaryMuscles?.filter(Boolean).slice(0, 3) ?? [];
  if (muscles.length > 0) return muscles.join(', ');
  return exercise.bodyPartCategory || 'Full body';
}

function formatPlanDefaults(exercise: ExerciseSlim): string | null {
  if (exercise.recommendedSets && exercise.recommendedReps) {
    return `${exercise.recommendedSets} sets x ${exercise.recommendedReps}`;
  }
  if (exercise.recommendedDuration) return `${exercise.recommendedDuration}s duration`;
  if (exercise.defaultTempo || exercise.defaultRestSeconds) {
    return [
      exercise.defaultTempo ? `Tempo ${exercise.defaultTempo}` : null,
      exercise.defaultRestSeconds ? `${exercise.defaultRestSeconds}s rest` : null,
    ].filter(Boolean).join(' | ');
  }
  return null;
}

function formatNasmSignal(exercise: ExerciseSlim): string | null {
  if (exercise.nasmMovementPattern) return exercise.nasmMovementPattern;
  if (exercise.optPhases?.length) return `OPT ${exercise.optPhases.join(', ')}`;
  return null;
}

const InPlanBadge = styled.span`
  align-self: flex-start;
  padding: 3px 8px;
  border: 1px solid color-mix(in srgb, var(--success, #22C55E) 45%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--success, #22C55E) 12%, transparent);
  color: var(--success, #22C55E);
  font: 700 0.68rem/1.2 'Sora', sans-serif;
`;
interface WorkoutPlannerExerciseRowProps {
  exercise: ExerciseSlim;
  equipmentLabel: string;
  impact: string;
  selected: boolean;
  inPlan: boolean;
  style: React.CSSProperties;
  onAdd: (exercise: ExerciseSlim) => void;
  onSelect: (exercise: ExerciseSlim) => void;
}

export const WorkoutPlannerExerciseRow: React.FC<WorkoutPlannerExerciseRowProps> = ({
  exercise,
  equipmentLabel,
  impact,
  selected,
  inPlan,
  style,
  onAdd,
  onSelect,
}) => {
  const handleAdd = () => { if (!inPlan) onAdd(exercise); };
  const handleSelect = () => onSelect(exercise);
  const exerciseDisplayName = formatWorkoutPlannerExerciseName(exercise.name);
  const planDefaults = formatPlanDefaults(exercise);
  const nasmSignal = formatNasmSignal(exercise);

  return (
    <StyledBox as="div" $style={style}>
      <ExerciseItem
        role="listitem"
        aria-label={`${exerciseDisplayName} exercise`}
        $selected={selected}
        onClick={handleSelect}
        onDoubleClick={handleAdd}
      >
        <PlannerMediaThumb aria-hidden="true">
          <ExerciseMediaPreview exercise={exercise} variant="thumbnail" />
        </PlannerMediaThumb>
        <ExerciseRowContent>
          <ExerciseName>{exerciseDisplayName}</ExerciseName>
          <ExerciseDetailLine>{formatMuscles(exercise)}</ExerciseDetailLine>
          {inPlan && <InPlanBadge>Already in plan</InPlanBadge>}
          <ExerciseMeta>
            <MetaTag>{exercise.bodyPartCategory}</MetaTag>
            <MetaTag>{exercise.exerciseType}</MetaTag>
            <MetaTag>{equipmentLabel}</MetaTag>
            <MetaTag $impact={impact} title={impact} aria-label={impact}>
              {formatImpactLabel(impact)}
            </MetaTag>
          </ExerciseMeta>
          {(planDefaults || nasmSignal) && (
            <ExerciseDetailLine>
              {[planDefaults, nasmSignal].filter(Boolean).join(' | ')}
            </ExerciseDetailLine>
          )}
        </ExerciseRowContent>
        <ExerciseAddBtn
          type="button"
          disabled={inPlan}
          onClick={(e) => {
            e.stopPropagation();
            handleAdd();
          }}
          aria-label={inPlan ? `${exerciseDisplayName} already in plan` : `Add ${exerciseDisplayName}`}
        >
          <Plus size={18} />
        </ExerciseAddBtn>
      </ExerciseItem>
    </StyledBox>
  );
};
