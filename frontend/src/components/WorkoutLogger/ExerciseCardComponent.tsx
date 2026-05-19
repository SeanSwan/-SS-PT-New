/**
 * ExerciseCardComponent — Exercise card with header, ratings, and set table
 * Extracted from WorkoutLogger monolith. React.memo wrapped for performance.
 *
 * Gemini 3.1 Pro directive: Mobile-first SetTable
 * < 768px: stacked cards with 1fr 1fr grid
 * >= 768px: dense data table
 */
import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';
import { Dumbbell, Star, Plus, Minus, X } from 'lucide-react';
import { ExerciseEntry, ExerciseSet } from '../../services/nasmApiService';
import { CS, withAlpha, reducedMotionSafe } from './WorkoutLoggerCS';
import TempoInput from './TempoInput';
import RestTimer from './RestTimer';
import GhostDataRow from './GhostDataRow';
import OverloadSuggestion from './OverloadSuggestion';
import type { OverloadSuggestion as OverloadSuggestionType } from './useGhostPreFill';

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
  /** Optional: overload suggestion getter from useGhostPreFill */
  getOverload?: (exerciseName: string, setIndex: number) => OverloadSuggestionType | null;
  /** Optional: callback when a set is "confirmed" (triggers rest timer) */
  onSetLogged?: (exerciseIndex: number, setIndex: number) => void;
  /**
   * When true, GhostDataRow and any other ghost-prefill child skips its
   * admin-only fetch. Used on the client self-log route (Phase 16.2
   * round 12). Defaults to false so trainer/admin mounts keep their
   * ghost data behavior.
   */
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
  onSetLogged,
  ghostSkip = false,
}) => (
  <CardContainer
    $isSuperset={supersetGroup != null && supersetGroup > 0}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: exerciseIndex * 0.1 }}
  >
    {/* Exercise Header */}
    <ExerciseHeader>
      <ExerciseTitle>
        <h3>
          <Dumbbell size={20} />
          {exercise.exerciseName}
          {supersetGroup != null && supersetGroup > 0 && (
            <SupersetBadge>SS{supersetGroup}</SupersetBadge>
          )}
        </h3>
      </ExerciseTitle>
      <ExerciseRatings>
        <RatingGroup>
          <label>Form Rating (1-5):</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StarRatingContainer>
              {[1, 2, 3, 4, 5].map((rating) => (
                <StarButton
                  key={rating}
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
          </div>
        </RatingGroup>
        <RatingGroup>
          <label>Pain Level (0-10):</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SliderInput
              type="range"
              min={0}
              max={10}
              value={exercise.painLevel}
              onChange={(e) => onUpdateExercise(exerciseIndex, 'painLevel', parseInt(e.target.value))}
            />
            <SliderValue>{exercise.painLevel}/10</SliderValue>
          </div>
        </RatingGroup>
        <RemoveExerciseBtn
          onClick={() => onRemoveExercise(exerciseIndex)}
          aria-label={`Remove ${exercise.exerciseName}`}
        >
          <X size={18} />
        </RemoveExerciseBtn>
      </ExerciseRatings>
    </ExerciseHeader>

    {/* Sets Table */}
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
        <React.Fragment key={setIndex}>
          {/* Ghost Data: previous workout reference */}
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
                onChange={(e) => onUpdateSet(exerciseIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
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
              onChange={(e) => onUpdateSet(exerciseIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
              placeholder="0"
              aria-label={`Set ${set.setNumber} reps`}
            />
          </SetCell>
          <SetCell data-label="Tempo">
            <TempoInput
              value={set.tempo || ''}
              onChange={(val) => onUpdateSet(exerciseIndex, setIndex, 'tempo', val)}
              ariaLabel={`Set ${set.setNumber} tempo`}
            />
          </SetCell>
          <SetCell data-label="RPE">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SliderInput
                type="range"
                min={1}
                max={10}
                value={set.rpe ?? 1}
                onChange={(e) => onUpdateSet(exerciseIndex, setIndex, 'rpe', parseInt(e.target.value))}
              />
              <SliderValue>{set.rpe ?? 1}</SliderValue>
            </div>
          </SetCell>
          <SetCell data-label="Form">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StarRatingContainer>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <StarButton
                    key={rating}
                    $filled={rating <= (set.formQuality ?? 0)}
                    onClick={() => onUpdateSet(exerciseIndex, setIndex, 'formQuality', rating)}
                    aria-label={`Set ${set.setNumber} form quality: ${rating} stars`}
                    aria-pressed={rating === set.formQuality}
                  >
                    <Star size={16} />
                  </StarButton>
                ))}
              </StarRatingContainer>
            </div>
          </SetCell>
          <SetCell data-label="Rest">
            <RestTimer
              restSeconds={set.restTime || 60}
              compact
            />
          </SetCell>
          <SetCell data-label="Notes">
            <TextInput
              value={set.notes || ''}
              onChange={(e) => onUpdateSet(exerciseIndex, setIndex, 'notes', e.target.value)}
              placeholder="Form notes..."
              aria-label={`Set ${set.setNumber} notes`}
            />
          </SetCell>
          <SetCell data-label="">
            <RemoveSetButton
              onClick={() => onRemoveSet(exerciseIndex, setIndex)}
              disabled={exercise.sets.length <= 1}
              aria-label={`Remove set ${set.setNumber}`}
            >
              <Minus size={16} />
            </RemoveSetButton>
          </SetCell>
        </SetRow>
        </React.Fragment>
      ))}
    </SetsTable>

    <AddSetButton
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

// ── Styled Components ──

const CardContainer = styled(motion.div)<{ $isSuperset?: boolean }>`
  background: rgba(20, 20, 25, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 1.5rem;
  padding: 2rem;
  margin-bottom: ${({ $isSuperset }) => $isSuperset ? '0.25rem' : '1.5rem'};
  border: 1px solid ${({ $isSuperset }) =>
    $isSuperset ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)'};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(80, 160, 240, 0.02);
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: '';
    position: absolute;
    top: 1rem;
    left: 0;
    bottom: 1rem;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, ${CS.glow}, ${CS.gaming});
    opacity: 0.6;
    transition: opacity 0.3s;
  }

  &:hover {
    border-color: rgba(80, 160, 240, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4), 0 0 60px rgba(80, 160, 240, 0.08);
    &::before { opacity: 1; }
  }

  ${reducedMotionSafe}

  @media (max-width: 430px) {
    padding: 1.25rem;
    border-radius: 1rem;
  }
`;

const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;

  @media (max-width: 768px) { flex-direction: column; }
`;

const ExerciseTitle = styled.div`
  flex: 1;

  h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${CS.text};
    display: flex;
    align-items: center;
    gap: 0.5rem;
    letter-spacing: -0.01em;
    svg { color: ${CS.gaming}; }
  }
