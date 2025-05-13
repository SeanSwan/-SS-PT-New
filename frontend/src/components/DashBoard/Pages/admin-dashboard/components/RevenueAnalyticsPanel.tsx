/**
 * Real-Time Revenue Analytics Component
 * Advanced revenue tracking with predictive analytics
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Divider
} from '@mui/material';

import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Assessment,
  Visibility,
  Download,
  Refresh,
  Info,
  MonetizationOn,
  ShoppingCart,
  CreditCard,
  AccountBalance,
  CompareArrows,
  Timeline,
  PieChart,
  Analytics,
  Psychology
} from '@mui/icons-material';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
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
  ReferenceLine,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';

import { styled } from '@mui/material/styles';

// Types
interface RevenueStream {
  name: string;
  value: number;
  change: number;
  percentage: number;
  color: string;
  details: {
    subscribers: number;
    averageTicket: number;
    conversionRate: number;
  };
}

interface RevenueMetric {
  period: string;
  totalRevenue: number;
  subscriptionRevenue: number;
  trainingRevenue: number;
  merchandiseRevenue: number;
  premiumContentRevenue: number;
  newCustomers: number;
  returningCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
  churnRate: number;
  lifetimeValue: number;
  predictedRevenue: number;
}

interface RevenueAnalysis {
  trend: 'up' | 'down' | 'stable';
  growthRate: number;
  seasonality: number;
  forecast: {
    nextMonth: number;
    nextQuarter: number;
    confidence: number;
  };
  insights: string[];
  recommendations: string[];
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

const RevenueAnalyticsPanel: React.FC = () => {
  const [timeRange, setTimeRange] = useState('6m');
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'predictive'>('overview');
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  // Mock data - In production, this would come from API/Redux
  const revenueData: RevenueMetric[] = useMemo(() => [
    {
      period: 'Jan',
      totalRevenue: 89534,
      subscriptionRevenue: 56789,
      trainingRevenue: 21234,
      merchandiseRevenue: 8934,
      premiumContentRevenue: 2577,
      newCustomers: 234,
      returningCustomers: 1876,
      averageOrderValue: 42.34,
      conversionRate: 18.7,
      churnRate: 3.2,
      lifetimeValue: 567.89,
      predictedRevenue: 92000
    },
    {
      period: 'Feb',
      totalRevenue: 95432,
      subscriptionRevenue: 61234,
      trainingRevenue: 22456,
      merchandiseRevenue: 9123,
      premiumContentRevenue: 2619,
      newCustomers: 298,
      returningCustomers: 1954,
      averageOrderValue: 44.21,
      conversionRate: 19.1,
      churnRate: 2.9,
      lifetimeValue: 589.45,
      predictedRevenue: 98000
    },
    {
      period: 'Mar',
      totalRevenue: 102876,
      subscriptionRevenue: 67890,
      trainingRevenue: 23567,
      merchandiseRevenue: 8890,
      premiumContentRevenue: 2529,
      newCustomers: 345,
      returningCustomers: 2087,
      averageOrderValue: 41.98,
      conversionRate: 20.3,
      churnRate: 2.7,
      lifetimeValue: 612.34,
      predictedRevenue: 105000
    },
    {
      period: 'Apr',
      totalRevenue: 118945,
      subscriptionRevenue: 78234,
      trainingRevenue: 26789,
      merchandiseRevenue: 10987,
      premiumContentRevenue: 2935,
      newCustomers: 423,
      returningCustomers: 2234,
      averageOrderValue: 45.67,
      conversionRate: 21.8,
      churnRate: 2.3,
      lifetimeValue: 645.78,
      predictedRevenue: 122000
    },
    {
      period: 'May',
      totalRevenue: 127854,
      subscriptionRevenue: 85432,
      trainingRevenue: 28976,
      medalliseRevenue: 11234,
      premiumContentRevenue: 3212,
      newCustomers: 489,
      returningCustomers: 2489,
      averageOrderValue: 47.23,
      conversionRate: 22.1,
      churnRate: 2.1,
      lifetimeValue: 678.92,
      predictedRevenue: 132000
    },
    {
      period: 'Jun',
      totalRevenue: 135623,
      subscriptionRevenue: 91245,
      trainingRevenue: 31567,
      merchandiseRevenue: 10234,
      premiumContentRevenue: 2577,
      newCustomers: 567,
      returningCustomers: 2698,
      averageOrderValue: 49.12,
      conversionRate: 23.4,
      churnRate: 1.9,
      lifetimeValue: 712.45,
      predictedRevenue: 140000
    }
  ], []);

  const revenueStreams: RevenueStream[] = useMemo(() => [
    {
      name: 'Subscriptions',
      value: 91245,
      change: 12.3,
      percentage: 67.3,
      color: '#4caf50',
      details: {
        subscribers: 5634,
        averageTicket: 16.18,
        conversionRate: 23.4
      }
    },
    {
      name: 'Personal Training',
      value: 31567,
      change: 8.7,
      percentage: 23.3,
      color: '#2196f3',
      details: {
        subscribers: 987,
        averageTicket: 32.00,
        conversionRate: 45.6
      }
    },
    {
      name: 'Merchandise',
      value: 10234,
      change: -2.1,
      percentage: 7.5,
      color: '#ff9800',
      details: {
        subscribers: 1234,
        averageTicket: 8.29,
        conversionRate: 12.8
      }
    },
    {
      name: 'Premium Content',
      value: 2577,
      change: 18.9,
      percentage: 1.9,
      color: '#9c27b0',
      details: {
        subscribers: 345,
        averageTicket: 7.47,
        conversionRate: 8.9
      }
    }
  ], []);

  const revenueAnalysis: RevenueAnalysis = useMemo(() => ({
    trend: 'up',
    growthRate: 15.6,
    seasonality: 8.2,
    forecast: {
      nextMonth: 142000,
      nextQuarter: 425000,
      confidence: 87.5
    },
    insights: [
      'Subscription revenue shows strong 12.3% month-over-month growth',
      'Personal training sessions are trending upward with higher conversion rates',
      'Premium content revenue has the highest growth rate at 18.9%',
      'Merchandise sales experienced a slight decline, likely seasonal'
    ],
    recommendations: [
      'Focus on subscription upselling to maintain growth momentum',
      'Expand premium content offerings to capitalize on high growth rate',
      'Review merchandise pricing strategy and seasonal promotions',
      'Implement retention campaigns for high-value personal training clients'
    ]
  }), []);

  const currentMonthData = revenueData[revenueData.length - 1];
  const previousMonthData = revenueData[revenueData.length - 2];
  const revenueGrowth = ((currentMonthData.totalRevenue - previousMonthData.totalRevenue) / previousMonthData.totalRevenue) * 100;

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <GlassCard>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline />
                Revenue Trend Analysis
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                  <Select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    sx={{ color: '#e0e0e0' }}
                  >
                    <MenuItem value="3m">Last 3 Months</MenuItem>
                    <MenuItem value="6m">Last 6 Months</MenuItem>
                    <MenuItem value="1y">Last Year</MenuItem>
                    <MenuItem value="2y">Last 2 Years</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={() => {}}>
                  <Refresh />
                </IconButton>
              </Box>
            </Box>
            
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis dataKey="period" stroke="#e0e0e0" />
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
                  <Bar yAxisId="left" dataKey="totalRevenue" fill="#4caf50" name="Total Revenue ($)" />
                  <Line yAxisId="right" type="monotone" dataKey="predictedRevenue" stroke="#ff9800" strokeWidth={3} strokeDasharray="5 5" name="Predicted Revenue ($)" />
                  <ReferenceLine yAxisId="left" y={150000} stroke="#00ffff" strokeDasharray="2 2" label="Target" />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <MetricCard accentColor="#4caf50">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h3" sx={{ color: '#4caf50', fontWeight: 700 }}>
                    ${currentMonthData.totalRevenue.toLocaleString()}
                  </Typography>
                  <MonetizationOn sx={{ fontSize: 40, color: 'rgba(76, 175, 80, 0.3)' }} />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Revenue (This Month)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {revenueGrowth >= 0 ? (
                    <TrendingUp sx={{ color: '#4caf50', fontSize: 16 }} />
                  ) : (
                    <TrendingDown sx={{ color: '#f44336', fontSize: 16 }} />
                  )}
                  <Typography 
                    variant="caption" 
                    color={revenueGrowth >= 0 ? '#4caf50' : '#f44336'}
                  >
                    {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% from last month
                  </Typography>
                </Box>
              </CardContent>
            </MetricCard>
          </Grid>
          
          <Grid item xs={12}>
            <MetricCard accentColor="#2196f3">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h3" sx={{ color: '#2196f3', fontWeight: 700 }}>
                    ${currentMonthData.averageOrderValue.toFixed(2)}
                  </Typography>
                  <ShoppingCart sx={{ fontSize: 40, color: 'rgba(33, 150, 243, 0.3)' }} />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Average Order Value
                </Typography>
                <Typography variant="caption" color="#2196f3">
                  +{((currentMonthData.averageOrderValue - previousMonthData.averageOrderValue) / previousMonthData.averageOrderValue * 100).toFixed(1)}% vs previous month
                </Typography>
              </CardContent>
            </MetricCard>
          </Grid>
          
          <Grid item xs={12}>
            <MetricCard accentColor="#ff9800">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h3" sx={{ color: '#ff9800', fontWeight: 700 }}>
                    {currentMonthData.conversionRate.toFixed(1)}%
                  </Typography>
                  <CompareArrows sx={{ fontSize: 40, color: 'rgba(255, 152, 0, 0.3)' }} />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Conversion Rate
                </Typography>
                <Typography variant="caption" color="#ff9800">
                  Target: 25.0%
                </Typography>
              </CardContent>
            </MetricCard>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );

  const renderRevenueStreamsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <PieChart />
              Revenue Stream Distribution
            </Typography>
            
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={revenueStreams}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {revenueStreams.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ReTooltip />
                </RePieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Revenue Stream Performance
            </Typography>
            
            {revenueStreams.map((stream, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {stream.name}
                  </Typography>
                  <Chip
                    label={`${stream.change >= 0 ? '+' : ''}${stream.change}%`}
                    color={stream.change >= 0 ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h5" sx={{ color: stream.color }}>
                    ${stream.value.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stream.percentage}% of total
                  </Typography>
                </Box>
                
                <LinearProgress
                  variant="determinate"
                  value={stream.percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: stream.color,
                      borderRadius: 4
                    }
                  }}
                />
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Subscribers</Typography>
                    <Typography variant="body2" fontWeight={600}>{stream.details.subscribers}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Avg Ticket</Typography>
                    <Typography variant="body2" fontWeight={600}>${stream.details.averageTicket}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Conv. Rate</Typography>
                    <Typography variant="body2" fontWeight={600}>{stream.details.conversionRate}%</Typography>
                  </Grid>
                </Grid>
                
                {index < revenueStreams.length - 1 && <Divider sx={{ mt: 2 }} />}
              </Box>
            ))}
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  const renderPredictiveTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Psychology />
              Predictive Analytics & Forecasting
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                AI-powered forecast with {revenueAnalysis.forecast.confidence}% confidence level
              </Typography>
            </Alert>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
                  <Typography variant="h4" color="#4caf50" fontWeight={700}>
                    ${revenueAnalysis.forecast.nextMonth.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Projected Next Month
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
                  <Typography variant="h4" color="#2196f3" fontWeight={700}>
                    ${revenueAnalysis.forecast.nextQuarter.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Projected Next Quarter
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.02)', textAlign: 'center' }}>
                  <Typography variant="h4" color="#ff9800" fontWeight={700}>
                    {revenueAnalysis.growthRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Projected Growth Rate
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            <Typography variant="subtitle1" gutterBottom sx={{ color: '#00ffff' }}>
              Key Insights
            </Typography>
            {revenueAnalysis.insights.map((insight, index) => (
              <Alert key={index} severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2">{insight}</Typography>
              </Alert>
            ))}
            
            <Typography variant="subtitle1" gutterBottom sx={{ color: '#00ffff', mt: 3 }}>
              Recommended Actions
            </Typography>
            {revenueAnalysis.recommendations.map((recommendation, index) => (
              <Alert key={index} severity="success" sx={{ mb: 1 }}>
                <Typography variant="body2">{recommendation}</Typography>
              </Alert>
            ))}
          </CardContent>
        </GlassCard>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <GlassCard>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ color: '#00ffff' }}>
              Revenue Analysis Summary
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Trend Direction</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {revenueAnalysis.trend === 'up' ? (
                    <TrendingUp sx={{ color: '#4caf50', fontSize: 20 }} />
                  ) : revenueAnalysis.trend === 'down' ? (
                    <TrendingDown sx={{ color: '#f44336', fontSize: 20 }} />
                  ) : (
                    <CompareArrows sx={{ color: '#ff9800', fontSize: 20 }} />
                  )}
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {revenueAnalysis.trend}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Growth Rate</Typography>
                <Typography variant="body2" color="#4caf50" fontWeight={600}>
                  +{revenueAnalysis.growthRate}%
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Seasonality Impact</Typography>
                <Typography variant="body2" color="#ff9800" fontWeight={600}>
                  {revenueAnalysis.seasonality}%
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Forecast Confidence</Typography>
                <Typography variant="body2" color="#2196f3" fontWeight={600}>
                  {revenueAnalysis.forecast.confidence}%
                </Typography>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Performance Indicators
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Customer Lifetime Value</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    ${currentMonthData.lifetimeValue.toFixed(2)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(currentMonthData.lifetimeValue / 800) * 100}
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
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Churn Rate</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {currentMonthData.churnRate}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={currentMonthData.churnRate}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: currentMonthData.churnRate < 3 ? '#4caf50' : currentMonthData.churnRate < 5 ? '#ff9800' : '#f44336',
                      borderRadius: 3
                    }
                  }}
                />
              </Box>
            </Box>
          </CardContent>
        </GlassCard>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ bgcolor: '#0a0a1a', minHeight: '100vh', p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#00ffff', fontWeight: 700, mb: 1 }}>
          Revenue Analytics Dashboard
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Comprehensive revenue tracking, analysis, and forecasting
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
            icon={<Assessment />} 
            iconPosition="start" 
            label="Overview" 
          />
          <Tab 
            icon={<PieChart />} 
            iconPosition="start" 
            label="Revenue Streams" 
          />
          <Tab 
            icon={<Analytics />} 
            iconPosition="start" 
            label="Predictive Analytics" 
          />
        </Tabs>
      </Box>

      <Box>
        {activeTab === 0 && renderOverviewTab()}
        {activeTab === 1 && renderRevenueStreamsTab()}
        {activeTab === 2 && renderPredictiveTab()}
      </Box>
    </Box>
  );
};

export default RevenueAnalyticsPanel;