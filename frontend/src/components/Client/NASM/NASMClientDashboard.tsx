/**
 * NASM Client Dashboard - Personalized Training Experience
 *
 * Client-only NASM features:
 * 1. Current Phase Widget - Display current OPT phase & progress
 * 2. Today's Workout - View trainer-assigned NASM workout
 * 3. Corrective Homework Tracker - Complete daily CEx with gamification
 * 4. Session Logger - Log sets, reps, RPE, pain flags
 * 5. Progress Timeline - Visual progression through phases
 * 6. NASM Education Hub - Learn about current phase
 *
 * Access: Client tier only (user_tier = 'client')
 * Gamification:
 * - +10 XP per homework completion
 * - Streak bonuses (7d, 15d, 30d)
 * - "NASM-Trained Client" badge
 * - Compliance badges (70%, 85%, 95%)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import {
  TrendingUp,
  Dumbbell,
  ClipboardList,
  CheckCircle,
  Circle,
  Flame,
  Trophy,
  Play,
  ChevronDown,
  AlertTriangle,
  Info,
  Star,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../utils/api';
import WorkoutLogger from '../../Workout/WorkoutLogger';

// ========================================
// TYPES
// ========================================

interface ClientPhaseData {
  current_phase: string;
  phase_start_date: string;
  phase_target_weeks: number;
  weeks_completed: number;
  ready_for_next_phase: boolean;
  trainer_notes: string;
  progression_criteria_met: {
    load_increased?: boolean;
    form_improved?: boolean;
    no_pain?: boolean;
  };
}

interface TodaysWorkout {
  id: string;
  template_name: string;
  opt_phase: string;
  target_duration_minutes: number;
  exercises: Array<{
    exercise_id: string;
    exercise_name: string;
    sets: number;
    reps: string;
    tempo: string;
    rest_sec: number;
    notes: string;
    demo_video_url: string | null;
    sets_logged: number;
  }>;
  corrective_warmup_required: boolean;
}

interface CorrectiveHomework {
  id: string;
  protocol_type: string;
  inhibit_exercises: Array<{ exercise: string; duration_sec: number; notes: string }>;
  lengthen_exercises: Array<{ exercise: string; duration_sec: number; reps: number }>;
  activate_exercises: Array<{ exercise: string; reps: number; sets: number; tempo: string }>;
  integrate_exercises: Array<{ exercise: string; reps: number; sets: number; tempo: string }>;
  total_days_assigned: number;
  days_completed: number;
  compliance_rate: number;
  xp_earned: number;
  current_streak: number;
  longest_streak: number;
  completed_today: boolean;
}

interface SetLog {
  set_num: number;
  reps: number;
  weight_lbs: number;
  tempo: string;
  rpe: number;
  completed: boolean;
}

// ========================================
// STYLED COMPONENTS
// ========================================

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const PageContainer = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px;

  @media (max-width: 768px) {
    padding: 16px 12px;
  }
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const PageTitle = styled.h2`
  font-size: 1.75rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0 0 4px 0;
`;

const PageSubtitle = styled.p`
  font-size: 0.95rem;
  color: rgba(226, 232, 240, 0.6);
  margin: 0;
`;

const GridLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const FullWidthRow = styled.div`
  grid-column: 1 / -1;
`;

const GlassCard = styled.div<{ $borderColor?: string }>`
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid ${({ $borderColor }) => $borderColor || 'rgba(14, 165, 233, 0.2)'};
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(12px);
`;

const PhaseCard = styled.div<{ $phaseColor: string }>`
  background: linear-gradient(135deg, ${({ $phaseColor }) => $phaseColor} 0%, ${({ $phaseColor }) => $phaseColor}DD 100%);
  border-radius: 16px;
  padding: 24px;
  color: #ffffff;
`;

const FlexRow = styled.div<{ $justify?: string; $align?: string; $gap?: string; $wrap?: string }>`
  display: flex;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'stretch'};
  gap: ${({ $gap }) => $gap || '0'};
  flex-wrap: ${({ $wrap }) => $wrap || 'nowrap'};
`;

const FlexColumn = styled.div<{ $align?: string; $gap?: string }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $align }) => $align || 'stretch'};
  gap: ${({ $gap }) => $gap || '0'};
`;

const OverlineText = styled.span`
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  opacity: 0.9;
`;

const Heading5 = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: inherit;
`;

const Heading6 = styled.h4`
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #e2e8f0;
`;

const BodyText = styled.p<{ $muted?: boolean; $small?: boolean; $center?: boolean; $bold?: boolean }>`
  font-size: ${({ $small }) => ($small ? '0.8rem' : '0.95rem')};
  color: ${({ $muted }) => ($muted ? 'rgba(226, 232, 240, 0.6)' : '#e2e8f0')};
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};
  font-weight: ${({ $bold }) => ($bold ? '700' : '400')};
  margin: 0;
  line-height: 1.5;
`;

const PhaseBodyText = styled.p<{ $muted?: boolean; $small?: boolean; $center?: boolean; $bold?: boolean }>`
  font-size: ${({ $small }) => ($small ? '0.8rem' : '0.95rem')};
  color: #ffffff;
  opacity: ${({ $muted }) => ($muted ? 0.9 : 1)};
  text-align: ${({ $center }) => ($center ? 'center' : 'left')};
  font-weight: ${({ $bold }) => ($bold ? '700' : '400')};
  margin: 0;
  line-height: 1.5;
`;

const SubtitleText = styled.span<{ $color?: string }>`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ $color }) => $color || '#e2e8f0'};
  margin-bottom: 4px;
  display: block;
`;

const CaptionText = styled.span`
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.5);
`;

const Chip = styled.span<{ $bgColor?: string; $textColor?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${({ $bgColor }) => $bgColor || 'rgba(14, 165, 233, 0.2)'};
  color: ${({ $textColor }) => $textColor || '#0ea5e9'};
  white-space: nowrap;
  min-height: 28px;
`;

const PhaseChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  white-space: nowrap;
`;

const HorizontalDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  margin: 16px 0;
`;

const ProgressBarContainer = styled.div<{ $bgColor?: string }>`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: ${({ $bgColor }) => $bgColor || 'rgba(226, 232, 240, 0.15)'};
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $percent: number; $fillColor?: string }>`
  height: 100%;
  width: ${({ $percent }) => Math.min(100, Math.max(0, $percent))}%;
  border-radius: 4px;
  background: ${({ $fillColor }) => $fillColor || '#0ea5e9'};
  transition: width 0.4s ease;
`;

const StyledList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const StyledListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(14, 165, 233, 0.08);

  &:last-child {
    border-bottom: none;
  }
`;

const ListItemContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ListItemPrimary = styled.span`
  display: block;
  font-size: 0.95rem;
  color: #e2e8f0;
`;

const ListItemSecondary = styled.span`
  display: block;
  font-size: 0.8rem;
  color: rgba(226, 232, 240, 0.5);
`;

const PrimaryButton = styled.button<{ $fullWidth?: boolean; $variant?: 'primary' | 'success'; $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 24px;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
  transition: all 0.2s ease;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};

  ${({ $variant }) =>
    $variant === 'success'
      ? css`
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #ffffff;
          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #16a34a, #15803d);
          }
        `
      : css`
          background: linear-gradient(135deg, #0ea5e9, #0284c7);
          color: #ffffff;
          &:hover:not(:disabled) {
            background: linear-gradient(135deg, #0284c7, #0369a1);
          }
        `}
`;

const TextButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 16px;
  border: none;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: rgba(226, 232, 240, 0.7);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.1);
    color: #e2e8f0;
  }
`;

const AlertBox = styled.div<{ $severity: 'info' | 'warning' | 'success' | 'error' }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.5;

  ${({ $severity }) => {
    switch ($severity) {
      case 'info':
        return css`
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.3);
          color: #7dd3fc;
        `;
      case 'warning':
        return css`
          background: rgba(234, 179, 8, 0.1);
          border: 1px solid rgba(234, 179, 8, 0.3);
          color: #fde047;
        `;
      case 'success':
        return css`
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #86efac;
        `;
      case 'error':
        return css`
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        `;
    }
  }}

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
`;

const StatCell = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

const BadgeWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const BadgeCount = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background: #ef4444;
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
`;

const AccordionContainer = styled.details`
  border: 1px solid rgba(14, 165, 233, 0.15);
  border-radius: 12px;
  overflow: hidden;

  &[open] > summary svg.chevron {
    transform: rotate(180deg);
  }
`;

const AccordionSummaryStyled = styled.summary`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  min-height: 44px;
  list-style: none;
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
  background: rgba(14, 165, 233, 0.05);
  transition: background 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.1);
  }

  &::-webkit-details-marker {
    display: none;
  }

  svg.chevron {
    transition: transform 0.2s ease;
  }
`;

const AccordionContent = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

/* Dialog / Modal */
const DialogOverlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const DialogPanel = styled.div`
  background: rgba(15, 23, 42, 0.98);
  border: 1px solid rgba(14, 165, 233, 0.25);
  border-radius: 16px;
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  backdrop-filter: blur(16px);
`;