`;

const ExerciseRatings = styled.div`
  display: flex;
  gap: 1.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const RatingGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 120px;

  @media (max-width: 430px) {
    min-width: auto;
    width: 100%;
  }

  label {
    font-size: 0.8rem;
    font-weight: 600;
    color: ${CS.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: 'Sora', sans-serif;
  }
`;

const StarRatingContainer = styled.div`
  display: flex;
  gap: 2px;
`;

const StarButton = styled.button<{ $filled: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    width: 20px;
    height: 20px;
    fill: ${props => props.$filled ? CS.accent : 'none'};
    stroke: ${CS.accent};
    transition: fill 0.15s, transform 0.15s;
  }

  &:hover svg { fill: ${CS.accent}; transform: scale(1.15); }
  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
    border-radius: 0.375rem;
  }
`;

const SliderInput = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(96, 192, 240, 0.15), rgba(80, 160, 240, 0.2));
  outline: none;
  appearance: none;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(80, 160, 240, 0.4), 0 0 12px rgba(80, 160, 240, 0.2);
    border: 2px solid rgba(255, 255, 255, 0.2);
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 8px rgba(80, 160, 240, 0.4);
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 4px;
  }
`;

const SliderValue = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${CS.glowLight};
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
  text-align: right;
`;

const RemoveExerciseBtn = styled.button`
  background: ${CS.errorBg};
  border: 1px solid ${CS.errorBorder};
  border-radius: 0.5rem;
  color: ${CS.errorText};
  cursor: pointer;
  padding: 0.5rem;
  align-self: flex-start;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${withAlpha('#ef4444', 0.25)};
    border-color: ${withAlpha('#ef4444', 0.5)};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${CS.error};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px ${CS.errorBg};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ── Set Table — Mobile-first per Gemini directive ── */

const SetsTable = styled.div`
  background: rgba(10, 10, 15, 0.6);
  border-radius: 1rem;
  overflow: hidden;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.04);
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 50px 90px 70px 120px 80px 100px 130px 1fr 44px;
  gap: 0.5rem;
  padding: 0.875rem 1rem;
  background: rgba(26, 26, 36, 0.8);
  font-weight: 700;
  font-size: 0.7rem;
  color: ${CS.gaming};
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-family: 'Sora', sans-serif;
  border-bottom: 1px solid ${CS.glassBorder};

  @media (max-width: 768px) { display: none; }
