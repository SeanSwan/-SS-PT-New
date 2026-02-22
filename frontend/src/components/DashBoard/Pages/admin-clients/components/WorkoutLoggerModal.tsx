/**
 * WorkoutLoggerModal
 * ==================
 * Admin modal for logging workouts on behalf of a client.
 * Follows CreateClientModal patterns (styled-components, lucide-react, Galaxy-Swan).
 *
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Galaxy-Swan (cosmic dark, cyan accents, glass surfaces)
 * Touch targets: 44px minimum on all interactive elements
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, Plus, Trash2, Dumbbell, Save } from 'lucide-react';
import { createAdminClientService } from '../../../../../services/adminClientService';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';

/* ─────────────────────── Theme Tokens ─────────────────────── */

const SWAN_CYAN = '#00FFFF';
const GALAXY_CORE = '#0a0a1a';

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ─────────────────────── Styled Components ─────────────────────── */

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
`;

const ModalPanel = styled.div`
  background: rgba(29, 31, 43, 0.98);
  border-radius: 12px;
  max-width: 720px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 255, 255, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #252742;
  border-radius: 12px 12px 0 0;
  flex-shrink: 0;
`;

const ModalTitle = styled.h2`
  color: ${SWAN_CYAN};
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: #e2e8f0;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  ${(props) => props.$fullWidth && 'grid-column: 1 / -1;'}
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 600;
  color: #94a3b8;
`;

const Input = styled.input`
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.95rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${SWAN_CYAN};
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const TextArea = styled.textarea`
  padding: 10px 14px;
  min-height: 80px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.95rem;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${SWAN_CYAN};
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 20px 0;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
`;

const AddButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  background: rgba(0, 255, 255, 0.06);
  color: ${SWAN_CYAN};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 255, 255, 0.12);
    border-color: ${SWAN_CYAN};
  }
`;

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 50, 50, 0.08);
  color: #ff6b6b;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 50, 50, 0.2);
  }
`;

const ExerciseCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
`;

const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const SetRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;

  @media (max-width: 640px) {
    grid-template-columns: auto 1fr 1fr auto;
  }
`;

const SetLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  min-width: 24px;
  text-align: center;
`;

const SmallInput = styled(Input)`
  min-height: 40px;
  padding: 6px 10px;
  font-size: 0.9rem;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
`;

const CancelButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  background: linear-gradient(135deg, ${SWAN_CYAN}, #00aadd);
  color: ${GALAXY_CORE};
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 18px rgba(0, 255, 255, 0.35);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(0, 255, 255, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: ${GALAXY_CORE};
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const ErrorText = styled.p`
  color: #ff6b6b;
  font-size: 0.85rem;
  margin: 4px 0 0;
