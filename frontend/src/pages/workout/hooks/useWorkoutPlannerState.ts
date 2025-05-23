/**
 * useWorkoutPlannerState Hook
 * ==========================
 * Custom hook for managing workout planner state and actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  fetchWorkoutPlans,
  fetchWorkoutPlan,
  saveWorkoutPlan,
  deleteWorkoutPlan,
  setSelectedPlan
} from '../../../store/slices/workoutSlice';
import { PlanDay, PlanExercise, WorkoutPlan } from '../types/plan.types';

interface UseWorkoutPlannerStateReturn {
  // State
  activeTab: string;
  planTitle: string;
  planDescription: string;
  planDuration: string;
  selectedDay: number;
  planDays: PlanDay[];
  showExerciseSelector: boolean;
  error: string | null;
  success: string | null;
  
  // Redux state
  plans: WorkoutPlan[];
  selectedPlan: WorkoutPlan | null;
  loading: boolean;
  savingPlan: boolean;
  
  // Actions
  setActiveTab: (tab: string) => void;
  setPlanTitle: (title: string) => void;
  setPlanDescription: (description: string) => void;
  setPlanDuration: (duration: string) => void;
  setSelectedDay: (day: number) => void;
  setPlanDays: (days: PlanDay[]) => void;
  setShowExerciseSelector: (show: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: string | null) => void;
  
  // Helper actions
  addDay: () => void;
  addExercise: (exercise: any) => void;
  removeExercise: (exerciseIndex: number) => void;
  updateExerciseDetails: (exerciseIndex: number, field: string, value: any) => void;
  updateDayTitle: (index: number, title: string) => void;
  
  // Main actions
  handleSave: () => void;
  handleCancel: () => void;
  resetForm: () => void;
  loadPlan: (planId: string) => void;
  deletePlan: (planId: string) => void;
}

/**
 * Custom hook for managing workout planner state
 */
