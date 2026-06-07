/**
 * FILE: WorkoutPlanBuilderStepContent.tsx
 * PURPOSE: Route each Program Architect wizard step to the existing step UI.
 *
 * BLUEPRINT
 * Parent: WorkoutPlanBuilder.
 * Runtime: receives controller state/handlers and renders exactly one step.
 * Decision: this is a thin delegator so the builder stays below the line cap
 * without changing the existing PlanDetails, Schedule, Exercise, or Review UI.
 */

import React from 'react';
import type { WorkoutPlan, WorkoutPlanDay } from '../../hooks/useWorkoutMcp';
import PlanDetailsStep from './PlanDetailsStep';
import TrainingScheduleStep from './TrainingScheduleStep';
import ExerciseSelectionStep from './ExerciseSelectionStep';
import ReviewSaveStep from './ReviewSaveStep';

interface GenerationParams {
  daysPerWeek: number;
  focusAreas: string[];
  difficulty: string;
  equipment: string[];
}

interface WorkoutPlanBuilderStepContentProps {
  step: number;
  plan: WorkoutPlan;
  workoutDays: WorkoutPlanDay[];
  goals: { value: string; label: string }[];
  clientId?: string;
  clientName?: string;
  generationParams: GenerationParams;
  setGenerationParams: React.Dispatch<React.SetStateAction<GenerationParams>>;
  loading: boolean;
  openAccordions: Record<string, boolean>;
  handlePlanDetailChange: (field: keyof WorkoutPlan, value: any) => void;
  handleGenerateWorkout: () => void;
  addWorkoutDay: () => void;
  updateWorkoutDay: (dayIndex: number, updatedDay: WorkoutPlanDay) => void;
  deleteWorkoutDay: (dayIndex: number) => void;
  setCurrentDay: (day: WorkoutPlanDay) => void;
  setExerciseLibraryOpen: (open: boolean) => void;
  removeExerciseFromDay: (dayIndex: number, exerciseIndex: number) => void;
  setWorkoutDays: React.Dispatch<React.SetStateAction<WorkoutPlanDay[]>>;
  toggleAccordion: (key: string) => void;
}

const WorkoutPlanBuilderStepContent: React.FC<WorkoutPlanBuilderStepContentProps> = ({
  step,
  plan,
  workoutDays,
  goals,
  clientId,
  clientName,
  generationParams,
  setGenerationParams,
  loading,
  openAccordions,
  handlePlanDetailChange,
  handleGenerateWorkout,
  addWorkoutDay,
  updateWorkoutDay,
  deleteWorkoutDay,
  setCurrentDay,
  setExerciseLibraryOpen,
  removeExerciseFromDay,
  setWorkoutDays,
  toggleAccordion,
}) => {
  if (step === 0) {
    return (
      <PlanDetailsStep
        plan={plan}
        handlePlanDetailChange={handlePlanDetailChange}
        goals={goals}
        clientId={clientId}
        clientName={clientName}
      />
    );
  }

  if (step === 1) {
    return (
      <TrainingScheduleStep
        generationParams={generationParams}
        setGenerationParams={setGenerationParams}
        loading={loading}
        handleGenerateWorkout={handleGenerateWorkout}
        workoutDays={workoutDays}
        addWorkoutDay={addWorkoutDay}
        updateWorkoutDay={updateWorkoutDay}
        deleteWorkoutDay={deleteWorkoutDay}
        setCurrentDay={setCurrentDay}
        setExerciseLibraryOpen={setExerciseLibraryOpen}
        removeExerciseFromDay={removeExerciseFromDay}
      />
    );
  }

  if (step === 2) {
    return (
      <ExerciseSelectionStep
        workoutDays={workoutDays}
        openAccordions={openAccordions}
        toggleAccordion={toggleAccordion}
        setCurrentDay={setCurrentDay}
        setExerciseLibraryOpen={setExerciseLibraryOpen}
        removeExerciseFromDay={removeExerciseFromDay}
        setWorkoutDays={setWorkoutDays}
      />
    );
  }

  if (step === 3) {
    return (
      <ReviewSaveStep
        plan={plan}
        workoutDays={workoutDays}
        goals={goals}
        clientName={clientName}
        openAccordions={openAccordions}
        toggleAccordion={toggleAccordion}
      />
    );
  }

  return null;
};

export default WorkoutPlanBuilderStepContent;