`;

const SetRow = styled.div`
  display: grid;
  grid-template-columns: 50px 90px 70px 120px 80px 100px 130px 1fr 44px;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(96, 192, 240, 0.08);
  align-items: center;
  transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:last-child { border-bottom: none; }
  &:hover { background: rgba(80, 160, 240, 0.06); }

  /* Mobile: card layout per Gemini directive */
  @media (max-width: 768px) {
    display: block;
    margin: 8px;
    border-radius: 8px;
    background: rgba(20, 20, 25, 0.5);
    padding: 4px 0;
    border-bottom: none;

    &:last-child { margin-bottom: 4px; }
  }
`;

const SetCell = styled.div`
  display: contents;

  /* Mobile: flex row with data-label pseudo-element */
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;

    &::before {
      content: attr(data-label);
      font-weight: 700;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${CS.textMuted};
      min-width: 60px;
      flex-shrink: 0;
      font-family: 'Sora', sans-serif;
    }

    /* Hide empty labels (e.g., remove button column) */
    &[data-label=""]::before {
      display: none;
    }

    /* Let inputs fill remaining space */
    & > input,
    & > div {
      flex: 1;
      min-width: 0;
    }
  }

  @media (max-width: 430px) {
    padding: 6px 10px;
  }
`;

const SetNumber = styled.div`
  font-weight: 700;
  color: ${CS.gaming};
  font-size: 1.1rem;
  text-align: center;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  background: rgba(20, 20, 25, 0.6);
  border: 1px solid ${CS.glassBorder};
  border-radius: 0.5rem;
  color: ${CS.text};
  text-align: center;
  font-size: 0.9rem;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  min-height: 44px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-visible {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 2px rgba(80, 160, 240, 0.15);
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type=number] { -moz-appearance: textfield; }

  @media (max-width: 768px) {
    min-height: 48px;
  }

  @media (max-width: 430px) {
    font-size: 16px;
    padding: 10px;
  }
`;

const WeightInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;

  @media (max-width: 768px) {
    flex: 1;
  }
`;

const TextInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  background: rgba(20, 20, 25, 0.6);
  border: 1px solid ${CS.glassBorder};
  border-radius: 0.5rem;
  color: ${CS.text};
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  min-height: 44px;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus-visible {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 2px rgba(80, 160, 240, 0.15);
  }

  &::placeholder { color: rgba(224, 236, 244, 0.4); }

  @media (max-width: 768px) {
    min-height: 48px;
  }

  @media (max-width: 430px) { font-size: 16px; }
`;

const AddSetButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: rgba(80, 160, 240, 0.08);
  border: 2px dashed rgba(80, 160, 240, 0.3);
  border-radius: 0.75rem;
  color: ${CS.glowLight};
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  min-height: 44px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba(80, 160, 240, 0.15);
    border-color: rgba(80, 160, 240, 0.5);
    border-style: solid;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(80, 160, 240, 0.15);
  }
`;

const RemoveSetButton = styled.button`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  color: #f87171;
  cursor: pointer;
  padding: 0.25rem;
  min-width: 44px;
  min-height: 44px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
  }

  &:focus-visible {
    outline: 2px solid #f87171;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  svg { width: 18px; height: 18px; }
`;

const SupersetBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.5rem;
  margin-left: 0.5rem;
  border-radius: 999px;
  background: rgba(139, 92, 246, 0.15);
  color: ${CS.gaming};
  border: 1px solid rgba(139, 92, 246, 0.3);
  text-transform: uppercase;
`;
