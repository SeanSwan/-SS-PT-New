/**
 * ExerciseList Component
 * =====================
 * Displays and manages the list of exercises for the selected day
 */

import React from 'react';
import { 
  WorkoutDayContainer, 
  WorkoutDayHeader, 
  TextInput, 
  ExerciseList as ExerciseListStyled,
  ExerciseItem,
  ExerciseDetails,
  TextArea,
  RemoveButton
} from '../../../styles/WorkoutPlanner.styles';

interface ExerciseListProps {
  state: {
    planDays: Array<{
      dayNumber: number;
      title: string;
      exercises: Array<{
        id: string;
        name: string;
        sets: number;
        reps: string;
        rest: number;
        notes: string;
      }>;
    }>;
    selectedDay: number;
    updateDayTitle: (index: number, title: string) => void;
    updateExerciseDetails: (index: number, field: string, value: any) => void;
    removeExercise: (index: number) => void;
    setShowExerciseSelector: (show: boolean) => void;
    savingPlan: boolean;
    error: string;
    success: string;
  };
}

/**
 * ExerciseList Component
 * 
 * Displays the list of exercises for the selected day and allows editing them
 */
const ExerciseList: React.FC<ExerciseListProps> = ({ state }) => {
  const {
    planDays,
    selectedDay,
    updateDayTitle,
    updateExerciseDetails,
    removeExercise,
    setShowExerciseSelector,
    savingPlan,
    error,
    success
  } = state;
  
  // Get the current day and its exercises
  const currentDayIndex = planDays.findIndex(day => day.dayNumber === selectedDay);
  const currentDay = planDays[currentDayIndex];
  const currentDayExercises = currentDay?.exercises || [];
  
  return (
    <>
      <WorkoutDayContainer>
        <WorkoutDayHeader>
          <TextInput
            value={currentDay?.title || ''}
            onChange={(e) => {
              if (currentDayIndex !== -1) {
                updateDayTitle(currentDayIndex, e.target.value);
              }
            }}
            placeholder="Day Title"
            disabled={savingPlan}
          />
          <button 
            onClick={() => setShowExerciseSelector(true)}
            disabled={savingPlan}
          >
            Add Exercise
          </button>
        </WorkoutDayHeader>
        
        <ExerciseListStyled>
          {currentDayExercises.length === 0 ? (
            <p>No exercises added yet. Click "Add Exercise" to begin.</p>
          ) : (
            currentDayExercises.map((exercise, index) => (
              <ExerciseItem key={`${exercise.id}-${index}`}>
                <h4>{exercise.name}</h4>
                <ExerciseDetails>
                  <div>
                    <label>Sets</label>
                    <input
                      type="number"
                      min="1"
                      value={exercise.sets}
                      onChange={(e) => updateExerciseDetails(index, 'sets', parseInt(e.target.value))}
                      disabled={savingPlan}
                    />
                  </div>
                  <div>
                    <label>Reps</label>
                    <input
                      type="text"
                      value={exercise.reps}
                      onChange={(e) => updateExerciseDetails(index, 'reps', e.target.value)}
                      placeholder="e.g., 8-12"
                      disabled={savingPlan}
                    />
                  </div>
                  <div>
                    <label>Rest (sec)</label>
                    <input
                      type="number"
                      min="0"
                      value={exercise.rest}
                      onChange={(e) => updateExerciseDetails(index, 'rest', parseInt(e.target.value))}
                      disabled={savingPlan}
                    />
                  </div>
                </ExerciseDetails>
                <TextArea
                  placeholder="Notes (optional)"
                  value={exercise.notes}
                  onChange={(e) => updateExerciseDetails(index, 'notes', e.target.value)}
                  rows={2}
                  disabled={savingPlan}
                />
                <RemoveButton 
                  onClick={() => removeExercise(index)}
                  disabled={savingPlan}
                >
                  Remove
                </RemoveButton>
              </ExerciseItem>
            ))
          )}
        </ExerciseListStyled>
      </WorkoutDayContainer>
      
      {/* Error and Success Messages */}
      {error && <p className="error-message">{error}</p>}
      {success && <p className="success-message">{success}</p>}
    </>
  );
};

export default ExerciseList;
