/**
 * ┌─── SUB-COMPONENT: ClientProgressDashboard ─────────────────┐
 * │ PARENT: EnhancedAdminClientManagementView (Progress tab)    │
 * │ PURPOSE: Visual progress tracking — charts, milestones, body│
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-21        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────────────┐
 * │ [📊 Weight Trend] [💪 Strength] [📈 Body Comp]     │ ChartCards
 * │ [Line chart — weight over time]                      │
 * │ [Milestones: ★ PR Bench 185lbs  ★ Lost 10lbs]      │
 * │ [Body comp radial: Fat% / Muscle% / Water%]          │
 * └──────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { clientId, progressData }
 * State:     { chartView, dateRange, milestones[] }
 * Charts:    Currently Recharts (TODO: migrate to Victory per CLAUDE.md)
 *
 * Theme: Crystalline Swan (NOT Crystalline Swan — RETIRED)
 * NOTE: 1,256 lines — exceeds 300-line rule. TODO: extract chart sections
 */

import React, { useState, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  TrendingUp,
  TrendingDown,
  Dumbbell,
  Bike,
  Scale,
  Sparkles,
  CheckCircle2,
  Circle,
  Star,
  PartyPopper,
  ArrowUp,
  ArrowDown,
  Minus,
  Camera,
  ClipboardList,
  RefreshCw,
  Download,
  Plus,
  Activity
} from 'lucide-react';
import ClientProgressCharts from '../../../../ClientProgressCharts/ClientProgressCharts';
// Victory chart components (migrated from Recharts)
import {
  VictoryChart, VictoryLine,
  VictoryAxis, VictoryTooltip, VictoryVoronoiContainer, VictoryLegend,
} from 'victory';

// ─── Theme tokens ────────────────────────────────────────────────
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'rgba(15,23,42,0.85)',
  border: 'rgba(14,165,233,0.2)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  cyan: '#60C0F0',
  purple: '#8B5CF6',
  green: '#4caf50',
  orange: '#ff9800',
  red: '#f44336',
  gold: '#ffd700',
  glass: 'rgba(255,255,255,0.03)',
  glassBorder: 'rgba(255,255,255,0.1)',
};

// ─── Interfaces ──────────────────────────────────────────────────
interface MilestoneItem {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: 'completed' | 'in-progress' | 'not-started';
  completedDate?: string;
  estimatedCompletion?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'strength' | 'endurance' | 'flexibility' | 'weight' | 'measurement';
  reward?: {
    type: 'badge' | 'points' | 'unlock';
    value: string;
    icon: string;
  };
}

interface AssessmentMetric {
  id: string;
  name: string;
  value: number;
  previousValue: number;
  maxValue: number;
  unit: string;
  category: 'strength' | 'endurance' | 'flexibility' | 'balance' | 'coordination';
  lastMeasured: string;
  improvement: number;
  percentile: number;
}

interface WorkoutSummary {
  id: string;
  date: string;
  type: string;
  duration: number;
  caloriesBurned: number;
  exerciseCount: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  ratingOfPerceivedExertion: number;
  notes?: string;
  completedExercises: number;
  totalExercises: number;
}

interface BodyMeasurement {
  id: string;
  type: 'weight' | 'body_fat' | 'muscle_mass' | 'measurements';
  value: number;
  unit: string;
  date: string;
  bodyPart?: string;
  trend: 'up' | 'down' | 'stable';
  percentChange: number;
}

// ─── Keyframes ───────────────────────────────────────────────────
type Timeframe = '7d' | '30d' | '90d' | '1y';

interface VictoryTooltipDatum {
  month?: string;
  week?: string;
  _y?: number;
}

const isTimeframe = (value: string): value is Timeframe =>
  value === '7d' || value === '30d' || value === '90d' || value === '1y';

// ─── Styled Components ──────────────────────────────────────────
const DashboardWrapper = styled.div`
  padding: 24px;
  color: ${theme.text};
`;

const SectionHeader = styled.div`
  margin-bottom: 32px;
`;

const PageTitle = styled.h2`
  color: ${theme.cyan};
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 8px 0;
`;

const PageSubtitle = styled.p`
  color: ${theme.textMuted};
  font-size: 1rem;
  margin: 0;
`;

const ControlsRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 24px;
`;

const ControlsRight = styled.div`
  margin-left: auto;
  display: flex;
  gap: 8px;
