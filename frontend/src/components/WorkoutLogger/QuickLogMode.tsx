/**
 * QuickLogMode
 *
 * Parent: WorkoutLogger
 * Purpose: high-speed workout logging for active sessions. Keeps the
 * trainer/client focused on one exercise, one set, weight, reps, and a
 * single "Log Set" action while preserving ghost prefill and overload
 * suggestions from prior session history.
 */

import React, { useCallback, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ExerciseEntry, ExerciseSet } from '../../services/nasmApiService';
import OverloadSuggestion from './OverloadSuggestion';
import { getExerciseSetRowKey } from './WorkoutLogger.helpers';
import {
  ExerciseInfo,
  ExerciseMeta,
  ExerciseName,
  ExerciseNav,
  InputGroup,
  InputLabel,
  InputRow,
  LogSetButton,
  NavButton,
  OverloadWrapper,
  QuickInput,
  QuickLogContainer,
  SetDot,
  SetDots,
} from './QuickLogMode.styles';
import type { useGhostPreFill } from './useGhostPreFill';

interface QuickLogModeProps {
  exercises: ExerciseEntry[];
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: keyof ExerciseSet, value: any) => void;
  onAddSet: (exerciseIndex: number) => void;
  ghostPreFill: ReturnType<typeof useGhostPreFill>;
  onSetLogged: (exerciseIndex: number, setIndex: number) => void;
}

const QuickLogMode: React.FC<QuickLogModeProps> = React.memo(({
  exercises,
  onUpdateSet,
  ghostPreFill,
  onSetLogged,
}) => {
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);

  const exercise = exercises[currentExerciseIdx];
  const set = exercise?.sets[currentSetIdx];
  const overload = exercise ? ghostPreFill.getOverload(exercise.exerciseName, currentSetIdx) : null;

  const handleLogSet = useCallback(() => {
    if (!exercise || !set) return;

    onSetLogged(currentExerciseIdx, currentSetIdx);

    if (currentSetIdx < exercise.sets.length - 1) {
      setCurrentSetIdx(prev => prev + 1);
      return;
    }

    if (currentExerciseIdx < exercises.length - 1) {
      setCurrentExerciseIdx(prev => prev + 1);
      setCurrentSetIdx(0);
    }
  }, [currentExerciseIdx, currentSetIdx, exercise, exercises.length, onSetLogged, set]);

  const handleApplyOverload = useCallback(() => {
    if (!overload) return;
    onUpdateSet(currentExerciseIdx, currentSetIdx, 'weight', overload.suggested);
  }, [overload, currentExerciseIdx, currentSetIdx, onUpdateSet]);

  const handlePrevExercise = useCallback(() => {
    if (currentExerciseIdx > 0) {
      setCurrentExerciseIdx(prev => prev - 1);
      setCurrentSetIdx(0);
    }
  }, [currentExerciseIdx]);

  const handleNextExercise = useCallback(() => {
    if (currentExerciseIdx < exercises.length - 1) {
      setCurrentExerciseIdx(prev => prev + 1);
      setCurrentSetIdx(0);
    }
  }, [currentExerciseIdx, exercises.length]);

  if (!exercise || !set) return null;

  const isSetComplete = set.weight > 0 && set.reps > 0;
  const weightInputId = `quick-log-weight-${currentExerciseIdx}-${currentSetIdx}`;
  const repsInputId = `quick-log-reps-${currentExerciseIdx}-${currentSetIdx}`;

  return (
    <QuickLogContainer>
      <ExerciseNav>
        <NavButton
          type="button"
          onClick={handlePrevExercise}
          disabled={currentExerciseIdx === 0}
          aria-label="Previous exercise"
        >
          <ChevronLeft size={20} />
        </NavButton>

        <ExerciseInfo>
          <ExerciseName>{exercise.exerciseName}</ExerciseName>
          <ExerciseMeta>
            Exercise {currentExerciseIdx + 1}/{exercises.length}
            {' - '}
            Set {currentSetIdx + 1}/{exercise.sets.length}
          </ExerciseMeta>
        </ExerciseInfo>

        <NavButton
          type="button"
          onClick={handleNextExercise}
          disabled={currentExerciseIdx === exercises.length - 1}
          aria-label="Next exercise"
        >
          <ChevronRight size={20} />
        </NavButton>
      </ExerciseNav>

      <InputRow>
        <InputGroup>
          <InputLabel htmlFor={weightInputId}>Weight (lbs)</InputLabel>
          <QuickInput
            id={weightInputId}
            type="number"
            inputMode="decimal"
            value={set.weight || ''}
            onChange={(e) => onUpdateSet(currentExerciseIdx, currentSetIdx, 'weight', parseFloat(e.target.value) || 0)}
            placeholder="0"
            aria-label="Weight in lbs"
          />
        </InputGroup>

        <InputGroup>
          <InputLabel htmlFor={repsInputId}>Reps</InputLabel>
          <QuickInput
            id={repsInputId}
            type="number"
            inputMode="numeric"
            value={set.reps || ''}
            onChange={(e) => onUpdateSet(currentExerciseIdx, currentSetIdx, 'reps', parseInt(e.target.value) || 0)}
            placeholder="0"
            aria-label="Reps"
          />
        </InputGroup>

        {overload && (
          <OverloadWrapper>
            <OverloadSuggestion suggestion={overload} onApply={handleApplyOverload} />
          </OverloadWrapper>
        )}
      </InputRow>

      <LogSetButton
        type="button"
        onClick={handleLogSet}
        disabled={!isSetComplete}
        aria-label={`Log set ${currentSetIdx + 1}`}
      >
        <Check size={20} />
        Log Set
      </LogSetButton>

      <SetDots>
        {exercise.sets.map((s, idx) => (
          <SetDot
            key={getExerciseSetRowKey(s)}
            $active={idx === currentSetIdx}
            $completed={s.weight > 0 && s.reps > 0 && idx < currentSetIdx}
            type="button"
            onClick={() => setCurrentSetIdx(idx)}
            aria-label={`Go to set ${idx + 1}`}
          />
        ))}
      </SetDots>
    </QuickLogContainer>
  );
});

QuickLogMode.displayName = 'QuickLogMode';
export default QuickLogMode;
