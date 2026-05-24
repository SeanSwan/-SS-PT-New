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
 * API Calls: GET /api/client-progress/:clientId, workout-history, measurements
 *
 * Theme: Crystalline Swan (NOT Crystalline Swan — RETIRED)
 * NOTE: 1,256 lines — exceeds 300-line rule. TODO: extract chart sections
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { useAuth } from '../../../../../context/AuthContext';
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
// Victory chart components.
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

type ApiRecord = Record<string, unknown>;

const asRecord = (value: unknown): ApiRecord => (
  value && typeof value === 'object' ? value as ApiRecord : {}
);

const asArray = (value: unknown): unknown[] => (
  Array.isArray(value) ? value : []
);

const asString = (value: unknown, fallback = ''): string => (
  typeof value === 'string' && value.length > 0 ? value : fallback
);

const asNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));

const toScore = (level: unknown): number => {
  const value = asNumber(level);
  return Math.round(Math.min(10, Math.max(0, value / 100)) * 10) / 10;
};

const toHistoryTimeframe = (timeframe: Timeframe): string => {
  if (timeframe === '90d') return '3months';
  if (timeframe === '1y') return '1year';
  return '1month';
};

const formatMeasurementDate = (value: unknown): string => {
  const date = new Date(asString(value, new Date().toISOString()));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const getProgressPayload = (responseData: unknown): ApiRecord => {
  const data = asRecord(responseData);
  return asRecord(data.progress);
};

const getMeasurementRows = (responseData: unknown): ApiRecord[] => {
  const data = asRecord(responseData);
  const nested = asRecord(data.data);
  return asArray(nested.measurements).map(asRecord);
};

const getAchievements = (progress: ApiRecord): string[] => {
  const raw = progress.achievements;
  if (Array.isArray(raw)) {
    return raw.map(item => String(item)).filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(item => String(item)).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapWorkouts = (rows: unknown[]): WorkoutSummary[] => (
  rows.map((row, index) => {
    const workout = asRecord(row);
    const intensity = asNumber(workout.intensity);
    return {
      id: String(workout.id ?? `${workout.date ?? 'workout'}-${index}`),
      date: asString(workout.date, new Date().toISOString()),
      type: asString(workout.type, asString(workout.title, 'Workout')),
      duration: asNumber(workout.duration),
      caloriesBurned: 0,
      exerciseCount: asNumber(workout.exerciseCount, asArray(workout.logs).length),
      ratingOfPerceivedExertion: intensity,
      notes: asString(workout.notes),
      completedExercises: asNumber(workout.completedExercises, asArray(workout.logs).length),
      totalExercises: asNumber(workout.totalExercises, asArray(workout.logs).length),
    };
  })
);

const buildAssessmentMetrics = (progress: ApiRecord, workouts: WorkoutSummary[]): AssessmentMetric[] => {
  const strengthLevel = (
    asNumber(progress.chestLevel) +
    asNumber(progress.bicepsLevel) +
    asNumber(progress.tricepsLevel) +
    asNumber(progress.squatsLevel)
  ) / 4;
  const enduranceScore = Math.min(10, workouts.length);
  const now = new Date().toISOString();
  const metrics = [
    {
      id: 'overall',
      name: 'Overall Fitness',
      value: toScore(progress.overallLevel),
      category: 'endurance' as const,
    },
    {
      id: 'strength',
      name: 'Strength',
      value: toScore(strengthLevel),
      category: 'strength' as const,
    },
    {
      id: 'flexibility',
      name: 'Flexibility',
      value: toScore(progress.flexibilityLevel),
      category: 'flexibility' as const,
    },
    {
      id: 'balance',
      name: 'Balance',
      value: toScore(progress.balanceLevel),
      category: 'balance' as const,
    },
    {
      id: 'recent-workouts',
      name: 'Recent Workouts',
      value: enduranceScore,
      category: 'endurance' as const,
    },
  ];

  return metrics.map(metric => ({
    ...metric,
    previousValue: metric.value,
    maxValue: 10,
    unit: 'score',
    lastMeasured: now,
    improvement: 0,
    percentile: Math.round(metric.value * 10),
  }));
};

const buildMilestones = (progress: ApiRecord): MilestoneItem[] => (
  getAchievements(progress).map((achievement, index) => ({
    id: `achievement-${index}`,
    title: achievement,
    description: 'Achievement recorded in client progress',
    targetValue: 1,
    currentValue: 1,
    unit: 'earned',
    status: 'completed',
    completedDate: new Date().toISOString(),
    difficulty: 'medium',
    category: 'strength',
    reward: {
      type: 'badge',
      value: achievement,
      icon: '',
    },
  }))
);

const buildMeasurementCards = (rows: ApiRecord[]): BodyMeasurement[] => {
  if (!rows.length) return [];
  const sorted = [...rows].sort((a, b) => (
    new Date(formatMeasurementDate(a.measurementDate)).getTime() -
    new Date(formatMeasurementDate(b.measurementDate)).getTime()
  ));
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2] || latest;
  const date = formatMeasurementDate(latest.measurementDate);

  const toTrend = (current: number, prior: number): BodyMeasurement['trend'] => {
    if (current > prior) return 'up';
    if (current < prior) return 'down';
    return 'stable';
  };
  const percentChange = (current: number, prior: number): number => {
    if (!prior) return 0;
    return Math.round(((current - prior) / prior) * 1000) / 10;
  };

  const measurements: BodyMeasurement[] = [];
  const weight = asNumber(latest.weight, NaN);
  const previousWeight = asNumber(previous.weight, weight);
  if (Number.isFinite(weight)) {
    measurements.push({
      id: `${latest.id ?? 'latest'}-weight`,
      type: 'weight',
      value: weight,
      unit: 'lb',
      date,
      trend: toTrend(weight, previousWeight),
      percentChange: percentChange(weight, previousWeight),
    });
  }

  const bodyFat = asNumber(latest.bodyFatPercentage, NaN);
  const previousBodyFat = asNumber(previous.bodyFatPercentage, bodyFat);
  if (Number.isFinite(bodyFat)) {
    measurements.push({
      id: `${latest.id ?? 'latest'}-body-fat`,
      type: 'body_fat',
      value: bodyFat,
      unit: '%',
      date,
      trend: toTrend(bodyFat, previousBodyFat),
      percentChange: percentChange(bodyFat, previousBodyFat),
    });
  }

  const muscleMass = asNumber(latest.muscleMassPercentage, NaN);
  const previousMuscleMass = asNumber(previous.muscleMassPercentage, muscleMass);
  if (Number.isFinite(muscleMass)) {
    measurements.push({
      id: `${latest.id ?? 'latest'}-muscle-mass`,
      type: 'muscle_mass',
      value: muscleMass,
      unit: '%',
      date,
      trend: toTrend(muscleMass, previousMuscleMass),
      percentChange: percentChange(muscleMass, previousMuscleMass),
    });
  }

  return measurements;
};

const buildMeasurementChartData = (rows: ApiRecord[]) => (
  [...rows]
    .sort((a, b) => (
      new Date(formatMeasurementDate(a.measurementDate)).getTime() -
      new Date(formatMeasurementDate(b.measurementDate)).getTime()
    ))
    .slice(-12)
    .map((measurement, index) => ({
      week: asString(measurement.measurementDate)
        ? new Date(formatMeasurementDate(measurement.measurementDate)).toLocaleDateString()
        : `Entry ${index + 1}`,
      weight: asNumber(measurement.weight),
      bodyFat: asNumber(measurement.bodyFatPercentage),
      muscleMass: asNumber(measurement.muscleMassPercentage),
    }))
);

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

const StatusNotice = styled.div`
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
  const [progress, setProgress] = useState<ApiRecord>({});
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [measurementRows, setMeasurementRows] = useState<ApiRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { authAxios } = useAuth();

  const loadProgressData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [progressResponse, workoutHistoryResponse, measurementResponse] = await Promise.all([
        authAxios.get(`/api/client-progress/${clientId}`),
        authAxios.get(`/api/client-progress/${clientId}/workout-history`, {
          params: { timeframe: toHistoryTimeframe(selectedTimeframe) },
        }),
        authAxios.get(`/api/measurements/user/${clientId}`, {
          params: { limit: 20 },
        }),
      ]);

      setProgress(getProgressPayload(progressResponse.data));
      setWorkouts(mapWorkouts(asArray(workoutHistoryResponse.data)));
      setMeasurementRows(getMeasurementRows(measurementResponse.data));
    } catch {
      setProgress({});
      setWorkouts([]);
      setMeasurementRows([]);
      setLoadError('Progress data could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, clientId, selectedTimeframe]);

  useEffect(() => {
    void loadProgressData();
  }, [loadProgressData]);

  const milestones = useMemo(() => buildMilestones(progress), [progress]);
  const assessments = useMemo(() => buildAssessmentMetrics(progress, workouts), [progress, workouts]);
  const measurements = useMemo(() => buildMeasurementCards(measurementRows), [measurementRows]);
  const measurementChartData = useMemo(() => buildMeasurementChartData(measurementRows), [measurementRows]);
  const assessmentChartData = useMemo(() => [{
    month: 'Current',
    overall: assessments.find(assessment => assessment.id === 'overall')?.value ?? 0,
    strength: assessments.find(assessment => assessment.id === 'strength')?.value ?? 0,
    endurance: assessments.find(assessment => assessment.id === 'recent-workouts')?.value ?? 0,
    flexibility: assessments.find(assessment => assessment.id === 'flexibility')?.value ?? 0,
  }], [assessments]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const totalMilestones = milestones.length;
    const avgAssessmentScore = assessments.length > 0
      ? assessments.reduce((sum, a) => sum + a.value, 0) / assessments.length
      : 0;
    const avgImprovement = assessments.length > 0
      ? assessments.reduce((sum, a) => sum + a.improvement, 0) / assessments.length
      : 0;
    const avgWorkoutIntensity = workouts.length > 0
      ? workouts.reduce((sum, workout) => sum + workout.ratingOfPerceivedExertion, 0) / workouts.length
      : 0;
    const milestoneCompletion = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

    return {
      milestoneCompletion,
      avgAssessmentScore: (avgAssessmentScore / 10) * 100,
      avgImprovement,
      avgWorkoutIntensity,
      overallScore: clampPercent(Math.max(toScore(progress.overallLevel) * 10, (milestoneCompletion * 0.4) + ((avgAssessmentScore / 10) * 60)))
    };
  }, [assessments, milestones, progress, workouts]);

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
        <ActionButton
          $variant="outlined"
          $disabled
          disabled
          title="Milestone writes are not connected here"
        >
          <Plus size={16} />
          Add Milestone
        </ActionButton>
      </SectionRow>

      <Grid3Col>
        {milestones.length > 0 ? milestones.map((milestone) => (
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
        )) : (
          <CardPanel>
            <Heading6>No milestones recorded</Heading6>
            <LabelBody>Client achievements will appear here as they are earned.</LabelBody>
          </CardPanel>
        )}
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
              <VictoryLine data={assessmentChartData} x="month" y="overall" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...overallLineStyleProps} />
              <VictoryLine data={assessmentChartData} x="month" y="strength" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...strengthLineStyleProps} />
              <VictoryLine data={assessmentChartData} x="month" y="endurance" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...enduranceLineStyleProps} />
              <VictoryLine data={assessmentChartData} x="month" y="flexibility" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...flexibilityLineStyleProps} />
              <VictoryLegend x={60} y={5} orientation="horizontal" {...chartLegendStyleProps} data={[{ name: 'Overall', symbol: { fill: '#60C0F0' } }, { name: 'Strength', symbol: { fill: '#ff6b6b' } }, { name: 'Endurance', symbol: { fill: '#4ECDC4' } }, { name: 'Flexibility', symbol: { fill: '#C6A84B' } }]} />
            </VictoryChart>
          </ChartBox>
        </DarkCard>

        <FlexCol $gap={16}>
          {assessments.map((assessment) => (
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
        <ActionButton
          $variant="outlined"
          $disabled
          disabled
          title="Measurement writes are handled by the measurement entry flow"
        >
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
              <VictoryLine data={measurementChartData} x="week" y="weight" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...overallLineStyleProps} />
              <VictoryLine data={measurementChartData} x="week" y="bodyFat" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...strengthLineStyleProps} />
              <VictoryLine data={measurementChartData} x="week" y="muscleMass" interpolation="monotoneX" animate={{ duration: 800, easing: 'cubicInOut' }} {...enduranceLineStyleProps} />
              <VictoryLegend x={60} y={5} orientation="horizontal" {...chartLegendStyleProps} data={[{ name: 'Weight (kg)', symbol: { fill: '#60C0F0' } }, { name: 'Body Fat (%)', symbol: { fill: '#ff6b6b' } }, { name: 'Muscle Mass (kg)', symbol: { fill: '#4ECDC4' } }]} />
            </VictoryChart>
          </ChartBox>
        </DarkCard>

        <FlexCol $gap={16}>
          {measurements.length > 0 ? measurements.map((measurement) => {
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
          }) : (
            <DarkCard>
              <Heading6>No measurements recorded</Heading6>
              <LabelBody>Measurements will appear after the next body composition entry.</LabelBody>
            </DarkCard>
          )}
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
          <LabelBody>Based on recorded progress, workouts, and measurements.</LabelBody>
        </GlassPanel>

        {/* Quick Stats */}
        <GlassPanel>
          <Heading6 $color={theme.cyan} $mb={24}>
            Progress Summary
          </Heading6>
          <Grid4Col>
            <MetricBox>
              <ValueLarge $color={theme.green}>
                {milestones.filter(m => m.status === 'completed').length}
              </ValueLarge>
              <LabelSmall>Milestones Completed</LabelSmall>
            </MetricBox>
            <MetricBox>
              <ValueLarge $color={theme.orange}>
                {workouts.length}
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
                <ValueLarge $color={theme.gold}>
                  {overallProgress.avgWorkoutIntensity.toFixed(1)}
                </ValueLarge>
              </FlexRow>
              <LabelSmall>Avg Intensity</LabelSmall>
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
          {milestones
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
          {milestones.filter(m => m.status === 'completed').length === 0 && (
            <AchievementPanel>
              <AchievementIcon size={40} color={theme.gold} />
              <Heading6>No achievements recorded</Heading6>
              <LabelBody>Completed achievements will appear here.</LabelBody>
            </AchievementPanel>
          )}
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

      {loadError && (
        <StatusNotice role="alert">
          {loadError}
        </StatusNotice>
      )}
      {isLoading && (
        <StatusNotice>
          Loading progress data...
        </StatusNotice>
      )}

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
          <ActionButton $variant="outlined" onClick={() => void loadProgressData()}>
            <RefreshCw size={16} />
            Refresh
          </ActionButton>
          <ActionButton
            $variant="outlined"
            $disabled
            disabled
            title="Progress export is not connected here"
          >
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
