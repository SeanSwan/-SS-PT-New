import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CardHeader,
  Button,
  Chip,
  Divider,
  LinearProgress,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  Award,
  Trophy,
  Star,
  Users,
  TrendingUp,
  Gift,
  Calendar,
  Activity,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  AlertTriangle,
  Download,
  Filter,
  Plus,
  Minus,
  HelpCircle,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Scatter,
  ScatterChart,
  ZAxis
} from 'recharts';

/**
 * Enhanced SystemAnalytics Component
 * 
 * Provides comprehensive analytics and insights for the gamification system
 * Displays user engagement metrics, achievement statistics, reward usage, and tier distribution
 * Optimized for performance with customizable views and exportable data
 */
const EnhancedSystemAnalytics: React.FC<{ data: any }> = ({ data }) => {
  // State for view control
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'achievements' | 'rewards' | 'tiers' | 'trends'>('overview');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>('bar');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  // Handle time range change
  const handleTimeRangeChange = useCallback((
    event: React.MouseEvent<HTMLElement>,
    newTimeRange: 'week' | 'month' | 'quarter' | 'year',
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  }, []);
  
  // Handle chart type change
  const handleChartTypeChange = useCallback((
    event: React.MouseEvent<HTMLElement>,
    newChartType: 'bar' | 'line' | 'pie' | 'area',
  ) => {
    if (newChartType !== null) {
      setChartType(newChartType);
    }
  }, []);
  
  // Calculate KPI card values based on time range
  const kpiValues = useMemo(() => {
    // In a real implementation, these would be calculated from the data based on time range
    // Here we're just using mock data
    
    const ranges = {
      week: {
        newUsers: 8,
        achievementsEarned: 47,
        rewardsRedeemed: 12,
        engagementRate: 78,
        pointsEarned: 6800,
        pointsSpent: 2500,
        prevNewUsers: 6,
        prevAchievementsEarned: 42,
        prevRewardsRedeemed: 10,
        prevEngagementRate: 72,
        prevPointsEarned: 6200,
        prevPointsSpent: 2800
      },
      month: {
        newUsers: 24,
        achievementsEarned: 186,
        rewardsRedeemed: 42,
        engagementRate: 83,
        pointsEarned: 28900,
        pointsSpent: 9300,
        prevNewUsers: 19,
        prevAchievementsEarned: 165,
        prevRewardsRedeemed: 38,
        prevEngagementRate: 80,
        prevPointsEarned: 24500,
        prevPointsSpent: 8700
      },
      quarter: {
        newUsers: 52,
        achievementsEarned: 412,
        rewardsRedeemed: 95,
        engagementRate: 81,
        pointsEarned: 64500,
        pointsSpent: 22800,
        prevNewUsers: 43,
        prevAchievementsEarned: 378,
        prevRewardsRedeemed: 82,
        prevEngagementRate: 79,
        prevPointsEarned: 58900,
        prevPointsSpent: 19800
      },
      year: {
        newUsers: 164,
        achievementsEarned: 1250,
        rewardsRedeemed: 280,
        engagementRate: 79,
        pointsEarned: 186000,
        pointsSpent: 78500,
        prevNewUsers: 128,
        prevAchievementsEarned: 1080,
        prevRewardsRedeemed: 245,
        prevEngagementRate: 74,
        prevPointsEarned: 152000,
        prevPointsSpent: 63000
      }
    };
    
    const current = ranges[timeRange];
    
    return {
      newUsers: {
        value: current.newUsers,
        trend: current.newUsers > current.prevNewUsers ? 'up' : 'down',
        percentage: Math.round(Math.abs((current.newUsers - current.prevNewUsers) / current.prevNewUsers * 100))
      },
      achievementsEarned: {
        value: current.achievementsEarned,
        trend: current.achievementsEarned > current.prevAchievementsEarned ? 'up' : 'down',
        percentage: Math.round(Math.abs((current.achievementsEarned - current.prevAchievementsEarned) / current.prevAchievementsEarned * 100))
      },
      rewardsRedeemed: {
        value: current.rewardsRedeemed,
        trend: current.rewardsRedeemed > current.prevRewardsRedeemed ? 'up' : 'down',
        percentage: Math.round(Math.abs((current.rewardsRedeemed - current.prevRewardsRedeemed) / current.prevRewardsRedeemed * 100))
      },
      engagementRate: {
        value: current.engagementRate,
        trend: current.engagementRate > current.prevEngagementRate ? 'up' : 'down',
        percentage: Math.abs(current.engagementRate - current.prevEngagementRate)
      },
      pointsEarned: {
        value: current.pointsEarned,
        trend: current.pointsEarned > current.prevPointsEarned ? 'up' : 'down',
        percentage: Math.round(Math.abs((current.pointsEarned - current.prevPointsEarned) / current.prevPointsEarned * 100))
      },
      pointsSpent: {
        value: current.pointsSpent,
        trend: current.pointsSpent < current.prevPointsSpent ? 'up' : 'down', // Lower spending is considered positive
        percentage: Math.round(Math.abs((current.pointsSpent - current.prevPointsSpent) / current.prevPointsSpent * 100))
      },
      pointsEconomy: {
        value: Math.round((current.pointsEarned - current.pointsSpent) / current.pointsEarned * 100),
        trend: (current.pointsEarned - current.pointsSpent) > (current.prevPointsEarned - current.prevPointsSpent) ? 'up' : 'down',
        percentage: Math.round(Math.abs(
          ((current.pointsEarned - current.pointsSpent) - (current.prevPointsEarned - current.prevPointsSpent)) / 
          (current.prevPointsEarned - current.prevPointsSpent) * 100
        ))
      }
    };
  }, [timeRange]);
  
  // Generate activity data based on time range
  const activityData = useMemo(() => {
    const getActivityData = () => {
      const now = new Date();
      const result = [];
      
      let dataPoints = 0;
      let interval = 0;
      
      // Set number of data points and interval based on time range
      switch (timeRange) {
        case 'week':
          dataPoints = 7;
          interval = 24 * 60 * 60 * 1000; // 1 day
          break;
        case 'month':
          dataPoints = 30;
          interval = 24 * 60 * 60 * 1000; // 1 day
          break;
        case 'quarter':
          dataPoints = 12;
          interval = 7 * 24 * 60 * 60 * 1000; // 1 week
          break;
        case 'year':
          dataPoints = 12;
          interval = 30 * 24 * 60 * 60 * 1000; // 1 month
          break;
      }
      
      for (let i = dataPoints - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - (i * interval));
        const pointsEarned = Math.floor(Math.random() * 2000) + 1000;
        const pointsSpent = Math.floor(Math.random() * 500) + 300;
        const activeUsers = Math.floor(Math.random() * 10) + 30;
        const newUsers = Math.floor(Math.random() * 3) + 1;
        
        result.push({
          date: timeRange === 'year' 
            ? date.toLocaleDateString('en-US', { month: 'short' })
            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          pointsEarned,
          pointsSpent,
          activeUsers,
          newUsers,
          achievementsEarned: Math.floor(Math.random() * 10) + 5,
          rewardsRedeemed: Math.floor(Math.random() * 3) + 1,
          engagementRate: Math.floor(Math.random() * 10) + 70
        });
      }
      
      return result;
    };
    
    return getActivityData();
  }, [timeRange]);
  
  // Generate tier distribution data
  const tierDistributionData = useMemo(() => {
    return [
      { name: 'Bronze', value: 18, color: '#CD7F32' },
      { name: 'Silver', value: 15, color: '#C0C0C0' },
      { name: 'Gold', value: 7, color: '#FFD700' },
      { name: 'Platinum', value: 2, color: '#E5E4E2' }
    ];
  }, []);
  
  // Generate achievement completion data
  const achievementCompletionData = useMemo(() => {
    return [
      { name: 'Fitness Starter', completion: 90, color: '#4CAF50' },
      { name: 'Exercise Explorer', completion: 75, color: '#2196F3' },
      { name: 'Level 10 Champion', completion: 60, color: '#9C27B0' },
      { name: 'Squat Master', completion: 45, color: '#FF9800' },
      { name: 'Consistency King', completion: 30, color: '#F44336' },
      { name: 'Elite Athlete', completion: 15, color: '#607D8B' },
      { name: 'Fitness Legend', completion: 5, color: '#795548' }
    ];
  }, []);
  
  // Generate reward redemption data
  const rewardRedemptionData = useMemo(() => {
    return [
      { name: 'Water Bottle', redemptions: 15, color: '#4CAF50' },
      { name: 'Free Session', redemptions: 10, color: '#2196F3' },
      { name: 'Fitness Assessment', redemptions: 8, color: '#9C27B0' },
      { name: 'Fitness T-Shirt', redemptions: 6, color: '#FF9800' },
      { name: '25% Off Package', redemptions: 3, color: '#F44336' }
    ];
  }, []);
  
  // Generate user retention data
  const userRetentionData = useMemo(() => {
    return [
      { tier: 'Bronze', retention: 65 },
      { tier: 'Silver', retention: 78 },
      { tier: 'Gold', retention: 92 },
      { tier: 'Platinum', retention: 98 }
    ];
  }, []);
  
  // Generate tier progression data
  const tierProgressionData = useMemo(() => {
    const data = [];
    
    const startDate = new Date();
    const numPoints = timeRange === 'week' ? 7 : 
                    timeRange === 'month' ? 4 : 
                    timeRange === 'quarter' ? 12 : 
                    12;
    
    const interval = timeRange === 'week' ? 1 : 
                    timeRange === 'month' ? 7 : 
                    timeRange === 'quarter' ? 7 : 
                    30;
    
    startDate.setDate(startDate.getDate() - (numPoints * interval));
    
    let bronzeUsers = 15;
    let silverUsers = 10;
    let goldUsers = 3;
    let platinumUsers = 1;
    const totalUsers = bronzeUsers + silverUsers + goldUsers + platinumUsers;
    
    for (let i = 0; i < numPoints; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + (i * interval));
      
      // Small random changes to the numbers
      bronzeUsers += Math.floor(Math.random() * 3) - 1;
      silverUsers += Math.floor(Math.random() * 3) - 0.5;
      goldUsers += Math.floor(Math.random() * 2) - 0.5;
      platinumUsers += Math.floor(Math.random() * 2) - 0.5;
      
      // Ensure values are at least 0
      bronzeUsers = Math.max(0, bronzeUsers);
      silverUsers = Math.max(0, silverUsers);
      goldUsers = Math.max(0, goldUsers);
      platinumUsers = Math.max(0, platinumUsers);
      
      // Calculate percentages
      const newTotal = bronzeUsers + silverUsers + goldUsers + platinumUsers;
      
      data.push({
        date: timeRange === 'year' 
          ? date.toLocaleDateString('en-US', { month: 'short' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        bronze: Math.round((bronzeUsers / newTotal) * 100),
        silver: Math.round((silverUsers / newTotal) * 100),
        gold: Math.round((goldUsers / newTotal) * 100),
        platinum: Math.round((platinumUsers / newTotal) * 100)
      });
    }
    
    return data;
  }, [timeRange]);

  // User engagement by achievement level
  const engagementData = useMemo(() => {
    return [
      { name: '0-5', achievements: 5, retention: 35, engagement: 25 },
      { name: '6-10', achievements: 10, retention: 48, engagement: 40 },
      { name: '11-15', achievements: 15, retention: 65, engagement: 58 },
      { name: '16-20', achievements: 20, retention: 78, engagement: 72 },
      { name: '21+', achievements: 25, retention: 92, engagement: 85 }
    ];
  }, []);
  
  // Risk users - those who haven't earned points in 14+ days
  const riskUsers = useMemo(() => {
    return [
      { id: 'user123', name: 'John Smith', tier: 'Silver', lastActive: '21 days ago', risk: 'high' },
      { id: 'user456', name: 'Alice Brown', tier: 'Bronze', lastActive: '18 days ago', risk: 'high' },
      { id: 'user789', name: 'Robert Davis', tier: 'Gold', lastActive: '16 days ago', risk: 'medium' },
      { id: 'user101', name: 'Emily Wilson', tier: 'Bronze', lastActive: '15 days ago', risk: 'medium' },
      { id: 'user112', name: 'Michael Clark', tier: 'Silver', lastActive: '14 days ago', risk: 'medium' }
    ];
  }, []);
  
  // Function to export data (mock implementation)
  const handleExportData = useCallback(() => {
    setIsExporting(true);
    
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      
      // In a real implementation, this would download a CSV or Excel file
      alert('Analytics data exported successfully!');
    }, 1500);
  }, []);
  
  // Custom tooltip component for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper 
          elevation={3}
          sx={{ 
            p: 1.5,
            bgcolor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            boxShadow: 3
          }}
        >
          <Typography variant="subtitle2">{label}</Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={`item-${index}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Box 
                sx={{ 
                  width: 12, 
                  height: 12, 
                  bgcolor: entry.color,
                  borderRadius: '50%' 
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {entry.name}: {entry.value.toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    
    return null;
  };
  
  // KPI Card Component
  const KpiCard = ({ 
    title, 
    value, 
    suffix = '', 
    trend, 
    percentage,
    color,
    icon: Icon
  }: { 
    title: string; 
    value: number | string; 
    suffix?: string;
    trend: 'up' | 'down'; 
    percentage: number;
    color: string;
    icon: React.ElementType;
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
          <Box sx={{ 
            p: 1,
            bgcolor: `${color}20`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={20} color={color} />
          </Box>
        </Box>
        
        <Typography variant="h4" component="div" fontWeight="bold" gutterBottom>
          {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box 
            component="span"
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              color: trend === 'up' ? 'success.main' : 'error.main',
              bgcolor: trend === 'up' ? 'success.lighter' : 'error.lighter',
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 'medium'
            }}
          >
            {trend === 'up' ? <Plus size={14} /> : <Minus size={14} />}
            {percentage}%
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            vs previous {timeRange}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
  
  // Render the overview tab
  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* KPI Summary Cards */}
      <Grid item xs={12} md={3}>
        <KpiCard
          title="Active Users"
          value={data.userEngagement.activeUsers}
          trend={kpiValues.newUsers.trend}
          percentage={kpiValues.newUsers.percentage}
          color="#4361ee"
          icon={Users}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <KpiCard
          title="Achievements Earned"
          value={kpiValues.achievementsEarned.value}
          trend={kpiValues.achievementsEarned.trend}
          percentage={kpiValues.achievementsEarned.percentage}
          color="#3a86ff"
          icon={Trophy}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <KpiCard
          title="Rewards Redeemed"
          value={kpiValues.rewardsRedeemed.value}
          trend={kpiValues.rewardsRedeemed.trend}
          percentage={kpiValues.rewardsRedeemed.percentage}
          color="#8338ec"
          icon={Gift}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <KpiCard
          title="Engagement Rate"
          value={kpiValues.engagementRate.value}
          suffix="%"
          trend={kpiValues.engagementRate.trend}
          percentage={kpiValues.engagementRate.percentage}
          color="#ff006e"
          icon={Activity}
        />
      </Grid>
      
      {/* Activity Timeline */}
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title="Activity Timeline" 
            action={
              <Tooltip title="Export data to CSV">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Download size={16} />}
                  onClick={handleExportData}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              </Tooltip>
            }
          />
          <Divider />
          <CardContent>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' && (
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar name="Points Earned" dataKey="pointsEarned" fill="#4361ee" />
                    <Bar name="Points Spent" dataKey="pointsSpent" fill="#ff006e" />
                  </BarChart>
                )}
                
                {chartType === 'line' && (
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" name="Points Earned" dataKey="pointsEarned" stroke="#4361ee" dot={{ r: 3 }} />
                    <Line type="monotone" name="Points Spent" dataKey="pointsSpent" stroke="#ff006e" dot={{ r: 3 }} />
                  </LineChart>
                )}
                
                {chartType === 'area' && (
                  <AreaChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" name="Points Earned" dataKey="pointsEarned" fill="#4361ee33" stroke="#4361ee" />
                    <Area type="monotone" name="Points Spent" dataKey="pointsSpent" fill="#ff006e33" stroke="#ff006e" />
                  </AreaChart>
                )}
                
                {chartType === 'pie' && (
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Points Earned', value: activityData.reduce((sum, item) => sum + item.pointsEarned, 0), color: '#4361ee' },
                        { name: 'Points Spent', value: activityData.reduce((sum, item) => sum + item.pointsSpent, 0), color: '#ff006e' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      dataKey="value"
                      nameKey="name"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Points Earned', value: 0, color: '#4361ee' },
                        { name: 'Points Spent', value: 0, color: '#ff006e' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </Box>
            
            {/* Chart Type Selector */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <ToggleButtonGroup
                value={chartType}
                exclusive
                onChange={handleChartTypeChange}
                size="small"
                aria-label="chart type"
              >
                <ToggleButton value="bar" aria-label="bar chart">
                  <BarChartIcon size={16} />
                </ToggleButton>
                <ToggleButton value="line" aria-label="line chart">
                  <TrendingUp size={16} />
                </ToggleButton>
                <ToggleButton value="area" aria-label="area chart">
                  <Activity size={16} />
                </ToggleButton>
                <ToggleButton value="pie" aria-label="pie chart">
                  <PieChartIcon size={16} />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Tier Distribution & Achievement Completion */}
      <Grid item xs={12} md={6}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Tier Distribution" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {tierDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card sx={{ height: '100%' }}>
          <CardHeader title="Achievement Completion Rates" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={achievementCompletionData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={150} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="completion" radius={[0, 4, 4, 0]}>
                    {achievementCompletionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      {/* At-Risk Users */}
      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title="At-Risk Users" 
            subheader="Users who haven't earned points in 14+ days"
            action={
              <Tooltip title="These users may need re-engagement strategies">
                <HelpCircle size={16} />
              </Tooltip>
            }
          />
          <Divider />
          <CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ display: 'table', minWidth: '100%', borderCollapse: 'collapse' }}>
                <Box sx={{ display: 'table-header-group' }}>
                  <Box sx={{ display: 'table-row' }}>
                    <Box sx={{ display: 'table-cell', p: 2, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>User</Box>
                    <Box sx={{ display: 'table-cell', p: 2, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Tier</Box>
                    <Box sx={{ display: 'table-cell', p: 2, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Last Active</Box>
                    <Box sx={{ display: 'table-cell', p: 2, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Risk Level</Box>
                    <Box sx={{ display: 'table-cell', p: 2, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Action</Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'table-row-group' }}>
                  {riskUsers.map((user) => (
                    <Box key={user.id} sx={{ display: 'table-row' }}>
                      <Box sx={{ display: 'table-cell', p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{user.name}</Box>
                      <Box sx={{ display: 'table-cell', p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <Chip 
                          label={user.tier} 
                          size="small"
                          sx={{ 
                            bgcolor: 
                              user.tier === 'Bronze' ? '#CD7F3233' : 
                              user.tier === 'Silver' ? '#C0C0C033' : 
                              user.tier === 'Gold' ? '#FFD70033' : 
                              '#E5E4E233',
                            color: 
                              user.tier === 'Bronze' ? '#CD7F32' : 
                              user.tier === 'Silver' ? '#808080' : 
                              user.tier === 'Gold' ? '#b8860b' : 
                              '#75748C'
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'table-cell', p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{user.lastActive}</Box>
                      <Box sx={{ display: 'table-cell', p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <Chip 
                          label={user.risk.toUpperCase()} 
                          size="small"
                          color={user.risk === 'high' ? 'error' : 'warning'}
                        />
                      </Box>
                      <Box sx={{ display: 'table-cell', p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <Button 
                          variant="outlined" 
                          size="small"
                          sx={{ minWidth: 'auto' }}
                        >
                          Send Incentive
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Insights Cards */}
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Key Insights" />
          <Divider />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'success.lighter',
                    borderRadius: 2,
                    height: '100%'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Trophy size={18} color="#4caf50" />
                    <Typography variant="subtitle1" color="success.main" gutterBottom>
                      Achievement Impact
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    Users who earn at least 10 achievements show a <strong>78% higher retention rate</strong> than those with fewer achievements.
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'primary.lighter',
                    borderRadius: 2,
                    height: '100%'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Activity size={18} color="#1976d2" />
                    <Typography variant="subtitle1" color="primary.main" gutterBottom>
                      Engagement Trend
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    Overall engagement has <strong>increased by {kpiValues.engagementRate.percentage}%</strong> compared to the previous {timeRange}, driven mainly by the new achievement system.
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'warning.lighter',
                    borderRadius: 2,
                    height: '100%'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <AlertTriangle size={18} color="#ff9800" />
                    <Typography variant="subtitle1" color="warning.main" gutterBottom>
                      Attention Needed
                    </Typography>
                  </Box>
                  <Typography variant="body2">
                    <strong>{riskUsers.length} users</strong> haven't earned points in over 14 days and are at risk of churn. Consider sending personalized incentives.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  // Render the users tab
  const renderUsersTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="User Engagement Metrics" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" name="Active Users" dataKey="activeUsers" stroke="#4361ee" dot={{ r: 3 }} />
                  <Line type="monotone" name="New Users" dataKey="newUsers" stroke="#3a86ff" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Engagement by Achievement Count" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar name="Retention %" dataKey="retention" fill="#4361ee" />
                  <Bar name="Engagement %" dataKey="engagement" fill="#ff006e" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Card>
          <CardHeader title="User Retention by Tier" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userRetentionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis dataKey="tier" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar name="Retention %" dataKey="retention">
                    {userRetentionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.tier === 'Bronze' ? '#CD7F32' : 
                          entry.tier === 'Silver' ? '#C0C0C0' : 
                          entry.tier === 'Gold' ? '#FFD700' : 
                          '#E5E4E2'
                        } 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  // Render the achievements tab
  const renderAchievementsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Achievement Completion Rates" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={achievementCompletionData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" width={150} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="completion" radius={[0, 4, 4, 0]}>
                    {achievementCompletionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Achievements Earned Over Time" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    name="Achievements Earned" 
                    dataKey="achievementsEarned" 
                    fill="#8338ec33" 
                    stroke="#8338ec" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  // Render the rewards tab
  const renderRewardsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Reward Redemptions" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rewardRedemptionData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={150} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="redemptions" radius={[0, 4, 4, 0]}>
                    {rewardRedemptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Rewards Redeemed Over Time" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    name="Rewards Redeemed" 
                    dataKey="rewardsRedeemed" 
                    fill="#ff006e33" 
                    stroke="#ff006e" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Points Economy" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar name="Points Earned" dataKey="pointsEarned" fill="#4361ee" />
                  <Bar name="Points Spent" dataKey="pointsSpent" fill="#ff006e" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Points Economy Health
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'primary.lighter',
                      borderRadius: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Total Points Issued</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {kpiValues.pointsEarned.value.toLocaleString()}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'error.lighter',
                      borderRadius: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Total Points Spent</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {kpiValues.pointsSpent.value.toLocaleString()}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      bgcolor: 'warning.lighter',
                      borderRadius: 2
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Points Economy Rate</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {kpiValues.pointsEconomy.value}%
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  // Render the tiers tab
  const renderTiersTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Tier Distribution" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierDistributionData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {tierDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Tier Distribution Over Time" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tierProgressionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="bronze"
                    stackId="1"
                    stroke="#CD7F32"
                    fill="#CD7F3266"
                    name="Bronze"
                  />
                  <Area
                    type="monotone"
                    dataKey="silver"
                    stackId="1"
                    stroke="#C0C0C0"
                    fill="#C0C0C066"
                    name="Silver"
                  />
                  <Area
                    type="monotone"
                    dataKey="gold"
                    stackId="1"
                    stroke="#FFD700"
                    fill="#FFD70066"
                    name="Gold"
                  />
                  <Area
                    type="monotone"
                    dataKey="platinum"
                    stackId="1"
                    stroke="#E5E4E2"
                    fill="#E5E4E266"
                    name="Platinum"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  // Render the trends tab
  const renderTrendsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Engagement Rate Trends" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    name="Engagement Rate (%)" 
                    dataKey="engagementRate" 
                    stroke="#4361ee" 
                    dot={{ r: 3 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Achievement vs. Retention" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.1)" />
                  <XAxis type="number" dataKey="achievements" name="Achievements" />
                  <YAxis type="number" dataKey="retention" name="Retention %" />
                  <ZAxis type="number" range={[100, 600]} />
                  <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                  <Legend />
                  <Scatter name="User Segments" data={engagementData} fill="#8338ec" />
                </ScatterChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Skill Analysis" />
          <Divider />
          <CardContent>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                  { subject: 'User Acquisition', A: 85, B: 75, fullMark: 100 },
                  { subject: 'Retention', A: 78, B: 65, fullMark: 100 },
                  { subject: 'Engagement', A: 83, B: 72, fullMark: 100 },
                  { subject: 'Achievement Rate', A: 72, B: 60, fullMark: 100 },
                  { subject: 'Reward Usage', A: 65, B: 55, fullMark: 100 },
                  { subject: 'Points Economy', A: 70, B: 60, fullMark: 100 },
                ]}>
                  <PolarGrid stroke="rgba(0, 0, 0, 0.1)" />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Current" dataKey="A" stroke="#8338ec" fill="#8338ec" fillOpacity={0.3} />
                  <Radar name="Previous" dataKey="B" stroke="#ff006e" fill="#ff006e" fillOpacity={0.3} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Gamification Analytics Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant={activeTab === 'overview' ? 'contained' : 'outlined'}
              startIcon={<Activity size={16} />}
              size="small"
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </Button>
            <Button
              variant={activeTab === 'users' ? 'contained' : 'outlined'}
              startIcon={<Users size={16} />}
              size="small"
              onClick={() => setActiveTab('users')}
            >
              Users
            </Button>
            <Button
              variant={activeTab === 'achievements' ? 'contained' : 'outlined'}
              startIcon={<Trophy size={16} />}
              size="small"
              onClick={() => setActiveTab('achievements')}
            >
              Achievements
            </Button>
            <Button
              variant={activeTab === 'rewards' ? 'contained' : 'outlined'}
              startIcon={<Gift size={16} />}
              size="small"
              onClick={() => setActiveTab('rewards')}
            >
              Rewards
            </Button>
            <Button
              variant={activeTab === 'tiers' ? 'contained' : 'outlined'}
              startIcon={<Award size={16} />}
              size="small"
              onClick={() => setActiveTab('tiers')}
            >
              Tiers
            </Button>
            <Button
              variant={activeTab === 'trends' ? 'contained' : 'outlined'}
              startIcon={<TrendingUp size={16} />}
              size="small"
              onClick={() => setActiveTab('trends')}
            >
              Trends
            </Button>
          </Box>
          
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            size="small"
            aria-label="time range"
          >
            <ToggleButton value="week" aria-label="last week">
              Week
            </ToggleButton>
            <ToggleButton value="month" aria-label="last month">
              Month
            </ToggleButton>
            <ToggleButton value="quarter" aria-label="last quarter">
              Quarter
            </ToggleButton>
            <ToggleButton value="year" aria-label="last year">
              Year
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      
      {/* Render appropriate tab content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'users' && renderUsersTab()}
      {activeTab === 'achievements' && renderAchievementsTab()}
      {activeTab === 'rewards' && renderRewardsTab()}
      {activeTab === 'tiers' && renderTiersTab()}
      {activeTab === 'trends' && renderTrendsTab()}
    </Box>
  );
};

export default React.memo(EnhancedSystemAnalytics);
