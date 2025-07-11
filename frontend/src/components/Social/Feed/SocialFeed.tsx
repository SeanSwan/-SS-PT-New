import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Divider,
  Avatar,
  CircularProgress,
  IconButton,
  Chip,
  Paper,
  Tooltip,
  Badge,
  LinearProgress,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  MessageSquare, 
  Heart, 
  Share, 
  Image, 
  Send, 
  MoreVertical, 
  Award, 
  Dumbbell, 
  Clock,
  Star,
  Zap,
  TrendingUp,
  Users,
  Trophy
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import PostCard from './PostCard';
import CreatePostCard from './CreatePostCard';
import styled from 'styled-components';

// Styled components
const FeedContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 650px;
  margin: 0 auto;
`;

const LoadMoreButton = styled(Button)`
  margin: 16px auto;
`;

const EmptyFeedMessage = styled(Paper)`
  padding: 24px;
  text-align: center;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.02);
`;

const GamificationHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  color: white;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
`;

const PointsDisplay = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
`;

const StreakDisplay = styled(Box)`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
`;

const ActivityIndicator = styled(Box)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(76, 175, 80, 0.1);
  border-radius: 8px;
  margin-bottom: 16px;
  border-left: 4px solid #4caf50;
`;

const FeedStats = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

const StatCard = styled(Box)`
  background: white;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const LiveActivityBadge = styled(Badge)`
  .MuiBadge-badge {
    background: linear-gradient(135deg, #4caf50, #66bb6a);
    color: white;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;

/**
 * Social Feed Component
 * Displays posts from friends and allows creating new posts
 */
const SocialFeed: React.FC = () => {
  const { user } = useAuth();
  const { 
    posts, 
    isLoading, 
    error, 
    hasMore, 
    loadMore, 
    isLoadingMore,
    likePost,
    unlikePost,
    addComment
  } = useSocialFeed();
  
  const { profile } = useGamificationData();
  const [showPointNotification, setShowPointNotification] = useState(false);
  const [recentActivity, setRecentActivity] = useState<string | null>(null);
  
  // Calculate feed stats
  const feedStats = {
    totalPosts: posts.length,
    workoutPosts: posts.filter(p => p.type === 'workout').length,
    achievementPosts: posts.filter(p => p.type === 'achievement').length,
    transformationPosts: posts.filter(p => p.type === 'transformation').length,
    totalLikes: posts.reduce((sum, p) => sum + p.likesCount, 0),
    totalComments: posts.reduce((sum, p) => sum + p.commentsCount, 0)
  };
  
  // Show activity indicator when there's recent activity
  useEffect(() => {
    if (posts.length > 0) {
      const latestPost = posts[0];
      const timeDiff = Date.now() - new Date(latestPost.createdAt).getTime();
      
      if (timeDiff < 300000) { // 5 minutes
        setRecentActivity(`New ${latestPost.type} post from ${latestPost.user.firstName}`);
        setTimeout(() => setRecentActivity(null), 10000);
      }
    }
  }, [posts]);

  if (isLoading) {
    return (
      <FeedContainer>
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      </FeedContainer>
    );
  }

  if (error) {
    return (
      <FeedContainer>
        <EmptyFeedMessage>
          <Typography variant="h6" color="error" gutterBottom>
            Error loading feed
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Something went wrong while loading your social feed.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </EmptyFeedMessage>
      </FeedContainer>
    );
  }

  return (
    <FeedContainer>
      {/* Gamification Header */}
      {profile.data && (
        <GamificationHeader>
          <Box>
            <Typography variant="h6" fontWeight="600" mb={0.5}>
              Welcome back, {user?.firstName}! 🚀
            </Typography>
            <StreakDisplay>
              <Zap size={16} />
              <Typography variant="body2">
                {profile.data.streakDays} day streak
              </Typography>
            </StreakDisplay>
          </Box>
          
          <PointsDisplay>
            <Star size={18} />
            <Typography variant="h6" fontWeight="700">
              {profile.data.points?.toLocaleString() || 0}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              points
            </Typography>
          </PointsDisplay>
        </GamificationHeader>
      )}
      
      {/* Recent Activity Indicator */}
      {recentActivity && (
        <ActivityIndicator>
          <LiveActivityBadge badgeContent="LIVE" color="primary">
            <TrendingUp size={20} color="#4caf50" />
          </LiveActivityBadge>
          <Typography variant="body2" color="success.main" fontWeight="500">
            {recentActivity}
          </Typography>
        </ActivityIndicator>
      )}
      
      {/* Feed Statistics */}
      {posts.length > 0 && (
        <FeedStats>
          <StatCard>
            <Typography variant="h6" color="primary" fontWeight="600">
              {feedStats.workoutPosts}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Workouts
            </Typography>
          </StatCard>
          
          <StatCard>
            <Typography variant="h6" color="warning.main" fontWeight="600">
              {feedStats.achievementPosts}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Achievements
            </Typography>
          </StatCard>
          
          <StatCard>
            <Typography variant="h6" color="secondary.main" fontWeight="600">
              {feedStats.transformationPosts}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Transformations
            </Typography>
          </StatCard>
          
          <StatCard>
            <Typography variant="h6" color="error.main" fontWeight="600">
              {feedStats.totalLikes}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Likes
            </Typography>
          </StatCard>
        </FeedStats>
      )}
      
      {/* Create Post Card */}
      <CreatePostCard />
      
      {/* Posts Feed */}
      {posts.length > 0 ? (
        <>
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              onLike={() => post.isLiked ? unlikePost(post.id) : likePost(post.id)}
              onComment={addComment}
            />
          ))}
          
          {hasMore && (
            <LoadMoreButton
              variant="outlined"
              onClick={loadMore}
              disabled={isLoadingMore}
              startIcon={isLoadingMore ? <CircularProgress size={20} /> : <Clock size={20} />}
            >
              {isLoadingMore ? 'Loading more posts...' : 'Load more posts'}
            </LoadMoreButton>
          )}
        </>
      ) : (
        <EmptyFeedMessage>
          <Typography variant="h6" gutterBottom>
            Your feed is empty
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Connect with friends or join challenges to see their activity here!
          </Typography>
          <Box display="flex" justifyContent="center" gap={2} mt={3}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => window.location.href = '/social/friends'}
            >
              Find Friends
            </Button>
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => window.location.href = '/social/challenges'}
            >
              Browse Challenges
            </Button>
          </Box>
        </EmptyFeedMessage>
      )}
    </FeedContainer>
  );
};

export default SocialFeed;