`;

const NativeSelect = styled.select`
  background: rgba(255,255,255,0.05);
  color: ${theme.text};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  padding: 8px 32px 8px 12px;
  font-size: 0.875rem;
  min-height: 44px;
  min-width: 140px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${theme.cyan};
  }

  option {
    background: #1e293b;
    color: ${theme.text};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0;

  & > button:first-child {
    border-radius: 8px 0 0 8px;
  }
  & > button:last-child {
    border-radius: 0 8px 8px 0;
  }
  & > button:not(:first-child):not(:last-child) {
    border-radius: 0;
  }
  & > button + button {
    margin-left: -1px;
  }
`;

const ActionButton = styled.button<{
  $variant?: 'contained' | 'outlined';
  $active?: boolean;
  $disabled?: boolean;
  $size?: 'small' | 'medium';
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: ${({ $size }) => $size === 'small' ? '6px 16px' : '10px 20px'};
  font-size: ${({ $size }) => $size === 'small' ? '0.8125rem' : '0.875rem'};
  font-weight: 600;
  border-radius: 8px;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  white-space: nowrap;
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};
  font-family: inherit;

  ${({ $variant, $active }) => {
    if ($variant === 'contained' || $active) {
      return css`
        background: linear-gradient(135deg, #60C0F0, #00c8ff);
        color: #002060;
        border: 1px solid transparent;
        &:hover:not(:disabled) {
          background: linear-gradient(135deg, #00e6ff, #00b3ff);
          box-shadow: 0 4px 16px rgba(139, 92, 246,0.3);
        }
      `;
    }
    return css`
      background: transparent;
      color: ${theme.cyan};
      border: 1px solid rgba(139, 92, 246,0.5);
      &:hover:not(:disabled) {
        border-color: ${theme.cyan};
        background: rgba(139, 92, 246,0.1);
      }
    `;
  }}
`;

const GlassPanel = styled.div<{ $noPadding?: boolean; $textAlign?: 'left' | 'center' }>`
  background: linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.05));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid ${theme.glassBorder};
  position: relative;
  overflow: hidden;
  padding: ${({ $noPadding }) => $noPadding ? '0' : '24px'};
  text-align: ${({ $textAlign }) => $textAlign || 'left'};
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #60C0F0, #8B5CF6, #ff1744);
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(139, 92, 246,0.15);
  }
`;

const CardPanel = styled.div<{ $completed?: boolean }>`
  background: ${({ $completed }) =>
    $completed ? 'rgba(76,175,80,0.1)' : 'rgba(255,255,255,0.02)'};
  border: 1px solid ${({ $completed }) =>
    $completed ? 'rgba(76,175,80,0.5)' : theme.glassBorder};
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(139, 92, 246,0.1);
  }
`;

const DarkCard = styled.div`
  background: #1d1f2b;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid ${theme.glassBorder};
`;

const MetricBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px;
  border-radius: 12px;
  background: ${theme.glass};
  border: 1px solid ${theme.glassBorder};
`;

const GridRow2Col = styled.div<{ $ratio?: string }>`
  display: grid;
  grid-template-columns: ${({ $ratio }) => $ratio || '2fr 1fr'};
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Grid3Col = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Grid4Col = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const OverviewGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const SectionTitle = styled.h3`
  color: ${theme.cyan};
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
`;

const SectionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const FlexRow = styled.div<{
  $gap?: number;
  $justify?: string;
  $align?: string;
  $wrap?: boolean;
  $mt?: number;
  $mb?: number;
}>`
  display: flex;
  gap: ${({ $gap }) => $gap ?? 8}px;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'center'};
  flex-wrap: ${({ $wrap }) => $wrap ? 'wrap' : 'nowrap'};
  margin-top: ${({ $mt }) => ($mt != null ? `${$mt}px` : 0)};
  margin-bottom: ${({ $mb }) => ($mb != null ? `${$mb}px` : 0)};
`;

const FlexCol = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap ?? 16}px;
`;

const StatusAvatar = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin-left: 16px;
`;

const ChipTag = styled.span<{ $color?: string; $bgColor?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ $bgColor }) => $bgColor || 'rgba(14,165,233,0.15)'};
  color: ${({ $color }) => $color || theme.accent};
  white-space: nowrap;
  min-height: 28px;
`;

const DifficultyChip = styled.span<{ $difficulty: 'easy' | 'medium' | 'hard' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  min-height: 28px;

  ${({ $difficulty }) => {
    if ($difficulty === 'easy') return css`background: rgba(76,175,80,0.15); color: ${theme.green};`;
    if ($difficulty === 'medium') return css`background: rgba(255,152,0,0.15); color: ${theme.orange};`;
    return css`background: rgba(244,67,54,0.15); color: ${theme.red};`;
  }}
`;

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $width: number; $color?: string }>`
  height: 100%;
  border-radius: 4px;
  background: ${({ $color }) => $color || theme.cyan};
  width: ${({ $width }) => Math.min(100, Math.max(0, $width))}%;
  transition: width 0.6s ease;
`;

const RewardBox = styled.div`
  padding: 12px;
  background: rgba(255,215,0,0.1);
  border-radius: 8px;
  margin-bottom: 12px;
`;

