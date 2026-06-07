/**
 * ============================================================================
 * FILE: WorkoutPlanBuilder.tsx
 * PURPOSE: Multi-step workout plan creation wizard (orchestrator)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages state and navigation for the 4-step workout
 * plan builder (Plan Details -> Training Schedule -> Exercise Selection ->
 * Review & Save). Delegates rendering to step sub-components.
 *
 * HOW IT FITS IN THE APP: Used by active dashboard workout workspaces for
 * creating/editing client workout plans.
 *
 * KEY DECISIONS: Slim orchestrator pattern — all step rendering is delegated
 * to separate files to stay under the 300-line limit. State lives here so
 * steps share data without prop drilling through extra layers.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: WorkoutPlanBuilder                                ║
 * ║  PURPOSE: 4-step workout plan creation/editing wizard         ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-25                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Create Workout Plan                                        │
 * │ (1)──(2)──(3)──(4) stepper                                │
 * │ ┌──────────────────────────────────────────────────────┐   │
 * │ │ [Active Step Content]                                │   │
 * │ │                                                      │   │
 * │ │ [Back]                              [Next / Save]    │   │
 * │ └──────────────────────────────────────────────────────┘   │
 * └────────────────────────────────────────────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[WorkoutPlanBuilder] --> B[PlanDetailsStep]
 *   A --> C[TrainingScheduleStep]
 *   A --> D[ExerciseSelectionStep]
 *   A --> E[ReviewSaveStep]
 *   C --> F[MultiChipPicker]
 *   A --> G[ExerciseLibrary modal]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Next] -> validates step -> increments activeStep
 * [Back] -> decrements activeStep
 * [Save Plan] -> controller savePlan() -> Plan Vault save + PDF attach
 *
 * DATA FLOW:
 * Props In:  { clientId?, clientName?, onPlanCreated?, existingPlan?, mode? }
 * State:     { activeStep, plan, workoutDays, currentDay, exerciseLibraryOpen,
 *              selectedExercises, generationParams, openAccordions }
 * API Calls: POST /api/workout-builder/plan (via useWorkoutMcp)
 * Children:  PlanDetailsStep, TrainingScheduleStep, ExerciseSelectionStep,
 *            ReviewSaveStep, ExerciseLibrary (modal)
 */

import React from 'react';
import { Save } from 'lucide-react';
import WorkoutPlanBuilderExerciseModal from './WorkoutPlanBuilderExerciseModal';
import WorkoutPlanBuilderStepContent from './WorkoutPlanBuilderStepContent';
import { useWorkoutPlanBuilderController } from './useWorkoutPlanBuilderController';

// Types and constants
import { WorkoutPlanBuilderProps, steps, goals } from './WorkoutPlanBuilderTypes';

// Styled components
import {
  PageWrapper,
  PageTitle,
  Surface,
  FlexRow,
  AlertBox,
  StepperRow,
  StepItem,
  StepCircle,
  StepLabelText,
  StepConnector,
  PrimaryButton,
  GhostButton,
} from './WorkoutPlanBuilderStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Orchestrates state, navigation, and step delegation
// ─────────────────────────────────────────────────────────────
const WorkoutPlanBuilder: React.FC<WorkoutPlanBuilderProps> = ({
  clientId,
  clientName,
  onPlanCreated,
  existingPlan,
  mode = 'create',
}) => {
  const {
    activeStep,
    plan,
    workoutDays,
    currentDay,
    exerciseLibraryOpen,
    generationParams,
    setGenerationParams,
    openAccordions,
    loading,
    error,
    handleNext,
    handleBack,
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
    addExerciseToDay,
    savePlan,
  } = useWorkoutPlanBuilderController({
    clientId,
    clientName,
    onPlanCreated,
    existingPlan,
    mode,
  });

  // ─────────────────────────────────────────────────────────────
  // SECTION: Handlers
  // ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  // SECTION: Step rendering
  // ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  // SECTION: Render
  // ─────────────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <PageTitle>
        {mode === 'edit' ? 'Edit' : 'Create'} Workout Plan
      </PageTitle>

      <StepperRow>
        {steps.map((label, idx) => (
          <React.Fragment key={label}>
            <StepItem>
              <StepCircle $active={idx === activeStep} $completed={idx < activeStep}>
                {idx + 1}
              </StepCircle>
              <StepLabelText $active={idx === activeStep}>{label}</StepLabelText>
            </StepItem>
            {idx < steps.length - 1 && (
              <StepConnector $completed={idx < activeStep} />
            )}
          </React.Fragment>
        ))}
      </StepperRow>

      {error && <AlertBox $severity="error">{error}</AlertBox>}

      <Surface>
        <WorkoutPlanBuilderStepContent
          step={activeStep}
          plan={plan}
          workoutDays={workoutDays}
          goals={goals}
          clientId={clientId}
          clientName={clientName}
          generationParams={generationParams}
          setGenerationParams={setGenerationParams}
          loading={loading}
          openAccordions={openAccordions}
          handlePlanDetailChange={handlePlanDetailChange}
          handleGenerateWorkout={handleGenerateWorkout}
          addWorkoutDay={addWorkoutDay}
          updateWorkoutDay={updateWorkoutDay}
          deleteWorkoutDay={deleteWorkoutDay}
          setCurrentDay={setCurrentDay}
          setExerciseLibraryOpen={setExerciseLibraryOpen}
          removeExerciseFromDay={removeExerciseFromDay}
          setWorkoutDays={setWorkoutDays}
          toggleAccordion={toggleAccordion}
        />

        <FlexRow $justify="space-between" $marginTop="28px">
          <GhostButton disabled={activeStep === 0} onClick={handleBack}>
            Back
          </GhostButton>
          <FlexRow $gap="12px">
            {activeStep === steps.length - 1 ? (
              <PrimaryButton onClick={savePlan} disabled={loading}>
                <Save size={18} />
                {mode === 'edit' ? 'Update Plan' : 'Save Plan'}
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={handleNext}
                disabled={activeStep === 0 && (!plan.name.trim() || !plan.clientId)}
              >
                Next
              </PrimaryButton>
            )}
          </FlexRow>
        </FlexRow>
      </Surface>

      <WorkoutPlanBuilderExerciseModal
        open={exerciseLibraryOpen}
        currentDay={currentDay}
        workoutDays={workoutDays}
        setExerciseLibraryOpen={setExerciseLibraryOpen}
        addExerciseToDay={addExerciseToDay}
      />
    </PageWrapper>
  );
};

export default WorkoutPlanBuilder;
