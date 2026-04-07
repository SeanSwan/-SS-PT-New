/**
 * ============================================================================
 * FILE: ExerciseSelectionStep.tsx
 * PURPOSE: Step 2 of WorkoutPlanBuilder — per-day exercise table editing
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders collapsible accordion panels for each workout
 * day, each containing an "Add Exercise" button and a table of exercises with
 * editable sets, rest period, and notes columns.
 *
 * HOW IT FITS IN THE APP: Rendered by WorkoutPlanBuilder when activeStep === 2.
 *
 * KEY DECISIONS: Inline editing via CompactInput keeps the user in flow.
 * Accordion state is lifted to the parent to persist across step navigation.
 */

/**
 * ┌─── SUB-COMPONENT: ExerciseSelectionStep ───────────────────┐
 * │ PARENT: WorkoutPlanBuilder                                   │
 * │ PURPOSE: Fine-tune exercises per day with inline editing     │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────┐                     │
 * │ │ Exercise Selection & Customization   │                     │
 * │ │ ▶ Day 1 - 5 exercises               │                     │
 * │ │ ▼ Day 2 - 4 exercises               │                     │
 * │ │   [+ Add Exercise]                  │                     │
 * │ │   | # | Name | Sets | Rest | Notes |│                     │
 * │ │   | 1 | ...  | 3x10 | 60  | ...   |│                     │
 * │ └──────────────────────────────────────┘                     │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Accordion header] -> toggleAccordion(key)                   │
 * │ [Add Exercise]     -> opens exercise library modal           │
 * │ [Trash icon]       -> removeExerciseFromDay(day, ex)         │
 * │ [Input change]     -> inline mutation via setWorkoutDays     │
 * └──────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import type { WorkoutPlanDay } from '../../hooks/useWorkoutMcp';
import {
  SectionTitle,
  CollapsibleWrapper,
  CollapsibleHeader,
  CollapsibleBody,
  OutlineButton,
  RoundIconButton,
  StyledTable,
  StyledThead,
  StyledTh,
  StyledTd,
  CompactInput,
} from './WorkoutPlanBuilderStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────
export interface ExerciseSelectionStepProps {
  workoutDays: WorkoutPlanDay[];
  openAccordions: Record<string, boolean>;
  toggleAccordion: (key: string) => void;
  setCurrentDay: (day: WorkoutPlanDay) => void;
  setExerciseLibraryOpen: (open: boolean) => void;
  removeExerciseFromDay: (dayIndex: number, exerciseIndex: number) => void;
  setWorkoutDays: React.Dispatch<React.SetStateAction<WorkoutPlanDay[]>>;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const ExerciseSelectionStep: React.FC<ExerciseSelectionStepProps> = ({
  workoutDays,
  openAccordions,
  toggleAccordion,
  setCurrentDay,
  setExerciseLibraryOpen,
  removeExerciseFromDay,
  setWorkoutDays,
}) => {
  return (
    <div style={{ marginTop: 16 }}>
      <SectionTitle>Exercise Selection &amp; Customization</SectionTitle>

      {workoutDays.map((day, dayIndex) => {
        const accKey = `exercise-${dayIndex}`;
        const isOpen = !!openAccordions[accKey];
        return (
          <CollapsibleWrapper key={dayIndex}>
            <CollapsibleHeader
              $open={isOpen}
              onClick={() => toggleAccordion(accKey)}
              type="button"
            >
              <span>{day.name} - {day.exercises?.length || 0} exercises</span>
              <ChevronDown size={18} />
            </CollapsibleHeader>
            <CollapsibleBody $open={isOpen}>
              <OutlineButton
                onClick={() => {
                  setCurrentDay(day);
                  setExerciseLibraryOpen(true);
                }}
                style={{ marginBottom: 16 }}
              >
                <Plus size={18} />
                Add Exercise
              </OutlineButton>

              {day.exercises && day.exercises.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <StyledTable>
                    <StyledThead>
                      <tr>
                        <StyledTh>Order</StyledTh>
                        <StyledTh>Exercise</StyledTh>
                        <StyledTh>Sets x Reps</StyledTh>
                        <StyledTh>Rest (sec)</StyledTh>
                        <StyledTh>Notes</StyledTh>
                        <StyledTh>Actions</StyledTh>
                      </tr>
                    </StyledThead>
                    <tbody>
                      {day.exercises.map((exercise, exIndex) => (
                        <tr key={exIndex}>
                          <StyledTd>{exercise.orderInWorkout}</StyledTd>
                          <StyledTd title={exercise.exerciseId}>{exercise.exerciseName || exercise.exerciseId}</StyledTd>
                          <StyledTd>
                            <CompactInput
                              type="text"
                              value={exercise.setScheme || ''}
                              onChange={(e) => {
                                const newDays = [...workoutDays];
                                newDays[dayIndex].exercises![exIndex].setScheme = e.target.value;
                                setWorkoutDays(newDays);
                              }}
                            />
                          </StyledTd>
                          <StyledTd>
                            <CompactInput
                              type="number"
                              value={exercise.restPeriod || ''}
                              onChange={(e) => {
                                const newDays = [...workoutDays];
                                newDays[dayIndex].exercises![exIndex].restPeriod = Number(e.target.value);
                                setWorkoutDays(newDays);
                              }}
                            />
                          </StyledTd>
                          <StyledTd>
                            <CompactInput
                              type="text"
                              value={exercise.notes || ''}
                              onChange={(e) => {
                                const newDays = [...workoutDays];
                                newDays[dayIndex].exercises![exIndex].notes = e.target.value;
                                setWorkoutDays(newDays);
                              }}
                            />
                          </StyledTd>
                          <StyledTd>
                            <RoundIconButton
                              $danger
                              type="button"
                              onClick={() => removeExerciseFromDay(dayIndex, exIndex)}
                              aria-label="Remove exercise"
                            >
                              <Trash2 size={16} />
                            </RoundIconButton>
                          </StyledTd>
                        </tr>
                      ))}
                    </tbody>
                  </StyledTable>
                </div>
              )}
            </CollapsibleBody>
          </CollapsibleWrapper>
        );
      })}
    </div>
  );
};

export default React.memo(ExerciseSelectionStep);
