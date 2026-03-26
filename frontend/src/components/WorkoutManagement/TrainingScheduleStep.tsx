/**
 * ============================================================================
 * FILE: TrainingScheduleStep.tsx
 * PURPOSE: Step 1 of WorkoutPlanBuilder — auto-generation and manual day setup
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the training schedule configuration step with
 * two sections: (1) AI auto-generation controls (days/week, difficulty, focus
 * areas, equipment) and (2) manual day creation with name/focus/duration
 * fields and inline exercise lists per day.
 *
 * HOW IT FITS IN THE APP: Rendered by WorkoutPlanBuilder when activeStep === 1.
 *
 * KEY DECISIONS: Manual day editing co-exists with auto-generation so trainers
 * can generate a baseline then fine-tune individual days.
 */

/**
 * ┌─── SUB-COMPONENT: TrainingScheduleStep ────────────────────┐
 * │ PARENT: WorkoutPlanBuilder                                   │
 * │ PURPOSE: Configure training schedule and generate plans      │
 * │ WIREFRAME:                                                   │
 * │ ┌──────────────────────────────────────┐                     │
 * │ │ Auto-Generate Panel                  │                     │
 * │ │ [Days▼] [Diff▼] [Focus chips] [Eq]  │                     │
 * │ │ [Generate Workout Plan]              │                     │
 * │ ├──────────────────────────────────────┤                     │
 * │ │ Workout Days (N)       [+ Add Day]   │                     │
 * │ │ ┌─ Day Card ─────────────────────┐   │                     │
 * │ │ │ Day Name  [🏋️] [🗑️]            │   │                     │
 * │ │ │ [Name] [Focus▼] [Duration]     │   │                     │
 * │ │ │ Exercises list...              │   │                     │
 * │ │ └───────────────────────────────┘   │                     │
 * │ └──────────────────────────────────────┘                     │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Generate] -> handleGenerateWorkout -> API call              │
 * │ [Add Day]  -> addWorkoutDay -> new empty day card            │
 * │ [Dumbbell] -> setCurrentDay + setExerciseLibraryOpen(true)   │
 * │ [Trash]    -> deleteWorkoutDay(index)                        │
 * └──────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { Plus, Trash2, Dumbbell, Sparkles } from 'lucide-react';
import type { WorkoutPlanDay } from '../../hooks/useWorkoutMcp';
import MultiChipPicker from './MultiChipPicker';
import { muscleGroups, equipmentOptions, difficulties } from './WorkoutPlanBuilderTypes';
import {
  SectionTitle,
  SubTitle,
  SmallText,
  CardPanel,
  FormGrid,
  FlexRow,
  FieldGroup,
  FieldLabel,
  StyledInput,
  NativeSelect,
  PrimaryButton,
  OutlineButton,
  RoundIconButton,
  Divider,
  ListUl,
  ListLi,
  ListItemContent,
} from './WorkoutPlanBuilderStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Props
// ─────────────────────────────────────────────────────────────
export interface TrainingScheduleStepProps {
  generationParams: {
    daysPerWeek: number;
    focusAreas: string[];
    difficulty: string;
    equipment: string[];
  };
  setGenerationParams: React.Dispatch<React.SetStateAction<{
    daysPerWeek: number;
    focusAreas: string[];
    difficulty: string;
    equipment: string[];
  }>>;
  loading: boolean;
  handleGenerateWorkout: () => void;
  workoutDays: WorkoutPlanDay[];
  addWorkoutDay: () => void;
  updateWorkoutDay: (dayIndex: number, updatedDay: WorkoutPlanDay) => void;
  deleteWorkoutDay: (dayIndex: number) => void;
  setCurrentDay: (day: WorkoutPlanDay) => void;
  setExerciseLibraryOpen: (open: boolean) => void;
  removeExerciseFromDay: (dayIndex: number, exerciseIndex: number) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const TrainingScheduleStep: React.FC<TrainingScheduleStepProps> = ({
  generationParams,
  setGenerationParams,
  loading,
  handleGenerateWorkout,
  workoutDays,
  addWorkoutDay,
  updateWorkoutDay,
  deleteWorkoutDay,
  setCurrentDay,
  setExerciseLibraryOpen,
  removeExerciseFromDay,
}) => {
  return (
    <div style={{ marginTop: 16 }}>
      <SectionTitle>Training Schedule Setup</SectionTitle>

      {/* Auto-Generation Options */}
      <CardPanel>
        <SectionTitle>Auto-Generate Workout Plan</SectionTitle>
        <FormGrid $cols="1fr 1fr 1fr 1fr">
          <FieldGroup>
            <FieldLabel htmlFor="gen-days">Days per Week</FieldLabel>
            <NativeSelect
              id="gen-days"
              value={generationParams.daysPerWeek}
              onChange={(e) => setGenerationParams({
                ...generationParams,
                daysPerWeek: Number(e.target.value),
              })}
            >
              <option value={1}>1 Day</option>
              <option value={2}>2 Days</option>
              <option value={3}>3 Days</option>
              <option value={4}>4 Days</option>
              <option value={5}>5 Days</option>
              <option value={6}>6 Days</option>
              <option value={7}>7 Days</option>
            </NativeSelect>
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="gen-difficulty">Difficulty</FieldLabel>
            <NativeSelect
              id="gen-difficulty"
              value={generationParams.difficulty}
              onChange={(e) => setGenerationParams({
                ...generationParams,
                difficulty: e.target.value,
              })}
            >
              {difficulties.map((diff) => (
                <option key={diff.value} value={diff.value}>
                  {diff.label}
                </option>
              ))}
            </NativeSelect>
          </FieldGroup>
          <MultiChipPicker
            label="Focus Areas"
            options={muscleGroups}
            selected={generationParams.focusAreas}
            onChange={(value) => setGenerationParams({
              ...generationParams,
              focusAreas: value,
            })}
          />
          <MultiChipPicker
            label="Available Equipment"
            options={equipmentOptions}
            selected={generationParams.equipment}
            onChange={(value) => setGenerationParams({
              ...generationParams,
              equipment: value,
            })}
          />
        </FormGrid>
        <div style={{ marginTop: 16 }}>
          <PrimaryButton
            $fullWidth
            onClick={handleGenerateWorkout}
            disabled={loading}
          >
            <Sparkles size={18} />
            Generate Workout Plan
          </PrimaryButton>
        </div>
      </CardPanel>

      <Divider />

      {/* Manual Day Creation */}
      <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 16 }}>
        <SectionTitle style={{ marginBottom: 0 }}>
          Workout Days ({workoutDays.length})
        </SectionTitle>
        <OutlineButton onClick={addWorkoutDay}>
          <Plus size={18} />
          Add Day
        </OutlineButton>
      </FlexRow>

      {workoutDays.map((day, index) => (
        <CardPanel key={index}>
          <FlexRow $justify="space-between" $align="center">
            <SubTitle style={{ marginBottom: 0 }}>{day.name}</SubTitle>
            <FlexRow $gap="4px">
              <RoundIconButton
                type="button"
                onClick={() => {
                  setCurrentDay(day);
                  setExerciseLibraryOpen(true);
                }}
                aria-label="Add exercise"
              >
                <Dumbbell size={18} />
              </RoundIconButton>
              <RoundIconButton
                $danger
                type="button"
                onClick={() => deleteWorkoutDay(index)}
                aria-label="Delete day"
              >
                <Trash2 size={18} />
              </RoundIconButton>
            </FlexRow>
          </FlexRow>

          <FormGrid $cols="1fr 1fr 1fr" style={{ marginTop: 12 }}>
            <FieldGroup>
              <FieldLabel>Day Name</FieldLabel>
              <StyledInput
                type="text"
                value={day.name}
                onChange={(e) => {
                  const updatedDay = { ...day, name: e.target.value };
                  updateWorkoutDay(index, updatedDay);
                }}
              />
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Focus</FieldLabel>
              <NativeSelect
                value={day.focus || 'full_body'}
                onChange={(e) => {
                  const updatedDay = { ...day, focus: e.target.value };
                  updateWorkoutDay(index, updatedDay);
                }}
              >
                <option value="full_body">Full Body</option>
                <option value="upper_body">Upper Body</option>
                <option value="lower_body">Lower Body</option>
                <option value="push">Push</option>
                <option value="pull">Pull</option>
                <option value="legs">Legs</option>
                <option value="cardio">Cardio</option>
                <option value="core">Core</option>
              </NativeSelect>
            </FieldGroup>
            <FieldGroup>
              <FieldLabel>Estimated Duration (min)</FieldLabel>
              <StyledInput
                type="number"
                value={day.estimatedDuration || ''}
                onChange={(e) => {
                  const updatedDay = {
                    ...day,
                    estimatedDuration: Number(e.target.value),
                  };
                  updateWorkoutDay(index, updatedDay);
                }}
              />
            </FieldGroup>
          </FormGrid>

          {day.exercises && day.exercises.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <SmallText style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Exercises ({day.exercises.length})
              </SmallText>
              <ListUl>
                {day.exercises.map((exercise, exIndex) => (
                  <ListLi key={exIndex}>
                    <ListItemContent>
                      <SmallText>{`Exercise ${exercise.orderInWorkout}`}</SmallText>
                      <SmallText $muted>{`${exercise.setScheme} - ${exercise.repGoal} reps`}</SmallText>
                    </ListItemContent>
                    <RoundIconButton
                      $danger
                      type="button"
                      onClick={() => removeExerciseFromDay(index, exIndex)}
                      aria-label="Remove exercise"
                    >
                      <Trash2 size={16} />
                    </RoundIconButton>
                  </ListLi>
                ))}
              </ListUl>
            </div>
          )}
        </CardPanel>
      ))}
    </div>
  );
};

export default React.memo(TrainingScheduleStep);
