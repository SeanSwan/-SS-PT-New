import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  Dumbbell,
  Play,
  Pause,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronDown,
  TrendingUp,
  ClipboardList,
  History,
  Star,
  Timer,
  RefreshCw,
  Edit
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useWorkoutMcp, WorkoutPlan, WorkoutSession, Exercise, WorkoutStatistics } from '../../hooks/useWorkoutMcp';

/* ─── Types / Interfaces ────────────────────────────────────────────── */

interface SetLog {
  setNumber: number;
  reps: number;
  weight: number;
  rpe?: number;
  completed: boolean;
}

interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  sets: SetLog[];
  notes?: string;
  completed: boolean;
}

/* ─── Galaxy-Swan Theme Tokens ──────────────────────────────────────── */

const theme = {
  bg: 'rgba(15, 23, 42, 0.95)',
  bgCard: 'rgba(15, 23, 42, 0.85)',
  bgSurface: 'rgba(30, 41, 59, 0.7)',
  bgHover: 'rgba(30, 41, 59, 0.9)',
  border: 'rgba(14, 165, 233, 0.2)',
  borderActive: 'rgba(14, 165, 233, 0.5)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  accentPurple: '#7851A9',
  success: '#22c55e',
  successLight: 'rgba(34, 197, 94, 0.15)',
  warning: '#f59e0b',
  warningLight: 'rgba(245, 158, 11, 0.15)',
  error: '#ef4444',
  errorLight: 'rgba(239, 68, 68, 0.15)',
  info: '#3b82f6',
  radius: '12px',
  radiusSm: '8px',
  radiusRound: '50%',
  glass: 'rgba(255, 255, 255, 0.03)',
};

/* ─── Animations ────────────────────────────────────────────────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

/* ─── Styled Components ─────────────────────────────────────────────── */

/* Layout */
const Section = styled.div`
  animation: ${fadeIn} 0.3s ease;
`;

const FlexRow = styled.div<{ $gap?: string; $justify?: string; $align?: string; $wrap?: boolean }>`
  display: flex;
  gap: ${({ $gap }) => $gap || '0.5rem'};
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'center'};
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const SetFieldsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 0.75rem;
  align-items: end;

  @media (max-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

/* Typography */
const Heading = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${theme.text};
  margin: 0;
`;

const Heading5 = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 0.25rem 0;
`;

const Heading6 = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 0.5rem 0;
`;

const BodyText = styled.p`
  font-size: 0.875rem;
  color: ${theme.textMuted};
  margin: 0 0 0.5rem 0;
  line-height: 1.5;
`;

const Caption = styled.span`
  font-size: 0.75rem;
  color: ${theme.textMuted};
  display: block;
`;

const SubTitle = styled.span`
  font-size: 0.95rem;
  font-weight: 500;
  color: ${theme.text};
`;

const SetLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${theme.text};
  margin-bottom: 0.25rem;
  display: block;
`;

const BigStat = styled.div<{ $color?: string }>`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ $color }) => $color || theme.accent};
  line-height: 1;
`;

/* Card / Paper / Surface */
const CardPanel = styled.div`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: ${theme.radius};
  padding: 1.25rem;
  margin-bottom: 1rem;
  backdrop-filter: blur(12px);
`;

const Surface = styled.div`
  background: ${theme.bgSurface};
  border: 1px solid ${theme.border};
  border-radius: ${theme.radius};
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  backdrop-filter: blur(8px);
`;

const EmptyState = styled.div`
  background: ${theme.bgSurface};
  border: 1px solid ${theme.border};
  border-radius: ${theme.radius};
  padding: 2rem;
  text-align: center;
`;

/* Divider */
const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${theme.border};
  margin: 1rem 0;
`;

