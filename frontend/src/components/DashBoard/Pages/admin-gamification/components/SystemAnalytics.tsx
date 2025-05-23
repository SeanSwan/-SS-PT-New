import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  Trophy,
  Award,
  Users,
  Star,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Gift,
  Medal,
  Calendar,
  BarChart,
  PieChart,
  Activity
} from 'lucide-react';

/**
 * SystemAnalytics Component
 * 
 * Provides comprehensive analytics and insights for the gamification system
 * Displays user engagement metrics, achievement statistics, reward usage, and tier distribution
 */
const SystemAnalytics: React.FC<{ data: any }> = ({ data }) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(!data);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [timeRange, setTimeRange] = useState<string>('month');
  
  useEffect(() => {
    // Simulate loading state if data not provided
    if (!data) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [data]);
  
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="text.secondary">
          No analytics data available. Please try again later.
        </Typography>
      </Box>
    );
  }
  
  // Analytics navigation tabs
  const renderAnalyticsTabs = () => (
    <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
      <Button 
        variant={activeTab === 'overview' ? 'contained' : 'outlined'}
        onClick={() => setActiveTab('overview')}
        startIcon={<Activity size={18} />}
        size="small"
      >
        Overview
      </Button>
      <Button 
        variant={activeTab === 'users' ? 'contained' : 'outlined'}
        onClick={() => setActiveTab('users')}
        startIcon={<Users size={18} />}
        size="small"
      >
        User Engagement
      </Button>
      <Button 
        variant={activeTab === 'achievements' ? 'contained' : 'outlined'}
        onClick={() => setActiveTab('achievements')}
        startIcon={<Trophy size={18} />}
        size="small"
      >
        Achievements
      </Button>
      <Button 
        variant={activeTab === 'rewards' ? 'contained' : 'outlined'}
        onClick={() => setActiveTab('rewards')}
        startIcon={<Gift size={18} />}
        size="small"
      >
        Rewards
      </Button>
      <Button 
        variant={activeTab === 'tiers' ? 'contained' : 'outlined'}
        onClick={() => setActiveTab('tiers')}
        startIcon={<Award size={18} />}
        size="small"
      >
        Tiers
      </Button>
      <Button 
        variant={activeTab === 'trends' ? 'contained' : 'outlined'}
        onClick={() => setActiveTab('trends')}
        startIcon={<TrendingUp size={18} />}
        size="small"
      >
        Trends
      </Button>
    </Box>
  );
  
  // Time range selector
  const renderTimeRange = () => (
    <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
      <Button 
        variant={timeRange === 'week' ? 'contained' : 'outlined'}
        onClick={() => setTimeRange('week')}
        size="small"
        color="secondary"
      >
        Last Week
      </Button>
      <Button 
        variant={timeRange === 'month' ? 'contained' : 'outlined'}
        onClick={() => setTimeRange('month')}
        size="small"
        color="secondary"
      >
        Last Month
      </Button>
      <Button 
        variant={timeRange === 'quarter' ? 'contained' : 'outlined'}
        onClick={() => setTimeRange('quarter')}
        size="small"
        color="secondary"
      >
        Last Quarter
      </Button>
      <Button 
        variant={timeRange === 'year' ? 'contained' : 'outlined'}
        onClick={() => setTimeRange('year')}
        size="small"
        color="secondary"
      >
        Last Year
      </Button>
    </Box>
  );
  
  // Stat card component
  const StatCard = ({ title, value, icon, trend, trendValue, color }: { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string | number;
    color?: string;
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" color="text.secondary">
            {title}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 1.5,
            borderRadius: '50%',
            bgcolor: color ? `${color}.light` : 'primary.light',
            color: color ? `${color}.main` : 'primary.main'
          }}>
            {icon}
          </Box>
        </Box>
        
        <Typography variant="h4" component="div" fontWeight="bold">
          {value}
        </Typography>
        
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {trend === 'up' ? (
              <ChevronUp size={16} color="#4caf50" />
            ) : trend === 'down' ? (
              <ChevronDown size={16} color="#f44336" />
            ) : (
              <Typography variant="body2" component="span" sx={{ mr: 0.5 }}>•</Typography>
            )}
            <Typography 
              variant="body2" 
              color={
                trend === 'up' ? 'success.main' : 
                trend === 'down' ? 'error.main' : 
                'text.secondary'
              }
            >
              {trendValue}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
  
  // Overview tab content
  const renderOverviewTab = () => (
    <Box>
      <Grid container spacing={3}>
        {/* User Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={data.userEngagement.totalUsers}
            icon={<Users size={24} />}
            trend="up"
            trendValue="8% from last month"
            color="primary"
          />
        </Grid>
        
        {/* Achievements Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Achievements Earned"
            value={data.achievementStats.totalAchievementsEarned}
            icon={<Trophy size={24} />}
            trend="up"
            trendValue="12% from last month"
            color="warning"
          />
        </Grid>
        
        {/* Rewards Stats */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Rewards Redeemed"
            value={data.rewardStats.totalRewardsRedeemed}
            icon={<Gift size={24} />}
            trend="up"
            trendValue="5% from last month"
            color="success"
          />
        </Grid>
        
        {/* Engagement Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Engagement Rate"
            value={`${data.userEngagement.engagementRate}%`}
            icon={<Activity size={24} />}
            trend="up"
            trendValue="3% from last month"
            color="info"
          />
        </Grid>
        
        {/* Tier Distribution */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Tier Distribution" />
            <CardContent>
              <Box sx={{ height: 250, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end' }}>
                {data.tierDistribution.map((tier: any, index: number) => {
                  // Different colors for each tier
                  const colors = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2'];
                  return (
                    <Box key={tier.tier} sx={{ textAlign: 'center', width: '20%' }}>
                      <Box 
                        sx={{ 
                          height: `${tier.percentage * 2}px`, 
                          backgroundColor: colors[index],
                          width: '70%',
                          margin: '0 auto',
                          borderTopLeftRadius: 4,
                          borderTopRightRadius: 4,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            opacity: 0.8,
                            transform: 'translateY(-5px)'
                          }
                        }}
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {tier.count} users ({tier.percentage}%)
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Most Popular Items */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Popular Items" />
            <CardContent>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  <Trophy size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Most Popular Achievement
                </Typography>
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body1" fontWeight="bold">
                    {data.achievementStats.mostPopularAchievement.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {data.achievementStats.mostPopularAchievement.description}
                  </Typography>
                  <Chip 
                    label={`Earned by ${data.achievementStats.mostPopularAchievement.count} users`}
                    color="primary"
                    size="small"
                  />
                </Paper>
                
                <Typography variant="subtitle1" gutterBottom>
                  <Gift size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Most Redeemed Reward
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="body1" fontWeight="bold">
                    {data.rewardStats.mostRedeemedReward.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {data.rewardStats.mostRedeemedReward.description}
                  </Typography>
                  <Chip 
                    label={`Redeemed ${data.rewardStats.mostRedeemedReward.count} times`}
                    color="primary"
                    size="small"
                  />
                </Paper>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Recent Activity" />
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>New Users</TableCell>
                      <TableCell>Achievements Earned</TableCell>
                      <TableCell>Points Earned</TableCell>
                      <TableCell>Points Spent</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.timeSeriesData.map((item: any) => (
                      <TableRow key={item.date}>
                        <TableCell>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</TableCell>
                        <TableCell>{item.newUsers}</TableCell>
                        <TableCell>{item.achievementsEarned}</TableCell>
                        <TableCell>{item.pointsEarned.toLocaleString()}</TableCell>
                        <TableCell>{item.pointsSpent.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
  
  // User Engagement tab content
  const renderUsersTab = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="User Engagement Metrics" />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemIcon><Users size={20} /></ListItemIcon>
                  <ListItemText 
                    primary="Total Users" 
                    secondary={`${data.userEngagement.totalUsers} registered users in the system`} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Activity size={20} /></ListItemIcon>
                  <ListItemText 
                    primary="Active Users" 
                    secondary={`${data.userEngagement.activeUsers} active users (${data.userEngagement.engagementRate}% engagement rate)`} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Star size={20} /></ListItemIcon>
                  <ListItemText 
                    primary="Average Points" 
                    secondary={`${data.userEngagement.averagePointsPerUser.toLocaleString()} points per user`} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><TrendingUp size={20} /></ListItemIcon>
                  <ListItemText 
                    primary="Average Level" 
                    secondary={`Level ${data.userEngagement.averageLevelPerUser} average across all users`} 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="User Level Distribution" />
            <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                User level distribution chart would be displayed here in a real implementation. 
                The chart would show the number of users at each level.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardHeader title="User Activity Timeline" />
            <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                User activity timeline chart would be displayed here in a real implementation.
                The chart would show daily active users over time.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
  
  // Achievement Stats tab content
  const renderAchievementsTab = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Achievement Statistics" />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemIcon><Trophy size={20} /></ListItemIcon>
                  <ListItemText 
                    primary="Total Achievements Earned" 
                    secondary={`${data.achievementStats.totalAchievementsEarned} achievements earned by all users`} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Medal size={20} /></ListItemIcon>
                  <ListItemText 
                    primary="Completion Rate" 
                    secondary={`${data.achievementStats.achievementCompletionRate}% overall achievement completion rate`} 
                  />
                </ListItem>
                <Divider sx={{ my: 2 }} />
                <ListItem>
                  <ListItemIcon><ChevronUp size={20} color={theme.palette.success.main} /></ListItemIcon>
                  <ListItemText 
                    primary="Most Popular Achievement" 
                    secondary={
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {data.achievementStats.mostPopularAchievement.name}
                        </Typography>
                        <Typography variant="body2">
                          {data.achievementStats.mostPopularAchievement.description}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          Earned by {data.achievementStats.mostPopularAchievement.count} users
                        </Typography>
                      </Box>
                    } 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ChevronDown size={20} color={theme.palette.error.main} /></ListItemIcon>
                  <ListItemText 
                    primary="Least Popular Achievement" 
                    secondary={
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {data.achievementStats.leastPopularAchievement.name}
                        </Typography>
                        <Typography variant="body2">
                          {data.achievementStats.leastPopularAchievement.description}
                        </Typography>
                        <Typography variant="body2" color="error.main">
                          Earned by only {data.achievementStats.leastPopularAchievement.count} users
                        </Typography>
                      </Box>
                    } 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Achievement Completion Rates" />
            <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Achievement completion rates chart would be displayed here in a real implementation.
                The chart would show the percentage of users who have earned each achievement.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Achievement Earning Timeline" />
            <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Achievement earning timeline chart would be displayed here in a real implementation.
                The chart would show achievement earning trends over time.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
  
  // Rewards Stats tab content
  const renderRewardsTab = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Reward Statistics" />
            <CardContent>
              <List>
                <ListItem>
                  <ListItemIcon><Gift size={20} /></ListItemIcon>
                  <ListItemText 
                    primary="Total Rewards Redeemed" 
                    secondary={`${data.rewardStats.totalRewardsRedeemed} rewards redeemed by all users`} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><Star size={20} /></ListItemIcon>
                  <ListItemText 
                    primary="Points Spent" 
                    secondary={`${data.rewardStats.totalPointsSpent.toLocaleString()} total points spent on rewards`} 
                  />
                </ListItem>
                <Divider sx={{ my: 2 }} />
                <ListItem>
                  <ListItemIcon><ChevronUp size={20} color={theme.palette.success.main} /></ListItemIcon>
                  <ListItemText 
                    primary="Most Redeemed Reward" 
                    secondary={
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {data.rewardStats.mostRedeemedReward.name}
                        </Typography>
                        <Typography variant="body2">
                          {data.rewardStats.mostRedeemedReward.description}
                        </Typography>
                        <Typography variant="body2" color="success.main">
                          Redeemed {data.rewardStats.mostRedeemedReward.count} times
                        </Typography>
                      </Box>
                    } 
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><ChevronDown size={20} color={theme.palette.error.main} /></ListItemIcon>
                  <ListItemText 
                    primary="Least Redeemed Reward" 
                    secondary={
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {data.rewardStats.leastRedeemedReward.name}
                        </Typography>
                        <Typography variant="body2">
                          {data.rewardStats.leastRedeemedReward.description}
                        </Typography>
                        <Typography variant="body2" color="error.main">
                          Redeemed only {data.rewardStats.leastRedeemedReward.count} times
                        </Typography>
                      </Box>
                    } 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Reward Redemption Distribution" />
            <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Reward redemption distribution chart would be displayed here in a real implementation.
                The chart would show the percentage of total redemptions for each reward.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Reward Redemption Timeline" />
            <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Reward redemption timeline chart would be displayed here in a real implementation.
                The chart would show reward redemption trends over time.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
  
  // Tiers tab content
  const renderTiersTab = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Tier Distribution" />
            <CardContent>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tier</TableCell>
                      <TableCell>Users</TableCell>
                      <TableCell>Percentage</TableCell>
                      <TableCell>Visualization</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.tierDistribution.map((tier: any) => {
                      // Get tier-appropriate colors
                      let color: string;
                      switch (tier.tier) {
                        case 'bronze': color = '#CD7F32'; break;
                        case 'silver': color = '#C0C0C0'; break;
                        case 'gold': color = '#FFD700'; break;
                        case 'platinum': color = '#E5E4E2'; break;
                        default: color = '#1976D2';
                      }
                      
                      return (
                        <TableRow key={tier.tier}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                width: 16, 
                                height: 16, 
                                borderRadius: '50%', 
                                bgcolor: color 
                              }} />
                              <Typography>
                                {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{tier.count}</TableCell>
                          <TableCell>{tier.percentage}%</TableCell>
                          <TableCell>
                            <Box sx={{ width: '100%', bgcolor: 'background.paper', height: 10, position: 'relative' }}>
                              <Box 
                                sx={{ 
                                  position: 'absolute',
                                  left: 0,
                                  top: 0,
                                  height: '100%',
                                  width: `${tier.percentage}%`,
                                  bgcolor: color,
                                  borderRadius: 1
                                }}
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Tier Distribution" />
            <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Box sx={{ 
                width: '100%', 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative'
              }}>
                <svg width="250" height="250" viewBox="0 0 100 100">
                  {/* Manually create a simple pie chart */}
                  <circle cx="50" cy="50" r="50" fill="#f5f5f5" />
                  
                  {/* Platinum - smallest slice */}
                  <path 
                    d="M 50 50 L 50 0 A 50 50 0 0 1 64 3 Z" 
                    fill="#E5E4E2" 
                  />
                  
                  {/* Gold slice */}
                  <path 
                    d="M 50 50 L 64 3 A 50 50 0 0 1 90 30 Z" 
                    fill="#FFD700" 
                  />
                  
                  {/* Silver slice */}
                  <path 
                    d="M 50 50 L 90 30 A 50 50 0 0 1 70 90 Z" 
                    fill="#C0C0C0" 
                  />
                  
                  {/* Bronze - largest slice */}
                  <path 
                    d="M 50 50 L 70 90 A 50 50 0 0 1 0 50 A 50 50 0 0 1 50 0 Z" 
                    fill="#CD7F32" 
                  />
                  
                  {/* Inner circle for donut effect */}
                  <circle cx="50" cy="50" r="30" fill="white" />
                </svg>
                
                {/* Legend */}
                <Box sx={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  left: 0, 
                  width: '100%', 
                  display: 'flex', 
                  justifyContent: 'center',
                  gap: 2
                }}>
                  {data.tierDistribution.map((tier: any) => {
                    let color: string;
                    switch (tier.tier) {
                      case 'bronze': color = '#CD7F32'; break;
                      case 'silver': color = '#C0C0C0'; break;
                      case 'gold': color = '#FFD700'; break;
                      case 'platinum': color = '#E5E4E2'; break;
                      default: color = '#1976D2';
                    }
                    
                    return (
                      <Box key={tier.tier} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 12, height: 12, bgcolor: color, borderRadius: '50%' }} />
                        <Typography variant="caption">
                          {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Tier Progression Timeline" />
            <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Tier progression timeline chart would be displayed here in a real implementation.
                The chart would show how users progress through tiers over time.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
  
  // Trends tab content
  const renderTrendsTab = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="System Growth" />
            <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                System growth chart would be displayed here in a real implementation.
                The chart would show user growth, achievement completions, and reward redemptions over time.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Points Economy" />
            <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Points economy chart would be displayed here in a real implementation.
                The chart would show points earned vs. points spent over time.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="User Retention" />
            <CardContent sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                User retention chart would be displayed here in a real implementation.
                The chart would show user retention rates in relation to achievements and rewards.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Analytics Summary" />
            <CardContent>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Key Insights:
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><TrendingUp size={18} color={theme.palette.success.main} /></ListItemIcon>
                    <ListItemText primary="User engagement shows a positive trend, with an 8% increase in active users over the last month." />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Trophy size={18} color={theme.palette.warning.main} /></ListItemIcon>
                    <ListItemText primary={`"${data.achievementStats.mostPopularAchievement.name}" is the most popular achievement, with a 90% completion rate among active users.`} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Gift size={18} color={theme.palette.primary.main} /></ListItemIcon>
                    <ListItemText primary={`"${data.rewardStats.mostRedeemedReward.name}" is the most redeemed reward, accounting for 36% of all reward redemptions.`} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><Award size={18} color="#FFD700" /></ListItemIcon>
                    <ListItemText primary="The Gold tier is seeing increased progression, with a 17% growth in users reaching this tier." />
                  </ListItem>
                </List>
              </Box>
              
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 2 }}
                startIcon={<BarChart size={18} />}
              >
                Generate Full Reports
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
  
  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Gamification System Analytics
      </Typography>
      
      <Typography variant="body1" paragraph>
        View comprehensive analytics for your gamification system. Use these insights to optimize engagement and user experience.
      </Typography>
      
      {/* Tabs navigation */}
      {renderAnalyticsTabs()}
      
      {/* Time range selector - only on relevant tabs */}
      {(activeTab === 'trends' || activeTab === 'users') && renderTimeRange()}
      
      {/* Tab content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'users' && renderUsersTab()}
      {activeTab === 'achievements' && renderAchievementsTab()}
      {activeTab === 'rewards' && renderRewardsTab()}
      {activeTab === 'tiers' && renderTiersTab()}
      {activeTab === 'trends' && renderTrendsTab()}
    </Box>
  );
};

export default React.memo(SystemAnalytics);
