/**
 * AI/ML Monitoring Dashboard Component
 * Comprehensive monitoring of AI models, performance metrics, and intelligent insights
 * PHASE 2B: Converted from mock data to real API integration
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Tabs,
  Tab,
  Button,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Divider,
  Switch,
  FormControlLabel,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Step,
  Stepper,
  StepLabel,
  StepContent,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';

import {
  Psychology,
  SmartToy,
  ModelTraining,
  Computer,
  Speed,
  Analytics,
  Assessment,
  Warning,
  Error,
  CheckCircle,
  AutoGraph,
  Insights,
  TrendingUp,
  TrendingDown,
  Timeline,
  PieChart,
  BarChart,
  DataUsage,
  Memory,
  Storage,
  NetworkWifi,
  Bolt,
  FlashOn,
  CloudComputing,
  Engineering,
  BugReport,
  Science,
  Visibility,
  VisibilityOff,
  Refresh,
  Download,
  Share,
  Settings,
  Info,
  ExpandMore,
  Launch,
  Code,
  CameraAlt,
  SportsKabaddi,
  Restaurant,
  FitnessCenter,
  RecommendRounded,
  TouchApp,
  GraphicEq,
  Tune,
  MonitorHeart,
  Psychology as BrainIcon,
  Transform,
  Star,
  NotificationsActive,
  CloudDone,
  CloudOff,
  Radar,
  DeviceHub,
  Api
} from '@mui/icons-material';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  RadarChart,
  Radar as RadarComponent,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  Treemap
} from 'recharts';

import { styled } from '@mui/material/styles';

// Types
interface AIModel {
  id: string;
  name: string;
  type: 'computer_vision' | 'nlp' | 'recommendation' | 'prediction' | 'analysis';
  status: 'active' | 'training' | 'idle' | 'error' | 'maintenance';
  version: string;
  lastUpdated: string;
  accuracy: number;
  latency: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  requests: number;
  successfulPredictions: number;
  confidence: {
    average: number;
    distribution: { range: string; count: number }[];
  };
  performanceHistory: {
    timestamp: string;
    accuracy: number;
    latency: number;
    throughput: number;
  }[];
  features: string[];
  trainingMetrics: {
    epochs: number;
    learningRate: number;
    batchSize: number;
    validationAccuracy: number;
    trainingLoss: number;
    validationLoss: number;
  };
}

interface AIInsight {
  id: string;
  type: 'recommendation' | 'anomaly' | 'optimization' | 'alert';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  timestamp: string;
  relatedModel: string;
  actionable: boolean;
  suggestedActions: string[];
  data?: any;
}

interface ModelUsageMetric {
  modelId: string;
  feature: string;
  usageCount: number;
  successRate: number;
  averageConfidence: number;
  userSatisfaction: number;
  businessImpact: number;
}

interface AIPerformanceMetric {
  date: string;
  formAnalysisAccuracy: number;
  formAnalysisLatency: number;
  recommendationCTR: number;
  workoutGenerationSuccess: number;
  nutritionAnalysisAccuracy: number;
  sentimentAnalysisAccuracy: number;
  anomalyDetectionPrecision: number;
  totalInferences: number;
  costPerInference: number;
}

interface MCPAgent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  type: string;
  version: string;
  lastSeen: string;
  activeConnections: number;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  capabilities: string[];
  health: {
    score: number;
    issues: string[];
  };
}

// Styled components
const GlassCard = styled(Card)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  backdropFilter: 'blur(20px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0, 255, 255, 0.15)',
  },
}));

const ModelCard = styled(GlassCard)<{ status: string }>(({ status }) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${
      status === 'active' ? '#4caf50' :
      status === 'training' ? '#2196f3' :
      status === 'error' ? '#f44336' :
      status === 'maintenance' ? '#ff9800' : '#757575'
    }, transparent)`,
  },
}));

const StatusIndicator = styled(Box)<{ status: string }>(({ status }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: 
    status === 'active' || status === 'online' ? '#4caf50' :
    status === 'training' ? '#2196f3' :
    status === 'error' || status === 'offline' ? '#f44336' :
    status === 'maintenance' ? '#ff9800' : '#757575',
  boxShadow: `0 0 8px ${
    status === 'active' || status === 'online' ? '#4caf50' :
    status === 'training' ? '#2196f3' :
    status === 'error' || status === 'offline' ? '#f44336' :
    status === 'maintenance' ? '#ff9800' : '#757575'
  }`,
  animation: (status === 'active' || status === 'online') ? 'pulse 2s infinite' : 'none',
  '@keyframes pulse': {
    '0%': {
      boxShadow: `0 0 0 0 ${(status === 'active' || status === 'online') ? 'rgba(76, 175, 80, 0.7)' : 'rgba(33, 150, 243, 0.7)'}`,
    },
    '70%': {
      boxShadow: `0 0 0 10px rgba(${(status === 'active' || status === 'online') ? '76, 175, 80' : '33, 150, 243'}, 0)`,
    },
    '100%': {
      boxShadow: `0 0 0 0 rgba(${(status === 'active' || status === 'online') ? '76, 175, 80' : '33, 150, 243'}, 0)`,
    },
  },
}));

const MetricCard = styled(GlassCard)<{ accentColor?: string }>(({ accentColor = '#00ffff' }) => ({
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${accentColor}, transparent)`,
  },
}));

const AIMonitoringPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isRealTime, setIsRealTime] = useState(true);
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [expandedModels, setExpandedModels] = useState<string[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);

  // Real API state management (following UserAnalyticsPanel pattern)
  const [mcpHealthData, setMcpHealthData] = useState<any>(null);
  const [loading, setLoading] = useState({
    overview: false,
    models: false,
    insights: false,
    performance: false
  });
  const [errors, setErrors] = useState({
    overview: null as string | null,
    models: null as string | null,
    insights: null as string | null,
    performance: null as string | null
  });

  // API call functions
  const fetchMCPHealthData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, overview: true }));
      setErrors(prev => ({ ...prev, overview: null }));
      
      const response = await authAxios.get('/api/admin/mcp/health');
      
      if (response.data.success) {
        setMcpHealthData(response.data.data);
        console.log('✅ Real MCP health data loaded successfully');
      } else {
        throw new Error(response.data.message || 'Failed to load MCP health data');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load MCP health data';
      setErrors(prev => ({ ...prev, overview: errorMessage }));
      console.error('❌ Failed to load real MCP health data:', errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
    }
  }, [authAxios]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    console.log('🔄 Refreshing all AI monitoring data...');
    await fetchMCPHealthData();
    console.log('✅ All AI monitoring data refreshed');
  }, [fetchMCPHealthData]);

  // Initial data load
  useEffect(() => {
    fetchMCPHealthData();
  }, [fetchMCPHealthData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!isRealTime) return;

    const interval = setInterval(() => {
      refreshAllData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isRealTime, refreshAllData]);

  // Helper function to check if data is loading
  const isLoadingData = (dataType: keyof typeof loading) => loading[dataType];
  const hasError = (dataType: keyof typeof errors) => !!errors[dataType];

  // Helper component for loading states
  const LoadingSpinner = ({ message = 'Loading data...' }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 4 }}>
      <CircularProgress sx={{ color: '#00ffff' }} />
      <Typography variant="body2" color="text.secondary">{message}</Typography>
    </Box>
  );

  // Helper component for error states
  const ErrorMessage = ({ error, onRetry, dataType }: { error: string; onRetry: () => void; dataType: string }) => (
    <Alert 
      severity="error" 
      action={
        <Button color="inherit" size="small" onClick={onRetry} startIcon={<Refresh />}>
          Retry
        </Button>
      }
      sx={{ mb: 2, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
    >
      Failed to load {dataType}: {error}
    </Alert>
  );

  // Transform real API data to component format
  const mcpAgents: MCPAgent[] = useMemo(() => {
    if (!mcpHealthData?.agents) {
      return [];
    }

    return mcpHealthData.agents.map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      type: agent.type || 'Unknown',
      version: agent.version || '1.0.0',
      lastSeen: agent.lastSeen || new Date().toISOString(),
      activeConnections: agent.metrics?.activeConnections || 0,
      totalRequests: agent.metrics?.totalRequests || 0,
      successRate: agent.metrics?.successRate || 0,
      averageResponseTime: agent.metrics?.averageResponseTime || 0,
      capabilities: agent.capabilities || [],
      health: {
        score: agent.health?.score || 0,
        issues: agent.health?.issues || []
      }
    }));
  }, [mcpHealthData]);

  const aiModels: AIModel[] = useMemo(() => {
    if (!mcpHealthData?.models) {
      return [];
    }

    return mcpHealthData.models.map((model: any) => ({
      id: model.id,
      name: model.name,
      type: model.type,
      status: model.status,
      version: model.version || '1.0.0',
      lastUpdated: model.lastUpdated || new Date().toISOString(),
      accuracy: model.metrics?.accuracy || 0,
      latency: model.metrics?.latency || 0,
      throughput: model.metrics?.throughput || 0,
      errorRate: model.metrics?.errorRate || 0,
      memoryUsage: model.metrics?.memoryUsage || 0,
      cpuUsage: model.metrics?.cpuUsage || 0,
      requests: model.metrics?.requests || 0,
      successfulPredictions: model.metrics?.successfulPredictions || 0,
      confidence: {
        average: model.confidence?.average || 0,
        distribution: model.confidence?.distribution || []
      },
      performanceHistory: model.performanceHistory || [],
      features: model.features || [],
      trainingMetrics: {
        epochs: model.trainingMetrics?.epochs || 0,
        learningRate: model.trainingMetrics?.learningRate || 0,
        batchSize: model.trainingMetrics?.batchSize || 0,
        validationAccuracy: model.trainingMetrics?.validationAccuracy || 0,
        trainingLoss: model.trainingMetrics?.trainingLoss || 0,
        validationLoss: model.trainingMetrics?.validationLoss || 0
      }
    }));
  }, [mcpHealthData]);

  const aiInsights: AIInsight[] = useMemo(() => {
    if (!mcpHealthData?.insights) {
      return [];
    }

    return mcpHealthData.insights.map((insight: any) => ({
      id: insight.id,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      impact: insight.impact,
      confidence: insight.confidence || 0,
      timestamp: insight.timestamp,
      relatedModel: insight.relatedModel || 'Unknown',
      actionable: insight.actionable || false,
      suggestedActions: insight.suggestedActions || [],
      data: insight.data
    }));
  }, [mcpHealthData]);

  const performanceMetrics: AIPerformanceMetric[] = useMemo(() => {
    if (!mcpHealthData?.performanceHistory) {
      return [];
    }

    return mcpHealthData.performanceHistory.map((metric: any) => ({
      date: metric.date,
      formAnalysisAccuracy: metric.formAnalysisAccuracy || 0,
      formAnalysisLatency: metric.formAnalysisLatency || 0,
      recommendationCTR: metric.recommendationCTR || 0,
      workoutGenerationSuccess: metric.workoutGenerationSuccess || 0,
      nutritionAnalysisAccuracy: metric.nutritionAnalysisAccuracy || 0,
      sentimentAnalysisAccuracy: metric.sentimentAnalysisAccuracy || 0,
      anomalyDetectionPrecision: metric.anomalyDetectionPrecision || 0,
      totalInferences: metric.totalInferences || 0,
      costPerInference: metric.costPerInference || 0
    }));
  }, [mcpHealthData]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'online': return '#4caf50';
      case 'training': return '#2196f3';
      case 'error': case 'offline': return '#f44336';
      case 'maintenance': case 'idle': return '#ff9800';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': case 'online': return <CheckCircle />;
      case 'training': return <ModelTraining />;
      case 'error': case 'offline': return <Error />;
      case 'maintenance': case 'idle': return <Engineering />;
      default: return <Info />;
    }
  };

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case 'computer_vision': return <CameraAlt />;
      case 'nlp': return <Psychology />;
      case 'recommendation': return <RecommendRounded />;
      case 'prediction': return <TrendingUp />;
      case 'analysis': return <Analytics />;
      default: return <SmartToy />;
    }
  };

  const toggleModelExpansion = useCallback((modelId: string) => {
    setExpandedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  }, []);

  const handleInsightClick = (insight: AIInsight) => {
    setSelectedInsight(insight);
    setAlertDialogOpen(true);
  };

  const renderOverviewTab = () => {
    // Show loading state if overview data is loading
    if (isLoadingData('overview')) {
      return <LoadingSpinner message="Loading AI monitoring overview..." />;
    }

    return (
    <Grid container spacing={3}>
      {/* Error State */}
      {hasError('overview') && (
        <Grid item xs={12}>
          <ErrorMessage 
            error={errors.overview!} 
            onRetry={fetchMCPHealthData} 
            dataType="AI monitoring data" 
          />
        </Grid>
      )}
      
      {/* MCP Agents Overview */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', mb: 3 }}>
          MCP Agents Status
        </Typography>
        <Grid container spacing={2}>
          {mcpAgents.map((agent) => (
            <Grid item xs={12} sm={6} md={4} key={agent.id}>
              <ModelCard status={agent.status}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ 
                        bgcolor: `${getStatusColor(agent.status)}20`,
                        color: getStatusColor(agent.status)
                      }}>
                        <SmartToy />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {agent.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {agent.type} • v{agent.version}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StatusIndicator status={agent.status} />
                      <Chip 
                        label={agent.status}
                        size="small"
                        color={
                          agent.status === 'online' ? 'success' :
                          agent.status === 'offline' ? 'error' : 'warning'
                        }
                      />
                    </Box>
                  </Box>
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Connections</Typography>
                      <Typography variant="h6" color="#4caf50">{agent.activeConnections}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Success Rate</Typography>
                      <Typography variant="h6" color="#2196f3">{agent.successRate}%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Requests</Typography>
                      <Typography variant="h6" color="#ff9800">{agent.totalRequests}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Response Time</Typography>
                      <Typography variant="h6" color="#9c27b0">{agent.averageResponseTime}ms</Typography>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Health Score
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={agent.health.score}
                        sx={{
                          flexGrow: 1,
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: agent.health.score > 95 ? '#4caf50' : agent.health.score > 80 ? '#ff9800' : '#f44336',
                            borderRadius: 4
                          }
                        }}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {agent.health.score}%
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary">
                    Last seen: {new Date(agent.lastSeen).toLocaleString()}
                  </Typography>
                </CardContent>
              </ModelCard>
            </Grid>
          ))}
        </Grid>
      </Grid>
      
      {/* AI Models Performance */}
      <Grid item xs={12} lg={8}>
        <GlassCard>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Analytics />
                AI Models Performance
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small">
                  <Select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    sx={{ color: '#e0e0e0', minWidth: 100 }}
                  >
                    <MenuItem value="1h">Last Hour</MenuItem>
                    <MenuItem value="24h">Last 24 Hours</MenuItem>
                    <MenuItem value="7d">Last 7 Days</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isRealTime}
                      onChange={(e) => setIsRealTime(e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="caption">Real-time</Typography>}
                />
              </Box>
            </Box>
            
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="date" stroke="#e0e0e0" />
                  <YAxis yAxisId="left" stroke="#e0e0e0" />
                  <YAxis yAxisid="right" orientation="right" stroke="#e0e0e0" />
                  <ReTooltip 
                    contentStyle={{ 
                      backgroundColor: '#1d1f2b', 
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: 8
                    }} 
                  />
                  <Legend />
                  <Area
                    yAxisid="left"
                    type="monotone"
                    dataKey="formAnalysisAccuracy"
                    fill="url(#accuracyGradient)"
                    stroke="#4caf50"
                    strokeWidth={2}
                    name="Form Analysis Accuracy (%)"
                  />
                  <Line
                    yAxisid="right"
                    type="monotone"
                    dataKey="formAnalysisLatency"
                    stroke="#ff9800"
                    strokeWidth={3}
                    name="Latency (ms)"
                  />
                  <Line
                    yAxisid="left"
                    type="monotone"
                    dataKey="recommendationCTR"
                    stroke="#2196f3"
                    strokeWidth={2}
                    name="Recommendation CTR (%)"
                  />
                  <defs>
                    <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4caf50" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
      
      {/* AI Insights */}
      <Grid item xs={12} lg={4}>
        <GlassCard>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Insights />
                AI Insights
              </Typography>
              <IconButton>
                <Download />
              </IconButton>
            </Box>
            
            <List>
              {aiInsights.slice(0, 5).map((insight) => (
                <ListItem 
                  key={insight.id} 
                  sx={{ px: 0, py: 1, cursor: 'pointer' }}
                  onClick={() => handleInsightClick(insight)}
                >
                  <Paper sx={{ 
                    width: '100%',
                    p: 2, 
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${
                      insight.impact === 'high' ? '#f44336' :
                      insight.impact === 'medium' ? '#ff9800' : '#4caf50'
                    }`
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {insight.title}
                      </Typography>
                      <Chip 
                        label={insight.impact}
                        size="small"
                        color={
                          insight.impact === 'high' ? 'error' :
                          insight.impact === 'medium' ? 'warning' : 'success'
                        }
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {insight.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {insight.relatedModel}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {insight.confidence}% confidence
                      </Typography>
                    </Box>
                  </Paper>
                </ListItem>
              ))}
            </List>
            
            {aiInsights.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <BrainIcon sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
                <Typography variant="h6" color="#4caf50" gutterBottom>
                  All AI Systems Optimal
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No insights or recommendations at this time
                </Typography>
              </Box>
            )}
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
    );
  };

  const renderModelsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            AI Models Status
          </Typography>
          <Button variant="outlined" startIcon={<Refresh />} onClick={refreshAllData}>
            Refresh Models
          </Button>
        </Box>
      </Grid>
      
      {aiModels.map((model) => (
        <Grid item xs={12} lg={6} key={model.id}>
          <ModelCard status={model.status}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ 
                    bgcolor: `${getStatusColor(model.status)}20`,
                    color: getStatusColor(model.status)
                  }}>
                    {getModelTypeIcon(model.type)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {model.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {model.type} • v{model.version}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StatusIndicator status={model.status} />
                  <Chip 
                    label={model.status}
                    size="small"
                    color={
                      model.status === 'active' ? 'success' :
                      model.status === 'error' ? 'error' : 'warning'
                    }
                  />
                </Box>
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Accuracy</Typography>
                  <Typography variant="h6" color="#4caf50">{model.accuracy}%</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Latency</Typography>
                  <Typography variant="h6" color="#ff9800">{model.latency}ms</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Requests</Typography>
                  <Typography variant="h6" color="#2196f3">{model.requests}</Typography>
                </Grid>
              </Grid>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Resource Usage
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption">CPU</Typography>
                    <Typography variant="caption">{model.cpuUsage}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={model.cpuUsage}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: model.cpuUsage > 80 ? '#f44336' : model.cpuUsage > 60 ? '#ff9800' : '#4caf50',
                        borderRadius: 2
                      }
                    }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption">Memory</Typography>
                    <Typography variant="caption">{model.memoryUsage}%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={model.memoryUsage}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#2196f3',
                        borderRadius: 2
                      }
                    }}
                  />
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" startIcon={<Visibility />}>
                  Details
                </Button>
                <Button size="small" startIcon={<Tune />}>
                  Configure
                </Button>
                <Button size="small" startIcon={<ModelTraining />}>
                  Retrain
                </Button>
              </Box>
            </CardContent>
          </ModelCard>
        </Grid>
      ))}
    </Grid>
  );

  const renderInsightsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            AI Insights & Recommendations
          </Typography>
          <Button variant="outlined" startIcon={<Download />}>
            Export Insights
          </Button>
        </Box>
      </Grid>
      
      <Grid item xs={12}>
        <GlassCard>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Insight</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Impact</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell>Model</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aiInsights.map((insight) => (
                    <TableRow key={insight.id} hover onClick={() => handleInsightClick(insight)}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {insight.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {insight.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={insight.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={insight.impact}
                          color={
                            insight.impact === 'high' ? 'error' :
                            insight.impact === 'medium' ? 'warning' : 'success'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {insight.confidence}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {insight.relatedModel}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton size="small">
                            <Info />
                          </IconButton>
                          {insight.actionable && (
                            <IconButton size="small">
                              <Launch />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  const renderPerformanceTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" sx={{ color: '#00ffff', mb: 3 }}>
          AI Performance Analytics
        </Typography>
      </Grid>
      
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Model Accuracy Trends
            </Typography>
            
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="date" stroke="#e0e0e0" />
                  <YAxis stroke="#e0e0e0" />
                  <ReTooltip 
                    contentStyle={{ 
                      backgroundColor: '#1d1f2b', 
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: 8
                    }} 
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="formAnalysisAccuracy"
                    stroke="#4caf50"
                    strokeWidth={2}
                    name="Form Analysis"
                  />
                  <Line
                    type="monotone"
                    dataKey="nutritionAnalysisAccuracy"
                    stroke="#2196f3"
                    strokeWidth={2}
                    name="Nutrition Analysis"
                  />
                  <Line
                    type="monotone"
                    dataKey="sentimentAnalysisAccuracy"
                    stroke="#ff9800"
                    strokeWidth={2}
                    name="Sentiment Analysis"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
      
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Inference Volume & Cost
            </Typography>
            
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="date" stroke="#e0e0e0" />
                  <YAxis yAxisid="left" stroke="#e0e0e0" />
                  <YAxis yAxisid="right" orientation="right" stroke="#e0e0e0" />
                  <ReTooltip 
                    contentStyle={{ 
                      backgroundColor: '#1d1f2b', 
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: 8
                    }} 
                  />
                  <Legend />
                  <Bar
                    yAxisid="left"
                    dataKey="totalInferences"
                    fill="#4caf50"
                    name="Total Inferences"
                  />
                  <Line
                    yAxisid="right"
                    type="monotone"
                    dataKey="costPerInference"
                    stroke="#f44336"
                    strokeWidth={3}
                    name="Cost per Inference ($)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  // Loading and error states
  if (isLoadingData('overview') && !mcpHealthData) {
    return (
      <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#00ffff', mb: 2 }} size={60} />
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            Loading AI Monitoring Data...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (hasError('overview') && !mcpHealthData) {
    return (
      <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', p: 3 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 3, backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#f44336', border: '1px solid #f44336' }}
          action={
            <Button color="inherit" size="small" onClick={fetchMCPHealthData} disabled={isLoadingData('overview')}>
              {isLoadingData('overview') ? <CircularProgress size={16} /> : 'Retry'}
            </Button>
          }
        >
          <Typography variant="h6">Failed to Load AI Monitoring Data</Typography>
          <Typography variant="body2">{errors.overview}</Typography>
        </Alert>
      </Box>
    );
  }

  const tabPanels = [
    renderOverviewTab(),
    renderModelsTab(),
    renderInsightsTab(),
    renderPerformanceTab()
  ];

  return (
    <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#00ffff', fontWeight: 700, mb: 1 }}>
          AI Monitoring Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Comprehensive monitoring of AI models, performance metrics, and intelligent insights
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.2)', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': { 
              color: '#a0a0a0',
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              '&.Mui-selected': { color: '#00ffff' }
            },
            '& .MuiTabs-indicator': { 
              backgroundColor: '#00ffff',
              height: 3,
              borderRadius: '3px 3px 0 0'
            }
          }}
        >
          <Tab 
            icon={<Psychology />} 
            iconPosition="start" 
            label="Overview" 
          />
          <Tab 
            icon={<SmartToy />} 
            iconPosition="start" 
            label="AI Models" 
          />
          <Tab 
            icon={<Insights />} 
            iconPosition="start" 
            label="Insights" 
          />
          <Tab 
            icon={<Analytics />} 
            iconPosition="start" 
            label="Performance" 
          />
        </Tabs>
      </Box>

      <Box>
        {tabPanels[activeTab]}
      </Box>

      {/* Insight Details Dialog */}
      <Dialog open={alertDialogOpen} onClose={() => setAlertDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#00ffff' }}>
          AI Insight Details
        </DialogTitle>
        <DialogContent>
          {selectedInsight && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {selectedInsight.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {selectedInsight.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip 
                      label={selectedInsight.type}
                      variant="outlined"
                    />
                    <Chip 
                      label={selectedInsight.impact}
                      color={
                        selectedInsight.impact === 'high' ? 'error' :
                        selectedInsight.impact === 'medium' ? 'warning' : 'success'
                      }
                    />
                  </Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Related Information
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Model: {selectedInsight.relatedModel}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Confidence: {selectedInsight.confidence}%
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Time: {new Date(selectedInsight.timestamp).toLocaleString()}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Suggested Actions
              </Typography>
              <List dense>
                {selectedInsight.suggestedActions.map((action, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle sx={{ color: '#4caf50', fontSize: 16 }} />
                    </ListItemIcon>
                    <ListItemText primary={action} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialogOpen(false)}>Close</Button>
          {selectedInsight?.actionable && (
            <Button variant="contained">Take Action</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <SpeedDial
        ariaLabel="AI Actions"
        sx={{ 
          position: 'fixed', 
          bottom: 24, 
          right: 24,
          '& .MuiFab-primary': {
            background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
            '&:hover': {
              background: 'linear-gradient(135deg, #00e6ff, #00b3ff)',
            },
          }
        }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<Download />}
          tooltipTitle="Export AI Data"
          onClick={() => {
            console.log('📁 Export AI data functionality to be implemented');
          }}
        />
        <SpeedDialAction
          icon={<ModelTraining />}
          tooltipTitle="Retrain Models"
          onClick={() => {
            console.log('🧠 Model retraining functionality to be implemented');
          }}
        />
        <SpeedDialAction
          icon={<Refresh />}
          tooltipTitle="Refresh Data"
          onClick={refreshAllData}
        />
      </SpeedDial>
    </Box>
  );
};

export default AIMonitoringPanel;