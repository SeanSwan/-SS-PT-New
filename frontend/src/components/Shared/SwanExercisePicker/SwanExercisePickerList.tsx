/**
 * SwanExercisePickerList (Phase 2.3a)
 * ===================================
 * Virtualized results list (react-window v2 — the repo-standard List API
 * used by the logger rolodex and bootcamp panel). Rows are non-interactive
 * containers; the ONLY control is the always-visible action button (no
 * hover-only actions, no nested-interactive DOM). The 840-exercise library
 * renders as ~7 mounted rows.
 */
import React, { useCallback } from 'react';
import type { CSSProperties } from 'react';
import { List } from 'react-window';
import { exerciseLevel } from './filters';
import { AddButton, ListViewport, MetaTag, RowBody, RowCard, RowMeta, RowName } from './styles';
import type { ExerciseSlim, SwanPickerModeConfig } from './types';

const MAX_VISIBLE_MUSCLES = 3;

export interface SwanExercisePickerListProps {
  exercises: ExerciseSlim[];
  config: SwanPickerModeConfig;
  onSelect: (exercise: ExerciseSlim) => void;
}

const SwanExercisePickerList: React.FC<SwanExercisePickerListProps> = ({
  exercises,
  config,
  onSelect,
}) => {
  const RowRenderer = useCallback(({ index, style }: { index: number; style: CSSProperties }) => {
    const exercise = exercises[index];
    if (!exercise) return null;
    const muscles = exercise.primaryMuscles ?? [];
    const hidden = Math.max(0, muscles.length - MAX_VISIBLE_MUSCLES);

    return (
      <div style={style}>
        <RowCard>
          <RowBody>
            <RowName>{exercise.name}</RowName>
            <RowMeta>
              <MetaTag>{exercise.exerciseType}</MetaTag>
              <MetaTag>Level {exerciseLevel(exercise.difficulty)}</MetaTag>
              {muscles.slice(0, MAX_VISIBLE_MUSCLES).map((muscle) => (
                <MetaTag key={`${exercise.id}-${muscle}`}>{muscle}</MetaTag>
              ))}
              {hidden > 0 && <MetaTag>+{hidden} more</MetaTag>}
            </RowMeta>
          </RowBody>
          <AddButton
            type="button"
            onClick={() => onSelect(exercise)}
            aria-label={`${config.actionLabel} ${exercise.name}${config.actionAriaSuffix}`}
          >
            {config.actionLabel}
          </AddButton>
        </RowCard>
      </div>
    );
  }, [exercises, config.actionLabel, onSelect]);

  const height = Math.min(exercises.length, config.visibleRows) * config.rowHeight;

  return (
    <ListViewport>
      <List
        rowComponent={RowRenderer as never}
        rowCount={exercises.length}
        rowHeight={config.rowHeight}
        rowProps={{} as never}
        style={{ height, overflowX: 'hidden' }}
      />
    </ListViewport>
  );
};

export default SwanExercisePickerList;
