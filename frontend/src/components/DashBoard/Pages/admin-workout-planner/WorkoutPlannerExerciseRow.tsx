import React from 'react';
import styled from 'styled-components';
import { Plus } from 'lucide-react';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import {
  ExerciseAddBtn,
  ExerciseItem,
  ExerciseMeta,
  ExerciseName,
  MetaTag,
} from './WorkoutPlannerStyles';

const RowContent = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 72px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
`;

function formatImpactLabel(impact: string): string {
  return impact.replace(' Impact', '');
}

interface WorkoutPlannerExerciseRowProps {
  exercise: ExerciseSlim;
  equipmentLabel: string;
  impact: string;
  selected: boolean;
  style: React.CSSProperties;
  onAdd: (exercise: ExerciseSlim) => void;
  onSelect: (exercise: ExerciseSlim) => void;
}

export const WorkoutPlannerExerciseRow: React.FC<WorkoutPlannerExerciseRowProps> = ({
  exercise,
  equipmentLabel,
  impact,
  selected,
  style,
  onAdd,
  onSelect,
}) => {
  const handleAdd = () => onAdd(exercise);
  const handleSelect = () => onSelect(exercise);

  return (
    <div style={style}>
      <ExerciseItem
        role="button"
        tabIndex={0}
        $selected={selected}
        onClick={handleSelect}
        onDoubleClick={handleAdd}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleAdd();
          }
        }}
      >
        <RowContent>
          <ExerciseName>{exercise.name}</ExerciseName>
          <ExerciseMeta>
            <MetaTag>{exercise.bodyPartCategory}</MetaTag>
            <MetaTag>{exercise.exerciseType}</MetaTag>
            <MetaTag>{equipmentLabel}</MetaTag>
            <MetaTag $impact={impact} title={impact} aria-label={impact}>
              {formatImpactLabel(impact)}
            </MetaTag>
          </ExerciseMeta>
        </RowContent>
        <ExerciseAddBtn
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleAdd();
          }}
          aria-label={`Add ${exercise.name}`}
        >
          <Plus size={18} />
        </ExerciseAddBtn>
      </ExerciseItem>
    </div>
  );
};