/* Buttons */
const PrimaryButton = styled.button<{ $fullWidth?: boolean; $variant?: 'contained' | 'outlined'; $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  min-width: 44px;
  padding: 0.625rem 1.25rem;
  border-radius: ${theme.radiusSm};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};

  ${({ $variant, $color }) => {
    const baseColor = $color || theme.accent;
    if ($variant === 'outlined') {
      return css`
        background: transparent;
        border: 1px solid ${baseColor};
        color: ${baseColor};
        &:hover { background: ${baseColor}22; }
      `;
    }
    return css`
      background: ${baseColor};
      border: 1px solid ${baseColor};
      color: #fff;
      &:hover { opacity: 0.9; filter: brightness(1.1); }
    `;
  }}

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const DangerButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 44px;
  min-width: 44px;
  padding: 0.625rem 1.25rem;
  border-radius: ${theme.radiusSm};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  border: 1px solid ${theme.error};
  color: ${theme.error};
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.errorLight};
  }
`;

const RoundIconButton = styled.button<{ $size?: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  width: ${({ $size }) => ($size ? `${$size}px` : '44px')};
  height: ${({ $size }) => ($size ? `${$size}px` : '44px')};
  border-radius: ${theme.radiusRound};
  background: transparent;
  border: 1px solid ${theme.border};
  color: ${theme.text};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.bgHover};
    border-color: ${theme.borderActive};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* Chip */
const Chip = styled.span<{ $color?: string; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: ${({ $small }) => ($small ? '0.2rem 0.6rem' : '0.35rem 0.75rem')};
  border-radius: 999px;
  font-size: ${({ $small }) => ($small ? '0.7rem' : '0.8rem')};
  font-weight: 500;
  background: ${({ $color }) => {
    switch ($color) {
      case 'success': return theme.successLight;
      case 'warning': return theme.warningLight;
      case 'error': return theme.errorLight;
      default: return 'rgba(14, 165, 233, 0.15)';
    }
  }};
  color: ${({ $color }) => {
    switch ($color) {
      case 'success': return theme.success;
      case 'warning': return theme.warning;
      case 'error': return theme.error;
      default: return theme.accent;
    }
  }};
  border: 1px solid ${({ $color }) => {
    switch ($color) {
      case 'success': return 'rgba(34, 197, 94, 0.3)';
      case 'warning': return 'rgba(245, 158, 11, 0.3)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      default: return theme.border;
    }
  }};
  white-space: nowrap;
  cursor: default;
`;

const ClickableChip = styled(Chip)`
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { filter: brightness(1.2); }
`;

/* Badge (positioned dot) */
const BadgeWrapper = styled.span`
  position: relative;
  display: inline-flex;
`;

const BadgeDot = styled.span`
  position: absolute;
  top: -3px;
  right: -3px;
  width: 10px;
  height: 10px;
  border-radius: ${theme.radiusRound};
  background: ${theme.warning};
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

/* Alert */
const AlertBox = styled.div<{ $severity?: 'error' | 'warning' | 'info' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: ${theme.radiusSm};
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  border-left: 4px solid;

  ${({ $severity }) => {
    switch ($severity) {
      case 'error':
        return css`
          background: ${theme.errorLight};
          color: ${theme.error};
          border-left-color: ${theme.error};
        `;
      case 'warning':
        return css`
          background: ${theme.warningLight};
          color: ${theme.warning};
          border-left-color: ${theme.warning};
        `;
      case 'success':
        return css`
          background: ${theme.successLight};
          color: ${theme.success};
          border-left-color: ${theme.success};
        `;
      default:
        return css`
          background: rgba(59, 130, 246, 0.1);
          color: ${theme.info};
          border-left-color: ${theme.info};
        `;
    }
  }}
`;

/* Tabs */
const TabBar = styled.div`
  display: flex;
  background: ${theme.bgSurface};
  border: 1px solid ${theme.border};
  border-radius: ${theme.radius};
  overflow: hidden;
  margin-bottom: 1.5rem;
`;

const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
  padding: 0.75rem 1rem;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ $active }) => ($active ? 'rgba(14, 165, 233, 0.15)' : 'transparent')};
  color: ${({ $active }) => ($active ? theme.accent : theme.textMuted)};
  border-bottom: 2px solid ${({ $active }) => ($active ? theme.accent : 'transparent')};

  &:hover {
    background: ${({ $active }) => ($active ? 'rgba(14, 165, 233, 0.2)' : theme.glass)};
  }
