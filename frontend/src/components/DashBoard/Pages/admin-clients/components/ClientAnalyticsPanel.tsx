/**
 * ┌─── SUB-COMPONENT: ClientAnalyticsPanel ────────────────────┐
 * │ PARENT: EnhancedAdminClientManagementView (Analytics tab)   │
 * │ PURPOSE: AI-powered analytics — predictions, metrics, trends│
 * │ OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-21        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────────────┐
 * │ [📊 Engagement Score: 87%] [🧠 AI Prediction: ↑]   │ KPI Cards
 * │ [📈 Multi-chart dashboard]                           │
 * │ - Line: attendance trend                             │
 * │ - Radar: fitness dimensions (strength/cardio/flex)   │
 * │ - Bar: workout volume by week                        │
 * │ - Pie: exercise category distribution                │
 * │ [🤖 AI Insights: "Client trending toward Phase 3"]  │
 * └──────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { clientId, analyticsData }
 * State:     { dateRange, chartFilter, aiInsights }
 * Charts:    Currently Recharts (TODO: migrate to Victory per CLAUDE.md)
 *
 * NOTE: 881 lines — exceeds 300-line rule. TODO: extract chart components
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Sparkles,
  RefreshCw,
  Download,
  Share2,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MoreVertical
} from 'lucide-react';
import {
  VictoryChart,
  VictoryLine,
  VictoryBar,
  VictoryArea,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryLegend,
  VictoryPolarAxis,
} from 'victory';

// Define interfaces
interface AnalyticsMetric {
  id: string;
  title: string;
  value: number;
  unit: string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend: Array<{ period: string; value: number }>;
  target?: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface PredictionData {
  type: 'retention' | 'progress' | 'churn' | 'revenue';
  probability: number;
  confidence: number;
  period: string;
  factors: string[];
}

interface AnalyticsInsight {
  type: 'achievement' | 'recommendation' | 'warning';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  timestamp: string;
}

interface WorkoutAnalysisDatum {
  month?: string;
  workouts?: number;
  intensity?: number;
}

/* ────── Styled Components ────── */

const PageWrapper = styled.div`
  padding: 24px;
`;

const SectionHeader = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h2`
  color: #60C0F0;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  color: #94a3b8;
  font-size: 1rem;
  margin: 0;
`;

const MetricCard = styled.div`
  background: linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.05));
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(14,165,233,0.2);
  padding: 20px;
  transition: all 0.3s ease;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(139, 92, 246,0.1);
    border-color: rgba(139, 92, 246,0.3);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const CardTitle = styled.h3`
  color: #60C0F0;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
`;

const RoundButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255,255,255,0.05); }
`;

const ValueRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
`;

const BigValue = styled.span`
  color: #e2e8f0;
  font-size: 2.25rem;
  font-weight: 700;
`;

const UnitText = styled.span`
  color: #94a3b8;
  font-size: 0.875rem;
`;

const TrendIndicator = styled.div<{ $trend: 'up' | 'down' | 'neutral' }>`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${p => p.$trend === 'up' ? '#4caf50' : p.$trend === 'down' ? '#f44336' : '#999'};
  font-size: 0.875rem;
  font-weight: 600;
`;

const ProgressBarTrack = styled.div`
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.1);
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ $percent: number; $color: string }>`
  height: 100%;
  border-radius: 4px;
  width: ${p => Math.min(p.$percent, 100)}%;
  background: ${p => p.$color};
  transition: width 0.6s ease;
`;

const TargetRow = styled.div`
  margin-top: 16px;
`;

const TargetLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const CaptionText = styled.span`
  color: #94a3b8;
  font-size: 0.75rem;
`;

const SparklineWrap = styled.div`
  margin-top: 16px;
  height: 60px;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 32px;
  @media (max-width: 1024px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const DetailedGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const PredictionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;

const GlassCard = styled.div`
  background: rgba(29,31,43,0.98);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(14,165,233,0.2);
  padding: 24px;
`;

const CardTitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const CardTitleWithIcon = styled.h3`
  color: #60C0F0;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChartContainer = styled.div`
  height: 400px;
