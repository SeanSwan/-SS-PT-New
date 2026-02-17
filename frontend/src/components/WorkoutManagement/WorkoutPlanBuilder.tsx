import React, { useState, useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  Plus,
  Trash2,
  ChevronDown,
  Save,
  Sparkles,
  User,
  Dumbbell,
  Clock,
  Flag,
  X
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import {
  useWorkoutMcp,
  WorkoutPlan,
  WorkoutPlanDay,
  WorkoutPlanDayExercise,
  Exercise
} from '../../hooks/useWorkoutMcp';
import ExerciseLibrary from './ExerciseLibrary';

/* ------------------------------------------------------------------ */
/*  Galaxy-Swan Design Tokens                                          */
/* ------------------------------------------------------------------ */
const TOKENS = {
  bg: 'rgba(15,23,42,0.95)',
  bgSolid: '#0f172a',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.45)',
  text: '#e2e8f0',
  muted: '#94a3b8',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  danger: '#ef4444',
  dangerHover: '#f87171',
  surface: 'rgba(15,23,42,0.7)',
  glass: 'rgba(15,23,42,0.55)',
  radius: '12px',
  radiusSm: '8px',
  shadow: '0 4px 24px rgba(0,0,0,0.35)',
  minTouch: '44px',
} as const;

/* ------------------------------------------------------------------ */
/*  Styled Primitives                                                  */
/* ------------------------------------------------------------------ */

/* ---------- Layout ---------- */
const PageWrapper = styled.div`
  color: ${TOKENS.text};
`;

const FormGrid = styled.div<{ $cols?: string }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || '1fr'};
  gap: 20px;

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
`;

const FlexRow = styled.div<{ $justify?: string; $align?: string; $gap?: string; $wrap?: string }>`
  display: flex;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'center'};
  gap: ${({ $gap }) => $gap || '0'};
  flex-wrap: ${({ $wrap }) => $wrap || 'nowrap'};
`;

/* ---------- Typography ---------- */
const PageTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 24px 0;
  color: ${TOKENS.text};
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: ${TOKENS.text};
`;

const SubTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: ${TOKENS.text};
`;

const BodyText = styled.p<{ $muted?: boolean }>`
  font-size: 0.938rem;
  margin: 0 0 12px 0;
  color: ${({ $muted }) => ($muted ? TOKENS.muted : TOKENS.text)};
  line-height: 1.55;
`;

const SmallText = styled.span<{ $muted?: boolean }>`
  font-size: 0.813rem;
  color: ${({ $muted }) => ($muted ? TOKENS.muted : TOKENS.text)};
`;

/* ---------- Surface / Cards ---------- */
const Surface = styled.div`
  background: ${TOKENS.bg};
  border: 1px solid ${TOKENS.border};
  border-radius: ${TOKENS.radius};
  padding: 24px;
  backdrop-filter: blur(12px);
  box-shadow: ${TOKENS.shadow};
`;

const CardPanel = styled.div`
  background: ${TOKENS.glass};
  border: 1px solid ${TOKENS.border};
  border-radius: ${TOKENS.radius};
  padding: 20px;
  backdrop-filter: blur(12px);
  margin-bottom: 16px;
`;

/* ---------- Form Controls ---------- */
const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 0.813rem;
  font-weight: 500;
  color: ${TOKENS.muted};
`;

const inputStyles = css`
  width: 100%;
  min-height: ${TOKENS.minTouch};
  padding: 10px 14px;
  font-size: 0.938rem;
  color: ${TOKENS.text};
  background: ${TOKENS.surface};
  border: 1px solid ${TOKENS.border};
  border-radius: ${TOKENS.radiusSm};
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: ${TOKENS.accent};
    box-shadow: 0 0 0 2px rgba(14,165,233,0.15);
  }

  &::placeholder {
    color: ${TOKENS.muted};
  }
`;

const StyledInput = styled.input`
  ${inputStyles}
`;

const StyledTextarea = styled.textarea`
  ${inputStyles}
  resize: vertical;
  min-height: 80px;
`;

const NativeSelect = styled.select`
  ${inputStyles}
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2394a3b8'%3E%3Cpath d='M4.5 6l3.5 4 3.5-4z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
`;

