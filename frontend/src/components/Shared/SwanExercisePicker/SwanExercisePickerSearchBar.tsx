/**
 * SwanExercisePickerSearchBar (Phase 2.3a)
 * ========================================
 * Labeled search + the filter selects the active mode config exposes.
 * Pure controlled component — all state lives in useSwanExercisePicker.
 */
import React from 'react';
import { EXERCISE_TYPE_OPTIONS, EQUIPMENT_OPTIONS, MUSCLE_GROUP_OPTIONS } from './filters';
import { FilterRow, FilterSelect, SearchInput, SearchRow } from './styles';
import type { SwanPickerModeConfig } from './types';

export interface SwanExercisePickerSearchBarProps {
  config: SwanPickerModeConfig;
  inputValue: string;
  onInputChange: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  muscleFilter: string;
  setMuscleFilter: (value: string) => void;
  equipFilter: string;
  setEquipFilter: (value: string) => void;
}

const SwanExercisePickerSearchBar: React.FC<SwanExercisePickerSearchBarProps> = ({
  config,
  inputValue,
  onInputChange,
  typeFilter,
  setTypeFilter,
  muscleFilter,
  setMuscleFilter,
  equipFilter,
  setEquipFilter,
}) => {
  const showFilters = config.showTypeFilter || config.showMuscleFilter || config.showEquipmentFilter;

  return (
    <SearchRow>
      <SearchInput
        type="search"
        aria-label="Search exercises"
        placeholder="Search exercises..."
        value={inputValue}
        onChange={(e) => onInputChange(e.target.value)}
      />
      {showFilters && (
        <FilterRow>
          {config.showTypeFilter && (
            <FilterSelect aria-label="Filter by exercise type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {EXERCISE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </FilterSelect>
          )}
          {config.showMuscleFilter && (
            <FilterSelect aria-label="Filter by muscle group" value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)}>
              {MUSCLE_GROUP_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </FilterSelect>
          )}
          {config.showEquipmentFilter && (
            <FilterSelect aria-label="Filter by equipment" value={equipFilter} onChange={(e) => setEquipFilter(e.target.value)}>
              {EQUIPMENT_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </FilterSelect>
          )}
        </FilterRow>
      )}
    </SearchRow>
  );
};

export default SwanExercisePickerSearchBar;