const useWorkoutPlannerState = (userId?: string): UseWorkoutPlannerStateReturn => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const {
    plans: { 
      data: plans,
      selectedPlan,
      loading,
      error: planError,
      savingPlan
    },
    selectedClientId
  } = useAppSelector(state => state.workout);
  
  // Local state
  const [activeTab, setActiveTab] = useState<string>('create');
  const [planTitle, setPlanTitle] = useState<string>('');
  const [planDescription, setPlanDescription] = useState<string>('');
  const [planDuration, setPlanDuration] = useState<string>('4');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showExerciseSelector, setShowExerciseSelector] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Plan structure - an array of days, each with exercises
  const [planDays, setPlanDays] = useState<PlanDay[]>([
    {
      dayNumber: 1,
      title: 'Day 1',
      exercises: []
    }
  ]);
  
  // Load plans on component mount
  useEffect(() => {
    const effectiveUserId = userId || selectedClientId;
    if (effectiveUserId) {
      dispatch(fetchWorkoutPlans({
        userId: effectiveUserId,
        status: 'all'
      }));
    }
  }, [dispatch, userId, selectedClientId]);
  
  // Clear form errors when tab changes
  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [activeTab]);
  
  // Clear form when Redux selected plan changes
  useEffect(() => {
    if (selectedPlan && activeTab === 'edit') {
      // Populate form with selected plan data
      setPlanTitle(selectedPlan.title);
      setPlanDescription(selectedPlan.description);
      setPlanDuration(selectedPlan.durationWeeks.toString());
      setPlanDays(selectedPlan.days);
      setSelectedDay(selectedPlan.days[0]?.dayNumber || 1);
    }
  }, [selectedPlan, activeTab]);
  
  // Add a new day to the plan
  const addDay = useCallback(() => {
    const newDayNumber = planDays.length + 1;
    setPlanDays(prev => [
      ...prev,
      {
        dayNumber: newDayNumber,
        title: `Day ${newDayNumber}`,
        exercises: []
      }
    ]);
    setSelectedDay(newDayNumber);
  }, [planDays]);
  
  // Add an exercise to the current day
  const addExercise = useCallback((exercise: any) => {
    setPlanDays(prev => {
      const updatedDays = [...prev];
      const currentDayIndex = updatedDays.findIndex(day => day.dayNumber === selectedDay);
      
      if (currentDayIndex !== -1) {
        updatedDays[currentDayIndex].exercises.push({
          id: exercise.id,
          name: exercise.name,
          sets: 3,
          reps: '8-12',
          rest: 60,
          notes: ''
        });
      }
      
      return updatedDays;
    });
    
    setShowExerciseSelector(false);
  }, [selectedDay]);
  
  // Remove an exercise from the current day
  const removeExercise = useCallback((exerciseIndex: number) => {
    setPlanDays(prev => {
      const updatedDays = [...prev];
      const currentDayIndex = updatedDays.findIndex(day => day.dayNumber === selectedDay);
      
      if (currentDayIndex !== -1) {
        updatedDays[currentDayIndex].exercises.splice(exerciseIndex, 1);
      }
      
      return updatedDays;
    });
  }, [selectedDay]);
  
  // Update an exercise's details
  const updateExerciseDetails = useCallback((exerciseIndex: number, field: string, value: any) => {
    setPlanDays(prev => {
      const updatedDays = [...prev];
      const currentDayIndex = updatedDays.findIndex(day => day.dayNumber === selectedDay);
      
      if (currentDayIndex !== -1 && exerciseIndex >= 0 && exerciseIndex < updatedDays[currentDayIndex].exercises.length) {
        updatedDays[currentDayIndex].exercises[exerciseIndex] = {
          ...updatedDays[currentDayIndex].exercises[exerciseIndex],
          [field]: value
        };
      }
      
      return updatedDays;
    });
  }, [selectedDay]);
  
  // Update day title
  const updateDayTitle = useCallback((index: number, title: string) => {
    setPlanDays(prev => {
      const updatedDays = [...prev];
      if (index >= 0 && index < updatedDays.length) {
        updatedDays[index].title = title;
      }
      return updatedDays;
    });
  }, []);
  
  // Handle saving the workout plan
  const handleSave = useCallback(() => {
    // Validate inputs
    if (!planTitle.trim()) {
      setError('Please provide a title for your workout plan');
      return;
    }
    
    // Validate that there's at least one exercise
    const hasExercises = planDays.some(day => day.exercises.length > 0);
    if (!hasExercises) {
      setError('Please add at least one exercise to your workout plan');
      return;
    }
    
    // Prepare plan data
    const planData = {
      userId: userId || selectedClientId || '',
      title: planTitle,
      description: planDescription,
      durationWeeks: parseInt(planDuration),
      status: 'active' as const,
      tags: [],
      days: planDays
    };
    
    // If editing an existing plan, update it
    const params = {
      planId: activeTab === 'edit' && selectedPlan ? selectedPlan.id : undefined,
      plan: planData
    };
    
    // Save the plan
    dispatch(saveWorkoutPlan(params))
      .unwrap()
      .then(response => {
        setSuccess(
          activeTab === 'edit' 
            ? 'Workout plan updated successfully!' 
            : 'Workout plan created successfully!'
        );
        
        // Switch to manage tab after successful save
        setTimeout(() => {
          setActiveTab('manage');
        }, 1500);
      })
      .catch(err => {
        setError(err || 'Failed to save workout plan. Please try again.');
      });
  }, [
    dispatch, 
    activeTab, 
    planTitle, 
    planDescription, 
    planDuration, 
    planDays, 
    userId, 
    selectedClientId, 
    selectedPlan
  ]);
  
  // Handle canceling and resetting the form
  const handleCancel = useCallback(() => {
    if (window.confirm('Are you sure you want to discard this workout plan?')) {
      resetForm();
      if (activeTab === 'edit') {
        setActiveTab('manage');
      }
    }
  }, [activeTab]);
  
  // Reset the form
  const resetForm = useCallback(() => {
    setPlanTitle('');
    setPlanDescription('');
    setPlanDuration('4');
    setPlanDays([{
      dayNumber: 1,
      title: 'Day 1',
      exercises: []
    }]);
    setSelectedDay(1);
    setError(null);
    setSuccess(null);
    
    // Clear selected plan in Redux if in create mode
    if (activeTab === 'create') {
      dispatch(setSelectedPlan(null));
    }
  }, [dispatch, activeTab]);
  
  // Load a plan for editing
  const loadPlan = useCallback((planId: string) => {
    dispatch(fetchWorkoutPlan(planId))
      .unwrap()
      .then(() => {
        setActiveTab('edit');
      })
      .catch(err => {
        setError(err || 'Failed to load workout plan. Please try again.');
      });
  }, [dispatch]);
  
  // Delete a plan
  const deletePlan = useCallback((planId: string) => {
    if (window.confirm('Are you sure you want to delete this workout plan? This action cannot be undone.')) {
      dispatch(deleteWorkoutPlan(planId))
        .unwrap()
        .then(() => {
          // If we're editing this plan, reset the form
          if (activeTab === 'edit' && selectedPlan?.id === planId) {
            resetForm();
            setActiveTab('manage');
          }
          
          setSuccess('Workout plan deleted successfully!');
        })
        .catch(err => {
          setError(err || 'Failed to delete workout plan. Please try again.');
        });
    }
  }, [dispatch, activeTab, selectedPlan, resetForm]);
  
  return {
    // State
    activeTab,
    planTitle,
    planDescription,
    planDuration,
    selectedDay,
    planDays,
    showExerciseSelector,
    error: error || planError || null,
    success,
    
    // Redux state
    plans,
    selectedPlan,
    loading,
    savingPlan,
    
    // Setters
    setActiveTab,
    setPlanTitle,
    setPlanDescription,
    setPlanDuration,
    setSelectedDay,
    setPlanDays,
    setShowExerciseSelector,
    setError,
    setSuccess,
    
    // Helper actions
    addDay,
    addExercise,
    removeExercise,
    updateExerciseDetails,
    updateDayTitle,
    
    // Main actions
    handleSave,
    handleCancel,
    resetForm,
    loadPlan,
    deletePlan
  };
};

export default useWorkoutPlannerState;