const DialogHeader = styled.div`
  padding: 20px 24px 12px;
  border-bottom: 1px solid rgba(14, 165, 233, 0.12);
`;

const DialogTitleText = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0;
`;

const DialogBody = styled.div`
  padding: 16px 24px;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 24px 20px;
`;

// ========================================
// COMPONENT
// ========================================

const NASMClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // Phase Data
  const [phaseData, setPhaseData] = useState<ClientPhaseData | null>(null);

  // Today's Workout
  const [todaysWorkout, setTodaysWorkout] = useState<TodaysWorkout | null>(null);
  const [workoutDialogOpen, setWorkoutDialogOpen] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [setLogs, setSetLogs] = useState<{ [exerciseId: string]: SetLog[] }>({});

  // Corrective Homework
  const [homework, setHomework] = useState<CorrectiveHomework | null>(null);
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);

  // Progress Timeline
  const [phaseHistory, setPhaseHistory] = useState<any[]>([]);

  // Authorization check
  useEffect(() => {
    if (user?.user_tier !== 'client') {
      window.location.href = '/dashboard/user';
    }
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [phaseRes, workoutRes, homeworkRes, historyRes] = await Promise.all([
        api.get('/api/client/my-opt-phase'),
        api.get('/api/client/my-workout-today'),
        api.get('/api/client/corrective-homework'),
        api.get('/api/client/phase-history'),
      ]);

      setPhaseData(phaseRes.data);
      setTodaysWorkout(workoutRes.data);
      setHomework(homeworkRes.data);
      setPhaseHistory(historyRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleMessageTrainer = async () => {
    // @ts-ignore - Assuming assignedTrainerId exists on the user object from auth context
    const trainerId = user?.assignedTrainerId;
    if (!trainerId || isCreatingConversation) {
      alert('No trainer assigned or an action is already in progress.');
      return;
    }

    setIsCreatingConversation(true);
    try {
      const response = await api.post('/api/messaging/conversations', {
        type: 'direct',
        participantIds: [trainerId],
      });
      const conversationId = response.data.id;
      if (conversationId) {
        navigate(`/messaging?conversation=${conversationId}`);
      } else {
        throw new Error("Conversation ID not returned from API.");
      }
    } catch (error) {
      console.error("Failed to start conversation with trainer", error);
      alert("Could not start a new conversation. Please try again later.");
    } finally {
      setIsCreatingConversation(false);
    }
  };

  // ========================================
  // PHASE WIDGET
  // ========================================
  const getPhaseInfo = (phase: string) => {
    const info: { [key: string]: { title: string; description: string; color: string; focusAreas: string[] } } = {
      phase_1_stabilization: {
        title: 'Phase 1: Stabilization Endurance',
        description: 'Building foundational strength, balance, and movement quality',
        color: '#1976d2',
        focusAreas: ['12-20 reps', '4/2/1 tempo', '50-70% intensity', 'Core stability', 'Balance training'],
      },
      phase_2_strength_endurance: {
        title: 'Phase 2: Strength Endurance',
        description: 'Combining strength and stabilization with supersets',
        color: '#9c27b0',
        focusAreas: ['8-12 reps', 'Supersets', '70-80% intensity', 'Muscular endurance', 'Multi-joint exercises'],
      },
      phase_3_hypertrophy: {
        title: 'Phase 3: Muscular Development',
        description: 'Building lean muscle mass and size',
        color: '#2e7d32',
        focusAreas: ['6-12 reps', '3-6 sets', '75-85% intensity', 'Muscle growth', 'Progressive overload'],
      },
      phase_4_maximal_strength: {
        title: 'Phase 4: Maximal Strength',
        description: 'Developing peak strength and power output',
        color: '#f57c00',
        focusAreas: ['1-5 reps', 'Heavy loads', '85-100% intensity', 'Long rest periods', 'Cluster sets'],
      },
      phase_5_power: {
        title: 'Phase 5: Power',
        description: 'Explosive training with contrast methods',
        color: '#d32f2f',
        focusAreas: ['Explosive movements', 'Contrast training', 'Plyometrics', 'Olympic lifts', 'Speed work'],
      },
    };
    return info[phase] || info.phase_1_stabilization;
  };

  const renderPhaseWidget = () => {
    if (!phaseData) return null;

    const phaseInfo = getPhaseInfo(phaseData.current_phase);
    const progressPercent = (phaseData.weeks_completed / phaseData.phase_target_weeks) * 100;

    return (
      <PhaseCard $phaseColor={phaseInfo.color}>
        <FlexRow $justify="space-between" $align="flex-start" style={{ marginBottom: 16 }}>
          <div>
            <OverlineText>Your Current Phase</OverlineText>
            <Heading5 style={{ marginTop: 4 }}>{phaseInfo.title}</Heading5>
            <PhaseBodyText $muted>{phaseInfo.description}</PhaseBodyText>
          </div>
          {phaseData.ready_for_next_phase && (
            <PhaseChip>
              <CheckCircle size={14} />
              Ready to Advance!
            </PhaseChip>
          )}
        </FlexRow>

        <HorizontalDivider />

        <FlexColumn $gap="8px">
          <FlexRow $justify="space-between">
            <PhaseBodyText $small>
              Week {phaseData.weeks_completed} of {phaseData.phase_target_weeks}
            </PhaseBodyText>
            <PhaseBodyText $small $bold>
              {progressPercent.toFixed(0)}%
            </PhaseBodyText>
          </FlexRow>
          <ProgressBarContainer $bgColor="rgba(255,255,255,0.3)">
            <ProgressBarFill $percent={progressPercent} $fillColor="#ffffff" />
          </ProgressBarContainer>
        </FlexColumn>

        <div style={{ marginTop: 24 }}>
          <SubtitleText $color="#ffffff" style={{ marginBottom: 8 }}>Phase Focus Areas</SubtitleText>
          <FlexRow $wrap="wrap" $gap="8px">
            {phaseInfo.focusAreas.map((area, idx) => (
              <PhaseChip key={idx}>{area}</PhaseChip>
            ))}
          </FlexRow>
        </div>

        {phaseData.trainer_notes && (
          <AlertBox $severity="info" style={{ marginTop: 16 }}>
            <Info size={18} />
            <span><strong>Trainer Note:</strong> {phaseData.trainer_notes}</span>
          </AlertBox>
        )}
      </PhaseCard>
    );
  };

  // ========================================
  // TODAY'S WORKOUT
  // ========================================
  const startWorkout = () => {
    if (!todaysWorkout) return;

    // Initialize set logs
    const initialLogs: { [exerciseId: string]: SetLog[] } = {};
    todaysWorkout.exercises.forEach((exercise) => {
      initialLogs[exercise.exercise_id] = Array.from({ length: exercise.sets }, (_, i) => ({
        set_num: i + 1,
        reps: 0,
        weight_lbs: 0,
        tempo: exercise.tempo,
        rpe: 5,
        completed: false,
      }));
    });
    setSetLogs(initialLogs);
    setCurrentExerciseIndex(0);
    setWorkoutDialogOpen(true);
  };

  const logSet = async (exerciseId: string, setNum: number, data: Partial<SetLog>) => {
    const updatedLogs = { ...setLogs };
    updatedLogs[exerciseId][setNum - 1] = {
      ...updatedLogs[exerciseId][setNum - 1],
      ...data,
      completed: true,
    };
    setSetLogs(updatedLogs);

    // Auto-save to backend
    await api.post('/api/client/log-set', {
      exercise_id: exerciseId,
      set_num: setNum,
      ...data,
    });
  };

  const renderTodaysWorkout = () => {
    if (!todaysWorkout) {
      return (
        <GlassCard>
          <FlexRow $gap="16px" $align="center">
            <Dumbbell size={48} color="rgba(226, 232, 240, 0.3)" />
            <div>
              <Heading6 style={{ color: 'rgba(226, 232, 240, 0.6)' }}>No Workout Assigned</Heading6>
              <BodyText $muted $small>
                Your trainer hasn't assigned a workout yet. Check back later!
              </BodyText>
            </div>
          </FlexRow>
        </GlassCard>
      );
    }

    const completedExercises = todaysWorkout.exercises.filter((ex) => ex.sets_logged === ex.sets).length;
    const totalExercises = todaysWorkout.exercises.length;
    const workoutProgress = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

    return (
      <GlassCard>
        <FlexRow $justify="space-between" $align="flex-start" style={{ marginBottom: 16 }}>
          <div>
            <Heading6>Today's Workout</Heading6>
            <BodyText $muted $small>
              {todaysWorkout.template_name} &bull; {todaysWorkout.target_duration_minutes} min
            </BodyText>
          </div>
          <Chip $bgColor="rgba(14, 165, 233, 0.2)" $textColor="#0ea5e9">
            {getPhaseInfo(todaysWorkout.opt_phase).title}
          </Chip>
        </FlexRow>

        {todaysWorkout.corrective_warmup_required && homework && !homework.completed_today && (
          <AlertBox $severity="warning" style={{ marginBottom: 16 }}>
            <AlertTriangle size={18} />
            <span>Complete your corrective warmup first!</span>
          </AlertBox>
        )}

        <ProgressBarContainer style={{ marginBottom: 16 }}>
          <ProgressBarFill $percent={workoutProgress} />
        </ProgressBarContainer>

        <BodyText $muted $small style={{ marginBottom: 8 }}>
          {completedExercises} of {totalExercises} exercises completed
        </BodyText>

        <StyledList>
          {todaysWorkout.exercises.slice(0, 3).map((exercise) => (
            <StyledListItem key={exercise.exercise_id}>
              {exercise.sets_logged === exercise.sets ? (
                <CheckCircle size={20} color="#22c55e" />
              ) : (
                <Circle size={20} color="rgba(226, 232, 240, 0.3)" />
              )}
              <ListItemContent>
                <ListItemPrimary>{exercise.exercise_name}</ListItemPrimary>
                <ListItemSecondary>
                  {exercise.sets} x {exercise.reps} &bull; {exercise.tempo} tempo
                </ListItemSecondary>
              </ListItemContent>
            </StyledListItem>
          ))}
        </StyledList>
        {todaysWorkout.exercises.length > 3 && (
          <BodyText $muted $small $center style={{ marginTop: 8 }}>
            +{todaysWorkout.exercises.length - 3} more exercises
          </BodyText>
        )}

        <PrimaryButton $fullWidth onClick={startWorkout} style={{ marginTop: 16 }}>
          <Play size={18} />
          {workoutProgress > 0 ? 'Continue Workout' : 'Start Workout'}
        </PrimaryButton>
      </GlassCard>
    );
  };

  // ========================================
  // CORRECTIVE HOMEWORK TRACKER
  // ========================================
  const completeHomework = async () => {
    if (!homework) return;

    await api.post('/api/client/corrective-homework/complete', {
      protocol_id: homework.id,
      completion_date: new Date().toISOString(),
    });

    setHomeworkDialogOpen(false);
    loadDashboardData();
  };

  const renderHomeworkTracker = () => {
    if (!homework) {
      return (
        <GlassCard>
          <Heading6 style={{ marginBottom: 8 }}>Corrective Homework</Heading6>
          <BodyText $muted $small>
            No active corrective protocol. Your trainer will assign one if needed.
          </BodyText>
        </GlassCard>
      );
    }

    const borderColor = homework.completed_today ? 'rgba(34, 197, 94, 0.6)' : 'rgba(234, 179, 8, 0.6)';

    return (
      <GlassCard $borderColor={borderColor} style={{ borderWidth: 2 }}>
        <FlexRow $justify="space-between" $align="flex-start" style={{ marginBottom: 16 }}>
          <div>
            <Heading6>Daily Homework</Heading6>
            <BodyText $muted $small>{homework.protocol_type} Protocol</BodyText>
          </div>
          {homework.completed_today ? (
            <Chip $bgColor="rgba(34, 197, 94, 0.2)" $textColor="#22c55e">
              <CheckCircle size={14} />
              Completed Today!
            </Chip>
          ) : (
            <Chip $bgColor="rgba(234, 179, 8, 0.2)" $textColor="#eab308">
              <ClipboardList size={14} />
              Due Today
            </Chip>
          )}
        </FlexRow>

        <StatsGrid>
          <StatCell>
            <BadgeWrapper>
              <Flame size={32} color="#ef4444" />
              {homework.current_streak > 0 && (
                <BadgeCount>{homework.current_streak > 99 ? '99+' : homework.current_streak}</BadgeCount>
              )}
            </BadgeWrapper>
            <CaptionText>Day Streak</CaptionText>
          </StatCell>

          <StatCell>
            <FlexRow $align="center" $gap="4px">
              <Star size={20} color="#eab308" fill="#eab308" />
              <Heading6 style={{ margin: 0 }}>{homework.xp_earned}</Heading6>
            </FlexRow>
            <CaptionText>XP Earned</CaptionText>
          </StatCell>

          <StatCell>
            <Heading6 style={{ margin: 0 }}>{homework.compliance_rate.toFixed(0)}%</Heading6>
            <CaptionText>Compliance</CaptionText>
          </StatCell>
        </StatsGrid>

        <ProgressBarContainer style={{ marginBottom: 16 }}>
          <ProgressBarFill
            $percent={homework.compliance_rate}
            $fillColor={
              homework.compliance_rate >= 85
                ? '#22c55e'
                : homework.compliance_rate >= 70
                ? '#eab308'
                : '#ef4444'
            }
          />
        </ProgressBarContainer>

        <BodyText $muted $small style={{ marginBottom: 12 }}>
          {homework.days_completed} of {homework.total_days_assigned} days completed
        </BodyText>

        <AccordionContainer>
          <AccordionSummaryStyled>
            <span>
              View Exercises (
              {homework.inhibit_exercises.length +
                homework.lengthen_exercises.length +
                homework.activate_exercises.length +
                homework.integrate_exercises.length}{' '}
              total)
            </span>
            <ChevronDown size={18} className="chevron" />
          </AccordionSummaryStyled>
          <AccordionContent>
            <div>
              <SubtitleText $color="#0ea5e9">1. Inhibit (SMR/Foam Rolling)</SubtitleText>
              {homework.inhibit_exercises.map((ex, idx) => (
                <BodyText key={idx} $small style={{ marginLeft: 8 }}>
                  &bull; {ex.exercise} - {ex.duration_sec}s
                </BodyText>
              ))}
            </div>

            <div>
              <SubtitleText $color="#22c55e">2. Lengthen (Static Stretching)</SubtitleText>
              {homework.lengthen_exercises.map((ex, idx) => (
                <BodyText key={idx} $small style={{ marginLeft: 8 }}>
                  &bull; {ex.exercise} - {ex.reps} x {ex.duration_sec}s
                </BodyText>
              ))}
            </div>

            <div>
              <SubtitleText $color="#eab308">3. Activate (Isolated Strength)</SubtitleText>
              {homework.activate_exercises.map((ex, idx) => (
                <BodyText key={idx} $small style={{ marginLeft: 8 }}>
                  &bull; {ex.exercise} - {ex.sets} x {ex.reps} @ {ex.tempo}
                </BodyText>
              ))}
            </div>

            <div>
              <SubtitleText $color="#ef4444">4. Integrate (Functional Movement)</SubtitleText>
              {homework.integrate_exercises.map((ex, idx) => (
                <BodyText key={idx} $small style={{ marginLeft: 8 }}>
                  &bull; {ex.exercise} - {ex.sets} x {ex.reps} @ {ex.tempo}
                </BodyText>
              ))}
            </div>
          </AccordionContent>
        </AccordionContainer>

        <PrimaryButton
          $fullWidth
          $variant={homework.completed_today ? 'success' : 'primary'}
          $disabled={homework.completed_today}
          onClick={() => !homework.completed_today && setHomeworkDialogOpen(true)}
          disabled={homework.completed_today}
          style={{ marginTop: 16 }}
        >
          {homework.completed_today ? (
            <>
              <CheckCircle size={18} />
              Completed Today!
            </>
          ) : (
            <>
              <Play size={18} />
              Start Homework
            </>
          )}
        </PrimaryButton>

        {homework.current_streak >= 7 && (
          <AlertBox $severity="success" style={{ marginTop: 16 }}>
            <Trophy size={18} />
            <span>
              <strong>{homework.current_streak}-day streak!</strong> You're crushing it!
            </span>
          </AlertBox>
        )}
      </GlassCard>
    );
  };

  // ========================================
  // PROGRESS TIMELINE
  // ========================================
  const renderProgressTimeline = () => (
    <GlassCard>
      <Heading6 style={{ marginBottom: 12 }}>Phase Progression History</Heading6>

      {phaseHistory.length === 0 ? (
        <BodyText $muted $small>
          No phase history yet. You're just getting started!
        </BodyText>
      ) : (
        <StyledList>
          {phaseHistory.map((entry) => (
            <StyledListItem key={entry.id}>
              <TrendingUp size={20} color="#0ea5e9" />
              <ListItemContent>
                <ListItemPrimary>
                  {entry.from_phase ? getPhaseInfo(entry.from_phase).title : 'Start'} &rarr;{' '}
                  {getPhaseInfo(entry.to_phase).title}
                </ListItemPrimary>
                <ListItemSecondary>
                  {new Date(entry.progression_date).toLocaleDateString()} &bull;{' '}
                  {entry.weeks_in_previous_phase || 0} weeks
                </ListItemSecondary>
              </ListItemContent>
            </StyledListItem>
          ))}
        </StyledList>
      )}
    </GlassCard>
  );

  // ========================================
  // HOMEWORK COMPLETION DIALOG
  // ========================================
  const renderHomeworkDialog = () => (
    <DialogOverlay $open={homeworkDialogOpen} onClick={() => setHomeworkDialogOpen(false)}>
      <DialogPanel onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitleText>Complete Corrective Homework</DialogTitleText>
        </DialogHeader>
        <DialogBody>
          <AlertBox $severity="info" style={{ marginBottom: 16 }}>
            <Info size={18} />
            <span>
              Follow the 4-step CEx Continuum in order. Take your time and focus on quality movement!
            </span>
          </AlertBox>

          <BodyText $muted $small style={{ marginBottom: 16 }}>
            Completing today's homework will earn you:
          </BodyText>

          <FlexColumn $gap="8px" style={{ marginBottom: 24 }}>
            <Chip $bgColor="rgba(14, 165, 233, 0.2)" $textColor="#0ea5e9">
              <Star size={14} />
              +10 XP
            </Chip>
            {homework && homework.current_streak === 6 && (
              <Chip $bgColor="rgba(239, 68, 68, 0.2)" $textColor="#ef4444">
                <Flame size={14} />
                +50 XP Bonus (7-day streak!)
              </Chip>
            )}
          </FlexColumn>

          <BodyText $muted $small>
            Once you complete all exercises, click "Mark Complete" below.
          </BodyText>
        </DialogBody>
        <DialogFooter>
          <TextButton onClick={() => setHomeworkDialogOpen(false)}>Cancel</TextButton>
          <PrimaryButton $variant="success" onClick={completeHomework}>
            Mark Complete
          </PrimaryButton>
        </DialogFooter>
      </DialogPanel>
    </DialogOverlay>
  );

  // ========================================
  // MAIN RENDER
  // ========================================
  return (
    <PageContainer>
      <PageHeader>
        <div>
          <PageTitle>My NASM Training</PageTitle>
          <PageSubtitle>
            Your personalized training journey powered by NASM OPT&trade; methodology
          </PageSubtitle>
        </div>
        {/* @ts-ignore */}
        {user?.assignedTrainerId && (
          <PrimaryButton
            onClick={handleMessageTrainer}
            $disabled={isCreatingConversation}
            disabled={isCreatingConversation}
          >
            <MessageSquare size={18} />
            Message My Trainer
          </PrimaryButton>
        )}
      </PageHeader>

      <GridLayout>
        {/* Phase Widget */}
        <FullWidthRow>{renderPhaseWidget()}</FullWidthRow>

        {/* Today's Workout */}
        <div>{renderTodaysWorkout()}</div>

        {/* Corrective Homework */}
        <div>{renderHomeworkTracker()}</div>

        {/* Progress Timeline */}
        <FullWidthRow>{renderProgressTimeline()}</FullWidthRow>

        {/* Workout Logger */}
        <FullWidthRow>
          <WorkoutLogger />
        </FullWidthRow>
      </GridLayout>

      {renderHomeworkDialog()}
    </PageContainer>
  );
};

export default NASMClientDashboard;