`;

/* Accordion / Collapsible */
const CollapsibleWrapper = styled.div`
  border: 1px solid ${theme.border};
  border-radius: ${theme.radiusSm};
  margin-bottom: 0.5rem;
  overflow: hidden;
`;

const CollapsibleHeader = styled.button<{ $open?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.875rem 1rem;
  min-height: 44px;
  background: ${theme.bgSurface};
  border: none;
  color: ${theme.text};
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${theme.bgHover};
  }

  svg:last-child {
    transition: transform 0.25s ease;
    transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0deg)')};
  }
`;

const CollapsibleBody = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'block' : 'none')};
  padding: 1rem;
  background: ${theme.bgCard};
  border-top: 1px solid ${theme.border};
`;

/* List */
const ListWrapper = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ListEntry = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid ${theme.border};

  &:last-child {
    border-bottom: none;
  }
`;

const ListIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${theme.accent};
  flex-shrink: 0;
`;

const ListContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ListPrimary = styled.span`
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: ${theme.text};
`;

const ListSecondary = styled.span`
  display: block;
  font-size: 0.8rem;
  color: ${theme.textMuted};
`;

/* Stepper */
const StepperWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const StepItem = styled.div<{ $active: boolean; $completed: boolean }>`
  position: relative;
  padding-left: 3rem;
  padding-bottom: 1.5rem;

  /* Vertical connector line */
  &::before {
    content: '';
    position: absolute;
    left: 17px;
    top: 36px;
    bottom: 0;
    width: 2px;
    background: ${({ $completed }) => ($completed ? theme.success : theme.border)};
  }

  &:last-child::before {
    display: none;
  }
`;

const StepCircle = styled.div<{ $active: boolean; $completed: boolean }>`
  position: absolute;
  left: 4px;
  top: 0;
  width: 28px;
  height: 28px;
  border-radius: ${theme.radiusRound};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  border: 2px solid;
  transition: all 0.2s ease;

  ${({ $completed, $active }) => {
    if ($completed) {
      return css`
        background: ${theme.success};
        border-color: ${theme.success};
        color: #fff;
      `;
    }
    if ($active) {
      return css`
        background: ${theme.accent};
        border-color: ${theme.accent};
        color: #fff;
      `;
    }
    return css`
      background: transparent;
      border-color: ${theme.border};
      color: ${theme.textMuted};
    `;
  }}
`;

const StepBody = styled.div<{ $visible: boolean }>`
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
  margin-top: 0.75rem;
`;

/* Input / TextField */
const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
`;

const FieldLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${theme.textMuted};
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 40px;
  padding: 0.5rem 0.75rem;
  border-radius: ${theme.radiusSm};
  border: 1px solid ${theme.border};
  background: rgba(15, 23, 42, 0.6);
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: ${theme.accent};
  }

  &::placeholder {
    color: ${theme.textMuted};
  }
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: ${theme.radiusSm};
  border: 1px solid ${theme.border};
  background: rgba(15, 23, 42, 0.6);
  color: ${theme.text};
  font-size: 0.875rem;
  outline: none;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: ${theme.accent};
  }

  &::placeholder {
    color: ${theme.textMuted};
  }
`;

/* Slider (native range input) */
const RangeSlider = styled.input.attrs({ type: 'range' })`
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: ${theme.border};
  outline: none;
  margin: 0.5rem 0;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: ${theme.radiusRound};
    background: ${theme.accent};
    cursor: pointer;
    border: 2px solid #fff;
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: ${theme.radiusRound};
    background: ${theme.accent};
    cursor: pointer;
    border: 2px solid #fff;
  }
`;

/* Modal / Dialog */
const ModalOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const ModalPanel = styled.div`
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: ${theme.radius};
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${fadeIn} 0.25s ease;
`;

const ModalHeader = styled.div`
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${theme.border};
`;

const ModalContent = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const ModalFooter = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid ${theme.border};
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

/* Set card inside stepper */
const SetCard = styled.div<{ $completed: boolean }>`
  background: ${({ $completed }) => ($completed ? theme.successLight : theme.bgSurface)};
  border: 1px solid ${({ $completed }) => ($completed ? 'rgba(34, 197, 94, 0.3)' : theme.border)};
  border-radius: ${theme.radiusSm};
  padding: 1rem;
  margin-bottom: 0.75rem;
