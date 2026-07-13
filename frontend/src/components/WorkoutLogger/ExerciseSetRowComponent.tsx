/**
 * Blueprint: ExerciseSetRowComponent
 * Parent: ExerciseCardComponent
 * Purpose: One Full-Mode set row. Desktop renders the 10-column table row;
 * phones (≤767px) render the Phase-2C law grid `32px | 1fr | 1fr | 48px`
 * (Set# | Weight | Reps | Log) with secondary fields behind the card's
 * "set details" disclosure. The law grid is HOST-FIXED — no lens recipe
 * can restyle it. Logging a set (aria-pressed) starts the rest timer via
 * the parent's onSetLogged wiring.
 */
import React from 'react';
import { Check, Minus, Star } from 'lucide-react';
import { ExerciseSet } from '../../services/nasmApiService';
import OverloadSuggestion from './OverloadSuggestion';
import RestTimer from './RestTimer';
import TempoInput from './TempoInput';
import { getExerciseSetRowKey } from './WorkoutLogger.helpers';
import type { OverloadSuggestion as OverloadSuggestionType } from './useGhostPreFill';
import {
  RatingControlRow,
  SliderInput,
  SliderValue,
  StarButton,
  StarRatingContainer,
} from './ExerciseCardComponent.styles';
import {
  NumberInput,
  RemoveSetButton,
  SetCell,
  SetLogCheckButton,
  SetNumber,
  SetRow,
  TextInput,
  WeightInputWrapper,
} from './ExerciseSetRow.styles';

interface ExerciseSetRowComponentProps {
  /** Primitive on purpose: keeps React.memo effective across sibling-set edits. */
  exerciseName: string;
  exerciseIndex: number;
  set: ExerciseSet;
  setIndex: number;
  showDetails: boolean;
  isLogged: boolean;
  canRemove: boolean;
  onToggleLogged: (setKey: string, setIndex: number) => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: any) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  getOverload?: (exerciseName: string, setIndex: number) => OverloadSuggestionType | null;
}

const ExerciseSetRowComponent: React.FC<ExerciseSetRowComponentProps> = ({
  exerciseName,
  exerciseIndex,
  set,
  setIndex,
  showDetails,
  isLogged,
  canRemove,
  onToggleLogged,
  onUpdateSet,
  onRemoveSet,
  getOverload,
}) => (
  <SetRow data-details={showDetails ? 'open' : 'closed'}>
    <SetCell data-label="Set" data-essential="cell">
      <SetNumber>{set.setNumber}</SetNumber>
    </SetCell>
    <SetCell data-label="Weight" data-essential="cell">
      <WeightInputWrapper>
        <NumberInput
          type="number"
          inputMode="decimal"
          value={set.weight ?? ''}
          onChange={event => onUpdateSet(exerciseIndex, setIndex, 'weight', parseFloat(event.target.value) || 0)}
          placeholder="0"
          aria-label={`Set ${set.setNumber} weight in lbs`}
        />
        {getOverload && (
          <OverloadSuggestion
            suggestion={getOverload(exerciseName, setIndex)}
            onApply={() => {
              const suggestion = getOverload(exerciseName, setIndex);
              if (suggestion) onUpdateSet(exerciseIndex, setIndex, 'weight', suggestion.suggested);
            }}
          />
        )}
      </WeightInputWrapper>
    </SetCell>
    <SetCell data-label="Reps" data-essential="cell">
      <NumberInput
        type="number"
        inputMode="numeric"
        value={set.reps ?? ''}
        onChange={event => onUpdateSet(exerciseIndex, setIndex, 'reps', parseInt(event.target.value) || 0)}
        placeholder="0"
        aria-label={`Set ${set.setNumber} reps`}
      />
    </SetCell>
    <SetCell data-label="Tempo">
      <TempoInput
        value={set.tempo || ''}
        onChange={val => onUpdateSet(exerciseIndex, setIndex, 'tempo', val)}
        ariaLabel={`Set ${set.setNumber} tempo`}
      />
    </SetCell>
    <SetCell data-label="RPE">
      <RatingControlRow>
        <SliderInput
          type="range"
          min={1}
          max={10}
          value={set.rpe ?? 1}
          onChange={event => onUpdateSet(exerciseIndex, setIndex, 'rpe', parseInt(event.target.value))}
        />
        <SliderValue>{set.rpe ?? 1}</SliderValue>
      </RatingControlRow>
    </SetCell>
    <SetCell data-label="Form">
      <RatingControlRow>
        <StarRatingContainer>
          {[1, 2, 3, 4, 5].map(rating => (
            <StarButton
              key={rating}
              type="button"
              $filled={rating <= (set.formQuality ?? 0)}
              onClick={() => onUpdateSet(exerciseIndex, setIndex, 'formQuality', rating)}
              aria-label={`Set ${set.setNumber} form quality: ${rating} stars`}
              aria-pressed={rating === set.formQuality}
            >
              <Star size={16} />
            </StarButton>
          ))}
        </StarRatingContainer>
      </RatingControlRow>
    </SetCell>
    <SetCell data-label="Rest">
      <RestTimer restSeconds={set.restTime || 60} compact />
    </SetCell>
    <SetCell data-label="Notes">
      <TextInput
        value={set.notes || ''}
        onChange={event => onUpdateSet(exerciseIndex, setIndex, 'notes', event.target.value)}
        placeholder="Form notes..."
        aria-label={`Set ${set.setNumber} notes`}
      />
    </SetCell>
    <SetCell data-label="Log" data-essential="log">
      <SetLogCheckButton
        type="button"
        onClick={() => onToggleLogged(getExerciseSetRowKey(set), setIndex)}
        aria-pressed={isLogged}
        aria-label={isLogged
          ? `Set ${set.setNumber} logged — tap to unmark`
          : `Log set ${set.setNumber} and start rest timer`}
      >
        <Check aria-hidden="true" />
      </SetLogCheckButton>
    </SetCell>
    <SetCell data-label="">
      <RemoveSetButton
        type="button"
        onClick={() => onRemoveSet(exerciseIndex, setIndex)}
        disabled={!canRemove}
        aria-label={`Remove set ${set.setNumber}`}
      >
        <Minus size={16} />
      </RemoveSetButton>
    </SetCell>
  </SetRow>
);

ExerciseSetRowComponent.displayName = 'ExerciseSetRowComponent';
export default React.memo(ExerciseSetRowComponent);
