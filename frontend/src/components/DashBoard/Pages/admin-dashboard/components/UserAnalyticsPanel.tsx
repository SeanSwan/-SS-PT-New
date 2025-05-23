/**
 * Advanced User Analytics & Behavior Insights Component
 * Comprehensive user behavior tracking and analysis
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
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
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
  Badge
} from '@mui/material';

import {
  People,
  TrendingUp,
  TrendingDown,
  AccessTime,
  Insights,
  Psychology,
  Group,
  Schedule,
  DeviceHub,
  Language,
  LocationOn,
  Devices,
  FitnessCenter,
  Restaurant,
  SocialDistance,
  Timeline,
  Assignment,
  PlayArrow,
  Pause,
  School,
  EmojiEvents,
  Warning,
  CheckCircle,
  Info,
  ExpandMore,
  FilterList,
  Download,
  Refresh,
  Search,
  Visibility,
  Analytics,
  DataUsage,
  PersonAdd,
  PersonRemove,
  Speed,
  LocalFireDepartment,
  Star,
  ThumbUp,
  Message,
  VideoCall,
  Share
} from '@mui/icons-material';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
  Scatter,
  ScatterChart,
  Funnel,
  FunnelChart,
  LabelList
} from 'recharts';

import { styled } from '@mui/material/styles';

// Types
interface UserSegment {
  name: string;
  count: number;
  percentage: number;
  growth: number;
  characteristics: string[];
  revenue: number;
  avgSessionDuration: number;
  retentionRate: number;
  color: string;
}

interface UserBehavior {
  userId: string;
  username: string;
  avatar: string;
  lastActivity: string;
  sessionsThisMonth: number;
  averageSessionDuration: number;
  preferredWorkoutTime: string;
  mostUsedFeatures: string[];
  engagementScore: number;
  retentionProbability: number;
  lifetimeValue: number;
  riskLevel: 'low' | 'medium' | 'high';
  nextAction: string;
}

interface EngagementMetric {
  date: string;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  sessionDuration: number;
  pageViews: number;
  featureUsage: {
    workouts: number;
    nutrition: number;
    social: number;
    shopping: number;
    ai: number;
  };
}

interface RetentionCohort {
  cohort: string;
  period: number;
  users: number;
  retentionRate: number;
  revenue: number;
}

interface UserJourney {
  stage: string;
  users: number;
  conversionRate: number;
  dropoffRate: number;
  averageTimeSpent: number;
  topExitPoints: string[];
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

const HeatmapCell = styled(Box)<{ intensity: number; color: string }>(({ intensity, color }) => ({
  width: 20,
  height: 20,
  borderRadius: 4,
  backgroundColor: `${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.2)',
    zIndex: 1,
  },
}));

const UserAnalyticsPanel: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState(0);
  const [userSegment, setUserSegment] = useState('all');
  const [isRealTime, setIsRealTime] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);

  // Mock data - In production, this would come from API/Redux
  const userSegments: UserSegment[] = useMemo(() => [
    {
      name: 'Premium Subscribers',
      count: 5634,
      percentage: 63.1,
      growth: 12.3,
      characteristics: ['High Engagement', 'Long Sessions', 'Feature Adoption'],
      revenue: 89745,
      avgSessionDuration: 47.5,
      retentionRate: 94.2,
      color: '#4caf50'
    },
    {
      name: 'Free Active Users',
      count: 2847,
      percentage: 31.9,
      growth: 8.7,
      characteristics: ['Regular Usage', 'Conversion Potential', 'Social Engagement'],
      revenue: 0,
      avgSessionDuration: 23.8,
      retentionRate: 67.5,
      color: '#2196f3'
    },
    {
      name: 'Trial Users',
      count: 440,
      percentage: 4.9,
      growth: -2.1,
      characteristics: ['Exploring Features', 'Time-Limited', 'Decision Phase'],
      revenue: 2340,
      avgSessionDuration: 15.3,
      retentionRate: 23.4,
      color: '#ff9800'
    }
  ], []);

  const engagementData: EngagementMetric[] = useMemo(() => [
    {
      date: '2024-06-01',
      dailyActiveUsers: 4231,
      weeklyActiveUsers: 8921,
      monthlyActiveUsers: 12456,
      sessionDuration: 42.5,
      pageViews: 124567,
      featureUsage: { workouts: 3456, nutrition: 2345, social: 1234, shopping: 567, ai: 890 }
    },
    {
      date: '2024-06-02',
      dailyActiveUsers: 4456,
      weeklyActiveUsers: 9123,
      monthlyActiveUsers: 12678,
      sessionDuration: 43.2,
      pageViews: 127890,
      featureUsage: { workouts: 3567, nutrition: 2456, social: 1345, shopping: 678, ai: 923 }
    },
    {
      date: '2024-06-03',
      dailyActiveUsers: 4678,
      weeklyActiveUsers: 9456,
      monthlyActiveUsers: 12890,
      sessionDuration: 44.8,
      pageViews: 132456,
      featureUsage: { workouts: 3789, nutrition: 2567, social: 1456, shopping: 789, ai: 1023 }
    },
    {
      date: '2024-06-04',
      dailyActiveUsers: 4234,
      weeklyActiveUsers: 9234,
      monthlyActiveUsers: 12234,
      sessionDuration: 41.2,
      pageViews: 128901,
      featureUsage: { workouts: 3234, nutrition: 2234, social: 1123, shopping: 456, ai: 801 }
    },
    {
      date: '2024-06-05',
      dailyActiveUsers: 4567,
      weeklyActiveUsers: 9567,
      monthlyActiveUsers: 12567,
      sessionDuration: 45.6,
      pageViews: 134567,
      featureUsage: { workouts: 3567, nutrition: 2567, social: 1567, shopping: 767, ai: 967 }
    },
    {
      date: '2024-06-06',
      dailyActiveUsers: 4890,
      weeklyActiveUsers: 9890,
      monthlyActiveUsers: 12890,
      sessionDuration: 46.9,
      pageViews: 138901,
      featureUsage: { workouts: 3890, nutrition: 2890, social: 1690, shopping: 890, ai: 1090 }
    },
    {
      date: '2024-06-07',
      dailyActiveUsers: 5123,
      weeklyActiveUsers: 10123,
      monthlyActiveUsers: 13123,
      sessionDuration: 48.3,
      pageViews: 142345,
      featureUsage: { workouts: 4123, nutrition: 3123, social: 1823, shopping: 923, ai: 1223 }
    }
  ], []);

  const userBehaviorData: UserBehavior[] = useMemo(() => [
    {
      userId: '1',
      username: 'john_doe_fit',
      avatar: '/api/placeholder/40/40',
      lastActivity: '2 minutes ago',
      sessionsThisMonth: 45,
      averageSessionDuration: 52.3,
      preferredWorkoutTime: 'Morning (6-8 AM)',
      mostUsedFeatures: ['Workouts', 'AI Form Analysis', 'Social Feed'],
      engagementScore: 94.2,
      retentionProbability: 97.8,
      lifetimeValue: 567.89,
      riskLevel: 'low',
      nextAction: 'Continue current program'
    },
    {
      userId: '2',
      username: 'fitness_sarah',
      avatar: '/api/placeholder/40/40',
      lastActivity: '15 minutes ago',
      sessionsThisMonth: 32,
      averageSessionDuration: 38.7,
      preferredWorkoutTime: 'Evening (6-8 PM)',
      mostUsedFeatures: ['Nutrition', 'Workouts', 'Progress Tracking'],
      engagementScore: 82.5,
      retentionProbability: 89.3,
      lifetimeValue: 445.67,
      riskLevel: 'low',
      nextAction: 'Recommend premium features'
    },
    {
      userId: '3',
      username: 'mike_trainer',
      avatar: '/api/placeholder/40/40',
      lastActivity: '1 hour ago',
      sessionsThisMonth: 18,
      averageSessionDuration: 25.4,
      preferredWorkoutTime: 'Varied',
      mostUsedFeatures: ['Social Feed', 'Marketplace'],
      engagementScore: 56.8,
      retentionProbability: 67.2,
      lifetimeValue: 234.56,
      riskLevel: 'medium',
      nextAction: 'Engagement campaign'
    }
  ], []);

  const retentionCohorts: RetentionCohort[] = useMemo(() => [
    { cohort: 'Jan 2024', period: 0, users: 1000, retentionRate: 100, revenue: 23456 },
    { cohort: 'Jan 2024', period: 1, users: 834, retentionRate: 83.4, revenue: 18734 },
    { cohort: 'Jan 2024', period: 2, users: 723, retentionRate: 72.3, revenue: 16456 },
    { cohort: 'Jan 2024', period: 3, users: 645, retentionRate: 64.5, revenue: 14567 },
    { cohort: 'Jan 2024', period: 4, users: 578, retentionRate: 57.8, revenue: 13456 },
    { cohort: 'Jan 2024', period: 5, users: 512, retentionRate: 51.2, revenue: 12345 },
    { cohort: 'Feb 2024', period: 0, users: 1200, retentionRate: 100, revenue: 26789 },
    { cohort: 'Feb 2024', period: 1, users: 1032, retentionRate: 86.0, revenue: 22345 },
    { cohort: 'Feb 2024', period: 2, users: 923, retentionRate: 76.9, revenue: 19678 },
    { cohort: 'Feb 2024', period: 3, users: 834, retentionRate: 69.5, revenue: 17890 },
    { cohort: 'Feb 2024', period: 4, users: 756, retentionRate: 63.0, revenue: 16234 },
    { cohort: 'Mar 2024', period: 0, users: 1500, retentionRate: 100, revenue: 34567 },
    { cohort: 'Mar 2024', period: 1, users: 1335, retentionRate: 89.0, revenue: 29456 },
    { cohort: 'Mar 2024', period: 2, users: 1200, retentionRate: 80.0, revenue: 26789 },
    { cohort: 'Mar 2024', period: 3, users: 1095, retentionRate: 73.0, revenue: 24567 }
  ], []);

  const userJourney: UserJourney[] = useMemo(() => [
    { stage: 'Landing Page', users: 10000, conversionRate: 100, dropoffRate: 0, averageTimeSpent: 45, topExitPoints: [] },
    { stage: 'Sign Up', users: 6500, conversionRate: 65, dropoffRate: 35, averageTimeSpent: 120, topExitPoints: ['Registration Form', 'Email Verification'] },
    { stage: 'Onboarding', users: 5200, conversionRate: 80, dropoffRate: 20, averageTimeSpent: 180, topExitPoints: ['Goal Setting', 'Profile Completion'] },
    { stage: 'First Workout', users: 4160, conversionRate: 80, dropoffRate: 20, averageTimeSpent: 300, topExitPoints: ['Workout Selection', 'Exercise Instructions'] },
    { stage: 'First Week', users: 3328, conversionRate: 80, dropoffRate: 20, averageTimeSpent: 2100, topExitPoints: ['Feature Discovery', 'Habit Formation'] },
    { stage: 'Premium Upgrade', users: 2330, conversionRate: 70, dropoffRate: 30, averageTimeSpent: 600, topExitPoints: ['Pricing Page', 'Payment Process'] },
    { stage: 'Active User', users: 1864, conversionRate: 80, dropoffRate: 20, averageTimeSpent: 3600, topExitPoints: ['Feature Limitations', 'Competition'] }
  ], []);

  // Activity heatmap data
  const heatmapData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return days.map(day => ({
      day,
      hours: hours.map(hour => ({
        hour,
        intensity: Math.random() * 0.8 + 0.2 // Random intensity between 0.2 and 1
      }))
    }));
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  }, []);

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Key Metrics Row */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <MetricCard accentColor="#4caf50">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h3" sx={{ color: '#4caf50', fontWeight: 700 }}>
                      8,921
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Daily Active Users
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#4caf50">
                        +12.5% vs yesterday
                      </Typography>
                    </Box>
                  </Box>
                  <People sx={{ fontSize: 40, color: 'rgba(76, 175, 80, 0.3)' }} />
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
                      47.5
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Session Duration (min)
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#4caf50">
                        +3.2% this week
                      </Typography>
                    </Box>
                  </Box>
                  <AccessTime sx={{ fontSize: 40, color: 'rgba(33, 150, 243, 0.3)' }} />
                </Box>
              </CardContent>
            </MetricCard>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <MetricCard accentColor="#9c27b0">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h3" sx={{ color: '#9c27b0', fontWeight: 700 }}>
                      89.2%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      User Retention Rate
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingUp sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#4caf50">
                        +2.1% this month
                      </Typography>
                    </Box>
                  </Box>
                  <Group sx={{ fontSize: 40, color: 'rgba(156, 39, 176, 0.3)' }} />
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
                      342
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      New Signups Today
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                      <TrendingDown sx={{ color: '#f44336', fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption" color="#f44336">
                        -8.3% vs yesterday
                      </Typography>
                    </Box>
                  </Box>
                  <PersonAdd sx={{ fontSize: 40, color: 'rgba(255, 152, 0, 0.3)' }} />
                </Box>
              </CardContent>
            </MetricCard>
          </Grid>
        </Grid>
      </Grid>
      
      {/* Engagement Trends Chart */}
      <Grid item xs={12} lg={8}>
        <GlassCard>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Analytics />
                User Engagement Trends
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl size="small">
                  <Select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    sx={{ color: '#e0e0e0', minWidth: 100 }}
                  >
                    <MenuItem value="24h">Last 24 Hours</MenuItem>
                    <MenuItem value="7d">Last 7 Days</MenuItem>
                    <MenuItem value="30d">Last 30 Days</MenuItem>
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
                <ComposedChart data={engagementData}>
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
                    yAxisId="left"
                    type="monotone"
                    dataKey="dailyActiveUsers"
                    fill="url(#userGradient)"
                    stroke="#4caf50"
                    strokeWidth={2}
                    name="Daily Active Users"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="sessionDuration"
                    stroke="#2196f3"
                    strokeWidth={3}
                    name="Avg Session Duration (min)"
                  />
                  <defs>
                    <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
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
      
      {/* User Segments */}
      <Grid item xs={12} lg={4}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Group />
              User Segments
            </Typography>
            
            {userSegments.map((segment, index) => (
              <Accordion 
                key={index}
                sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.02)', 
                  borderRadius: 2,
                  mb: 1,
                  '&:before': { display: 'none' }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {segment.name}
                      </Typography>
                      <Chip
                        label={`${segment.growth >= 0 ? '+' : ''}${segment.growth}%`}
                        color={segment.growth >= 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h5" sx={{ color: segment.color }}>
                        {segment.count.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {segment.percentage}% of total
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={segment.percentage}
                      sx={{
                        mt: 1,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: segment.color,
                          borderRadius: 3
                        }
                      }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Revenue</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        ${segment.revenue.toLocaleString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Retention</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {segment.retentionRate}%
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Key Characteristics
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {segment.characteristics.map((char, idx) => (
                          <Chip key={idx} label={char} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </GlassCard>
      </Grid>
      
      {/* Activity Heatmap */}
      <Grid item xs={12}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timeline />
              User Activity Heatmap
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              User activity intensity by day and hour (darker = more activity)
            </Typography>
            
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={1}>
                <Grid item xs={1} />
                {Array.from({ length: 24 }, (_, i) => (
                  <Grid item xs={0.45} key={i}>
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                      {i}h
                    </Typography>
                  </Grid>
                ))}
                {heatmapData.map((dayData, dayIndex) => (
                  <React.Fragment key={dayData.day}>
                    <Grid item xs={1}>
                      <Typography variant="caption" color="text.secondary">
                        {dayData.day}
                      </Typography>
                    </Grid>
                    {dayData.hours.map((hourData, hourIndex) => (
                      <Grid item xs={0.45} key={hourIndex}>
                        <Tooltip title={`${dayData.day} ${hourData.hour}:00 - Activity: ${(hourData.intensity * 100).toFixed(0)}%`}>
                          <HeatmapCell 
                            intensity={hourData.intensity} 
                            color="#4caf50"
                            sx={{ cursor: 'pointer' }}
                          />
                        </Tooltip>
                      </Grid>
                    ))}
                  </React.Fragment>
                ))}
              </Grid>
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  const renderRetentionTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} lg={8}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <DataUsage />
              Cohort Retention Analysis
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cohort</TableCell>
                    <TableCell>Users</TableCell>
                    <TableCell>Month 0</TableCell>
                    <TableCell>Month 1</TableCell>
                    <TableCell>Month 2</TableCell>
                    <TableCell>Month 3</TableCell>
                    <TableCell>Month 4</TableCell>
                    <TableCell>Month 5</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(
                    retentionCohorts.reduce((acc, item) => {
                      if (!acc[item.cohort]) acc[item.cohort] = {};
                      acc[item.cohort][item.period] = item;
                      return acc;
                    }, {} as Record<string, Record<number, RetentionCohort>>)
                  ).map(([cohort, periods]) => {
                    const cohortData = periods[0];
                    return (
                      <TableRow key={cohort}>
                        <TableCell>{cohort}</TableCell>
                        <TableCell>{cohortData.users}</TableCell>
                        {[0, 1, 2, 3, 4, 5].map(period => {
                          const data = periods[period];
                          if (!data) return <TableCell key={period}>-</TableCell>;
                          const rate = data.retentionRate;
                          return (
                            <TableCell key={period}>
                              <Box
                                sx={{
                                  bgcolor: `rgba(${rate > 70 ? '76, 175, 80' : rate > 50 ? '255, 152, 0' : '244, 67, 54'}, ${rate / 100})`,
                                  color: 'white',
                                  p: 1,
                                  borderRadius: 1,
                                  textAlign: 'center'
                                }}
                              >
                                {rate.toFixed(1)}%
                              </Box>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </GlassCard>
      </Grid>
      
      <Grid item xs={12} lg={4}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Retention Metrics Summary
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" color="#4caf50" fontWeight={700}>
                89.2%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                30-Day Retention Rate
              </Typography>
              <LinearProgress
                variant="determinate"
                value={89.2}
                sx={{
                  mt: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#4caf50',
                    borderRadius: 4
                  }
                }}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" color="#2196f3" fontWeight={700}>
                73.5%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                7-Day Retention Rate
              </Typography>
              <LinearProgress
                variant="determinate"
                value={73.5}
                sx={{
                  mt: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#2196f3',
                    borderRadius: 4
                  }
                }}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" color="#ff9800" fontWeight={700}>
                56.8%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                90-Day Retention Rate
              </Typography>
              <LinearProgress
                variant="determinate"
                value={56.8}
                sx={{
                  mt: 1,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#ff9800',
                    borderRadius: 4
                  }
                }}
              />
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Key Insights
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <TrendingUp sx={{ color: '#4caf50' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Premium users show 94% retention"
                  secondary="Significantly higher than average"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Warning sx={{ color: '#ff9800' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Free users drop off after day 7"
                  secondary="Optimize onboarding experience"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Lightbulb sx={{ color: '#2196f3' }} />
                </ListItemIcon>
                <ListItemText
                  primary="Social features improve retention"
                  secondary="Users with friends stay 40% longer"
                />
              </ListItem>
            </List>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  const renderBehaviorTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <GlassCard>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology />
                User Behavior Analysis
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => {/* TODO: Export functionality */}}
              >
                Export Report
              </Button>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Last Activity</TableCell>
                    <TableCell>Sessions/Month</TableCell>
                    <TableCell>Avg Duration</TableCell>
                    <TableCell>Top Features</TableCell>
                    <TableCell>Engagement Score</TableCell>
                    <TableCell>Risk Level</TableCell>
                    <TableCell>Recommended Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {userBehaviorData.map((user) => (
                    <TableRow key={user.userId} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            badgeContent={
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: 'success.main',
                                  border: '2px solid #1d1f2b'
                                }}
                              />
                            }
                          >
                            <Avatar src={user.avatar} alt={user.username} />
                          </Badge>
                          <Typography variant="body2" fontWeight={600}>
                            {user.username}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {user.lastActivity}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {user.sessionsThisMonth}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.averageSessionDuration.toFixed(1)}min
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.mostUsedFeatures.slice(0, 2).map((feature, idx) => (
                            <Chip key={idx} label={feature} size="small" variant="outlined" />
                          ))}
                          {user.mostUsedFeatures.length > 2 && (
                            <Chip label={`+${user.mostUsedFeatures.length - 2}`} size="small" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {user.engagementScore.toFixed(1)}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={user.engagementScore}
                            sx={{
                              width: 60,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: user.engagementScore > 80 ? '#4caf50' : user.engagementScore > 60 ? '#ff9800' : '#f44336',
                                borderRadius: 3
                              }
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.riskLevel}
                          color={
                            user.riskLevel === 'low' ? 'success' :
                            user.riskLevel === 'medium' ? 'warning' : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {user.nextAction}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </GlassCard>
      </Grid>
      
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Feature Usage Breakdown
            </Typography>
            
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Workouts', value: 35, color: '#4caf50' },
                      { name: 'Nutrition', value: 25, color: '#2196f3' },
                      { name: 'Social', value: 20, color: '#ff9800' },
                      { name: 'Shopping', value: 10, color: '#9c27b0' },
                      { name: 'AI Features', value: 10, color: '#00bcd4' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {[
                      { name: 'Workouts', value: 35, color: '#4caf50' },
                      { name: 'Nutrition', value: 25, color: '#2196f3' },
                      { name: 'Social', value: 20, color: '#ff9800' },
                      { name: 'Shopping', value: 10, color: '#9c27b0' },
                      { name: 'AI Features', value: 10, color: '#00bcd4' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
      
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              User Journey Funnel
            </Typography>
            
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Funnel
                    dataKey="users"
                    data={userJourney}
                    fill="#4caf50"
                  >
                    <LabelList position="center" fill="#fff" stroke="none" />
                  </Funnel>
                  <ReTooltip />
                </FunnelChart>
              </ResponsiveContainer>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              {userJourney.map((stage, index) => (
                <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2">{stage.stage}</Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography variant="caption" color={
                      stage.dropoffRate > 40 ? '#f44336' : 
                      stage.dropoffRate > 20 ? '#ff9800' : '#4caf50'
                    }>
                      {stage.dropoffRate}% drop-off
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  const tabPanels = [
    renderOverviewTab(),
    renderRetentionTab(),
    renderBehaviorTab()
  ];

  return (
    <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#00ffff', fontWeight: 700, mb: 1 }}>
          User Analytics Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Deep insights into user behavior, engagement, and retention patterns
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
            icon={<Analytics />} 
            iconPosition="start" 
            label="Overview" 
          />
          <Tab 
            icon={<DataUsage />} 
            iconPosition="start" 
            label="Retention Analysis" 
          />
          <Tab 
            icon={<Psychology />} 
            iconPosition="start" 
            label="Behavior Insights" 
          />
        </Tabs>
      </Box>

      <Box>
        {tabPanels[activeTab]}
      </Box>

      {/* Floating Action Button */}
      <SpeedDial
        ariaLabel="Quick Actions"
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
          tooltipTitle="Export Data"
          onClick={() => {/* TODO: Export functionality */}}
        />
        <SpeedDialAction
          icon={<FilterList />}
          tooltipTitle="Advanced Filters"
          onClick={() => {/* TODO: Filter modal */}}
        />
        <SpeedDialAction
          icon={<Refresh />}
          tooltipTitle="Refresh Data"
          onClick={() => {/* TODO: Refresh data */}}
        />
      </SpeedDial>
    </Box>
  );
};

export default UserAnalyticsPanel;