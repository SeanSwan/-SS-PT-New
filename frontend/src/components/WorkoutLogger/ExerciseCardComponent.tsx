import React from 'react';
import { Dumbbell, Minus, Plus, Star, X } from 'lucide-react';
import { ExerciseEntry, ExerciseSet } from '../../services/nasmApiService';
import GhostDataRow from './GhostDataRow';
import OverloadSuggestion from './OverloadSuggestion';
import RestTimer from './RestTimer';
import TempoInput from './TempoInput';
import { getExerciseSetRowKey } from './WorkoutLogger.helpers';
import type { OverloadSuggestion as OverloadSuggestionType } from './useGhostPreFill';
import {
  CardContainer,
  CircuitFields,
  ExerciseHeader,
  ExerciseRatings,
  ExerciseTitle,
  RatingControlRow,
  RatingGroup,
  RemoveExerciseBtn,
  SliderInput,
  SliderValue,
  StarButton,
  StarRatingContainer,
  SupersetBadge,
  SetStructureFields,
} from './ExerciseCardComponent.styles';
import {
  AddSetButton,
  NumberInput,
  RemoveSetButton,
  SetCell,
  SetNumber,
  SetRow,
  SetsTable,
  TableHeader,
  TextInput,
  WeightInputWrapper,
} from './ExerciseSetRow.styles';

interface ExerciseCardComponentProps {
  exercise: ExerciseEntry;
  exerciseIndex: number;
  clientId?: number;
  supersetGroup?: number;
  onUpdateExercise: (exerciseIndex: number, field: keyof ExerciseEntry, value: any) => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: any) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  getOverload?: (exerciseName: string, setIndex: number) => OverloadSuggestionType | null;
  onSetLogged?: (exerciseIndex: number, setIndex: number) => void;
  ghostSkip?: boolean;
}

