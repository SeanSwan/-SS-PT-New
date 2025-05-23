import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  Grid,
  Chip,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Card,
  CardContent
} from '@mui/material';
import {
  Award,
  Trophy,
  Star,
  CheckCircle,
  Filter,
  SortDesc,
  SortAsc,
  X,
  Sparkles,
  Medal,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useGamificationData, Achievement, UserAchievement } from '../../../../../hooks/gamification/useGamificationData';

// Create styled motion components
const MotionCard = motion.create(Card);

interface AchievementGalleryProps {
  showHeader?: boolean;
  compact?: boolean;
  filter?: 'all' | 'completed' | 'in-progress';
  limit?: number;
}

/**
 * Achievement Gallery Component
 * Displays achievements with rich visuals and interactive elements
 * Optimized for performance with animations and loading states
 */
const AchievementGallery: React.FC<AchievementGalleryProps> = ({
  showHeader = true,
  compact = false,
  filter: initialFilter = 'all',
  limit
}) => {
  const { profile, achievements, isLoading, error } = useGamificationData();
  const [filter, setFilter] = useState<'all' | 'completed' | 'in-progress'>(initialFilter);
  const [sortOrder, setSortOrder] = useState<'progress' | 'newest' | 'tier'>('progress');
  const [selectedAchievement, setSelectedAchievement] = useState<{
    achievement: Achievement;
    userAchievement?: UserAchievement;
  } | null>(null);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Get icon component
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Award': return <Award />;
      case 'Trophy': return <Trophy />;
      case 'Star': return <Star />;
      case 'Medal': return <Medal />;
      default: return <Award />;
    }
  };
  
  // Get tier color
  const getTierColor = (tier: 'bronze' | 'silver' | 'gold' | 'platinum') => {
    switch (tier) {
      case 'bronze': return '#CD7F32';
      case 'silver': return '#C0C0C0';
      case 'gold': return '#FFD700';
      case 'platinum': return '#E5E4E2';
      default: return '#CD7F32';
    }
  };
  
  // Process achievements data
  const processedAchievements = useMemo(() => {
    if (!profile.data || !achievements.data) return [];
    
    // Map and combine achievement data with user progress
    const combined = achievements.data.map(achievement => {
      const userAchievement = profile.data.achievements.find(
        ua => ua.achievementId === achievement.id
      );
      
      return {
        achievement,
        userAchievement,
        isCompleted: !!userAchievement?.isCompleted,
        progress: userAchievement?.progress || 0,
        earnedAt: userAchievement?.earnedAt
      };
    });
    
    // Apply filter
    let filtered = [...combined];
    if (filter === 'completed') {
      filtered = filtered.filter(item => item.isCompleted);
    } else if (filter === 'in-progress') {
      filtered = filtered.filter(item => !item.isCompleted);
    }
    
    // Apply sort
    let sorted = [...filtered];
    if (sortOrder === 'progress') {
      sorted.sort((a, b) => {
        // Completed items first
        if (a.isCompleted && !b.isCompleted) return -1;
        if (!a.isCompleted && b.isCompleted) return 1;
        
        // Then sort by progress
        return b.progress - a.progress;
      });
    } else if (sortOrder === 'newest') {
      sorted.sort((a, b) => {
        if (a.earnedAt && b.earnedAt) {
          return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
        }
        if (a.earnedAt) return -1;
        if (b.earnedAt) return 1;
        return 0;
      });
    } else if (sortOrder === 'tier') {
      const tierValue = {
        platinum: 4,
        gold: 3,
        silver: 2,
        bronze: 1
      };
      
      sorted.sort((a, b) => {
        const aTier = tierValue[a.achievement.tier] || 0;
        const bTier = tierValue[b.achievement.tier] || 0;
        return bTier - aTier;
      });
    }
    
    // Apply limit if specified
    if (limit) {
      sorted = sorted.slice(0, limit);
    }
    
    return sorted;
  }, [profile.data, achievements.data, filter, sortOrder, limit]);
  
  // Calculate stats
  const stats = useMemo(() => {
    if (!profile.data || !achievements.data) {
      return {
        total: 0,
        completed: 0,
        completion: 0,
        pointsEarned: 0,
        totalPointsAvailable: 0
      };
    }
    
    const completed = profile.data.achievements.filter(a => a.isCompleted).length;
    const total = achievements.data.length;
    const pointsEarned = profile.data.achievements.reduce(
      (sum, a) => sum + (a.pointsAwarded || 0), 0
    );
    const totalPointsAvailable = achievements.data.reduce(
      (sum, a) => sum + a.pointValue, 0
    );
    
    return {
      total,
      completed,
      completion: total > 0 ? Math.round((completed / total) * 100) : 0,
      pointsEarned,
      totalPointsAvailable
    };
  }, [profile.data, achievements.data]);
  
  // Render loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2 }}>
        {showHeader && (
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Trophy size={20} />
            <Typography variant="h6" component="h3">
              Achievements
            </Typography>
          </Box>
        )}
        
        <Grid container spacing={2}>
          {Array(compact ? 3 : 6).fill(0).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} />
                  </Box>
                  <Skeleton variant="text" width="70%" sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="90%" />
                  <Box sx={{ mt: 3 }}>
                    <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 1 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2, textAlign: 'center' }}>
        <Typography color="error" sx={{ mb: 2 }}>
          Error loading achievements data
        </Typography>
        <Button 
          variant="outlined" 
          color="primary"
          onClick={() => {
            profile.refetch();
            achievements.refetch();
          }}
          size="small"
        >
          Retry
        </Button>
      </Paper>
    );
  }
  
  // Render empty state
  if (!processedAchievements.length) {
    return (
      <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2 }}>
        {showHeader && (
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Trophy size={20} />
            <Typography variant="h6" component="h3">
              Achievements
            </Typography>
          </Box>
        )}
        
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography color="text.secondary">
            No achievements found
          </Typography>
        </Box>
      </Paper>
    );
  }
  
  return (
    <>
      <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2 }}>
        {showHeader && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Trophy size={20} color="#FFD700" />
                <Typography variant="h6" component="h3">
                  Achievements
                </Typography>
              </Box>
              
              {!compact && (
                <Chip 
                  label={`${stats.completed}/${stats.total} (${stats.completion}%)`} 
                  color="primary" 
                  size="small"
                  icon={<CheckCircle size={14} />}
                />
              )}
            </Box>
            
            {!compact && (
              <>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.completion} 
                  sx={{ height: 8, borderRadius: 4, mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant={filter === 'all' ? 'contained' : 'outlined'}
                      onClick={() => setFilter('all')}
                    >
                      All
                    </Button>
                    <Button
                      size="small"
                      variant={filter === 'completed' ? 'contained' : 'outlined'}
                      onClick={() => setFilter('completed')}
                      startIcon={<CheckCircle size={14} />}
                    >
                      Completed
                    </Button>
                    <Button
                      size="small"
                      variant={filter === 'in-progress' ? 'contained' : 'outlined'}
                      onClick={() => setFilter('in-progress')}
                    >
                      In Progress
                    </Button>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Sort by:
                    </Typography>
                    <Button
                      size="small"
                      variant={sortOrder === 'progress' ? 'contained' : 'outlined'}
                      onClick={() => setSortOrder('progress')}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      Progress
                    </Button>
                    <Button
                      size="small"
                      variant={sortOrder === 'newest' ? 'contained' : 'outlined'}
                      onClick={() => setSortOrder('newest')}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      Newest
                    </Button>
                    <Button
                      size="small"
                      variant={sortOrder === 'tier' ? 'contained' : 'outlined'}
                      onClick={() => setSortOrder('tier')}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      Tier
                    </Button>
                  </Box>
                </Box>
              </>
            )}
            
            {!compact && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Achievement Points Earned
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Star size={16} color="#FFC107" />
                    <Typography variant="h6">
                      {stats.pointsEarned.toLocaleString()} / {stats.totalPointsAvailable.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" color="text.secondary">
                    Completion Rate
                  </Typography>
                  <Typography variant="h6" color={stats.completion > 50 ? 'success.main' : 'text.primary'}>
                    {stats.completion}%
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        )}
        
        <Grid container spacing={2}>
          {processedAchievements.map((item, index) => {
            const { achievement, userAchievement, isCompleted, progress } = item;
            const tierColor = getTierColor(achievement.tier);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                <MotionCard
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  sx={{ 
                    position: 'relative', 
                    overflow: 'hidden',
                    boxShadow: isCompleted ? `0 0 10px ${tierColor}40` : undefined,
                    border: `1px solid ${isCompleted ? tierColor : 'rgba(0,0,0,0.12)'}`,
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: `0 5px 15px rgba(0,0,0,0.1), 0 0 10px ${tierColor}40`,
                      transition: 'all 0.3s ease'
                    }
                  }}
                  onClick={() => setSelectedAchievement({
                    achievement,
                    userAchievement
                  })}
                  data-testid={`achievement-card-${achievement.id}`}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Box 
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%', 
                          backgroundColor: `${tierColor}30`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: tierColor,
                          border: `2px solid ${tierColor}`
                        }}
                      >
                        {getIconComponent(achievement.icon)}
                      </Box>
                      
                      <Chip 
                        label={achievement.tier.toUpperCase()} 
                        size="small"
                        sx={{ 
                          backgroundColor: tierColor,
                          color: achievement.tier === 'platinum' || achievement.tier === 'silver' ? '#000' : '#fff'
                        }}
                      />
                    </Box>
                    
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ 
                      color: isCompleted ? tierColor : 'text.primary'
                    }}>
                      {achievement.name}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: compact ? 'auto' : 40 }}>
                      {achievement.description}
                    </Typography>
                    
                    <Box sx={{ mt: 'auto' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {isCompleted ? 'Completed' : 'Progress'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {isCompleted ? formatDate(userAchievement?.earnedAt || '') : `${Math.round(progress)}%`}
                        </Typography>
                      </Box>
                      
                      <LinearProgress 
                        variant="determinate" 
                        value={isCompleted ? 100 : progress} 
                        sx={{ 
                          height: 8, 
                          borderRadius: 4,
                          backgroundColor: 'rgba(0,0,0,0.1)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: isCompleted ? tierColor : undefined
                          }
                        }}
                      />
                    </Box>
                    
                    {/* Points value */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      mt: 2, 
                      justifyContent: 'flex-end',
                      color: isCompleted ? 'success.main' : 'text.secondary',
                      fontWeight: 'bold'
                    }}>
                      <Star size={16} style={{ marginRight: 4 }} color={isCompleted ? '#4caf50' : '#757575'} />
                      <Typography variant="body2" fontWeight="bold" color={isCompleted ? 'success.main' : 'text.secondary'}>
                        {isCompleted ? `+${achievement.pointValue}` : achievement.pointValue} pts
                      </Typography>
                    </Box>
                    
                    {/* Completed overlay indicator */}
                    {isCompleted && (
                      <Box sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        right: 0,
                        backgroundColor: 'success.main',
                        borderBottomLeftRadius: 8,
                        px: 1,
                        py: 0.5
                      }}>
                        <CheckCircle size={16} color="#fff" />
                      </Box>
                    )}
                  </CardContent>
                </MotionCard>
              </Grid>
            );
          })}
        </Grid>
        
        {!compact && processedAchievements.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<Trophy size={16} />}
              onClick={() => {/* View all achievements */}}
            >
              View All Achievements
            </Button>
          </Box>
        )}
      </Paper>
      
      {/* Achievement Detail Dialog */}
      <Dialog
        open={!!selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedAchievement && (
          <>
            <DialogTitle sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              borderBottom: `4px solid ${getTierColor(selectedAchievement.achievement.tier)}`
            }}>
              <Typography variant="h6">{selectedAchievement.achievement.name}</Typography>
              <IconButton onClick={() => setSelectedAchievement(null)} edge="end">
                <X size={20} />
              </IconButton>
            </DialogTitle>
            
            <DialogContent sx={{ py: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                <Box 
                  sx={{ 
                    width: 60, 
                    height: 60, 
                    borderRadius: '50%', 
                    backgroundColor: `${getTierColor(selectedAchievement.achievement.tier)}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getTierColor(selectedAchievement.achievement.tier),
                    border: `2px solid ${getTierColor(selectedAchievement.achievement.tier)}`,
                    mr: 2
                  }}
                >
                  {getIconComponent(selectedAchievement.achievement.icon)}
                </Box>
                
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" paragraph>
                    {selectedAchievement.achievement.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip 
                      label={selectedAchievement.achievement.tier.toUpperCase()}
                      size="small"
                      sx={{ 
                        backgroundColor: getTierColor(selectedAchievement.achievement.tier),
                        color: selectedAchievement.achievement.tier === 'platinum' || selectedAchievement.achievement.tier === 'silver' ? '#000' : '#fff'
                      }}
                    />
                    
                    <Chip
                      icon={<Star size={14} />}
                      label={`${selectedAchievement.achievement.pointValue} points`}
                      size="small"
                      color="primary"
                    />
                    
                    {selectedAchievement.userAchievement?.isCompleted && (
                      <Chip
                        icon={<CheckCircle size={14} />}
                        label="Completed"
                        size="small"
                        color="success"
                      />
                    )}
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Requirement
                </Typography>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2">
                    {(() => {
                      const { requirementType, requirementValue } = selectedAchievement.achievement;
                      switch (requirementType) {
                        case 'session_count':
                          return `Complete ${requirementValue} workout sessions`;
                        case 'exercise_count':
                          return `Try ${requirementValue} different exercises`;
                        case 'level_reached':
                          return `Reach level ${requirementValue} in your fitness journey`;
                        case 'streak_days':
                          return `Maintain a ${requirementValue}-day workout streak`;
                        case 'specific_exercise':
                          return `Perform ${requirementValue} repetitions of a specific exercise`;
                        default:
                          return `Complete the required task (${requirementValue})`;
                      }
                    })()}
                  </Typography>
                </Paper>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Progress
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {selectedAchievement.userAchievement?.isCompleted ? 'Completed' : 'In Progress'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedAchievement.userAchievement?.isCompleted 
                      ? `Completed on ${formatDate(selectedAchievement.userAchievement?.earnedAt || '')}` 
                      : `${Math.round(selectedAchievement.userAchievement?.progress || 0)}%`}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={selectedAchievement.userAchievement?.isCompleted ? 100 : (selectedAchievement.userAchievement?.progress || 0)} 
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: selectedAchievement.userAchievement?.isCompleted 
                        ? getTierColor(selectedAchievement.achievement.tier) 
                        : undefined
                    }
                  }}
                />
              </Box>
              
              {selectedAchievement.userAchievement?.isCompleted && (
                <Box sx={{ 
                  p: 2, 
                  textAlign: 'center', 
                  backgroundColor: 'success.light', 
                  borderRadius: 2, 
                  color: 'success.contrastText',
                  animation: 'pulse 2s infinite'
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                    <Sparkles size={24} />
                  </Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Congratulations!
                  </Typography>
                  <Typography variant="body2">
                    You've earned {selectedAchievement.userAchievement.pointsAwarded} points for completing this achievement.
                  </Typography>
                </Box>
              )}
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setSelectedAchievement(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default React.memo(AchievementGallery);