/* ---------- Buttons ---------- */
const PrimaryButton = styled.button<{ $fullWidth?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: ${TOKENS.minTouch};
  padding: 10px 24px;
  font-size: 0.938rem;
  font-weight: 600;
  color: #fff;
  background: ${TOKENS.accent};
  border: none;
  border-radius: ${TOKENS.radiusSm};
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};

  &:hover:not(:disabled) {
    background: ${TOKENS.accentHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const OutlineButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: ${TOKENS.minTouch};
  padding: 10px 20px;
  font-size: 0.938rem;
  font-weight: 600;
  color: ${TOKENS.accent};
  background: transparent;
  border: 1px solid ${TOKENS.accent};
  border-radius: ${TOKENS.radiusSm};
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover:not(:disabled) {
    background: rgba(14,165,233,0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: ${TOKENS.minTouch};
  padding: 10px 16px;
  font-size: 0.938rem;
  font-weight: 500;
  color: ${TOKENS.muted};
  background: transparent;
  border: none;
  border-radius: ${TOKENS.radiusSm};
  cursor: pointer;
  transition: color 0.2s, background 0.2s;

  &:hover:not(:disabled) {
    color: ${TOKENS.text};
    background: rgba(148,163,184,0.08);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RoundIconButton = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: ${TOKENS.minTouch};
  min-height: ${TOKENS.minTouch};
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${({ $danger }) => ($danger ? TOKENS.danger : TOKENS.muted)};
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: ${({ $danger }) =>
      $danger ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.12)'};
    color: ${({ $danger }) => ($danger ? TOKENS.dangerHover : TOKENS.text)};
  }
`;

/* ---------- Stepper ---------- */
const StepperRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 28px;
  overflow-x: auto;
  padding-bottom: 4px;
`;

const StepCircle = styled.div<{ $active?: boolean; $completed?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 0.875rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: all 0.25s;

  ${({ $active, $completed }) => {
    if ($active) {
      return css`
        background: ${TOKENS.accent};
        color: #fff;
        box-shadow: 0 0 12px rgba(14,165,233,0.4);
      `;
    }
    if ($completed) {
      return css`
        background: rgba(14,165,233,0.25);
        color: ${TOKENS.accent};
      `;
    }
    return css`
      background: rgba(148,163,184,0.15);
      color: ${TOKENS.muted};
    `;
  }}
`;

const StepConnector = styled.div<{ $completed?: boolean }>`
  flex: 1;
  height: 2px;
  min-width: 32px;
  background: ${({ $completed }) =>
    $completed ? TOKENS.accent : 'rgba(148,163,184,0.2)'};
  transition: background 0.25s;
`;

const StepLabelText = styled.span<{ $active?: boolean }>`
  font-size: 0.75rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  color: ${({ $active }) => ($active ? TOKENS.text : TOKENS.muted)};
  margin-left: 8px;
  white-space: nowrap;
`;

const StepItem = styled.div`
  display: flex;
  align-items: center;
`;

/* ---------- Alert ---------- */
const AlertBox = styled.div<{ $severity?: 'error' | 'warning' | 'info' | 'success' }>`
  padding: 14px 18px;
  border-radius: ${TOKENS.radiusSm};
  margin-bottom: 16px;
  font-size: 0.938rem;
  line-height: 1.5;
  border-left: 4px solid;

  ${({ $severity }) => {
    switch ($severity) {
      case 'error':
        return css`
          background: rgba(239,68,68,0.08);
          border-left-color: ${TOKENS.danger};
          color: #fca5a5;
        `;
      case 'warning':
        return css`
          background: rgba(234,179,8,0.08);
          border-left-color: #eab308;
          color: #fde047;
        `;
      case 'success':
        return css`
          background: rgba(34,197,94,0.08);
          border-left-color: #22c55e;
          color: #86efac;
        `;
      default:
        return css`
          background: rgba(14,165,233,0.08);
          border-left-color: ${TOKENS.accent};
          color: ${TOKENS.text};
        `;
    }
  }}
`;

/* ---------- Collapsible (Accordion replacement) ---------- */
const CollapsibleWrapper = styled.div`
  border: 1px solid ${TOKENS.border};
  border-radius: ${TOKENS.radiusSm};
  margin-bottom: 8px;
  overflow: hidden;
  background: ${TOKENS.glass};
  backdrop-filter: blur(12px);
`;

const CollapsibleHeader = styled.button<{ $open?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: ${TOKENS.minTouch};
  padding: 12px 16px;
  font-size: 1rem;
  font-weight: 600;
  color: ${TOKENS.text};
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;

  & > svg:last-child {
    transition: transform 0.25s;
    transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0)')};
    flex-shrink: 0;
  }
`;

const CollapsibleBody = styled.div<{ $open?: boolean }>`
  display: ${({ $open }) => ($open ? 'block' : 'none')};
  padding: 0 16px 16px;
`;

/* ---------- Chip ---------- */
const ChipTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  font-size: 0.813rem;
  font-weight: 500;
  color: ${TOKENS.accent};
  background: rgba(14,165,233,0.1);
  border: 1px solid ${TOKENS.border};
  border-radius: 999px;
  white-space: nowrap;
`;

const ChipRemoveBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  color: ${TOKENS.muted};
  cursor: pointer;
  line-height: 1;

  &:hover {
    color: ${TOKENS.danger};
  }
`;

/* ---------- Table ---------- */
const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const StyledThead = styled.thead`
  background: rgba(14,165,233,0.06);
`;

const StyledTh = styled.th`
  text-align: left;
  padding: 10px 14px;
  font-size: 0.813rem;
  font-weight: 600;
  color: ${TOKENS.muted};
  border-bottom: 1px solid ${TOKENS.border};
  white-space: nowrap;
`;

const StyledTd = styled.td`
  padding: 8px 14px;
  font-size: 0.875rem;
  color: ${TOKENS.text};
  border-bottom: 1px solid rgba(148,163,184,0.08);
  vertical-align: middle;
`;

const CompactInput = styled.input`
  width: 100%;
  min-height: 36px;
  padding: 6px 10px;
  font-size: 0.875rem;
  color: ${TOKENS.text};
  background: ${TOKENS.surface};
  border: 1px solid ${TOKENS.border};
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: ${TOKENS.accent};
  }
`;

/* ---------- Divider ---------- */
const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${TOKENS.border};
  margin: 24px 0;
`;

/* ---------- List ---------- */
const ListUl = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ListLi = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(148,163,184,0.08);

  &:last-child {
    border-bottom: none;
  }
`;

const ListItemContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

/* ---------- Modal (Dialog replacement) ---------- */
const ModalOverlay = styled.div<{ $open?: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1000;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
`;

const ModalPanel = styled.div`
  width: 90vw;
  max-width: 960px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: ${TOKENS.bgSolid};
  border: 1px solid ${TOKENS.border};
  border-radius: ${TOKENS.radius};
  box-shadow: ${TOKENS.shadow};
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid ${TOKENS.border};
  font-size: 1.125rem;
  font-weight: 600;
  color: ${TOKENS.text};
`;

const ModalContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${TOKENS.border};
`;

/* ---------- Stat Card for Review ---------- */
const StatCard = styled.div`
  text-align: center;
  padding: 16px;
`;

const StatIcon = styled.div`
  color: ${TOKENS.accent};
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
`;

/* ---------- Multi-Select Chip Picker ---------- */
const ChipPickerWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ChipSelectedRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 10px;
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface WorkoutPlanBuilderProps {
  clientId?: string;
  onPlanCreated?: (plan: WorkoutPlan) => void;
  existingPlan?: WorkoutPlan;
  mode?: 'create' | 'edit';
}

const WorkoutPlanBuilder: React.FC<WorkoutPlanBuilderProps> = ({
  clientId,
  onPlanCreated,
  existingPlan,
  mode = 'create'
}) => {
  const { generateWorkoutPlan, loading, error } = useWorkoutMcp();
  const [activeStep, setActiveStep] = useState(0);
  const [plan, setPlan] = useState<WorkoutPlan>({
    name: '',
    description: '',
    trainerId: '', // Will be set from user context
    clientId: clientId || '',
    goal: 'general',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 8 weeks from now
    status: 'active',
    days: []
  });

  const [workoutDays, setWorkoutDays] = useState<WorkoutPlanDay[]>([]);
  const [currentDay, setCurrentDay] = useState<WorkoutPlanDay | null>(null);
  const [exerciseLibraryOpen, setExerciseLibraryOpen] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [generationParams, setGenerationParams] = useState({
    daysPerWeek: 3,
    focusAreas: [] as string[],
    difficulty: 'intermediate',
    equipment: [] as string[]
  });

  // Accordion open state tracking
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Mock clients for demo
  const mockClients = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com' }
  ];

  const steps = [
    'Plan Details',
    'Training Schedule',
    'Exercise Selection',
    'Review & Save'
  ];

  const muscleGroups = [
    'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes', 'Calves'
  ];

  const equipmentOptions = [
    'Bodyweight', 'Dumbbells', 'Barbell', 'Machines', 'Resistance Bands',
    'Kettlebells', 'Medicine Ball', 'Cable Machine'
  ];

  const difficulties = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  const goals = [
    { value: 'general', label: 'General Fitness' },
    { value: 'strength', label: 'Strength Building' },
    { value: 'hypertrophy', label: 'Muscle Building' },
    { value: 'endurance', label: 'Endurance' },
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'rehabilitation', label: 'Rehabilitation' }
  ];

  // Initialize with existing plan if in edit mode
  useEffect(() => {
    if (existingPlan && mode === 'edit') {
      setPlan(existingPlan);
      setWorkoutDays(existingPlan.days || []);
    }
  }, [existingPlan, mode]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handlePlanDetailChange = (field: keyof WorkoutPlan, value: any) => {
    setPlan(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateWorkout = async () => {
    try {
      const response = await generateWorkoutPlan({
        trainerId: 'current-trainer', // Should come from auth context
        clientId: plan.clientId,
        name: plan.name,
        description: plan.description,
        goal: plan.goal,
        startDate: plan.startDate,
        endDate: plan.endDate,
        daysPerWeek: generationParams.daysPerWeek,
        focusAreas: generationParams.focusAreas,
        difficulty: generationParams.difficulty,
        equipment: generationParams.equipment
      });

      if (response?.plan) {
        setPlan(response.plan);
        setWorkoutDays(response.plan.days || []);
        setActiveStep(2); // Move to exercise selection step
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
      exercises: []
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
    // Renumber the days
    const renumberedDays = newDays.map((day, index) => ({
      ...day,
      dayNumber: index + 1,
      sortOrder: index + 1
    }));
    setWorkoutDays(renumberedDays);
  };

  const addExerciseToDay = (dayIndex: number, exercise: Exercise) => {
    const newDays = [...workoutDays];
    const exerciseToAdd: WorkoutPlanDayExercise = {
      exerciseId: exercise.id,
      orderInWorkout: (newDays[dayIndex].exercises?.length || 0) + 1,
      setScheme: '3x10',
      repGoal: '10',
      restPeriod: 60,
      notes: exercise.description
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
    // Renumber exercises
    if (newDays[dayIndex].exercises) {
      newDays[dayIndex].exercises = newDays[dayIndex].exercises!.map((ex, idx) => ({
        ...ex,
        orderInWorkout: idx + 1
      }));
    }
    setWorkoutDays(newDays);
  };

  const savePlan = async () => {
    const finalPlan = {
      ...plan,
      days: workoutDays
    };

    // In a real implementation, this would save to the backend
    console.log('Saving workout plan:', finalPlan);

    if (onPlanCreated) {
      onPlanCreated(finalPlan);
    }

    // Reset form
    setPlan({
      name: '',
      description: '',
      trainerId: '',
      clientId: clientId || '',
      goal: 'general',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 8 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      days: []
    });
    setWorkoutDays([]);
    setActiveStep(0);
  };

  /* ---- Multi-select chip picker helper ---- */
  const MultiChipPicker: React.FC<{
    label: string;
    options: string[];
    selected: string[];
    onChange: (next: string[]) => void;
  }> = ({ label, options, selected, onChange }) => {
    const available = options.filter(o => !selected.includes(o));
    return (
      <ChipPickerWrap>
        <FieldLabel>{label}</FieldLabel>
        <ChipSelectedRow>
          {selected.map(item => (
            <ChipTag key={item}>
              {item}
              <ChipRemoveBtn
                type="button"
                onClick={() => onChange(selected.filter(s => s !== item))}
                aria-label={`Remove ${item}`}
              >
                <X size={12} />
              </ChipRemoveBtn>
            </ChipTag>
          ))}
        </ChipSelectedRow>
        {available.length > 0 && (
          <NativeSelect
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onChange([...selected, e.target.value]);
                e.target.value = '';
              }
            }}
          >
            <option value="">Add {label.toLowerCase()}...</option>
            {available.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </NativeSelect>
        )}
      </ChipPickerWrap>
    );
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div style={{ marginTop: 16 }}>
            <FormGrid $cols="1fr 1fr">
              <FieldGroup>
                <FieldLabel htmlFor="plan-name">Plan Name</FieldLabel>
                <StyledInput
                  id="plan-name"
                  type="text"
                  value={plan.name}
                  onChange={(e) => handlePlanDetailChange('name', e.target.value)}
                  placeholder="Enter plan name"
                  required
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="plan-goal">Goal</FieldLabel>
                <NativeSelect
                  id="plan-goal"
                  value={plan.goal}
                  onChange={(e) => handlePlanDetailChange('goal', e.target.value)}
                >
                  {goals.map((goal) => (
                    <option key={goal.value} value={goal.value}>
                      {goal.label}
                    </option>
                  ))}
                </NativeSelect>
              </FieldGroup>
            </FormGrid>

            <div style={{ marginTop: 20 }}>
              <FieldGroup>
                <FieldLabel htmlFor="plan-description">Description</FieldLabel>
                <StyledTextarea
                  id="plan-description"
                  value={plan.description}
                  onChange={(e) => handlePlanDetailChange('description', e.target.value)}
                  placeholder="Describe the workout plan"
                  rows={3}
                />
              </FieldGroup>
            </div>

            <FormGrid $cols="1fr 1fr" style={{ marginTop: 20 }}>
              <FieldGroup>
                <FieldLabel htmlFor="plan-start-date">Start Date</FieldLabel>
                <StyledInput
                  id="plan-start-date"
                  type="date"
                  value={plan.startDate || ''}
                  onChange={(e) => handlePlanDetailChange('startDate', e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel htmlFor="plan-end-date">End Date</FieldLabel>
                <StyledInput
                  id="plan-end-date"
                  type="date"
                  value={plan.endDate || ''}
                  onChange={(e) => handlePlanDetailChange('endDate', e.target.value)}
                />
              </FieldGroup>
            </FormGrid>

            {!clientId && (
              <div style={{ marginTop: 20 }}>
                <FieldGroup>
                  <FieldLabel htmlFor="plan-client">Assign to Client</FieldLabel>
                  <NativeSelect
                    id="plan-client"
                    value={plan.clientId}
                    onChange={(e) => handlePlanDetailChange('clientId', e.target.value)}
                  >
                    <option value="">Select a client...</option>
                    {mockClients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </NativeSelect>
                </FieldGroup>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div style={{ marginTop: 16 }}>
            <SectionTitle>Training Schedule Setup</SectionTitle>

            {/* Auto-Generation Options */}
            <CardPanel>
              <SectionTitle>Auto-Generate Workout Plan</SectionTitle>
              <FormGrid $cols="1fr 1fr 1fr 1fr">
                <FieldGroup>
                  <FieldLabel htmlFor="gen-days">Days per Week</FieldLabel>
                  <NativeSelect
                    id="gen-days"
                    value={generationParams.daysPerWeek}
                    onChange={(e) => setGenerationParams({
                      ...generationParams,
                      daysPerWeek: Number(e.target.value)
                    })}
                  >
                    <option value={1}>1 Day</option>
                    <option value={2}>2 Days</option>
                    <option value={3}>3 Days</option>
                    <option value={4}>4 Days</option>
                    <option value={5}>5 Days</option>
                    <option value={6}>6 Days</option>
                    <option value={7}>7 Days</option>
                  </NativeSelect>
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="gen-difficulty">Difficulty</FieldLabel>
                  <NativeSelect
                    id="gen-difficulty"
                    value={generationParams.difficulty}
                    onChange={(e) => setGenerationParams({
                      ...generationParams,
                      difficulty: e.target.value
                    })}
                  >
                    {difficulties.map((diff) => (
                      <option key={diff.value} value={diff.value}>
                        {diff.label}
                      </option>
                    ))}
                  </NativeSelect>
                </FieldGroup>
                <MultiChipPicker
                  label="Focus Areas"
                  options={muscleGroups}
                  selected={generationParams.focusAreas}
                  onChange={(value) => setGenerationParams({
                    ...generationParams,
                    focusAreas: value
                  })}
                />
                <MultiChipPicker
                  label="Available Equipment"
                  options={equipmentOptions}
                  selected={generationParams.equipment}
                  onChange={(value) => setGenerationParams({
                    ...generationParams,
                    equipment: value
                  })}
                />
              </FormGrid>
              <div style={{ marginTop: 16 }}>
                <PrimaryButton
                  $fullWidth
                  onClick={handleGenerateWorkout}
                  disabled={loading}
                >
                  <Sparkles size={18} />
                  Generate Workout Plan
                </PrimaryButton>
              </div>
            </CardPanel>

            <Divider />

            {/* Manual Day Creation */}
            <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 16 }}>
              <SectionTitle style={{ marginBottom: 0 }}>
                Workout Days ({workoutDays.length})
              </SectionTitle>
              <OutlineButton onClick={addWorkoutDay}>
                <Plus size={18} />
                Add Day
              </OutlineButton>
            </FlexRow>

            {workoutDays.map((day, index) => (
              <CardPanel key={index}>
                <FlexRow $justify="space-between" $align="center">
                  <SubTitle style={{ marginBottom: 0 }}>{day.name}</SubTitle>
                  <FlexRow $gap="4px">
                    <RoundIconButton
                      type="button"
                      onClick={() => {
                        setCurrentDay(day);
                        setExerciseLibraryOpen(true);
                      }}
                      aria-label="Add exercise"
                    >
                      <Dumbbell size={18} />
                    </RoundIconButton>
                    <RoundIconButton
                      $danger
                      type="button"
                      onClick={() => deleteWorkoutDay(index)}
                      aria-label="Delete day"
                    >
                      <Trash2 size={18} />
                    </RoundIconButton>
                  </FlexRow>
                </FlexRow>

                <FormGrid $cols="1fr 1fr 1fr" style={{ marginTop: 12 }}>
                  <FieldGroup>
                    <FieldLabel>Day Name</FieldLabel>
                    <StyledInput
                      type="text"
                      value={day.name}
                      onChange={(e) => {
                        const updatedDay = { ...day, name: e.target.value };
                        updateWorkoutDay(index, updatedDay);
                      }}
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Focus</FieldLabel>
                    <NativeSelect
                      value={day.focus || 'full_body'}
                      onChange={(e) => {
                        const updatedDay = { ...day, focus: e.target.value };
                        updateWorkoutDay(index, updatedDay);
                      }}
                    >
                      <option value="full_body">Full Body</option>
                      <option value="upper_body">Upper Body</option>
                      <option value="lower_body">Lower Body</option>
                      <option value="push">Push</option>
                      <option value="pull">Pull</option>
                      <option value="legs">Legs</option>
                      <option value="cardio">Cardio</option>
                      <option value="core">Core</option>
                    </NativeSelect>
                  </FieldGroup>
                  <FieldGroup>
                    <FieldLabel>Estimated Duration (min)</FieldLabel>
                    <StyledInput
                      type="number"
                      value={day.estimatedDuration || ''}
                      onChange={(e) => {
                        const updatedDay = {
                          ...day,
                          estimatedDuration: Number(e.target.value)
                        };
                        updateWorkoutDay(index, updatedDay);
                      }}
                    />
                  </FieldGroup>
                </FormGrid>

                {day.exercises && day.exercises.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <SmallText style={{ fontWeight: 600, display: 'block', marginBottom: 8 }}>
                      Exercises ({day.exercises.length})
                    </SmallText>
                    <ListUl>
                      {day.exercises.map((exercise, exIndex) => (
                        <ListLi key={exIndex}>
                          <ListItemContent>
                            <SmallText>{`Exercise ${exercise.orderInWorkout}`}</SmallText>
                            <SmallText $muted>{`${exercise.setScheme} - ${exercise.repGoal} reps`}</SmallText>
                          </ListItemContent>
                          <RoundIconButton
                            $danger
                            type="button"
                            onClick={() => removeExerciseFromDay(index, exIndex)}
                            aria-label="Remove exercise"
                          >
                            <Trash2 size={16} />
                          </RoundIconButton>
                        </ListLi>
                      ))}
                    </ListUl>
                  </div>
                )}
              </CardPanel>
            ))}
          </div>
        );

      case 2:
        return (
          <div style={{ marginTop: 16 }}>
            <SectionTitle>Exercise Selection &amp; Customization</SectionTitle>

            {workoutDays.map((day, dayIndex) => {
              const accKey = `exercise-${dayIndex}`;
              const isOpen = !!openAccordions[accKey];
              return (
                <CollapsibleWrapper key={dayIndex}>
                  <CollapsibleHeader
                    $open={isOpen}
                    onClick={() => toggleAccordion(accKey)}
                    type="button"
                  >
                    <span>{day.name} - {day.exercises?.length || 0} exercises</span>
                    <ChevronDown size={18} />
                  </CollapsibleHeader>
                  <CollapsibleBody $open={isOpen}>
                    <OutlineButton
                      onClick={() => {
                        setCurrentDay(day);
                        setExerciseLibraryOpen(true);
                      }}
                      style={{ marginBottom: 16 }}
                    >
                      <Plus size={18} />
                      Add Exercise
                    </OutlineButton>

                    {day.exercises && day.exercises.length > 0 && (
                      <div style={{ overflowX: 'auto' }}>
                        <StyledTable>
                          <StyledThead>
                            <tr>
                              <StyledTh>Order</StyledTh>
                              <StyledTh>Exercise</StyledTh>
                              <StyledTh>Sets x Reps</StyledTh>
                              <StyledTh>Rest (sec)</StyledTh>
                              <StyledTh>Notes</StyledTh>
                              <StyledTh>Actions</StyledTh>
                            </tr>
                          </StyledThead>
                          <tbody>
                            {day.exercises.map((exercise, exIndex) => (
                              <tr key={exIndex}>
                                <StyledTd>{exercise.orderInWorkout}</StyledTd>
                                <StyledTd>{exercise.exerciseId}</StyledTd>
                                <StyledTd>
                                  <CompactInput
                                    type="text"
                                    value={exercise.setScheme || ''}
                                    onChange={(e) => {
                                      const newDays = [...workoutDays];
                                      newDays[dayIndex].exercises![exIndex].setScheme = e.target.value;
                                      setWorkoutDays(newDays);
                                    }}
                                  />
                                </StyledTd>
                                <StyledTd>
                                  <CompactInput
                                    type="number"
                                    value={exercise.restPeriod || ''}
                                    onChange={(e) => {
                                      const newDays = [...workoutDays];
                                      newDays[dayIndex].exercises![exIndex].restPeriod = Number(e.target.value);
                                      setWorkoutDays(newDays);
                                    }}
                                  />
                                </StyledTd>
                                <StyledTd>
                                  <CompactInput
                                    type="text"
                                    value={exercise.notes || ''}
                                    onChange={(e) => {
                                      const newDays = [...workoutDays];
                                      newDays[dayIndex].exercises![exIndex].notes = e.target.value;
                                      setWorkoutDays(newDays);
                                    }}
                                  />
                                </StyledTd>
                                <StyledTd>
                                  <RoundIconButton
                                    $danger
                                    type="button"
                                    onClick={() => removeExerciseFromDay(dayIndex, exIndex)}
                                    aria-label="Remove exercise"
                                  >
                                    <Trash2 size={16} />
                                  </RoundIconButton>
                                </StyledTd>
                              </tr>
                            ))}
                          </tbody>
                        </StyledTable>
                      </div>
                    )}
                  </CollapsibleBody>
                </CollapsibleWrapper>
              );
            })}
          </div>
        );

      case 3:
        return (
          <div style={{ marginTop: 16 }}>
            <SectionTitle>Review &amp; Save Plan</SectionTitle>

            <CardPanel>
              <PageTitle style={{ fontSize: '1.5rem' }}>{plan.name}</PageTitle>
              <BodyText $muted>{plan.description}</BodyText>

              <FormGrid $cols="1fr 1fr 1fr 1fr">
                <StatCard>
                  <StatIcon><Flag size={36} /></StatIcon>
                  <SubTitle>Goal</SubTitle>
                  <SmallText $muted>
                    {goals.find(g => g.value === plan.goal)?.label}
                  </SmallText>
                </StatCard>
                <StatCard>
                  <StatIcon><Clock size={36} /></StatIcon>
                  <SubTitle>Duration</SubTitle>
                  <SmallText $muted>
                    {Math.ceil((new Date(plan.endDate!).getTime() - new Date(plan.startDate!).getTime()) / (1000 * 60 * 60 * 24 * 7))} weeks
                  </SmallText>
                </StatCard>
                <StatCard>
                  <StatIcon><Dumbbell size={36} /></StatIcon>
                  <SubTitle>Days per Week</SubTitle>
                  <SmallText $muted>
                    {workoutDays.length} days
                  </SmallText>
                </StatCard>
                <StatCard>
                  <StatIcon><User size={36} /></StatIcon>
                  <SubTitle>Client</SubTitle>
                  <SmallText $muted>
                    {mockClients.find(c => c.id === plan.clientId)?.name || 'Not assigned'}
                  </SmallText>
                </StatCard>
              </FormGrid>
            </CardPanel>

            {workoutDays.map((day, index) => {
              const accKey = `review-${index}`;
              const isOpen = !!openAccordions[accKey];
              return (
                <CollapsibleWrapper key={index}>
                  <CollapsibleHeader
                    $open={isOpen}
                    onClick={() => toggleAccordion(accKey)}
                    type="button"
                  >
                    <span>{day.name} - {day.exercises?.length || 0} exercises</span>
                    <ChevronDown size={18} />
                  </CollapsibleHeader>
                  <CollapsibleBody $open={isOpen}>
                    <ListUl>
                      {day.exercises?.map((exercise, exIndex) => (
                        <ListLi key={exIndex}>
                          <ListItemContent>
                            <SmallText>{`Exercise ${exercise.orderInWorkout}: ${exercise.exerciseId}`}</SmallText>
                            <SmallText $muted>{`${exercise.setScheme} - Rest: ${exercise.restPeriod}s - ${exercise.notes}`}</SmallText>
                          </ListItemContent>
                        </ListLi>
                      ))}
                    </ListUl>
                  </CollapsibleBody>
                </CollapsibleWrapper>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageWrapper>
      <PageTitle>
        {mode === 'edit' ? 'Edit' : 'Create'} Workout Plan
      </PageTitle>

      <StepperRow>
        {steps.map((label, idx) => (
          <React.Fragment key={label}>
            <StepItem>
              <StepCircle
                $active={idx === activeStep}
                $completed={idx < activeStep}
              >
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

      {error && (
        <AlertBox $severity="error">
          {error}
        </AlertBox>
      )}

      <Surface>
        {renderStepContent(activeStep)}

        <FlexRow $justify="space-between" style={{ marginTop: 28 }}>
          <GhostButton
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Back
          </GhostButton>

          <FlexRow $gap="12px">
            {activeStep === steps.length - 1 ? (
              <PrimaryButton
                onClick={savePlan}
                disabled={loading}
              >
                <Save size={18} />
                {mode === 'edit' ? 'Update Plan' : 'Save Plan'}
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={handleNext}
                disabled={!plan.name || !plan.clientId}
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
