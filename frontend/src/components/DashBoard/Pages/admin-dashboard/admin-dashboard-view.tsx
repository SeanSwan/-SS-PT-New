/**
 * Enhanced AAA 7-Star Admin Dashboard
 * SwanStudios Personal Training & Social Media Platform
 * 
 * This is the main admin dashboard that integrates all monitoring components:
 * - Real-time analytics and business intelligence
 * - System health monitoring
 * - Advanced user behavior insights
 * - AI/ML monitoring
 * - Security dashboard
 * - Revenue analytics
 * - Content performance analytics
 * - 100% Mobile Responsive for tiny screens
 */

import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Box, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  Paper,
  Button,
  IconButton,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Alert,
  Chip,
  Divider,
  Tooltip,
  Badge,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
  Stack,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Drawer,
  AppBar,
  Toolbar,
  Breadcrumbs,
  Link,
  Skeleton
} from '@mui/material';

// Enhanced icon library
import {
  Dashboard,
  TrendingUp,
  TrendingDown,
  PeopleAlt,
  AttachMoney,
  Security,
  Speed,
  Analytics,
  Psychology,
  EmojiEvents,
  PlayCircle,
  Warning,
  Error,
  CheckCircle,
  Refresh,
  Notifications,
  Settings,
  Timeline,
  BarChart,
  PieChart,
  ShowChart,
  Assessment,
  Computer,
  Cloud,
  Storage,
  NetworkWifi,
  Memory,
  Lightbulb,
  AutoGraph,
  SmartToy,
  ModelTraining,
  Insights,
  Visibility,
  VisibilityOff,
  Fullscreen,
  FullscreenExit,
  Download,
  Share,
  FilterList,
  DateRange,
  LocalFireDepartment,
  Star,
  ThumbUp,
  MonetizationOn,
  ShoppingCart,
  FitnessCenter,
  Restaurant,
  Group,
  Schedule,
  CameraAlt,
  VideoLibrary,
  MicExternalOn,
  School,
  BusinessCenter,
  LocalHospital,
  SportsKabaddi,
  Engineering,
  HealthAndSafety,
  Bolt,
  FlashOn,
  SignalWifi4Bar,
  WifiOff,
  SystemUpdateAlt,
  BackupTable,
  DataUsage,
  CompareArrows,
  Report,
  PersonAdd,
  PersonRemove,
  SupervisorAccount,
  ManageAccounts,
  AdminPanelSettings,
  Shield as ShieldIcon,
  Monitor,
  DeviceHub,
  Api,
  CloudDone,
  CloudOff,
  Build,
  Tune,
  Extension,
  Launch,
  Widgets,
  ViewModule,
  Apps,
  GridView,
  Home as HomeIcon,
  Explore as ExploreIcon,
  TrendingUp as TrendingUpIcon,
  Equalizer as EqualizerIcon
} from '@mui/icons-material';

// Lazy load mobile-optimized dashboard for better performance
const MobileOptimizedDashboard = lazy(() => import('./mobile-optimized-admin-dashboard'));

// Import our new components
import RevenueAnalyticsPanel from './components/RevenueAnalyticsPanel';
import UserAnalyticsPanel from './components/UserAnalyticsPanel';
import AIMonitoringPanel from './components/AIMonitoringPanel';
import SecurityMonitoringPanel from './components/SecurityMonitoringPanel';
import SystemHealthPanel from './components/SystemHealthPanel';

// Chart components
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
  RadialBarChart,
  RadialBar,
  Legend,
  Treemap,
  Scatter,
  ScatterChart,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';

// Styled components
import { styled, alpha } from '@mui/material/styles';

// Types and interfaces
interface DashboardMetric {
  id: string;
  title: string;
  value: number | string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: string;
  description: string;
  trend: number[];
  target?: number;
  format: 'number' | 'currency' | 'percentage' | 'text';
}

interface SystemHealthMetric {
  service: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  uptime: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  details: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  permission?: string;
}

