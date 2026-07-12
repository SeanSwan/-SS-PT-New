/**
 * WorkoutPlanBuilder controller hook
 * ==================================
 *
 * Owns Program Architect wizard state, Swan Coach generation, exercise edits,
 * and Plan Vault save behavior for the visual WorkoutPlanBuilder shell.
 */

import { useEffect, useState } from 'react';
import { parseSafetyGateReviewError, useSafetyGateReview } from '../cortex/useSafetyGateReview';
import type { PlanningReviewAck } from '../cortex/useSafetyGateReview';
import {
  useWorkoutMcp,
  type Exercise,
  type WorkoutPlan,
  type WorkoutPlanDay,
  type WorkoutPlanDayExercise,
} from '../../hooks/useWorkoutMcp';
import { logger } from '@/utils/logger';
import { withTrainerSessionDaySemantics } from '../../utils/workoutPlanAssignmentSemantics';
import type { WorkoutPlanBuilderProps } from './WorkoutPlanBuilderTypes';

const DEFAULT_PRIMARY_PLAN_WEEKS = 26;

const getIsoDate = (offsetWeeks = 0) =>
  new Date(Date.now() + offsetWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export const useWorkoutPlanBuilderController = ({
  clientId,
  clientName,
  onPlanCreated,
  existingPlan,
  mode = 'create',
}: WorkoutPlanBuilderProps) => {
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

  useEffect(() => {
    if (clientId) setPlan(prev => clientId === prev.clientId ? prev : { ...prev, clientId });
  }, [clientId]);

  useEffect(() => {
    if (existingPlan && mode === 'edit') {
      setPlan(existingPlan);
      setWorkoutDays(existingPlan.days || []);
    }
  }, [existingPlan, mode]);

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

  const {
    review: safetyGateReview,
    acknowledging: acknowledgingSafetyGate,
    requestSafetyGateReview,
    cancelSafetyGateReview,
    confirmSafetyGateReview,
  } = useSafetyGateReview();

  const handleGenerateWorkout = async (reviewAck?: PlanningReviewAck) => {
    // Guard: this handler is also used as a bare onClick, where React passes
    // the MouseEvent — only a REAL acknowledgement shape may flow onward.
    const ack = reviewAck
      && reviewAck.planningReviewAcknowledged === true
      && typeof reviewAck.planningReviewReason === 'string'
      ? reviewAck
      : undefined;
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
        ...(ack ?? {}),
      });
      if (response?.plan) {
        setPlan(response.plan);
        setWorkoutDays(response.plan.days || []);
        setActiveStep(2);
      }
    } catch (err) {
      // Cortex Phase 2D: same acknowledged-review contract as the Planner.
      const gate = parseSafetyGateReviewError(err);
      if (gate) {
        requestSafetyGateReview(gate, async (ack) => { await handleGenerateWorkout(ack); });
        return;
      }
      console.error('Failed to generate workout plan:', err);
    }
  };

  const addWorkoutDay = () => {
    const nextDayNumber = workoutDays.length + 1;
    setWorkoutDays([...workoutDays, withTrainerSessionDaySemantics({
      dayNumber: nextDayNumber,
      name: `Day ${nextDayNumber}`,
      focus: 'full_body',
      dayType: 'training',
      sortOrder: nextDayNumber,
      exercises: [],
    })]);
  };

  const updateWorkoutDay = (dayIndex: number, updatedDay: WorkoutPlanDay) => {
    const newDays = [...workoutDays];
    newDays[dayIndex] = updatedDay;
    setWorkoutDays(newDays);
  };

  const deleteWorkoutDay = (dayIndex: number) => {
    setWorkoutDays(workoutDays
      .filter((_, index) => index !== dayIndex)
      .map((day, index) => ({ ...day, dayNumber: index + 1, sortOrder: index + 1 })));
  };

  const addExerciseToDay = (dayIndex: number, exercise: Exercise) => {
    const newDays = [...workoutDays];
    const exercises = newDays[dayIndex].exercises || [];
    const exerciseToAdd: WorkoutPlanDayExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name || exercise.id,
      orderInWorkout: exercises.length + 1,
      setScheme: '3x10',
      repGoal: '10',
      restPeriod: 60,
      notes: exercise.description,
    };
    newDays[dayIndex] = { ...newDays[dayIndex], exercises: [...exercises, exerciseToAdd] };
    setWorkoutDays(newDays);
  };

  const removeExerciseFromDay = (dayIndex: number, exerciseIndex: number) => {
    const newDays = [...workoutDays];
    const exercises = (newDays[dayIndex].exercises || [])
      .filter((_, index) => index !== exerciseIndex)
      .map((exercise, index) => ({ ...exercise, orderInWorkout: index + 1 }));
    newDays[dayIndex] = { ...newDays[dayIndex], exercises };
    setWorkoutDays(newDays);
  };

  const savePlan = async () => {
    const finalPlan = { ...plan, days: workoutDays };
    logger.log('Saving workout plan:', finalPlan);
    try {
      await saveWorkoutPlan(finalPlan, {
        activate: true,
        attachPdf: true,
        clientName,
      });
      if (onPlanCreated) onPlanCreated(finalPlan);
      setPlan({
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
      setWorkoutDays([]);
      setActiveStep(0);
    } catch (err) {
      console.error('Failed to save workout plan:', err);
    }
  };

  return {
    safetyGateReview,
    acknowledgingSafetyGate,
    confirmSafetyGateReview,
    cancelSafetyGateReview,
    activeStep,
    addExerciseToDay,
    addWorkoutDay,
    currentDay,
    deleteWorkoutDay,
    error,
    exerciseLibraryOpen,
    generationParams,
    handleBack,
    handleGenerateWorkout,
    handleNext,
    handlePlanDetailChange,
    loading,
    openAccordions,
    plan,
    removeExerciseFromDay,
    savePlan,
    setCurrentDay,
    setExerciseLibraryOpen,
    setGenerationParams,
    setWorkoutDays,
    toggleAccordion,
    updateWorkoutDay,
    workoutDays,
  };
};
