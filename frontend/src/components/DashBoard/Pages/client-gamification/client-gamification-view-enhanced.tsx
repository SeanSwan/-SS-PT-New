import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  CircularProgress,
  Badge,
  Skeleton,
  Tabs,
  Tab,
  Divider,
  Tooltip
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Award,
  Gift,
  TrendingUp,
  Trophy,
  Star,
  Clock,
  Target,
  Medal,
  Users,
  AlertCircle,
  Activity,
  Zap,
  Sparkles
} from 'lucide-react';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';
import { useGamificationRealtime } from '../../../../hooks/gamification/useGamificationRealtime';
import { useAuth } from '../../../../context/AuthContext';

// Import components
import Leaderboard from './components/Leaderboard';
import ActivityFeed from './components/ActivityFeed';
import AchievementGallery from './components/AchievementGallery';

// Lazy load the progress chart component to improve initial load time
const ProgressChart = lazy(() => import('./components/ProgressChart'));

// Create styled components
const MotionBox = motion.create(Box);

// Tab Panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`gamification-tabpanel-${index}`}
      aria-labelledby={`gamification-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `gamification-tab-${index}`,
    'aria-controls': `gamification-tabpanel-${index}`,
  };
}

/**
 * Enhanced Client Gamification Dashboard with optimized performance
 * Implements the recommendations from Gemini including:
 * - Data flow & state management using React Query custom hooks
 * - Leaderboard, Achievements/Badges, Activity Feed components
 * - Real-time updates for immediate feedback
 * - Performance optimizations and code splitting
 */
const EnhancedClientGamificationView: React.FC = () => {
  const { user } = useAuth();
  const { profile, leaderboard, achievements, rewards, isLoading, error, redeemReward, invalidateProfile } = useGamificationData();
  const { triggerMockEvent } = useGamificationRealtime();
  
  // State with performance optimizations
  const [tabValue, setTabValue] = useState(0);
  const [rewardDialogOpen, setRewardDialogOpen] = useState<boolean>(false);
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [chartLoading, setChartLoading] = useState<boolean>(false);

  // Calculate points gained in last month
  const lastMonth = useMemo(() => {
    if (!profile.data?.progressSnapshots || profile.data.progressSnapshots.length < 2) return 0;
    
    const oldestSnapshot = profile.data.progressSnapshots[0];
    const newestSnapshot = profile.data.progressSnapshots[profile.data.progressSnapshots.length - 1];
    return newestSnapshot.points - oldestSnapshot.points;
  }, [profile.data?.progressSnapshots]);
  
  // Handle tab change with performance optimization
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Only load chart data when Progress tab is selected (index 4)
    if (newValue === 4 && !chartLoading) {
      setChartLoading(true);
    }
  }, [chartLoading]);

  // Format date utility function
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);
  
  // Track mock achievement button for demo purposes
  const triggerMockAchievement = useCallback(() => {
    // Demo achievement
    const mockAchievement = {
      achievement: {
        id: 'mock-achievement-1',
        name: 'Quick Learner',
        description: 'Learn how real-time gamification updates work',
        icon: 'Star',
        pointValue: 50,
        requirementType: 'special',
        requirementValue: 1,
        tier: 'bronze',
        isActive: true
      },
      pointsAwarded: 50
    };
    
    // Trigger mock achievement event
    triggerMockEvent('achievement_unlocked', mockAchievement);
    
    // Invalidate profile data to update the UI
    setTimeout(() => {
      invalidateProfile();
    }, 500);
  }, [triggerMockEvent, invalidateProfile]);
  
  // Track mock points award for demo purposes
  const triggerMockPointsAward = useCallback(() => {
    // Demo points award
    const mockPoints = {
      points: 25,
      source: 'daily_check_in',
      description: 'Daily Check-in Bonus',
      balance: (profile.data?.points || 0) + 25
    };
    
    // Trigger mock points event
    triggerMockEvent('points_awarded', mockPoints);
    
    // Invalidate profile data to update the UI
    setTimeout(() => {
      invalidateProfile();
    }, 500);
  }, [triggerMockEvent, invalidateProfile, profile.data?.points]);
  
  // Render loading state
  if (isLoading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '50vh',
        flexDirection: 'column',
        gap: 2
      }}
        data-testid="loading-spinner"
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" color="text.secondary">
          Loading Gamification Data...
        </Typography>
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom color="error">
          Error Loading Gamification
        </Typography>
        <Typography paragraph>
          {error instanceof Error ? error.message : 'Failed to load gamification data'}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ mt: 2 }}
          onClick={() => invalidateProfile()}
          data-testid="retry-button"
        >
          Retry
        </Button>
      </Box>
    );
  }
  
  // Render empty state - not enough data to display
  if (!profile.data) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Welcome to Fitness Gamification!
        </Typography>
        <Typography paragraph>
          Start your fitness journey to see your progress and earn achievements.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          sx={{ mt: 2 }}
          onClick={triggerMockPointsAward}
        >
          Start Your Journey
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', pb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Your Fitness Journey
      </Typography>
      
      {/* Profile Summary Card */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 2,
          background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05), rgba(25, 118, 210, 0.15))'
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar 
                src={profile.data.photo || undefined}
                sx={{ width: 64, height: 64, mr: 2 }}
              >
                {profile.data.firstName[0]}{profile.data.lastName[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" component="h2">
                  {profile.data.firstName} {profile.data.lastName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip 
                    label={`Level ${profile.data.level}`}
                    color="primary" 
                    size="small"
                  />
                  <Chip 
                    label={profile.data.tier.toUpperCase()}
                    color={
                      profile.data.tier === 'bronze' ? 'default' :
                      profile.data.tier === 'silver' ? 'primary' :
                      profile.data.tier === 'gold' ? 'warning' :
                      'secondary'
                    }
                    size="small"
                  />
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Star size={16} color="#FFC107" style={{ marginRight: 4 }} />
                <Typography variant="h6" component="span" fontWeight="bold">
                  {profile.data.points.toLocaleString()}
                </Typography>
                <Typography variant="body2" component="span" color="text.secondary" sx={{ ml: 0.5 }}>
                  points
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Badge 
                  badgeContent={profile.data.streakDays} 
                  color="primary"
                  sx={{ mr: 1 }}
                >
                  <Zap size={16} color="#1976D2" />
                </Badge>
                <Typography variant="body2" component="span" color="text.secondary">
                  day streak
                </Typography>
              </Box>
              
              {/* Demo buttons - for testing real-time updates */}
              <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                <Tooltip title="Demo: Earn Points">
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<Star size={14} />}
                    onClick={triggerMockPointsAward}
                    color="primary"
                  >
                    +25 pts
                  </Button>
                </Tooltip>
                
                <Tooltip title="Demo: Earn Achievement">
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<Trophy size={14} />}
                    onClick={triggerMockAchievement}
                    color="warning"
                  >
                    Unlock
                  </Button>
                </Tooltip>
              </Box>
            </Box>
            
            {/* Next Level Progress */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Progress to Level {profile.data.level + 1}
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {Math.round(profile.data.nextLevelProgress)}%
                </Typography>
              </Box>
              <Box sx={{ position: 'relative', height: 8, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                <Box 
                  sx={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${profile.data.nextLevelProgress}%`,
                    bgcolor: 'primary.main',
                    borderRadius: 4
                  }}
                />
              </Box>
            </Box>
            
            {/* Next Tier Progress */}
            {profile.data.nextTier && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Progress to {profile.data.nextTier.charAt(0).toUpperCase() + profile.data.nextTier.slice(1)} Tier
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {Math.round(profile.data.nextTierProgress)}%
                  </Typography>
                </Box>
                <Box sx={{ position: 'relative', height: 8, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                  <Box 
                    sx={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${profile.data.nextTierProgress}%`,
                      bgcolor: profile.data.nextTier === 'silver' ? '#C0C0C0' : 
                              profile.data.nextTier === 'gold' ? '#FFD700' : 
                              '#E5E4E2',
                      borderRadius: 4
                    }}
                  />
                </Box>
              </Box>
            )}
          </Grid>
          
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2, borderRadius: 2, height: '100%', bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Trophy size={18} /> 
                <Typography variant="subtitle1" fontWeight="bold">STATS OVERVIEW</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h5" component="div" color="primary.main">
                      {profile.data.achievements?.filter(a => a.isCompleted).length || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Achievements
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h5" component="div" color="primary.main">
                      {profile.data.leaderboardPosition || '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Leaderboard Rank
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h5" component="div" color="primary.main">
                      {profile.data.milestones?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Milestones
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h5" component="div" color="primary.main">
                      {profile.data.rewards?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Rewards Redeemed
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {profile.data.nextMilestone && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Next Milestone:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', bgcolor: 'rgba(0, 0, 0, 0.08)' }}>
                      <Award size={14} />
                    </Box>
                    <Typography variant="body2">{profile.data.nextMilestone.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      ({profile.data.points.toLocaleString()} / {profile.data.nextMilestone.targetPoints.toLocaleString()} pts)
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {/* Monthly Progress */}
              <Box 
                sx={{ 
                  mt: 2, 
                  p: 2, 
                  bgcolor: 'primary.light', 
                  color: 'white', 
                  borderRadius: 1,
                  animation: lastMonth > 500 ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.5)' },
                    '70%': { boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)' },
                    '100%': { boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)' }
                  }
                }} 
                data-testid="monthly-progress"
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  Last 30 Days: +{lastMonth.toLocaleString()} Points
                </Typography>
                <Typography variant="body2">
                  {lastMonth > 1000 ? 'Outstanding progress!' : 
                  lastMonth > 500 ? 'Excellent work!' : 
                  lastMonth > 100 ? 'Good effort!' : 'Keep going!'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Dashboard Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="gamification tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            '& .MuiTabs-indicator': { 
              height: 3,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3
            } 
          }}
          data-testid="gamification-tabs"
        >
          <Tab label="Dashboard" icon={<Activity size={18} />} iconPosition="start" {...a11yProps(0)} />
          <Tab label="Achievements" icon={<Medal size={18} />} iconPosition="start" {...a11yProps(1)} />
          <Tab label="Activity" icon={<Clock size={18} />} iconPosition="start" {...a11yProps(2)} />
          <Tab label="Leaderboard" icon={<Users size={18} />} iconPosition="start" {...a11yProps(3)} />
          <Tab label="Progress" icon={<TrendingUp size={18} />} iconPosition="start" {...a11yProps(4)} />
        </Tabs>
      </Box>
      
      {/* Dashboard Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Recent Achievements */}
          <Grid item xs={12} md={7}>
            <AchievementGallery 
              showHeader={true} 
              filter="completed" 
              limit={3} 
            />
          </Grid>
          
          {/* Leaderboard */}
          <Grid item xs={12} md={5}>
            <Leaderboard 
              showHeader={true} 
              compact={true}
              limit={5}
              highlightUserId={user?.id}
            />
          </Grid>
          
          {/* Activity Feed */}
          <Grid item xs={12}>
            <ActivityFeed
              showHeader={true}
              limit={5}
            />
          </Grid>
          
          {/* Next Upcoming Milestone */}
          {profile.data.nextMilestone && (
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" component="h3" gutterBottom>
                  Your Next Milestone
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mt: 2 }}>
                  <Box 
                    sx={{ 
                      width: 60, 
                      height: 60, 
                      bgcolor: 'rgba(0,0,0,0.05)', 
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Award size={30} />
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      {profile.data.nextMilestone.name}
                    </Typography>
                    
                    <Typography variant="body2" paragraph sx={{ mb: 2 }}>
                      {profile.data.nextMilestone.description}
                    </Typography>
                    
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {Math.round(profile.data.points / profile.data.nextMilestone.targetPoints * 100)}% Complete
                      </Typography>
                      
                      <Box sx={{ position: 'relative', height: 8, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <Box 
                          sx={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: `${Math.round(profile.data.points / profile.data.nextMilestone.targetPoints * 100)}%`,
                            bgcolor: 'success.main',
                            borderRadius: 4
                          }}
                        />
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        <span style={{ fontWeight: 'bold' }}>{profile.data.points.toLocaleString()}</span> / {profile.data.nextMilestone.targetPoints.toLocaleString()} points
                      </Typography>
                      
                      <Chip 
                        size="small" 
                        color="success" 
                        icon={<Sparkles size={14} />} 
                        label={`+${profile.data.nextMilestone.bonusPoints} bonus pts`} 
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      </TabPanel>
      
      {/* Achievements Tab */}
      <TabPanel value={tabValue} index={1}>
        <AchievementGallery showHeader={false} />
      </TabPanel>
      
      {/* Activity Tab */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {/* Activity Feed */}
          <Grid item xs={12} md={8}>
            <ActivityFeed 
              showHeader={true}
              limit={10}
              categoryFilter="all"
            />
          </Grid>
          
          {/* Streak Calendar */}
          <Grid item xs={12} md={4}>
            {profile.data.streakCalendar && (
              <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Workout Streak Calendar
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Zap size={16} color="#1976D2" />
                    <Typography variant="body2" color="primary" fontWeight="bold">
                      {profile.data.streakDays} Day Streak!
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }} data-testid="streak-calendar">
                  {profile.data.streakCalendar.map((day, index) => {
                    const date = new Date(day.date);
                    const now = new Date();
                    const isToday = now.toDateString() === date.toDateString();
                    
                    return (
                      <Tooltip 
                        key={day.date}
                        title={day.completed ? `${date.toLocaleDateString()}: ${day.points} points earned` : date.toLocaleDateString()}
                        arrow
                      >
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: day.completed ? 'success.light' : 'background.paper',
                            border: isToday ? '2px solid' : '1px solid',
                            borderColor: isToday ? 'primary.main' : 'divider',
                            borderRadius: 1,
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'scale(1.1)',
                              zIndex: 1,
                              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                            }
                          }}
                        >
                          <Typography variant="caption" fontWeight={isToday ? 'bold' : 'normal'}>
                            {date.getDate()}
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
                
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'success.light', borderRadius: 1 }} />
                    <Typography variant="caption">Workout Completed</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1 }} />
                    <Typography variant="caption">No Workout</Typography>
                  </Box>
                </Box>
              </Paper>
            )}
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Leaderboard Tab */}
      <TabPanel value={tabValue} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Leaderboard 
              showHeader={false}
              limit={10}
              highlightUserId={user?.id}
            />
          </Grid>
        </Grid>
      </TabPanel>
      
      {/* Progress Chart Tab - Lazy loaded for performance */}
      <TabPanel value={tabValue} index={4}>
        <Typography variant="h6" component="h2" gutterBottom>
          Progress Trends
        </Typography>

        {profile.data.progressSnapshots && profile.data.progressSnapshots.length > 0 ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Points Progress Over Time
                </Typography>
                <Box sx={{ height: 300, position: 'relative' }}>
                  {/* Enhanced chart component that's lazy loaded */}
                  <Suspense fallback={
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <CircularProgress size={40} />
                    </Box>
                  }>
                    <ProgressChart snapshots={profile.data.progressSnapshots} />
                  </Suspense>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Current Averages
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Average Points per Week
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary.main">
                    {Math.round(lastMonth / 4).toLocaleString()}
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Points to {profile.data.nextTier?.charAt(0).toUpperCase() + profile.data.nextTier?.slice(1) || 'Next'} Tier
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color={
                    profile.data.nextTier === 'gold' ? 'warning.main' :
                    profile.data.nextTier === 'platinum' ? 'secondary.main' :
                    'primary.main'
                  }>
                    {profile.data.nextTier === 'gold' ? 
                      (20000 - profile.data.points).toLocaleString() : 
                      profile.data.nextTier === 'platinum' ?
                      (50000 - profile.data.points).toLocaleString() :
                      'N/A'}
                  </Typography>
                  
                  {profile.data.nextTier && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      At your current rate, you'll reach {profile.data.nextTier.charAt(0).toUpperCase() + profile.data.nextTier.slice(1)} in approximately{' '}
                      {Math.ceil(
                        (profile.data.nextTier === 'gold' ? 
                          (20000 - profile.data.points) : 
                          (50000 - profile.data.points)) / (lastMonth / 4)
                      )} weeks.
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Level Progress
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    Level {profile.data.level} → {profile.data.level + 1}
                  </Typography>
                  <Box sx={{ position: 'relative', height: 8, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 4, overflow: 'hidden', mt: 1 }}>
                    <Box 
                      sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: `${profile.data.nextLevelProgress}%`,
                        bgcolor: 'primary.main',
                        borderRadius: 4
                      }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(profile.data.nextLevelProgress)}% Complete
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Points Timeline
                </Typography>
                
                <Box sx={{ overflowX: 'auto' }}>
                  <Box sx={{ display: 'table', minWidth: '100%', borderCollapse: 'collapse' }}>
                    <Box sx={{ display: 'table-header-group' }}>
                      <Box sx={{ display: 'table-row' }}>
                        <Box sx={{ display: 'table-cell', p: 2, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Date</Box>
                        <Box sx={{ display: 'table-cell', p: 2, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Level</Box>
                        <Box sx={{ display: 'table-cell', p: 2, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Points</Box>
                        <Box sx={{ display: 'table-cell', p: 2, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Achievements</Box>
                        <Box sx={{ display: 'table-cell', p: 2, fontWeight: 'bold', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>Tier</Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'table-row-group' }}>
                      {profile.data.progressSnapshots.map((snapshot, index) => (
                        <Box key={index} sx={{ display: 'table-row' }}>
                          <Box sx={{ display: 'table-cell', p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{formatDate(snapshot.date)}</Box>
                          <Box sx={{ display: 'table-cell', p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{snapshot.level}</Box>
                          <Box sx={{ display: 'table-cell', p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{snapshot.points.toLocaleString()}</Box>
                          <Box sx={{ display: 'table-cell', p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{snapshot.achievements}</Box>
                          <Box sx={{ display: 'table-cell', p: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                            <Chip 
                              label={snapshot.tier.toUpperCase()} 
                              color={
                                snapshot.tier === 'bronze' ? 'default' :
                                snapshot.tier === 'silver' ? 'primary' :
                                snapshot.tier === 'gold' ? 'warning' :
                                'secondary'
                              }
                              size="small"
                            />
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No progress data available yet. Check back after you've earned more points!
            </Typography>
          </Box>
        )}
      </TabPanel>
    </Box>
  );
};

export default React.memo(EnhancedClientGamificationView);