// Styled components with mobile optimizations
const EnhancedCard = styled(Card)(({ theme }) => ({
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
  [theme.breakpoints.down('sm')]: {
    borderRadius: 12,
    '&:hover': {
      transform: 'translateY(-2px)',
    },
  },
}));

const MetricCard = styled(EnhancedCard, {
  shouldForwardProp: (prop) => prop !== 'accentColor',
})<{ accentColor?: string }>(({ theme, accentColor = '#00ffff' }) => ({
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
  [theme.breakpoints.down('sm')]: {
    '&::before': {
      height: 3,
    },
  },
}));

const GlassPanel = styled(Paper)(({ theme }) => ({
  backgroundColor: 'rgba(29, 31, 43, 0.7)',
  backdropFilter: 'blur(15px)',
  borderRadius: 12,
  border: '1px solid rgba(0, 255, 255, 0.1)',
  overflow: 'hidden',
  [theme.breakpoints.down('sm')]: {
    borderRadius: 8,
    backdropFilter: 'blur(10px)',
  },
}));

const StatusIndicator = styled(Box)<{ status: 'healthy' | 'warning' | 'error' | 'offline' }>(({ status }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: 
    status === 'healthy' ? '#4caf50' :
    status === 'warning' ? '#ff9800' :
    status === 'error' ? '#f44336' : '#616161',
  boxShadow: `0 0 8px ${
    status === 'healthy' ? '#4caf50' :
    status === 'warning' ? '#ff9800' :
    status === 'error' ? '#f44336' : '#616161'
  }`,
  animation: status === 'healthy' ? 'pulse 2s infinite' : 'none',
  '@keyframes pulse': {
    '0%': {
      boxShadow: `0 0 0 0 ${status === 'healthy' ? 'rgba(76, 175, 80, 0.7)' : 'rgba(255, 152, 0, 0.7)'}`,
    },
    '70%': {
      boxShadow: `0 0 0 10px rgba(76, 175, 80, 0)`,
    },
    '100%': {
      boxShadow: `0 0 0 0 rgba(76, 175, 80, 0)`,
    },
  },
}));

const ChartContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: 300,
  '& .recharts-wrapper': {
    width: '100% !important',
    height: '100% !important',
  },
  [theme.breakpoints.down('md')]: {
    height: 250,
  },
  [theme.breakpoints.down('sm')]: {
    height: 200,
  },
}));

const MainDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isXS = useMediaQuery('(max-width:575px)');
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [isRealTime, setIsRealTime] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedCards, setExpandedCards] = useState<string[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);
  const [activeSubComponent, setActiveSubComponent] = useState<string | null>(null);

  // Mock data - In production, this would come from Redux store or API
  const dashboardMetrics: DashboardMetric[] = useMemo(() => [
    {
      id: 'total-revenue',
      title: 'Total Revenue',
      value: 127854,
      change: 12.5,
      changeType: 'increase',
      icon: <AttachMoney />,
      color: '#4caf50',
      description: 'Monthly recurring revenue',
      trend: [95000, 102000, 108000, 115000, 120000, 127854],
      target: 150000,
      format: 'currency'
    },
    {
      id: 'active-users',
      title: 'Active Users',
      value: 8921,
      change: 8.3,
      changeType: 'increase',
      icon: <PeopleAlt />,
      color: '#2196f3',
      description: 'Daily active users',
      trend: [7800, 8200, 8500, 8700, 8800, 8921],
      target: 10000,
      format: 'number'
    },
    {
      id: 'completion-rate',
      title: 'Workout Completion',
      value: 87.3,
      change: -2.1,
      changeType: 'decrease',
      icon: <FitnessCenter />,
      color: '#ff9800',
      description: 'Average workout completion rate',
      trend: [89.1, 89.5, 88.9, 88.2, 87.8, 87.3],
      target: 90,
      format: 'percentage'
    },
    {
      id: 'ai-accuracy',
      title: 'AI Model Accuracy',
      value: 94.7,
      change: 1.8,
      changeType: 'increase',
      icon: <Psychology />,
      color: '#9c27b0',
      description: 'Form analysis accuracy',
      trend: [92.1, 92.8, 93.5, 93.9, 94.2, 94.7],
      target: 95,
      format: 'percentage'
    },
    {
      id: 'retention-rate',
      title: 'User Retention',
      value: 89.2,
      change: 3.4,
      changeType: 'increase',
      icon: <Group />,
      color: '#00bcd4',
      description: '30-day retention rate',
      trend: [85.8, 86.5, 87.2, 88.1, 88.7, 89.2],
      target: 90,
      format: 'percentage'
    },
    {
      id: 'system-health',
      title: 'System Health',
      value: 99.7,
      change: 0,
      changeType: 'neutral',
      icon: <Computer />,
      color: '#4caf50',
      description: 'Overall system uptime',
      trend: [99.5, 99.6, 99.8, 99.7, 99.9, 99.7],
      target: 99.9,
      format: 'percentage'
    }
  ], []);

  const systemHealth: SystemHealthMetric[] = useMemo(() => [
    {
      service: 'API Gateway',
      status: 'healthy',
      uptime: 99.97,
      responseTime: 45,
      errorRate: 0.03,
      throughput: 1247,
      details: 'All endpoints responding normally'
    },
    {
      service: 'Database',
      status: 'healthy',
      uptime: 99.99,
      responseTime: 12,
      errorRate: 0.01,
      throughput: 3421,
      details: 'PostgreSQL cluster healthy'
    },
    {
      service: 'Workout MCP',
      status: 'healthy',
      uptime: 98.5,
      responseTime: 67,
      errorRate: 0.15,
      throughput: 892,
      details: 'Recently restarted, monitoring'
    },
    {
      service: 'YOLO AI',
      status: 'warning',
      uptime: 97.2,
      responseTime: 156,
      errorRate: 0.8,
      throughput: 345,
      details: 'High latency detected'
    },
    {
      service: 'Video Processing',
      status: 'healthy',
      uptime: 99.1,
      responseTime: 230,
      errorRate: 0.21,
      throughput: 678,
      details: 'Processing queue normal'
    }
  ], []);

  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'view-revenue',
      title: 'Revenue Analytics',
      description: 'Detailed revenue analysis and forecasting',
      icon: <MonetizationOn />,
      action: () => setActiveSubComponent('revenue')
    },
    {
      id: 'view-users',
      title: 'User Analytics',
      description: 'User behavior and engagement insights',
      icon: <PeopleAlt />,
      action: () => setActiveSubComponent('users')
    },
    {
      id: 'view-ai',
      title: 'AI Monitoring',
      description: 'AI model performance and optimization',
      icon: <Psychology />,
      action: () => setActiveSubComponent('ai')
    },
    {
      id: 'view-security',
      title: 'Security Dashboard',
      description: 'Security monitoring and threat analysis',
      icon: <Security />,
      action: () => setActiveSubComponent('security')
    },
    {
      id: 'view-system',
      title: 'System Health',
      description: 'Infrastructure monitoring and alerts',
      icon: <Monitor />,
      action: () => setActiveSubComponent('system')
    },
    {
      id: 'admin-tools',
      title: 'Admin Tools',
      description: 'System configuration and management',
      icon: <AdminPanelSettings />,
      action: () => console.log('Admin tools')
    }
  ], []);

  // Chart data
  const revenueData = useMemo(() => [
    { month: 'Jan', revenue: 95000, subscriptions: 4523, arpu: 21.0 },
    { month: 'Feb', revenue: 102000, subscriptions: 4876, arpu: 20.9 },
    { month: 'Mar', revenue: 108000, subscriptions: 5134, arpu: 21.0 },
    { month: 'Apr', revenue: 115000, subscriptions: 5387, arpu: 21.4 },
    { month: 'May', revenue: 120000, subscriptions: 5521, arpu: 21.7 },
    { month: 'Jun', revenue: 127854, subscriptions: 5634, arpu: 22.7 }
  ], []);

  const systemMetricsData = useMemo(() => [
    { category: 'CPU', usage: 68.5, warning: 70, critical: 85 },
    { category: 'Memory', usage: 45.2, warning: 80, critical: 90 },
    { category: 'Storage', usage: 72.1, warning: 75, critical: 90 },
    { category: 'Network', usage: 23.4, warning: 80, critical: 95 }
  ], []);

  // Component functions
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  const handleTimeRangeChange = useCallback((range: string) => {
    setTimeRange(range);
    // In production, this would trigger data refetch
  }, []);

  const toggleCardExpansion = useCallback((cardId: string) => {
    setExpandedCards(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  }, []); 
  
  // Use mobile-optimized version for tiny screens
  if (isXS || (isMobile && isTouchDevice)) {
    return (
      <Suspense fallback={<Box sx={{ p: 3 }}><CircularProgress /></Box>}>
        <MobileOptimizedDashboard />
      </Suspense>
    );
  }

  // If a sub-component is active, render it
  if (activeSubComponent) {
    const renderSubComponent = () => {
      switch (activeSubComponent) {
        case 'revenue':
          return <RevenueAnalyticsPanel />;
        case 'users':
          return <UserAnalyticsPanel />;
        case 'ai':
          return <AIMonitoringPanel />;
        case 'security':
          return <SecurityMonitoringPanel />;
        case 'system':
          return <SystemHealthPanel />;
        default:
          return null;
      }
    };

    return (
      <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh' }}>
        <AppBar position="sticky" sx={{ bgcolor: 'rgba(29, 31, 43, 0.8)', backdropFilter: 'blur(10px)' }}>
          <Toolbar>
            <Button
              startIcon={<Dashboard />}
              onClick={() => setActiveSubComponent(null)}
              sx={{ color: '#00ffff', mr: 2 }}
            >
              Main Dashboard
            </Button>
            <Typography variant="h6" sx={{ color: '#e0e0e0', flexGrow: 1 }}>
              {quickActions.find(a => a.id.includes(activeSubComponent))?.title || activeSubComponent}
            </Typography>
            <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Toolbar>
        </AppBar>
        {renderSubComponent()}
      </Box>
    );
  }

  const renderMetricCard = (metric: DashboardMetric) => (
    <Grid item xs={12} sm={6} lg={4} xl={3} key={metric.id}>
      <MetricCard accentColor={metric.color}>
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {metric.title}
              </Typography>
              <Typography 
                variant={isMobile ? "h5" : "h4"} 
                fontWeight={700} 
                color={metric.color}
                sx={{ fontSize: isMobile ? '1.5rem' : '2.125rem' }}
              >
                {metric.format === 'currency' && '$'}
                {metric.format === 'number' ? metric.value.toLocaleString() : 
                 metric.format === 'percentage' ? `${metric.value}%` : 
                 metric.value}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {metric.changeType === 'increase' ? (
                  <TrendingUp sx={{ color: '#4caf50', fontSize: 16, mr: 0.5 }} />
                ) : metric.changeType === 'decrease' ? (
                  <TrendingDown sx={{ color: '#f44336', fontSize: 16, mr: 0.5 }} />
                ) : (
                  <CompareArrows sx={{ color: '#757575', fontSize: 16, mr: 0.5 }} />
                )}
                <Typography 
                  variant="caption" 
                  color={metric.changeType === 'increase' ? '#4caf50' : 
                         metric.changeType === 'decrease' ? '#f44336' : '#757575'}
                >
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ 
                p: isMobile ? 0.5 : 1, 
                borderRadius: 2, 
                bgcolor: `${metric.color}20`,
                color: metric.color 
              }}>
                {metric.icon}
              </Box>
              {metric.target && (
                <Chip 
                  label={`Target: ${metric.target}${metric.format === 'percentage' ? '%' : ''}`}
                  size="small"
                  sx={{ mt: 1, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>
          
          <Divider sx={{ mb: 2, opacity: 0.3 }} />
          
          <Typography variant="caption" color="text.secondary" gutterBottom>
            {metric.description}
          </Typography>
          {metric.target && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption">Progress to Target</Typography>
                <Typography variant="caption">
                  {((Number(metric.value) / metric.target) * 100).toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(Number(metric.value) / metric.target) * 100}
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    bgcolor: metric.color
                  }
                }}
              />
            </Box>
          )}
          <ChartContainer sx={{ height: isMobile ? 60 : 80, mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metric.trend.map((value, index) => ({ value, index }))}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={metric.color} 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </MetricCard>
    </Grid>
  );

  const renderSystemHealthPanel = () => (
    <Grid item xs={12} lg={8}>
      <GlassPanel>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Computer />
            System Health Monitoring
          </Typography>
          
          <Grid container spacing={2}>
            {systemHealth.map((service, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Box sx={{ 
                  p: isMobile ? 1.5 : 2, 
                  borderRadius: 2, 
                  bgcolor: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${
                    service.status === 'healthy' ? 'rgba(76, 175, 80, 0.3)' :
                    service.status === 'warning' ? 'rgba(255, 152, 0, 0.3)' :
                    'rgba(244, 67, 54, 0.3)'
                  }`
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
                      {service.service}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StatusIndicator status={service.status} />
                      <Chip 
                        label={service.status} 
                        size="small"
                        color={
                          service.status === 'healthy' ? 'success' :
                          service.status === 'warning' ? 'warning' : 'error'
                        }
                      />
                    </Box>
                  </Box>
                  
                  <Grid container spacing={1}>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">Uptime</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                        {service.uptime}%
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">Response</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                        {service.responseTime}ms
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">Error Rate</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                        {service.errorRate}%
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">RPS</Typography>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '0.8rem' : '0.875rem' }}>
                        {service.throughput}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                    {service.details}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          
          <Button
            onClick={() => setActiveSubComponent('system')}
            startIcon={<Launch />}
            sx={{ mt: 2 }}
            size={isMobile ? 'small' : 'medium'}
          >
            View Detailed System Health
          </Button>
        </CardContent>
      </GlassPanel>
    </Grid>
  );

  const renderQuickActionsPanel = () => (
    <Grid item xs={12} lg={4}>
      <GlassPanel>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Widgets />
            Quick Actions
          </Typography>
          
          <Grid container spacing={2}>
            {quickActions.map((action) => (
              <Grid item xs={12} sm={6} key={action.id}>
                <EnhancedCard 
                  sx={{ 
                    cursor: 'pointer',
                    height: '100%',
                    minHeight: isMobile ? 80 : 100,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0, 255, 255, 0.2)'
                    }
                  }}
                  onClick={action.action}
                >
                  <CardContent sx={{ textAlign: 'center', py: isMobile ? 1.5 : 2 }}>
                    <Box sx={{ 
                      p: isMobile ? 1 : 1.5, 
                      borderRadius: 3, 
                      bgcolor: 'rgba(0, 255, 255, 0.1)',
                      color: '#00ffff',
                      display: 'inline-flex',
                      mb: 1
                    }}>
                      {action.icon}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ fontSize: isMobile ? '0.85rem' : '0.875rem' }}>
                      {action.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                      {action.description}
                    </Typography>
                  </CardContent>
                </EnhancedCard>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </GlassPanel>
    </Grid>
  );

  const renderRevenueChart = () => (
    <Grid item xs={12} lg={8}>
      <GlassPanel>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timeline />
              Revenue & Growth Trends
            </Typography>
            <Button
              onClick={() => setActiveSubComponent('revenue')}
              startIcon={<Launch />}
              size={isMobile ? 'small' : 'medium'}
            >
              Detailed View
            </Button>
          </Box>
          
          <ChartContainer sx={{ height: isMobile ? 250 : 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="month" stroke="#e0e0e0" />
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
                  dataKey="revenue" 
                  stroke="#4caf50" 
                  strokeWidth={3}
                  name="Revenue ($)"
                  dot={{ fill: '#4caf50', strokeWidth: 2, r: 6 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="subscriptions" 
                  stroke="#2196f3" 
                  strokeWidth={3}
                  name="Subscriptions"
                  dot={{ fill: '#2196f3', strokeWidth: 2, r: 6 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="arpu" 
                  stroke="#ff9800" 
                  strokeWidth={3}
                  name="ARPU ($)"
                  dot={{ fill: '#ff9800', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </GlassPanel>
    </Grid>
  );

  const renderSystemMetricsChart = () => (
    <Grid item xs={12} lg={4}>
      <GlassPanel>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShowChart />
              System Metrics
            </Typography>
            <Button
              onClick={() => setActiveSubComponent('system')}
              startIcon={<Launch />}
              size={isMobile ? 'small' : 'medium'}
            >
              Details
            </Button>
          </Box>
          
          <Box sx={{ height: isMobile ? 200 : 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={systemMetricsData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis type="number" domain={[0, 100]} stroke="#e0e0e0" />
                <YAxis dataKey="category" type="category" stroke="#e0e0e0" />
                <ReTooltip 
                  contentStyle={{ 
                    backgroundColor: '#1d1f2b', 
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: 8
                  }} 
                />
                <Bar dataKey="usage" radius={[0, 4, 4, 0]}>
                  {systemMetricsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.usage > entry.critical ? '#f44336' : 
                            entry.usage > entry.warning ? '#ff9800' : '#4caf50'} 
                    />
                  ))}
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </GlassPanel>
    </Grid>
  );

  return (
    <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', color: '#e0e0e0' }}>
      <Box sx={{ p: isMobile ? 2 : 3 }}>
        {/* Enhanced Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'stretch' : 'flex-start', 
            gap: isMobile ? 2 : 0,
            mb: 2 
          }}>
            <Box>
              <Typography variant={isMobile ? "h4" : "h3"} sx={{ color: '#00ffff', mb: 1, fontWeight: 700 }}>
                Admin Command Center
              </Typography>
              <Typography variant={isMobile ? "body1" : "h6"} color="text.secondary">
                Comprehensive platform analytics and system monitoring
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: isMobile ? 1 : 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: '#a0a0a0' }}>Time Range</InputLabel>
                <Select
                  value={timeRange}
                  onChange={(e) => handleTimeRangeChange(e.target.value)}
                  sx={{
                    color: '#e0e0e0',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(0, 255, 255, 0.3)'
                    }
                  }}
                >
                  <MenuItem value="1h">Last Hour</MenuItem>
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
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#00ffff',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#00ffff',
                      },
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <FlashOn sx={{ fontSize: 16, color: isRealTime ? '#00ffff' : '#666' }} />
                    <Typography variant="caption" sx={{ color: isRealTime ? '#00ffff' : '#666' }}>
                      Real-time
                    </Typography>
                  </Box>
                }
              />
              
              <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
              
              <IconButton>
                <Refresh />
              </IconButton>
            </Box>
          </Box>
          
          <Breadcrumbs 
            aria-label="breadcrumb"
            sx={{ 
              '& .MuiBreadcrumbs-separator': { color: '#666' },
              '& .MuiBreadcrumbs-li': { color: '#999' }
            }}
          >
            <Link color="inherit" href="/dashboard" underline="hover">
              <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
              Dashboard
            </Link>
            <Typography color="text.primary">Admin Overview</Typography>
          </Breadcrumbs>
        </Box>

        {/* Alerts */}
        {showAlerts && (
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Alert 
                  severity="warning" 
                  onClose={() => setShowAlerts(false)}
                  sx={{ 
                    bgcolor: 'rgba(255, 152, 0, 0.1)',
                    border: '1px solid rgba(255, 152, 0, 0.3)'
                  }}
                >
                  <Typography variant="body2">
                    YOLO AI service is experiencing higher than normal latency (156ms vs 80ms target)
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Key Metrics */}
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
          {dashboardMetrics.map(renderMetricCard)}
        </Grid>

        {/* Main Content Grid */}
        <Grid container spacing={isMobile ? 2 : 3} sx={{ mb: 4 }}>
          {renderSystemHealthPanel()}
          {renderQuickActionsPanel()}
          {renderRevenueChart()}
          {renderSystemMetricsChart()}
        </Grid>

        {/* Additional Analytics Overview */}
        <Grid container spacing={isMobile ? 2 : 3}>
          <Grid item xs={12} lg={4}>
            <EnhancedCard>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
                  AI & ML Performance
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Model Accuracy</Typography>
                    <Typography variant={isMobile ? "h6" : "h5"} color="#9c27b0">94.7%</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Avg Latency</Typography>
                    <Typography variant={isMobile ? "h6" : "h5"} color="#ff9800">67ms</Typography>
                  </Box>
                </Box>
                <Button
                  onClick={() => setActiveSubComponent('ai')}
                  startIcon={<Psychology />}
                  fullWidth
                  size={isMobile ? 'small' : 'medium'}
                >
                  View AI Dashboard
                </Button>
              </CardContent>
            </EnhancedCard>
          </Grid>
          
          <Grid item xs={12} lg={4}>
            <EnhancedCard>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
                  Security Status
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Security Score</Typography>
                    <Typography variant={isMobile ? "h6" : "h5"} color="#4caf50">94.2/100</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Active Alerts</Typography>
                    <Typography variant={isMobile ? "h6" : "h5"} color="#f44336">3</Typography>
                  </Box>
                </Box>
                <Button
                  onClick={() => setActiveSubComponent('security')}
                  startIcon={<Security />}
                  fullWidth
                  size={isMobile ? 'small' : 'medium'}
                >
                  View Security Dashboard
                </Button>
              </CardContent>
            </EnhancedCard>
          </Grid>
          
          <Grid item xs={12} lg={4}>
            <EnhancedCard>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
                  User Engagement
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Avg Session</Typography>
                    <Typography variant={isMobile ? "h6" : "h5"} color="#2196f3">47.5 min</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">Retention</Typography>
                    <Typography variant={isMobile ? "h6" : "h5"} color="#4caf50">89.2%</Typography>
                  </Box>
                </Box>
                <Button
                  onClick={() => setActiveSubComponent('users')}
                  startIcon={<PeopleAlt />}
                  fullWidth
                  size={isMobile ? 'small' : 'medium'}
                >
                  View User Analytics
                </Button>
              </CardContent>
            </EnhancedCard>
          </Grid>
        </Grid>
      </Box>

      {/* Floating Action Button */}
      <SpeedDial
        ariaLabel="Quick Actions"
        sx={{ 
          position: 'fixed', 
          bottom: isMobile ? 16 : 24, 
          right: isMobile ? 16 : 24,
          '& .MuiFab-primary': {
            background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
            '&:hover': {
              background: 'linear-gradient(135deg, #00e6ff, #00b3ff)',
            },
          }
        }}
        icon={<SpeedDialIcon />}
        size={isMobile ? 'medium' : 'large'}
      >
        <SpeedDialAction
          icon={<Download />}
          tooltipTitle="Export Data"
          onClick={() => {/* TODO: Export functionality */}}
        />
        <SpeedDialAction
          icon={<Share />}
          tooltipTitle="Share Report"
          onClick={() => {/* TODO: Share functionality */}}
        />
        <SpeedDialAction
          icon={<Report />}
          tooltipTitle="Generate Report"
          onClick={() => {/* TODO: Report generation */}}
        />
        <SpeedDialAction
          icon={<Settings />}
          tooltipTitle="Settings"
          onClick={() => {/* TODO: Settings modal */}}
        />
      </SpeedDial>
    </Box>
  );
};

export default MainDashboard;