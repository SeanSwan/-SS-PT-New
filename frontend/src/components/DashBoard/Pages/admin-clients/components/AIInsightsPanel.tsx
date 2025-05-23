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
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  CircularProgress,
  LinearProgress,
  Alert,
  AlertTitle,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Badge,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Psychology,
  AutoGraph,
  TrendingUp,
  TrendingDown,
  Insights,
  SmartToy,
  Computer,
  Analytics,
  Assessment,
  Warning,
  CheckCircle,
  Info,
  Star,
  Lightbulb,
  Timeline,
  Speed,
  LocalFireDepartment,
  FitnessCenter,
  RestaurantMenu,
  Schedule,
  Person,
  Group,
  Target,
  Flag,
  RecommendAlt,
  Science,
  ModelTraining,
  Functions,
  Visibility,
  VisibilityOff,
  ExpandMore,
  Refresh,
  Tune,
  FilterList,
  Download,
  Share,
  Settings,
  PlayArrow,
  Pause,
  Bolt,
  MemoryAlt,
  PrecisionManufacturing,
  Robot,
  BubbleChart,
  Scatter,
  DataUsage
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
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

// Define interfaces
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

// Styled components
const InsightCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.05))',
  backdropFilter: 'blur(20px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(121, 81, 169, 0.15)',
    border: '1px solid rgba(121, 81, 169, 0.3)',
  },
}));

const AIModelCard = styled(Card)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(0, 255, 255, 0.2)',
  borderRadius: 12,
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.4)',
  },
}));

const AIButton = styled(Button)(({ theme, variant: buttonVariant }) => ({
  borderRadius: 8,
  textTransform: 'none',
  fontWeight: 600,
  ...(buttonVariant === 'contained' && {
    background: 'linear-gradient(135deg, #7851a9, #b794f6)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(135deg, #6a4c93, #a78bfa)',
    },
  }),
  ...(buttonVariant === 'outlined' && {
    borderColor: 'rgba(121, 81, 169, 0.5)',
    color: '#b794f6',
    '&:hover': {
      borderColor: '#7851a9',
      backgroundColor: 'rgba(121, 81, 169, 0.1)',
    },
  }),
}));

