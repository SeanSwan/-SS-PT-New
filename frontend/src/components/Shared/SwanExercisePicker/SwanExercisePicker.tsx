/**
 * SwanExercisePicker — shared picker shell (Phase 2.3a)
 * =====================================================
 * The ONE exercise-selection surface (see types.ts for the mode contract
 * and the convergence story). Composes the search bar, the virtualized
 * list, and truthful loading/empty states around useSwanExercisePicker.
 *
 * Always-emit invariant: onSelect receives the full ExerciseSlim — every
 * consumer maps to its own shape at its own edge (see the workout-page
 * ExerciseSelector adapter for the reference pattern).
 */
import React from 'react';
import SwanExercisePickerSearchBar from './SwanExercisePickerSearchBar';
import SwanExercisePickerList from './SwanExercisePickerList';
import { useSwanExercisePicker } from './useSwanExercisePicker';
import { PickerContainer, PickerHeader, ResultCount, StateMessage } from './styles';
import { SWAN_PICKER_MODES } from './types';
import type { ExerciseSlim, SwanExercisePickerOptions } from './types';

export interface SwanExercisePickerProps extends SwanExercisePickerOptions {
  onSelect: (exercise: ExerciseSlim) => void;
  title?: string;
}

const SwanExercisePicker: React.FC<SwanExercisePickerProps> = ({
  onSelect,
  title,
  ...options
}) => {
  const config = SWAN_PICKER_MODES[options.mode];
  const picker = useSwanExercisePicker(options);

  return (
    <PickerContainer>
      <PickerHeader>
        <h3>{title ?? 'Exercise Library'}</h3>
        {!picker.isLoading && picker.totalCount > 0 && (
          <ResultCount>
            {picker.visible.length} of {picker.totalCount} exercises
          </ResultCount>
        )}
      </PickerHeader>

      <SwanExercisePickerSearchBar
        config={config}
        inputValue={picker.inputValue}
        onInputChange={picker.onInputChange}
        typeFilter={picker.typeFilter}
        setTypeFilter={picker.setTypeFilter}
        muscleFilter={picker.muscleFilter}
        setMuscleFilter={picker.setMuscleFilter}
        equipFilter={picker.equipFilter}
        setEquipFilter={picker.setEquipFilter}
      />

      {picker.isLoading ? (
        <StateMessage>Loading exercises...</StateMessage>
      ) : picker.totalCount === 0 ? (
        /* Truthful failure state: an empty library means the fetch failed
           (the live catalog is 840 strong) — don't blame the user's filters. */
        <StateMessage>Couldn't load the exercise library. Check your connection and try again.</StateMessage>
      ) : picker.visible.length === 0 ? (
        <StateMessage>No exercises found. Try adjusting your search or filters.</StateMessage>
      ) : (
        <SwanExercisePickerList
          exercises={picker.visible}
          config={config}
          onSelect={onSelect}
        />
      )}
    </PickerContainer>
  );
};

export default SwanExercisePicker;
