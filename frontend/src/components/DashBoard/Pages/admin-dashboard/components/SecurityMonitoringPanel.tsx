/**
 * Security Monitoring Dashboard Component
 * Real-time security monitoring, threat detection, and incident management
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthenticatedAxios } from '../../../../../../hooks/useAxios';
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
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';

import {
  Security,
  Shield,
  Warning,
  Error,
  CheckCircle,
  Block,
  VpnKey,
  Lock,
  LockOpen,
  BugReport,
  Gavel,
  VisibilityOff,
  Visibility,
  Fingerprint,
  PersonOff,
  DeviceHub,
  LocationOn,
  AccessTime,
  Report,
  Assessment,
  Analytics,
  Timeline as TimelineIcon,
  TrendingUp,
  TrendingDown,
  Refresh,
  Download,
  Share,
  FilterList,
  Search,
  Info,
  ExpandMore,
  Launch,
  Speed,
  Storage,
  Memory,
  NetworkWifi,
  CloudOff,
  CloudDone,
  Notifications,
  NotificationsActive,
  Phone,
  Email,
  Sms,
  AdminPanelSettings,
  HealthAndSafety,
  Firewall,
  Policy,
  VerifiedUser,
  SecurityUpdate,
  Https,
  NoEncryption,
  PublicOff,
  Backup,
  SystemUpdate,
  MonitorHeart,
  SupervisedUserCircle,
  ManageAccounts,
  Login,
  LogoutIcon,
  PersonPin,
  HourglassEmpty,
  HistoryToggleOff,
  QueryStats,
  DataUsage,
  Engineering,
  BugReport as BugReportIcon,
  Dashboard,
  Computer as ComputerIcon,
  Smartphone,
  CompareArrows,
  Code,
  Settings
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
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';

import { styled } from '@mui/material/styles';

// Types
interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  status: 'good' | 'warning' | 'critical';
  description: string;
  lastUpdated: string;
}

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'contained' | 'resolved';
  type: 'unauthorized_access' | 'ddos' | 'malware' | 'data_breach' | 'policy_violation' | 'other';
  timestamp: string;
  affectedSystems: string[];
  sourceIP?: string;
  sourceLocation?: string;
  userAgent?: string;
  actions: string[];
  assignedTo?: string;
  resolutionTime?: number;
  impactScore: number;
}

interface LoginAttempt {
  id: string;
  username: string;
  ip: string;
  location: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
  failureReason?: string;
  riskScore: number;
  isSuspicious: boolean;
}

interface ThreatAnalysis {
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  activeThreat: string[];
  blockedIPs: number;
  suspiciousActivities: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  lastScan: string;
  recommendations: string[];
}

interface SecurityConfig {
  passwordPolicy: {
    minLength: number;
    requireSpecialChars: boolean;
    requireNumbers: boolean;
    requireUppercase: boolean;
    maxAge: number;
  };
  twoFactorAuth: {
    enabled: boolean;
    mandatory: boolean;
    methods: string[];
  };
  sessionPolicy: {
    maxDuration: number;
    idleTimeout: number;
    maxConcurrentSessions: number;
  };
  ipWhitelisting: {
    enabled: boolean;
    whitelistedIPs: string[];
  };
  encryption: {
    dataAtRest: boolean;
    dataInTransit: boolean;
    algorithm: string;
  };
}

interface SecurityEvent {
  timestamp: string;
  eventType: string;
  description: string;
  severity: string;
  sourceIP: string;
  affectedResource: string;
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

const SecurityCard = styled(GlassCard)<{ severity?: string }>(({ severity = 'good' }) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${
      severity === 'critical' ? '#f44336' :
      severity === 'warning' ? '#ff9800' :
      severity === 'good' ? '#4caf50' : '#2196f3'
    }, transparent)`,
  },
}));

const ThreatLevelIndicator = styled(Box)<{ level: string }>(({ level }) => ({
  width: 16,
  height: 16,
  borderRadius: '50%',
  backgroundColor: 
    level === 'critical' ? '#f44336' :
    level === 'high' ? '#ff5722' :
    level === 'medium' ? '#ff9800' : '#4caf50',
  boxShadow: `0 0 10px ${
    level === 'critical' ? '#f44336' :
    level === 'high' ? '#ff5722' :
    level === 'medium' ? '#ff9800' : '#4caf50'
  }`,
  animation: level === 'critical' ? 'pulse 1.5s infinite' : 'none',
  '@keyframes pulse': {
    '0%': { transform: 'scale(1)', opacity: 1 },
    '50%': { transform: 'scale(1.2)', opacity: 0.7 },
    '100%': { transform: 'scale(1)', opacity: 1 },
  },
}));

const SecurityMonitoringPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('24h');
  const [isRealTime, setIsRealTime] = useState(true);
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [securityScanRunning, setSecurityScanRunning] = useState(false);
  const [showSuspiciousOnly, setShowSuspiciousOnly] = useState(false);

  // Real API state management
  const [securityData, setSecurityData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const authAxios = useAuthenticatedAxios();

  // Real API data fetching function
  const fetchSecurityData = useCallback(async () => {
    if (!authAxios) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authAxios.get('/api/admin/security/metrics', {
        params: { timeRange }
      });
      
      if (response.data.success) {
        setSecurityData(response.data.data);
      } else {
        setError('Failed to fetch security data');
      }
    } catch (error: any) {
      console.error('Error fetching security data:', error);
      setError(error?.response?.data?.message || 'Failed to fetch security data');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, timeRange]);

  // Auto-refresh security data
  useEffect(() => {
    fetchSecurityData();
    
    // Set up real-time refresh if enabled
    if (isRealTime) {
      const interval = setInterval(fetchSecurityData, 60000); // Refresh every 60 seconds
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [fetchSecurityData, isRealTime]);

  // Refresh when timeRange changes
  useEffect(() => {
    if (authAxios && securityData) {
      fetchSecurityData();
    }
  }, [timeRange]);

  // Transform real API data to component format
  const securityMetrics: SecurityMetric[] = useMemo(() => {
    if (!securityData?.authenticationEvents) {
      return [];
    }

    const { authenticationEvents, rateLimitEvents, securityScore } = securityData;

    return [
      {
        id: 'failed-logins',
        name: 'Failed Login Attempts',
        value: authenticationEvents.summary.failedLogins,
        change: Math.random() * 20 - 10, // Mock change - implement real calculation
        changeType: 'decrease',
        status: authenticationEvents.summary.failedLogins > 1000 ? 'warning' : 'good',
        description: 'Failed login attempts in the last 24 hours',
        lastUpdated: new Date().toISOString()
      },
      {
      id: 'blocked-ips',
      name: 'Blocked IP Addresses',
      value: 45,
      change: 8.7,
      changeType: 'increase',
      status: 'warning',
      description: 'IP addresses currently blocked',
      lastUpdated: '2024-12-10T10:25:00Z'
    },
    {
      id: 'successful-logins',
      name: 'Successful Logins',
      value: 23456,
      change: 12.4,
      changeType: 'increase',
      status: 'good',
      description: 'Successful logins in the last 24 hours',
      lastUpdated: '2024-12-10T10:20:00Z'
    },
    {
      id: 'security-incidents',
      name: 'Security Incidents',
      value: 7,
      change: 0,
      changeType: 'neutral',
      status: 'critical',
      description: 'Active security incidents',
      lastUpdated: '2024-12-10T10:15:00Z'
    },
    {
      id: 'vulnerability-score',
      name: 'Security Score',
      value: 94.2,
      change: 2.1,
      changeType: 'increase',
      status: 'good',
      description: 'Overall security posture score',
      lastUpdated: '2024-12-10T10:10:00Z'
    },
    {
      id: 'data-encrypted',
      name: 'Data Encryption',
      value: 99.8,
      change: 0.1,
      changeType: 'increase',
      status: 'good',
      description: 'Percentage of data encrypted',
      lastUpdated: '2024-12-10T10:05:00Z'
    }
  ], []);

  const securityIncidents: SecurityIncident[] = useMemo(() => [
    {
      id: '1',
      title: 'Multiple Failed Login Attempts',
      description: 'Unusual number of failed login attempts from IP 192.168.1.100',
      severity: 'medium',
      status: 'investigating',
      type: 'unauthorized_access',
      timestamp: '2024-12-10T09:45:00Z',
      affectedSystems: ['Authentication Service', 'User Database'],
      sourceIP: '192.168.1.100',
      sourceLocation: 'San Francisco, CA, USA',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      actions: ['IP temporarily blocked', 'User account locked', 'Security team notified'],
      assignedTo: 'Security Team Alpha',
      impactScore: 6.5
    },
    {
      id: '2',
      title: 'Suspicious API Usage Pattern',
      description: 'Abnormal API request patterns detected from multiple sources',
      severity: 'high',
      status: 'new',
      type: 'ddos',
      timestamp: '2024-12-10T08:30:00Z',
      affectedSystems: ['API Gateway', 'Load Balancer'],
      actions: ['Rate limiting enabled', 'Traffic analysis initiated'],
      impactScore: 8.2
    },
    {
      id: '3',
      title: 'Unauthorized Access Attempt',
      description: 'Admin panel access attempt with expired credentials',
      severity: 'critical',
      status: 'contained',
      type: 'unauthorized_access',
      timestamp: '2024-12-10T07:15:00Z',
      affectedSystems: ['Admin Panel', 'Access Control'],
      sourceIP: '10.0.0.45',
      sourceLocation: 'Unknown',
      actions: ['Access denied', 'Session terminated', 'Credentials revoked'],
      assignedTo: 'Security Team Beta',
      resolutionTime: 45,
      impactScore: 9.1
    },
    {
      id: '4',
      title: 'Data Export Anomaly',
      description: 'Large volume data export outside normal business hours',
      severity: 'low',
      status: 'resolved',
      type: 'policy_violation',
      timestamp: '2024-12-10T02:20:00Z',
      affectedSystems: ['Data Export Service'],
      actions: ['Export logged and flagged', 'User notified', 'Additional verification required'],
      assignedTo: 'Compliance Team',
      resolutionTime: 180,
      impactScore: 3.2
    }
  ], []);

  const loginAttempts: LoginAttempt[] = useMemo(() => [
    {
      id: '1',
      username: 'admin',
      ip: '192.168.1.100',
      location: 'San Francisco, CA',
      userAgent: 'Chrome 91.0',
      timestamp: '2024-12-10T09:45:23Z',
      success: false,
      failureReason: 'Invalid password',
      riskScore: 8.5,
      isSuspicious: true
    },
    {
      id: '2',
      username: 'john.doe',
      ip: '10.0.0.45',
      location: 'New York, NY',
      userAgent: 'Firefox 89.0',
      timestamp: '2024-12-10T09:40:15Z',
      success: true,
      riskScore: 2.1,
      isSuspicious: false
    },
    {
      id: '3',
      username: 'admin',
      ip: '192.168.1.100',
      location: 'San Francisco, CA',
      userAgent: 'Chrome 91.0',
      timestamp: '2024-12-10T09:38:10Z',
      success: false,
      failureReason: 'Invalid password',
      riskScore: 9.2,
      isSuspicious: true
    },
    {
      id: '4',
      username: 'jane.smith',
      ip: '10.0.0.67',
      location: 'Austin, TX',
      userAgent: 'Safari 14.0',
      timestamp: '2024-12-10T09:35:42Z',
      success: true,
      riskScore: 1.8,
      isSuspicious: false
    },
    {
      id: '5',
      username: 'test.user',
      ip: '192.168.1.200',
      location: 'Unknown',
      userAgent: 'Unknown',
      timestamp: '2024-12-10T09:30:05Z',
      success: false,
      failureReason: 'Account not found',
      riskScore: 7.8,
      isSuspicious: true
    }
  ], []);

  const threatAnalysis: ThreatAnalysis = useMemo(() => ({
    threatLevel: 'medium',
    activeThreat: ['Brute Force Attack', 'Suspicious API Usage'],
    blockedIPs: 45,
    suspiciousActivities: 23,
    vulnerabilities: {
      critical: 0,
      high: 2,
      medium: 7,
      low: 15
    },
    lastScan: '2024-12-10T08:00:00Z',
    recommendations: [
      'Enable stronger password policies',
      'Implement rate limiting on authentication endpoints',
      'Review and update firewall rules',
      'Conduct security awareness training'
    ]
  }), []);

  const securityEvents: SecurityEvent[] = useMemo(() => [
    {
      timestamp: '2024-12-10T09:45:23Z',
      eventType: 'Failed Login',
      description: 'Multiple failed login attempts for admin account',
      severity: 'medium',
      sourceIP: '192.168.1.100',
      affectedResource: 'Authentication Service'
    },
    {
      timestamp: '2024-12-10T09:30:15Z',
      eventType: 'Policy Violation',
      description: 'Data export outside business hours',
      severity: 'low',
      sourceIP: '10.0.0.23',
      affectedResource: 'Data Export API'
    },
    {
      timestamp: '2024-12-10T09:15:45Z',
      eventType: 'Firewall Block',
      description: 'Blocked suspicious traffic from known bad IP',
      severity: 'low',
      sourceIP: '203.0.113.45',
      affectedResource: 'Firewall'
    },
    {
      timestamp: '2024-12-10T08:45:30Z',
      eventType: 'Privilege Escalation',
      description: 'User attempted to access unauthorized resources',
      severity: 'high',
      sourceIP: '10.0.0.45',
      affectedResource: 'Access Control'
    }
  ], []);

  const securityConfig: SecurityConfig = useMemo(() => ({
    passwordPolicy: {
      minLength: 12,
      requireSpecialChars: true,
      requireNumbers: true,
      requireUppercase: true,
      maxAge: 90
    },
    twoFactorAuth: {
      enabled: true,
      mandatory: true,
      methods: ['TOTP', 'SMS', 'Email']
    },
    sessionPolicy: {
      maxDuration: 8,
      idleTimeout: 30,
      maxConcurrentSessions: 3
    },
    ipWhitelisting: {
      enabled: false,
      whitelistedIPs: []
    },
    encryption: {
      dataAtRest: true,
      dataInTransit: true,
      algorithm: 'AES-256'
    }
  }), []);

  // Chart data
  const securityTrendData = useMemo(() => [
    { date: '2024-12-04', failedLogins: 1456, successfulLogins: 21890, blockedIPs: 38 },
    { date: '2024-12-05', failedLogins: 1234, successfulLogins: 22450, blockedIPs: 41 },
    { date: '2024-12-06', failedLogins: 1678, successfulLogins: 23120, blockedIPs: 43 },
    { date: '2024-12-07', failedLogins: 1345, successfulLogins: 23890, blockedIPs: 39 },
    { date: '2024-12-08', failedLogins: 1567, successfulLogins: 22780, blockedIPs: 46 },
    { date: '2024-12-09', failedLogins: 1432, successfulLogins: 23560, blockedIPs: 44 },
    { date: '2024-12-10', failedLogins: 1247, successfulLogins: 23456, blockedIPs: 45 }
  ], []);

  const vulnerabilityData = useMemo(() => [
    { name: 'Critical', value: threatAnalysis.vulnerabilities.critical, color: '#f44336' },
    { name: 'High', value: threatAnalysis.vulnerabilities.high, color: '#ff5722' },
    { name: 'Medium', value: threatAnalysis.vulnerabilities.medium, color: '#ff9800' },
    { name: 'Low', value: threatAnalysis.vulnerabilities.low, color: '#4caf50' }
  ], [threatAnalysis]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Error sx={{ color: '#f44336' }} />;
      case 'investigating': return <QueryStats sx={{ color: '#ff9800' }} />;
      case 'contained': return <Shield sx={{ color: '#2196f3' }} />;
      case 'resolved': return <CheckCircle sx={{ color: '#4caf50' }} />;
      default: return <Info sx={{ color: '#757575' }} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f44336';
      case 'high': return '#ff5722';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#757575';
    }
  };

  const handleIncidentClick = (incident: SecurityIncident) => {
    setSelectedIncident(incident);
    setIncidentDialogOpen(true);
  };

  const runSecurityScan = useCallback(async () => {
    setSecurityScanRunning(true);
    // Simulate security scan
    setTimeout(() => {
      setSecurityScanRunning(false);
    }, 5000);
  }, []);

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Security Metrics Cards */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          {securityMetrics.map((metric) => (
            <Grid item xs={12} sm={6} lg={4} key={metric.id}>
              <SecurityCard severity={metric.status}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {metric.name}
                    </Typography>
                    <Chip 
                      label={metric.status}
                      size="small"
                      color={
                        metric.status === 'critical' ? 'error' :
                        metric.status === 'warning' ? 'warning' : 'success'
                      }
                    />
                  </Box>
                  
                  <Typography variant="h3" sx={{ 
                    color: metric.status === 'critical' ? '#f44336' : 
                           metric.status === 'warning' ? '#ff9800' : '#4caf50',
                    fontWeight: 700,
                    mb: 1
                  }}>
                    {metric.id === 'vulnerability-score' || metric.id === 'data-encrypted' 
                      ? `${metric.value}%` 
                      : metric.value.toLocaleString()}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {metric.changeType === 'increase' ? (
                      metric.id === 'blocked-ips' || metric.id === 'security-incidents' ? (
                        <TrendingUp sx={{ color: '#f44336', fontSize: 16 }} />
                      ) : (
                        <TrendingUp sx={{ color: '#4caf50', fontSize: 16 }} />
                      )
                    ) : metric.changeType === 'decrease' ? (
                      metric.id === 'failed-logins' ? (
                        <TrendingDown sx={{ color: '#4caf50', fontSize: 16 }} />
                      ) : (
                        <TrendingDown sx={{ color: '#f44336', fontSize: 16 }} />
                      )
                    ) : (
                      <CompareArrows sx={{ color: '#757575', fontSize: 16 }} />
                    )}
                    <Typography 
                      variant="caption" 
                      color={
                        metric.changeType === 'increase' && (metric.id === 'blocked-ips' || metric.id === 'security-incidents') ? '#f44336' :
                        metric.changeType === 'decrease' && metric.id === 'failed-logins' ? '#4caf50' :
                        metric.changeType === 'increase' ? '#4caf50' :
                        metric.changeType === 'decrease' ? '#f44336' : '#757575'
                      }
                    >
                      {metric.change !== 0 && (metric.change > 0 ? '+' : '')}{metric.change}% 
                      {metric.changeType !== 'neutral' && ' from yesterday'}
                    </Typography>
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {metric.description}
                  </Typography>
                </CardContent>
              </SecurityCard>
            </Grid>
          ))}
        </Grid>
      </Grid>
      
      {/* Threat Level Status */}
      <Grid item xs={12} lg={4}>
        <GlassCard>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Shield />
                Current Threat Level
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={runSecurityScan}
                disabled={securityScanRunning}
              >
                {securityScanRunning ? 'Scanning...' : 'Run Scan'}
              </Button>
            </Box>
            
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {securityScanRunning ? (
                  <CircularProgress size={120} thickness={4} sx={{ color: '#2196f3' }} />
                ) : (
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: `conic-gradient(${getSeverityColor(threatAnalysis.threatLevel)}, transparent 75%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Box
                      sx={{
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        bgcolor: '#1d1f2b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column'
                      }}
                    >
                      <ThreatLevelIndicator level={threatAnalysis.threatLevel} />
                      <Typography variant="h6" sx={{ color: getSeverityColor(threatAnalysis.threatLevel), mt: 1, textTransform: 'uppercase' }}>
                        {threatAnalysis.threatLevel}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom sx={{ color: '#00ffff' }}>
              Active Threats
            </Typography>
            <List dense>
              {threatAnalysis.activeThreat.map((threat, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <Warning sx={{ color: '#ff9800' }} />
                  </ListItemIcon>
                  <ListItemText primary={threat} />
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Blocked IPs</Typography>
                  <Typography variant="h5" color="#f44336">{threatAnalysis.blockedIPs}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Suspicious Activity</Typography>
                  <Typography variant="h5" color="#ff9800">{threatAnalysis.suspiciousActivities}</Typography>
                </Grid>
              </Grid>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              Last scan: {new Date(threatAnalysis.lastScan).toLocaleString()}
            </Typography>
          </CardContent>
        </GlassCard>
      </Grid>
      
      {/* Security Trends Chart */}
      <Grid item xs={12} lg={8}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon />
              Security Activity Trends
            </Typography>
            
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={securityTrendData}>
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
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="successfulLogins"
                    fill="url(#successGradient)"
                    stroke="#4caf50"
                    strokeWidth={2}
                    name="Successful Logins"
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="failedLogins"
                    stroke="#f44336"
                    strokeWidth={3}
                    name="Failed Logins"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="blockedIPs"
                    stroke="#ff9800"
                    strokeWidth={3}
                    name="Blocked IPs"
                  />
                  <defs>
                    <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
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
      
      {/* Vulnerability Distribution */}
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReport />
              Vulnerability Distribution
            </Typography>
            
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vulnerabilityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {vulnerabilityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Security Recommendations
            </Typography>
            <List dense>
              {threatAnalysis.recommendations.slice(0, 3).map((recommendation, index) => (
                <ListItem key={index} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <CheckCircle sx={{ color: '#4caf50', fontSize: 16 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body2">
                        {recommendation}
                      </Typography>
                    } 
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </GlassCard>
      </Grid>
      
      {/* Recent Security Events */}
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationsActive />
              Recent Security Events
            </Typography>
            
            <List>
              {securityEvents.slice(0, 5).map((event, index) => (
                <Paper key={index} sx={{ mb: 1, p: 2, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {event.eventType}
                    </Typography>
                    <Chip 
                      label={event.severity}
                      size="small"
                      color={
                        event.severity === 'critical' ? 'error' :
                        event.severity === 'high' ? 'warning' : 'success'
                      }
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {event.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Source: {event.sourceIP}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </List>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  const renderIncidentsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            Security Incidents
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showSuspiciousOnly}
                  onChange={(e) => setShowSuspiciousOnly(e.target.checked)}
                />
              }
              label="High Priority Only"
            />
            <Button variant="outlined" startIcon={<Download />}>
              Export Report
            </Button>
          </Box>
        </Box>
      </Grid>
      
      <Grid item xs={12}>
        <GlassCard>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Incident</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Impact Score</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {securityIncidents
                    .filter(incident => !showSuspiciousOnly || ['high', 'critical'].includes(incident.severity))
                    .map((incident) => (
                    <TableRow key={incident.id} hover onClick={() => handleIncidentClick(incident)}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {incident.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {incident.description}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={incident.severity}
                          color={
                            incident.severity === 'critical' ? 'error' :
                            incident.severity === 'high' ? 'warning' : 'success'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getStatusIcon(incident.status)}
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {incident.status}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(incident.timestamp).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {incident.sourceIP || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {incident.sourceLocation || 'Unknown'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {incident.impactScore}/10
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={incident.impactScore * 10}
                            sx={{
                              width: 60,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: incident.impactScore > 7 ? '#f44336' : incident.impactScore > 5 ? '#ff9800' : '#4caf50',
                                borderRadius: 3
                              }
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleIncidentClick(incident); }}>
                          <Launch />
                        </IconButton>
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

  const renderLoginAttemptsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#00ffff' }}>
            Login Attempts
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showSuspiciousOnly}
                  onChange={(e) => setShowSuspiciousOnly(e.target.checked)}
                />
              }
              label="Suspicious Only"
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                sx={{ color: '#e0e0e0' }}
              >
                <MenuItem value="1h">Last Hour</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Grid>
      
      <Grid item xs={12}>
        <GlassCard>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>IP Address</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>User Agent</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Risk Score</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loginAttempts
                    .filter(attempt => !showSuspiciousOnly || attempt.isSuspicious)
                    .map((attempt) => (
                    <TableRow key={attempt.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 'small' }}>
                            {attempt.username[0].toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600}>
                            {attempt.username}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {attempt.ip}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {attempt.location}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {attempt.userAgent}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(attempt.timestamp).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {attempt.success ? (
                            <CheckCircle sx={{ color: '#4caf50', fontSize: 20 }} />
                          ) : (
                            <Error sx={{ color: '#f44336', fontSize: 20 }} />
                          )}
                          <Typography variant="body2">
                            {attempt.success ? 'Success' : 'Failed'}
                          </Typography>
                        </Box>
                        {!attempt.success && (
                          <Typography variant="caption" color="text.secondary">
                            {attempt.failureReason}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="body2" 
                            fontWeight={600}
                            color={attempt.riskScore > 7 ? '#f44336' : attempt.riskScore > 5 ? '#ff9800' : '#4caf50'}
                          >
                            {attempt.riskScore}/10
                          </Typography>
                          {attempt.isSuspicious && (
                            <Warning sx={{ color: '#ff9800', fontSize: 16 }} />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton size="small">
                            <Info />
                          </IconButton>
                          {attempt.isSuspicious && (
                            <IconButton size="small">
                              <Block sx={{ color: '#f44336' }} />
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

  const renderConfigurationTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
          Security Configuration
        </Typography>
      </Grid>
      
      {/* Password Policy */}
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Password Policy
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <VpnKey sx={{ color: '#2196f3' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Minimum Length"
                  secondary={`${securityConfig.passwordPolicy.minLength} characters`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  {securityConfig.passwordPolicy.requireSpecialChars ? 
                    <CheckCircle sx={{ color: '#4caf50' }} /> : 
                    <Error sx={{ color: '#f44336' }} />
                  }
                </ListItemIcon>
                <ListItemText 
                  primary="Special Characters"
                  secondary={securityConfig.passwordPolicy.requireSpecialChars ? 'Required' : 'Not required'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  {securityConfig.passwordPolicy.requireNumbers ? 
                    <CheckCircle sx={{ color: '#4caf50' }} /> : 
                    <Error sx={{ color: '#f44336' }} />
                  }
                </ListItemIcon>
                <ListItemText 
                  primary="Numbers"
                  secondary={securityConfig.passwordPolicy.requireNumbers ? 'Required' : 'Not required'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AccessTime sx={{ color: '#ff9800' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Password Age"
                  secondary={`${securityConfig.passwordPolicy.maxAge} days maximum`}
                />
              </ListItem>
            </List>
          </CardContent>
        </GlassCard>
      </Grid>
      
      {/* Two-Factor Authentication */}
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Two-Factor Authentication
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  {securityConfig.twoFactorAuth.enabled ? 
                    <CheckCircle sx={{ color: '#4caf50' }} /> : 
                    <Error sx={{ color: '#f44336' }} />
                  }
                </ListItemIcon>
                <ListItemText 
                  primary="Status"
                  secondary={securityConfig.twoFactorAuth.enabled ? 'Enabled' : 'Disabled'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  {securityConfig.twoFactorAuth.mandatory ? 
                    <Gavel sx={{ color: '#2196f3' }} /> : 
                    <Info sx={{ color: '#757575' }} />
                  }
                </ListItemIcon>
                <ListItemText 
                  primary="Requirement"
                  secondary={securityConfig.twoFactorAuth.mandatory ? 'Mandatory for all users' : 'Optional'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Smartphone sx={{ color: '#9c27b0' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Methods"
                  secondary={securityConfig.twoFactorAuth.methods.join(', ')}
                />
              </ListItem>
            </List>
          </CardContent>
        </GlassCard>
      </Grid>
      
      {/* Session Policy */}
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Session Policy
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  <HourglassEmpty sx={{ color: '#2196f3' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Maximum Duration"
                  secondary={`${securityConfig.sessionPolicy.maxDuration} hours`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <HistoryToggleOff sx={{ color: '#ff9800' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Idle Timeout"
                  secondary={`${securityConfig.sessionPolicy.idleTimeout} minutes`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <SupervisedUserCircle sx={{ color: '#9c27b0' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Concurrent Sessions"
                  secondary={`${securityConfig.sessionPolicy.maxConcurrentSessions} maximum`}
                />
              </ListItem>
            </List>
          </CardContent>
        </GlassCard>
      </Grid>
      
      {/* Encryption */}
      <Grid item xs={12} lg={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Encryption Settings
            </Typography>
            
            <List>
              <ListItem>
                <ListItemIcon>
                  {securityConfig.encryption.dataAtRest ? 
                    <Lock sx={{ color: '#4caf50' }} /> : 
                    <LockOpen sx={{ color: '#f44336' }} />
                  }
                </ListItemIcon>
                <ListItemText 
                  primary="Data at Rest"
                  secondary={securityConfig.encryption.dataAtRest ? 'Encrypted' : 'Not encrypted'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  {securityConfig.encryption.dataInTransit ? 
                    <Https sx={{ color: '#4caf50' }} /> : 
                    <NoEncryption sx={{ color: '#f44336' }} />
                  }
                </ListItemIcon>
                <ListItemText 
                  primary="Data in Transit"
                  secondary={securityConfig.encryption.dataInTransit ? 'Encrypted' : 'Not encrypted'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Code sx={{ color: '#2196f3' }} />
                </ListItemIcon>
                <ListItemText 
                  primary="Algorithm"
                  secondary={securityConfig.encryption.algorithm}
                />
              </ListItem>
            </List>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  const tabPanels = [
    renderOverviewTab(),
    renderIncidentsTab(),
    renderLoginAttemptsTab(),
    renderConfigurationTab()
  ];

  return (
    <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#00ffff', fontWeight: 700, mb: 1 }}>
          Security Monitoring Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Real-time security monitoring, threat detection, and incident management
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
            icon={<Shield />} 
            iconPosition="start" 
            label="Overview" 
          />
          <Tab 
            icon={<Report />} 
            iconPosition="start" 
            label="Incidents" 
          />
          <Tab 
            icon={<Login />} 
            iconPosition="start" 
            label="Login Attempts" 
          />
          <Tab 
            icon={<Settings />} 
            iconPosition="start" 
            label="Configuration" 
          />
        </Tabs>
      </Box>

      <Box>
        {tabPanels[activeTab]}
      </Box>

      {/* Incident Detail Dialog */}
      <Dialog open={incidentDialogOpen} onClose={() => setIncidentDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#00ffff' }}>
          Security Incident Details
        </DialogTitle>
        <DialogContent>
          {selectedIncident && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    {selectedIncident.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {selectedIncident.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip 
                      label={selectedIncident.severity}
                      color={
                        selectedIncident.severity === 'critical' ? 'error' :
                        selectedIncident.severity === 'high' ? 'warning' : 'success'
                      }
                    />
                    <Chip 
                      label={selectedIncident.status}
                      color={
                        selectedIncident.status === 'resolved' ? 'success' :
                        selectedIncident.status === 'contained' ? 'info' : 'warning'
                      }
                      variant="outlined"
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Details</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Time"
                        secondary={new Date(selectedIncident.timestamp).toLocaleString()}
                      />
                    </ListItem>
                    {selectedIncident.sourceIP && (
                      <ListItem>
                        <ListItemText 
                          primary="Source IP"
                          secondary={selectedIncident.sourceIP}
                        />
                      </ListItem>
                    )}
                    {selectedIncident.sourceLocation && (
                      <ListItem>
                        <ListItemText 
                          primary="Location"
                          secondary={selectedIncident.sourceLocation}
                        />
                      </ListItem>
                    )}
                    <ListItem>
                      <ListItemText 
                        primary="Impact Score"
                        secondary={`${selectedIncident.impactScore}/10`}
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Affected Systems
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {selectedIncident.affectedSystems.map((system, index) => (
                  <Chip key={index} label={system} size="small" variant="outlined" />
                ))}
              </Box>
              
              <Typography variant="subtitle2" gutterBottom>
                Actions Taken
              </Typography>
              <List dense>
                {selectedIncident.actions.map((action, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircle sx={{ color: '#4caf50', fontSize: 16 }} />
                    </ListItemIcon>
                    <ListItemText primary={action} />
                  </ListItem>
                ))}
              </List>
              
              {selectedIncident.assignedTo && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Assigned To: {selectedIncident.assignedTo}
                  </Typography>
                </Box>
              )}
              
              {selectedIncident.resolutionTime && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Resolution Time: {selectedIncident.resolutionTime} minutes
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIncidentDialogOpen(false)}>Close</Button>
          <Button variant="contained">Take Action</Button>
        </DialogActions>
      </Dialog>

      {/* Loading and error states */}
      {isLoading && !securityData && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(10, 10, 26, 0.9)', zIndex: 9999 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ color: '#00ffff', mb: 2 }} size={60} />
            <Typography variant="h6" sx={{ color: '#00ffff' }}>
              Loading Security Data...
            </Typography>
          </Box>
        </Box>
      )}

      {error && !securityData && (
        <Alert 
          severity="error" 
          sx={{ position: 'fixed', top: 20, left: 20, right: 20, zIndex: 9999, backgroundColor: 'rgba(244, 67, 54, 0.1)', color: '#f44336', border: '1px solid #f44336' }}
          action={
            <Button color="inherit" size="small" onClick={fetchSecurityData} disabled={isLoading}>
              {isLoading ? <CircularProgress size={16} /> : 'Retry'}
            </Button>
          }
        >
          <Typography variant="h6">Failed to Load Security Data</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      )}
    </Box>
  );
};

export default SecurityMonitoringPanel;