`;

/* ─────────────────────── Types ─────────────────────── */

interface WorkoutSet {
  setNumber: number;
  reps: string;
  weight: string;
}

interface Exercise {
  name: string;
  sets: WorkoutSet[];
}

interface WorkoutLoggerModalProps {
  open: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
  onSuccess?: () => void;
}

/* ─────────────────────── Component ─────────────────────── */

const WorkoutLoggerModal: React.FC<WorkoutLoggerModalProps> = ({
  open,
  onClose,
  clientId,
  clientName,
  onSuccess,
}) => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  const adminClientService = createAdminClientService(authAxios);

  const today = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: '', sets: [{ setNumber: 1, reps: '', weight: '' }] },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!date) newErrors.date = 'Date is required';
    if (date && new Date(date) > new Date()) newErrors.date = 'Date cannot be in the future';

    const dur = Number(duration);
    if (!duration || !Number.isInteger(dur) || dur <= 0) {
      newErrors.duration = 'Duration must be a positive integer';
    }

    const int = Number(intensity);
    if (!intensity || !Number.isInteger(int) || int < 1 || int > 10) {
      newErrors.intensity = 'Intensity must be 1–10';
    }

    if (exercises.length === 0) {
      newErrors.exercises = 'At least one exercise is required';
    }

    exercises.forEach((ex, i) => {
      if (!ex.name.trim()) {
        newErrors[`exercise_${i}_name`] = 'Exercise name is required';
      }
      if (ex.sets.length === 0) {
        newErrors[`exercise_${i}_sets`] = 'At least one set is required';
      }
      ex.sets.forEach((set, j) => {
        const reps = Number(set.reps);
        if (set.reps && (!Number.isInteger(reps) || reps < 0)) {
          newErrors[`exercise_${i}_set_${j}_reps`] = 'Invalid reps';
        }
        const weight = Number(set.weight);
        if (set.weight && !Number.isFinite(weight)) {
          newErrors[`exercise_${i}_set_${j}_weight`] = 'Invalid weight';
        }
      });
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const workoutData = {
        title: title.trim(),
        date,  // Send raw YYYY-MM-DD; backend normalizes date semantics
        duration: Number(duration),
        intensity: Number(intensity),
        notes: notes.trim() || undefined,
        exercises: exercises.map((ex) => ({
          name: ex.name.trim(),
          sets: ex.sets.map((set) => ({
            setNumber: set.setNumber,
            reps: set.reps ? Number(set.reps) : 0,
            weight: set.weight ? Number(set.weight) : 0,
          })),
        })),
      };

      const response = await adminClientService.logWorkout(clientId, workoutData);

      if (response.success) {
        // XP toast if available
        if (response.xp) {
          toast({
            title: 'Workout Logged + XP Awarded',
            description: `Awarded ${response.xp.pointsAwarded} XP! Streak: ${response.xp.streakDays} days`,
            variant: 'success',
          });
        } else {
          toast({
            title: 'Workout Logged',
            description: `${clientName}'s workout recorded successfully.`,
            variant: 'success',
          });
        }
        onSuccess?.();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to log workout',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to log workout',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: [{ setNumber: 1, reps: '', weight: '' }] }]);
  };

  const removeExercise = (index: number) => {
    if (exercises.length <= 1) return;
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExerciseName = (index: number, name: string) => {
    const updated = [...exercises];
    updated[index] = { ...updated[index], name };
    setExercises(updated);
  };

  const addSet = (exerciseIndex: number) => {
    const updated = [...exercises];
    const ex = updated[exerciseIndex];
    ex.sets = [...ex.sets, { setNumber: ex.sets.length + 1, reps: '', weight: '' }];
    setExercises(updated);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updated = [...exercises];
    const ex = updated[exerciseIndex];
    if (ex.sets.length <= 1) return;
    ex.sets = ex.sets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, setNumber: i + 1 }));
    setExercises(updated);
  };

  const updateSet = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => {
    const updated = [...exercises];
    updated[exerciseIndex].sets[setIndex] = {
      ...updated[exerciseIndex].sets[setIndex],
      [field]: value,
    };
    setExercises(updated);
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalPanel
        data-testid="workout-logger-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader>
          <ModalTitle>
            <Dumbbell size={20} />
            Log Workout — {clientName}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close" data-testid="workout-close-btn">
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          <FormGrid>
            <FormGroup $fullWidth>
              <Label htmlFor="workout-title">Title *</Label>
              <Input
                id="workout-title"
                data-testid="workout-title"
                placeholder="e.g., Upper Body Strength"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {errors.title && <ErrorText>{errors.title}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="workout-date">Date *</Label>
              <Input
                id="workout-date"
                data-testid="workout-date"
                type="date"
                max={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              {errors.date && <ErrorText>{errors.date}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="workout-duration">Duration (minutes) *</Label>
              <Input
                id="workout-duration"
                data-testid="workout-duration"
                type="number"
                min="1"
                placeholder="60"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
              {errors.duration && <ErrorText>{errors.duration}</ErrorText>}
            </FormGroup>

            <FormGroup>
              <Label htmlFor="workout-intensity">Intensity (1–10) *</Label>
              <Input
                id="workout-intensity"
                data-testid="workout-intensity"
                type="number"
                min="1"
                max="10"
                placeholder="7"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
              />
              {errors.intensity && <ErrorText>{errors.intensity}</ErrorText>}
            </FormGroup>

            <FormGroup $fullWidth>
              <Label htmlFor="workout-notes">Notes (optional)</Label>
              <TextArea
                id="workout-notes"
                data-testid="workout-notes"
                placeholder="Session notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </FormGroup>
          </FormGrid>

          <Divider />

          <SectionHeader>
            <SectionTitle>Exercises</SectionTitle>
            <AddButton onClick={addExercise} data-testid="add-exercise-btn">
              <Plus size={16} />
              Add Exercise
            </AddButton>
          </SectionHeader>

          {errors.exercises && <ErrorText style={{ marginBottom: 12 }}>{errors.exercises}</ErrorText>}

          {exercises.map((exercise, exIndex) => (
            <ExerciseCard key={exIndex} data-testid={`exercise-card-${exIndex}`}>
              <ExerciseHeader>
                <FormGroup style={{ flex: 1, marginRight: 8 }}>
                  <Label>Exercise Name *</Label>
                  <Input
                    data-testid={`exercise-name-${exIndex}`}
                    placeholder="e.g., Bench Press"
                    value={exercise.name}
                    onChange={(e) => updateExerciseName(exIndex, e.target.value)}
                  />
                  {errors[`exercise_${exIndex}_name`] && (
                    <ErrorText>{errors[`exercise_${exIndex}_name`]}</ErrorText>
                  )}
                </FormGroup>
                {exercises.length > 1 && (
                  <RemoveButton
                    onClick={() => removeExercise(exIndex)}
                    data-testid={`remove-exercise-${exIndex}`}
                    title="Remove exercise"
                  >
                    <Trash2 size={16} />
                  </RemoveButton>
                )}
              </ExerciseHeader>

              {exercise.sets.map((set, setIndex) => (
                <SetRow key={setIndex}>
                  <SetLabel>#{set.setNumber}</SetLabel>
                  <SmallInput
                    data-testid={`set-reps-${exIndex}-${setIndex}`}
                    type="number"
                    min="0"
                    placeholder="Reps"
                    value={set.reps}
                    onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                  />
                  <SmallInput
                    data-testid={`set-weight-${exIndex}-${setIndex}`}
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Weight (lbs)"
                    value={set.weight}
                    onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                  />
                  {exercise.sets.length > 1 ? (
                    <RemoveButton
                      onClick={() => removeSet(exIndex, setIndex)}
                      data-testid={`remove-set-${exIndex}-${setIndex}`}
                      title="Remove set"
                    >
                      <Trash2 size={14} />
                    </RemoveButton>
                  ) : (
                    <div style={{ minWidth: 44 }} />
                  )}
                </SetRow>
              ))}

              <AddButton
                onClick={() => addSet(exIndex)}
                data-testid={`add-set-${exIndex}`}
                style={{ marginTop: 8 }}
              >
                <Plus size={14} />
                Add Set
              </AddButton>
            </ExerciseCard>
          ))}
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={onClose}>
            <X size={16} />
            Cancel
          </CancelButton>
          <SubmitButton
            onClick={handleSubmit}
            disabled={submitting}
            data-testid="workout-submit-btn"
          >
            {submitting ? <Spinner /> : <Save size={16} />}
            {submitting ? 'Saving...' : 'Log Workout'}
          </SubmitButton>
        </ModalFooter>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default WorkoutLoggerModal;
