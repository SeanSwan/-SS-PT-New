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
import NumericKeypadSheet from './NumericKeypadSheet';
import { useKeypadField } from './useKeypadField';
import type { OverloadSuggestion as OverloadSuggestionType } from './useGhostPreFill';
import type { LastWeightSuggestion } from './useLastWeightSuggestions';
import {
  RatingControlRow,
  SliderInput,
  SliderValue,
  StarButton,
  StarRatingContainer,
} from './ExerciseCardComponent.styles';
import { SetStructureFields } from './ExerciseCardComponent.styles';
import {
  LastWeightChip,
  NumberInput,
  RemoveSetButton,
  SetCell,
  SetLogCheckButton,
  SetNumber,
  SetRow,
  TextInput,
  WeightInputWrapper,
} from './ExerciseSetRow.styles';

/** "2026-07-10" → "Jul 10" for the last-weight chip (02 §E copy). */
const chipDate = (iso: string | null): string => {
  if (!iso) return '';
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

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
  getLastWeight?: (exerciseName: string) => LastWeightSuggestion | null;
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
  getLastWeight,
}) => {
  // Last-weight suggestion (blueprint 02 §E): placeholder + tap-to-fill chip
  // while the weight is untouched (0). Never auto-commits — an untouched
  // field still submits 0 unless the trainer taps the chip or types.
  const lastWeight = getLastWeight?.(exerciseName) ?? null;
  const weightUntouched = !set.weight;
  // L2: coarse-pointer keypad — one-hop advance weight→reps; "use system keyboard" opts out per row.
  const keypad = useKeypadField((field, value) => onUpdateSet(exerciseIndex, setIndex, field, value));
  return (
  <>
  <SetRow data-details={showDetails ? 'open' : 'closed'} data-logged={isLogged ? 'true' : 'false'}>
    <SetCell data-label="Set" data-essential="cell">
      <SetNumber>{set.setNumber}</SetNumber>
    </SetCell>
    <SetCell data-label="Weight" data-essential="cell">
      <WeightInputWrapper>
        <NumberInput
          type="number"
          inputMode={keypad.keypadActive ? 'none' : 'decimal'}
          readOnly={keypad.keypadActive}
          onClick={() => keypad.openKeypad('weight')}
          value={lastWeight && weightUntouched ? '' : set.weight ?? ''}
          onChange={event => onUpdateSet(exerciseIndex, setIndex, 'weight', parseFloat(event.target.value) || 0)}
          placeholder={lastWeight && weightUntouched ? String(lastWeight.weight) : '0'}
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
        {lastWeight && weightUntouched && (
          <LastWeightChip
            type="button"
            onClick={() => onUpdateSet(exerciseIndex, setIndex, 'weight', lastWeight.weight)}
            aria-label={`Use last weight ${lastWeight.weight} pounds`}
          >
            ⟲ last: {lastWeight.weight} lbs{lastWeight.at ? ` · ${chipDate(lastWeight.at)}` : ''}
          </LastWeightChip>
        )}
      </WeightInputWrapper>
    </SetCell>
    <SetCell data-label="Reps" data-essential="cell">
      <NumberInput
        type="number"
        inputMode={keypad.keypadActive ? 'none' : 'numeric'}
        readOnly={keypad.keypadActive}
        onClick={() => keypad.openKeypad('reps')}
        value={set.reps ?? ''}
        onChange={event => onUpdateSet(exerciseIndex, setIndex, 'reps', parseInt(event.target.value) || 0)}
        placeholder="0"
        aria-label={`Set ${set.setNumber} reps`}
      />
      {keypad.openFor && (
        <NumericKeypadSheet
          open
          label={keypad.openFor === 'weight' ? `Set ${set.setNumber} — Weight (lbs)` : `Set ${set.setNumber} — Reps`}
          value={keypad.openFor === 'weight' ? set.weight ?? 0 : set.reps ?? 0}
          allowDecimal={keypad.openFor === 'weight'}
          showPlateMath={keypad.openFor === 'weight'}
          lastSessionValue={keypad.openFor === 'weight' ? lastWeight?.weight ?? null : null}
          onCommit={keypad.onCommit}
          onClose={keypad.onClose}
          onUseSystemKeyboard={keypad.useSystemKeyboard}
        />
      )}
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
  {showDetails && (
    <SetStructureFields>
      <label>Set type<select value={set.setType || 'working'} onChange={event => onUpdateSet(exerciseIndex, setIndex, 'setType', event.target.value)}>
        <option value="warmup">Warm-up</option><option value="working">Working</option><option value="dropset">Drop set</option><option value="superset">Superset</option><option value="failure">Failure</option><option value="amrap">AMRAP</option><option value="rest_pause">Rest-pause</option>
      </select></label>
      <label>Isometric hold (seconds)<input type="number" min={0} value={set.isometricHoldSeconds ?? ''} placeholder="10" onChange={event => onUpdateSet(exerciseIndex, setIndex, 'isometricHoldSeconds', Math.max(0, Number(event.target.value) || 0))} /></label>
    </SetStructureFields>
  )}
  </>
  );
};

ExerciseSetRowComponent.displayName = 'ExerciseSetRowComponent';
export default React.memo(ExerciseSetRowComponent);
