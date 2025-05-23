/**
 * Client Analytics Panel Component
 * 7-Star AAA Personal Training & Social Media App
 * 
 * Advanced analytics dashboard with real-time insights, AI predictions,
 * and comprehensive performance metrics for client management
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Avatar,
  Chip,
  Paper,
  Divider,
  Slider,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  ButtonGroup,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Analytics,
  Insights,
  Speed,
  Psychology,
  LocalFireDepartment,
  FitnessCenter,
  MonitorWeight,
  Timer,
  Calendar,
  BarChart,
  ShowChart,
  PieChart,
  AutoGraph,
  Settings,
  Refresh,
  Download,
  Share,
  FilterList,
  ZoomIn,
  ZoomOut,
  Fullscreen,
  Warning,
  CheckCircle,
  RadioButtonUnchecked
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
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

// Styled components
const MetricCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.05))',
  backdropFilter: 'blur(20px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0, 255, 255, 0.1)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
  },
}));

const TrendIndicator = styled(Box)<{ trend: 'up' | 'down' | 'neutral' }>(({ theme, trend }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  color: 
    trend === 'up' ? '#4caf50' :
    trend === 'down' ? '#f44336' :
    '#999',
  fontSize: '0.875rem',
  fontWeight: 600,
}));

const AnalyticsButton = styled(Button)(({ theme, variant: buttonVariant }) => ({
  textTransform: 'none',
  borderRadius: 8,
  fontWeight: 600,
  ...(buttonVariant === 'contained' && {
    background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
    color: '#0a0a1a',
    '&:hover': {
      background: 'linear-gradient(135deg, #00e6ff, #00b3ff)',
    },
  }),
  ...(buttonVariant === 'outlined' && {
    borderColor: 'rgba(0, 255, 255, 0.5)',
    color: '#00ffff',
    '&:hover': {
      borderColor: '#00ffff',
      backgroundColor: 'rgba(0, 255, 255, 0.1)',
    },
  }),
}));

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

  // Render metric card
  const renderMetricCard = (metric: AnalyticsMetric) => (
    <MetricCard key={metric.id}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            {metric.title}
          </Typography>
          <IconButton size="small">
            <MoreVert sx={{ color: '#666' }} />
          </IconButton>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
          <Typography variant="h3" sx={{ color: '#e0e0e0', fontWeight: 700 }}>
            {metric.value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {metric.unit}
          </Typography>
        </Box>

        <TrendIndicator trend={metric.changeType === 'increase' ? 'up' : metric.changeType === 'decrease' ? 'down' : 'neutral'}>
          {metric.changeType === 'increase' ? <TrendingUp /> : 
           metric.changeType === 'decrease' ? <TrendingDown /> : <TrendingFlat />}
          {Math.abs(metric.change)}% vs last period
        </TrendIndicator>

        {metric.target && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">Target Progress</Typography>
              <Typography variant="caption" color="text.secondary">
                {metric.value}/{metric.target}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(metric.value / metric.target) * 100}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: metric.status === 'excellent' ? chartColors.success :
                          metric.status === 'good' ? chartColors.primary :
                          metric.status === 'warning' ? chartColors.warning :
                          chartColors.error,
                  borderRadius: 4
                }
              }}
            />
          </Box>
        )}

        <Box sx={{ mt: 2, height: 60 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metric.trend.slice(-7)}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={chartColors.primary} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </MetricCard>
  );

  // Render workout analysis chart
  const renderWorkoutAnalysisChart = () => (
    <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#00ffff', mb: 3 }}>
          Workout Analysis
        </Typography>
        <Box sx={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={Array.from({ length: 12 }, (_, i) => ({
              month: `Month ${i + 1}`,
              workouts: Math.floor(Math.random() * 30) + 10,
              duration: Math.floor(Math.random() * 60) + 30,
              intensity: Math.floor(Math.random() * 40) + 60
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="month" stroke="#999" />
              <YAxis yAxisId="left" stroke="#999" />
              <YAxis yAxisId="right" orientation="right" stroke="#999" />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: '#252742', 
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  borderRadius: 8
                }} 
              />
              <Legend />
              <Bar yAxisId="left" dataKey="workouts" fill={chartColors.primary} />
              <Line yAxisId="right" type="monotone" dataKey="intensity" stroke={chartColors.secondary} strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );

  // Render body composition radar chart
  const renderBodyCompositionChart = () => (
    <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#00ffff', mb: 3 }}>
          Body Composition Analysis
        </Typography>
        <Box sx={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={[
              { metric: 'Muscle Mass', current: 85, target: 90, fullMark: 100 },
              { metric: 'Body Fat %', current: 88, target: 92, fullMark: 100 },
              { metric: 'Hydration', current: 92, target: 95, fullMark: 100 },
              { metric: 'Bone Density', current: 78, target: 85, fullMark: 100 },
              { metric: 'Metabolic Rate', current: 89, target: 95, fullMark: 100 },
              { metric: 'Recovery', current: 83, target: 90, fullMark: 100 }
            ]}>
              <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#e0e0e0', fontSize: 12 }} />
              <PolarRadiusAxis stroke="rgba(255, 255, 255, 0.2)" tick={false} />
              <Radar 
                name="Current" 
                dataKey="current" 
                stroke={chartColors.primary} 
                fill={`${chartColors.primary}40`}
                strokeWidth={2}
              />
              <Radar 
                name="Target" 
                dataKey="target" 
                stroke={chartColors.success} 
                strokeDasharray="5 5"
                strokeWidth={2}
                fill="transparent"
              />
            </RadarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );

  // Render AI insights panel
  const renderAIInsights = () => (
    <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology />
            AI-Powered Insights
          </Typography>
          <AnalyticsButton variant="outlined" size="small" startIcon={<Refresh />}>
            Refresh
          </AnalyticsButton>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {insights.map((insight, index) => (
            <Paper
              key={index}
              sx={{
                p: 2,
                bgcolor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ 
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 
                    insight.type === 'achievement' ? 'rgba(76, 175, 80, 0.2)' :
                    insight.type === 'recommendation' ? 'rgba(33, 150, 243, 0.2)' :
                    'rgba(255, 152, 0, 0.2)'
                }}>
                  {insight.type === 'achievement' ? <CheckCircle sx={{ color: '#4caf50' }} /> :
                   insight.type === 'recommendation' ? <Insights sx={{ color: '#2196f3' }} /> :
                   <Warning sx={{ color: '#ff9800' }} />}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {insight.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
                    {insight.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                    <Chip 
                      label={`${insight.confidence}% confidence`}
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(0, 255, 255, 0.2)',
                        color: '#00ffff',
                        fontSize: '0.75rem'
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {insight.timestamp}
                    </Typography>
                  </Box>
                </Box>
                {insight.actionable && (
                  <AnalyticsButton variant="outlined" size="small">
                    Take Action
                  </AnalyticsButton>
                )}
              </Box>
            </Paper>
          ))}
        </Box>
      </CardContent>
    </Card>
  );

  // Render predictions panel
  const renderPredictions = () => (
    <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#00ffff', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoGraph />
          Predictive Analytics
        </Typography>

        <Grid container spacing={2}>
          {predictions.map((prediction, index) => {
            const color = 
              prediction.type === 'retention' ? chartColors.success :
              prediction.type === 'progress' ? chartColors.primary :
              prediction.type === 'churn' ? chartColors.error :
              chartColors.warning;

            return (
              <Grid item xs={12} md={6} key={index}>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${color}40`,
                    borderRadius: 2
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                    {prediction.type} Prediction
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {prediction.period}
                  </Typography>
                  
                  <Box sx={{ my: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                      <CircularProgress
                        variant="determinate"
                        value={prediction.probability}
                        size={100}
                        thickness={4}
                        sx={{
                          color: color,
                          '& .MuiCircularProgress-circle': {
                            strokeLinecap: 'round',
                          },
                        }}
                      />
                      <Box
                        sx={{
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
                        <Typography variant="h4" fontWeight={700} sx={{ color: color }}>
                          {prediction.probability}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          confidence: {prediction.confidence}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Key factors:
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {prediction.factors.map((factor, idx) => (
                      <Chip 
                        key={idx}
                        label={factor}
                        size="small"
                        sx={{ 
                          mr: 0.5,
                          mb: 0.5,
                          bgcolor: `${color}20`,
                          color: color,
                          fontSize: '0.7rem'
                        }}
                      />
                    ))}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Analytics Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#00ffff', mb: 1, fontWeight: 700 }}>
          Advanced Analytics Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          AI-powered insights and comprehensive performance analytics
        </Typography>
      </Box>

      {/* Control Panel */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#1d1f2b', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#a0a0a0' }}>Time Period</InputLabel>
              <Select
                value={timePeriod}
                label="Time Period"
                sx={{ color: '#e0e0e0' }}
              >
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 90 Days</MenuItem>
                <MenuItem value="1y">Last Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <ButtonGroup variant="outlined" size="small">
              <AnalyticsButton 
                variant={viewMode === 'overview' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('overview')}
              >
                Overview
              </AnalyticsButton>
              <AnalyticsButton 
                variant={viewMode === 'detailed' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('detailed')}
              >
                Detailed
              </AnalyticsButton>
              <AnalyticsButton 
                variant={viewMode === 'comparison' ? 'contained' : 'outlined'}
                onClick={() => setViewMode('comparison')}
              >
                Compare
              </AnalyticsButton>
            </ButtonGroup>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <AnalyticsButton variant="outlined" startIcon={<FilterList />}>
                Filters
              </AnalyticsButton>
              <AnalyticsButton variant="outlined" startIcon={<Download />}>
                Export
              </AnalyticsButton>
              <AnalyticsButton variant="outlined" startIcon={<Share />}>
                Share
              </AnalyticsButton>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <>
          {/* Key Metrics Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {mockMetrics.map(renderMetricCard)}
          </Grid>

          {/* Charts Section */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              {renderWorkoutAnalysisChart()}
            </Grid>
            <Grid item xs={12} md={4}>
              {renderBodyCompositionChart()}
            </Grid>
          </Grid>
        </>
      )}

      {/* Detailed Mode */}
      {viewMode === 'detailed' && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            {renderAIInsights()}
          </Grid>
          <Grid item xs={12} lg={4}>
            {renderPredictions()}
          </Grid>
        </Grid>
      )}

      {/* Comparison Mode */}
      {viewMode === 'comparison' && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="#00ffff" gutterBottom>
            Comparison Mode
          </Typography>
          <Typography color="text.secondary">
            Compare client performance against cohorts and benchmarks
          </Typography>
          {/* TODO: Implement comparison charts */}
        </Box>
      )}
    </Box>
  );
};

export default ClientAnalyticsPanel;