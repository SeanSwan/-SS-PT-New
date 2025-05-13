/**
 * Mobile-Optimized Admin Dashboard for Tiny Screens
 * SwanStudios Personal Training & Social Media Platform
 * 
 * 100% Mobile Responsive for screens <576px
 * - Touch-friendly interfaces
 * - Optimized layouts for tiny screens
 * - Swipeable components
 * - Mobile-first design principles
 * - Error boundaries and loading states
 */

import React, { useState, useEffect, useMemo, useCallback, ErrorInfo } from 'react';
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
  Container,
  Collapse,
  AccordionSummary,
  AccordionDetails,
  Accordion,
  Skeleton,
  Snackbar,
  SwipeableDrawer,
  BottomNavigation,
  BottomNavigationAction,
  Fab,
  Menu
} from '@mui/material';

// Enhanced icon library for mobile
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
  Warning,
  Error,
  CheckCircle,
  Refresh,
  Notifications,
  Settings,
  Timeline,
  Assessment,
  Computer,
  Memory,
  Fullscreen,
  FullscreenExit,
  Download,
  Share,
  FilterList,
  DateRange,
  Star,
  MonetizationOn,
  ShoppingCart,
  FitnessCenter,
  Group,
  Schedule,
  CameraAlt,
  VideoLibrary,
  Engineering,
  HealthAndSafety,
  Bolt,
  FlashOn,
  CompareArrows,
  Report,
  PersonAdd,
  PersonRemove,
  ManageAccounts,
  AdminPanelSettings,
  Monitor,
  DeviceHub,
  Api,
  CloudDone,
  CloudOff,
  Build,
  Widgets,
  ViewModule,
  Apps,
  Home as HomeIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  ExpandMore,
  ExpandLess,
  Launch,
  KeyboardArrowUp,
  TouchApp,
  SwipeRight,
  SwipeLeft
} from '@mui/icons-material';

// Chart components optimized for mobile
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
  Legend
} from 'recharts';

import { styled, alpha } from '@mui/material/styles';

// Error Boundary Component
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Dashboard error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Dashboard Error
            </Typography>
            <Typography variant="body2">
              Something went wrong. Please refresh the page.
            </Typography>
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => window.location.reload()}
            startIcon={<Refresh />}
          >
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

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
  loading?: boolean;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  disabled?: boolean;
}

// Styled components optimized for mobile
const MobileCard = styled(Card)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  backdropFilter: 'blur(20px)',
  borderRadius: 12,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  transition: 'all 0.3s ease',
  '&:active': {
    transform: 'scale(0.98)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
}));

const MobileMetricCard = styled(MobileCard, {
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
    height: 3,
    background: `linear-gradient(90deg, ${accentColor}, transparent)`,
  },
}));

const CompactChartContainer = styled(Box)(() => ({
  width: '100%',
  height: 120,
  mt: 1,
  '& .recharts-wrapper': {
    width: '100% !important',
    height: '100% !important',
  },
  '& .recharts-cartesian-axis-tick-value': {
    fontSize: '10px',
  },
  '& .recharts-legend-item-text': {
    fontSize: '10px',
  },
}));

const MobileBottomNav = styled(BottomNavigation)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(29, 31, 43, 0.95)',
  backdropFilter: 'blur(10px)',
  borderTop: '1px solid rgba(0, 255, 255, 0.2)',
  zIndex: 1000,
  height: 64,
  '& .MuiBottomNavigationAction-root': {
    color: '#a0a0a0',
    '&.Mui-selected': {
      color: '#00ffff',
    },
    '& .MuiBottomNavigationAction-label': {
      fontSize: '0.7rem',
    },
  },
}));

const SwipeableMetricList = styled(Box)(() => ({
  display: 'flex',
  overflowX: 'auto',
  gap: 12,
  padding: '8px 0',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
}));

const TouchFriendlyButton = styled(Button)(({ theme }) => ({
  minHeight: 44,
  borderRadius: 12,
  '&:active': {
    transform: 'scale(0.95)',
  },
}));

