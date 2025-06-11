import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Grid, Typography, Paper, Box, Card, CardContent, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BugReportIcon from '@mui/icons-material/BugReport';

// Import dashboard components
import ClientProgressChart from '../../client-progress-chart';
import PopularWorkoutsCard from '../../popular-workouts-card';
import TrainingSessionsCard from '../../training-sessions-card';
import FitnessMetricsChart from '../../fitness-metrics-chart';
import { BajajAreaChartCard } from '../../bajaj-area-chart-card';

// Import state selectors and actions
import { fetchRecentSessionsAsync, fetchActiveClientsAsync } from '../../../../store/slices/adminDashboardSlice';
import { RootState } from '../../../../store/store';

// Import accessibility utilities
import { accessibleLabelGenerator } from '../../../../utils/accessibility';

// Styled components for accessibility and aesthetics
const StyledDashboardCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[8],
  },
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
  },
}));

const MetricValue = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '1.5rem',
  color: theme.palette.primary.main,
}));

const MetricLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  marginTop: theme.spacing(1),
}));

/**
 * AdminDashboardView Component
 * Main dashboard view for administrators with analytics, metrics, and quick access links
 */
const AdminDashboardView: React.FC = () => {
  const dispatch = useDispatch();
  
  // Get dashboard data from Redux store
  const { recentSessions, activeClients, revenueData, loading, error } = useSelector(
    (state: RootState) => state.adminDashboard
  );
  
  // Local state for dashboard metrics
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [sessionPercentageChange, setSessionPercentageChange] = useState(0);
  const [revenuePercentageChange, setRevenuePercentageChange] = useState(0);
  
  // Fetch dashboard data on component mount
  useEffect(() => {
    // @ts-ignore (dispatch type issue with async thunks)
    dispatch(fetchRecentSessionsAsync());
    // @ts-ignore
    dispatch(fetchActiveClientsAsync());
    
    // Set mock data for demo purposes
    setTotalSessions(142);
    setTotalClients(37);
    setSessionPercentageChange(12.5);
    setRevenuePercentageChange(8.2);
  }, [dispatch]);
  
  return (
    <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{ mb: 4 }}
        aria-label={accessibleLabelGenerator('Admin Dashboard Overview')}
      >
        Admin Dashboard
      </Typography>
      
      {/* Quick metrics row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Sessions Card */}
        <Grid item xs={12} sm={6} md={3}>
          <StyledDashboardCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <MetricValue variant="h5">{totalSessions}</MetricValue>
                  <MetricLabel variant="body2">Total Sessions</MetricLabel>
                  <Typography 
                    variant="body2" 
                    color={sessionPercentageChange >= 0 ? 'success.main' : 'error.main'}
                    sx={{ mt: 1 }}
                  >
                    {sessionPercentageChange >= 0 ? '+' : ''}{sessionPercentageChange}% from last month
                  </Typography>
                </Box>
                <CalendarMonthIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </StyledDashboardCard>
        </Grid>
        
        {/* Active Clients Card */}
        <Grid item xs={12} sm={6} md={3}>
          <StyledDashboardCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <MetricValue variant="h5">{totalClients}</MetricValue>
                  <MetricLabel variant="body2">Active Clients</MetricLabel>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    4 new this week
                  </Typography>
                </Box>
                <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </StyledDashboardCard>
        </Grid>
        
        {/* Revenue Card */}
        <Grid item xs={12} sm={6} md={3}>
          <StyledDashboardCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <MetricValue variant="h5">$16,480</MetricValue>
                  <MetricLabel variant="body2">Monthly Revenue</MetricLabel>
                  <Typography 
                    variant="body2" 
                    color={revenuePercentageChange >= 0 ? 'success.main' : 'error.main'}
                    sx={{ mt: 1 }}
                  >
                    {revenuePercentageChange >= 0 ? '+' : ''}{revenuePercentageChange}% from last month
                  </Typography>
                </Box>
                <TrendingUpIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </StyledDashboardCard>
        </Grid>
        
        {/* Shop Sales Card */}
        <Grid item xs={12} sm={6} md={3}>
          <StyledDashboardCard>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <MetricValue variant="h5">23</MetricValue>
                  <MetricLabel variant="body2">Shop Orders</MetricLabel>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    5 pending shipment
                  </Typography>
                </Box>
                <ShoppingCartIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </StyledDashboardCard>
        </Grid>
      </Grid>
      
      {/* Charts and data visualization row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Trends Chart */}
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={3} 
            sx={{ p: 3 }} 
            aria-labelledby="revenue-trends-title"
          >
            <Typography 
              id="revenue-trends-title"
              variant="h6" 
              component="h2" 
              gutterBottom
            >
              Revenue Trends
            </Typography>
            <BajajAreaChartCard 
              title="" 
              chartData={{
                type: 'area',
                height: 280,
                options: {},
                series: [
                  {
                    name: 'Revenue',
                    data: [12500, 14800, 13200, 15600, 16400, 15200, 16800, 17200, 16400, 17800, 18200, 19400]
                  }
                ]
              }}
            />
          </Paper>
        </Grid>
        
        {/* Client Progress Summary */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={3} 
            sx={{ p: 3, height: '100%' }}
            aria-labelledby="client-progress-title"
          >
            <Typography 
              id="client-progress-title"
              variant="h6" 
              component="h2" 
              gutterBottom
            >
              Client Progress
            </Typography>
            <ClientProgressChart />
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                color="primary"
                href="/dashboard/client-progress"
                startIcon={<AccessibilityNewIcon />}
                aria-label="View detailed client progress reports"
              >
                View Detailed Progress
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Additional metrics row */}
      <Grid container spacing={3}>
        {/* Popular Workouts */}
        <Grid item xs={12} md={4}>
          <PopularWorkoutsCard />
        </Grid>
        
        {/* Training Sessions */}
        <Grid item xs={12} md={4}>
          <TrainingSessionsCard />
        </Grid>
        
        {/* Fitness Metrics */}
        <Grid item xs={12} md={4}>
          <FitnessMetricsChart />
        </Grid>
      </Grid>
      
      {/* Debugging Tools Section */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'rgba(0, 255, 255, 0.05)', borderRadius: 2, border: '1px dashed #00ffff' }}>
        <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', mb: 2 }}>
          <BugReportIcon sx={{ mr: 1 }} />
          System Diagnostics
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Use these tools to diagnose and fix issues with data sharing between client, admin, and trainer dashboards.
        </Typography>
        <Button
          component={Link}
          to="/dashboard/admin/debug"
          variant="contained"
          startIcon={<BugReportIcon />}
          sx={{
            bgcolor: '#00ffff',
            color: '#1a1a2e',
            '&:hover': { bgcolor: '#00cccc' }
          }}
        >
          Open Debugging Dashboard
        </Button>
      </Box>
    </Box>
  );
};

export default AdminDashboardView;