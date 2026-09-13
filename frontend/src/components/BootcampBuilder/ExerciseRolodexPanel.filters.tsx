/**
 * Bootcamp ExerciseRolodex filter section (S04 extraction)
 * =======================================================
 * Extracted from ExerciseRolodexPanel.tsx so the panel stays inside the
 * project's 300-line cap (locked by ExerciseRolodexPanel.composition.test.ts).
 *
 * Purely presentational: it owns no search state and performs no fetch, add or
 * save. Every handler comes from the panel, which owns the state.
 */

import React from 'react';
import { Chip, ChipRow, FilterSection, FilterToggle } from './ExerciseRolodexPanel.styles';
import {
  EQUIPMENT_FILTERS,
  EXERCISE_TYPES,
  IMPACT_LEVELS,
  SOURCE_FILTERS,
} from './ExerciseRolodexPanel.constants';

export interface ExerciseRolodexFilterSectionProps {
  filtersOpen: boolean;
  activeFilterCount: number;
  sourceFilter: string | null;
  exerciseTypeFilter: string | null;
  equipmentFilter: string | null;
  impactFilter: string | null;
  onToggle: () => void;
  onSourceFilterChange: (value: string | null) => void;
  onExerciseTypeFilterChange: (value: string | null) => void;
  onEquipmentFilterChange: (value: string | null) => void;
  onImpactFilterChange: (value: string | null) => void;
}

const ExerciseRolodexFilterSection: React.FC<ExerciseRolodexFilterSectionProps> = ({
  filtersOpen,
  activeFilterCount,
  sourceFilter,
  exerciseTypeFilter,
  equipmentFilter,
  impactFilter,
  onToggle,
  onSourceFilterChange,
  onExerciseTypeFilterChange,
  onEquipmentFilterChange,
  onImpactFilterChange,
}) => (
  <>
    <FilterToggle $open={filtersOpen} onClick={onToggle} type="button">
      {filtersOpen ? 'Hide Filters' : 'More Filters'}{activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}
    </FilterToggle>

    <FilterSection $open={filtersOpen}>
      <ChipRow>
        {SOURCE_FILTERS.map((source) => (
          <Chip key={source} $active={sourceFilter === null ? source === 'All Programs' : sourceFilter === source.toLowerCase()} onClick={() => onSourceFilterChange(source === 'All Programs' ? null : source.toLowerCase())} type="button">
            {source}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow>
        {EXERCISE_TYPES.map((type) => (
          <Chip key={type} $active={exerciseTypeFilter === null ? type === 'All Types' : exerciseTypeFilter === type.toLowerCase()} onClick={() => onExerciseTypeFilterChange(type === 'All Types' ? null : type.toLowerCase())} type="button">
            {type}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow>
        {EQUIPMENT_FILTERS.map((equipment) => (
          <Chip key={equipment} $active={equipmentFilter === null ? equipment === 'All Equipment' : equipmentFilter === equipment.toLowerCase()} onClick={() => onEquipmentFilterChange(equipment === 'All Equipment' ? null : equipment.toLowerCase())} type="button">
            {equipment}
          </Chip>
        ))}
      </ChipRow>
      <ChipRow>
        {IMPACT_LEVELS.map((impact) => (
          <Chip key={impact} $active={impactFilter === null ? impact === 'All Impact' : impactFilter === impact} onClick={() => onImpactFilterChange(impact === 'All Impact' ? null : impact)} type="button">
            {impact}
          </Chip>
        ))}
      </ChipRow>
    </FilterSection>
  </>
);

export default ExerciseRolodexFilterSection;
