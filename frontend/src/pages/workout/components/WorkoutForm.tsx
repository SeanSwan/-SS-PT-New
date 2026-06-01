import React from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import {
  EmptyExercises,
  ExerciseActions,
  ExerciseCount,
  ExerciseInfo,
  ExerciseItem,
  ExerciseList,
  ExerciseMeta,
  ExerciseName,
  ExerciseOrder,
  ExerciseType,
  FormContainer,
  FormGroup,
  Input,
  Label,
  MoveButton,
  RemoveButton,
  SectionHeader,
  SelectedExercisesSection
} from './WorkoutForm.styles';

interface WorkoutFormProps {
  session: any;
  onSessionChange: (session: any) => void;
  selectedExercises: any[];
  onMoveExercise: (index: number, direction: 'up' | 'down') => void;
  onRemoveExercise: (exerciseId: string) => void;
  sessionDate: string;
  onDateChange: (date: string) => void;
}

const WorkoutForm: React.FC<WorkoutFormProps> = ({
  session,
  onSessionChange,
  selectedExercises,
  onMoveExercise,
  onRemoveExercise,
  sessionDate,
  onDateChange
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onSessionChange({ ...session, [name]: value });
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
          placeholder="Full Body Workout"
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
          <EmptyExercises>No exercises selected.</EmptyExercises>
        ) : (
          <ExerciseList>
            {selectedExercises.map((exercise, index) => (
              <ExerciseItem key={`${exercise.id}-${index}`}>
                <ExerciseInfo>
                  <ExerciseOrder>{index + 1}</ExerciseOrder>
                  <ExerciseMeta>
                    <ExerciseName>{exercise.name}</ExerciseName>
                    <ExerciseType>{exercise.exerciseType}</ExerciseType>
                  </ExerciseMeta>
                </ExerciseInfo>
                <ExerciseActions>
                  <MoveButton
                    type="button"
                    aria-label={`Move ${exercise.name} up`}
                    title="Move up"
                    disabled={index === 0}
                    onClick={() => onMoveExercise(index, 'up')}
                  >
                    <ArrowUp size={18} aria-hidden="true" />
                  </MoveButton>
                  <MoveButton
                    type="button"
                    aria-label={`Move ${exercise.name} down`}
                    title="Move down"
                    disabled={index === selectedExercises.length - 1}
                    onClick={() => onMoveExercise(index, 'down')}
                  >
                    <ArrowDown size={18} aria-hidden="true" />
                  </MoveButton>
                  <RemoveButton
                    type="button"
                    aria-label={`Remove ${exercise.name}`}
                    title="Remove"
                    onClick={() => onRemoveExercise(exercise.id)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </RemoveButton>
                </ExerciseActions>
              </ExerciseItem>
            ))}
          </ExerciseList>
        )}
      </SelectedExercisesSection>
    </FormContainer>
  );
};

export default WorkoutForm;
