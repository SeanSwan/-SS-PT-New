/**
 * COMPONENT: RolodexFilterRows
 * OWNER: WorkoutLogger / NASM Exercise Rolodex (Slice 11 extraction)
 * PURPOSE: The "More Filters" type + equipment chip rows, extracted VERBATIM
 *          so the Rolodex shell stays under its 300-line contract. No visual
 *          or behavioral change.
 */

import React from 'react';
import { EQUIPMENT_TYPES, EXERCISE_TYPES } from './NASMExerciseRolodex.helpers';
import { FilterLabel, FilterRows, MiniChip, MiniChipRow } from './NASMExerciseRolodex.styles';

const RolodexFilterRows: React.FC<{
  typeFilter: string | null;
  equipFilter: string | null;
  onTypeChange: (value: string | null) => void;
  onEquipChange: (value: string | null) => void;
}> = ({ typeFilter, equipFilter, onTypeChange, onEquipChange }) => (
  <FilterRows>
    <FilterLabel>Type:</FilterLabel>
    <MiniChipRow>
      {EXERCISE_TYPES.map(type => (
        <MiniChip
          key={type}
          type="button"
          $active={typeFilter === null ? type === 'All' : typeFilter.toLowerCase() === type.toLowerCase()}
          onClick={() => onTypeChange(type === 'All' ? null : type)}
        >
          {type}
        </MiniChip>
      ))}
    </MiniChipRow>
    <FilterLabel>Equipment:</FilterLabel>
    <MiniChipRow>
      {EQUIPMENT_TYPES.map(equipment => (
        <MiniChip
          key={equipment}
          type="button"
          $active={equipFilter === null ? equipment === 'All' : equipFilter.toLowerCase() === equipment.toLowerCase()}
          onClick={() => onEquipChange(equipment === 'All' ? null : equipment)}
        >
          {equipment}
        </MiniChip>
      ))}
    </MiniChipRow>
  </FilterRows>
);

export default RolodexFilterRows;