`;

const ControlPanel = styled.div`
  background: rgba(29,31,43,0.98);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  border: 1px solid rgba(14,165,233,0.2);
  padding: 16px;
  margin-bottom: 24px;
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 16px;
  align-items: center;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const NativeSelect = styled.select`
  background: rgba(15,23,42,0.95);
  border: 1px solid rgba(14,165,233,0.2);
  border-radius: 8px;
  color: #e2e8f0;
  padding: 8px 12px;
  min-height: 44px;
  font-size: 0.875rem;
  cursor: pointer;
  &:focus { outline: none; border-color: #0ea5e9; }
  option { background: #1d1f2b; color: #e2e8f0; }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0;
  & > button:first-child { border-radius: 8px 0 0 8px; }
  & > button:last-child { border-radius: 0 8px 8px 0; }
  & > button:not(:first-child):not(:last-child) { border-radius: 0; }
`;

const ViewButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid rgba(139, 92, 246,0.5);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  text-transform: none;
  transition: all 0.2s;
  ${p => p.$active ? css`
    background: linear-gradient(135deg, #60C0F0, #00c8ff);
    color: #002060;
    border-color: transparent;
  ` : css`
    background: transparent;
    color: #60C0F0;
    &:hover { background: rgba(139, 92, 246,0.1); border-color: #60C0F0; }
  `}
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const OutlineButton = styled.button`
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246,0.5);
  background: transparent;
  color: #60C0F0;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  &:hover { border-color: #60C0F0; background: rgba(139, 92, 246,0.1); }
`;

const InsightCard = styled.div`
  padding: 16px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
`;

const InsightRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
`;

const IconBox = styled.div<{ $bg: string }>`
  padding: 8px;
  border-radius: 8px;
  background: ${p => p.$bg};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const InsightBody = styled.div`
  flex: 1;
`;

const InsightTitle = styled.h4`
  color: #e2e8f0;
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 4px 0;
`;

const InsightDesc = styled.p`
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0 0 8px 0;
`;

const InsightFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChipTag = styled.span`
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  background: rgba(139, 92, 246,0.2);
  color: #60C0F0;
`;

const FactorChip = styled.span<{ $color: string }>`
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  margin: 0 4px 4px 0;
  background: ${p => `${p.$color}20`};
  color: ${p => p.$color};
`;

const PredictionCard = styled.div<{ $borderColor: string }>`
  padding: 16px;
  background: rgba(255,255,255,0.02);
  border: 1px solid ${p => `${p.$borderColor}40`};
  border-radius: 12px;
`;

const PredictionTitle = styled.h4`
  color: #e2e8f0;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: capitalize;
  margin: 0;
`;

const PredictionPeriod = styled.span`
  color: #94a3b8;
  font-size: 0.75rem;
`;

const CircularWrap = styled.div`
  display: flex;
  justify-content: center;
  position: relative;
  margin: 16px 0;
`;

const CircularOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
`;

const CircularValue = styled.span<{ $color: string }>`
  color: ${p => p.$color};
  font-size: 1.75rem;
  font-weight: 700;
`;

const ComparisonWrap = styled.div`
  text-align: center;
  padding: 64px 0;
`;

const ComparisonTitle = styled.h3`
  color: #60C0F0;
  font-size: 1.25rem;
  margin: 0 0 8px 0;
`;

const RotatedSvg = styled.svg`
  transform: rotate(-90deg);
`;

const AnimatedProgressCircle = styled.circle`
  transition: stroke-dashoffset 0.6s ease;
`;

const SpacedCardTitle = styled(CardTitle)`
  margin-bottom: 24px;
`;

const SpacedCardTitleWithIcon = styled(CardTitleWithIcon)`
  margin-bottom: 24px;
`;

const InsightsStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ActionOutlineButton = styled(OutlineButton)`
  flex-shrink: 0;
`;

const FactorsWrap = styled.div`
  margin-top: 8px;
`;

const PreviewNotice = styled.div`
  background: rgba(198, 168, 75, 0.1);
  border: 1px solid rgba(198, 168, 75, 0.3);
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #C6A84B;
  font-family: 'Sora', sans-serif;
