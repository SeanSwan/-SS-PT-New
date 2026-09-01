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
} from './ExerciseCardComponent.styles';
import {
  CircuitFields,
  SupersetBadge,
  SupersetLinkButton,
} from './ExerciseCardCircuit.styles';
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
  /** Lifted logger-level detail mode (one toggle affects every card — least clicks). */
  showSetDetails: boolean;
  onToggleSetDetails: () => void;
  onToggleSupersetLink?: () => void;
  onUpdateExercise: (exerciseIndex: number, field: keyof ExerciseEntry, value: any) => void;
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: any) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  getOverload?: (exerciseName: string, setIndex: number) => OverloadSuggestionType | null;
  getLastWeight?: React.ComponentProps<typeof ExerciseSetRowComponent>['getLastWeight'];
  onSetLogged?: (exerciseIndex: number, setIndex: number) => void;
  ghostSkip?: boolean;
}

const ExerciseCardComponent: React.FC<ExerciseCardComponentProps> = React.memo(({
  exercise,
  exerciseIndex,
  clientId,
  supersetGroup,
  linkedToPrevious = false,
  showSetDetails,
  onToggleSetDetails,
  onToggleSupersetLink,
  onUpdateExercise,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  getOverload,
  getLastWeight,
  onSetLogged,
  ghostSkip = false,
}) => {
  // Session-local logged marks; logging a set starts the rest timer upstream.
  const [loggedSetKeys, setLoggedSetKeys] = useState<ReadonlySet<string>>(() => new Set());

  // State updaters must stay PURE (React 18 StrictMode double-invokes them):
  // the onSetLogged side effect fires exactly once, outside the updater.
  const toggleLogged = useCallback((setKey: string, setIndex: number) => {
    const wasLogged = loggedSetKeys.has(setKey);
    if (!wasLogged) onSetLogged?.(exerciseIndex, setIndex);
    setLoggedSetKeys(previous => {
      const next = new Set(previous);
      if (wasLogged) {
        next.delete(setKey);
      } else {
        next.add(setKey);
      }
      return next;
    });
  }, [exerciseIndex, loggedSetKeys, onSetLogged]);

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
          <RatingGroup role="group" aria-labelledby={`exercise-${exerciseIndex}-form-rating-label`}>
            <span id={`exercise-${exerciseIndex}-form-rating-label`}>Form Rating (1-5):</span>
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
            <label htmlFor={`exercise-${exerciseIndex}-pain-level`}>Pain Level (0-10):</label>
            <RatingControlRow>
              <SliderInput
                id={`exercise-${exerciseIndex}-pain-level`}
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
        <label>Circuit / block<input value={exercise.circuitName || ''} onChange={event => onUpdateExercise(exerciseIndex, 'circuitName', event.target.value)} placeholder="Circuit 1" /></label>
        <label>Order<input type="number" min={1} value={exercise.circuitOrder || ''} onChange={event => onUpdateExercise(exerciseIndex, 'circuitOrder', Number(event.target.value) || undefined)} /></label>
        <label>Movement role<select value={exercise.exerciseRole || 'primary'} onChange={event => onUpdateExercise(exerciseIndex, 'exerciseRole', event.target.value)}>
          <option value="primary">Primary</option><option value="drop-movement">Drop movement</option><option value="active-recovery">Active recovery</option><option value="core">Core</option><option value="mobility">Mobility</option><option value="finisher">Finisher</option>
        </select></label>
      </CircuitFields>

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
                /* L1 SIGNATURE: values COUNT UP current→ghost over 300ms (numerals tick);
                   reduced-motion or no-rAF = instant fill. Final values are ALWAYS exact. */
                onAccept={(ghost) => {
                  const fill = (field: 'weight' | 'reps' | 'rpe', from: number, to: number) => {
                    const reduced = typeof window !== 'undefined'
                      && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
                    if (reduced || typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
                      onUpdateSet(exerciseIndex, setIndex, field, to);
                      return;
                    }
                    const start = performance.now();
                    const tick = (now: number) => {
                      const t = Math.min(1, (now - start) / 300);
                      onUpdateSet(exerciseIndex, setIndex, field, t >= 1 ? to : Math.round(from + (to - from) * t));
                      if (t < 1) window.requestAnimationFrame(tick);
                    };
                    window.requestAnimationFrame(tick);
                  };
                  fill('weight', Number(set.weight) || 0, ghost.weight);
                  fill('reps', Number(set.reps) || 0, ghost.reps);
                  if (ghost.rpe != null) onUpdateSet(exerciseIndex, setIndex, 'rpe', ghost.rpe);
                }}
              />
            )}
            <ExerciseSetRowComponent
              exerciseName={exercise.exerciseName}
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
              getLastWeight={getLastWeight}
            />
          </React.Fragment>
        ))}
        <SetDetailsToggle
          type="button"
          aria-expanded={showSetDetails}
          onClick={onToggleSetDetails}
        >
          {showSetDetails ? 'Hide set details' : 'Show set details (tempo, RPE, form, rest, notes, remove)'}
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
