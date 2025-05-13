/**
 * AI/ML Monitoring Dashboard Component
 * Comprehensive monitoring of AI models, performance metrics, and intelligent insights
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  StepContent
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
  Star
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
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  Treemap,
  ResponsiveContainer as RespContainer
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
    status === 'active' ? '#4caf50' :
    status === 'training' ? '#2196f3' :
    status === 'error' ? '#f44336' :
    status === 'maintenance' ? '#ff9800' : '#757575',
  boxShadow: `0 0 8px ${
    status === 'active' ? '#4caf50' :
    status === 'training' ? '#2196f3' :
    status === 'error' ? '#f44336' :
    status === 'maintenance' ? '#ff9800' : '#757575'
  }`,
  animation: status === 'active' ? 'pulse 2s infinite' : 'none',
  '@keyframes pulse': {
    '0%': {
      boxShadow: `0 0 0 0 ${status === 'active' ? 'rgba(76, 175, 80, 0.7)' : 'rgba(33, 150, 243, 0.7)'}`,
    },
    '70%': {
      boxShadow: `0 0 0 10px rgba(${status === 'active' ? '76, 175, 80' : '33, 150, 243'}, 0)`,
    },
    '100%': {
      boxShadow: `0 0 0 0 rgba(${status === 'active' ? '76, 175, 80' : '33, 150, 243'}, 0)`,
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
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [isRealTime, setIsRealTime] = useState(true);
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [expandedModels, setExpandedModels] = useState<string[]>([]);

  // Mock data - In production, this would come from API/Redux
  const aiModels: AIModel[] = useMemo(() => [
    {
      id: 'yolo-form-analysis',
      name: 'YOLO Form Analysis Model',
      type: 'computer_vision',
      status: 'active',
      version: '2.1.0',
      lastUpdated: '2024-12-08T10:30:00Z',
      accuracy: 94.7,
      latency: 67,
      throughput: 245,
      errorRate: 0.8,
      memoryUsage: 78.5,
      cpuUsage: 45.2,
      requests: 15672,
      successfulPredictions: 14847,
      confidence: {
        average: 91.8,
        distribution: [
          { range: '90-100%', count: 12456 },
          { range: '80-90%', count: 2345 },
          { range: '70-80%', count: 567 },
          { range: '<70%', count: 234 }
        ]
      },
      performanceHistory: [
        { timestamp: '2024-12-01', accuracy: 93.2, latency: 72, throughput: 234 },
        { timestamp: '2024-12-02', accuracy: 93.8, latency: 70, throughput: 238 },
        { timestamp: '2024-12-03', accuracy: 94.1, latency: 68, throughput: 242 },
        { timestamp: '2024-12-04', accuracy: 94.3, latency: 67, throughput: 245 },
        { timestamp: '2024-12-05', accuracy: 94.7, latency: 67, throughput: 245 }
      ],
      features: ['Exercise Form Detection', 'Joint Position Analysis', 'Movement Quality Scoring'],
      trainingMetrics: {
        epochs: 150,
        learningRate: 0.001,
        batchSize: 32,
        validationAccuracy: 94.7,
        trainingLoss: 0.123,
        validationLoss: 0.145
      }
    },
    {
      id: 'workout-recommendation',
      name: 'Workout Recommendation Engine',
      type: 'recommendation',
      status: 'active',
      version: '3.0.1',
      lastUpdated: '2024-12-07T14:15:00Z',
      accuracy: 87.3,
      latency: 23,
      throughput: 892,
      errorRate: 1.2,
      memoryUsage: 45.8,
      cpuUsage: 32.7,
      requests: 34567,
      successfulPredictions: 33123,
      confidence: {
        average: 85.6,
        distribution: [
          { range: '90-100%', count: 15678 },
          { range: '80-90%', count: 12345 },
          { range: '70-80%', count: 3456 },
          { range: '<70%', count: 1088 }
        ]
      },
      performanceHistory: [
        { timestamp: '2024-12-01', accuracy: 86.8, latency: 25, throughput: 876 },
        { timestamp: '2024-12-02', accuracy: 87.0, latency: 24, throughput: 883 },
        { timestamp: '2024-12-03', accuracy: 87.1, latency: 23, throughput: 888 },
        { timestamp: '2024-12-04', accuracy: 87.2, latency: 23, throughput: 890 },
        { timestamp: '2024-12-05', accuracy: 87.3, latency: 23, throughput: 892 }
      ],
      features: ['Personalized Recommendations', 'Adaptive Difficulty', 'Progress-Based Suggestions'],
      trainingMetrics: {
        epochs: 100,
        learningRate: 0.0001,
        batchSize: 64,
        validationAccuracy: 87.3,
        trainingLoss: 0.234,
        validationLoss: 0.278
      }
    },
    {
      id: 'nutrition-analysis',
      name: 'Nutrition Analysis Model',
      type: 'computer_vision',
      status: 'training',
      version: '1.5.0',
      lastUpdated: '2024-12-09T16:45:00Z',
      accuracy: 89.2,
      latency: 156,
      throughput: 123,
      errorRate: 2.1,
      memoryUsage: 92.3,
      cpuUsage: 85.6,
      requests: 8934,
      successfulPredictions: 8745,
      confidence: {
        average: 87.4,
        distribution: [
          { range: '90-100%', count: 6789 },
          { range: '80-90%', count: 1456 },
          { range: '70-80%', count: 567 },
          { range: '<70%', count: 122 }
        ]
      },
      performanceHistory: [
        { timestamp: '2024-12-01', accuracy: 88.5, latency: 165, throughput: 115 },
        { timestamp: '2024-12-02', accuracy: 88.8, latency: 162, throughput: 118 },
        { timestamp: '2024-12-03', accuracy: 89.0, latency: 159, throughput: 120 },
        { timestamp: '2024-12-04', accuracy: 89.1, latency: 157, throughput: 122 },
        { timestamp: '2024-12-05', accuracy: 89.2, latency: 156, throughput: 123 }
      ],
      features: ['Food Recognition', 'Nutritional Value Estimation', 'Macro Breakdown'],
      trainingMetrics: {
        epochs: 80,
        learningRate: 0.0005,
        batchSize: 16,
        validationAccuracy: 89.2,
        trainingLoss: 0.345,
        validationLoss: 0.398
      }
    },
    {
      id: 'sentiment-analysis',
      name: 'User Sentiment Analysis',
      type: 'nlp',
      status: 'active',
      version: '2.3.0',
      lastUpdated: '2024-12-06T11:20:00Z',
      accuracy: 92.8,
      latency: 34,
      throughput: 567,
      errorRate: 0.5,
      memoryUsage: 34.7,
      cpuUsage: 28.9,
      requests: 23456,
      successfulPredictions: 23339,
      confidence: {
        average: 90.5,
        distribution: [
          { range: '90-100%', count: 18456 },
          { range: '80-90%', count: 3456 },
          { range: '70-80%', count: 1234 },
          { range: '<70%', count: 310 }
        ]
      },
      performanceHistory: [
        { timestamp: '2024-12-01', accuracy: 92.1, latency: 36, throughput: 545 },
        { timestamp: '2024-12-02', accuracy: 92.3, latency: 35, throughput: 552 },
        { timestamp: '2024-12-03', accuracy: 92.5, latency: 35, throughput: 558 },
        { timestamp: '2024-12-04', accuracy: 92.7, latency: 34, throughput: 563 },
        { timestamp: '2024-12-05', accuracy: 92.8, latency: 34, throughput: 567 }
      ],
      features: ['Feedback Analysis', 'Support Ticket Classification', 'User Mood Detection'],
      trainingMetrics: {
        epochs: 120,
        learningRate: 0.0001,
        batchSize: 32,
        validationAccuracy: 92.8,
        trainingLoss: 0.156,
        validationLoss: 0.189
      }
    },
    {
      id: 'anomaly-detection',
      name: 'Anomaly Detection Engine',
      type: 'prediction',
      status: 'error',
      version: '1.2.0',
      lastUpdated: '2024-12-09T09:10:00Z',
      accuracy: 76.3,
      latency: 245,
      throughput: 45,
      errorRate: 12.5,
      memoryUsage: 95.2,
      cpuUsage: 78.4,
      requests: 2345,
      successfulPredictions: 2052,
      confidence: {
        average: 72.1,
        distribution: [
          { range: '90-100%', count: 456 },
          { range: '80-90%', count: 789 },
          { range: '70-80%', count: 567 },
          { range: '<70%', count: 533 }
        ]
      },
      performanceHistory: [
        { timestamp: '2024-12-01', accuracy: 82.1, latency: 189, throughput: 67 },
        { timestamp: '2024-12-02', accuracy: 79.5, latency: 212, throughput: 58 },
        { timestamp: '2024-12-03', accuracy: 77.8, latency: 223, throughput: 52 },
        { timestamp: '2024-12-04', accuracy: 76.9, latency: 234, throughput: 48 },
        { timestamp: '2024-12-05', accuracy: 76.3, latency: 245, throughput: 45 }
      ],
      features: ['Unusual Pattern Detection', 'Fraud Prevention', 'Performance Anomalies'],
      trainingMetrics: {
        epochs: 60,
        learningRate: 0.001,
        batchSize: 64,
        validationAccuracy: 76.3,
        trainingLoss: 0.567,
        validationLoss: 0.623
      }
    }
  ], []);

  const aiInsights: AIInsight[] = useMemo(() => [
    {
      id: '1',
      type: 'alert',
      title: 'Anomaly Detection Model Performance Drop',
      description: 'Accuracy has dropped from 82% to 76% over the past 5 days. Error rate increased to 12.5%.',
      impact: 'high',
      confidence: 95.2,
      timestamp: '2024-12-10T08:30:00Z',
      relatedModel: 'anomaly-detection',
      actionable: true,
      suggestedActions: [
        'Retrain model with recent data',
        'Check for data drift in input features',
        'Review model architecture for potential improvements'
      ]
    },
    {
      id: '2',
      type: 'recommendation',
      title: 'Form Analysis Model Optimization',
      description: 'YOLO model can be optimized by 15% latency reduction using quantization techniques.',
      impact: 'medium',
      confidence: 87.6,
      timestamp: '2024-12-10T07:15:00Z',
      relatedModel: 'yolo-form-analysis',
      actionable: true,
      suggestedActions: [
        'Apply INT8 quantization to reduce model size',
        'Implement batch processing for multiple requests',
        'Consider pruning less important weights'
      ]
    },
    {
      id: '3',
      type: 'optimization',
      title: 'Recommendation Engine Hyperparameter Tuning',
      description: 'Learning rate adjustment could improve CTR by up to 3.5% based on A/B test results.',
      impact: 'medium',
      confidence: 82.3,
      timestamp: '2024-12-10T06:45:00Z',
      relatedModel: 'workout-recommendation',
      actionable: true,
      suggestedActions: [
        'Increase learning rate to 0.00015',
        'Adjust regularization parameters',
        'Implement adaptive learning rate scheduling'
      ]
    },
    {
      id: '4',
      type: 'anomaly',
      title: 'Unusual Spike in Nutrition Model Requests',
      description: 'Nutrition analysis model receiving 300% more requests than usual. Possible bot activity.',
      impact: 'low',
      confidence: 74.8,
      timestamp: '2024-12-10T05:20:00Z',
      relatedModel: 'nutrition-analysis',
      actionable: true,
      suggestedActions: [
        'Implement rate limiting',
        'Add bot detection mechanisms',
        'Monitor request patterns for further analysis'
      ]
    }
  ], []);

  const modelUsageMetrics: ModelUsageMetric[] = useMemo(() => [
    {
      modelId: 'yolo-form-analysis',
      feature: 'Exercise Form Checking',
      usageCount: 15672,
      successRate: 94.7,
      averageConfidence: 91.8,
      userSatisfaction: 4.6,
      businessImpact: 8.9
    },
    {
      modelId: 'workout-recommendation',
      feature: 'Personalized Workouts',
      usageCount: 34567,
      successRate: 87.3,
      averageConfidence: 85.6,
      userSatisfaction: 4.4,
      businessImpact: 9.2
    },
    {
      modelId: 'nutrition-analysis',
      feature: 'Food Recognition',
      usageCount: 8934,
      successRate: 89.2,
      averageConfidence: 87.4,
      userSatisfaction: 4.2,
      businessImpact: 7.8
    },
    {
      modelId: 'sentiment-analysis',
      feature: 'Feedback Analysis',
      usageCount: 23456,
      successRate: 92.8,
      averageConfidence: 90.5,
      userSatisfaction: 4.1,
      businessImpact: 6.5
    }
  ], []);

  const performanceData: AIPerformanceMetric[] = useMemo(() => [
    {
      date: '2024-12-01',
      formAnalysisAccuracy: 93.2,
      formAnalysisLatency: 72,
      recommendationCTR: 23.4,
      workoutGenerationSuccess: 89.5,
      nutritionAnalysisAccuracy: 88.5,
      sentimentAnalysisAccuracy: 92.1,
      anomalyDetectionPrecision: 82.1,
      totalInferences: 67890,
      costPerInference: 0.0045
    },
    {
      date: '2024-12-02',
      formAnalysisAccuracy: 93.8,
      formAnalysisLatency: 70,
      recommendationCTR: 23.8,
      workoutGenerationSuccess: 90.1,
      nutritionAnalysisAccuracy: 88.8,
      sentimentAnalysisAccuracy: 92.3,
      anomalyDetectionPrecision: 79.5,
      totalInferences: 69234,
      costPerInference: 0.0047
    },
    {
      date: '2024-12-03',
      formAnalysisAccuracy: 94.1,
      formAnalysisLatency: 68,
      recommendationCTR: 24.1,
      workoutGenerationSuccess: 90.4,
      nutritionAnalysisAccuracy: 89.0,
      sentimentAnalysisAccuracy: 92.5,
      anomalyDetectionPrecision: 77.8,
      totalInferences: 70567,
      costPerInference: 0.0048
    },
    {
      date: '2024-12-04',
      formAnalysisAccuracy: 94.3,
      formAnalysisLatency: 67,
      recommendationCTR: 24.3,
      workoutGenerationSuccess: 90.7,
      nutritionAnalysisAccuracy: 89.1,
      sentimentAnalysisAccuracy: 92.7,
      anomalyDetectionPrecision: 76.9,
      totalInferences: 71890,
      costPerInference: 0.0049
    },
    {
      date: '2024-12-05',
      formAnalysisAccuracy: 94.7,
      formAnalysisLatency: 67,
      recommendationCTR: 24.6,
      workoutGenerationSuccess: 91.2,
      nutritionAnalysisAccuracy: 89.2,
      sentimentAnalysisAccuracy: 92.8,
      anomalyDetectionPrecision: 76.3,
      totalInferences: 73456,
      costPerInference: 0.0051
    }
  ], []);

  const getModelTypeIcon = (type: string) => {
    switch (type) {
      case 'computer_vision': return <CameraAlt />;
      case 'nlp': return <Psychology />;
      case 'recommendation': return <RecommendRounded />;
      case 'prediction': return <Analytics />;
      case 'analysis': return <Assessment />;
      default: return <SmartToy />;
    }
  };

  const getModelTypeColor = (type: string) => {
    switch (type) {
      case 'computer_vision': return '#4caf50';
      case 'nlp': return '#2196f3';
      case 'recommendation': return '#ff9800';
      case 'prediction': return '#9c27b0';
      case 'analysis': return '#00bcd4';
      default: return '#757575';
    }
  };

  const toggleModelExpansion = useCallback((modelId: string) => {
    setExpandedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  }, []);

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <MetricCard accentColor="#4caf50">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h3" sx={{ color: '#4caf50', fontWeight: 700 }}>
                      {aiModels.filter(m => m.status === 'active').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Models
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <CheckCircle sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#4caf50">
                        {((aiModels.filter(m => m.status === 'active').length / aiModels.length) * 100).toFixed(0)}% uptime
                      </Typography>
                    </Box>
                  </Box>
                  <Psychology sx={{ fontSize: 40, color: 'rgba(76, 175, 80, 0.3)' }} />
                </Box>
              </CardContent>
            </MetricCard>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <MetricCard accentColor="#2196f3">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h3" sx={{ color: '#2196f3', fontWeight: 700 }}>
                      93.2%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average Accuracy
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#4caf50">
                        +2.1% this week
                      </Typography>
                    </Box>
                  </Box>
                  <Assessment sx={{ fontSize: 40, color: 'rgba(33, 150, 243, 0.3)' }} />
                </Box>
              </CardContent>
            </MetricCard>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <MetricCard accentColor="#ff9800">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h3" sx={{ color: '#ff9800', fontWeight: 700 }}>
                      67ms
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average Latency
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingDown sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#4caf50">
                        -5.2% vs target
                      </Typography>
                    </Box>
                  </Box>
                  <Speed sx={{ fontSize: 40, color: 'rgba(255, 152, 0, 0.3)' }} />
                </Box>
              </CardContent>
            </MetricCard>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <MetricCard accentColor="#f44336">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h3" sx={{ color: '#f44336', fontWeight: 700 }}>
                      3
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Critical Alerts
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <Warning sx={{ color: '#ff9800', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#ff9800">
                        Requires attention
                      </Typography>
                    </Box>
                  </Box>
                  <Error sx={{ fontSize: 40, color: 'rgba(244, 67, 54, 0.3)' }} />
                </Box>
              </CardContent>
            </MetricCard>
          </Grid>
        </Grid>
      </Grid>
      
      {/* Model Status Grid */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', mb: 3 }}>
          AI Models Status
        </Typography>
        <Grid container spacing={2}>
          {aiModels.map((model) => (
            <Grid item xs={12} md={6} lg={4} key={model.id}>
              <ModelCard status={model.status}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: `${getModelTypeColor(model.type)}20`, color: getModelTypeColor(model.type) }}>
                        {getModelTypeIcon(model.type)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {model.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          v{model.version}
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
                          model.status === 'training' ? 'info' :
                          model.status === 'error' ? 'error' : 'warning'
                        }
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Accuracy</Typography>
                      <Typography variant="h6" color={
                        model.accuracy > 90 ? '#4caf50' : 
                        model.accuracy > 80 ? '#ff9800' : '#f44336'
                      }>
                        {model.accuracy}%
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Latency</Typography>
                      <Typography variant="h6" color={
                        model.latency < 50 ? '#4caf50' : 
                        model.latency < 100 ? '#ff9800' : '#f44336'
                      }>
                        {model.latency}ms
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="caption" color="text.secondary">Requests/h</Typography>
                      <Typography variant="h6" color="#2196f3">
                        {model.requests}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption">CPU Usage</Typography>
                      <Typography variant="caption">{model.cpuUsage}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={model.cpuUsage}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: model.cpuUsage > 80 ? '#f44336' : model.cpuUsage > 60 ? '#ff9800' : '#4caf50',
                          borderRadius: 3
                        }
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption">Memory Usage</Typography>
                      <Typography variant="caption">{model.memoryUsage}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={model.memoryUsage}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: model.memoryUsage > 90 ? '#f44336' : model.memoryUsage > 70 ? '#ff9800' : '#4caf50',
                          borderRadius: 3
                        }
                      }}
                    />
                  </Box>
                  
                  <Button
                    fullWidth
                    size="small"
                    onClick={() => toggleModelExpansion(model.id)}
                    endIcon={expandedModels.includes(model.id) ? <ExpandMore sx={{ transform: 'rotate(180deg)' }} /> : <ExpandMore />}
                  >
                    {expandedModels.includes(model.id) ? 'Hide Details' : 'Show Details'}
                  </Button>
                  
                  {expandedModels.includes(model.id) && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Features:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                        {model.features.map((feature, idx) => (
                          <Chip key={idx} label={feature} size="small" variant="outlined" />
                        ))}
                      </Box>
                      
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Performance Trend:
                      </Typography>
                      <Box sx={{ height: 150, mt: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={model.performanceHistory}>
                            <Line 
                              type="monotone" 
                              dataKey="accuracy" 
                              stroke="#4caf50" 
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="latency" 
                              stroke="#ff9800" 
                              strokeWidth={2}
                              dot={false}
                            />
                            <XAxis dataKey="timestamp" hide />
                            <YAxis hide />
                            <ReTooltip 
                              contentStyle={{ 
                                backgroundColor: '#1d1f2b', 
                                border: '1px solid rgba(0, 255, 255, 0.3)',
                                borderRadius: 8
                              }} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </ModelCard>
            </Grid>
          ))}
        </Grid>
      </Grid>
      
      {/* Performance Analytics */}
      <Grid item xs={12} lg={8}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Analytics />
              AI Performance Analytics
            </Typography>
            
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="date" stroke="#e0e0e0" />
                  <YAxis yAxisId="left" stroke="#e0e0e0" />
                  <YAxis yAxisId="right" orientation="right" stroke="#e0e0e0" />
                  <ReTooltip 
                    contentStyle={{ 
                      backgroundColor: '#1d1f2b', 
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: 8
                    }} 
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="formAnalysisAccuracy" 
                    stroke="#4caf50" 
                    strokeWidth={3}
                    name="Form Analysis Accuracy (%)"
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="recommendationCTR" 
                    stroke="#2196f3" 
                    strokeWidth={3}
                    name="Recommendation CTR (%)"
                  />
                  <Line 
                    yAxisid="right"
                    type="monotone" 
                    dataKey="formAnalysisLatency" 
                    stroke="#ff9800" 
                    strokeWidth={3}
                    name="Form Analysis Latency (ms)"
                  />
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
              <IconButton onClick={() => setAlertDialogOpen(true)}>
                <Warning sx={{ color: '#ff9800' }} />
              </IconButton>
            </Box>
            
            <List>
              {aiInsights.slice(0, 4).map((insight) => (
                <ListItem key={insight.id} sx={{ px: 0 }}>
                  <Paper sx={{ 
                    width: '100%',
                    p: 2, 
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${
                      insight.type === 'alert' ? 'rgba(244, 67, 54, 0.3)' :
                      insight.type === 'recommendation' ? 'rgba(33, 150, 243, 0.3)' :
                      insight.type === 'optimization' ? 'rgba(76, 175, 80, 0.3)' :
                      'rgba(255, 152, 0, 0.3)'
                    }`
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip 
                        label={insight.type}
                        size="small"
                        color={
                          insight.type === 'alert' ? 'error' :
                          insight.type === 'recommendation' ? 'info' :
                          insight.type === 'optimization' ? 'success' : 'warning'
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(insight.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                    
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      {insight.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {insight.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Confidence:
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                          {insight.confidence}%
                        </Typography>
                      </Box>
                      <Chip 
                        label={insight.impact}
                        size="small"
                        color={
                          insight.impact === 'high' ? 'error' :
                          insight.impact === 'medium' ? 'warning' : 'success'
                        }
                        variant="outlined"
                      />
                    </Box>
                  </Paper>
                </ListItem>
              ))}
            </List>
            
            <Button 
              fullWidth 
              variant="outlined" 
              sx={{ mt: 2 }}
              onClick={() => setAlertDialogOpen(true)}
            >
              View All Insights
            </Button>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  const renderModelDetailsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
          Detailed Model Analysis
        </Typography>
      </Grid>
      
      {/* Model Usage Metrics */}
      <Grid item xs={12}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Model Usage Metrics
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Model</TableCell>
                    <TableCell>Feature</TableCell>
                    <TableCell>Usage Count</TableCell>
                    <TableCell>Success Rate</TableCell>
                    <TableCell>Avg Confidence</TableCell>
                    <TableCell>User Satisfaction</TableCell>
                    <TableCell>Business Impact</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modelUsageMetrics.map((metric, index) => {
                    const model = aiModels.find(m => m.id === metric.modelId);
                    return (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ 
                              bgcolor: `${getModelTypeColor(model?.type || '')}20`, 
                              color: getModelTypeColor(model?.type || ''),
                              width: 32,
                              height: 32
                            }}>
                              {getModelTypeIcon(model?.type || '')}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {model?.name || metric.modelId}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {metric.feature}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {metric.usageCount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {metric.successRate}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={metric.successRate}
                              sx={{
                                width: 60,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: metric.successRate > 90 ? '#4caf50' : metric.successRate > 80 ? '#ff9800' : '#f44336',
                                  borderRadius: 3
                                }
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {metric.averageConfidence}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {metric.userSatisfaction}/5
                            </Typography>
                            <Star sx={{ color: '#ffd700', fontSize: 16 }} />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color={
                            metric.businessImpact > 8 ? '#4caf50' : 
                            metric.businessImpact > 6 ? '#ff9800' : '#f44336'
                          }>
                            {metric.businessImpact}/10
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </GlassCard>
      </Grid>
      
      {/* Confidence Distribution */}
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Confidence Distribution
            </Typography>
            
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={aiModels[0].confidence.distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="range" stroke="#e0e0e0" />
                  <YAxis stroke="#e0e0e0" />
                  <ReTooltip 
                    contentStyle={{ 
                      backgroundColor: '#1d1f2b', 
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: 8
                    }} 
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {aiModels[0].confidence.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${120 - index * 30}, 70%, 60%)`} />
                    ))}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
      
      {/* Training Metrics */}
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Training Metrics Comparison
            </Typography>
            
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={[
                  { metric: 'Accuracy', formAnalysis: 94.7, recommendation: 87.3, nutrition: 89.2, sentiment: 92.8 },
                  { metric: 'Speed', formAnalysis: 85, recommendation: 95, nutrition: 60, sentiment: 90 },
                  { metric: 'Efficiency', formAnalysis: 78, recommendation: 88, nutrition: 65, sentiment: 85 },
                  { metric: 'Stability', formAnalysis: 92, recommendation: 89, nutrition: 70, sentiment: 95 },
                  { metric: 'Scalability', formAnalysis: 80, recommendation: 92, nutrition: 75, sentiment: 88 }
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Form Analysis" dataKey="formAnalysis" stroke="#4caf50" fill="#4caf50" fillOpacity={0.1} />
                  <Radar name="Recommendation" dataKey="recommendation" stroke="#2196f3" fill="#2196f3" fillOpacity={0.1} />
                  <Radar name="Nutrition" dataKey="nutrition" stroke="#ff9800" fill="#ff9800" fillOpacity={0.1} />
                  <Radar name="Sentiment" dataKey="sentiment" stroke="#9c27b0" fill="#9c27b0" fillOpacity={0.1} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  const renderOptimizationTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
          AI Optimization & Recommendations
        </Typography>
      </Grid>
      
      {/* Optimization Opportunities */}
      <Grid item xs={12} lg={8}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Optimization Opportunities
            </Typography>
            
            {aiInsights.filter(insight => insight.actionable).map((insight) => (
              <Accordion key={insight.id} sx={{ mb: 2, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {insight.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip 
                          label={insight.type}
                          size="small"
                          color={
                            insight.type === 'alert' ? 'error' :
                            insight.type === 'recommendation' ? 'info' :
                            insight.type === 'optimization' ? 'success' : 'warning'
                          }
                        />
                        <Chip 
                          label={`${insight.impact} impact`}
                          size="small"
                          color={
                            insight.impact === 'high' ? 'error' :
                            insight.impact === 'medium' ? 'warning' : 'success'
                          }
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {insight.description}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="subtitle2" gutterBottom>
                    Suggested Actions:
                  </Typography>
                  <List dense>
                    {insight.suggestedActions.map((action, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon>
                          <CheckCircle sx={{ color: '#4caf50', fontSize: 16 }} />
                        </ListItemIcon>
                        <ListItemText primary={action} />
                      </ListItem>
                    ))}
                  </List>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button variant="contained" size="small">
                      Implement
                    </Button>
                    <Button variant="outlined" size="small">
                      Schedule
                    </Button>
                    <Button variant="text" size="small">
                      Learn More
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </GlassCard>
      </Grid>
      
      {/* Cost Optimization */}
      <Grid item xs={12} lg={4}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Cost Optimization
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" color="#4caf50" fontWeight={700}>
                $0.0048
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cost per Inference
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp sx={{ color: '#f44336', fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption" color="#f44336">
                  +8.9% this month
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom>
              Cost Breakdown
            </Typography>
            
            <List dense>
              <ListItem sx={{ px: 0 }}>
                <ListItemText 
                  primary="Compute Costs"
                  secondary="$1,234/month"
                />
                <Typography variant="body2" color="#ff9800">
                  68%
                </Typography>
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemText 
                  primary="Storage Costs"
                  secondary="$456/month"
                />
                <Typography variant="body2" color="#2196f3">
                  25%
                </Typography>
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemText 
                  primary="Network Costs"
                  secondary="$128/month"
                />
                <Typography variant="body2" color="#4caf50">
                  7%
                </Typography>
              </ListItem>
            </List>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Optimization Suggestions
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Batch processing could reduce costs by 25%
              </Typography>
            </Alert>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Model quantization could save 15% on compute
              </Typography>
            </Alert>
            
            <Alert severity="success">
              <Typography variant="body2">
                Auto-scaling is optimized for current usage
              </Typography>
            </Alert>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  const tabPanels = [
    renderOverviewTab(),
    renderModelDetailsTab(),
    renderOptimizationTab()
  ];

  return (
    <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#00ffff', fontWeight: 700, mb: 1 }}>
          AI/ML Monitoring Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Comprehensive monitoring and optimization of AI models and machine learning systems
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
            icon={<Assessment />} 
            iconPosition="start" 
            label="Model Details" 
          />
          <Tab 
            icon={<Tune />} 
            iconPosition="start" 
            label="Optimization" 
          />
        </Tabs>
      </Box>

      <Box>
        {tabPanels[activeTab]}
      </Box>

      {/* Insights Dialog */}
      <Dialog open={alertDialogOpen} onClose={() => setAlertDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#00ffff' }}>
          AI Insights & Alerts
        </DialogTitle>
        <DialogContent>
          <List>
            {aiInsights.map((insight) => (
              <Paper key={insight.id} sx={{ mb: 2, p: 2, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {insight.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={insight.type}
                      size="small"
                      color={
                        insight.type === 'alert' ? 'error' :
                        insight.type === 'recommendation' ? 'info' :
                        insight.type === 'optimization' ? 'success' : 'warning'
                      }
                    />
                    <Chip 
                      label={`${insight.impact} impact`}
                      size="small"
                      color={
                        insight.impact === 'high' ? 'error' :
                        insight.impact === 'medium' ? 'warning' : 'success'
                      }
                      variant="outlined"
                    />
                  </Box>
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {insight.description}
                </Typography>
                
                <Typography variant="caption" color="text.secondary">
                  Related Model: {insight.relatedModel} | Confidence: {insight.confidence}%
                </Typography>
                
                {insight.actionable && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      Suggested Actions:
                    </Typography>
                    <List dense>
                      {insight.suggestedActions.map((action, idx) => (
                        <ListItem key={idx} sx={{ py: 0 }}>
                          <ListItemIcon sx={{ minWidth: 20 }}>
                            <CheckCircle sx={{ color: '#4caf50', fontSize: 14 }} />
                          </ListItemIcon>
                          <ListItemText primary={<Typography variant="caption">{action}</Typography>} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Paper>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIMonitoringPanel;