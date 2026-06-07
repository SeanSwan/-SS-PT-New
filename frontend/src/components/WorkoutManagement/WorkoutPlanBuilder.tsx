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
 * [Save Plan] -> savePlan() -> calls onPlanCreated -> resets form
 *
 * DATA FLOW:
 * Props In:  { clientId?, clientName?, onPlanCreated?, existingPlan?, mode? }
 * State:     { activeStep, plan, workoutDays, currentDay, exerciseLibraryOpen,
 *              selectedExercises, generationParams, openAccordions }
 * API Calls: POST /api/workout-builder/plan (via useWorkoutMcp)
 * Children:  PlanDetailsStep, TrainingScheduleStep, ExerciseSelectionStep,
 *            ReviewSaveStep, ExerciseLibrary (modal)
 */

import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import {
  useWorkoutMcp,
  WorkoutPlan,
  WorkoutPlanDay,
  WorkoutPlanDayExercise,
  Exercise,
} from '../../hooks/useWorkoutMcp';
import ExerciseLibrary from './ExerciseLibrary';
import { logger } from '@/utils/logger';

// Step sub-components
import PlanDetailsStep from './PlanDetailsStep';
import TrainingScheduleStep from './TrainingScheduleStep';
import ExerciseSelectionStep from './ExerciseSelectionStep';
import ReviewSaveStep from './ReviewSaveStep';

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
  RoundIconButton,
  ModalOverlay,
  ModalPanel,
  ModalHeader,
  ModalContent,
  ModalFooter,
} from './WorkoutPlanBuilderStyles';

const DEFAULT_PRIMARY_PLAN_WEEKS = 26;