const AchievementPanel = styled.div`
  padding: 16px;
  background: rgba(76,175,80,0.1);
  border: 1px solid rgba(76,175,80,0.3);
  border-radius: 12px;
  text-align: center;
`;

const RewardChip = styled.span`
  display: inline-block;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 0.8125rem;
  font-weight: 500;
  background: rgba(255,215,0,0.2);
  color: ${theme.gold};
  margin-top: 8px;
`;

const ChartBox = styled.div`
  height: 300px;
`;

const LabelSmall = styled.span<{ $color?: string; $block?: boolean; $mt?: number }>`
  font-size: 0.75rem;
  color: ${({ $color }) => $color || theme.textMuted};
  display: ${({ $block }) => ($block ? 'block' : 'inline')};
  margin-top: ${({ $mt }) => ($mt != null ? `${$mt}px` : 0)};
`;

const LabelBody = styled.p<{ $color?: string }>`
  font-size: 0.875rem;
  color: ${({ $color }) => $color || theme.textMuted};
  margin: 0 0 4px 0;
`;

const ValueLarge = styled.span<{ $color?: string }>`
  font-size: 2rem;
  font-weight: 700;
  color: ${({ $color }) => $color || theme.cyan};
`;

const ValueXL = styled.span<{ $color?: string }>`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${({ $color }) => $color || theme.cyan};
  line-height: 1;
`;

const ValueMedium = styled.span<{ $color?: string }>`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ $color }) => $color || theme.text};
`;

const Heading6 = styled.h4<{ $color?: string; $capitalize?: boolean; $mb?: number }>`
  font-size: 1.125rem;
  font-weight: 600;
  color: ${({ $color }) => $color || theme.text};
  margin: 0 0 ${({ $mb }) => $mb ?? 8}px 0;
  text-transform: ${({ $capitalize }) => $capitalize ? 'capitalize' : 'none'};
`;

const BodyText = styled.span<{ $color?: string; $weight?: number; $block?: boolean }>`
  font-size: 0.875rem;
  color: ${({ $color }) => $color || theme.text};
  font-weight: ${({ $weight }) => $weight || 400};
  display: ${({ $block }) => $block ? 'block' : 'inline'};
`;

const ProgressRing = styled.svg`
  transform: rotate(-90deg);
`;

const ProgressRingBg = styled.circle`
  fill: none;
  stroke: rgba(255,255,255,0.1);
`;

const ProgressRingFill = styled.circle<{ $dashoffset: number }>`
  fill: none;
  stroke: ${theme.cyan};
  stroke-linecap: round;
  stroke-dasharray: 283;
  stroke-dashoffset: ${({ $dashoffset }) => $dashoffset};
  transition: stroke-dashoffset 0.8s ease;
`;

const ProgressRingWrapper = styled.div`
  position: relative;
  display: inline-flex;
  margin-bottom: 16px;
`;

const ProgressRingLabel = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const SpacerV = styled.div<{ $size?: number }>`
  height: ${({ $size }) => $size ?? 16}px;
`;

const MilestoneContent = styled.div`
  flex: 1;
`;

const MetricSection = styled.div<{ $mb?: number }>`
  margin-bottom: ${({ $mb }) => $mb ?? 16}px;
`;

const ChartSection = styled.div`
  margin-bottom: 32px;
`;

const PreviewNotice = styled.div`
  background: rgba(198, 168, 75, 0.1);
  border: 1px solid rgba(198, 168, 75, 0.3);
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #c6a84b;
  font-family: 'Sora', sans-serif;
`;

const AchievementIcon = styled(PartyPopper)`
  margin-bottom: 8px;
`;

const chartAxisStyleProps = {
  style: {
    axis: { stroke: '#E0ECF4' },
    tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
    grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
  },
};

const measurementAxisStyleProps = {
  style: {
    axis: { stroke: '#E0ECF4' },
    tickLabels: { fill: '#E0ECF4', fontSize: 10, fontFamily: "'Fira Code', monospace" },
    grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
  },
};

