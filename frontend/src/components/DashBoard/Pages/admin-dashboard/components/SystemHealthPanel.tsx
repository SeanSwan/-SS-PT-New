/**
 * System Health Monitoring Component
 * Real-time monitoring of system performance, infrastructure health, and resource utilization
 * PHASE 2B: Converted from mock data to real API integration
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
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
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';

import {
  Computer,
  Memory,
  Storage,
  NetworkWifi,
  Speed,
  CloudDone,
  CloudOff,
  CheckCircle,
  Warning,
  Error,
  Refresh,
  TrendingUp,
  TrendingDown,
  Bolt,
  Timeline as TimelineIcon,
  Assessment,
  Analytics,
  Monitor,
  Insights,
  SystemUpdateAlt,
  BackupTable,
  DataUsage,
  CompareArrows,
  Visibility,
  VisibilityOff,
  Download,
  Share,
  Settings,
  Info,
  ExpandMore,
  Launch,
  RestartAlt,
  PowerSettingsNew,
  MonitorHeart,
  Engineering,
  Tune,
  DeviceHub,
  Router,
  Dns,
  WifiTethering,
  Database,
  Api,
  CloudUpload,
  CloudDownload,
  Timer,
  Schedule,
  PlayArrow,
  Pause,
  Stop,
  Notifications,
  NotificationsActive,
  NotificationsOff,
  Firewall,
  VpnLock,
  Security,
  HealthAndSafety,
  Report,
  Build,
  Category,
  AutoAwesome,
  Psychology,
  SmartToy,
  SettingsInputComposite,
  CenterFocusWeak,
  RadioButtonChecked,
  SignalWifi4Bar,
  SignalWifiOff,
  BatteryChargingFull,
  BatteryAlert,
  Thermostat,
  AcUnit,
  LocalFireDepartment
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
  RadialBarChart,
  RadialBar,
  Treemap,
  ScatterChart,
  Scatter,
  ReferenceLine
} from 'recharts';

import { styled } from '@mui/material/styles';

// Types
interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical' | 'error';
  threshold: {
    warning: number;
    critical: number;
  };
  trend: number;
  description: string;
  lastUpdated: string;
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  uptime: number;
  cpu: number;
  memory: number;
  network: {
    in: number;
    out: number;
  };
  health: {
    score: number;
    checks: {
      name: string;
      status: boolean;
      lastCheck: string;
      }[];
  };
  version: string;
  port?: number;
  endpoint?: string;
}

interface InfrastructureNode {
  id: string;
  name: string;
  type: 'server' | 'database' | 'cache' | 'load_balancer' | 'cdn' | 'storage';
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  location: string;
  specs: {
    cpu: string;
    memory: string;
    storage: string;
  };
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    temperature?: number;
  };
  services: string[];
  lastPing: string;
  uptime: number;
}

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  actions: string[];
}

interface PerformanceMetric {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
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

const SystemCard = styled(GlassCard)<{ status?: string }>(({ status = 'healthy' }) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${
      status === 'critical' ? '#f44336' :
      status === 'warning' ? '#ff9800' :
      status === 'error' ? '#f44336' :
      status === 'healthy' ? '#4caf50' : '#2196f3'
    }, transparent)`,
  },
}));

const MetricGauge = styled(Box)<{ value: number; max: number; color: string }>(({ value, max, color }) => ({
  position: 'relative',
  width: 80,
  height: 80,
  '& .gauge-background': {
    strokeDasharray: `${2 * Math.PI * 30} ${2 * Math.PI * 30}`,
    strokeDashoffset: 0,
    transition: 'stroke-dashoffset 0.5s ease',
  },
  '& .gauge-fill': {
    strokeDasharray: `${2 * Math.PI * 30} ${2 * Math.PI * 30}`,
    strokeDashoffset: `${2 * Math.PI * 30 * (1 - value / max)}`,
    transition: 'stroke-dashoffset 0.5s ease',
    stroke: color,
  },
}));

const StatusIndicator = styled(Box)<{ status: string }>(({ status }) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: 
    status === 'running' || status === 'online' || status === 'healthy' ? '#4caf50' :
    status === 'warning' || status === 'degraded' ? '#ff9800' :
    status === 'error' || status === 'critical' || status === 'offline' ? '#f44336' :
    status === 'starting' || status === 'stopping' || status === 'maintenance' ? '#2196f3' : '#757575',
  boxShadow: `0 0 8px ${
    status === 'running' || status === 'online' || status === 'healthy' ? '#4caf50' :
    status === 'warning' || status === 'degraded' ? '#ff9800' :
    status === 'error' || status === 'critical' || status === 'offline' ? '#f44336' :
    status === 'starting' || status === 'stopping' || status === 'maintenance' ? '#2196f3' : '#757575'
  }`,
  animation: (status === 'running' || status === 'online' || status === 'healthy') ? 'pulse 2s infinite' : 'none',
  '@keyframes pulse': {
    '0%': {
      boxShadow: `0 0 0 0 ${
        (status === 'running' || status === 'online' || status === 'healthy') ? 'rgba(76, 175, 80, 0.7)' : 'rgba(33, 150, 243, 0.7)'
      }`,
    },
    '70%': {
      boxShadow: `0 0 0 10px rgba(76, 175, 80, 0)`,
    },
    '100%': {
      boxShadow: `0 0 0 0 rgba(76, 175, 80, 0)`,
    },
  },
}));

const SystemHealthPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [isRealTime, setIsRealTime] = useState(true);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [showOfflineOnly, setShowOfflineOnly] = useState(false);

  // Real API state management (following UserAnalyticsPanel pattern)
  const [systemHealthData, setSystemHealthData] = useState<any>(null);
  const [loading, setLoading] = useState({
    overview: false,
    services: false,
    infrastructure: false,
    alerts: false
  });
  const [errors, setErrors] = useState({
    overview: null as string | null,
    services: null as string | null,
    infrastructure: null as string | null,
    alerts: null as string | null
  });

  // API call functions
  const fetchSystemHealthData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, overview: true }));
      setErrors(prev => ({ ...prev, overview: null }));
      
      const response = await authAxios.get('/api/admin/analytics/system-health', {
        params: { timeRange }
      });
      
      if (response.data.success) {
        setSystemHealthData(response.data.data);
        console.log('✅ Real system health data loaded successfully');
      } else {
        throw new Error(response.data.message || 'Failed to load system health data');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load system health data';
      setErrors(prev => ({ ...prev, overview: errorMessage }));
      console.error('❌ Failed to load real system health data:', errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, overview: false }));
    }
  }, [authAxios, timeRange]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    console.log('🔄 Refreshing all system health data...');
    await fetchSystemHealthData();
    console.log('✅ All system health data refreshed');
  }, [fetchSystemHealthData]);

  // Initial data load
  useEffect(() => {
    fetchSystemHealthData();
  }, [fetchSystemHealthData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!isRealTime) return;

    const interval = setInterval(() => {
      refreshAllData();
    }, 30000); // Refresh every 30 seconds for system health

    return () => clearInterval(interval);
  }, [isRealTime, refreshAllData]);

  // Update data when timeRange changes
  useEffect(() => {
    fetchSystemHealthData();
  }, [timeRange, fetchSystemHealthData]);

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
  const systemMetrics: SystemMetric[] = useMemo(() => {
    if (!systemHealthData?.serverPerformance) {
      return [];
    }

    const { serverPerformance, apiPerformance } = systemHealthData;

    return [
      {
        id: 'cpu-usage',
        name: 'CPU Usage',
        value: serverPerformance.cpu?.usage || 0,
        unit: '%',
        status: serverPerformance.cpu?.status || 'healthy',
        threshold: { warning: 70, critical: 85 },
        trend: serverPerformance.cpu?.trend || 0,
        description: 'Overall system CPU utilization',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'memory-usage',
        name: 'Memory Usage',
        value: serverPerformance.memory?.usage || 0,
        unit: '%',
        status: serverPerformance.memory?.status || 'healthy',
        threshold: { warning: 80, critical: 90 },
        trend: serverPerformance.memory?.trend || 0,
        description: 'System memory utilization',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'disk-usage',
        name: 'Disk Usage',
        value: serverPerformance.disk?.usage || 0,
        unit: '%',
        status: serverPerformance.disk?.status || 'healthy',
        threshold: { warning: 75, critical: 90 },
        trend: serverPerformance.disk?.trend || 0,
        description: 'Storage utilization across all volumes',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'network-throughput',
        name: 'Network Throughput',
        value: serverPerformance.network?.throughput || 0,
        unit: 'Mbps',
        status: serverPerformance.network?.status || 'healthy',
        threshold: { warning: 800, critical: 950 },
        trend: serverPerformance.network?.trend || 0,
        description: 'Current network throughput',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'response-time',
        name: 'Response Time',
        value: apiPerformance?.averageResponseTime || 0,
        unit: 'ms',
        status: apiPerformance?.status || 'healthy',
        threshold: { warning: 100, critical: 200 },
        trend: apiPerformance?.trend || 0,
        description: 'Average API response time',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'error-rate',
        name: 'Error Rate',
        value: apiPerformance?.errorRate || 0,
        unit: '%',
        status: apiPerformance?.errorRateStatus || 'healthy',
        threshold: { warning: 1, critical: 5 },
        trend: apiPerformance?.errorRateTrend || 0,
        description: 'System error rate',
        lastUpdated: new Date().toISOString()
      }
    ];
  }, [systemHealthData]);

  const services: ServiceStatus[] = useMemo(() => {
    if (!systemHealthData?.services) {
      return [];
    }

    return systemHealthData.services.map((service: any) => ({
      name: service.name,
      status: service.status,
      uptime: service.uptime || 0,
      cpu: service.metrics?.cpu || 0,
      memory: service.metrics?.memory || 0,
      network: {
        in: service.metrics?.network?.in || 0,
        out: service.metrics?.network?.out || 0
      },
      health: {
        score: service.health?.score || 0,
        checks: service.health?.checks || []
      },
      version: service.version || 'Unknown',
      port: service.port,
      endpoint: service.endpoint
    }));
  }, [systemHealthData]);

  const infrastructureNodes: InfrastructureNode[] = useMemo(() => {
    if (!systemHealthData?.infrastructure) {
      return [];
    }

    return systemHealthData.infrastructure.map((node: any) => ({
      id: node.id,
      name: node.name,
      type: node.type,
      status: node.status,
      location: node.location || 'Unknown',
      specs: {
        cpu: node.specs?.cpu || 'Unknown',
        memory: node.specs?.memory || 'Unknown',
        storage: node.specs?.storage || 'Unknown'
      },
      metrics: {
        cpu: node.metrics?.cpu || 0,
        memory: node.metrics?.memory || 0,
        disk: node.metrics?.disk || 0,
        network: node.metrics?.network || 0,
        temperature: node.metrics?.temperature
      },
      services: node.services || [],
      lastPing: node.lastPing || new Date().toISOString(),
      uptime: node.uptime || 0
    }));
  }, [systemHealthData]);

  const alerts: Alert[] = useMemo(() => {
    if (!systemHealthData?.alerts) {
      return [];
    }

    return systemHealthData.alerts.map((alert: any) => ({
      id: alert.id,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      source: alert.source,
      timestamp: alert.timestamp,
      status: alert.status,
      actions: alert.actions || []
    }));
  }, [systemHealthData]);

  const performanceData: PerformanceMetric[] = useMemo(() => {
    if (!systemHealthData?.performanceHistory) {
      return [];
    }

    return systemHealthData.performanceHistory.map((metric: any) => ({
      timestamp: metric.timestamp,
      cpu: metric.cpu || 0,
      memory: metric.memory || 0,
      disk: metric.disk || 0,
      network: metric.network || 0,
      responseTime: metric.responseTime || 0,
      throughput: metric.throughput || 0,
      errorRate: metric.errorRate || 0
    }));
  }, [systemHealthData]);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': case 'running': case 'online': case 'active': return '#4caf50';
      case 'warning': case 'degraded': case 'acknowledged': return '#ff9800';
      case 'critical': case 'error': case 'offline': return '#f44336';
      case 'maintenance': case 'starting': case 'stopping': return '#2196f3';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': case 'running': case 'online': return <CheckCircle />;
      case 'warning': case 'degraded': return <Warning />;
      case 'critical': case 'error': case 'offline': return <Error />;
      case 'maintenance': case 'starting': case 'stopping': return <Engineering />;
      default: return <Info />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#757575';
    }
  };

  const toggleNodeExpansion = useCallback((nodeId: string) => {
    setExpandedNodes(prev => 
      prev.includes(nodeId) 
        ? prev.filter(id => id !== nodeId)
        : [...prev, nodeId]
    );
  }, []);

  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
  };

  const renderMetricGauge = (metric: SystemMetric) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <MetricGauge value={metric.value} max={100} color={getStatusColor(metric.status)}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="8"
            className="gauge-background"
          />
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className="gauge-fill"
            transform="rotate(-90 40 40)"
          />
          <text
            x="40"
            y="45"
            textAnchor="middle"
            fontSize="12"
            fill="#e0e0e0"
            fontWeight="bold"
          >
            {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}
          </text>
          <text
            x="40"
            y="58"
            textAnchor="middle"
            fontSize="8"
            fill="#a0a0a0"
          >
            {metric.unit}
          </text>
        </svg>
      </MetricGauge>
      <Typography variant="caption" align="center" sx={{ mt: 1 }}>
        {metric.name}
      </Typography>
    </Box>
  );

  const renderOverviewTab = () => {
    // Show loading state if overview data is loading
    if (isLoadingData('overview')) {
      return <LoadingSpinner message="Loading system health overview..." />;
    }

    return (
    <Grid container spacing={3}>
      {/* Error State */}
      {hasError('overview') && (
        <Grid item xs={12}>
          <ErrorMessage 
            error={errors.overview!} 
            onRetry={fetchSystemHealthData} 
            dataType="system health data" 
          />
        </Grid>
      )}
      
      {/* System Metrics Overview */}
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', mb: 3 }}>
          System Metrics Overview
        </Typography>
        <Grid container spacing={2}>
          {systemMetrics.map((metric) => (
            <Grid item xs={6} sm={4} md={2} key={metric.id}>
              <SystemCard status={metric.status}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  {renderMetricGauge(metric)}
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      {metric.trend >= 0 ? (
                        <TrendingUp sx={{ color: metric.id === 'error-rate' ? '#f44336' : '#4caf50', fontSize: 16 }} />
                      ) : (
                        <TrendingDown sx={{ color: metric.id === 'error-rate' ? '#4caf50' : '#f44336', fontSize: 16 }} />
                      )}
                      <Typography variant="caption" color={
                        metric.trend >= 0 ? (metric.id === 'error-rate' ? '#f44336' : '#4caf50') : 
                        (metric.id === 'error-rate' ? '#4caf50' : '#f44336')
                      }>
                        {metric.trend > 0 ? '+' : ''}{metric.trend.toFixed(1)}%
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Warning: {metric.threshold.warning}{metric.unit}
                    </Typography>
                  </Box>
                </CardContent>
              </SystemCard>
            </Grid>
          ))}
        </Grid>
      </Grid>
      
      {/* Performance Trends Chart */}
      <Grid item xs={12} lg={8}>
        <GlassCard>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimelineIcon />
                Performance Trends
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
                <ComposedChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="timestamp" stroke="#e0e0e0" />
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
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="cpu"
                    fill="url(#cpuGradient)"
                    stroke="#ff9800"
                    strokeWidth={2}
                    name="CPU (%)"
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="memory"
                    fill="url(#memoryGradient)"
                    stroke="#2196f3"
                    strokeWidth={2}
                    name="Memory (%)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="responseTime"
                    stroke="#4caf50"
                    strokeWidth={3}
                    name="Response Time (ms)"
                  />
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff9800" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ff9800" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2196f3" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2196f3" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
      
      {/* System Alerts */}
      <Grid item xs={12} lg={4}>
        <GlassCard>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsActive />
                System Alerts
              </Typography>
              <IconButton>
                <Download />
              </IconButton>
            </Box>
            
            <List>
              {alerts.filter(alert => alert.status === 'active').map((alert) => (
                <ListItem 
                  key={alert.id} 
                  sx={{ px: 0, py: 1, cursor: 'pointer' }}
                  onClick={() => handleAlertClick(alert)}
                >
                  <Paper sx={{ 
                    width: '100%',
                    p: 2, 
                    bgcolor: 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${getSeverityColor(alert.severity)}`
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {alert.title}
                      </Typography>
                      <Chip 
                        label={alert.severity}
                        size="small"
                        color={
                          alert.severity === 'critical' ? 'error' :
                          alert.severity === 'high' ? 'warning' : 'success'
                        }
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {alert.message}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {alert.source}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  </Paper>
                </ListItem>
              ))}
            </List>
            
            {alerts.filter(alert => alert.status === 'active').length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
                <Typography variant="h6" color="#4caf50" gutterBottom>
                  All Systems Operational
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No active alerts at this time
                </Typography>
              </Box>
            )}
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
    );
  };

  const renderServicesTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            Service Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showOfflineOnly}
                  onChange={(e) => setShowOfflineOnly(e.target.checked)}
                />
              }
              label="Issues Only"
            />
            <Button variant="outlined" startIcon={<Refresh />} onClick={refreshAllData}>
              Refresh All
            </Button>
          </Box>
        </Box>
      </Grid>
      
      {services
        .filter(service => !showOfflineOnly || service.status !== 'running')
        .map((service) => (
        <Grid item xs={12} lg={6} key={service.name}>
          <SystemCard status={service.status}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {service.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {service.version} 
                      {service.port && ` • Port ${service.port}`}
                      {service.endpoint && ` • ${service.endpoint}`}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StatusIndicator status={service.status} />
                  <Chip 
                    label={service.status}
                    size="small"
                    color={
                      service.status === 'running' ? 'success' :
                      service.status === 'error' ? 'error' : 'warning'
                    }
                  />
                </Box>
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">CPU</Typography>
                  <Typography variant="h6" color="#ff9800">{service.cpu}%</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={service.cpu}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: service.cpu > 80 ? '#f44336' : service.cpu > 60 ? '#ff9800' : '#4caf50',
                        borderRadius: 2
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Memory</Typography>
                  <Typography variant="h6" color="#2196f3">{service.memory} GB</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(service.memory / 10) * 100}
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
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Health Score</Typography>
                  <Typography variant="h6" color={service.health.score > 95 ? '#4caf50' : service.health.score > 80 ? '#ff9800' : '#f44336'}>
                    {service.health.score}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={service.health.score}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: service.health.score > 95 ? '#4caf50' : service.health.score > 80 ? '#ff9800' : '#f44336',
                        borderRadius: 2
                      }
                    }}
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Health Checks
                </Typography>
                <List dense>
                  {service.health.checks.map((check, index) => (
                    <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        {check.status ? (
                          <CheckCircle sx={{ color: '#4caf50', fontSize: 16 }} />
                        ) : (
                          <Error sx={{ color: '#f44336', fontSize: 16 }} />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={check.name}
                        secondary={new Date(check.lastCheck).toLocaleString()}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" startIcon={<RestartAlt />}>
                  Restart
                </Button>
                <Button size="small" startIcon={<Visibility />}>
                  Logs
                </Button>
                <Button size="small" startIcon={<Tune />}>
                  Configure
                </Button>
              </Box>
            </CardContent>
          </SystemCard>
        </Grid>
      ))}
    </Grid>
  );

  const renderInfrastructureTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            Infrastructure Health
          </Typography>
          <Button variant="outlined" startIcon={<Refresh />} onClick={refreshAllData}>
            Ping All Nodes
          </Button>
        </Box>
      </Grid>
      
      {infrastructureNodes.map((node) => (
        <Grid item xs={12} lg={6} key={node.id}>
          <SystemCard status={node.status}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ 
                    bgcolor: `${getStatusColor(node.status)}20`,
                    color: getStatusColor(node.status)
                  }}>
                    {node.type === 'server' ? <Computer /> :
                     node.type === 'database' ? <Storage /> :
                     node.type === 'cache' ? <Memory /> :
                     node.type === 'load_balancer' ? <Router /> :
                     node.type === 'cdn' ? <CloudDone /> : <DeviceHub />}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {node.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {node.location} • {node.specs.cpu}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StatusIndicator status={node.status} />
                  <Chip 
                    label={node.status}
                    size="small"
                    color={
                      node.status === 'online' ? 'success' :
                      node.status === 'offline' ? 'error' : 'warning'
                    }
                  />
                </Box>
              </Box>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">CPU</Typography>
                  <Typography variant="h6" color="#ff9800">{node.metrics.cpu}%</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">Memory</Typography>
                  <Typography variant="h6" color="#2196f3">{node.metrics.memory}%</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">Disk</Typography>
                  <Typography variant="h6" color="#9c27b0">{node.metrics.disk}%</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">Network</Typography>
                  <Typography variant="h6" color="#4caf50">{node.metrics.network} MB/s</Typography>
                </Grid>
              </Grid>
              
              {node.metrics.temperature && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Temperature</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" color={node.metrics.temperature > 60 ? '#f44336' : '#4caf50'}>
                      {node.metrics.temperature}°C
                    </Typography>
                    {node.metrics.temperature > 60 ? (
                      <LocalFireDepartment sx={{ color: '#f44336' }} />
                    ) : (
                      <AcUnit sx={{ color: '#4caf50' }} />
                    )}
                  </Box>
                </Box>
              )}
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Running Services
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {node.services.map((service, index) => (
                    <Chip key={index} label={service} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Uptime: {node.uptime}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last ping: {new Date(node.lastPing).toLocaleString()}
                </Typography>
              </Box>
            </CardContent>
          </SystemCard>
        </Grid>
      ))}
    </Grid>
  );

  const renderAlertsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            System Alerts & Events
          </Typography>
          <Button variant="outlined" startIcon={<Download />}>
            Export Alerts
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
                    <TableCell>Alert</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id} hover onClick={() => handleAlertClick(alert)}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {alert.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {alert.message}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={alert.severity}
                          color={
                            alert.severity === 'critical' ? 'error' :
                            alert.severity === 'high' ? 'warning' : 'success'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {alert.source}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StatusIndicator status={alert.status} />
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {alert.status}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton size="small">
                            <Info />
                          </IconButton>
                          {alert.status === 'active' && (
                            <IconButton size="small">
                              <CheckCircle />
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

  // Loading and error states
  if (isLoadingData('overview') && !systemHealthData) {
    return (
      <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#00ffff', mb: 2 }} size={60} />
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            Loading System Health Data...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (hasError('overview') && !systemHealthData) {
    return (
      <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', p: 3 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 3, backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#f44336', border: '1px solid #f44336' }}
          action={
            <Button color="inherit" size="small" onClick={fetchSystemHealthData} disabled={isLoadingData('overview')}>
              {isLoadingData('overview') ? <CircularProgress size={16} /> : 'Retry'}
            </Button>
          }
        >
          <Typography variant="h6">Failed to Load System Health Data</Typography>
          <Typography variant="body2">{errors.overview}</Typography>
        </Alert>
      </Box>
    );
  }

  const tabPanels = [
    renderOverviewTab(),
    renderServicesTab(),
    renderInfrastructureTab(),
    renderAlertsTab()
  ];

  return (
    <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#00ffff', fontWeight: 700, mb: 1 }}>
          System Health Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Real-time monitoring of system performance, infrastructure health, and resource utilization
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
            icon={<Monitor />} 
            iconPosition="start" 
            label="Overview" 
          />
          <Tab 
            icon={<Computer />} 
            iconPosition="start" 
            label="Services" 
          />
          <Tab 
            icon={<DeviceHub />} 
            iconPosition="start" 
            label="Infrastructure" 
          />
          <Tab 
            icon={<Notifications />} 
            iconPosition="start" 
            label="Alerts" 
          />
        </Tabs>
      </Box>

      <Box>
        {tabPanels[activeTab]}
      </Box>

      {/* Alert Details Dialog */}
      <Dialog open={alertDialogOpen} onClose={() => setAlertDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#00ffff' }}>
          Alert Details
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    {selectedAlert.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    {selectedAlert.message}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip 
                      label={selectedAlert.severity}
                      color={
                        selectedAlert.severity === 'critical' ? 'error' :
                        selectedAlert.severity === 'high' ? 'warning' : 'success'
                      }
                    />
                    <Chip 
                      label={selectedAlert.status}
                      color={
                        selectedAlert.status === 'resolved' ? 'success' :
                        selectedAlert.status === 'acknowledged' ? 'info' : 'warning'
                      }
                      variant="outlined"
                    />
                  </Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Source Information
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Source: {selectedAlert.source}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Time: {new Date(selectedAlert.timestamp).toLocaleString()}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Recommended Actions
              </Typography>
              <List dense>
                {selectedAlert.actions.map((action, index) => (
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
          {selectedAlert?.status === 'active' && (
            <Button variant="contained">Acknowledge</Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemHealthPanel;