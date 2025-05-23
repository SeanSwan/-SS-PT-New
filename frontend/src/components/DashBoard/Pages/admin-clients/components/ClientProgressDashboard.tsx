/**
 * Client Progress Dashboard Component
 * 7-Star AAA Personal Training & Social Media App
 * 
 * Comprehensive progress tracking with visual indicators, milestone tracking,
 * body composition analysis, and achievement celebration
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  StepIcon,
  StepConnector,
  Avatar,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Rating,
  Alert,
  AlertTitle,
  Badge,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress as MUICircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Timeline,
  FitnessCenter,
  MonitorWeight,
  Height,
  Speed,
  Timer,
  LocalFireDepartment,
  MyLocation,
  CheckCircle,
  RadioButtonUnchecked,
  Star,
  EmojiEvents,
  ArrowUpward,
  ArrowDownward,
  Remove,
  ExpandMore,
  PhotoCamera,
  Analytics,
  Assessment,
  Insights,
  Compare,
  Refresh,
  Download,
  Share,
  Info,
  Warning,
  Functions,
  School,
  DirectionsBike,
  DirectionsWalk,
  Pool,
  SelfImprovement,
  RestoreFromTrash,
  RotateRight,
  Construction,
  Psychology,
  ShowChart,
  CollectionsBookmark,
  MilitaryTech,
  Celebration
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
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  Cell,
  PieChart,
  Pie,
  ScatterChart,
  Scatter
} from 'recharts';

// Define interfaces
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

// Styled components
const ProgressCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.05))',
  backdropFilter: 'blur(20px)',
  borderRadius: 16,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: 'linear-gradient(90deg, #00ffff, #7851a9, #ff1744)',
  },
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0, 255, 255, 0.15)',
  },
}));

const MilestoneCard = styled(Card)<{ completed?: boolean }>(({ theme, completed }) => ({
  backgroundColor: completed ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.02)',
  border: completed ? '1px solid rgba(76, 175, 80, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 24px rgba(0, 255, 255, 0.1)',
  },
}));

const MetricDisplay = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: theme.spacing(2),
  borderRadius: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
}));

const CustomStepIcon = styled(StepIcon)(({ theme }) => ({
  '&.Mui-active': {
    color: '#00ffff',
  },
  '&.Mui-completed': {
    color: '#4caf50',
  },
}));

const ProgressButton = styled(Button)(({ theme, variant: buttonVariant }) => ({
  borderRadius: 8,
  textTransform: 'none',
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

interface ClientProgressDashboardProps {
  clientId: string;
  onMilestoneUpdate?: (milestoneId: string, completed: boolean) => void;
  onAssessmentSchedule?: () => void;
}

const ClientProgressDashboard: React.FC<ClientProgressDashboardProps> = ({
  clientId,
  onMilestoneUpdate,
  onAssessmentSchedule
}) => {
  // State management
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'measurements'>('overview');
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('milestones');

  // Mock data for demonstration
  const mockMilestones: MilestoneItem[] = [
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
  ];

  const mockAssessments: AssessmentMetric[] = [
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
  ];

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

  // Render milestone section
  const renderMilestones = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#00ffff' }}>
          Current Milestones
        </Typography>
        <ProgressButton variant="outlined" startIcon={<Add />}>
          Add Milestone
        </ProgressButton>
      </Box>

      <Grid container spacing={2}>
        {mockMilestones.map((milestone) => (
          <Grid item xs={12} md={6} xl={4} key={milestone.id}>
            <MilestoneCard completed={milestone.status === 'completed'}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {milestone.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {milestone.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip 
                        label={milestone.category} 
                        size="small" 
                        icon={
                          milestone.category === 'strength' ? <FitnessCenter /> :
                          milestone.category === 'endurance' ? <DirectionsBike /> :
                          milestone.category === 'weight' ? <MonitorWeight /> :
                          <SelfImprovement />
                        }
                        sx={{ fontSize: '0.75rem' }}
                      />
                      <Chip 
                        label={milestone.difficulty} 
                        size="small" 
                        color={
                          milestone.difficulty === 'easy' ? 'success' :
                          milestone.difficulty === 'medium' ? 'warning' : 'error'
                        }
                        sx={{ fontSize: '0.75rem' }}
                      />
                    </Box>
                  </Box>
                  <Avatar
                    sx={{
                      bgcolor: milestone.status === 'completed' ? '#4caf50' : 
                               milestone.status === 'in-progress' ? '#ff9800' : '#666',
                      ml: 2
                    }}
                  >
                    {milestone.status === 'completed' ? <CheckCircle /> :
                     milestone.status === 'in-progress' ? <Timeline /> :
                     <RadioButtonUnchecked />}
                  </Avatar>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {milestone.currentValue}/{milestone.targetValue} {milestone.unit}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(milestone.currentValue / milestone.targetValue) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: milestone.status === 'completed' ? '#4caf50' : '#00ffff',
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>

                {milestone.reward && (
                  <Box sx={{ p: 2, bgcolor: 'rgba(255, 215, 0, 0.1)', borderRadius: 2, mb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Reward: {milestone.reward.type}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#ffd700' }}>
                      {milestone.reward.value}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                  {milestone.status === 'completed' ? (
                    <Typography variant="caption" color="success.main">
                      Completed on {new Date(milestone.completedDate!).toLocaleDateString()}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Est. completion: {milestone.estimatedCompletion}
                    </Typography>
                  )}
                  <ProgressButton 
                    variant="outlined" 
                    size="small"
                    disabled={milestone.status === 'completed'}
                  >
                    {milestone.status === 'completed' ? 'Completed' : 'Track Progress'}
                  </ProgressButton>
                </Box>
              </CardContent>
            </MilestoneCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render assessments section
  const renderAssessments = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#00ffff' }}>
          Fitness Assessments
        </Typography>
        <ProgressButton variant="outlined" startIcon={<Assessment />} onClick={onAssessmentSchedule}>
          Schedule Assessment
        </ProgressButton>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assessment Scores Over Time
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={Array.from({ length: 6 }, (_, i) => ({
                    month: `Month ${i + 1}`,
                    overall: 6 + (i * 0.4) + Math.random() * 0.5,
                    strength: 6.5 + (i * 0.3) + Math.random() * 0.4,
                    endurance: 5.8 + (i * 0.5) + Math.random() * 0.3,
                    flexibility: 6.2 + (i * 0.25) + Math.random() * 0.4
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="month" stroke="#999" />
                    <YAxis domain={[5, 10]} stroke="#999" />
                    <RechartsTooltip
                      contentStyle={{ 
                        backgroundColor: '#252742', 
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                        borderRadius: 8
                      }}
                    />
                    <Line type="monotone" dataKey="overall" stroke="#00ffff" strokeWidth={3} />
                    <Line type="monotone" dataKey="strength" stroke="#ff6b6b" strokeWidth={2} />
                    <Line type="monotone" dataKey="endurance" stroke="#4ecdc4" strokeWidth={2} />
                    <Line type="monotone" dataKey="flexibility" stroke="#ffe066" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {mockAssessments.map((assessment) => (
              <MetricDisplay key={assessment.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h4" sx={{ color: '#00ffff', fontWeight: 700 }}>
                    {assessment.value}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    /{assessment.maxValue}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {assessment.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {assessment.improvement > 0 ? (
                    <TrendingUp sx={{ color: '#4caf50', fontSize: 16 }} />
                  ) : (
                    <TrendingDown sx={{ color: '#f44336', fontSize: 16 }} />
                  )}
                  <Typography variant="caption" color={assessment.improvement > 0 ? '#4caf50' : '#f44336'}>
                    {Math.abs(assessment.improvement)}% improvement
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(assessment.value / assessment.maxValue) * 100}
                  sx={{
                    width: '100%',
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#00ffff',
                      borderRadius: 4
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {assessment.percentile}th percentile
                </Typography>
              </MetricDisplay>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  // Render measurements section
  const renderMeasurements = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ color: '#00ffff' }}>
          Body Measurements & Composition
        </Typography>
        <ProgressButton variant="outlined" startIcon={<PhotoCamera />}>
          Add Measurement
        </ProgressButton>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Measurement Trends
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={Array.from({ length: 12 }, (_, i) => ({
                    week: `Week ${i + 1}`,
                    weight: 82 - (i * 0.3) + Math.random() * 0.5,
                    bodyFat: 16 - (i * 0.2) + Math.random() * 0.3,
                    muscleMass: 68 + (i * 0.3) + Math.random() * 0.2
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="week" stroke="#999" />
                    <YAxis stroke="#999" />
                    <RechartsTooltip
                      contentStyle={{ 
                        backgroundColor: '#252742', 
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                        borderRadius: 8
                      }}
                    />
                    <Line type="monotone" dataKey="weight" stroke="#00ffff" strokeWidth={3} name="Weight (kg)" />
                    <Line type="monotone" dataKey="bodyFat" stroke="#ff6b6b" strokeWidth={2} name="Body Fat (%)" />
                    <Line type="monotone" dataKey="muscleMass" stroke="#4ecdc4" strokeWidth={2} name="Muscle Mass (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {mockMeasurements.map((measurement) => (
              <Card key={measurement.id} sx={{ bgcolor: '#1d1f2b', borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                      {measurement.type.replace('_', ' ')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {measurement.trend === 'up' ? (
                        <ArrowUpward sx={{ color: measurement.type === 'muscle_mass' ? '#4caf50' : '#ff9800', fontSize: 20 }} />
                      ) : measurement.trend === 'down' ? (
                        <ArrowDownward sx={{ color: measurement.type === 'weight' || measurement.type === 'body_fat' ? '#4caf50' : '#ff9800', fontSize: 20 }} />
                      ) : (
                        <Remove sx={{ color: '#999', fontSize: 20 }} />
                      )}
                      <Typography 
                        variant="caption" 
                        color={
                          (measurement.trend === 'down' && (measurement.type === 'weight' || measurement.type === 'body_fat')) ||
                          (measurement.trend === 'up' && measurement.type === 'muscle_mass') 
                            ? '#4caf50' : '#ff9800'
                        }
                      >
                        {Math.abs(measurement.percentChange)}%
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h3" sx={{ color: '#00ffff', fontWeight: 700 }}>
                      {measurement.value}
                    </Typography>
                    <Typography variant="h6" color="text.secondary">
                      {measurement.unit}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Measured on {new Date(measurement.date).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );

  // Render overview section
  const renderOverview = () => (
    <Grid container spacing={3}>
      {/* Overall Progress Card */}
      <Grid item xs={12} md={6} lg={4}>
        <ProgressCard>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: '#00ffff', mb: 2 }}>
              Overall Progress
            </Typography>
            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
              <MUICircularProgress
                variant="determinate"
                value={overallProgress.overallScore}
                size={100}
                thickness={4}
                sx={{
                  color: '#00ffff',
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
                <Typography variant="h4" fontWeight={700} sx={{ color: '#00ffff' }}>
                  {Math.round(overallProgress.overallScore)}%
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Excellent progress! Keep up the great work.
            </Typography>
          </CardContent>
        </ProgressCard>
      </Grid>

      {/* Quick Stats */}
      <Grid item xs={12} md={6} lg={8}>
        <ProgressCard>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#00ffff', mb: 3 }}>
              Progress Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <MetricDisplay>
                  <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700 }}>
                    {mockMilestones.filter(m => m.status === 'completed').length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Milestones Completed
                  </Typography>
                </MetricDisplay>
              </Grid>
              <Grid item xs={6} sm={3}>
                <MetricDisplay>
                  <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 700 }}>
                    {mockWorkouts.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Workouts This Month
                  </Typography>
                </MetricDisplay>
              </Grid>
              <Grid item xs={6} sm={3}>
                <MetricDisplay>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                    <Typography variant="h4" sx={{ color: '#7851a9', fontWeight: 700 }}>
                      {overallProgress.avgImprovement.toFixed(1)}%
                    </Typography>
                    <TrendingUp sx={{ color: '#4caf50' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Avg Improvement
                  </Typography>
                </MetricDisplay>
              </Grid>
              <Grid item xs={6} sm={3}>
                <MetricDisplay>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                    <Star sx={{ color: '#ffd700', fontSize: 32 }} />
                    <Typography variant="h4" sx={{ color: '#ffd700', fontWeight: 700 }}>
                      4.8
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Average Rating
                  </Typography>
                </MetricDisplay>
              </Grid>
            </Grid>
          </CardContent>
        </ProgressCard>
      </Grid>

      {/* Recent Achievements */}
      <Grid item xs={12}>
        <ProgressCard>
          <CardContent>
            <Typography variant="h6" sx={{ color: '#00ffff', mb: 3 }}>
              Recent Achievements
            </Typography>
            <Grid container spacing={2}>
              {mockMilestones
                .filter(m => m.status === 'completed')
                .map((achievement) => (
                  <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: 'rgba(76, 175, 80, 0.1)',
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                        borderRadius: 2,
                        textAlign: 'center'
                      }}
                    >
                      <Celebration sx={{ fontSize: 40, color: '#ffd700', mb: 1 }} />
                      <Typography variant="h6" gutterBottom>
                        {achievement.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {achievement.description}
                      </Typography>
                      {achievement.reward && (
                        <Chip
                          label={`${achievement.reward.type}: ${achievement.reward.value}`}
                          sx={{
                            bgcolor: 'rgba(255, 215, 0, 0.2)',
                            color: '#ffd700',
                            mt: 1
                          }}
                        />
                      )}
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Completed on {new Date(achievement.completedDate!).toLocaleDateString()}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
            </Grid>
          </CardContent>
        </ProgressCard>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#00ffff', mb: 1, fontWeight: 700 }}>
          Progress Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track milestones, monitor improvements, and celebrate achievements
        </Typography>
      </Box>

      {/* Controls */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: '#a0a0a0' }}>Timeframe</InputLabel>
          <Select
            value={selectedTimeframe}
            label="Timeframe"
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            sx={{ color: '#e0e0e0' }}
          >
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
            <MenuItem value="90d">Last 90 Days</MenuItem>
            <MenuItem value="1y">Last Year</MenuItem>
          </Select>
        </FormControl>

        <ButtonGroup variant="outlined" size="small">
          <ProgressButton 
            variant={viewMode === 'overview' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('overview')}
          >
            Overview
          </ProgressButton>
          <ProgressButton 
            variant={viewMode === 'detailed' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('detailed')}
          >
            Detailed
          </ProgressButton>
          <ProgressButton 
            variant={viewMode === 'measurements' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('measurements')}
          >
            Measurements
          </ProgressButton>
        </ButtonGroup>

        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <ProgressButton variant="outlined" startIcon={<Refresh />}>
            Refresh
          </ProgressButton>
          <ProgressButton variant="outlined" startIcon={<Download />}>
            Export
          </ProgressButton>
        </Box>
      </Box>

      {/* Content */}
      {viewMode === 'overview' && renderOverview()}
      
      {viewMode === 'detailed' && (
        <Box>
          <Box sx={{ mb: 4 }}>
            {renderMilestones()}
          </Box>
          <Box sx={{ mb: 4 }}>
            {renderAssessments()}
          </Box>
        </Box>
      )}
      
      {viewMode === 'measurements' && renderMeasurements()}
    </Box>
  );
};

export default ClientProgressDashboard;