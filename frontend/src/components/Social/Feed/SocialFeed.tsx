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
  Paper
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
  Clock
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
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
