import React, { useState, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  Target,
  Trophy,
  Calendar,
  Plus,
  Edit,
  TrendingUp,
  Flag,
  Star,
  Award,
  CheckCircle,
  Circle,
  X
} from 'lucide-react';

// Import chart components
import ProgressAreaChart from '../../../FitnessStats/charts/ProgressAreaChart';

// Import proper type definitions
import type { GoalProgressTrackerProps } from './types';

// ─── Theme Tokens ───────────────────────────────────────────────────────────
const THEME = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'rgba(15,23,42,0.85)',
  border: 'rgba(14,165,233,0.2)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  accent: '#0ea5e9',
  cyan: '#00ffff',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#FF6B6B',
  purple: '#7851a9',
  muted: '#A0A0A0',
  surface: 'rgba(255,255,255,0.05)',
  glassBg: 'rgba(29,31,43,0.95)',
  glassBorder: 'rgba(14,165,233,0.15)',
};

// ─── Styled Components ──────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 0;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled.div<{ $accentColor: string }>`
  background: ${({ $accentColor }) => `${$accentColor}15`};
  border: 1px solid ${({ $accentColor }) => `${$accentColor}30`};
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(12px);
`;

const StatValue = styled.h4`
  font-size: 2rem;
  font-weight: 700;
  color: ${THEME.text};
  margin: 0;
  line-height: 1.2;
`;

const StatLabel = styled.span`
  font-size: 0.8rem;
  color: ${THEME.textSecondary};
`;

const GlassPanel = styled.div`
  background: ${THEME.glassBg};
  border: 1px solid ${THEME.glassBorder};
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(12px);
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

const PanelTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 600;
  color: ${THEME.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ControlsRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const StyledSelect = styled.select`
  background: ${THEME.surface};
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  color: ${THEME.text};
  padding: 8px 12px;
  font-size: 0.875rem;
  min-height: 44px;
  min-width: 130px;
  cursor: pointer;
  outline: none;
  appearance: auto;

  &:focus {
    border-color: ${THEME.accent};
    box-shadow: 0 0 0 2px rgba(14,165,233,0.15);
  }

  option {
    background: #1d1f2b;
    color: ${THEME.text};
  }
`;

const AccentButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${THEME.cyan};
  color: #0a0a1a;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: #33ffff;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,255,255,0.25);
  }

  &:active {
    transform: translateY(0);
  }
`;

const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: ${THEME.textSecondary};
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: ${THEME.surface};
    color: ${THEME.text};
    border-color: ${THEME.accent};
  }
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: ${THEME.textSecondary};
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  padding: 10px;
  transition: all 0.15s ease;

  &:hover {
    background: ${THEME.surface};
    color: ${THEME.accent};
  }
`;

// ─── Table Styled Components ────────────────────────────────────────────────

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead``;
const Tbody = styled.tbody``;

const Tr = styled.tr<{ $clickable?: boolean }>`
  border-bottom: 1px solid ${THEME.surface};
  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
      &:hover {
        background: ${THEME.surface};
      }
    `}
