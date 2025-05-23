/**
 * WorkoutPlanner Component
 * =======================
 * Main container component that orchestrates the workout plan creation and management
 */

import React, { memo } from 'react';
import useWorkoutPlannerState from '../../hooks/useWorkoutPlannerState';
import { PlannerContainer } from '../../styles/WorkoutPlanner.styles';

// Import sub-components
import PlanHeader from './components/PlanHeader';
import PlanForm from './components/PlanForm';
import DaySelector from './components/DaySelector';
import ExerciseList from './components/ExerciseList';
import SaveControls from './components/SaveControls';
import PlanList from './components/PlanList';
import ExerciseSelector from '../ExerciseSelector';

interface WorkoutPlannerProps {
  userId?: string;
}

/**
 * WorkoutPlanner Component
 * 
 * Decomposed main container that manages the overall state and layout
 * of the workout planner feature. Delegates rendering to specialized sub-components.
 */
const WorkoutPlanner: React.FC<WorkoutPlannerProps> = ({ userId }) => {
  // Use custom hook for state management
  const workoutPlannerState = useWorkoutPlannerState(userId);
  
  const {
    activeTab,
    showExerciseSelector,
    setShowExerciseSelector,
    addExercise,
    loading,
    plans
  } = workoutPlannerState;
  
  // Render loading state for manage tab
  if (loading && activeTab === 'manage') {
    return (
      <PlannerContainer>
        <div className="loading-indicator">Loading workout plans...</div>
      </PlannerContainer>
    );
  }
  
  return (
    <PlannerContainer>
      {/* Tab navigation and header */}
      <PlanHeader 
        activeTab={activeTab} 
        setActiveTab={workoutPlannerState.setActiveTab} 
      />
      
      {/* Plan creation and editing view */}
      {(activeTab === 'create' || activeTab === 'edit') && (
        <>
          {/* Plan details form */}
          <PlanForm 
            state={workoutPlannerState} 
          />
          
          {/* Day selector */}
          <DaySelector 
            state={workoutPlannerState} 
          />
          
          {/* Exercise list for current day */}
          <ExerciseList 
            state={workoutPlannerState} 
          />
          
          {/* Action buttons */}
          <SaveControls 
            state={workoutPlannerState} 
          />
          
          {/* Exercise selector modal */}
          {showExerciseSelector && (
            <ExerciseSelector 
              onSelect={addExercise}
              onClose={() => setShowExerciseSelector(false)}
            />
          )}
        </>
      )}
      
      {/* Plan management view */}
      {activeTab === 'manage' && (
        <PlanList 
          plans={plans} 
          onEditPlan={workoutPlannerState.loadPlan} 
          onDeletePlan={workoutPlannerState.deletePlan} 
        />
      )}
    </PlannerContainer>
  );
};

// Export memoized component for better performance
export default memo(WorkoutPlanner);