const getIsoDate = (offsetWeeks = 0) =>
  new Date(Date.now() + offsetWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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
  const { generateWorkoutPlan, saveWorkoutPlan, loading, error } = useWorkoutMcp();
  const [activeStep, setActiveStep] = useState(0);
  const [plan, setPlan] = useState<WorkoutPlan>({
    name: '',
    description: '',
    trainerId: '',
    clientId: clientId || '',
    goal: 'general',
    startDate: getIsoDate(),
    endDate: getIsoDate(DEFAULT_PRIMARY_PLAN_WEEKS),
    status: 'active',
    days: [],
  });

  const [workoutDays, setWorkoutDays] = useState<WorkoutPlanDay[]>([]);
  const [currentDay, setCurrentDay] = useState<WorkoutPlanDay | null>(null);
  const [exerciseLibraryOpen, setExerciseLibraryOpen] = useState(false);
  const [generationParams, setGenerationParams] = useState({
    daysPerWeek: 3,
    focusAreas: [] as string[],
    difficulty: 'intermediate',
    equipment: [] as string[],
  });
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Sync clientId prop to plan state (fixes "Next" button staying disabled)
  useEffect(() => {
    if (clientId && clientId !== plan.clientId) {
      setPlan(prev => ({ ...prev, clientId }));
    }
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize with existing plan if in edit mode
  useEffect(() => {
    if (existingPlan && mode === 'edit') {
      setPlan(existingPlan);
      setWorkoutDays(existingPlan.days || []);
    }
  }, [existingPlan, mode]);

  // ─────────────────────────────────────────────────────────────
  // SECTION: Handlers
  // ─────────────────────────────────────────────────────────────
  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNext = () => {
    if (activeStep === 0 && (!plan.name.trim() || !plan.clientId)) return;
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handlePlanDetailChange = <Field extends keyof WorkoutPlan>(
    field: Field,
    value: WorkoutPlan[Field],
  ) => {
    setPlan(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateWorkout = async () => {
    try {
      const response = await generateWorkoutPlan({
        trainerId: 'current-trainer',
        clientId: plan.clientId,
        name: plan.name,
        description: plan.description,
        goal: plan.goal,
        startDate: plan.startDate,
        endDate: plan.endDate,
        daysPerWeek: generationParams.daysPerWeek,
        focusAreas: generationParams.focusAreas,
        difficulty: generationParams.difficulty,
        equipment: generationParams.equipment,
      });
      if (response?.plan) {
        setPlan(response.plan);
        setWorkoutDays(response.plan.days || []);
        setActiveStep(2);
      }
    } catch (err) {
      console.error('Failed to generate workout plan:', err);
    }
  };

  const addWorkoutDay = () => {
    const newDay: WorkoutPlanDay = {
      dayNumber: workoutDays.length + 1,
      name: `Day ${workoutDays.length + 1}`,
      focus: 'full_body',
      dayType: 'training',
      sortOrder: workoutDays.length + 1,
      exercises: [],
    };
    setWorkoutDays([...workoutDays, newDay]);
  };

  const updateWorkoutDay = (dayIndex: number, updatedDay: WorkoutPlanDay) => {
    const newDays = [...workoutDays];
    newDays[dayIndex] = updatedDay;
    setWorkoutDays(newDays);
  };

  const deleteWorkoutDay = (dayIndex: number) => {
    const newDays = workoutDays.filter((_, index) => index !== dayIndex);
    const renumberedDays = newDays.map((day, index) => ({
      ...day,
      dayNumber: index + 1,
      sortOrder: index + 1,
    }));
    setWorkoutDays(renumberedDays);
  };

  const addExerciseToDay = (dayIndex: number, exercise: Exercise) => {
    const newDays = [...workoutDays];
    const exerciseToAdd: WorkoutPlanDayExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name || exercise.id,
      orderInWorkout: (newDays[dayIndex].exercises?.length || 0) + 1,
      setScheme: '3x10',
      repGoal: '10',
      restPeriod: 60,
      notes: exercise.description,
    };
    if (!newDays[dayIndex].exercises) {
      newDays[dayIndex].exercises = [];
    }
    newDays[dayIndex].exercises!.push(exerciseToAdd);
    setWorkoutDays(newDays);
  };

  const removeExerciseFromDay = (dayIndex: number, exerciseIndex: number) => {
    const newDays = [...workoutDays];
    newDays[dayIndex].exercises?.splice(exerciseIndex, 1);
    if (newDays[dayIndex].exercises) {
      newDays[dayIndex].exercises = newDays[dayIndex].exercises!.map((ex, idx) => ({
        ...ex,
        orderInWorkout: idx + 1,
      }));
    }
    setWorkoutDays(newDays);
  };

  const savePlan = async () => {
    const finalPlan = { ...plan, days: workoutDays };
    logger.log('Saving workout plan:', finalPlan);
    try {
      await saveWorkoutPlan(finalPlan, { activate: true });
      if (onPlanCreated) onPlanCreated(finalPlan);
      setPlan({
        name: '', description: '', trainerId: '', clientId: clientId || '',
        goal: 'general',
        startDate: getIsoDate(),
        endDate: getIsoDate(DEFAULT_PRIMARY_PLAN_WEEKS),
        status: 'active', days: [],
      });
      setWorkoutDays([]);
      setActiveStep(0);
    } catch (err) {
      console.error('Failed to save workout plan:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SECTION: Step rendering
  // ─────────────────────────────────────────────────────────────
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <PlanDetailsStep
            plan={plan}
            handlePlanDetailChange={handlePlanDetailChange}
            goals={goals}
            clientId={clientId}
            clientName={clientName}
          />
        );
      case 1:
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
      case 2:
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
      case 3:
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
      default:
        return null;
    }
  };

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
        {renderStepContent(activeStep)}

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

      {/* Exercise Library Modal */}
      <ModalOverlay $open={exerciseLibraryOpen} onClick={() => setExerciseLibraryOpen(false)}>
        <ModalPanel onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            Select Exercise for {currentDay?.name}
            <RoundIconButton
              type="button"
              onClick={() => setExerciseLibraryOpen(false)}
              aria-label="Close dialog"
            >
              <X size={18} />
            </RoundIconButton>
          </ModalHeader>
          <ModalContent>
            <ExerciseLibrary
              onExerciseSelect={(exercise) => {
                if (currentDay) {
                  const dayIndex = workoutDays.findIndex(d => d.dayNumber === currentDay.dayNumber);
                  if (dayIndex !== -1) {
                    addExerciseToDay(dayIndex, exercise);
                    setExerciseLibraryOpen(false);
                  }
                }
              }}
            />
          </ModalContent>
          <ModalFooter>
            <GhostButton onClick={() => setExerciseLibraryOpen(false)}>Close</GhostButton>
          </ModalFooter>
        </ModalPanel>
      </ModalOverlay>
    </PageWrapper>
  );
};

export default WorkoutPlanBuilder;
