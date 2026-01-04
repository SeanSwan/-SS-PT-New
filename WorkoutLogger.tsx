import React from 'react';
import styled from 'styled-components';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Plus, Save, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import ExerciseSetLogger from './ExerciseSetLogger';

// Zod schema based on backend/routes/workoutSessionRoutes.mjs
const workoutSetSchema = z.object({
  setNumber: z.number().int().positive(),
  weight: z.number().min(0),
  reps: z.number().int().min(0),
  notes: z.string().optional(),
});

const sessionExerciseSchema = z.object({
  id: z.string().min(1, 'Exercise is required'),
  name: z.string(),
  sets: z.array(workoutSetSchema).min(1, 'At least one set is required'),
});

const workoutSessionSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  date: z.string().datetime(),
  duration: z.number().int().min(1, 'Duration must be at least 1 minute'),
  intensity: z.number().int().min(1).max(10),
  exercises: z.array(sessionExerciseSchema).min(1, 'At least one exercise is required'),
  notes: z.string().optional(),
});

type WorkoutSessionForm = z.infer<typeof workoutSessionSchema>;

const WorkoutLogger: React.FC = () => {
  const queryClient = useQueryClient();
  const { control, register, handleSubmit, formState: { errors } } = useForm<WorkoutSessionForm>({
    resolver: zodResolver(workoutSessionSchema),
    defaultValues: {
      date: new Date().toISOString(),
      exercises: [{ id: '', name: '', sets: [{ setNumber: 1, weight: 0, reps: 0, notes: '' }] }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'exercises',
  });

  const mutation = useMutation({
    mutationFn: (data: WorkoutSessionForm) => api.post('/api/workout/sessions', data),
    onSuccess: () => {
      toast.success('Workout logged successfully!');
      queryClient.invalidateQueries({ queryKey: ['workoutSessions'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to log workout.');
    },
  });

  const onSubmit = (data: WorkoutSessionForm) => {
    // Calculate totals before submitting
    const totalSets = data.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    const totalReps = data.exercises.reduce((acc, ex) => acc + ex.sets.reduce((setAcc, s) => setAcc + s.reps, 0), 0);
    const totalWeight = data.exercises.reduce((acc, ex) => acc + ex.sets.reduce((setAcc, s) => setAcc + (s.weight * s.reps), 0), 0);

    const submissionData = {
      ...data,
      totalSets,
      totalReps,
      totalWeight,
    };

    // In a real app, userId would come from auth context
    // For now, let's assume the backend handles it or we add it here.
    // @ts-ignore
    submissionData.userId = 'user-uuid-placeholder';

    mutation.mutate(submissionData as any);
  };

  return (
    <FormContainer onSubmit={handleSubmit(onSubmit)}>
      <FormHeader>
        <Title>Log New Workout</Title>
      </FormHeader>

      <FormGrid>
        <FormGroup>
          <Label>Workout Title</Label>
          <Input {...register('title')} placeholder="e.g., Upper Body Strength" />
          {errors.title && <ErrorMessage>{errors.title.message}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>Date</Label>
          <Input type="datetime-local" {...register('date')} />
          {errors.date && <ErrorMessage>{errors.date.message}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>Duration (minutes)</Label>
          <Input type="number" {...register('duration', { valueAsNumber: true })} placeholder="e.g., 60" />
          {errors.duration && <ErrorMessage>{errors.duration.message}</ErrorMessage>}
        </FormGroup>

        <FormGroup>
          <Label>Intensity (1-10)</Label>
          <Input type="number" {...register('intensity', { valueAsNumber: true })} placeholder="Rate your effort" />
          {errors.intensity && <ErrorMessage>{errors.intensity.message}</ErrorMessage>}
        </FormGroup>
      </FormGrid>

      <Divider />

      {fields.map((field, index) => (
        <ExerciseBlock key={field.id}>
          <ExerciseHeader>
            <ExerciseTitle>Exercise {index + 1}</ExerciseTitle>
            <RemoveButton type="button" onClick={() => remove(index)}>
              <Trash2 size={16} /> Remove
            </RemoveButton>
          </ExerciseHeader>
          
          {/* In a real app, this would be an Autocomplete search */}
          <Input {...register(`exercises.${index}.name`)} placeholder="Exercise Name (e.g., Bench Press)" />
          <input type="hidden" {...register(`exercises.${index}.id`)} value={field.id} />
          {errors.exercises?.[index]?.id && <ErrorMessage>{errors.exercises[index]?.id?.message}</ErrorMessage>}

          <ExerciseSetLogger nestIndex={index} control={control} register={register} errors={errors} />
        </ExerciseBlock>
      ))}

      <AddExerciseButton
        type="button"
        onClick={() => append({ id: '', name: '', sets: [{ setNumber: 1, weight: 0, reps: 0, notes: '' }] })}
      >
        <Plus size={16} /> Add Another Exercise
      </AddExerciseButton>

      <Divider />

      <FormGroup>
        <Label>Workout Notes</Label>
        <TextArea {...register('notes')} placeholder="Any general notes about the session..." />
      </FormGroup>

      <SubmitButton type="submit" disabled={mutation.isPending}>
        <Save size={18} />
        {mutation.isPending ? 'Saving...' : 'Save Workout'}
      </SubmitButton>
    </FormContainer>
  );
};

// Styled Components
const FormContainer = styled.form`
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(10px);
  color: var(--text-primary, #FFFFFF);
  max-width: 900px;
  margin: 2rem auto;
`;

const FormHeader = styled.div`
  margin-bottom: 2rem;
  text-align: center;
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-cyan, #00CED1);
  margin: 0;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary, #B8B8B8);
`;

const Input = styled.input`
  background: var(--dark-bg, #0a0e1a);
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: var(--text-primary, #FFFFFF);
  font-size: 1rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary-cyan, #00CED1);
  }
`;

const TextArea = styled.textarea`
  background: var(--dark-bg, #0a0e1a);
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: var(--text-primary, #FFFFFF);
  font-size: 1rem;
  min-height: 100px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--primary-cyan, #00CED1);
  }
`;

const ErrorMessage = styled.p`
  color: var(--error, #FF4444);
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  margin: 2rem 0;
`;

const ExerciseBlock = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid transparent;
  transition: border-color 0.3s;

  &:focus-within {
    border-color: var(--primary-cyan, #00CED1);
  }
`;

const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ExerciseTitle = styled.h3`
  font-size: 1.25rem;
  color: var(--primary-cyan, #00CED1);
  margin: 0;
`;

const RemoveButton = styled.button`
  background: transparent;
  border: 1px solid var(--error, #FF4444);
  color: var(--error, #FF4444);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 68, 68, 0.1);
  }
`;

const AddExerciseButton = styled.button`
  width: 100%;
  background: transparent;
  border: 2px dashed var(--glass-border, rgba(0, 206, 209, 0.3));
  color: var(--primary-cyan, #00CED1);
  padding: 1rem;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-cyan, #00CED1);
    background-color: rgba(0, 206, 209, 0.1);
  }
`;

const SubmitButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  background: linear-gradient(135deg, var(--primary-cyan, #00CED1), var(--accent-purple, #9D4EDD));
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 1rem;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  margin-top: 1rem;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default WorkoutLogger;