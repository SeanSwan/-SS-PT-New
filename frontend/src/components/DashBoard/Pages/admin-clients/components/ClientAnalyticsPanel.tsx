/**
 * Client Analytics Panel Component
 * 7-Star AAA Personal Training & Social Media App
 *
 * Advanced analytics dashboard with real-time insights, AI predictions,
 * and comprehensive performance metrics for client management
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
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
  BarChart3,
  MoreVertical
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ComposedChart,
  ReferenceLine
} from 'recharts';

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

interface ClientSegment {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface PredictionData {
  type: 'retention' | 'progress' | 'churn' | 'revenue';
  probability: number;
  confidence: number;
  period: string;
  factors: string[];
}

/* ────── Styled Components ────── */

const PageWrapper = styled.div`
  padding: 24px;
`;

const SectionHeader = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h2`
  color: #00ffff;
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
    box-shadow: 0 12px 40px rgba(0,255,255,0.1);
    border-color: rgba(0,255,255,0.3);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const CardTitle = styled.h3`
  color: #00ffff;
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
  color: #00ffff;
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
  border: 1px solid rgba(0,255,255,0.5);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  text-transform: none;
  transition: all 0.2s;
  ${p => p.$active ? css`
    background: linear-gradient(135deg, #00ffff, #00c8ff);
    color: #0a0a1a;
    border-color: transparent;
  ` : css`
    background: transparent;
    color: #00ffff;
    &:hover { background: rgba(0,255,255,0.1); border-color: #00ffff; }
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
  border: 1px solid rgba(0,255,255,0.5);
  background: transparent;
  color: #00ffff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  &:hover { border-color: #00ffff; background: rgba(0,255,255,0.1); }
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
  background: rgba(0,255,255,0.2);
  color: #00ffff;
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
  color: #00ffff;
  font-size: 1.25rem;
  margin: 0 0 8px 0;
`;

/* ────── SVG Circular Progress ────── */
const CircularProgressWidget: React.FC<{ value: number; size?: number; color: string }> = ({ value, size = 100, color }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
};

/* ────── Component ────── */

interface ClientAnalyticsPanelProps {
  clientId?: string;
  timePeriod?: '7d' | '30d' | '90d' | '1y';
  onMetricChange?: (metric: string, value: number) => void;
}

const ClientAnalyticsPanel: React.FC<ClientAnalyticsPanelProps> = ({
  clientId,
  timePeriod = '30d',
  onMetricChange
}) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['workouts', 'progress', 'engagement']);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'comparison'>('overview');
  const [insights, setInsights] = useState<any[]>([]);
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

  const mockSegmentData: ClientSegment[] = [
    { label: 'Strength Training', value: 45, percentage: 35.2, color: '#ff6b6b' },
    { label: 'Cardio', value: 38, percentage: 29.7, color: '#4ecdc4' },
    { label: 'Flexibility', value: 25, percentage: 19.5, color: '#45b7d1' },
    { label: 'Recovery', value: 20, percentage: 15.6, color: '#96ceb4' }
  ];

  const mockInsights = [
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
  ];

  const mockPredictions: PredictionData[] = [
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
  ];

  useEffect(() => {
    setInsights(mockInsights);
    setPredictions(mockPredictions);
  }, []);

  // Chart configurations
  const chartColors = {
    primary: '#00ffff',
    secondary: '#7851a9',
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
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={metric.trend.slice(-7)}>
            <Line type="monotone" dataKey="value" stroke={chartColors.primary} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </SparklineWrap>
    </MetricCard>
  );

  // Render workout analysis chart
  const renderWorkoutAnalysisChart = () => (
    <GlassCard>
      <CardTitle style={{ marginBottom: 24 }}>Workout Analysis</CardTitle>
      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={Array.from({ length: 12 }, (_, i) => ({
            month: `Month ${i + 1}`,
            workouts: Math.floor(Math.random() * 30) + 10,
            duration: Math.floor(Math.random() * 60) + 30,
            intensity: Math.floor(Math.random() * 40) + 60
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="#999" />
            <YAxis yAxisId="left" stroke="#999" />
            <YAxis yAxisId="right" orientation="right" stroke="#999" />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: '#252742',
                border: '1px solid rgba(0,255,255,0.3)',
                borderRadius: 8
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="workouts" fill={chartColors.primary} />
            <Line yAxisId="right" type="monotone" dataKey="intensity" stroke={chartColors.secondary} strokeWidth={3} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </GlassCard>
  );

  // Render body composition radar chart
  const renderBodyCompositionChart = () => (
    <GlassCard>
      <CardTitle style={{ marginBottom: 24 }}>Body Composition Analysis</CardTitle>
      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={[
            { metric: 'Muscle Mass', current: 85, target: 90, fullMark: 100 },
            { metric: 'Body Fat %', current: 88, target: 92, fullMark: 100 },
            { metric: 'Hydration', current: 92, target: 95, fullMark: 100 },
            { metric: 'Bone Density', current: 78, target: 85, fullMark: 100 },
            { metric: 'Metabolic Rate', current: 89, target: 95, fullMark: 100 },
            { metric: 'Recovery', current: 83, target: 90, fullMark: 100 }
          ]}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#e2e8f0', fontSize: 12 }} />
            <PolarRadiusAxis stroke="rgba(255,255,255,0.2)" tick={false} />
            <Radar name="Current" dataKey="current" stroke={chartColors.primary}
              fill={`${chartColors.primary}40`} strokeWidth={2} />
            <Radar name="Target" dataKey="target" stroke={chartColors.success}
              strokeDasharray="5 5" strokeWidth={2} fill="transparent" />
          </RadarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </GlassCard>
  );

  // Render AI insights panel
  const renderAIInsights = () => (
    <GlassCard>
      <CardTitleRow>
        <CardTitleWithIcon><Brain size={20} /> AI-Powered Insights</CardTitleWithIcon>
        <OutlineButton><RefreshCw size={16} /> Refresh</OutlineButton>
      </CardTitleRow>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                <OutlineButton style={{ flexShrink: 0 }}>Take Action</OutlineButton>
              )}
            </InsightRow>
          </InsightCard>
        ))}
      </div>
    </GlassCard>
  );

  // Render predictions panel
  const renderPredictions = () => (
    <GlassCard>
      <CardTitleWithIcon style={{ marginBottom: 24 }}><Sparkles size={20} /> Predictive Analytics</CardTitleWithIcon>

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
              <div style={{ marginTop: 8 }}>
                {prediction.factors.map((factor, idx) => (
                  <FactorChip key={idx} $color={color}>{factor}</FactorChip>
                ))}
              </div>
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
        <Subtitle>AI-powered insights and comprehensive performance analytics</Subtitle>
      </SectionHeader>

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
