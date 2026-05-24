/**
 * ┌─── SUB-COMPONENT: AIInsightsPanel ─────────────────────────┐
 * │ PARENT: EnhancedAdminClientManagementView                   │
 * │ PURPOSE: AI-powered insights: predictive analytics, risk    │
 * │          assessment, coaching suggestions, performance       │
 * │          optimization, behavioral analysis                  │
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-23        │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────┐                        │
 * │ │ AI Insights                      │                        │
 * │ │ ┌─ Insight Cards ──────────────┐ │                        │
 * │ │ │ 🎯 Recommendations          │ │                        │
 * │ │ │ ⚠️ Risk Alerts              │ │                        │
 * │ │ │ 🏆 Achievement Predictions   │ │                        │
 * │ │ └─────────────────────────────┘ │                        │
 * │ │ ┌─ Performance Radar Chart ───┐ │                        │
 * │ │ │ Strength/Endurance/Balance  │ │                        │
 * │ │ └─────────────────────────────┘ │                        │
 * │ └──────────────────────────────────┘                        │
 * │ Props: { clientId, clientName }                             │
 * │ API: GET /api/admin/ai-bff/client-summary/:id              │
 * │ GAMIFICATION: Surfaces badge predictions + tier progress    │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  Star,
  RefreshCw,
  Settings,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { logger } from '@/utils/logger';

// ── Crystalline Swan Theme Tokens ──
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'rgba(15,23,42,0.85)',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.4)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  purple: '#8B5CF6',
  purpleLight: '#b794f6',
  cyan: '#60C0F0',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  gold: '#ffd700',
  blue: '#2196f3',
  glass: 'rgba(255,255,255,0.02)',
  glassHover: 'rgba(255,255,255,0.05)',
};

// ── Primitive Styled Components ──

const PanelRoot = styled.div`
  padding: 24px;
  color: ${theme.text};
`;

const SectionBox = styled.div<{ $mb?: number; $mt?: number; $px?: number }>`
  ${({ $mb }) => $mb != null && css`margin-bottom: ${$mb}px;`}
  ${({ $mt }) => $mt != null && css`margin-top: ${$mt}px;`}
  ${({ $px }) => $px != null && css`padding-left: ${$px}px; padding-right: ${$px}px;`}
`;

const FlexRow = styled.div<{
  $justify?: string;
  $align?: string;
  $gap?: number;
  $wrap?: boolean;
  $mb?: number;
  $mt?: number;
}>`
  display: flex;
  ${({ $justify }) => $justify && css`justify-content: ${$justify};`}
  ${({ $align }) => $align && css`align-items: ${$align};`}
  ${({ $gap }) => $gap != null && css`gap: ${$gap}px;`}
  ${({ $wrap }) => $wrap && css`flex-wrap: wrap;`}
  ${({ $mb }) => $mb != null && css`margin-bottom: ${$mb}px;`}
  ${({ $mt }) => $mt != null && css`margin-top: ${$mt}px;`}
`;

const GridContainer = styled.div<{ $cols?: string; $gap?: number }>`
  display: grid;
  grid-template-columns: ${({ $cols }) => $cols || '1fr'};
  gap: ${({ $gap }) => $gap ?? 16}px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr auto;
  gap: 16px;
  align-items: center;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

// ── Cards ──
const InsightCardStyled = styled.div`
  background: linear-gradient(135deg, ${theme.glass}, ${theme.glassHover});
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  padding: 20px;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(121, 81, 169, 0.15);
    border-color: rgba(121, 81, 169, 0.3);
  }
`;

const CardPanel = styled.div`
  background: ${theme.bgCard};
  border: 1px solid ${theme.border};
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
`;

const AIModelCardStyled = styled.div`
  background: ${theme.glass};
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;

  &:hover {
    background: ${theme.glassHover};
    border-color: rgba(139, 92, 246, 0.4);
  }
`;

// ── Typography ──
const Heading4 = styled.h2<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ $color }) => $color || theme.text};
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  line-height: 1.3;
`;

const Heading6 = styled.h3<{ $color?: string; $capitalize?: boolean; $mb?: number; $m?: string }>`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ $color }) => $color || theme.text};
  margin: 0 0 4px 0;
  ${({ $mb }) => $mb != null && css`margin-bottom: ${$mb}px;`}
  ${({ $m }) => $m && css`margin: ${$m};`}
  line-height: 1.4;
  ${({ $capitalize }) => $capitalize && css`text-transform: capitalize;`}
`;

const BodyText = styled.p<{ $color?: string; $fw?: number; $mb?: number; $mt?: number }>`
  font-size: 0.875rem;
  color: ${({ $color }) => $color || theme.textMuted};
  margin: 0;
  ${({ $fw }) => $fw && css`font-weight: ${$fw};`}
  ${({ $mb }) => $mb != null && css`margin-bottom: ${$mb}px;`}
  ${({ $mt }) => $mt != null && css`margin-top: ${$mt}px;`}
  line-height: 1.5;
`;

const CaptionText = styled.span<{ $color?: string; $fw?: number; $block?: boolean; $mb?: number }>`
  font-size: 0.75rem;
  color: ${({ $color }) => $color || theme.textMuted};
  ${({ $fw }) => $fw && css`font-weight: ${$fw};`}
  ${({ $block }) => $block && css`display: block;`}
  ${({ $mb }) => $mb != null && css`margin-bottom: ${$mb}px;`}
  line-height: 1.4;
`;

// ── Chip ──
const ChipStyled = styled.span<{
  $bgColor?: string;
  $textColor?: string;
  $outlined?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  line-height: 1.4;

  ${({ $outlined, $textColor, $bgColor }) =>
    $outlined
      ? css`
          background: transparent;
          border: 1px solid ${$textColor || theme.textMuted};
          color: ${$textColor || theme.textMuted};
        `
      : css`
          background: ${$bgColor || 'rgba(255,255,255,0.1)'};
          color: ${$textColor || theme.text};
          border: none;
        `}
`;

// helper for priority/status chips
const getStatusChipColors = (status: string): { bg: string; text: string } => {
  switch (status) {
    case 'critical':
    case 'error':
    case 'immediate':
    case 'high':
      return { bg: 'rgba(244,67,54,0.2)', text: '#f44336' };
    case 'warning':
    case 'medium':
    case 'short-term':
    case 'training':
      return { bg: 'rgba(255,152,0,0.2)', text: '#ff9800' };
    case 'info':
    case 'long-term':
      return { bg: 'rgba(33,150,243,0.2)', text: '#2196f3' };
    case 'success':
    case 'active':
    case 'low':
      return { bg: 'rgba(76,175,80,0.2)', text: '#4caf50' };
    default:
      return { bg: 'rgba(255,255,255,0.1)', text: theme.textMuted };
  }
};

// ── Buttons ──
const ActionButton = styled.button<{ $variant?: 'contained' | 'outlined'; $fullWidth?: boolean }>`
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-transform: none;
  transition: all 0.2s ease;
  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${({ $variant }) =>
    $variant === 'contained'
      ? css`
          background: linear-gradient(135deg, #8B5CF6, #b794f6);
          color: white;
          border: none;
          &:hover {
            background: linear-gradient(135deg, #6a4c93, #a78bfa);
          }
        `
      : css`
          background: transparent;
          color: #b794f6;
          border: 1px solid rgba(121, 81, 169, 0.5);
          &:hover {
            border-color: #8B5CF6;
            background: rgba(121, 81, 169, 0.1);
          }
        `}
`;

// ── Avatar ──
const AvatarCircle = styled.div<{ $bgColor?: string }>`
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bgColor }) => $bgColor || theme.purple};
  color: white;
  flex-shrink: 0;
`;

// ── Confidence Indicator ──
const ConfidenceBox = styled.div<{ $confidence: number }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  background: ${({ $confidence }) =>
    $confidence >= 90
      ? 'rgba(76,175,80,0.2)'
      : $confidence >= 70
      ? 'rgba(255,193,7,0.2)'
      : 'rgba(255,87,34,0.2)'};
  color: ${({ $confidence }) =>
    $confidence >= 90 ? '#4caf50' : $confidence >= 70 ? '#ffb300' : '#ff5722'};
`;

// ── Accordion ──
const AccordionWrapper = styled.div`
  border: 1px solid ${theme.border};
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 8px;
  background: ${theme.bg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
`;

const AccordionHeader = styled.button<{ $expanded?: boolean }>`
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${theme.text};
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  svg:last-child {
    transition: transform 0.3s ease;
    transform: ${({ $expanded }) => ($expanded ? 'rotate(180deg)' : 'rotate(0deg)')};
  }
`;

const AccordionBody = styled.div<{ $expanded?: boolean }>`
  max-height: ${({ $expanded }) => ($expanded ? '5000px' : '0')};
  overflow: hidden;
  transition: max-height 0.4s ease;
  padding: ${({ $expanded }) => ($expanded ? '0 20px 20px' : '0 20px')};
`;

// ── List ──
const ListUl = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ListLi = styled.li<{ $py?: number }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: ${({ $py }) => $py ?? 4}px 0;
  font-size: 0.875rem;
  color: ${theme.text};
  line-height: 1.5;
`;

const ListIconWrap = styled.span<{ $minW?: number }>`
  min-width: ${({ $minW }) => $minW ?? 24}px;
  display: flex;
  align-items: center;
  padding-top: 2px;
  flex-shrink: 0;
`;

// ── Select ──
const StyledSelect = styled.select`
  min-height: 44px;
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${theme.border};
  background: ${theme.bg};
  color: ${theme.text};
  font-size: 0.875rem;
  cursor: pointer;
  appearance: auto;
  outline: none;

  &:focus {
    border-color: ${theme.accent};
  }

  option {
    background: #0f172a;
    color: ${theme.text};
  }
`;

const SelectLabel = styled.label`
  display: block;
  font-size: 0.75rem;
  color: ${theme.textMuted};
  margin-bottom: 4px;
`;

// ── Range Slider ──
const RangeInput = styled.input`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  appearance: none;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${theme.purple};
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${theme.purple};
    border: none;
    cursor: pointer;
  }
`;

// ── Toggle Switch ──
const ToggleLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  min-height: 44px;
`;

const ToggleTrack = styled.span<{ $checked?: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $checked }) => ($checked ? theme.purple : 'rgba(255,255,255,0.15)')};
  transition: background 0.2s ease;
  flex-shrink: 0;
`;

const ToggleThumb = styled.span<{ $checked?: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? '22px' : '2px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transition: left 0.2s ease;
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const AnimatedProgressCircle = styled.circle`
  transition: stroke-dashoffset 0.6s ease;
`;

const SectionHeading = styled(Heading6)`
  margin-bottom: 16px;
`;

const RiskProgressFrame = styled.div`
  display: flex;
  justify-content: center;
  position: relative;
`;

const RiskProgressCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const RiskProbabilityValue = styled.span`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${theme.text};
`;

const RightAlignedBlock = styled.div`
  text-align: right;
`;

const EmptyPanel = styled(CardPanel)`
  border-style: dashed;
`;

// ── Circular Progress (SVG) ──
const CircularProgressSVG: React.FC<{
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}> = ({ value, size = 100, strokeWidth = 4, color = theme.accent }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <AnimatedProgressCircle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

// ── Linear Progress Bar ──
const ProgressBarTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $value: number; $color?: string }>`
  height: 100%;
  width: ${({ $value }) => $value}%;
  border-radius: 3px;
  background: ${({ $color }) => $color || theme.success};
  transition: width 0.4s ease;
`;

// ── Define interfaces ──
interface AIInsight {
  id: string;
  type: 'recommendation' | 'warning' | 'prediction' | 'achievement' | 'optimization';
  category: 'workout' | 'nutrition' | 'recovery' | 'social' | 'performance' | 'health';
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
  data?: Record<string, unknown>;
  timestamp: string;
  modelUsed: string;
  evidencePoints: string[];
  relatedInsights?: string[];
}

interface PredictionModel {
  id: string;
  name: string;
  description: string;
  accuracy: number;
  lastTrained: string;
  status: 'active' | 'training' | 'deprecated';
  predictions: number;
  category: string;
}

interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'immediate' | 'short-term' | 'long-term';
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  category: string;
  confidence: number;
  estimatedBenefit: string;
  implementationSteps: string[];
  relatedMetrics: string[];
}

interface RiskAssessment {
  id: string;
  riskType: 'injury' | 'plateauing' | 'burnout' | 'dropout' | 'overtraining';
  probability: number;
  severity: 'low' | 'medium' | 'high';
  factors: string[];
  mitigation: string[];
  timeline: string;
  monitoring: string[];
}

interface AIInsightsPanelProps {
  clientId: string;
  refreshInterval?: number;
  onInsightAction?: (insightId: string, action: string) => void;
  onRecommendationImplement?: (recommendationId: string) => void;
}

type UnknownRecord = Record<string, unknown>;

interface ClientSummaryPayload {
  profile?: unknown;
  activePain?: unknown;
  latestMeasurements?: unknown;
  recentWorkouts?: unknown;
  fetchedAt?: string;
}

interface BuiltClientInsights {
  insights: AIInsight[];
  recommendations: AIRecommendation[];
  riskAssessments: RiskAssessment[];
  models: PredictionModel[];
}

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const responseData = (value: unknown): unknown => {
  if (isRecord(value) && 'data' in value) {
    return value.data;
  }
  return value;
};

const responseHasError = (value: unknown): boolean =>
  isRecord(value) && (value.success === false || typeof value.error === 'string');

const recordArray = (value: unknown): UnknownRecord[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const recordsFrom = (value: unknown, keys: string[] = []): UnknownRecord[] => {
  const root = responseData(value);
  const direct = recordArray(root);
  if (direct.length > 0) return direct;
  if (!isRecord(root)) return [];

  for (const key of keys) {
    const keyed = root[key];
    const keyedArray = recordArray(keyed);
    if (keyedArray.length > 0) return keyedArray;
  }

  return [];
};

const nestedRecord = (value: unknown, key: string): UnknownRecord | null => {
  const root = responseData(value);
  if (!isRecord(root)) return null;
  const next = root[key];
  return isRecord(next) ? next : null;
};

const numberFrom = (record: UnknownRecord | null, keys: string[]): number | null => {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
};

const stringFrom = (record: UnknownRecord | null, keys: string[]): string | null => {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
};

const clampPercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const formatLabel = (value: string | null): string =>
  value ? value.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 'Unspecified';

const daysSince = (dateValue: string | null): number | null => {
  if (!dateValue) return null;
  const time = Date.parse(dateValue);
  if (!Number.isFinite(time)) return null;
  return Math.floor((Date.now() - time) / 86400000);
};

const buildClientSummaryInsights = (
  summary: ClientSummaryPayload,
  clientId: string,
  onInsightAction?: (insightId: string, action: string) => void,
): BuiltClientInsights => {
  const fetchedAt = summary.fetchedAt || new Date().toISOString();
  const painEntries = recordsFrom(summary.activePain);
  const workoutData = responseData(summary.recentWorkouts);
  const workoutRecord = isRecord(workoutData) ? workoutData : null;
  const recentWorkouts = recordsFrom(workoutData, ['recentWorkouts']);
  const totalWorkouts = numberFrom(workoutRecord, ['totalWorkouts']) ?? recentWorkouts.length;
  const latestWorkout = recentWorkouts[0] || null;
  const lastWorkoutDate = stringFrom(latestWorkout, ['date', 'completedAt', 'updatedAt']);
  const lastWorkoutDays = daysSince(lastWorkoutDate);
  const latestMeasurementRoot = responseData(summary.latestMeasurements);
  const latestMeasurement = isRecord(latestMeasurementRoot) && !responseHasError(latestMeasurementRoot)
    ? latestMeasurementRoot
    : null;
  const measurementDate = stringFrom(latestMeasurement, ['measurementDate', 'createdAt', 'updatedAt']);
  const highestPain = painEntries.reduce<UnknownRecord | null>((current, entry) => {
    const currentLevel = numberFrom(current, ['painLevel', 'pain_level', 'level', 'severity']) ?? 0;
    const entryLevel = numberFrom(entry, ['painLevel', 'pain_level', 'level', 'severity']) ?? 0;
    return entryLevel > currentLevel ? entry : current;
  }, null);
  const highestPainLevel = numberFrom(highestPain, ['painLevel', 'pain_level', 'level', 'severity']);
  const highestPainRegion = formatLabel(stringFrom(highestPain, ['bodyRegion', 'body_region', 'region']));
  const profileData = nestedRecord(summary.profile, 'client') || (isRecord(responseData(summary.profile)) ? responseData(summary.profile) as UnknownRecord : null);
  const fitnessGoal = formatLabel(stringFrom(profileData, ['fitnessGoal', 'primaryGoal', 'goal']));

  const insights: AIInsight[] = [];
  const recommendations: AIRecommendation[] = [];
  const riskAssessments: RiskAssessment[] = [];

  if (painEntries.length > 0) {
    const priority = highestPainLevel && highestPainLevel >= 7 ? 'critical' : 'high';
    const painDescription = `${painEntries.length} active pain ${painEntries.length === 1 ? 'entry is' : 'entries are'} open${highestPainLevel ? `; highest level is ${highestPainLevel}/10 at ${highestPainRegion}` : ''}. Review constraints before changing training load.`;

    insights.push({
      id: 'active-pain-review',
      type: 'warning',
      category: 'health',
      title: 'Active pain review needed',
      description: painDescription,
      confidence: 92,
      priority,
      actionable: true,
      action: {
        label: 'Review Pain',
        callback: () => onInsightAction?.('active-pain-review', 'review-pain'),
      },
      data: { clientId, source: 'activePain' },
      timestamp: fetchedAt,
      modelUsed: 'AI BFF client summary',
      evidencePoints: [
        `${painEntries.length} active pain entries returned by /api/pain-entries/:userId/active`,
        highestPainLevel ? `Highest recorded pain level: ${highestPainLevel}/10` : 'Pain entries did not include a numeric level',
      ],
    });

    recommendations.push({
      id: 'review-pain-before-programming',
      title: 'Review pain constraints before programming',
      description: 'Confirm active pain regions and adjust exercise selection before increasing load, intensity, or volume.',
      type: 'immediate',
      impact: 'high',
      effort: 'low',
      category: 'Health',
      confidence: 90,
      estimatedBenefit: 'Lower programming risk while pain entries are active',
      implementationSteps: [
        'Open the client pain log',
        'Identify affected regions and pain level',
        'Swap or regress movements that load the affected area',
      ],
      relatedMetrics: ['active pain entries', 'pain level', 'exercise constraints'],
    });

    riskAssessments.push({
      id: 'active-pain-injury-risk',
      riskType: 'injury',
      probability: clampPercent((highestPainLevel ?? 5) * 10),
      severity: highestPainLevel && highestPainLevel >= 7 ? 'high' : 'medium',
      factors: [
        `${painEntries.length} active pain entries are open`,
        highestPainLevel ? `Highest pain level is ${highestPainLevel}/10` : 'Pain level is missing from at least one active entry',
      ],
      mitigation: [
        'Review affected body regions before workout changes',
        'Use regressions or substitutions for painful movements',
        'Track follow-up status before progressing load',
      ],
      timeline: 'Current',
      monitoring: ['Pain entry status', 'Pain level trend', 'Exercise substitutions'],
    });
  }

  if (totalWorkouts > 0) {
    insights.push({
      id: 'workout-history-loaded',
      type: 'achievement',
      category: 'performance',
      title: 'Workout history loaded',
      description: `${totalWorkouts} completed workout ${totalWorkouts === 1 ? 'record is' : 'records are'} available for this client.`,
      confidence: 86,
      priority: 'low',
      actionable: false,
      data: { clientId, source: 'recentWorkouts' },
      timestamp: fetchedAt,
      modelUsed: 'AI BFF client summary',
      evidencePoints: [
        `Workout stats returned ${totalWorkouts} completed workouts`,
        lastWorkoutDate ? `Latest workout date: ${new Date(lastWorkoutDate).toLocaleDateString()}` : 'Latest workout date was not returned',
      ],
    });
  } else {
    insights.push({
      id: 'no-workout-history',
      type: 'recommendation',
      category: 'workout',
      title: 'Workout data is missing',
      description: 'No completed workouts were returned for this client, so progress predictions should wait for logged training data.',
      confidence: 88,
      priority: 'medium',
      actionable: true,
      action: {
        label: 'Open Logger',
        callback: () => onInsightAction?.('no-workout-history', 'open-workout-logger'),
      },
      data: { clientId, source: 'recentWorkouts' },
      timestamp: fetchedAt,
      modelUsed: 'AI BFF client summary',
      evidencePoints: ['Workout stats returned zero completed workouts'],
    });

    recommendations.push({
      id: 'log-next-workout',
      title: 'Log the next workout',
      description: 'Capture one complete workout before relying on trend or prediction language for this client.',
      type: 'short-term',
      impact: 'medium',
      effort: 'low',
      category: 'Workout',
      confidence: 88,
      estimatedBenefit: 'Creates a real baseline for progress analysis',
      implementationSteps: [
        'Open the workout logger',
        'Record exercises, sets, reps, and intensity',
        'Refresh this panel after save',
      ],
      relatedMetrics: ['completed workouts', 'training volume', 'intensity'],
    });
  }

  if (lastWorkoutDays !== null && lastWorkoutDays > 14) {
    riskAssessments.push({
      id: 'inactivity-dropout-risk',
      riskType: 'dropout',
      probability: clampPercent(35 + lastWorkoutDays),
      severity: lastWorkoutDays > 30 ? 'high' : 'medium',
      factors: [
        `Last completed workout was ${lastWorkoutDays} days ago`,
        'Recent workout cadence is below the active coaching target',
      ],
      mitigation: [
        'Schedule a low-friction check-in',
        'Assign a shorter re-entry workout',
        'Confirm barriers before increasing volume',
      ],
      timeline: 'Next 7 days',
      monitoring: ['Last workout date', 'Scheduled sessions', 'Workout completion'],
    });
  }

  if (latestMeasurement) {
    insights.push({
      id: 'latest-measurement-available',
      type: 'achievement',
      category: 'health',
      title: 'Measurement baseline available',
      description: measurementDate
        ? `Latest body measurement was recorded on ${new Date(measurementDate).toLocaleDateString()}.`
        : 'A latest body measurement exists, but the measurement date was not returned.',
      confidence: 84,
      priority: 'low',
      actionable: false,
      data: { clientId, source: 'latestMeasurements' },
      timestamp: fetchedAt,
      modelUsed: 'AI BFF client summary',
      evidencePoints: [
        measurementDate ? `Measurement date: ${new Date(measurementDate).toLocaleDateString()}` : 'Measurement record exists without a date',
        fitnessGoal !== 'Unspecified' ? `Client goal: ${fitnessGoal}` : 'Client goal was not returned',
      ],
    });
  } else {
    recommendations.push({
      id: 'record-current-measurements',
      title: 'Record current measurements',
      description: 'Add a current body measurement before drawing body-composition or transformation conclusions.',
      type: 'short-term',
      impact: 'medium',
      effort: 'low',
      category: 'Measurements',
      confidence: 82,
      estimatedBenefit: 'Improves trend confidence for progress reviews',
      implementationSteps: [
        'Open the measurement workflow',
        'Capture required body metrics',
        'Refresh AI insights after save',
      ],
      relatedMetrics: ['body measurements', 'measurement date', 'progress trend'],
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'client-summary-data-needed',
      type: 'recommendation',
      category: 'performance',
      title: 'More client data needed',
      description: 'The client summary endpoint returned no usable workout, pain, or measurement signals.',
      confidence: 80,
      priority: 'medium',
      actionable: true,
      action: {
        label: 'Refresh',
        callback: () => onInsightAction?.('client-summary-data-needed', 'refresh'),
      },
      data: { clientId },
      timestamp: fetchedAt,
      modelUsed: 'AI BFF client summary',
      evidencePoints: ['No usable source records were returned by the BFF summary response'],
    });
  }

  return {
    insights,
    recommendations,
    riskAssessments,
    models: [],
  };
};

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  clientId,
  refreshInterval = 30000,
  onInsightAction,
  onRecommendationImplement
}) => {
  const { authAxios } = useAuth();
  // State management
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [models, setModels] = useState<PredictionModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyActionable, setShowOnlyActionable] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [expandedAccordion, setExpandedAccordion] = useState<string>('insights');

  const loadInsights = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await authAxios.get(`/api/admin/ai-bff/client-summary/${clientId}`);
      const built = buildClientSummaryInsights(response.data as ClientSummaryPayload, clientId, onInsightAction);
      setInsights(built.insights);
      setRecommendations(built.recommendations);
      setRiskAssessments(built.riskAssessments);
      setModels(built.models);
    } catch (error) {
      logger.error('[AIInsightsPanel] Failed to load client summary insights', {
        clientId,
        error: error instanceof Error ? error.message : String(error),
      });
      setInsights([]);
      setRecommendations([]);
      setRiskAssessments([]);
      setModels([]);
      setLoadError('Client AI summary is unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, clientId, onInsightAction]);

  useEffect(() => {
    void loadInsights();
  }, [loadInsights]);

  useEffect(() => {
    if (refreshInterval <= 0) return undefined;
    const interval = setInterval(() => {
      void loadInsights();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [loadInsights, refreshInterval]);

  // Filter insights based on criteria
  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      // Category filter
      if (selectedCategory !== 'all' && insight.category !== selectedCategory) {
        return false;
      }

      // Actionable filter
      if (showOnlyActionable && !insight.actionable) {
        return false;
      }

      // Confidence threshold
      if (insight.confidence < confidenceThreshold) {
        return false;
      }

      return true;
    });
  }, [insights, selectedCategory, showOnlyActionable, confidenceThreshold]);

  // Get icon for insight type
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'recommendation':
        return <Sparkles size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'prediction':
        return <TrendingUp size={20} />;
      case 'optimization':
        return <SlidersHorizontal size={20} />;
      case 'achievement':
        return <CheckCircle2 size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  // Get color for insight type
  const getInsightColor = (type: string) => {
    switch (type) {
      case 'recommendation':
        return '#2196f3';
      case 'warning':
        return '#ff9800';
      case 'prediction':
        return '#8B5CF6';
      case 'optimization':
        return '#4caf50';
      case 'achievement':
        return '#ffd700';
      default:
        return '#999';
    }
  };

  // Inner accordion state for insight cards and risk cards
  const [expandedInnerAccordions, setExpandedInnerAccordions] = useState<Record<string, boolean>>({});
  const toggleInnerAccordion = (id: string) => {
    setExpandedInnerAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Render insight card
  const renderInsightCard = (insight: AIInsight) => (
    <InsightCardStyled key={insight.id}>
      <FlexRow $justify="space-between" $align="flex-start" $mb={16}>
        <FlexRow $align="center" $gap={12}>
          <AvatarCircle $bgColor={getInsightColor(insight.type)}>
            {getInsightIcon(insight.type)}
          </AvatarCircle>
          <div>
            <Heading6>{insight.title}</Heading6>
            <FlexRow $gap={6} $align="center" $wrap>
              <ChipStyled
                $bgColor={`${getInsightColor(insight.type)}20`}
                $textColor={getInsightColor(insight.type)}
              >
                {insight.type}
              </ChipStyled>
              <ChipStyled $outlined $textColor={theme.textMuted}>
                {insight.category}
              </ChipStyled>
              {(() => {
                const colors = getStatusChipColors(
                  insight.priority === 'critical' ? 'critical' :
                  insight.priority === 'high' ? 'warning' :
                  insight.priority === 'medium' ? 'info' : 'default'
                );
                return (
                  <ChipStyled $bgColor={colors.bg} $textColor={colors.text}>
                    {insight.priority}
                  </ChipStyled>
                );
              })()}
            </FlexRow>
          </div>
        </FlexRow>
        <ConfidenceBox $confidence={insight.confidence}>
          <Brain size={16} />
          <CaptionText $fw={600}>{insight.confidence}%</CaptionText>
        </ConfidenceBox>
      </FlexRow>

      <BodyText $mb={16}>{insight.description}</BodyText>

      {/* Evidence accordion */}
      <AccordionWrapper>
        <AccordionHeader
          $expanded={!!expandedInnerAccordions[`insight-${insight.id}`]}
          onClick={() => toggleInnerAccordion(`insight-${insight.id}`)}
        >
          <CaptionText $color={theme.textMuted}>
            AI Model: {insight.modelUsed}
          </CaptionText>
          <ChevronDown size={18} />
        </AccordionHeader>
        <AccordionBody $expanded={!!expandedInnerAccordions[`insight-${insight.id}`]}>
          <SectionBox $mb={12}>
            <CaptionText $color={theme.textMuted} $block>Evidence Points:</CaptionText>
            <ListUl>
              {insight.evidencePoints.map((point, index) => (
                <ListLi key={index} $py={4}>
                  <ListIconWrap $minW={20}>
                    <CheckCircle2 size={14} color="#4caf50" />
                  </ListIconWrap>
                  <BodyText $color={theme.text}>{point}</BodyText>
                </ListLi>
              ))}
            </ListUl>
          </SectionBox>
        </AccordionBody>
      </AccordionWrapper>

      <FlexRow $justify="space-between" $align="center" $mt={12}>
        <CaptionText $color={theme.textMuted}>
          {new Date(insight.timestamp).toLocaleString()}
        </CaptionText>
        {insight.actionable && insight.action && (
          <ActionButton $variant="contained" onClick={insight.action.callback}>
            {insight.action.label}
          </ActionButton>
        )}
      </FlexRow>
    </InsightCardStyled>
  );

  // Render recommendations section
  const renderRecommendations = () => (
    <div>
      <SectionHeading $color={theme.purple}>
        AI Recommendations
      </SectionHeading>
      <GridContainer $cols="1fr 1fr" $gap={16}>
        {recommendations.length === 0 ? (
          <EmptyPanel>
            <BodyText>No data-backed recommendations are available yet.</BodyText>
          </EmptyPanel>
        ) : recommendations.map((rec) => (
          <CardPanel key={rec.id}>
            <FlexRow $justify="space-between" $align="flex-start" $mb={12}>
              <Heading6>{rec.title}</Heading6>
              {(() => {
                const colors = getStatusChipColors(
                  rec.type === 'immediate' ? 'error' :
                  rec.type === 'short-term' ? 'warning' : 'info'
                );
                return (
                  <ChipStyled $bgColor={colors.bg} $textColor={colors.text}>
                    {rec.type}
                  </ChipStyled>
                );
              })()}
            </FlexRow>

            <BodyText $mb={12}>{rec.description}</BodyText>

            <FlexRow $gap={6} $mb={12} $wrap>
              {(() => {
                const impactColors = getStatusChipColors(
                  rec.impact === 'high' ? 'success' :
                  rec.impact === 'medium' ? 'warning' : 'default'
                );
                return (
                  <ChipStyled $bgColor={impactColors.bg} $textColor={impactColors.text}>
                    {rec.impact} impact
                  </ChipStyled>
                );
              })()}
              <ChipStyled $outlined $textColor={theme.textMuted}>
                {rec.effort} effort
              </ChipStyled>
              <ChipStyled $outlined $textColor={theme.textMuted}>
                {rec.category}
              </ChipStyled>
            </FlexRow>

            <SectionBox $mb={12}>
              <CaptionText $color={theme.textMuted} $block>
                Estimated Benefit:
              </CaptionText>
              <BodyText $color="#4caf50" $fw={600}>
                {rec.estimatedBenefit}
              </BodyText>
            </SectionBox>

            <ConfidenceBox $confidence={rec.confidence}>
              <Star size={16} />
              <CaptionText $fw={600}>{rec.confidence}% confidence</CaptionText>
            </ConfidenceBox>

            <SectionBox $mt={12}>
              <ActionButton
                $variant="outlined"
                $fullWidth
                onClick={() => onRecommendationImplement?.(rec.id)}
              >
                View Implementation Plan
              </ActionButton>
            </SectionBox>
          </CardPanel>
        ))}
      </GridContainer>
    </div>
  );

  // Render risk assessments
  const renderRiskAssessments = () => (
    <div>
      <SectionHeading $color={theme.warning}>
        Risk Assessments
      </SectionHeading>
      <GridContainer $cols="1fr 1fr" $gap={16}>
        {riskAssessments.length === 0 ? (
          <EmptyPanel>
            <BodyText>No data-backed risk signals were returned by the client summary.</BodyText>
          </EmptyPanel>
        ) : riskAssessments.map((risk) => (
          <CardPanel key={risk.id}>
            <FlexRow $justify="space-between" $align="center" $mb={12}>
              <Heading6 $capitalize>
                {risk.riskType.replace('_', ' ')} Risk
              </Heading6>
              {(() => {
                const colors = getStatusChipColors(
                  risk.severity === 'high' ? 'error' :
                  risk.severity === 'medium' ? 'warning' : 'success'
                );
                return (
                  <ChipStyled $bgColor={colors.bg} $textColor={colors.text}>
                    {risk.severity}
                  </ChipStyled>
                );
              })()}
            </FlexRow>

            <SectionBox $mb={16}>
              <RiskProgressFrame>
                <CircularProgressSVG
                  value={risk.probability}
                  size={100}
                  strokeWidth={4}
                  color={
                    risk.probability > 70 ? '#f44336' :
                    risk.probability > 40 ? '#ff9800' : '#4caf50'
                  }
                />
                <RiskProgressCenter>
                  <RiskProbabilityValue>
                    {risk.probability}%
                  </RiskProbabilityValue>
                  <CaptionText $color={theme.textMuted}>Risk</CaptionText>
                </RiskProgressCenter>
              </RiskProgressFrame>
            </SectionBox>

            <CaptionText $color={theme.textMuted} $block>
              Timeline: {risk.timeline}
            </CaptionText>

            <SectionBox $mt={12}>
              <AccordionWrapper>
                <AccordionHeader
                  $expanded={!!expandedInnerAccordions[`risk-${risk.id}`]}
                  onClick={() => toggleInnerAccordion(`risk-${risk.id}`)}
                >
                  <BodyText $color={theme.text}>View Details</BodyText>
                  <ChevronDown size={18} />
                </AccordionHeader>
                <AccordionBody $expanded={!!expandedInnerAccordions[`risk-${risk.id}`]}>
                  <SectionBox $mb={12}>
                    <CaptionText $color={theme.textMuted} $block>
                      Risk Factors:
                    </CaptionText>
                    <ListUl>
                      {risk.factors.map((factor, index) => (
                        <ListLi key={index} $py={2}>
                          <ListIconWrap $minW={20}>
                            <AlertTriangle size={14} color="#ff9800" />
                          </ListIconWrap>
                          <CaptionText $color={theme.text}>{factor}</CaptionText>
                        </ListLi>
                      ))}
                    </ListUl>
                  </SectionBox>

                  <div>
                    <CaptionText $color={theme.textMuted} $block>
                      Mitigation Strategies:
                    </CaptionText>
                    <ListUl>
                      {risk.mitigation.map((strategy, index) => (
                        <ListLi key={index} $py={2}>
                          <ListIconWrap $minW={20}>
                            <CheckCircle2 size={14} color="#4caf50" />
                          </ListIconWrap>
                          <CaptionText $color={theme.text}>{strategy}</CaptionText>
                        </ListLi>
                      ))}
                    </ListUl>
                  </div>
                </AccordionBody>
              </AccordionWrapper>
            </SectionBox>
          </CardPanel>
        ))}
      </GridContainer>
    </div>
  );

  // Render AI models overview
  const renderModelsOverview = () => (
    <div>
      <SectionHeading $color={theme.cyan}>
        Active AI Models
      </SectionHeading>
      <GridContainer $cols="1fr 1fr 1fr" $gap={16}>
        {models.length === 0 ? (
          <EmptyPanel>
            <BodyText>AI model telemetry is not available from the current client-summary endpoint.</BodyText>
          </EmptyPanel>
        ) : models.map((model) => (
          <AIModelCardStyled key={model.id}>
            <FlexRow $justify="space-between" $align="flex-start" $mb={12}>
              <Heading6>{model.name}</Heading6>
              {(() => {
                const colors = getStatusChipColors(
                  model.status === 'active' ? 'success' :
                  model.status === 'training' ? 'warning' : 'default'
                );
                return (
                  <ChipStyled $bgColor={colors.bg} $textColor={colors.text}>
                    {model.status}
                  </ChipStyled>
                );
              })()}
            </FlexRow>

            <BodyText $mb={12}>{model.description}</BodyText>

            <SectionBox $mb={12}>
              <FlexRow $justify="space-between" $align="center" $mb={4}>
                <CaptionText $color={theme.textMuted}>Accuracy</CaptionText>
                <BodyText $color="#4caf50" $fw={600}>{model.accuracy}%</BodyText>
              </FlexRow>
              <ProgressBarTrack>
                <ProgressBarFill $value={model.accuracy} $color="#4caf50" />
              </ProgressBarTrack>
            </SectionBox>

            <FlexRow $justify="space-between" $align="center">
              <div>
                <CaptionText $color={theme.textMuted} $block>
                  Predictions Made
                </CaptionText>
                <Heading6 $color={theme.cyan}>
                  {model.predictions.toLocaleString()}
                </Heading6>
              </div>
              <RightAlignedBlock>
                <CaptionText $color={theme.textMuted} $block>
                  Last Trained
                </CaptionText>
                <BodyText $color={theme.text}>
                  {new Date(model.lastTrained).toLocaleDateString()}
                </BodyText>
              </RightAlignedBlock>
            </FlexRow>
          </AIModelCardStyled>
        ))}
      </GridContainer>
    </div>
  );

  return (
    <PanelRoot>
      {/* Header */}
      <SectionBox $mb={32}>
        <Heading4 $color={theme.purple}>
          <Brain size={40} />
          AI Insights &amp; Analytics
        </Heading4>
        <BodyText $mt={8}>
          Client-summary insights from verified workout, pain, and measurement data.
        </BodyText>
      </SectionBox>

      {/* Controls */}
      <SectionBox $mb={24}>
        <ControlsGrid>
          <div>
            <SelectLabel htmlFor="ai-category-select">Category</SelectLabel>
            <StyledSelect
              id="ai-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="workout">Workout</option>
              <option value="nutrition">Nutrition</option>
              <option value="recovery">Recovery</option>
              <option value="performance">Performance</option>
              <option value="health">Health</option>
            </StyledSelect>
          </div>

          <SectionBox $px={8}>
            <CaptionText $color={theme.textMuted} $block $mb={8}>
              Confidence Threshold: {confidenceThreshold}%
            </CaptionText>
            <RangeInput
              type="range"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              min={50}
              max={100}
              step={5}
            />
          </SectionBox>

          <ToggleLabel htmlFor="ai-insights-actionable-only">
            <HiddenCheckbox
              id="ai-insights-actionable-only"
              type="checkbox"
              checked={showOnlyActionable}
              onChange={(e) => setShowOnlyActionable(e.target.checked)}
            />
            <ToggleTrack $checked={showOnlyActionable}>
              <ToggleThumb $checked={showOnlyActionable} />
            </ToggleTrack>
            <BodyText $color={theme.text}>Actionable Only</BodyText>
          </ToggleLabel>

          <FlexRow $gap={8}>
            <ActionButton
              $variant="outlined"
              title="Refresh insights"
              onClick={() => void loadInsights()}
              disabled={isLoading}
            >
              <RefreshCw size={16} />
              {isLoading ? 'Refreshing' : 'Refresh'}
            </ActionButton>
            <ActionButton
              $variant="outlined"
              title="Model settings require backend telemetry"
              disabled
            >
              <Settings size={16} />
              Settings
            </ActionButton>
          </FlexRow>
        </ControlsGrid>
      </SectionBox>

      {loadError && (
        <SectionBox $mb={16}>
          <EmptyPanel>
            <BodyText>{loadError}</BodyText>
          </EmptyPanel>
        </SectionBox>
      )}

      {/* Content */}
      <div>
        <AccordionWrapper>
          <AccordionHeader
            $expanded={expandedAccordion === 'insights'}
            onClick={() => setExpandedAccordion(expandedAccordion === 'insights' ? '' : 'insights')}
          >
            <Heading6 $color={theme.purple} $m="0">
              AI Insights ({filteredInsights.length})
            </Heading6>
            <ChevronDown size={20} />
          </AccordionHeader>
          <AccordionBody $expanded={expandedAccordion === 'insights'}>
            <GridContainer $cols="1fr" $gap={20}>
              {filteredInsights.length === 0 ? (
                <EmptyPanel>
                  <BodyText>No insights match the current filters.</BodyText>
                </EmptyPanel>
              ) : filteredInsights.map(renderInsightCard)}
            </GridContainer>
          </AccordionBody>
        </AccordionWrapper>

        <AccordionWrapper>
          <AccordionHeader
            $expanded={expandedAccordion === 'recommendations'}
            onClick={() => setExpandedAccordion(expandedAccordion === 'recommendations' ? '' : 'recommendations')}
          >
            <Heading6 $color={theme.purple} $m="0">
              Smart Recommendations
            </Heading6>
            <ChevronDown size={20} />
          </AccordionHeader>
          <AccordionBody $expanded={expandedAccordion === 'recommendations'}>
            {renderRecommendations()}
          </AccordionBody>
        </AccordionWrapper>

        <AccordionWrapper>
          <AccordionHeader
            $expanded={expandedAccordion === 'risks'}
            onClick={() => setExpandedAccordion(expandedAccordion === 'risks' ? '' : 'risks')}
          >
            <Heading6 $color={theme.purple} $m="0">
              Risk Assessments
            </Heading6>
            <ChevronDown size={20} />
          </AccordionHeader>
          <AccordionBody $expanded={expandedAccordion === 'risks'}>
            {renderRiskAssessments()}
          </AccordionBody>
        </AccordionWrapper>

        <AccordionWrapper>
          <AccordionHeader
            $expanded={expandedAccordion === 'models'}
            onClick={() => setExpandedAccordion(expandedAccordion === 'models' ? '' : 'models')}
          >
            <Heading6 $color={theme.purple} $m="0">
              AI Models Overview
            </Heading6>
            <ChevronDown size={20} />
          </AccordionHeader>
          <AccordionBody $expanded={expandedAccordion === 'models'}>
            {renderModelsOverview()}
          </AccordionBody>
        </AccordionWrapper>
      </div>
    </PanelRoot>
  );
};

export default AIInsightsPanel;
