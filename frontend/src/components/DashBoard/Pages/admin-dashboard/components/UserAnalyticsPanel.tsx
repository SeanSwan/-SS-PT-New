/**
 * Advanced User Analytics & Behavior Insights Component
 * Comprehensive user behavior tracking and analysis
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
  Chip,
  Alert,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';

import {
  People,
  TrendingUp,
  TrendingDown,
  AccessTime,
  Psychology,
  Group,
  Analytics,
  DataUsage,
  PersonAdd,
  FilterList,
  Download,
  Refresh
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
  ComposedChart
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

const UserAnalyticsPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Mock data for immediate functionality
  const mockEngagementData = [
    { date: '2024-08-07', dailyActiveUsers: 4231, sessionDuration: 42.5 },
    { date: '2024-08-08', dailyActiveUsers: 4456, sessionDuration: 43.2 },
    { date: '2024-08-09', dailyActiveUsers: 4678, sessionDuration: 44.8 },
    { date: '2024-08-10', dailyActiveUsers: 4234, sessionDuration: 41.2 },
    { date: '2024-08-11', dailyActiveUsers: 4567, sessionDuration: 45.6 },
    { date: '2024-08-12', dailyActiveUsers: 4890, sessionDuration: 46.9 },
    { date: '2024-08-13', dailyActiveUsers: 5123, sessionDuration: 48.3 }
  ];

  const refreshAllData = useCallback(() => {
    console.log('🔄 Refreshing analytics data...');
    // TODO: Implement real data fetching
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
      <Grid item xs={12}>
        <GlassCard>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Analytics />
                User Engagement Trends
              </Typography>
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
            </Box>
            
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mockEngagementData}>
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
    </Grid>
  );

  const renderRetentionTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <DataUsage />
              Retention Analysis
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Retention analysis features are being enhanced with real-time data integration.
            </Typography>
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
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Psychology />
              Behavior Insights Coming Soon
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Advanced behavior analysis features will be available in the next update.
            </Typography>
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
          onClick={() => {
            console.log('📁 Export functionality to be implemented');
          }}
        />
        <SpeedDialAction
          icon={<FilterList />}
          tooltipTitle="Advanced Filters"
          onClick={() => {
            console.log('🔍 Advanced filters modal to be implemented');
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

export default UserAnalyticsPanel;