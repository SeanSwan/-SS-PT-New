import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Paper,
  Skeleton,
  Button,
  Badge
} from '@mui/material';
import {
  Star,
  Trophy,
  ChevronUp,
  ChevronDown,
  Minus,
  Crown,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useGamificationData, LeaderboardEntry } from '../../../../../hooks/gamification/useGamificationData';
import { useAuth } from '../../../../../context/AuthContext';

// Create styled components using framer-motion
const MotionBox = motion.create(Box);

interface LeaderboardProps {
  compact?: boolean;
  highlightUserId?: string;
  limit?: number;
  showHeader?: boolean;
}

/**
 * Enhanced Leaderboard Component
 * Displays the top users in the gamification system
 * Optimized for performance with animations and loading states
 */
const Leaderboard: React.FC<LeaderboardProps> = ({
  compact = false,
  highlightUserId,
  limit = 5,
  showHeader = true
}) => {
  const { user } = useAuth();
  const { leaderboard, isLoading, error } = useGamificationData();
  
  // Process leaderboard data - compare ranks with previous data if available
  const processedLeaderboard = useMemo(() => {
    if (!leaderboard.data) return [];
    
    // Get the previous leaderboard from localStorage if available
    const previousData = localStorage.getItem('previousLeaderboard');
    let previousLeaderboard: LeaderboardEntry[] = [];
    
    if (previousData) {
      try {
        previousLeaderboard = JSON.parse(previousData);
      } catch (e) {
        console.error('Error parsing previous leaderboard data:', e);
      }
    }
    
    // Calculate position changes
    return leaderboard.data.slice(0, limit).map((entry, index) => {
      const previousIndex = previousLeaderboard.findIndex(prev => prev.userId === entry.userId);
      
      let positionChange: 'up' | 'down' | 'same' = 'same';
      let positionDiff = 0;
      
      if (previousIndex !== -1) {
        if (previousIndex > index) {
          positionChange = 'up';
          positionDiff = previousIndex - index;
        } else if (previousIndex < index) {
          positionChange = 'down';
          positionDiff = index - previousIndex;
        }
      }
      
      return {
        ...entry,
        position: index + 1,
        positionChange,
        positionDiff
      };
    });
  }, [leaderboard.data, limit]);
  
  // Save current leaderboard to localStorage when it changes
  React.useEffect(() => {
    if (leaderboard.data) {
      localStorage.setItem('previousLeaderboard', JSON.stringify(leaderboard.data));
    }
  }, [leaderboard.data]);
  
  // Render loading state
  if (isLoading) {
    return (
      <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2, overflow: 'hidden' }}>
        {showHeader && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Trophy size={20} />
            <Typography variant="h6" component="h3">
              Leaderboard
            </Typography>
          </Box>
        )}
        
        {Array(limit).fill(0).map((_, index) => (
          <Box 
            key={index}
            sx={{ 
              p: 2,
              display: 'flex',
              alignItems: 'center',
              borderBottom: index < limit - 1 ? '1px solid rgba(0, 0, 0, 0.12)' : 'none'
            }}
          >
            <Box 
              sx={{ 
                minWidth: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                bgcolor: 'background.paper'
              }}
            >
              <Skeleton variant="circular" width={36} height={36} />
            </Box>
            
            <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
            
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Skeleton variant="text" width={60} />
              <Skeleton variant="rectangular" width={60} height={24} sx={{ mt: 0.5, borderRadius: 1 }} />
            </Box>
          </Box>
        ))}
      </Paper>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2, overflow: 'hidden', textAlign: 'center' }}>
        <Typography color="error" sx={{ mb: 2 }}>
          Error loading leaderboard data
        </Typography>
        <Button 
          variant="outlined" 
          color="primary"
          onClick={() => leaderboard.refetch()}
          size="small"
        >
          Retry
        </Button>
      </Paper>
    );
  }
  
  // Render empty state
  if (!processedLeaderboard.length) {
    return (
      <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2, overflow: 'hidden', textAlign: 'center' }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          No leaderboard data available
        </Typography>
      </Paper>
    );
  }
  
  // Component for position change indicator
  const PositionIndicator = ({ change, diff }: { change: 'up' | 'down' | 'same', diff: number }) => {
    if (change === 'same' || diff === 0) {
      return <Minus size={16} color="#9e9e9e" />;
    }
    
    if (change === 'up') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
          <ChevronUp size={16} />
          {diff > 0 && (
            <Typography variant="caption" sx={{ ml: 0.5 }}>
              {diff}
            </Typography>
          )}
        </Box>
      );
    }
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
        <ChevronDown size={16} />
        {diff > 0 && (
          <Typography variant="caption" sx={{ ml: 0.5 }}>
            {diff}
          </Typography>
        )}
      </Box>
    );
  };
  
  return (
    <Paper sx={{ p: compact ? 2 : 3, borderRadius: 2, overflow: 'hidden' }}>
      {showHeader && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Trophy size={20} color="#FFD700" />
            <Typography variant="h6" component="h3">
              Fitness Leaderboard
            </Typography>
          </Box>
          
          <Chip 
            label={`${leaderboard.data?.length || 0} Users`} 
            size="small"
            icon={<Users size={14} />}
          />
        </Box>
      )}
      
      {processedLeaderboard.map((entry, index) => {
        const isCurrentUser = entry.userId === (highlightUserId || user?.id);
        const isTopThree = index < 3;
        
        // Get position color
        const positionColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'rgba(0, 0, 0, 0.08)';
        const positionTextColor = index <= 2 ? '#000' : 'text.secondary';
        
        return (
          <MotionBox 
            key={entry.userId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            sx={{ 
              p: 2,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: isCurrentUser ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
              borderBottom: index < processedLeaderboard.length - 1 ? '1px solid rgba(0, 0, 0, 0.12)' : 'none',
              position: 'relative',
              overflow: 'hidden',
              '&::after': isCurrentUser ? {
                content: '""',
                position: 'absolute',
                left: 0,
                top: 0,
                width: '4px',
                height: '100%',
                backgroundColor: 'primary.main'
              } : {}
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 48 }}>
              <Box 
                sx={{ 
                  minWidth: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: positionColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  mr: 2,
                  color: positionTextColor,
                  position: 'relative'
                }}
              >
                {index === 0 && (
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    badgeContent={
                      <Crown size={16} color="#FFD700" />
                    }
                  >
                    {entry.position}
                  </Badge>
                )}
                
                {index !== 0 && entry.position}
              </Box>
              
              <PositionIndicator change={entry.positionChange} diff={entry.positionDiff} />
            </Box>
            
            <Avatar 
              src={entry.client.photo || undefined}
              sx={{ width: 40, height: 40, mr: 2 }}
              alt={`${entry.client.firstName} ${entry.client.lastName}`}
            >
              {entry.client.firstName[0]}{entry.client.lastName[0]}
            </Avatar>
            
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="body1" fontWeight={isCurrentUser ? 'bold' : 'normal'}>
                {entry.client.firstName} {entry.client.lastName} {isCurrentUser && '(You)'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Level {entry.overallLevel}
              </Typography>
            </Box>
            
            {!compact && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mr: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Star size={16} color="#FFC107" style={{ marginRight: 4 }} />
                  <Typography variant="body2" fontWeight="bold">
                    {entry.client.points?.toLocaleString() || '0'}
                  </Typography>
                </Box>
              </Box>
            )}
          </MotionBox>
        );
      })}
      
      {!compact && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Users size={16} />}
            onClick={() => {/* View full leaderboard */}}
          >
            View Full Leaderboard
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default React.memo(Leaderboard);
