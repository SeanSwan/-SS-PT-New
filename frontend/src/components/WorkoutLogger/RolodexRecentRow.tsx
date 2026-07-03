/**
 * COMPONENT: RolodexRecentRow
 * OWNER: WorkoutLogger / NASM Exercise Rolodex (Slice 10)
 * PURPOSE: One-tap chips for the operator's recently picked exercises —
 *          rendered only when the search box is empty so it never competes
 *          with live search results.
 * DATA: recentExercises.ts refs resolved against the live catalog by the
 *       parent (stale ids are dropped there; this row is purely visual).
 */

import React from 'react';
import { History } from 'lucide-react';
import type { ExerciseSlim } from './useExerciseSearch';
import { FilterLabel, MiniChip, MiniChipRow } from './NASMExerciseRolodex.styles';

const RolodexRecentRow: React.FC<{
  recents: ExerciseSlim[];
  onPick: (exercise: ExerciseSlim) => void;
}> = ({ recents, onPick }) => {
  if (recents.length === 0) return null;
  return (
    <MiniChipRow data-testid="rolodex-recent-row" aria-label="Recently logged exercises">
      <FilterLabel>
        <History size={12} aria-hidden="true" /> Recent
      </FilterLabel>
      {recents.map((exercise) => (
        <MiniChip
          key={exercise.id}
          type="button"
          $active={false}
          onClick={() => onPick(exercise)}
          aria-label={`Log ${exercise.name} again`}
        >
          {exercise.name}
        </MiniChip>
      ))}
    </MiniChipRow>
  );
};

export default RolodexRecentRow;
