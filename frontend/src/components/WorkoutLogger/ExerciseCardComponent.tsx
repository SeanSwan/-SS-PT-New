import React, { useCallback, useState } from 'react';
import { Dumbbell, Link2, Plus, Star, Unlink, X } from 'lucide-react';
import { ExerciseEntry, ExerciseSet } from '../../services/nasmApiService';
import ExerciseSetRowComponent from './ExerciseSetRowComponent';
import GhostDataRow from './GhostDataRow';
import { getExerciseSetRowKey } from './WorkoutLogger.helpers';
import type { OverloadSuggestion as OverloadSuggestionType } from './useGhostPreFill';
import {
  CardContainer,
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
  SupersetLinkButton,
} from './ExerciseCardComponent.styles';
import {
  AddSetButton,
  SetDetailsToggle,
  SetsTable,
  TableHeader,
} from './ExerciseSetRow.styles';

interface ExerciseCardComponentProps {
  exercise: ExerciseEntry;
  exerciseIndex: number;
  clientId?: number;
  supersetGroup?: number;
  /** Phase 3c.2: link/unlink this exercise with its predecessor (superset pair/group). */
  linkedToPrevious?: boolean;
  onToggleSupersetLink?: () => void;
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
  linkedToPrevious = false,
  onToggleSupersetLink,
  onUpdateExercise,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  getOverload,
  onSetLogged,
  ghostSkip = false,
}) => {
  // Phone disclosure for secondary set fields (Phase-2C law grid).
  const [showSetDetails, setShowSetDetails] = useState(false);
  // Session-local logged marks; logging a set starts the rest timer upstream.
  const [loggedSetKeys, setLoggedSetKeys] = useState<ReadonlySet<string>>(() => new Set());

  const toggleLogged = useCallback((setIndex: number) => {
    const set = exercise.sets[setIndex];
    if (!set) return;
    const key = getExerciseSetRowKey(set);
    setLoggedSetKeys(previous => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        onSetLogged?.(exerciseIndex, setIndex);
      }
      return next;
    });
  }, [exercise.sets, exerciseIndex, onSetLogged]);

  return (
    <CardContainer
      className="lens2-row"
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
          {onToggleSupersetLink && (
            <SupersetLinkButton
              type="button"
              onClick={onToggleSupersetLink}
              aria-pressed={linkedToPrevious}
              aria-label={
                linkedToPrevious
                  ? `Unlink ${exercise.exerciseName} from the superset above`
                  : `Superset ${exercise.exerciseName} with the exercise above`
              }
              title={linkedToPrevious ? 'Unlink superset' : 'Superset with previous'}
            >
              {linkedToPrevious ? <Unlink size={16} /> : <Link2 size={16} />}
              <span>{linkedToPrevious ? 'Unlink' : 'Superset'}</span>
            </SupersetLinkButton>
          )}
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

      <SetsTable>
        <TableHeader>
          <div data-m="set">Set</div>
          <div data-m="weight">Weight (lbs)</div>
          <div data-m="reps">Reps</div>
          <div>Tempo</div>
          <div>RPE (1-10)</div>
          <div>Form (1-5)</div>
          <div>Rest (sec)</div>
          <div>Notes</div>
          <div data-m="log">Log</div>
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
            <ExerciseSetRowComponent
              exercise={exercise}
              exerciseIndex={exerciseIndex}
              set={set}
              setIndex={setIndex}
              showDetails={showSetDetails}
              isLogged={loggedSetKeys.has(getExerciseSetRowKey(set))}
              canRemove={exercise.sets.length > 1}
              onToggleLogged={toggleLogged}
              onUpdateSet={onUpdateSet}
              onRemoveSet={onRemoveSet}
              getOverload={getOverload}
            />
          </React.Fragment>
        ))}
        <SetDetailsToggle
          type="button"
          aria-expanded={showSetDetails}
          onClick={() => setShowSetDetails(previous => !previous)}
        >
          {showSetDetails ? 'Hide set details' : 'Show set details (tempo, RPE, form, rest, notes)'}
        </SetDetailsToggle>
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
  );
});

ExerciseCardComponent.displayName = 'ExerciseCardComponent';
export default ExerciseCardComponent;