`;

/* ────── SVG Circular Progress ────── */
const CircularProgressWidget: React.FC<{ value: number; size?: number; color: string }> = ({ value, size = 100, color }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <RotatedSvg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
      <AnimatedProgressCircle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
      />
    </RotatedSvg>
  );
};

/* ────── Component ────── */

interface ClientAnalyticsPanelProps {
  clientId?: string;
  timePeriod?: '7d' | '30d' | '90d' | '1y';
  onMetricChange?: (metric: string, value: number) => void;
}

const ClientAnalyticsPanel: React.FC<ClientAnalyticsPanelProps> = ({
  clientId: _clientId,
  timePeriod = '30d',
  onMetricChange: _onMetricChange
}) => {
  // State management
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'comparison'>('overview');
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [predictions, setPredictions] = useState<PredictionData[]>([]);

  // Mock data for demonstration
  const mockMetrics: AnalyticsMetric[] = [
    {
      id: 'workouts',
      title: 'Total Workouts',
      value: 127,
      unit: 'sessions',
      change: 12.5,
      changeType: 'increase',
      trend: Array.from({ length: 30 }, (_, i) => ({
        period: `Day ${i + 1}`,
        value: Math.floor(Math.random() * 10) + i * 0.5
      })),
      target: 150,
      status: 'good'
    },
    {
      id: 'progressScore',
      title: 'Progress Score',
      value: 94,
      unit: '%',
      change: 8.2,
      changeType: 'increase',
      trend: Array.from({ length: 30 }, (_, i) => ({
        period: `Week ${i + 1}`,
        value: 60 + Math.random() * 35
      })),
      target: 95,
      status: 'excellent'
    },
    {
      id: 'engagement',
      title: 'Engagement Level',
      value: 85,
      unit: 'score',
      change: -2.1,
      changeType: 'decrease',
      trend: Array.from({ length: 30 }, (_, i) => ({
        period: `Day ${i + 1}`,
        value: 70 + Math.random() * 20
      })),
      target: 90,
      status: 'warning'
    },
    {
      id: 'streak',
      title: 'Workout Streak',
      value: 15,
      unit: 'days',
      change: 5.0,
      changeType: 'increase',
      trend: Array.from({ length: 30 }, (_, i) => ({
        period: `Day ${i + 1}`,
        value: Math.max(0, Math.floor(Math.random() * 20))
      })),
      target: 30,
      status: 'good'
    }
  ];

  const mockInsights = useMemo<AnalyticsInsight[]>(() => [
    {
      type: 'achievement',
      title: 'Personal Record Alert',
      description: 'Client achieved new PR in bench press (+10 lbs)',
      confidence: 100,
      actionable: false,
      timestamp: '2 hours ago'
    },
    {
      type: 'recommendation',
      title: 'Volume Increase Opportunity',
      description: 'Client can handle 12% more volume based on recovery metrics',
      confidence: 87,
      actionable: true,
      timestamp: '1 day ago'
    },
    {
      type: 'warning',
      title: 'Recovery Pattern Change',
      description: 'Sleep quality decreased by 15% over last week',
      confidence: 92,
      actionable: true,
      timestamp: '2 days ago'
    }
  ], []);

  const mockPredictions = useMemo<PredictionData[]>(() => [
    {
      type: 'retention',
      probability: 94,
      confidence: 89,
      period: 'Next 30 days',
      factors: ['High engagement', 'Consistent attendance', 'Progress satisfaction']
    },
    {
      type: 'progress',
      probability: 87,
      confidence: 82,
      period: 'Next milestone',
      factors: ['Current trajectory', 'Program adherence', 'Recovery patterns']
    },
    {
      type: 'churn',
      probability: 6,
      confidence: 88,
      period: 'Next 90 days',
      factors: ['Low risk profile', 'High satisfaction scores']
    }
  ], []);

  useEffect(() => {
    setInsights(mockInsights);
    setPredictions(mockPredictions);
  }, [mockInsights, mockPredictions]);

  // Chart configurations
  const chartColors = {
    primary: '#60C0F0',
    secondary: '#8B5CF6',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    gray: '#999'
  };

  const getStatusColor = (status: string) =>
    status === 'excellent' ? chartColors.success :
    status === 'good' ? chartColors.primary :
    status === 'warning' ? chartColors.warning :
    chartColors.error;

  const hiddenAxisProps = {
    style: { axis: { stroke: 'none' }, tickLabels: { fill: 'none' } }
  };

  const sparklineStyleProps = {
    style: { data: { stroke: chartColors.primary, strokeWidth: 2 } }
  };

  const workoutTooltipProps = {
    style: { fill: '#E0ECF4', fontFamily: "'Fira Code', monospace", fontSize: 10 },
    flyoutStyle: { fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' }
  };

  const workoutAxisProps = {
    style: {
      axis: { stroke: '#E0ECF4' },
      tickLabels: { fill: '#E0ECF4', fontSize: 10, fontFamily: "'Fira Code', monospace", angle: -45, textAnchor: 'end' },
      grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
    }
  };

  const workoutDependentAxisProps = {
    style: {
      axis: { stroke: '#E0ECF4' },
      tickLabels: { fill: '#E0ECF4', fontSize: 10, fontFamily: "'Fira Code', monospace" },
      grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
    }
  };

  const workoutBarStyleProps = {
    style: { data: { fill: chartColors.primary, opacity: 0.8 } }
  };

  const workoutLineStyleProps = {
    style: { data: { stroke: chartColors.secondary, strokeWidth: 3 } }
  };

  const legendStyleProps = {
    style: { labels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Sora', sans-serif" } }
  };

  const bodyPolarAxisProps = {
    style: {
      axis: { stroke: 'rgba(255,255,255,0.1)' },
      tickLabels: { fill: '#e2e8f0', fontSize: 11, fontFamily: "'Fira Code', monospace", padding: 15 },
      grid: { stroke: 'rgba(255,255,255,0.1)' },
    }
  };

  const bodyDependentAxisProps = {
    style: {
      axis: { stroke: 'none' },
      tickLabels: { fill: 'none' },
      grid: { stroke: 'rgba(255,255,255,0.1)' },
    }
  };

  const bodyCurrentAreaStyleProps = {
    style: { data: { fill: `${chartColors.primary}40`, stroke: chartColors.primary, strokeWidth: 2 } }
  };

  const bodyTargetAreaStyleProps = {
    style: { data: { fill: 'transparent', stroke: chartColors.success, strokeWidth: 2, strokeDasharray: '5,5' } }
  };

  // Render metric card
  const renderMetricCard = (metric: AnalyticsMetric) => (
    <MetricCard key={metric.id}>
      <CardHeader>
        <CardTitle>{metric.title}</CardTitle>
        <RoundButton><MoreVertical size={18} /></RoundButton>
      </CardHeader>

      <ValueRow>
        <BigValue>{metric.value}</BigValue>
        <UnitText>{metric.unit}</UnitText>
      </ValueRow>

      <TrendIndicator $trend={metric.changeType === 'increase' ? 'up' : metric.changeType === 'decrease' ? 'down' : 'neutral'}>
        {metric.changeType === 'increase' ? <TrendingUp size={16} /> :
         metric.changeType === 'decrease' ? <TrendingDown size={16} /> : <Minus size={16} />}
        {Math.abs(metric.change)}% vs last period
      </TrendIndicator>

      {metric.target && (
        <TargetRow>
          <TargetLabels>
            <CaptionText>Target Progress</CaptionText>
            <CaptionText>{metric.value}/{metric.target}</CaptionText>
          </TargetLabels>
          <ProgressBarTrack>
            <ProgressBarFill
              $percent={(metric.value / metric.target) * 100}
              $color={getStatusColor(metric.status)}
            />
          </ProgressBarTrack>
        </TargetRow>
      )}

      <SparklineWrap>
        <VictoryChart
          height={60}
          padding={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <VictoryAxis {...hiddenAxisProps} />
          <VictoryAxis dependentAxis {...hiddenAxisProps} />
          <VictoryLine
            data={metric.trend.slice(-7)}
            x="period"
            y="value"
            interpolation="monotoneX"
            animate={{ duration: 800, easing: 'cubicInOut' }}
            {...sparklineStyleProps}
          />
        </VictoryChart>
      </SparklineWrap>
    </MetricCard>
  );

  // Workout analysis chart data (memoized to avoid re-generating on each render)
  const workoutAnalysisData = React.useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    month: `Month ${i + 1}`,
    workouts: Math.floor(Math.random() * 30) + 10,
    duration: Math.floor(Math.random() * 60) + 30,
    intensity: Math.floor(Math.random() * 40) + 60
  })), []);

  // Render workout analysis chart
  const renderWorkoutAnalysisChart = () => (
    <GlassCard>
      <SpacedCardTitle>Workout Analysis</SpacedCardTitle>
      <ChartContainer>
        <VictoryChart
          height={400}
          padding={{ top: 40, bottom: 50, left: 50, right: 50 }}
          domainPadding={{ x: 20 }}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }: { datum: WorkoutAnalysisDatum }) => `${datum.month}\nWorkouts: ${datum.workouts}\nIntensity: ${datum.intensity}`}
              labelComponent={
                <VictoryTooltip
                  {...workoutTooltipProps}
                />
              }
            />
          }
        >
          <VictoryAxis
            {...workoutAxisProps}
          />
          <VictoryAxis
            dependentAxis
            {...workoutDependentAxisProps}
          />
          <VictoryBar
            data={workoutAnalysisData}
            x="month"
            y="workouts"
            animate={{ duration: 800, easing: 'cubicInOut' }}
            {...workoutBarStyleProps}
          />
          <VictoryLine
            data={workoutAnalysisData}
            x="month"
            y="intensity"
            interpolation="monotoneX"
            animate={{ duration: 800, easing: 'cubicInOut' }}
            {...workoutLineStyleProps}
          />
          <VictoryLegend
            x={60}
            y={5}
            orientation="horizontal"
            {...legendStyleProps}
            data={[
              { name: 'Workouts', symbol: { fill: chartColors.primary } },
              { name: 'Intensity', symbol: { fill: chartColors.secondary, type: 'minus' } },
            ]}
          />
        </VictoryChart>
      </ChartContainer>
    </GlassCard>
  );

  // Body composition radar data
  const bodyCompositionData = React.useMemo(() => [
    { metric: 'Muscle Mass', current: 85, target: 90 },
    { metric: 'Body Fat %', current: 88, target: 92 },
    { metric: 'Hydration', current: 92, target: 95 },
    { metric: 'Bone Density', current: 78, target: 85 },
    { metric: 'Metabolic Rate', current: 89, target: 95 },
    { metric: 'Recovery', current: 83, target: 90 },
  ], []);

  // Render body composition radar chart
  const renderBodyCompositionChart = () => (
    <GlassCard>
      <SpacedCardTitle>Body Composition Analysis</SpacedCardTitle>
      <ChartContainer>
        <VictoryChart
          polar
          height={400}
          domain={{ y: [0, 100] }}
        >
          <VictoryPolarAxis
            tickValues={bodyCompositionData.map((_, i) => i)}
            tickFormat={bodyCompositionData.map(d => d.metric)}
            {...bodyPolarAxisProps}
          />
          <VictoryPolarAxis
            dependentAxis
            {...bodyDependentAxisProps}
          />
          <VictoryArea
            data={bodyCompositionData.map((d, i) => ({ x: i, y: d.current }))}
            animate={{ duration: 800, easing: 'cubicInOut' }}
            {...bodyCurrentAreaStyleProps}
          />
          <VictoryArea
            data={bodyCompositionData.map((d, i) => ({ x: i, y: d.target }))}
            {...bodyTargetAreaStyleProps}
          />
          <VictoryLegend
            x={120}
            y={10}
            orientation="horizontal"
            {...legendStyleProps}
            data={[
              { name: 'Current', symbol: { fill: chartColors.primary } },
              { name: 'Target', symbol: { fill: chartColors.success } },
            ]}
          />
        </VictoryChart>
      </ChartContainer>
    </GlassCard>
  );

  // Render AI insights panel
  const renderAIInsights = () => (
    <GlassCard>
      <CardTitleRow>
        <CardTitleWithIcon><Brain size={20} /> Swan Coach Insights</CardTitleWithIcon>
        <OutlineButton><RefreshCw size={16} /> Refresh</OutlineButton>
      </CardTitleRow>

      <InsightsStack>
        {insights.map((insight, index) => (
          <InsightCard key={index}>
            <InsightRow>
              <IconBox $bg={
                insight.type === 'achievement' ? 'rgba(76,175,80,0.2)' :
                insight.type === 'recommendation' ? 'rgba(33,150,243,0.2)' :
                'rgba(255,152,0,0.2)'
              }>
                {insight.type === 'achievement' ? <CheckCircle2 size={20} color="#4caf50" /> :
                 insight.type === 'recommendation' ? <Lightbulb size={20} color="#2196f3" /> :
                 <AlertTriangle size={20} color="#ff9800" />}
              </IconBox>
              <InsightBody>
                <InsightTitle>{insight.title}</InsightTitle>
                <InsightDesc>{insight.description}</InsightDesc>
                <InsightFooter>
                  <ChipTag>{insight.confidence}% confidence</ChipTag>
                  <CaptionText>{insight.timestamp}</CaptionText>
                </InsightFooter>
              </InsightBody>
              {insight.actionable && (
                <ActionOutlineButton>Take Action</ActionOutlineButton>
              )}
            </InsightRow>
          </InsightCard>
        ))}
      </InsightsStack>
    </GlassCard>
  );

  // Render predictions panel
  const renderPredictions = () => (
    <GlassCard>
      <SpacedCardTitleWithIcon><Sparkles size={20} /> Predictive Analytics</SpacedCardTitleWithIcon>

      <PredictionsGrid>
        {predictions.map((prediction, index) => {
          const color =
            prediction.type === 'retention' ? chartColors.success :
            prediction.type === 'progress' ? chartColors.primary :
            prediction.type === 'churn' ? chartColors.error :
            chartColors.warning;

          return (
            <PredictionCard key={index} $borderColor={color}>
              <PredictionTitle>{prediction.type} Prediction</PredictionTitle>
              <PredictionPeriod>{prediction.period}</PredictionPeriod>

              <CircularWrap>
                <CircularProgressWidget value={prediction.probability} size={100} color={color} />
                <CircularOverlay>
                  <CircularValue $color={color}>{prediction.probability}%</CircularValue>
                  <CaptionText>confidence: {prediction.confidence}%</CaptionText>
                </CircularOverlay>
              </CircularWrap>

              <CaptionText>Key factors:</CaptionText>
              <FactorsWrap>
                {prediction.factors.map((factor, idx) => (
                  <FactorChip key={idx} $color={color}>{factor}</FactorChip>
                ))}
              </FactorsWrap>
            </PredictionCard>
          );
        })}
      </PredictionsGrid>
    </GlassCard>
  );

  return (
    <PageWrapper>
      {/* Analytics Header */}
      <SectionHeader>
        <Title>Advanced Analytics Dashboard</Title>
        <Subtitle>Swan Coach insights and comprehensive performance analytics</Subtitle>
      </SectionHeader>

      {/* Demo data notice */}
      <PreviewNotice>
        Preview Mode — Charts display sample data. Real analytics will populate as client sessions are logged.
      </PreviewNotice>

      {/* Control Panel */}
      <ControlPanel>
        <NativeSelect defaultValue={timePeriod}>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="1y">Last Year</option>
        </NativeSelect>

        <ButtonGroup>
          <ViewButton $active={viewMode === 'overview'} onClick={() => setViewMode('overview')}>Overview</ViewButton>
          <ViewButton $active={viewMode === 'detailed'} onClick={() => setViewMode('detailed')}>Detailed</ViewButton>
          <ViewButton $active={viewMode === 'comparison'} onClick={() => setViewMode('comparison')}>Compare</ViewButton>
        </ButtonGroup>

        <ActionRow>
          <OutlineButton><Filter size={16} /> Filters</OutlineButton>
          <OutlineButton><Download size={16} /> Export</OutlineButton>
          <OutlineButton><Share2 size={16} /> Share</OutlineButton>
        </ActionRow>
      </ControlPanel>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <>
          <MetricsGrid>
            {mockMetrics.map(renderMetricCard)}
          </MetricsGrid>
          <ChartsGrid>
            {renderWorkoutAnalysisChart()}
            {renderBodyCompositionChart()}
          </ChartsGrid>
        </>
      )}

      {/* Detailed Mode */}
      {viewMode === 'detailed' && (
        <DetailedGrid>
          {renderAIInsights()}
          {renderPredictions()}
        </DetailedGrid>
      )}

      {/* Comparison Mode */}
      {viewMode === 'comparison' && (
        <ComparisonWrap>
          <ComparisonTitle>Comparison Mode</ComparisonTitle>
          <Subtitle>Compare client performance against cohorts and benchmarks</Subtitle>
          {/* TODO: Implement comparison charts */}
        </ComparisonWrap>
      )}
    </PageWrapper>
  );
};

export default ClientAnalyticsPanel;
