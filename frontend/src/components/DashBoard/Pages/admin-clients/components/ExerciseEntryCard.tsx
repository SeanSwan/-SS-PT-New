/**
 * ============================================================================
 * FILE: ExerciseEntryCard.tsx
 * PURPOSE: Reusable exercise entry card for WorkoutLoggerModal
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a single exercise entry with autocomplete name,
 * tempo/rest meta inputs, and per-set reps/weight rows.
 * HOW IT FITS IN THE APP: Used by WorkoutLoggerModal for both core and main exercises
 * KEY DECISIONS: Extracted from 1070-line monolith per 300-line decomposition rule
 *
 * ┌─── SUB-COMPONENT: ExerciseEntryCard ───────────────────────┐
 * │ PARENT: WorkoutLoggerModal                                  │
 * │ PURPOSE: Single exercise with sets, reps, weight inputs     │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────────────┐   │
 * │ │ [🔍 Exercise Autocomplete]               [🗑 Remove] │   │
 * │ │ Tempo: [____]   Rest: [____]                         │   │
 * │ │ #1  Reps: [___]  Weight: [___]  [🗑]                │   │
 * │ │ #2  Reps: [___]  Weight: [___]  [🗑]                │   │
 * │ │ [+ Add Set]                                          │   │
 * │ └──────────────────────────────────────────────────────┘   │
 * │ Props: { exercise, index, errors?, isCore?, on* handlers } │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Autocomplete] → Search 736 NASM exercises → select name   │
 * │ [+ Add Set]    → Append set row                             │
 * │ [Remove set]   → Remove row, renumber remaining             │
 * │ [Remove card]  → Remove entire exercise from parent list    │
 * │ GAMIFICATION: None (parent handles XP on save)              │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import ExerciseAutocomplete from '../../../../WorkoutLogger/ExerciseAutocomplete';
import {
  ExerciseCard,
  ExerciseHeader,
  ExerciseMetaRow,
  SetRow,
  SetLabel,
  FormGroup,
  Label,
  SmallInput,
  AddButton,
  RemoveButton,
  ErrorText,
} from './WorkoutLoggerStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export interface WorkoutSet {
  setNumber: number;
  reps: string;
  weight: string;
}

export interface Exercise {
  name: string;
  sets: WorkoutSet[];
  tempo?: string;
  rest?: string;
}

interface ExerciseEntryCardProps {
  exercise: Exercise;
  index: number;
  isCore?: boolean;
  canRemove?: boolean;
  errors?: Record<string, string>;
  onNameChange: (index: number, name: string) => void;
  onMetaChange: (index: number, field: 'tempo' | 'rest', value: string) => void;
  onSetChange: (exIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => void;
  onAddSet?: (index: number) => void;
  onRemoveSet?: (exIndex: number, setIndex: number) => void;
  onRemoveExercise?: (index: number) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const ExerciseEntryCard: React.FC<ExerciseEntryCardProps> = ({
  exercise,
  index,
  isCore = false,
  canRemove = true,
  errors = {},
  onNameChange,
  onMetaChange,
  onSetChange,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
}) => {
  const prefix = isCore ? 'core' : '';
  const testIdPrefix = isCore ? `core-exercise` : `exercise`;

  return (
    <ExerciseCard
      data-testid={`${testIdPrefix}-card-${index}`}
      style={isCore ? { background: 'rgba(139, 92, 246, 0.03)' } : undefined}
    >
      <ExerciseHeader>
        <FormGroup style={{ flex: 1, marginRight: 8 }}>
          <Label>{isCore ? 'Exercise' : 'Exercise Name *'}</Label>
          <ExerciseAutocomplete
            data-testid={`${testIdPrefix}-name-${index}`}
            placeholder="Search NASM exercises..."
            value={exercise.name}
            onChange={(name: string) => onNameChange(index, name)}
          />
          {errors[`exercise_${index}_name`] && (
            <ErrorText>{errors[`exercise_${index}_name`]}</ErrorText>
          )}
        </FormGroup>
        {canRemove && !isCore && onRemoveExercise && (
          <RemoveButton
            onClick={() => onRemoveExercise(index)}
            data-testid={`remove-exercise-${index}`}
            title="Remove exercise"
          >
            <Trash2 size={16} />
          </RemoveButton>
        )}
      </ExerciseHeader>

      <ExerciseMetaRow>
        <FormGroup>
          <Label>Tempo</Label>
          <SmallInput
            placeholder="e.g., 4/2/1"
            value={exercise.tempo || ''}
            onChange={(e) => onMetaChange(index, 'tempo', e.target.value)}
          />
        </FormGroup>
        <FormGroup>
          <Label>Rest (sec)</Label>
          <SmallInput
            type="number"
            min="0"
            placeholder={isCore ? '30' : '60'}
            value={exercise.rest || ''}
            onChange={(e) => onMetaChange(index, 'rest', e.target.value)}
          />
        </FormGroup>
      </ExerciseMetaRow>

      {exercise.sets.map((set, setIndex) => (
        <SetRow key={setIndex}>
          <SetLabel>#{set.setNumber}</SetLabel>
          <SmallInput
            data-testid={`set-reps-${index}-${setIndex}`}
            type="number"
            min="0"
            placeholder="Reps"
            value={set.reps}
            onChange={(e) => onSetChange(index, setIndex, 'reps', e.target.value)}
          />
          <SmallInput
            data-testid={`set-weight-${index}-${setIndex}`}
            type="number"
            min="0"
            step="0.5"
            placeholder="Weight (lbs)"
            value={set.weight}
            onChange={(e) => onSetChange(index, setIndex, 'weight', e.target.value)}
          />
          {!isCore && exercise.sets.length > 1 && onRemoveSet ? (
            <RemoveButton
              onClick={() => onRemoveSet(index, setIndex)}
              data-testid={`remove-set-${index}-${setIndex}`}
              title="Remove set"
            >
              <Trash2 size={14} />
            </RemoveButton>
          ) : (
            <div style={{ minWidth: 44 }} />
          )}
        </SetRow>
      ))}

      {!isCore && onAddSet && (
        <AddButton
          onClick={() => onAddSet(index)}
          data-testid={`add-set-${index}`}
          style={{ marginTop: 8 }}
        >
          <Plus size={14} />
          Add Set
        </AddButton>
      )}
    </ExerciseCard>
  );
};

export default React.memo(ExerciseEntryCard);