const ExerciseCardComponent: React.FC<ExerciseCardComponentProps> = React.memo(({
  exercise,
  exerciseIndex,
  clientId,
  supersetGroup,
  onUpdateExercise,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  getOverload,
  ghostSkip = false,
}) => (
  <CardContainer
    $isSuperset={supersetGroup != null && supersetGroup > 0}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: exerciseIndex * 0.1 }}
  >
    <ExerciseHeader>
      <ExerciseTitle>
        <h3>
          <Dumbbell size={20} />
          {exercise.exerciseName}
          {supersetGroup != null && supersetGroup > 0 && <SupersetBadge>SS{supersetGroup}</SupersetBadge>}
        </h3>
      </ExerciseTitle>
      <ExerciseRatings>
        <RatingGroup>
          <label>Form Rating (1-5):</label>
          <RatingControlRow>
            <StarRatingContainer>
              {[1, 2, 3, 4, 5].map(rating => (
                <StarButton
                  key={rating}
                  type="button"
                  $filled={rating <= (exercise.formRating ?? 0)}
                  onClick={() => onUpdateExercise(exerciseIndex, 'formRating', rating)}
                  aria-label={`Set form rating to ${rating} stars`}
                  aria-pressed={rating === exercise.formRating}
                >
                  <Star size={16} />
                </StarButton>
              ))}
            </StarRatingContainer>
            <SliderValue>{exercise.formRating ?? 0}/5</SliderValue>
          </RatingControlRow>
        </RatingGroup>
        <RatingGroup>
          <label>Pain Level (0-10):</label>
          <RatingControlRow>
            <SliderInput
              type="range"
              min={0}
              max={10}
              value={exercise.painLevel}
              onChange={event => onUpdateExercise(exerciseIndex, 'painLevel', parseInt(event.target.value))}
            />
            <SliderValue>{exercise.painLevel}/10</SliderValue>
          </RatingControlRow>
        </RatingGroup>
        <RemoveExerciseBtn
          type="button"
          onClick={() => onRemoveExercise(exerciseIndex)}
          aria-label={`Remove ${exercise.exerciseName}`}
        >
          <X size={18} />
        </RemoveExerciseBtn>
      </ExerciseRatings>
    </ExerciseHeader>

    <CircuitFields>
      <label>
        Circuit / block
        <input value={exercise.circuitName || ''} onChange={event => onUpdateExercise(exerciseIndex, 'circuitName', event.target.value)} placeholder="Circuit 1" />
      </label>
      <label>
        Order
        <input type="number" min={1} value={exercise.circuitOrder || ''} onChange={event => onUpdateExercise(exerciseIndex, 'circuitOrder', Number(event.target.value) || undefined)} />
      </label>
      <label>
        Movement role
        <select value={exercise.exerciseRole || 'primary'} onChange={event => onUpdateExercise(exerciseIndex, 'exerciseRole', event.target.value)}>
          <option value="primary">Primary</option>
          <option value="drop-movement">Drop movement</option>
          <option value="active-recovery">Active recovery</option>
          <option value="core">Core</option>
          <option value="mobility">Mobility</option>
          <option value="finisher">Finisher</option>
        </select>
      </label>
    </CircuitFields>

    <SetsTable>
      <TableHeader>
        <div>Set</div>
        <div>Weight (lbs)</div>
        <div>Reps</div>
        <div>Tempo</div>
        <div>RPE (1-10)</div>
        <div>Form (1-5)</div>
        <div>Rest (sec)</div>
        <div>Notes</div>
        <div></div>
      </TableHeader>
      {exercise.sets.map((set, setIndex) => (
        <React.Fragment key={getExerciseSetRowKey(set)}>
          {clientId && setIndex === 0 && (
            <GhostDataRow
              exerciseName={exercise.exerciseName}
              clientId={clientId}
              setIndex={setIndex}
              skip={ghostSkip}
            />
          )}
          <SetRow>
            <SetCell data-label="Set">
              <SetNumber>{set.setNumber}</SetNumber>
            </SetCell>
            <SetCell data-label="Weight">
              <WeightInputWrapper>
                <NumberInput
                  type="number"
                  value={set.weight ?? ''}
                  onChange={event => onUpdateSet(exerciseIndex, setIndex, 'weight', parseFloat(event.target.value) || 0)}
                  placeholder="0"
                  aria-label={`Set ${set.setNumber} weight in lbs`}
                />
                {getOverload && (
                  <OverloadSuggestion
                    suggestion={getOverload(exercise.exerciseName, setIndex)}
                    onApply={() => {
                      const suggestion = getOverload(exercise.exerciseName, setIndex);
                      if (suggestion) onUpdateSet(exerciseIndex, setIndex, 'weight', suggestion.suggested);
                    }}
                  />
                )}
              </WeightInputWrapper>
            </SetCell>
            <SetCell data-label="Reps">
              <NumberInput
                type="number"
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
            <SetCell data-label="">
              <RemoveSetButton
                type="button"
                onClick={() => onRemoveSet(exerciseIndex, setIndex)}
                disabled={exercise.sets.length <= 1}
                aria-label={`Remove set ${set.setNumber}`}
              >
                <Minus size={16} />
              </RemoveSetButton>
            </SetCell>
          </SetRow>
          <SetStructureFields>
            <label>
              Set type
              <select value={set.setType || 'working'} onChange={event => onUpdateSet(exerciseIndex, setIndex, 'setType', event.target.value)}>
                <option value="warmup">Warm-up</option>
                <option value="working">Working</option>
                <option value="dropset">Drop set</option>
                <option value="superset">Superset</option>
                <option value="failure">Failure</option>
                <option value="amrap">AMRAP</option>
                <option value="rest_pause">Rest-pause</option>
              </select>
            </label>
            <label>
              Isometric hold (seconds)
              <input type="number" min={0} value={set.isometricHoldSeconds ?? ''} placeholder="10" onChange={event => onUpdateSet(exerciseIndex, setIndex, 'isometricHoldSeconds', Math.max(0, Number(event.target.value) || 0))} />
            </label>
          </SetStructureFields>
        </React.Fragment>
      ))}
    </SetsTable>

    <AddSetButton
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onAddSet(exerciseIndex)}
    >
      <Plus size={16} />
      Add Set
    </AddSetButton>
  </CardContainer>
));

ExerciseCardComponent.displayName = 'ExerciseCardComponent';
export default ExerciseCardComponent;