const chartTooltipProps = {
  style: { fill: '#E0ECF4', fontFamily: "'Fira Code', monospace", fontSize: 10 },
  flyoutStyle: { fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' },
};

const chartLegendStyleProps = {
  style: {
    labels: { fill: '#E0ECF4', fontSize: 9, fontFamily: "'Sora', sans-serif" },
  },
};

const overallLineStyleProps = { style: { data: { stroke: '#60C0F0', strokeWidth: 3 } } };
const strengthLineStyleProps = { style: { data: { stroke: '#ff6b6b', strokeWidth: 2 } } };
const enduranceLineStyleProps = { style: { data: { stroke: '#4ECDC4', strokeWidth: 2 } } };
const flexibilityLineStyleProps = { style: { data: { stroke: '#C6A84B', strokeWidth: 2 } } };

// ─── Component ───────────────────────────────────────────────────
interface ClientProgressDashboardProps {
  clientId: string;
  onMilestoneUpdate?: (milestoneId: string, completed: boolean) => void;
  onAssessmentSchedule?: () => void;
}

const ClientProgressDashboard: React.FC<ClientProgressDashboardProps> = ({
  clientId,
  onMilestoneUpdate: _onMilestoneUpdate,
  onAssessmentSchedule
}) => {
  // State management
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('30d');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'measurements'>('overview');

  // Mock data for demonstration
  const mockMilestones = useMemo<MilestoneItem[]>(() => [
    {
      id: '1',
      title: 'First 5K Run',
      description: 'Complete a 5K run without stopping',
      targetValue: 5,
      currentValue: 3.2,
      unit: 'km',
      status: 'in-progress',
      estimatedCompletion: '2024-12-20',
      difficulty: 'medium',
      category: 'endurance',
      reward: {
        type: 'badge',
        value: 'Running Rookie',
        icon: '/badges/running.png'
      }
    },
    {
      id: '2',
      title: 'Bench Press Body Weight',
      description: 'Bench press your own body weight',
      targetValue: 80,
      currentValue: 80,
      unit: 'kg',
      status: 'completed',
      completedDate: '2024-12-05',
      difficulty: 'hard',
      category: 'strength',
      reward: {
        type: 'points',
        value: '500',
        icon: '/icons/strength.png'
      }
    },
    {
      id: '3',
      title: 'Lost 5kg',
      description: 'Reach target weight reduction',
      targetValue: 5,
      currentValue: 3.5,
      unit: 'kg',
      status: 'in-progress',
      estimatedCompletion: '2024-12-30',
      difficulty: 'medium',
      category: 'weight',
      reward: {
        type: 'unlock',
        value: 'Advanced Nutrition Plan',
        icon: '/icons/nutrition.png'
      }
    }
  ], []);

  const mockAssessments = useMemo<AssessmentMetric[]>(() => [
    {
      id: '1',
      name: 'Overall Fitness',
      value: 8.7,
      previousValue: 7.2,
      maxValue: 10,
      unit: 'score',
      category: 'endurance',
      lastMeasured: '2024-12-01',
      improvement: 20.8,
      percentile: 92
    },
    {
      id: '2',
      name: 'Upper Body Strength',
      value: 9.1,
      previousValue: 8.5,
      maxValue: 10,
      unit: 'score',
      category: 'strength',
      lastMeasured: '2024-12-01',
      improvement: 7.1,
      percentile: 95
    },
    {
      id: '3',
      name: 'Flexibility',
      value: 7.8,
      previousValue: 7.1,
      maxValue: 10,
      unit: 'score',
      category: 'flexibility',
      lastMeasured: '2024-12-01',
      improvement: 9.9,
      percentile: 78
    },
    {
      id: '4',
      name: 'Balance',
      value: 8.3,
      previousValue: 7.9,
      maxValue: 10,
      unit: 'score',
      category: 'balance',
      lastMeasured: '2024-12-01',
      improvement: 5.1,
      percentile: 85
    }
  ], []);

  const mockWorkouts: WorkoutSummary[] = [
    {
      id: '1',
      date: '2024-12-10',
      type: 'Strength Training',
      duration: 65,
      caloriesBurned: 380,
      exerciseCount: 8,
      avgHeartRate: 135,
      maxHeartRate: 165,
      ratingOfPerceivedExertion: 7,
      completedExercises: 8,
      totalExercises: 8
    },
    {
      id: '2',
      date: '2024-12-08',
      type: 'Cardio',
      duration: 45,
      caloriesBurned: 520,
      exerciseCount: 3,
      avgHeartRate: 145,
      maxHeartRate: 175,
      ratingOfPerceivedExertion: 8,
      completedExercises: 3,
      totalExercises: 3
    },
    {
      id: '3',
      date: '2024-12-06',
      type: 'Yoga/Flexibility',
      duration: 50,
      caloriesBurned: 180,
      exerciseCount: 12,
      ratingOfPerceivedExertion: 5,
      completedExercises: 12,
      totalExercises: 12
    }
  ];

  const mockMeasurements: BodyMeasurement[] = [
    {
      id: '1',
      type: 'weight',
      value: 77.5,
      unit: 'kg',
      date: '2024-12-10',
      trend: 'down',
      percentChange: -2.1
    },
    {
      id: '2',
      type: 'body_fat',
      value: 12.5,
      unit: '%',
      date: '2024-12-10',
      trend: 'down',
      percentChange: -8.5
    },
    {
      id: '3',
      type: 'muscle_mass',
      value: 72.3,
      unit: 'kg',
      date: '2024-12-10',
      trend: 'up',
      percentChange: 3.2
    }
  ];

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const completedMilestones = mockMilestones.filter(m => m.status === 'completed').length;
    const totalMilestones = mockMilestones.length;
    const avgAssessmentScore = mockAssessments.reduce((sum, a) => sum + a.value, 0) / mockAssessments.length;
    const avgImprovement = mockAssessments.reduce((sum, a) => sum + a.improvement, 0) / mockAssessments.length;

    return {
      milestoneCompletion: (completedMilestones / totalMilestones) * 100,
      avgAssessmentScore: (avgAssessmentScore / 10) * 100,
      avgImprovement,
      overallScore: ((completedMilestones / totalMilestones) * 40 + (avgAssessmentScore / 10) * 60)
    };
  }, [mockMilestones, mockAssessments]);

  // Helper: category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'strength': return <Dumbbell size={14} />;
      case 'endurance': return <Bike size={14} />;
      case 'weight': return <Scale size={14} />;
      default: return <Sparkles size={14} />;
    }
  };

  // Helper: status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={22} />;
      case 'in-progress': return <Activity size={22} />;
      default: return <Circle size={22} />;
    }
  };

  // Helper: status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.green;
      case 'in-progress': return theme.orange;
      default: return '#666';
    }
  };

  // Circular progress ring SVG helper
  const CircularProgress: React.FC<{ value: number; size?: number }> = ({ value, size = 100 }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    return (
      <ProgressRingWrapper>
        <ProgressRing width={size} height={size} viewBox="0 0 100 100">
          <ProgressRingBg cx="50" cy="50" r={radius} strokeWidth="6" />
          <ProgressRingFill
            cx="50" cy="50" r={radius}
            strokeWidth="6"
            $dashoffset={offset}
          />
        </ProgressRing>
        <ProgressRingLabel>
          <ValueLarge $color={theme.cyan}>
            {Math.round(value)}%
          </ValueLarge>
        </ProgressRingLabel>
      </ProgressRingWrapper>
    );
  };

  // Render milestone section
  const renderMilestones = () => (
    <div>
      <SectionRow>
        <SectionTitle>Current Milestones</SectionTitle>
        <ActionButton $variant="outlined">
          <Plus size={16} />
          Add Milestone
        </ActionButton>
      </SectionRow>

      <Grid3Col>
        {mockMilestones.map((milestone) => (
          <CardPanel $completed={milestone.status === 'completed'} key={milestone.id}>
            <FlexRow $justify="space-between" $align="flex-start" $mb={16}>
              <MilestoneContent>
                <Heading6>{milestone.title}</Heading6>
                <LabelBody>{milestone.description}</LabelBody>
                <FlexRow $gap={8} $mt={8}>
                  <ChipTag>
                    {getCategoryIcon(milestone.category)}
                    {milestone.category}
                  </ChipTag>
                  <DifficultyChip $difficulty={milestone.difficulty}>
                    {milestone.difficulty}
                  </DifficultyChip>
                </FlexRow>
              </MilestoneContent>
              <StatusAvatar $color={getStatusColor(milestone.status)}>
                {getStatusIcon(milestone.status)}
              </StatusAvatar>
            </FlexRow>

            <MetricSection>
              <FlexRow $justify="space-between" $mb={8}>
                <LabelBody>Progress</LabelBody>
                <BodyText $weight={600}>
                  {milestone.currentValue}/{milestone.targetValue} {milestone.unit}
                </BodyText>
              </FlexRow>
              <ProgressBarTrack>
                <ProgressBarFill
                  $width={(milestone.currentValue / milestone.targetValue) * 100}
                  $color={milestone.status === 'completed' ? theme.green : theme.cyan}
                />
              </ProgressBarTrack>
            </MetricSection>

            {milestone.reward && (
              <RewardBox>
                <LabelSmall>Reward: {milestone.reward.type}</LabelSmall>
                <BodyText $color={theme.gold} $weight={600} $block>
                  {milestone.reward.value}
                </BodyText>
              </RewardBox>
            )}

            <FlexRow $justify="space-between">
              {milestone.status === 'completed' ? (
                <LabelSmall $color={theme.green}>
                  Completed on {new Date(milestone.completedDate!).toLocaleDateString()}
                </LabelSmall>
              ) : (
                <LabelSmall>
                  Est. completion: {milestone.estimatedCompletion}
                </LabelSmall>
              )}
              <ActionButton
                $variant="outlined"
                $size="small"
                $disabled={milestone.status === 'completed'}
                disabled={milestone.status === 'completed'}
              >
                {milestone.status === 'completed' ? 'Completed' : 'Track Progress'}
              </ActionButton>
            </FlexRow>
          </CardPanel>
        ))}
      </Grid3Col>
    </div>
  );

  // Render assessments section
  const renderAssessments = () => (
    <div>
      <SectionRow>
        <SectionTitle>Fitness Assessments</SectionTitle>
        <ActionButton $variant="outlined" onClick={onAssessmentSchedule}>
          <ClipboardList size={16} />
          Schedule Assessment
        </ActionButton>
      </SectionRow>

      <GridRow2Col>
        <DarkCard>
          <Heading6>Assessment Scores Over Time</Heading6>
          <ChartBox>
            <VictoryChart height={250} padding={{ top: 30, bottom: 40, left: 50, right: 20 }} domain={{ y: [5, 10] }}
              containerComponent={<VictoryVoronoiContainer labels={({ datum }: { datum: VictoryTooltipDatum }) => `${datum.month}: ${datum._y?.toFixed(1)}`} labelComponent={<VictoryTooltip {...chartTooltipProps} />} />}
            >
              <VictoryAxis {...chartAxisStyleProps} />
              <VictoryAxis dependentAxis {...chartAxisStyleProps} />
              <VictoryLine data={Array.from({ length: 6 }, (_, i) => ({ month: `Month ${i + 1}`, overall: 6 + (i * 0.4) + Math.random() * 0.5, strength: 6.5 + (i * 0.3) + Math.random() * 0.4, endurance: 5.8 + (i * 0.5) + Math.random() * 0.3, flexibility: 6.2 + (i * 0.25) + Math.random() * 0.4 }))} x="month" y="overall" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...overallLineStyleProps} />
              <VictoryLine data={Array.from({ length: 6 }, (_, i) => ({ month: `Month ${i + 1}`, overall: 6 + (i * 0.4) + Math.random() * 0.5, strength: 6.5 + (i * 0.3) + Math.random() * 0.4, endurance: 5.8 + (i * 0.5) + Math.random() * 0.3, flexibility: 6.2 + (i * 0.25) + Math.random() * 0.4 }))} x="month" y="strength" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...strengthLineStyleProps} />
              <VictoryLine data={Array.from({ length: 6 }, (_, i) => ({ month: `Month ${i + 1}`, overall: 6 + (i * 0.4) + Math.random() * 0.5, strength: 6.5 + (i * 0.3) + Math.random() * 0.4, endurance: 5.8 + (i * 0.5) + Math.random() * 0.3, flexibility: 6.2 + (i * 0.25) + Math.random() * 0.4 }))} x="month" y="endurance" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...enduranceLineStyleProps} />
              <VictoryLine data={Array.from({ length: 6 }, (_, i) => ({ month: `Month ${i + 1}`, overall: 6 + (i * 0.4) + Math.random() * 0.5, strength: 6.5 + (i * 0.3) + Math.random() * 0.4, endurance: 5.8 + (i * 0.5) + Math.random() * 0.3, flexibility: 6.2 + (i * 0.25) + Math.random() * 0.4 }))} x="month" y="flexibility" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...flexibilityLineStyleProps} />
              <VictoryLegend x={60} y={5} orientation="horizontal" {...chartLegendStyleProps} data={[{ name: 'Overall', symbol: { fill: '#60C0F0' } }, { name: 'Strength', symbol: { fill: '#ff6b6b' } }, { name: 'Endurance', symbol: { fill: '#4ECDC4' } }, { name: 'Flexibility', symbol: { fill: '#C6A84B' } }]} />
            </VictoryChart>
          </ChartBox>
        </DarkCard>

        <FlexCol $gap={16}>
          {mockAssessments.map((assessment) => (
            <MetricBox key={assessment.id}>
              <FlexRow $gap={8} $justify="center" $mb={8}>
                <ValueLarge $color={theme.cyan}>
                  {assessment.value}
                </ValueLarge>
                <ValueMedium $color={theme.textMuted}>
                  /{assessment.maxValue}
                </ValueMedium>
              </FlexRow>
              <LabelBody>{assessment.name}</LabelBody>
              <FlexRow $gap={6} $justify="center" $mb={8}>
                {assessment.improvement > 0 ? (
                  <TrendingUp size={16} color={theme.green} />
                ) : (
                  <TrendingDown size={16} color={theme.red} />
                )}
                <LabelSmall $color={assessment.improvement > 0 ? theme.green : theme.red}>
                  {Math.abs(assessment.improvement)}% improvement
                </LabelSmall>
              </FlexRow>
              <ProgressBarTrack>
                <ProgressBarFill $width={(assessment.value / assessment.maxValue) * 100} />
              </ProgressBarTrack>
              <SpacerV $size={8} />
              <LabelSmall>{assessment.percentile}th percentile</LabelSmall>
            </MetricBox>
          ))}
        </FlexCol>
      </GridRow2Col>
    </div>
  );

  // Render measurements section
  const renderMeasurements = () => (
    <div>
      <SectionRow>
        <SectionTitle>Body Measurements &amp; Composition</SectionTitle>
        <ActionButton $variant="outlined">
          <Camera size={16} />
          Add Measurement
        </ActionButton>
      </SectionRow>

      <GridRow2Col>
        <DarkCard>
          <Heading6>Measurement Trends</Heading6>
          <ChartBox>
            <VictoryChart height={250} padding={{ top: 30, bottom: 40, left: 50, right: 20 }}
              containerComponent={<VictoryVoronoiContainer labels={({ datum }: { datum: VictoryTooltipDatum }) => `${datum.week}: ${datum._y?.toFixed(1)}`} labelComponent={<VictoryTooltip {...chartTooltipProps} />} />}
            >
              <VictoryAxis {...measurementAxisStyleProps} />
              <VictoryAxis dependentAxis {...chartAxisStyleProps} />
              <VictoryLine data={Array.from({ length: 12 }, (_, i) => ({ week: `Wk ${i + 1}`, weight: 82 - (i * 0.3) + Math.random() * 0.5, bodyFat: 16 - (i * 0.2) + Math.random() * 0.3, muscleMass: 68 + (i * 0.3) + Math.random() * 0.2 }))} x="week" y="weight" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...overallLineStyleProps} />
              <VictoryLine data={Array.from({ length: 12 }, (_, i) => ({ week: `Wk ${i + 1}`, weight: 82 - (i * 0.3) + Math.random() * 0.5, bodyFat: 16 - (i * 0.2) + Math.random() * 0.3, muscleMass: 68 + (i * 0.3) + Math.random() * 0.2 }))} x="week" y="bodyFat" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...strengthLineStyleProps} />
              <VictoryLine data={Array.from({ length: 12 }, (_, i) => ({ week: `Wk ${i + 1}`, weight: 82 - (i * 0.3) + Math.random() * 0.5, bodyFat: 16 - (i * 0.2) + Math.random() * 0.3, muscleMass: 68 + (i * 0.3) + Math.random() * 0.2 }))} x="week" y="muscleMass" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...enduranceLineStyleProps} />
              <VictoryLegend x={60} y={5} orientation="horizontal" {...chartLegendStyleProps} data={[{ name: 'Weight (kg)', symbol: { fill: '#60C0F0' } }, { name: 'Body Fat (%)', symbol: { fill: '#ff6b6b' } }, { name: 'Muscle Mass (kg)', symbol: { fill: '#4ECDC4' } }]} />
            </VictoryChart>
          </ChartBox>
        </DarkCard>

        <FlexCol $gap={16}>
          {mockMeasurements.map((measurement) => {
            const isPositiveTrend =
              (measurement.trend === 'down' && (measurement.type === 'weight' || measurement.type === 'body_fat')) ||
              (measurement.trend === 'up' && measurement.type === 'muscle_mass');
            const trendColor = isPositiveTrend ? theme.green : theme.orange;

            return (
              <DarkCard key={measurement.id}>
                <FlexRow $justify="space-between" $mb={12}>
                  <Heading6 $capitalize>
                    {measurement.type.replace('_', ' ')}
                  </Heading6>
                  <FlexRow $gap={6}>
                    {measurement.trend === 'up' ? (
                      <ArrowUp size={20} color={measurement.type === 'muscle_mass' ? theme.green : theme.orange} />
                    ) : measurement.trend === 'down' ? (
                      <ArrowDown size={20} color={(measurement.type === 'weight' || measurement.type === 'body_fat') ? theme.green : theme.orange} />
                    ) : (
                      <Minus size={20} color="#999" />
                    )}
                    <LabelSmall $color={trendColor}>
                      {Math.abs(measurement.percentChange)}%
                    </LabelSmall>
                  </FlexRow>
                </FlexRow>
                <FlexRow $gap={8} $align="baseline">
                  <ValueXL $color={theme.cyan}>
                    {measurement.value}
                  </ValueXL>
                  <ValueMedium $color={theme.textMuted}>
                    {measurement.unit}
                  </ValueMedium>
                </FlexRow>
                <SpacerV $size={4} />
                <LabelSmall>
                  Measured on {new Date(measurement.date).toLocaleDateString()}
                </LabelSmall>
              </DarkCard>
            );
          })}
        </FlexCol>
      </GridRow2Col>
    </div>
  );

  // Render overview section
  const renderOverview = () => (
    <div>
      <OverviewGrid>
        {/* Overall Progress Card */}
        <GlassPanel $textAlign="center">
          <Heading6 $color={theme.cyan} $mb={16}>
            Overall Progress
          </Heading6>
          <CircularProgress value={overallProgress.overallScore} size={100} />
          <LabelBody>Excellent progress! Keep up the great work.</LabelBody>
        </GlassPanel>

        {/* Quick Stats */}
        <GlassPanel>
          <Heading6 $color={theme.cyan} $mb={24}>
            Progress Summary
          </Heading6>
          <Grid4Col>
            <MetricBox>
              <ValueLarge $color={theme.green}>
                {mockMilestones.filter(m => m.status === 'completed').length}
              </ValueLarge>
              <LabelSmall>Milestones Completed</LabelSmall>
            </MetricBox>
            <MetricBox>
              <ValueLarge $color={theme.orange}>
                {mockWorkouts.length}
              </ValueLarge>
              <LabelSmall>Workouts This Month</LabelSmall>
            </MetricBox>
            <MetricBox>
              <FlexRow $gap={8} $justify="center">
                <ValueLarge $color={theme.purple}>
                  {overallProgress.avgImprovement.toFixed(1)}%
                </ValueLarge>
                <TrendingUp size={20} color={theme.green} />
              </FlexRow>
              <LabelSmall>Avg Improvement</LabelSmall>
            </MetricBox>
            <MetricBox>
              <FlexRow $gap={8} $justify="center">
                <Star size={28} color={theme.gold} fill={theme.gold} />
                <ValueLarge $color={theme.gold}>4.8</ValueLarge>
              </FlexRow>
              <LabelSmall>Average Rating</LabelSmall>
            </MetricBox>
          </Grid4Col>
        </GlassPanel>
      </OverviewGrid>

      <SpacerV $size={24} />

      {/* Recent Achievements */}
      <GlassPanel>
        <Heading6 $color={theme.cyan} $mb={24}>
          Recent Achievements
        </Heading6>
        <Grid3Col>
          {mockMilestones
            .filter(m => m.status === 'completed')
            .map((achievement) => (
              <AchievementPanel key={achievement.id}>
                <AchievementIcon size={40} color={theme.gold} />
                <Heading6>{achievement.title}</Heading6>
                <LabelBody>{achievement.description}</LabelBody>
                {achievement.reward && (
                  <RewardChip>
                    {achievement.reward.type}: {achievement.reward.value}
                  </RewardChip>
                )}
                <LabelSmall $color={theme.textMuted} $block $mt={8}>
                  Completed on {new Date(achievement.completedDate!).toLocaleDateString()}
                </LabelSmall>
              </AchievementPanel>
            ))}
        </Grid3Col>
      </GlassPanel>
    </div>
  );

  return (
    <DashboardWrapper>
      {/* Header */}
      <SectionHeader>
        <PageTitle>Progress Dashboard</PageTitle>
        <PageSubtitle>
          Track milestones, monitor improvements, and celebrate achievements
        </PageSubtitle>
      </SectionHeader>

      {/* Demo data notice */}
      <PreviewNotice>
        Preview Mode — Charts display sample data. Real progress will populate as sessions are completed.
      </PreviewNotice>

      {/* Controls */}
      <ControlsRow>
        <NativeSelect
          value={selectedTimeframe}
          onChange={(e) => {
            const nextTimeframe = e.target.value;
            if (isTimeframe(nextTimeframe)) {
              setSelectedTimeframe(nextTimeframe);
            }
          }}
          title="Timeframe"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="1y">Last Year</option>
        </NativeSelect>

        <ButtonGroup>
          <ActionButton
            $active={viewMode === 'overview'}
            $variant={viewMode === 'overview' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('overview')}
          >
            Overview
          </ActionButton>
          <ActionButton
            $active={viewMode === 'detailed'}
            $variant={viewMode === 'detailed' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('detailed')}
          >
            Detailed
          </ActionButton>
          <ActionButton
            $active={viewMode === 'measurements'}
            $variant={viewMode === 'measurements' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('measurements')}
          >
            Measurements
          </ActionButton>
        </ButtonGroup>

        <ControlsRight>
          <ActionButton $variant="outlined">
            <RefreshCw size={16} />
            Refresh
          </ActionButton>
          <ActionButton $variant="outlined">
            <Download size={16} />
            Export
          </ActionButton>
        </ControlsRight>
      </ControlsRow>

      {/* Content */}
      {viewMode === 'overview' && renderOverview()}

      {viewMode === 'detailed' && (
        <div>
          <ChartSection>
            {renderMilestones()}
          </ChartSection>
          <ChartSection>
            {renderAssessments()}
          </ChartSection>
        </div>
      )}

      {viewMode === 'measurements' && renderMeasurements()}

      {/* Advanced Progress Charts */}
      <SpacerV $size={32} />
      <ClientProgressCharts
        clientId={clientId ? Number(clientId) : undefined}
        isTrainerView={false}
        showControls={true}
        defaultTimeRange="30d"
      />
    </DashboardWrapper>
  );
};

export default ClientProgressDashboard;