`;

/* Info box centered with icon */
const CenteredInfoBox = styled.div`
  text-align: center;
  padding: 0.5rem 0;
`;

/**
 * Enhanced MyWorkoutsSection Component with MCP Integration
 *
 * Provides comprehensive workout tracking and management for clients
 * Integrates with the Workout MCP server for real-time data synchronization
 */
const EnhancedMyWorkoutsSection: React.FC = () => {
  const { user } = useAuth();
  const {
    getClientProgress,
    getWorkoutStatistics,
    logWorkoutSession,
    getWorkoutRecommendations,
    loading,
    error
  } = useWorkoutMcp();

  const [tabValue, setTabValue] = useState(0);
  const [currentPlan, setCurrentPlan] = useState<WorkoutPlan | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutSession | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutSession[]>([]);
  const [workoutStats, setWorkoutStats] = useState<WorkoutStatistics | null>(null);
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [restTimer, setRestTimer] = useState(0);
  const [restTimerRunning, setRestTimerRunning] = useState(false);

  // Accordion open state map
  const [openAccordions, setOpenAccordions] = useState<Record<number, boolean>>({});

  const toggleAccordion = (index: number) => {
    setOpenAccordions(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Mock data for demo
  const mockWorkoutPlan: WorkoutPlan = {
    id: 'plan-1',
    name: 'Full Body Strength Training',
    description: 'Comprehensive strength training program',
    trainerId: 'trainer-1',
    clientId: user?.id || '',
    goal: 'strength',
    startDate: '2024-03-01',
    endDate: '2024-05-01',
    status: 'active',
    days: [
      {
        dayNumber: 1,
        name: 'Upper Body Focus',
        focus: 'upper_body',
        dayType: 'training',
        estimatedDuration: 45,
        sortOrder: 1,
        exercises: [
          {
            exerciseId: 'ex-1',
            orderInWorkout: 1,
            setScheme: '3x8-10',
            repGoal: '8-10',
            restPeriod: 90,
            notes: 'Focus on controlled movement'
          },
          {
            exerciseId: 'ex-2',
            orderInWorkout: 2,
            setScheme: '3x12',
            repGoal: '12',
            restPeriod: 60,
            notes: 'Keep core engaged'
          }
        ]
      }
    ]
  };

  const mockExercises: Exercise[] = [
    {
      id: 'ex-1',
      name: 'Push-ups',
      description: 'Classic chest and tricep exercise',
      category: 'strength',
      difficulty: 'beginner'
    },
    {
      id: 'ex-2',
      name: 'Squats',
      description: 'Fundamental leg exercise',
      category: 'strength',
      difficulty: 'beginner'
    }
  ];

  // Initialize data on component mount
  useEffect(() => {
    if (user?.id) {
      loadWorkoutData();
    }
  }, [user?.id]);

  // Workout timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorkoutActive) {
      interval = setInterval(() => {
        setWorkoutTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive]);

  // Rest timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (restTimerRunning && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => {
          if (prev <= 1) {
            setRestTimerRunning(false);
            // Play notification sound or show alert
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restTimerRunning, restTimer]);

  const loadWorkoutData = async () => {
    try {
      // Set mock data for demonstration
      setCurrentPlan(mockWorkoutPlan);

      // Try to load real data from MCP if available
      if (user?.id) {
        const statsResponse = await getWorkoutStatistics({
          userId: user.id,
          includeExerciseBreakdown: true,
          includeMuscleGroupBreakdown: true
        });

        if (statsResponse?.statistics) {
          setWorkoutStats(statsResponse.statistics);
        }
      }
    } catch (err) {
      console.error('Failed to load workout data:', err);
    }
  };

  const startWorkout = async (day: any) => {
    const newWorkout: WorkoutSession = {
      id: `workout-${Date.now()}`,
      userId: user?.id || '',
      workoutPlanId: currentPlan?.id,
      title: day.name,
      description: `${currentPlan?.name} - ${day.name}`,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      exercises: day.exercises.map((ex: any, index: number) => ({
        id: `we-${index}`,
        exerciseId: ex.exerciseId,
        orderInWorkout: ex.orderInWorkout,
        sets: [],
        exercise: mockExercises.find(e => e.id === ex.exerciseId)
      }))
    };

    // Initialize exercise logs
    const logs: ExerciseLog[] = day.exercises.map((ex: any) => {
      const exercise = mockExercises.find(e => e.id === ex.exerciseId);
      const setCount = parseInt(ex.setScheme.split('x')[0]) || 3;

      return {
        exerciseId: ex.exerciseId,
        exerciseName: exercise?.name || 'Unknown Exercise',
        sets: Array(setCount).fill(null).map((_, i) => ({
          setNumber: i + 1,
          reps: 0,
          weight: 0,
          completed: false
        })),
        completed: false
      };
    });

    setActiveWorkout(newWorkout);
    setExerciseLogs(logs);
    setIsWorkoutActive(true);
    setWorkoutTimer(0);
    setWorkoutDialogOpen(true);
  };

  const completeSet = (exerciseIndex: number, setIndex: number, reps: number, weight: number, rpe?: number) => {
    const newLogs = [...exerciseLogs];
    newLogs[exerciseIndex].sets[setIndex] = {
      ...newLogs[exerciseIndex].sets[setIndex],
      reps,
      weight,
      rpe,
      completed: true
    };

    // Check if all sets for this exercise are completed
    const allSetsCompleted = newLogs[exerciseIndex].sets.every(set => set.completed);
    if (allSetsCompleted) {
      newLogs[exerciseIndex].completed = true;
    }

    setExerciseLogs(newLogs);
  };

  const startRestTimer = (duration: number) => {
    setRestTimer(duration);
    setRestTimerRunning(true);
  };

  const finishWorkout = async () => {
    if (!activeWorkout) return;

    try {
      const completedWorkout: WorkoutSession = {
        ...activeWorkout,
        completedAt: new Date().toISOString(),
        status: 'completed',
        duration: workoutTimer,
        exercises: activeWorkout.exercises?.map((ex, index) => ({
          ...ex,
          sets: exerciseLogs[index]?.sets.map(set => ({
            setNumber: set.setNumber,
            setType: 'working',
            repsCompleted: set.reps,
            weightUsed: set.weight,
            rpe: set.rpe
          })) || [],
          completedAt: new Date().toISOString()
        }))
      };

      // Log workout session via MCP
      const response = await logWorkoutSession(completedWorkout);

      if (response) {
        setWorkoutHistory(prev => [completedWorkout, ...prev]);
        setActiveWorkout(null);
        setExerciseLogs([]);
        setIsWorkoutActive(false);
        setWorkoutDialogOpen(false);
        setWorkoutTimer(0);

        // Reload workout data to update statistics
        loadWorkoutData();
      }
    } catch (err) {
      console.error('Failed to save workout:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  /* ─── Render: Workout Plans Tab ─────────────────────────────────── */

  const renderWorkoutPlans = () => (
    <div>
      <FlexRow $justify="space-between" $align="center" style={{ marginBottom: '1.5rem' }}>
        <Heading6>Current Workout Plan</Heading6>
        <RoundIconButton onClick={loadWorkoutData} disabled={loading} aria-label="Refresh">
          <RefreshCw size={18} />
        </RoundIconButton>
      </FlexRow>

      {currentPlan ? (
        <CardPanel>
          <Heading5>{currentPlan.name}</Heading5>
          <BodyText>{currentPlan.description}</BodyText>

          <StatsGrid>
            <CenteredInfoBox>
              <ClipboardList size={28} color={theme.accent} />
              <Caption>Goal</Caption>
              <SubTitle>{currentPlan.goal?.replace('_', ' ').toLowerCase()}</SubTitle>
            </CenteredInfoBox>

            <CenteredInfoBox>
              <Calendar size={28} color={theme.accentPurple} />
              <Caption>Duration</Caption>
              <SubTitle>
                {Math.ceil(
                  (new Date(currentPlan.endDate!).getTime() - new Date(currentPlan.startDate!).getTime()) /
                    (1000 * 60 * 60 * 24 * 7)
                )}{' '}
                weeks
              </SubTitle>
            </CenteredInfoBox>

            <CenteredInfoBox>
              <Dumbbell size={28} color={theme.warning} />
              <Caption>Days</Caption>
              <SubTitle>{currentPlan.days?.length || 0} per week</SubTitle>
            </CenteredInfoBox>

            <CenteredInfoBox>
              <Chip $color="success">
                <CheckCircle2 size={14} />
                {currentPlan.status}
              </Chip>
            </CenteredInfoBox>
          </StatsGrid>

          <Divider />

          <Heading6>Workout Days</Heading6>
          {currentPlan.days?.map((day, index) => (
            <CollapsibleWrapper key={index}>
              <CollapsibleHeader
                $open={!!openAccordions[index]}
                onClick={() => toggleAccordion(index)}
                type="button"
              >
                <FlexRow $gap="0.75rem" $align="center" style={{ flex: 1 }}>
                  <SubTitle>{day.name}</SubTitle>
                  <FlexRow $gap="0.5rem" $wrap>
                    <Chip $small>{day.focus?.replace('_', ' ') || 'General'}</Chip>
                    <Chip $small>
                      <Clock size={12} />
                      {day.estimatedDuration}min
                    </Chip>
                  </FlexRow>
                </FlexRow>
                <ChevronDown size={18} />
              </CollapsibleHeader>
              <CollapsibleBody $open={!!openAccordions[index]}>
                <ListWrapper>
                  {day.exercises?.map((ex, exIndex) => {
                    const exercise = mockExercises.find(e => e.id === ex.exerciseId);
                    return (
                      <ListEntry key={exIndex}>
                        <ListIcon>
                          <Dumbbell size={18} />
                        </ListIcon>
                        <ListContent>
                          <ListPrimary>{exercise?.name || 'Unknown Exercise'}</ListPrimary>
                          <ListSecondary>{ex.setScheme} - Rest: {ex.restPeriod}s</ListSecondary>
                        </ListContent>
                      </ListEntry>
                    );
                  })}
                </ListWrapper>
                <PrimaryButton $fullWidth onClick={() => startWorkout(day)} style={{ marginTop: '1rem' }}>
                  <Play size={16} />
                  Start Workout
                </PrimaryButton>
              </CollapsibleBody>
            </CollapsibleWrapper>
          ))}
        </CardPanel>
      ) : (
        <EmptyState>
          <Heading6>No Active Workout Plan</Heading6>
          <BodyText>Contact your trainer to get a personalized workout plan assigned.</BodyText>
        </EmptyState>
      )}
    </div>
  );

  /* ─── Render: Workout History Tab ───────────────────────────────── */

  const renderWorkoutHistory = () => (
    <div>
      <Heading6>Workout History</Heading6>

      {workoutStats && (
        <StatsGrid>
          <CardPanel style={{ textAlign: 'center' }}>
            <BigStat $color={theme.accent}>{workoutStats.totalWorkouts}</BigStat>
            <Caption>Total Workouts</Caption>
          </CardPanel>
          <CardPanel style={{ textAlign: 'center' }}>
            <BigStat $color={theme.accentPurple}>{Math.round(workoutStats.totalDuration / 60)}h</BigStat>
            <Caption>Total Time</Caption>
          </CardPanel>
          <CardPanel style={{ textAlign: 'center' }}>
            <BigStat $color={theme.success}>{workoutStats.totalSets}</BigStat>
            <Caption>Total Sets</Caption>
          </CardPanel>
          <CardPanel style={{ textAlign: 'center' }}>
            <BigStat $color={theme.info}>{workoutStats.totalReps}</BigStat>
            <Caption>Total Reps</Caption>
          </CardPanel>
        </StatsGrid>
      )}

      {workoutHistory.length > 0 ? (
        workoutHistory.map((workout) => (
          <CardPanel key={workout.id}>
            <FlexRow $justify="space-between" $align="flex-start">
              <div>
                <Heading6 style={{ marginBottom: '0.25rem' }}>{workout.title}</Heading6>
                <BodyText>{new Date(workout.completedAt!).toLocaleDateString()}</BodyText>
              </div>
              <Chip $color="success" $small>
                <CheckCircle2 size={14} />
                Completed
              </Chip>
            </FlexRow>

            <FlexRow $gap="0.5rem" $wrap style={{ marginTop: '0.75rem' }}>
              <Chip $small>
                <Clock size={12} />
                {Math.round((workout.duration || 0) / 60)}min
              </Chip>
              <Chip $small>
                <Dumbbell size={12} />
                {workout.exercises?.length || 0} exercises
              </Chip>
              {workout.intensityRating && (
                <Chip $small>
                  <TrendingUp size={12} />
                  Intensity: {workout.intensityRating}/10
                </Chip>
              )}
            </FlexRow>
          </CardPanel>
        ))
      ) : (
        <EmptyState>
          <History size={48} color={theme.textMuted} style={{ marginBottom: '0.75rem' }} />
          <Heading6>No Workout History</Heading6>
          <BodyText>Complete your first workout to see your history here.</BodyText>
        </EmptyState>
      )}
    </div>
  );

  /* ─── Main Render ───────────────────────────────────────────────── */

  return (
    <Section>
      <FlexRow $align="center" $gap="0.75rem" style={{ marginBottom: '1.5rem' }}>
        <Dumbbell size={28} color={theme.accent} />
        <Heading>My Workouts</Heading>
        {isWorkoutActive && (
          <BadgeWrapper style={{ marginLeft: '0.5rem' }}>
            <BadgeDot />
            <ClickableChip $color="warning" onClick={() => setWorkoutDialogOpen(true)}>
              <Play size={14} />
              Active: {formatTime(workoutTimer)}
            </ClickableChip>
          </BadgeWrapper>
        )}
      </FlexRow>

      {error && <AlertBox $severity="error">{error}</AlertBox>}

      <TabBar>
        <TabButton $active={tabValue === 0} onClick={() => setTabValue(0)}>
          <ClipboardList size={16} />
          Current Plan
        </TabButton>
        <TabButton $active={tabValue === 1} onClick={() => setTabValue(1)}>
          <History size={16} />
          History
        </TabButton>
        <TabButton $active={tabValue === 2} onClick={() => setTabValue(2)}>
          <TrendingUp size={16} />
          Progress
        </TabButton>
      </TabBar>

      {tabValue === 0 && renderWorkoutPlans()}
      {tabValue === 1 && renderWorkoutHistory()}
      {tabValue === 2 && (
        <EmptyState style={{ padding: '3rem 2rem' }}>
          <TrendingUp size={56} color={theme.accent} style={{ marginBottom: '0.75rem' }} />
          <Heading6>Progress Tracking</Heading6>
          <BodyText>Detailed progress analytics coming soon.</BodyText>
        </EmptyState>
      )}

      {/* ─── Active Workout Modal ──────────────────────────────────── */}
      <ModalOverlay $open={workoutDialogOpen}>
        <ModalPanel>
          <ModalHeader>
            <FlexRow $justify="space-between" $align="center">
              <Heading6 style={{ margin: 0 }}>{activeWorkout?.title}</Heading6>
              <FlexRow $gap="0.5rem">
                <Chip>
                  <Timer size={14} />
                  {formatTime(workoutTimer)}
                </Chip>
                {restTimerRunning && (
                  <Chip $color="warning">
                    <Pause size={14} />
                    Rest: {formatTime(restTimer)}
                  </Chip>
                )}
              </FlexRow>
            </FlexRow>
          </ModalHeader>

          <ModalContent>
            <StepperWrapper>
              {exerciseLogs.map((exerciseLog, exerciseIndex) => (
                <StepItem
                  key={exerciseIndex}
                  $active={!exerciseLog.completed}
                  $completed={exerciseLog.completed}
                >
                  <StepCircle
                    $active={!exerciseLog.completed}
                    $completed={exerciseLog.completed}
                  >
                    {exerciseLog.completed ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      exerciseIndex + 1
                    )}
                  </StepCircle>

                  <FlexRow $gap="0.5rem" $align="center">
                    <Heading6 style={{ margin: 0 }}>{exerciseLog.exerciseName}</Heading6>
                    {exerciseLog.completed && <CheckCircle2 size={18} color={theme.success} />}
                  </FlexRow>

                  <StepBody $visible={!exerciseLog.completed}>
                    {exerciseLog.sets.map((set, setIndex) => (
                      <SetCard key={setIndex} $completed={set.completed}>
                        <SetLabel>Set {set.setNumber}</SetLabel>
                        <SetFieldsGrid>
                          <FieldGroup>
                            <FieldLabel>Reps</FieldLabel>
                            <StyledInput
                              type="number"
                              value={set.reps}
                              onChange={(e) => {
                                const newLogs = [...exerciseLogs];
                                newLogs[exerciseIndex].sets[setIndex].reps = Number(e.target.value);
                                setExerciseLogs(newLogs);
                              }}
                            />
                          </FieldGroup>
                          <FieldGroup>
                            <FieldLabel>Weight</FieldLabel>
                            <StyledInput
                              type="number"
                              value={set.weight}
                              onChange={(e) => {
                                const newLogs = [...exerciseLogs];
                                newLogs[exerciseIndex].sets[setIndex].weight = Number(e.target.value);
                                setExerciseLogs(newLogs);
                              }}
                            />
                          </FieldGroup>
                          <FieldGroup>
                            <FieldLabel>RPE: {set.rpe || 0}</FieldLabel>
                            <RangeSlider
                              value={set.rpe || 0}
                              min={0}
                              max={10}
                              step={1}
                              onChange={(e) => {
                                const newLogs = [...exerciseLogs];
                                newLogs[exerciseIndex].sets[setIndex].rpe = Number(e.target.value);
                                setExerciseLogs(newLogs);
                              }}
                            />
                          </FieldGroup>
                          <FieldGroup>
                            <FieldLabel>&nbsp;</FieldLabel>
                            <PrimaryButton
                              $fullWidth
                              $variant={set.completed ? 'outlined' : 'contained'}
                              $color={set.completed ? theme.success : theme.accent}
                              onClick={() => {
                                if (!set.completed) {
                                  completeSet(exerciseIndex, setIndex, set.reps, set.weight, set.rpe);
                                  if (setIndex < exerciseLog.sets.length - 1) {
                                    startRestTimer(90); // Default 90s rest
                                  }
                                }
                              }}
                            >
                              {set.completed ? 'Completed' : 'Complete'}
                            </PrimaryButton>
                          </FieldGroup>
                        </SetFieldsGrid>
                      </SetCard>
                    ))}

                    <FieldGroup style={{ marginTop: '0.75rem' }}>
                      <FieldLabel>Exercise Notes</FieldLabel>
                      <StyledTextarea
                        rows={2}
                        value={exerciseLog.notes || ''}
                        onChange={(e) => {
                          const newLogs = [...exerciseLogs];
                          newLogs[exerciseIndex].notes = e.target.value;
                          setExerciseLogs(newLogs);
                        }}
                        placeholder="Add notes for this exercise..."
                      />
                    </FieldGroup>
                  </StepBody>
                </StepItem>
              ))}
            </StepperWrapper>
          </ModalContent>

          <ModalFooter>
            <DangerButton
              onClick={() => {
                setIsWorkoutActive(false);
                setWorkoutDialogOpen(false);
                setActiveWorkout(null);
                setExerciseLogs([]);
              }}
            >
              Cancel Workout
            </DangerButton>
            <PrimaryButton
              onClick={finishWorkout}
              disabled={!exerciseLogs.every(ex => ex.completed)}
            >
              <CheckCircle2 size={16} />
              Finish Workout
            </PrimaryButton>
          </ModalFooter>
        </ModalPanel>
      </ModalOverlay>
    </Section>
  );
};

export default EnhancedMyWorkoutsSection;
