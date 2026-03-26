/**
 * ============================================================================
 * FILE: MultiChipPicker.tsx
 * PURPOSE: Reusable multi-select chip picker with native dropdown
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a labelled dropdown that appends selected values
 * as removable chip tags. Used for focus areas and equipment selection.
 *
 * HOW IT FITS IN THE APP: Child of TrainingScheduleStep. Could be reused
 * anywhere a multi-select chip pattern is needed.
 *
 * KEY DECISIONS: Uses native <select> for maximum mobile compatibility and
 * 44px touch targets. Chips are rendered in a flex-wrap row above the dropdown.
 */

/**
 * ┌─── SUB-COMPONENT: MultiChipPicker ─────────────────────────┐
 * │ PARENT: TrainingScheduleStep                                 │
 * │ PURPOSE: Multi-select with chip tags and native dropdown     │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────┐                     │
 * │ │ Label                                │                     │
 * │ │ [Chip1 x] [Chip2 x] [Chip3 x]       │                     │
 * │ │ [▼ Add item...]                      │                     │
 * │ └──────────────────────────────────────┘                     │
 * │ Props: { label, options, selected, onChange }                 │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Select option] -> Adds to selected -> Calls onChange        │
 * │ [Chip X button] -> Removes from selected -> Calls onChange   │
 * └──────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { X } from 'lucide-react';
import {
  ChipPickerWrap,
  ChipSelectedRow,
  ChipTag,
  ChipRemoveBtn,
  FieldLabel,
  NativeSelect,
} from './WorkoutPlanBuilderStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────
export interface MultiChipPickerProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const MultiChipPicker: React.FC<MultiChipPickerProps> = ({ label, options, selected, onChange }) => {
  const available = options.filter(o => !selected.includes(o));

  return (
    <ChipPickerWrap>
      <FieldLabel>{label}</FieldLabel>
      <ChipSelectedRow>
        {selected.map(item => (
          <ChipTag key={item}>
            {item}
            <ChipRemoveBtn
              type="button"
              onClick={() => onChange(selected.filter(s => s !== item))}
              aria-label={`Remove ${item}`}
            >
              <X size={12} />
            </ChipRemoveBtn>
          </ChipTag>
        ))}
      </ChipSelectedRow>
      {available.length > 0 && (
        <NativeSelect
          value=""
          onChange={(e) => {
            if (e.target.value) {
              onChange([...selected, e.target.value]);
              e.target.value = '';
            }
          }}
        >
          <option value="">Add {label.toLowerCase()}...</option>
          {available.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </NativeSelect>
      )}
    </ChipPickerWrap>
  );
};

export default React.memo(MultiChipPicker);
