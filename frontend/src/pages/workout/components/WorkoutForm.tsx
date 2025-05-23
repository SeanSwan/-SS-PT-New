import React from 'react';
import styled from 'styled-components';

interface WorkoutFormProps {
  session: any;
  onSessionChange: (session: any) => void;
  selectedExercises: any[];
  onRemoveExercise: (exerciseId: string) => void;
  sessionDate: string;
  onDateChange: (date: string) => void;
}

const WorkoutForm: React.FC<WorkoutFormProps> = ({
  session,
  onSessionChange,
  selectedExercises,
  onRemoveExercise,
  sessionDate,
  onDateChange
}) => {
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onSessionChange({
      ...session,
      [name]: value
    });
  };

  return (
    <FormContainer>
      <FormGroup>
        <Label htmlFor="title">Session Title</Label>
        <Input 
          type="text"
          id="title"
          name="title"
          value={session?.title || ''}
          onChange={handleInputChange}
          placeholder="e.g., Full Body Workout"
        />
      </FormGroup>
      
      <FormGroup>
        <Label htmlFor="date">Date</Label>
        <Input 
          type="date"
          id="date"
          name="date"
          value={sessionDate}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </FormGroup>
      
      <SelectedExercisesSection>
        <SectionHeader>
          <h3>Selected Exercises</h3>
          <ExerciseCount>{selectedExercises.length} exercises</ExerciseCount>
        </SectionHeader>
        
        {selectedExercises.length === 0 ? (
          <EmptyExercises>
            No exercises selected. Use the exercise selector to add exercises.
          </EmptyExercises>
        ) : (
          <ExerciseList>
            {selectedExercises.map((exercise, index) => (
              <ExerciseItem key={`${exercise.id}-${index}`}>
                <ExerciseInfo>
                  <ExerciseOrder>{index + 1}</ExerciseOrder>
                  <div>
                    <ExerciseName>{exercise.name}</ExerciseName>
                    <ExerciseType>{exercise.exerciseType}</ExerciseType>
                  </div>
                </ExerciseInfo>
                <ExerciseActions>
                  <RemoveButton onClick={() => onRemoveExercise(exercise.id)}>
                    Remove
                  </RemoveButton>
                </ExerciseActions>
              </ExerciseItem>
            ))}
          </ExerciseList>
        )}
      </SelectedExercisesSection>
      
      <FormTip>
        Tip: You can drag and drop exercises to reorder them.
      </FormTip>
    </FormContainer>
  );
};

// Styled components
const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 500;
  color: #333;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const SelectedExercisesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 16px;
  }
`;

const ExerciseCount = styled.span`
  color: #6c757d;
  font-size: 14px;
`;

const EmptyExercises = styled.div`
  background-color: white;
  padding: 20px;
  text-align: center;
  color: #6c757d;
  border-radius: 4px;
  border: 1px dashed #ced4da;
`;

const ExerciseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
`;

const ExerciseItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f8f9fa;
  }
`;

const ExerciseInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ExerciseOrder = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #007bff;
  color: white;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
`;

const ExerciseName = styled.div`
  font-weight: 500;
`;

const ExerciseType = styled.div`
  font-size: 12px;
  color: #6c757d;
  text-transform: capitalize;
`;

const ExerciseActions = styled.div`
  display: flex;
  gap: 8px;
`;

const RemoveButton = styled.button`
  padding: 4px 8px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  
  &:hover {
    background-color: #c82333;
  }
`;

const FormTip = styled.div`
  color: #6c757d;
  font-size: 14px;
  font-style: italic;
`;

export default WorkoutForm;