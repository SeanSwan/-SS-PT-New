/**
 * ┌─── COMPONENT: QuickLogMode ───────────────────────────────┐
 * │ PURPOSE: 3-tap streamlined workout logging for gym speed.   │
 * │ Shows only: exercise name, weight, reps, "Log Set" button. │
 * │ Pre-fills from last session. Auto-advances + starts timer.  │
 * │                                                              │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ Barbell Bench Press                     Set 2/4        │  │
 * │ │ ┌─────────┐ ┌─────────┐                               │  │
 * │ │ │ 135 lbs │ │  10     │  [+2.5]  [ LOG SET ]         │  │
 * │ │ └─────────┘ └─────────┘                               │  │
 * │ │ ⏱ Rest: 45s                                           │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │                                                              │
 * │ Props: { exercises, onUpdateSet, onAddSet, clientId,        │
 * │          ghostPreFill, onSetLogged }                         │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ExerciseEntry, ExerciseSet } from '../../services/nasmApiService';
import { CS, withAlpha, reducedMotionSafe } from './WorkoutLoggerCS';
import OverloadSuggestion from './OverloadSuggestion';
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
  onAddSet,
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

    // Signal that this set was logged (triggers rest timer in parent)
    onSetLogged(currentExerciseIdx, currentSetIdx);

    // Auto-advance to next set or next exercise
    if (currentSetIdx < exercise.sets.length - 1) {
      setCurrentSetIdx(prev => prev + 1);
    } else if (currentExerciseIdx < exercises.length - 1) {
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
      {/* Exercise Navigation */}
      <ExerciseNav>
        <NavButton
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
            {' · '}
            Set {currentSetIdx + 1}/{exercise.sets.length}
          </ExerciseMeta>
        </ExerciseInfo>
        <NavButton
          onClick={handleNextExercise}
          disabled={currentExerciseIdx === exercises.length - 1}
          aria-label="Next exercise"
        >
          <ChevronRight size={20} />
        </NavButton>
      </ExerciseNav>

      {/* Quick Input Row */}
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

      {/* Log Set Button */}
      <LogSetButton
        onClick={handleLogSet}
        disabled={!isSetComplete}
        aria-label={`Log set ${currentSetIdx + 1}`}
      >
        <Check size={20} />
        Log Set
      </LogSetButton>

      {/* Set Dots (progress indicator) */}
      <SetDots>
        {exercise.sets.map((s, idx) => (
          <SetDot
            key={idx}
            $active={idx === currentSetIdx}
            $completed={s.weight > 0 && s.reps > 0 && idx < currentSetIdx}
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

// ── Styled Components ──

const QuickLogContainer = styled.div`
  background: ${withAlpha(CS.cardDark, 0.9)};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${CS.glassBorder};
  border-radius: 1.5rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;

  @media (max-width: 430px) {
    padding: 1rem;
    border-radius: 1rem;
  }
`;

const ExerciseNav = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
`;

const NavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 0.75rem;
  background: rgba(80, 160, 240, 0.08);
  border: 1px solid ${CS.glassBorder};
  color: ${CS.gaming};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(80, 160, 240, 0.15);
    border-color: ${CS.glow};
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`;

const ExerciseInfo = styled.div`
  flex: 1;
  text-align: center;
  min-width: 0;
`;

const ExerciseName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: ${CS.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ExerciseMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: ${CS.textMuted};
  margin-top: 0.125rem;
`;

const InputRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 430px) {
    gap: 0.5rem;
  }
`;

const InputGroup = styled.div`
  flex: 1;
`;

const InputLabel = styled.label`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${CS.textMuted};
  margin-bottom: 0.375rem;
`;

const QuickInput = styled.input`
  width: 100%;
  padding: 0.875rem 0.75rem;
  background: rgba(10, 10, 15, 0.7);
  border: 2px solid ${CS.glassBorder};
  border-radius: 0.75rem;
  color: ${CS.text};
  font-family: 'Fira Code', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
  min-height: 56px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-visible {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 3px rgba(80, 160, 240, 0.15);
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type=number] { -moz-appearance: textfield; }

  @media (max-width: 430px) {
    font-size: 16px;
    min-height: 52px;
    padding: 0.75rem;
  }
`;

const OverloadWrapper = styled.div`
  display: flex;
  align-items: flex-end;
  padding-bottom: 0.875rem;
`;

const LogSetButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 56px;
  padding: 1rem;
  background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
  border: none;
  border-radius: 0.75rem;
  color: #ffffff;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(80, 160, 240, 0.25);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(80, 160, 240, 0.35);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }

  ${reducedMotionSafe}
`;

const SetDots = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const SetDot = styled.button<{ $active: boolean; $completed: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid ${({ $active, $completed }) =>
    $active ? CS.gaming : $completed ? CS.success : CS.glassBorder};
  background: ${({ $active, $completed }) =>
    $active ? CS.gaming : $completed ? CS.success : 'transparent'};
  cursor: pointer;
  padding: 0;
  min-width: 24px;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    border-color: ${CS.glow};
    transform: scale(1.2);
  }
`;