const MobileOptimizedDashboard: React.FC = () => {
  const theme = useTheme();
  const isXS = useMediaQuery('(max-width:575px)');
  const isSM = useMediaQuery(theme.breakpoints.down('sm'));
  const isMD = useMediaQuery(theme.breakpoints.down('md'));
  
  // Mobile-specific state
  const [bottomNavValue, setBottomNavValue] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dataLoading, setDataLoading] = useState(true);
  const [showMobileTooltip, setShowMobileTooltip] = useState<string | null>(null);

  // Error and loading states
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Mock data with loading states
  const dashboardMetrics: DashboardMetric[] = useMemo(() => [
    {
      id: 'total-revenue',
      title: 'Revenue',
      value: 127854,
      change: 12.5,
      changeType: 'increase',
      icon: <AttachMoney />,
      color: '#4caf50',
      description: 'Monthly revenue',
      trend: [95000, 102000, 108000, 115000, 120000, 127854],
      target: 150000,
      format: 'currency',
      loading: dataLoading
    },
    {
      id: 'active-users',
      title: 'Users',
      value: 8921,
      change: 8.3,
      changeType: 'increase',
      icon: <PeopleAlt />,
      color: '#2196f3',
      description: 'Daily active',
      trend: [7800, 8200, 8500, 8700, 8800, 8921],
      target: 10000,
      format: 'number',
      loading: dataLoading
    },
    {
      id: 'completion-rate',
      title: 'Completion',
      value: 87.3,
      change: -2.1,
      changeType: 'decrease',
      icon: <FitnessCenter />,
      color: '#ff9800',
      description: 'Workout rate',
      trend: [89.1, 89.5, 88.9, 88.2, 87.8, 87.3],
      target: 90,
      format: 'percentage',
      loading: dataLoading
    },
    {
      id: 'ai-accuracy',
      title: 'AI Model',
      value: 94.7,
      change: 1.8,
      changeType: 'increase',
      icon: <Psychology />,
      color: '#9c27b0',
      description: 'Accuracy',
      trend: [92.1, 92.8, 93.5, 93.9, 94.2, 94.7],
      target: 95,
      format: 'percentage',
      loading: dataLoading
    }
  ], [dataLoading]);

  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'revenue',
      title: 'Revenue',
      description: 'Analytics',
      icon: <MonetizationOn />,
      action: () => setBottomNavValue(1)
    },
    {
      id: 'users',
      title: 'Users',
      description: 'Analytics', 
      icon: <PeopleAlt />,
      action: () => setBottomNavValue(2)
    },
    {
      id: 'ai',
      title: 'AI',
      description: 'Monitoring',
      icon: <Psychology />,
      action: () => setBottomNavValue(3)
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Status',
      icon: <Security />,
      action: () => setBottomNavValue(4)
    }
  ], []);

  // Mobile-specific effects
  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setDataLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Handle online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pull-to-refresh functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setTouchStart(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const currentTouch = e.touches[0].clientY;
    const diffY = currentTouch - touchStart;

    if (diffY > 100 && window.scrollY === 0) {
      setIsRefreshing(true);
      // Simulate refresh
      setTimeout(() => {
        setIsRefreshing(false);
        window.location.reload();
      }, 1000);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  // Retry mechanism for errors
  const handleRetry = useCallback(() => {
    setError(null);
    setRetryCount(prev => prev + 1);
    setDataLoading(true);
  }, []);

  const formatValue = (metric: DashboardMetric) => {
    if (metric.loading) return <Skeleton width={60} height={32} />;
    
    switch (metric.format) {
      case 'currency':
        return `$${(metric.value as number).toLocaleString()}`;
      case 'percentage':
        return `${metric.value}%`;
      case 'number':
        return (metric.value as number).toLocaleString();
      default:
        return metric.value;
    }
  };

  const renderMobileMetricCard = (metric: DashboardMetric) => (
    <MobileMetricCard 
      key={metric.id} 
      accentColor={metric.color}
      sx={{ minWidth: 200 }}
      onClick={() => setExpandedCard(expandedCard === metric.id ? null : metric.id)}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {metric.title}
          </Typography>
          <Box sx={{ 
            p: 0.5, 
            borderRadius: 1, 
            bgcolor: `${metric.color}20`,
            color: metric.color,
            minHeight: 24,
            minWidth: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {metric.loading ? <CircularProgress size={16} /> : metric.icon}
          </Box>
        </Box>
        
        <Typography variant="h5" fontWeight={700} color={metric.color} sx={{ mb: 0.5 }}>
          {formatValue(metric)}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {!metric.loading && (
            <>
              {metric.changeType === 'increase' ? (
                <TrendingUp sx={{ color: '#4caf50', fontSize: 14 }} />
              ) : metric.changeType === 'decrease' ? (
                <TrendingDown sx={{ color: '#f44336', fontSize: 14 }} />
              ) : (
                <CompareArrows sx={{ color: '#757575', fontSize: 14 }} />
              )}
              <Typography 
                variant="caption" 
                color={metric.changeType === 'increase' ? '#4caf50' : 
                       metric.changeType === 'decrease' ? '#f44336' : '#757575'}
                sx={{ fontSize: '0.6rem' }}
              >
                {metric.change > 0 ? '+' : ''}{metric.change}%
              </Typography>
            </>
          )}
        </Box>
        
        {expandedCard === metric.id && (
          <Collapse in={true}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                {metric.description}
              </Typography>
              {metric.target && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                    Target: {metric.target}{metric.format === 'percentage' ? '%' : ''}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(Number(metric.value) / metric.target) * 100}
                    sx={{ 
                      height: 4, 
                      borderRadius: 2,
                      mt: 0.5,
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 2,
                        bgcolor: metric.color
                      }
                    }}
                  />
                </Box>
              )}
              <CompactChartContainer>
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
              </CompactChartContainer>
            </Box>
          </Collapse>
        )}
      </CardContent>
    </MobileMetricCard>
  );

  const renderOfflineIndicator = () => (
    <Snackbar
      open={isOffline}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      message={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudOff sx={{ fontSize: 20 }} />
          <Typography variant="body2">Offline Mode</Typography>
        </Box>
      }
      sx={{
        '& .MuiSnackbarContent-root': {
          backgroundColor: '#f44336',
          color: 'white'
        }
      }}
    />
  );

  const renderPullToRefresh = () => (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: isRefreshing ? 60 : 0,
        background: 'linear-gradient(180deg, rgba(0,255,255,0.3) 0%, transparent 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'height 0.3s ease',
        zIndex: 1001
      }}
    >
      {isRefreshing && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} sx={{ color: '#00ffff' }} />
          <Typography variant="caption" sx={{ color: '#00ffff' }}>
            Refreshing...
          </Typography>
        </Box>
      )}
    </Box>
  );

  const renderBottomNavigation = () => (
    <MobileBottomNav
      value={bottomNavValue}
      onChange={(event, newValue) => setBottomNavValue(newValue)}
      showLabels
    >
      <BottomNavigationAction label="Overview" icon={<Dashboard />} />
      <BottomNavigationAction label="Revenue" icon={<MonetizationOn />} />
      <BottomNavigationAction label="Users" icon={<PeopleAlt />} />
      <BottomNavigationAction label="AI" icon={<Psychology />} />
      <BottomNavigationAction label="Security" icon={<Security />} />
    </MobileBottomNav>
  );

  return (
    <DashboardErrorBoundary>
      <Box 
        sx={{ 
          bgcolor: '#0a0a1a', 
          minHeight: '100vh', 
          color: '#e0e0e0',
          pb: 8,
          overflowX: 'hidden'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {renderPullToRefresh()}
        {renderOfflineIndicator()}
        
        {/* Mobile Header */}
        <AppBar 
          position="sticky" 
          sx={{ 
            bgcolor: 'rgba(29, 31, 43, 0.95)', 
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(0, 255, 255, 0.2)'
          }}
        >
          <Toolbar sx={{ minHeight: 48 }}>
            <Typography variant="h6" sx={{ color: '#00ffff', flexGrow: 1, fontSize: '1.1rem' }}>
              Admin Dashboard
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" onClick={() => setMobileMenuOpen(true)}>
                <MenuIcon />
              </IconButton>
              <IconButton size="small" onClick={handleRetry}>
                <Refresh />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ px: 1 }}>
          {error ? (
            <Alert 
              severity="error" 
              sx={{ mt: 2 }}
              action={
                <TouchFriendlyButton variant="outlined" onClick={handleRetry}>
                  Retry
                </TouchFriendlyButton>
              }
            >
              {error}
            </Alert>
          ) : (
            <>
              {/* Mobile Metrics Carousel */}
              <Box sx={{ mt: 2, mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#00ffff', mb: 1, px: 1 }}>
                  Key Metrics
                </Typography>
                <SwipeableMetricList>
                  {dashboardMetrics.map(renderMobileMetricCard)}
                </SwipeableMetricList>
                {/* Swipe indicator for mobile */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1, gap: 1 }}>
                  <SwipeLeft sx={{ fontSize: 14, color: '#666' }} />
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '0.6rem' }}>
                    Swipe to see more
                  </Typography>
                  <SwipeRight sx={{ fontSize: 14, color: '#666' }} />
                </Box>
              </Box>

              {/* Quick Actions Grid */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ color: '#00ffff', mb: 1 }}>
                    Quick Actions
                  </Typography>
                </Grid>
                {quickActions.map((action) => (
                  <Grid item xs={6} key={action.id}>
                    <TouchFriendlyButton
                      fullWidth
                      variant="outlined"
                      onClick={action.action}
                      startIcon={action.icon}
                      disabled={action.disabled}
                      sx={{
                        height: 80,
                        flexDirection: 'column',
                        gap: 0.5,
                        borderColor: 'rgba(0, 255, 255, 0.3)',
                        '&:hover': {
                          borderColor: '#00ffff',
                          backgroundColor: 'rgba(0, 255, 255, 0.1)'
                        }
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {action.title}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.8 }}>
                        {action.description}
                      </Typography>
                    </TouchFriendlyButton>
                  </Grid>
                ))}
              </Grid>

              {/* System Status */}
              <MobileCard sx={{ mb: 3 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ color: '#00ffff', mb: 2 }}>
                    System Status
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Uptime
                        </Typography>
                        <Typography variant="h5" color="#4caf50">
                          99.7%
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          Response
                        </Typography>
                        <Typography variant="h5" color="#2196f3">
                          45ms
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </MobileCard>
            </>
          )}
        </Container>

        {/* Mobile Menu Drawer */}
        <SwipeableDrawer
          anchor="right"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          onOpen={() => setMobileMenuOpen(true)}
          sx={{
            '& .MuiDrawer-paper': {
              backgroundColor: 'rgba(29, 31, 43, 0.95)',
              backdropFilter: 'blur(10px)',
              width: Math.min(280, window.innerWidth - 40),
              border: '1px solid rgba(0, 255, 255, 0.2)'
            }
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#00ffff' }}>
                Menu
              </Typography>
              <IconButton onClick={() => setMobileMenuOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            
            <List>
              <ListItem component="button" onClick={() => {/* Settings action */}}>
                <ListItemIcon>
                  <Settings sx={{ color: '#00ffff' }} />
                </ListItemIcon>
                <ListItemText primary="Settings" />
              </ListItem>
              <ListItem component="button" onClick={() => {/* Export action */}}>
                <ListItemIcon>
                  <Download sx={{ color: '#00ffff' }} />
                </ListItemIcon>
                <ListItemText primary="Export Data" />
              </ListItem>
              <ListItem component="button" onClick={() => {/* Share action */}}>
                <ListItemIcon>
                  <Share sx={{ color: '#00ffff' }} />
                </ListItemIcon>
                <ListItemText primary="Share Report" />
              </ListItem>
            </List>
          </Box>
        </SwipeableDrawer>

        {/* Bottom Navigation */}
        {renderBottomNavigation()}

        {/* Floating Refresh Button */}
        <Fab
          size="small"
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
            '&:hover': {
              background: 'linear-gradient(135deg, #00e6ff, #00b3ff)',
            },
          }}
          onClick={handleRetry}
          disabled={dataLoading}
        >
          {dataLoading ? <CircularProgress size={24} /> : <Refresh />}
        </Fab>
      </Box>
    </DashboardErrorBoundary>
  );
};

export default MobileOptimizedDashboard;