`;

const Th = styled.th`
  text-align: left;
  padding: 12px 16px;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${THEME.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 14px 16px;
  font-size: 0.875rem;
  color: ${THEME.text};
  vertical-align: middle;
`;

const CellTitle = styled.p`
  margin: 0;
  font-weight: 500;
  color: ${THEME.text};
  font-size: 0.9rem;
`;

const CellCaption = styled.span`
  font-size: 0.75rem;
  color: ${THEME.textSecondary};
`;

// ─── Chip / Badge ───────────────────────────────────────────────────────────

const Chip = styled.span<{ $bg?: string; $color?: string }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $bg }) => $bg || THEME.surface};
  color: ${({ $color }) => $color || THEME.text};
  white-space: nowrap;
`;

// ─── Progress Bar ───────────────────────────────────────────────────────────

const ProgressBarOuter = styled.div`
  width: 100px;
  height: 6px;
  background: ${THEME.surface};
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
`;

const ProgressBarFill = styled.div<{ $value: number; $color: string }>`
  width: ${({ $value }) => Math.min($value, 100)}%;
  height: 100%;
  background: ${({ $color }) => $color};
  border-radius: 3px;
  transition: width 0.4s ease;
`;

// ─── Modal / Dialog ─────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
`;

const ModalPanel = styled.div`
  background: ${THEME.glassBg};
  border: 1px solid ${THEME.glassBorder};
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  backdrop-filter: blur(16px);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid ${THEME.surface};
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${THEME.surface};
`;

// ─── Grid Layouts ───────────────────────────────────────────────────────────

const TwoColGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const AchievementsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const AchievementCard = styled.div<{ $earned: boolean }>`
  background: ${({ $earned }) => ($earned ? 'rgba(255,193,7,0.1)' : THEME.surface)};
  border: 1px solid ${({ $earned }) => ($earned ? 'rgba(255,193,7,0.2)' : THEME.glassBorder)};
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  opacity: ${({ $earned }) => ($earned ? 1 : 0.6)};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const AchievementTitle = styled.p`
  margin: 0;
  font-weight: 600;
  font-size: 0.875rem;
  color: ${THEME.text};
`;

const AchievementDesc = styled.span`
  font-size: 0.75rem;
  color: ${THEME.textSecondary};
  line-height: 1.4;
`;

// ─── Stepper / Timeline ─────────────────────────────────────────────────────

const StepperContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const StepItem = styled.div`
  display: flex;
  gap: 12px;
  position: relative;
`;

const StepIconCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 24px;
`;

const StepConnector = styled.div<{ $visible: boolean }>`
  flex: 1;
  width: 2px;
  background: ${({ $visible }) => ($visible ? THEME.border : 'transparent')};
  min-height: 16px;
`;

const StepContent = styled.div`
  padding-bottom: 20px;
`;

const StepTitle = styled.p`
  margin: 0 0 4px 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${THEME.text};
`;

const StepCaption = styled.span`
  font-size: 0.75rem;
  color: ${THEME.textSecondary};
  display: block;
  line-height: 1.6;
`;

const StepCaptionSuccess = styled(StepCaption)`
  color: ${THEME.success};
`;

const StepCaptionWarning = styled(StepCaption)`
  color: ${THEME.warning};
`;

// ─── Insight Box ────────────────────────────────────────────────────────────

const InsightBox = styled.div`
  margin-top: 24px;
  padding: 16px;
  background: ${THEME.surface};
  border-radius: 10px;
  border: 1px solid ${THEME.glassBorder};
`;

const InsightLabel = styled.span`
  font-size: 0.75rem;
  color: ${THEME.textSecondary};
  display: block;
  margin-bottom: 2px;
`;

const InsightValue = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${THEME.text};
  font-weight: 500;
`;

const InsightGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 12px;
`;

const SubTitle = styled.h4`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${THEME.text};
  margin: 0 0 12px 0;
`;

const OverdueCaption = styled.span`
  font-size: 0.75rem;
  color: ${THEME.error};
  display: block;
`;

const BodyText = styled.p`
  font-size: 0.875rem;
  color: ${THEME.text};
  margin: 0 0 12px 0;
  line-height: 1.6;
`;

/**
 * GoalProgressTracker Component
 *
 * Advanced goal tracking and milestone management for trainers including:
 * - SMART goal setting and tracking
 * - Milestone breakdown and progress
 * - Timeline visualization
 * - Achievement predictions
 * - Motivation and accountability tools
 */
const GoalProgressTracker: React.FC<GoalProgressTrackerProps> = ({
  clientId,
  clientData,
  onGoalUpdate
}) => {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalFilter, setGoalFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('active');

  // Generate comprehensive goal tracking data
  const goalTrackingData = useMemo(() => {
    if (!clientData) return null;

    return {
      summary: {
        totalGoals: 8,
        activeGoals: 5,
        completedGoals: 2,
        overdueGoals: 1,
        averageProgress: 67,
        onTrackGoals: 4
      },

      goals: [
        {
          id: 'goal-1',
          title: 'Lose 15 lbs',
          category: 'Weight Loss',
          type: 'measurable',
          status: 'active',
          priority: 'high',
          progress: 78,
          startDate: '2024-01-15',
          targetDate: '2024-08-15',
          completedDate: null,

          currentValue: 11.7,
          targetValue: 15,
          unit: 'lbs',

          milestones: [
            { id: 'm1', title: 'Lose 5 lbs', target: 5, current: 5, completed: true, date: '2024-03-15' },
            { id: 'm2', title: 'Lose 10 lbs', target: 10, current: 10, completed: true, date: '2024-05-20' },
            { id: 'm3', title: 'Lose 15 lbs', target: 15, current: 11.7, completed: false, estimatedDate: '2024-08-01' }
          ],

          progressHistory: [
            { date: '2024-01-15', value: 0 },
            { date: '2024-02-15', value: 2.5 },
            { date: '2024-03-15', value: 5 },
            { date: '2024-04-15', value: 7.2 },
            { date: '2024-05-15', value: 9.8 },
            { date: '2024-06-15', value: 11.7 }
          ],

          insights: {
            trend: 'positive',
            predictedCompletion: '2024-07-28',
            likelihood: 92,
            weeklyRate: 0.8,
            recommendation: 'Excellent progress! Current rate puts you ahead of schedule.'
          }
        },
        {
          id: 'goal-2',
          title: 'Bench Press 100kg',
          category: 'Strength',
          type: 'performance',
          status: 'active',
          priority: 'high',
          progress: 85,
          startDate: '2024-02-01',
          targetDate: '2024-07-01',
          completedDate: null,

          currentValue: 85,
          targetValue: 100,
          unit: 'kg',

          milestones: [
            { id: 'm1', title: '80kg Bench', target: 80, current: 80, completed: true, date: '2024-04-10' },
            { id: 'm2', title: '90kg Bench', target: 90, current: 85, completed: false, estimatedDate: '2024-06-15' },
            { id: 'm3', title: '100kg Bench', target: 100, current: 85, completed: false, estimatedDate: '2024-07-01' }
          ],

          progressHistory: [
            { date: '2024-02-01', value: 70 },
            { date: '2024-03-01', value: 75 },
            { date: '2024-04-01', value: 80 },
            { date: '2024-05-01', value: 82.5 },
            { date: '2024-06-01', value: 85 }
          ],

          insights: {
            trend: 'positive',
            predictedCompletion: '2024-07-15',
            likelihood: 87,
            weeklyRate: 1.2,
            recommendation: 'Strong progress. Consider periodization for final push.'
          }
        },
        {
          id: 'goal-3',
          title: 'Run 5K under 25 minutes',
          category: 'Cardiovascular',
          type: 'performance',
          status: 'active',
          priority: 'medium',
          progress: 60,
          startDate: '2024-03-01',
          targetDate: '2024-09-01',
          completedDate: null,

          currentValue: 27.5,
          targetValue: 25,
          unit: 'minutes',

          milestones: [
            { id: 'm1', title: 'Run 5K under 30min', target: 30, current: 27.5, completed: true, date: '2024-04-15' },
            { id: 'm2', title: 'Run 5K under 27min', target: 27, current: 27.5, completed: false, estimatedDate: '2024-07-15' },
            { id: 'm3', title: 'Run 5K under 25min', target: 25, current: 27.5, completed: false, estimatedDate: '2024-09-01' }
          ],

          progressHistory: [
            { date: '2024-03-01', value: 32 },
            { date: '2024-04-01', value: 30 },
            { date: '2024-05-01', value: 28.5 },
            { date: '2024-06-01', value: 27.5 }
          ],

          insights: {
            trend: 'positive',
            predictedCompletion: '2024-08-20',
            likelihood: 75,
            weeklyRate: 0.3,
            recommendation: 'Good progress. Increase interval training frequency.'
          }
        },
        {
          id: 'goal-4',
          title: 'Complete 10 Pull-ups',
          category: 'Strength',
          type: 'performance',
          status: 'completed',
          priority: 'medium',
          progress: 100,
          startDate: '2024-01-01',
          targetDate: '2024-05-01',
          completedDate: '2024-04-22',

          currentValue: 12,
          targetValue: 10,
          unit: 'reps',

          milestones: [
            { id: 'm1', title: '5 Pull-ups', target: 5, current: 5, completed: true, date: '2024-02-15' },
            { id: 'm2', title: '8 Pull-ups', target: 8, current: 8, completed: true, date: '2024-03-20' },
            { id: 'm3', title: '10 Pull-ups', target: 10, current: 12, completed: true, date: '2024-04-22' }
          ],

          insights: {
            trend: 'achieved',
            completedAhead: 9,
            likelihood: 100,
            recommendation: 'Goal exceeded! Consider weighted pull-ups next.'
          }
        },
        {
          id: 'goal-5',
          title: 'Hold 2-minute Plank',
          category: 'Core Strength',
          type: 'performance',
          status: 'overdue',
          priority: 'low',
          progress: 75,
          startDate: '2024-02-01',
          targetDate: '2024-06-01',
          completedDate: null,

          currentValue: 90,
          targetValue: 120,
          unit: 'seconds',

          milestones: [
            { id: 'm1', title: '60 second plank', target: 60, current: 60, completed: true, date: '2024-03-10' },
            { id: 'm2', title: '90 second plank', target: 90, current: 90, completed: true, date: '2024-05-15' },
            { id: 'm3', title: '120 second plank', target: 120, current: 90, completed: false, estimatedDate: '2024-07-15' }
          ],

          insights: {
            trend: 'stalled',
            predictedCompletion: '2024-07-15',
            likelihood: 65,
            recommendation: 'Progress has stalled. Review technique and add variation.'
          }
        }
      ],

      achievements: [
        {
          id: 'ach-1',
          title: 'First Milestone Master',
          description: 'Complete first milestone in 3 different goals',
          earned: true,
          date: '2024-03-20',
          icon: 'flag'
        },
        {
          id: 'ach-2',
          title: 'Consistency Champion',
          description: 'Make progress on goals for 4 consecutive weeks',
          earned: true,
          date: '2024-04-15',
          icon: 'calendar'
        },
        {
          id: 'ach-3',
          title: 'Overachiever',
          description: 'Complete a goal ahead of schedule',
          earned: true,
          date: '2024-04-22',
          icon: 'star'
        },
        {
          id: 'ach-4',
          title: 'Goal Crusher',
          description: 'Complete 5 goals',
          earned: false,
          progress: 40,
          icon: 'trophy'
        }
      ]
    };
  }, [clientData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'active': return '#00ffff';
      case 'overdue': return '#FF6B6B';
      case 'paused': return '#FFC107';
      default: return '#A0A0A0';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return '#A0A0A0';
    }
  };

  const filteredGoals = useMemo(() => {
    if (!goalTrackingData) return [];

    switch (goalFilter) {
      case 'active':
        return goalTrackingData.goals.filter(goal => goal.status === 'active');
      case 'completed':
        return goalTrackingData.goals.filter(goal => goal.status === 'completed');
      case 'overdue':
        return goalTrackingData.goals.filter(goal => goal.status === 'overdue');
      default:
        return goalTrackingData.goals;
    }
  }, [goalTrackingData, goalFilter]);

  const renderSummaryCards = () => {
    if (!goalTrackingData) return null;

    const { summary } = goalTrackingData;

    return (
      <SummaryGrid>
        <SummaryCard $accentColor={THEME.cyan}>
          <Target color="#00ffff" size={32} />
          <StatValue>{summary.totalGoals}</StatValue>
          <StatLabel>Total Goals</StatLabel>
        </SummaryCard>

        <SummaryCard $accentColor={THEME.success}>
          <TrendingUp color="#4CAF50" size={32} />
          <StatValue>{summary.activeGoals}</StatValue>
          <StatLabel>Active Goals</StatLabel>
        </SummaryCard>

        <SummaryCard $accentColor={THEME.warning}>
          <Trophy color="#FFC107" size={32} />
          <StatValue>{summary.completedGoals}</StatValue>
          <StatLabel>Completed</StatLabel>
        </SummaryCard>

        <SummaryCard $accentColor={THEME.purple}>
          <Star color="#7851a9" size={32} />
          <StatValue>{summary.averageProgress}%</StatValue>
          <StatLabel>Avg Progress</StatLabel>
        </SummaryCard>
      </SummaryGrid>
    );
  };

  const renderGoalsList = () => {
    if (!goalTrackingData) return null;

    return (
      <GlassPanel>
        <PanelHeader>
          <PanelTitle>Goal Tracking</PanelTitle>

          <ControlsRow>
            <StyledSelect
              value={goalFilter}
              onChange={(e) => setGoalFilter(e.target.value as any)}
            >
              <option value="all">All Goals</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </StyledSelect>

            <AccentButton onClick={() => setShowAddGoal(true)}>
              <Plus size={16} />
              Add Goal
            </AccentButton>
          </ControlsRow>
        </PanelHeader>

        <TableWrapper>
          <StyledTable>
            <Thead>
              <Tr>
                <Th>Goal</Th>
                <Th>Category</Th>
                <Th>Priority</Th>
                <Th>Progress</Th>
                <Th>Status</Th>
                <Th>Target Date</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredGoals.map((goal) => (
                <Tr key={goal.id} $clickable onClick={() => setSelectedGoal(goal.id)}>
                  <Td>
                    <div>
                      <CellTitle>{goal.title}</CellTitle>
                      <CellCaption>
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </CellCaption>
                    </div>
                  </Td>

                  <Td>
                    <Chip $bg="rgba(255, 255, 255, 0.1)">
                      {goal.category}
                    </Chip>
                  </Td>

                  <Td>
                    <Chip
                      $bg={getPriorityColor(goal.priority)}
                      $color="#fff"
                    >
                      {goal.priority}
                    </Chip>
                  </Td>

                  <Td>
                    <div style={{ width: 100 }}>
                      <ProgressBarOuter>
                        <ProgressBarFill $value={goal.progress} $color={getStatusColor(goal.status)} />
                      </ProgressBarOuter>
                      <CellCaption>{goal.progress}%</CellCaption>
                    </div>
                  </Td>

                  <Td>
                    <Chip
                      $bg={getStatusColor(goal.status)}
                      $color="#fff"
                    >
                      {goal.status}
                    </Chip>
                  </Td>

                  <Td>
                    <span style={{ fontSize: '0.875rem', color: THEME.text }}>
                      {new Date(goal.targetDate).toLocaleDateString()}
                    </span>
                    {goal.status === 'overdue' && (
                      <OverdueCaption>Overdue</OverdueCaption>
                    )}
                  </Td>

                  <Td>
                    <IconBtn onClick={(e) => { e.stopPropagation(); /* Edit goal */ }}>
                      <Edit size={16} />
                    </IconBtn>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </StyledTable>
        </TableWrapper>
      </GlassPanel>
    );
  };

  const renderGoalDetails = () => {
    if (!selectedGoal || !goalTrackingData) return null;

    const goal = goalTrackingData.goals.find(g => g.id === selectedGoal);
    if (!goal) return null;

    return (
      <Overlay onClick={() => setSelectedGoal(null)}>
        <ModalPanel onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <PanelTitle>{goal.title}</PanelTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Chip
                $bg={getStatusColor(goal.status)}
                $color="#fff"
              >
                {goal.progress}% Complete
              </Chip>
              <IconBtn onClick={() => setSelectedGoal(null)}>
                <X size={18} />
              </IconBtn>
            </div>
          </ModalHeader>

          <ModalBody>
            <TwoColGrid>
              <div>
                <SubTitle>Progress Timeline</SubTitle>

                <StepperContainer>
                  {goal.milestones.map((milestone, index) => (
                    <StepItem key={milestone.id}>
                      <StepIconCol>
                        {milestone.completed ? (
                          <CheckCircle size={20} color="#4CAF50" />
                        ) : (
                          <Circle size={20} color="#FFC107" />
                        )}
                        <StepConnector $visible={index < goal.milestones.length - 1} />
                      </StepIconCol>
                      <StepContent>
                        <StepTitle>{milestone.title}</StepTitle>
                        <StepCaption>
                          Target: {milestone.target} {goal.unit} | Current: {milestone.current} {goal.unit}
                        </StepCaption>
                        {milestone.completed && milestone.date && (
                          <StepCaptionSuccess>
                            Completed: {new Date(milestone.date).toLocaleDateString()}
                          </StepCaptionSuccess>
                        )}
                        {!milestone.completed && milestone.estimatedDate && (
                          <StepCaptionWarning>
                            Estimated: {new Date(milestone.estimatedDate).toLocaleDateString()}
                          </StepCaptionWarning>
                        )}
                      </StepContent>
                    </StepItem>
                  ))}
                </StepperContainer>
              </div>

              <div>
                <SubTitle>Progress Chart</SubTitle>

                <ProgressAreaChart
                  data={goal.progressHistory.map(point => ({
                    date: point.date,
                    progress: (point.value / goal.targetValue) * 100
                  }))}
                  xKey="date"
                  yKeys={[{ key: 'progress', name: 'Progress %', color: getStatusColor(goal.status) }]}
                  height={200}
                />

                <InsightBox>
                  <SubTitle>AI Insights</SubTitle>
                  <BodyText>{goal.insights.recommendation}</BodyText>
                  <InsightGrid>
                    <div>
                      <InsightLabel>Predicted Completion</InsightLabel>
                      <InsightValue>
                        {new Date(goal.insights.predictedCompletion).toLocaleDateString()}
                      </InsightValue>
                    </div>
                    <div>
                      <InsightLabel>Success Likelihood</InsightLabel>
                      <InsightValue>{goal.insights.likelihood}%</InsightValue>
                    </div>
                  </InsightGrid>
                </InsightBox>
              </div>
            </TwoColGrid>
          </ModalBody>

          <ModalFooter>
            <GhostButton onClick={() => setSelectedGoal(null)}>Close</GhostButton>
            <AccentButton>Update Progress</AccentButton>
          </ModalFooter>
        </ModalPanel>
      </Overlay>
    );
  };

  const renderAchievements = () => {
    if (!goalTrackingData) return null;

    return (
      <GlassPanel>
        <PanelTitle style={{ marginBottom: 16 }}>
          <Award color="#FFC107" size={20} />
          Achievements &amp; Badges
        </PanelTitle>

        <AchievementsGrid>
          {goalTrackingData.achievements.map((achievement) => (
            <AchievementCard key={achievement.id} $earned={achievement.earned}>
              <div>
                {achievement.icon === 'trophy' && <Trophy color={achievement.earned ? '#FFC107' : '#A0A0A0'} size={32} />}
                {achievement.icon === 'star' && <Star color={achievement.earned ? '#FFC107' : '#A0A0A0'} size={32} />}
                {achievement.icon === 'flag' && <Flag color={achievement.earned ? '#FFC107' : '#A0A0A0'} size={32} />}
                {achievement.icon === 'calendar' && <Calendar color={achievement.earned ? '#FFC107' : '#A0A0A0'} size={32} />}
              </div>

              <AchievementTitle>{achievement.title}</AchievementTitle>

              <AchievementDesc>{achievement.description}</AchievementDesc>

              {achievement.earned ? (
                <Chip $bg="#4CAF50" $color="#fff" style={{ marginTop: 4 }}>
                  Earned {new Date(achievement.date!).toLocaleDateString()}
                </Chip>
              ) : achievement.progress !== undefined ? (
                <div style={{ width: '100%', marginTop: 8 }}>
                  <ProgressBarOuter style={{ width: '100%' }}>
                    <ProgressBarFill $value={achievement.progress} $color={THEME.accent} />
                  </ProgressBarOuter>
                  <CellCaption>{achievement.progress}% complete</CellCaption>
                </div>
              ) : (
                <Chip $bg="rgba(255, 255, 255, 0.1)" style={{ marginTop: 4 }}>
                  Locked
                </Chip>
              )}
            </AchievementCard>
          ))}
        </AchievementsGrid>
      </GlassPanel>
    );
  };

  return (
    <Container>
      {renderSummaryCards()}
      {renderGoalsList()}
      {renderAchievements()}
      {renderGoalDetails()}
    </Container>
  );
};

export default GoalProgressTracker;