const ConfidenceIndicator = styled(Box)<{ confidence: number }>(({ theme, confidence }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  padding: '4px 8px',
  borderRadius: 8,
  backgroundColor: 
    confidence >= 90 ? 'rgba(76, 175, 80, 0.2)' :
    confidence >= 70 ? 'rgba(255, 193, 7, 0.2)' :
    'rgba(255, 87, 34, 0.2)',
  color:
    confidence >= 90 ? '#4caf50' :
    confidence >= 70 ? '#ffb300' :
    '#ff5722'
}));

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
        return <RecommendAlt />;
      case 'warning':
        return <Warning />;
      case 'prediction':
        return <TrendingUp />;
      case 'optimization':
        return <Tune />;
      case 'achievement':
        return <CheckCircle />;
      default:
        return <Info />;
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

  // Render insight card
  const renderInsightCard = (insight: AIInsight) => (
    <InsightCard key={insight.id}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: getInsightColor(insight.type),
                width: 48,
                height: 48
              }}
            >
              {getInsightIcon(insight.type, insight.category)}
            </Avatar>
            <Box>
              <Typography variant="h6" gutterBottom>
                {insight.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip 
                  label={insight.type} 
                  size="small" 
                  sx={{ 
                    bgcolor: `${getInsightColor(insight.type)}20`,
                    color: getInsightColor(insight.type),
                    fontSize: '0.75rem'
                  }}
                />
                <Chip 
                  label={insight.category} 
                  size="small" 
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
                <Chip 
                  label={insight.priority} 
                  size="small" 
                  color={
                    insight.priority === 'critical' ? 'error' :
                    insight.priority === 'high' ? 'warning' :
                    insight.priority === 'medium' ? 'info' : 'default'
                  }
                  sx={{ fontSize: '0.75rem' }}
                />
              </Box>
            </Box>
          </Box>
          <ConfidenceIndicator confidence={insight.confidence}>
            <Psychology sx={{ fontSize: 16 }} />
            <Typography variant="caption" fontWeight={600}>
              {insight.confidence}%
            </Typography>
          </ConfidenceIndicator>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {insight.description}
        </Typography>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="caption" color="text.secondary">
              AI Model: {insight.modelUsed}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Evidence Points:
              </Typography>
              <List dense>
                {insight.evidencePoints.map((point, index) => (
                  <ListItem key={index} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={point} 
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {new Date(insight.timestamp).toLocaleString()}
          </Typography>
          {insight.actionable && insight.action && (
            <AIButton 
              variant="contained" 
              size="small"
              onClick={insight.action.callback}
            >
              {insight.action.label}
            </AIButton>
          )}
        </Box>
      </CardContent>
    </InsightCard>
  );

  // Render recommendations section
  const renderRecommendations = () => (
    <Box>
      <Typography variant="h6" sx={{ color: '#7851a9', mb: 2 }}>
        AI Recommendations
      </Typography>
      <Grid container spacing={2}>
        {recommendations.map((rec) => (
          <Grid item xs={12} md={6} key={rec.id}>
            <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {rec.title}
                  </Typography>
                  <Chip 
                    label={rec.type} 
                    size="small"
                    color={
                      rec.type === 'immediate' ? 'error' :
                      rec.type === 'short-term' ? 'warning' : 'info'
                    }
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {rec.description}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip 
                    label={`${rec.impact} impact`} 
                    size="small"
                    color={rec.impact === 'high' ? 'success' : rec.impact === 'medium' ? 'warning' : 'default'}
                  />
                  <Chip 
                    label={`${rec.effort} effort`} 
                    size="small"
                    variant="outlined"
                  />
                  <Chip 
                    label={rec.category} 
                    size="small"
                    variant="outlined"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Estimated Benefit:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ color: '#4caf50' }}>
                    {rec.estimatedBenefit}
                  </Typography>
                </Box>

                <ConfidenceIndicator confidence={rec.confidence}>
                  <Star sx={{ fontSize: 16 }} />
                  <Typography variant="caption" fontWeight={600}>
                    {rec.confidence}% confidence
                  </Typography>
                </ConfidenceIndicator>

                <Box sx={{ mt: 2 }}>
                  <AIButton 
                    variant="outlined" 
                    fullWidth
                    onClick={() => onRecommendationImplement?.(rec.id)}
                  >
                    View Implementation Plan
                  </AIButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render risk assessments
  const renderRiskAssessments = () => (
    <Box>
      <Typography variant="h6" sx={{ color: '#ff9800', mb: 2 }}>
        Risk Assessments
      </Typography>
      <Grid container spacing={2}>
        {riskAssessments.map((risk) => (
          <Grid item xs={12} md={6} key={risk.id}>
            <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                    {risk.riskType.replace('_', ' ')} Risk
                  </Typography>
                  <Chip 
                    label={risk.severity} 
                    size="small"
                    color={
                      risk.severity === 'high' ? 'error' :
                      risk.severity === 'medium' ? 'warning' : 'success'
                    }
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
                    <CircularProgress
                      variant="determinate"
                      value={risk.probability}
                      size={100}
                      thickness={4}
                      sx={{
                        color: 
                          risk.probability > 70 ? '#f44336' :
                          risk.probability > 40 ? '#ff9800' : '#4caf50',
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
                      <Typography variant="h4" fontWeight={700}>
                        {risk.probability}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Risk
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Timeline: {risk.timeline}
                </Typography>

                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="body2">View Details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Risk Factors:
                      </Typography>
                      <List dense>
                        {risk.factors.map((factor, index) => (
                          <ListItem key={index} sx={{ py: 0 }}>
                            <ListItemIcon sx={{ minWidth: 20 }}>
                              <Warning sx={{ fontSize: 14, color: '#ff9800' }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={factor}
                              primaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                    
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Mitigation Strategies:
                      </Typography>
                      <List dense>
                        {risk.mitigation.map((strategy, index) => (
                          <ListItem key={index} sx={{ py: 0 }}>
                            <ListItemIcon sx={{ minWidth: 20 }}>
                              <CheckCircle sx={{ fontSize: 14, color: '#4caf50' }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={strategy}
                              primaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render AI models overview
  const renderModelsOverview = () => (
    <Box>
      <Typography variant="h6" sx={{ color: '#00ffff', mb: 2 }}>
        Active AI Models
      </Typography>
      <Grid container spacing={2}>
        {models.map((model) => (
          <Grid item xs={12} md={4} key={model.id}>
            <AIModelCard>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {model.name}
                  </Typography>
                  <Chip 
                    label={model.status} 
                    size="small"
                    color={
                      model.status === 'active' ? 'success' :
                      model.status === 'training' ? 'warning' : 'default'
                    }
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {model.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Accuracy
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#4caf50' }}>
                      {model.accuracy}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={model.accuracy}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#4caf50',
                        borderRadius: 3
                      }
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Predictions Made
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#00ffff' }}>
                      {model.predictions.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">
                      Last Trained
                    </Typography>
                    <Typography variant="body2">
                      {new Date(model.lastTrained).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </AIModelCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#7851a9', mb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Psychology sx={{ fontSize: 40 }} />
          AI Insights & Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Advanced AI-powered insights, predictions, and personalized recommendations
        </Typography>
      </Box>

      {/* Controls */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ color: '#a0a0a0' }}>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
                sx={{ color: '#e0e0e0' }}
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="workout">Workout</MenuItem>
                <MenuItem value="nutrition">Nutrition</MenuItem>
                <MenuItem value="recovery">Recovery</MenuItem>
                <MenuItem value="performance">Performance</MenuItem>
                <MenuItem value="health">Health</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ px: 2 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Confidence Threshold: {confidenceThreshold}%
              </Typography>
              <Slider
                value={confidenceThreshold}
                onChange={(e, newValue) => setConfidenceThreshold(newValue as number)}
                sx={{ color: '#7851a9' }}
                min={50}
                max={100}
                step={5}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={showOnlyActionable}
                  onChange={(e) => setShowOnlyActionable(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#7851a9',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#7851a9',
                    },
                  }}
                />
              }
              label={<Typography variant="body2">Actionable Only</Typography>}
            />
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <AIButton variant="outlined" size="small" startIcon={<Refresh />}>
                Refresh
              </AIButton>
              <AIButton variant="outlined" size="small" startIcon={<Settings />}>
                Settings
              </AIButton>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Content */}
      <Box>
        <Accordion expanded={expandedAccordion === 'insights'} onChange={() => setExpandedAccordion(expandedAccordion === 'insights' ? false : 'insights')}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ color: '#7851a9' }}>
              AI Insights ({filteredInsights.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              {filteredInsights.map(renderInsightCard)}
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expandedAccordion === 'recommendations'} onChange={() => setExpandedAccordion(expandedAccordion === 'recommendations' ? false : 'recommendations')}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ color: '#7851a9' }}>
              Smart Recommendations
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {renderRecommendations()}
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expandedAccordion === 'risks'} onChange={() => setExpandedAccordion(expandedAccordion === 'risks' ? false : 'risks')}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ color: '#7851a9' }}>
              Risk Assessments
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {renderRiskAssessments()}
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expandedAccordion === 'models'} onChange={() => setExpandedAccordion(expandedAccordion === 'models' ? false : 'models')}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="h6" sx={{ color: '#7851a9' }}>
              AI Models Overview
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {renderModelsOverview()}
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};

export default AIInsightsPanel;