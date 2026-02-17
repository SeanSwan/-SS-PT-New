/**
 * AI Insights Panel Component
 * 7-Star AAA Personal Training & Social Media App
 *
 * Advanced AI-powered insights system providing:
 * - Predictive analytics and recommendations
 * - Risk assessment and early warning systems
 * - Personalized coaching suggestions
 * - Performance optimization insights
 * - Behavioral analysis and engagement recommendations
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  Brain,
  TrendingUp,
  Lightbulb,
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
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts';

// ── Galaxy-Swan Theme Tokens ──
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgCard: 'rgba(15,23,42,0.85)',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.4)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  purple: '#7851a9',
  purpleLight: '#b794f6',
  cyan: '#00ffff',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  gold: '#ffd700',
  blue: '#2196f3',
  glass: 'rgba(255,255,255,0.02)',
  glassHover: 'rgba(255,255,255,0.05)',
};

// ── Keyframes ──
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const progressFill = keyframes`
  from { stroke-dashoffset: 282.7; }
`;

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
}>`
  display: flex;
  ${({ $justify }) => $justify && css`justify-content: ${$justify};`}
  ${({ $align }) => $align && css`align-items: ${$align};`}
  ${({ $gap }) => $gap != null && css`gap: ${$gap}px;`}
  ${({ $wrap }) => $wrap && css`flex-wrap: wrap;`}
  ${({ $mb }) => $mb != null && css`margin-bottom: ${$mb}px;`}
`;

const FlexCol = styled.div<{ $align?: string }>`
  display: flex;
  flex-direction: column;
  ${({ $align }) => $align && css`align-items: ${$align};`}
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

// ── GlassPanel ──
const GlassPanel = styled.div<{ $noPad?: boolean }>`
  background: ${theme.bg};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${theme.border};
  border-radius: 16px;
  ${({ $noPad }) => !$noPad && css`padding: 20px;`}
  position: relative;
  overflow: hidden;
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
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;

  &:hover {
    background: ${theme.glassHover};
    border-color: rgba(0, 255, 255, 0.4);
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

const Heading6 = styled.h3<{ $color?: string; $capitalize?: boolean }>`
  font-size: 1.1rem;
  font-weight: 600;
  color: ${({ $color }) => $color || theme.text};
  margin: 0 0 4px 0;
  line-height: 1.4;
  ${({ $capitalize }) => $capitalize && css`text-transform: capitalize;`}
`;

const BodyText = styled.p<{ $color?: string; $fw?: number; $mb?: number }>`
  font-size: 0.875rem;
  color: ${({ $color }) => $color || theme.textMuted};
  margin: 0;
  ${({ $fw }) => $fw && css`font-weight: ${$fw};`}
  ${({ $mb }) => $mb != null && css`margin-bottom: ${$mb}px;`}
  line-height: 1.5;
`;

const CaptionText = styled.span<{ $color?: string; $fw?: number; $block?: boolean }>`
  font-size: 0.75rem;
  color: ${({ $color }) => $color || theme.textMuted};
  ${({ $fw }) => $fw && css`font-weight: ${$fw};`}
  ${({ $block }) => $block && css`display: block;`}
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

  ${({ $outlined, $textColor }) =>
    $outlined
      ? css`
          background: transparent;
          border: 1px solid ${$textColor || theme.textMuted};
          color: ${$textColor || theme.textMuted};
        `
      : css`
          background: ${({ $bgColor }: any) => $bgColor || 'rgba(255,255,255,0.1)'};
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

  ${({ $variant }) =>
    $variant === 'contained'
      ? css`
          background: linear-gradient(135deg, #7851a9, #b794f6);
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
            border-color: #7851a9;
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
      <circle
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
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
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
  data?: any;
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

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  clientId,
  refreshInterval = 30000,
  onInsightAction,
  onRecommendationImplement
}) => {
  // State management
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [models, setModels] = useState<PredictionModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyActionable, setShowOnlyActionable] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(70);
  const [expandedAccordion, setExpandedAccordion] = useState<string>('insights');

  // Mock data generation
  const generateMockInsights = (): AIInsight[] => [
    {
      id: '1',
      type: 'recommendation',
      category: 'workout',
      title: 'Increase Progressive Overload',
      description: 'Based on your recovery metrics and performance data, you can handle 12% more volume in your upper body workouts.',
      confidence: 94,
      priority: 'high',
      actionable: true,
      action: {
        label: 'Adjust Workout Plan',
        callback: () => console.log('Adjusting workout plan...')
      },
      timestamp: '2024-12-10T14:30:00Z',
      modelUsed: 'Training Load Optimizer v2.1',
      evidencePoints: [
        'HRV has improved by 15% over last 2 weeks',
        'Current training stress score is 65/100',
        'No signs of overreaching in recent sessions',
        'Sleep quality average 8.2/10'
      ],
      relatedInsights: ['2', '3']
    },
    {
      id: '2',
      type: 'warning',
      category: 'recovery',
      title: 'Recovery Pattern Change Detected',
      description: 'Your sleep quality has decreased by 18% over the past week. This may impact performance and injury risk.',
      confidence: 87,
      priority: 'medium',
      actionable: true,
      action: {
        label: 'Optimize Recovery Protocol',
        callback: () => console.log('Opening recovery recommendations...')
      },
      timestamp: '2024-12-10T12:15:00Z',
      modelUsed: 'Recovery Predictor AI',
      evidencePoints: [
        'Average sleep duration decreased from 8.1h to 6.9h',
        'REM sleep percentage down 22%',
        'Morning HRV readings 12% below baseline',
        'Reported fatigue levels increased'
      ]
    },
    {
      id: '3',
      type: 'prediction',
      category: 'performance',
      title: 'PR Prediction',
      description: 'High probability (89%) of achieving a new personal record in bench press within the next 2 weeks.',
      confidence: 89,
      priority: 'medium',
      actionable: false,
      timestamp: '2024-12-10T09:00:00Z',
      modelUsed: 'Performance Predictor Neural Network',
      evidencePoints: [
        'Strength progression curve indicates optimal timing',
        'Recent volume has prepared neuromuscular system',
        'Recovery metrics are within optimal range',
        'Historical data shows similar patterns before PRs'
      ]
    },
    {
      id: '4',
      type: 'optimization',
      category: 'nutrition',
      title: 'Meal Timing Optimization',
      description: 'Adjusting your pre-workout meal timing by 45 minutes could improve performance by an estimated 8-12%.',
      confidence: 76,
      priority: 'low',
      actionable: true,
      action: {
        label: 'Create Meal Plan',
        callback: () => console.log('Creating optimized meal plan...')
      },
      timestamp: '2024-12-10T08:45:00Z',
      modelUsed: 'Nutrition Timing AI',
      evidencePoints: [
        'Current meal timing shows suboptimal insulin response',
        'Energy availability during workouts could be improved',
        'Glycogen replenishment timing has room for optimization'
      ]
    },
    {
      id: '5',
      type: 'achievement',
      category: 'social',
      title: 'Engagement Milestone Reached',
      description: 'You\'ve reached a new level of community engagement! Your social score has increased by 25% this month.',
      confidence: 100,
      priority: 'low',
      actionable: false,
      timestamp: '2024-12-09T19:30:00Z',
      modelUsed: 'Social Engagement Tracker',
      evidencePoints: [
        'Increased app usage by 30%',
        'More frequent workout posts',
        'Higher interaction rates with other users',
        'Completed 3 group challenges'
      ]
    }
  ];

  const generateMockRecommendations = (): AIRecommendation[] => [
    {
      id: 'r1',
      title: 'Implement Periodization Blocks',
      description: 'Your training would benefit from structured periodization with specific power, strength, and endurance blocks.',
      type: 'long-term',
      impact: 'high',
      effort: 'medium',
      category: 'Programming',
      confidence: 91,
      estimatedBenefit: '15-25% performance improvement over 6 months',
      implementationSteps: [
        'Complete current training cycle',
        'Design 3-phase periodization plan',
        'Start with power block (weeks 1-4)',
        'Monitor and adjust based on response'
      ],
      relatedMetrics: ['power output', 'strength gains', 'recovery scores']
    },
    {
      id: 'r2',
      title: 'Add Mobility Work Focus',
      description: 'Your movement quality assessments suggest targeted mobility work could prevent future issues.',
      type: 'immediate',
      impact: 'medium',
      effort: 'low',
      category: 'Movement Quality',
      confidence: 83,
      estimatedBenefit: 'Reduced injury risk by 30-40%',
      implementationSteps: [
        'Add 10-minute mobility routine to warm-up',
        'Focus on hip and shoulder mobility',
        'Include 2 dedicated mobility sessions per week',
        'Track range of motion improvements'
      ],
      relatedMetrics: ['joint mobility', 'movement quality', 'injury risk']
    },
    {
      id: 'r3',
      title: 'Optimize Rest Periods',
      description: 'AI analysis suggests customizing rest periods based on heart rate recovery could improve workout efficiency.',
      type: 'short-term',
      impact: 'medium',
      effort: 'low',
      category: 'Training Efficiency',
      confidence: 78,
      estimatedBenefit: '8-12% time savings with equal or better results',
      implementationSteps: [
        'Implement HRV-based rest period calculator',
        'Use 85% max HR recovery as rest completion marker',
        'Adjust rest periods by exercise complexity',
        'Monitor volume and intensity maintenance'
      ],
      relatedMetrics: ['heart rate recovery', 'training volume', 'time efficiency']
    }
  ];

  const generateMockRisks = (): RiskAssessment[] => [
    {
      id: 'risk1',
      riskType: 'overtraining',
      probability: 23,
      severity: 'medium',
      factors: [
        'Training load increased by 35% last month',
        'HRV showing declining trend',
        'Self-reported fatigue scores elevated',
        'Sleep duration decreased'
      ],
      mitigation: [
        'Implement mandatory recovery day',
        'Reduce volume by 15% for next week',
        'Focus on sleep optimization',
        'Add stress management techniques'
      ],
      timeline: 'Next 2-3 weeks',
      monitoring: [
        'Daily HRV measurements',
        'Weekly fatigue questionnaire',
        'Training load calculations',
        'Sleep quality tracking'
      ]
    },
    {
      id: 'risk2',
      riskType: 'plateauing',
      probability: 67,
      severity: 'low',
      factors: [
        'Progress rate has slowed by 40%',
        'Same training variables for 6 weeks',
        'Adaptation markers stabilizing',
        'Motivation scores declining'
      ],
      mitigation: [
        'Introduce new training stimulus',
        'Modify rep ranges and tempos',
        'Add exercise variations',
        'Set short-term challenges'
      ],
      timeline: 'Current',
      monitoring: [
        'Weekly performance metrics',
        'Training load variety',
        'Motivation assessments',
        'Progress photo comparisons'
      ]
    }
  ];

  const mockModels: PredictionModel[] = [
    {
      id: 'm1',
      name: 'Performance Predictor',
      description: 'Predicts future PR achievements and performance milestones',
      accuracy: 94.2,
      lastTrained: '2024-12-08',
      status: 'active',
      predictions: 1247,
      category: 'Performance'
    },
    {
      id: 'm2',
      name: 'Injury Risk Assessor',
      description: 'Evaluates injury risk based on movement patterns and load',
      accuracy: 91.8,
      lastTrained: '2024-12-07',
      status: 'active',
      predictions: 892,
      category: 'Health & Safety'
    },
    {
      id: 'm3',
      name: 'Recovery Optimizer',
      description: 'Recommends optimal recovery protocols based on biomarkers',
      accuracy: 88.5,
      lastTrained: '2024-12-09',
      status: 'training',
      predictions: 634,
      category: 'Recovery'
    }
  ];

  // Initialize data
  useEffect(() => {
    setInsights(generateMockInsights());
    setRecommendations(generateMockRecommendations());
    setRiskAssessments(generateMockRisks());
    setModels(mockModels);
  }, []);

  // Auto-refresh insights
  useEffect(() => {
    const interval = setInterval(() => {
      if (refreshInterval > 0) {
        // In a real implementation, this would fetch new insights
        console.log('Auto-refreshing AI insights...');
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

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
  const getInsightIcon = (type: string, category: string) => {
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
        return '#7851a9';
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
            {getInsightIcon(insight.type, insight.category)}
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

      <FlexRow $justify="space-between" $align="center" $mt={12} style={{ marginTop: 12 }}>
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
      <Heading6 $color={theme.purple} style={{ marginBottom: 16 }}>
        AI Recommendations
      </Heading6>
      <GridContainer $cols="1fr 1fr" $gap={16}>
        {recommendations.map((rec) => (
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
      <Heading6 $color={theme.warning} style={{ marginBottom: 16 }}>
        Risk Assessments
      </Heading6>
      <GridContainer $cols="1fr 1fr" $gap={16}>
        {riskAssessments.map((risk) => (
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
              <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                <CircularProgressSVG
                  value={risk.probability}
                  size={100}
                  strokeWidth={4}
                  color={
                    risk.probability > 70 ? '#f44336' :
                    risk.probability > 40 ? '#ff9800' : '#4caf50'
                  }
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                  }}
                >
                  <span style={{ fontSize: '1.75rem', fontWeight: 700, color: theme.text }}>
                    {risk.probability}%
                  </span>
                  <CaptionText $color={theme.textMuted}>Risk</CaptionText>
                </div>
              </div>
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
      <Heading6 $color={theme.cyan} style={{ marginBottom: 16 }}>
        Active AI Models
      </Heading6>
      <GridContainer $cols="1fr 1fr 1fr" $gap={16}>
        {models.map((model) => (
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
              <div style={{ textAlign: 'right' }}>
                <CaptionText $color={theme.textMuted} $block>
                  Last Trained
                </CaptionText>
                <BodyText $color={theme.text}>
                  {new Date(model.lastTrained).toLocaleDateString()}
                </BodyText>
              </div>
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
        <BodyText style={{ marginTop: 8 }}>
          Advanced AI-powered insights, predictions, and personalized recommendations
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
            <CaptionText $color={theme.textMuted} $block style={{ marginBottom: 8 }}>
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

          <ToggleLabel>
            <HiddenCheckbox
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
            <ActionButton $variant="outlined" title="Refresh insights">
              <RefreshCw size={16} />
              Refresh
            </ActionButton>
            <ActionButton $variant="outlined" title="Settings">
              <Settings size={16} />
              Settings
            </ActionButton>
          </FlexRow>
        </ControlsGrid>
      </SectionBox>

      {/* Content */}
      <div>
        <AccordionWrapper>
          <AccordionHeader
            $expanded={expandedAccordion === 'insights'}
            onClick={() => setExpandedAccordion(expandedAccordion === 'insights' ? '' : 'insights')}
          >
            <Heading6 $color={theme.purple} style={{ margin: 0 }}>
              AI Insights ({filteredInsights.length})
            </Heading6>
            <ChevronDown size={20} />
          </AccordionHeader>
          <AccordionBody $expanded={expandedAccordion === 'insights'}>
            <GridContainer $cols="1fr" $gap={20}>
              {filteredInsights.map(renderInsightCard)}
            </GridContainer>
          </AccordionBody>
        </AccordionWrapper>

        <AccordionWrapper>
          <AccordionHeader
            $expanded={expandedAccordion === 'recommendations'}
            onClick={() => setExpandedAccordion(expandedAccordion === 'recommendations' ? '' : 'recommendations')}
          >
            <Heading6 $color={theme.purple} style={{ margin: 0 }}>
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
            <Heading6 $color={theme.purple} style={{ margin: 0 }}>
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
            <Heading6 $color={theme.purple} style={{ margin: 0 }}>
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
