import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Skeleton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Button,
  Card,
  CardContent
} from '@mui/material';
import {
  Award,
  Gift,
  Star,
  Calendar,
  Clock,
  Zap,
  CheckCircle,
  TrendingUp,
  Activity,
  Dumbbell
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useGamificationData, PointTransaction } from '../../../../../hooks/gamification/useGamificationData';

// Create styled components using framer-motion
const MotionListItem = motion.create(ListItem);

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  categoryFilter?: 'all' | 'achievements' | 'rewards' | 'points';
}

/**
 * Activity Feed Component
 * Displays recent gamification activities like points earned, achievements, rewards, etc.
 * Optimized for performance with animations and loading states
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({
  limit = 5,
  showHeader = true,
  compact = false,
  categoryFilter = 'all'
}) => {
  const { profile, isLoading, error } = useGamificationData();
  
  // Process transactions and filter based on category
  const transactions = useMemo(() => {
    if (!profile.data?.recentTransactions) return [];
    
    let filtered = [...profile.data.recentTransactions];
    
    // Apply category filter
    if (categoryFilter === 'achievements') {
      filtered = filtered.filter(t => t.source === 'achievement_earned');
    } else if (categoryFilter === 'rewards') {
      filtered = filtered.filter(t => t.source === 'reward_redemption');
    } else if (categoryFilter === 'points') {
      filtered = filtered.filter(t => 
        t.source !== 'achievement_earned' && 
        t.source !== 'reward_redemption'
      );
    }
    
    return filtered.slice(0, limit);
  }, [profile.data?.recentTransactions, categoryFilter, limit]);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };
  
  // Get icon for transaction
  const getTransactionIcon = (transaction: PointTransaction) => {
    switch (transaction.source) {
      case 'workout_completion':
        return <Dumbbell size={20} color="#4caf50" />;
      case 'streak_bonus':
        return <Zap size={20} color="#2196f3" />;
      case 'achievement_earned':
        return <Award size={20} color="#ff9800" />;
      case 'reward_redemption':
        return <Gift size={20} color="#f44336" />;
      case 'daily_login':
        return <Calendar size={20} color="#9c27b0" />;
      case 'challenge_completed':
        return <CheckCircle size={20} color="#4caf50" />;
      case 'level_up':
        return <TrendingUp size={20} color="#2196f3" />;
      default:
        return <Activity size={20} color="#757575" />;
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2 }}>
        {showHeader && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock size={20} />
            <Typography variant="h6" component="h3">
              Activity Feed
            </Typography>
          </Box>
        )}
        
        <List sx={{ width: '100%', p: 0 }}>
          {Array(limit).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 42 }}>
                  <Skeleton variant="circular" width={24} height={24} />
                </ListItemIcon>
                <ListItemText
                  primary={<Skeleton variant="text" width="60%" />}
                  secondary={<Skeleton variant="text" width="40%" />}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <Skeleton variant="text" width={60} />
                  <Skeleton variant="text" width={40} />
                </Box>
              </ListItem>
              {index < limit - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2, textAlign: 'center' }}>
        <Typography color="error" sx={{ mb: 2 }}>
          Error loading activity data
        </Typography>
        <Button 
          variant="outlined" 
          color="primary"
          onClick={() => profile.refetch()}
          size="small"
        >
          Retry
        </Button>
      </Paper>
    );
  }
  
  // Render empty state
  if (!transactions.length) {
    return (
      <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2 }}>
        {showHeader && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock size={20} />
            <Typography variant="h6" component="h3">
              Activity Feed
            </Typography>
          </Box>
        )}
        
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography color="text.secondary">
            No recent activity found
          </Typography>
        </Box>
      </Paper>
    );
  }
  
  return (
    <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2 }}>
      {showHeader && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Activity size={20} color="#1976d2" />
            <Typography variant="h6" component="h3">
              Recent Activity
            </Typography>
          </Box>
          
          {!compact && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip 
                label="All" 
                size="small" 
                color={categoryFilter === 'all' ? 'primary' : 'default'}
                onClick={() => {/* Filter by all */}}
              />
              <Chip 
                label="Points" 
                size="small" 
                color={categoryFilter === 'points' ? 'primary' : 'default'}
                onClick={() => {/* Filter by points */}}
              />
              <Chip 
                label="Achievements" 
                size="small" 
                color={categoryFilter === 'achievements' ? 'primary' : 'default'}
                onClick={() => {/* Filter by achievements */}}
              />
              <Chip 
                label="Rewards" 
                size="small" 
                color={categoryFilter === 'rewards' ? 'primary' : 'default'}
                onClick={() => {/* Filter by rewards */}}
              />
            </Box>
          )}
        </Box>
      )}
      
      <List sx={{ width: '100%', p: 0 }}>
        {transactions.map((transaction, index) => (
          <React.Fragment key={transaction.id}>
            <MotionListItem 
              alignItems="flex-start" 
              sx={{ px: 0 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              data-testid={`activity-item-${index}`}
            >
              <ListItemIcon sx={{ minWidth: 42 }}>
                {getTransactionIcon(transaction)}
              </ListItemIcon>
              <ListItemText
                primary={transaction.description}
                secondary={formatDate(transaction.createdAt)}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: 'medium'
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  color: 'text.secondary'
                }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 'bold',
                    color: transaction.transactionType === 'earn' || transaction.transactionType === 'bonus'
                      ? 'success.main'
                      : 'error.main'
                  }}
                >
                  {transaction.transactionType === 'earn' || transaction.transactionType === 'bonus'
                    ? `+${transaction.points}`
                    : `-${transaction.points}`}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  <Star size={12} color="#FFC107" style={{ marginRight: 4 }} />
                  <Typography variant="caption" color="text.secondary">
                    {transaction.balance}
                  </Typography>
                </Box>
              </Box>
            </MotionListItem>
            {index < transactions.length - 1 && <Divider component="li" />}
          </React.Fragment>
        ))}
      </List>
      
      {!compact && transactions.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Clock size={16} />}
            onClick={() => {/* View all activity */}}
          >
            View All Activity
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default React.memo(ActivityFeed);
