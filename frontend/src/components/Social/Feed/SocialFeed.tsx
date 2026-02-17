import React, { useState, useEffect } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useSocialFeed } from '../../../hooks/social/useSocialFeed';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import PostCard from './PostCard';
import CreatePostCard from './CreatePostCard';
import styled, { keyframes } from 'styled-components';

// ─── Keyframes ──────────────────────────────────────────────
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

// ─── Styled Components ──────────────────────────────────────
const FeedContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 650px;
  margin: 0 auto;
`;

const LoadMoreButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 16px auto;
  min-height: 44px;
  padding: 8px 22px;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: inherit;
  line-height: 1.75;
  letter-spacing: 0.02857em;
  text-transform: uppercase;
  border: 1px solid rgba(0, 255, 255, 0.5);
  border-radius: 8px;
  color: #00FFFF;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.08);
    border-color: #00FFFF;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyFeedMessage = styled.div`
  padding: 24px;
  text-align: center;
  border-radius: 8px;
  background-color: rgba(29, 31, 43, 0.8);
`;

const GamificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #7851A9, #00FFFF);
  color: white;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(120, 81, 169, 0.3);
`;

const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
`;

const StreakDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
`;

const ActivityIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(76, 175, 80, 0.1);
  border-radius: 8px;
  margin-bottom: 16px;
  border-left: 4px solid #4caf50;
`;

const FeedStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  background: rgba(29, 31, 43, 0.8);
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const LiveActivityBadgeWrapper = styled.span`
  position: relative;
  display: inline-flex;
`;

const LiveBadgeLabel = styled.span`
  position: absolute;
  top: -8px;
  right: -12px;
  min-width: 20px;
  padding: 0 6px;
  height: 20px;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 20px;
  text-align: center;
  border-radius: 10px;
  background: linear-gradient(135deg, #4caf50, #66bb6a);
  color: white;
  animation: ${pulse} 2s infinite;
`;

/* ---- Typography replacements ---- */
const Heading6 = styled.h6<{ $color?: string; $fontWeight?: string | number; $mb?: number; $gutterBottom?: boolean }>`
  font-size: 1.25rem;
  font-weight: ${({ $fontWeight }) => $fontWeight || 500};
  line-height: 1.6;
  letter-spacing: 0.0075em;
  color: ${({ $color }) => $color || 'inherit'};
  margin: 0;
  margin-bottom: ${({ $mb, $gutterBottom }) => {
    if ($mb !== undefined) return `${$mb * 8}px`;
    if ($gutterBottom) return '0.35em';
    return '0';
  }};
`;

const BodyText2 = styled.p<{ $color?: string; $fontWeight?: string | number; $opacity?: number; $paragraph?: boolean }>`
  font-size: 0.875rem;
  font-weight: ${({ $fontWeight }) => $fontWeight || 400};
  line-height: 1.43;
  letter-spacing: 0.01071em;
  color: ${({ $color }) => $color || 'inherit'};
  opacity: ${({ $opacity }) => $opacity ?? 1};
  margin: 0;
  margin-bottom: ${({ $paragraph }) => ($paragraph ? '16px' : '0')};
`;

const CaptionText = styled.span<{ $color?: string }>`
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.66;
  letter-spacing: 0.03333em;
  color: ${({ $color }) => $color || 'inherit'};
`;

/* ---- Button replacements ---- */
const ContainedButton = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 8px 22px;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: inherit;
  line-height: 1.75;
  letter-spacing: 0.02857em;
  text-transform: uppercase;
  border: none;
  border-radius: 8px;
  color: #fff;
  background: ${({ $color }) => {
    if ($color === 'primary') return 'linear-gradient(135deg, #7851A9, #00FFFF)';
    return 'linear-gradient(135deg, #7851A9, #00FFFF)';
  }};
  cursor: pointer;
  transition: opacity 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 3px 8px rgba(120, 81, 169, 0.3);

  &:hover {
    opacity: 0.9;
    box-shadow: 0 4px 12px rgba(120, 81, 169, 0.4);
  }
`;

const OutlinedButton = styled.button<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 8px 22px;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: inherit;
  line-height: 1.75;
  letter-spacing: 0.02857em;
  text-transform: uppercase;
  border: 1px solid rgba(0, 255, 255, 0.5);
  border-radius: 8px;
  color: #00FFFF;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.08);
    border-color: #00FFFF;
  }
`;

/* ---- Loading Spinner ---- */
const Spinner = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 40}px;
  height: ${({ $size }) => $size || 40}px;
  border: 3px solid rgba(0, 255, 255, 0.2);
  border-top-color: #00FFFF;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const CenterBox = styled.div`
  display: flex;
  justify-content: center;
  margin: 32px 0;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
`;

const GamificationHeaderLeft = styled.div``;

/**
 * Social Feed Component
 * Displays posts from friends and allows creating new posts
 */
const SocialFeed: React.FC = () => {
  const navigate = useNavigate();
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
        <CenterBox>
          <Spinner />
        </CenterBox>
      </FeedContainer>
    );
  }

  if (error) {
    return (
      <FeedContainer>
        <EmptyFeedMessage>
          <Heading6 $color="#f44336" $gutterBottom>
            Error loading feed
          </Heading6>
          <BodyText2 $color="rgba(255,255,255,0.7)" $paragraph>
            Something went wrong while loading your social feed.
          </BodyText2>
          <ContainedButton
            $color="primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </ContainedButton>
        </EmptyFeedMessage>
      </FeedContainer>
    );
  }

  return (
    <FeedContainer>
      {/* Gamification Header */}
      {profile.data && (
        <GamificationHeader>
          <GamificationHeaderLeft>
            <Heading6 $fontWeight={600} $mb={0.5}>
              Welcome back, {user?.firstName}! 🚀
            </Heading6>
            <StreakDisplay>
              <Zap size={16} />
              <BodyText2>
                {profile.data.streakDays} day streak
              </BodyText2>
            </StreakDisplay>
          </GamificationHeaderLeft>

          <PointsDisplay>
            <Star size={18} />
            <Heading6 $fontWeight={700}>
              {profile.data.points?.toLocaleString() || 0}
            </Heading6>
            <BodyText2 $opacity={0.8}>
              points
            </BodyText2>
          </PointsDisplay>
        </GamificationHeader>
      )}

      {/* Recent Activity Indicator */}
      {recentActivity && (
        <ActivityIndicator>
          <LiveActivityBadgeWrapper>
            <TrendingUp size={20} color="#4caf50" />
            <LiveBadgeLabel>LIVE</LiveBadgeLabel>
          </LiveActivityBadgeWrapper>
          <BodyText2 $color="#4caf50" $fontWeight={500}>
            {recentActivity}
          </BodyText2>
        </ActivityIndicator>
      )}

      {/* Feed Statistics */}
      {posts.length > 0 && (
        <FeedStats>
          <StatCard>
            <Heading6 $color="#00FFFF" $fontWeight={600}>
              {feedStats.workoutPosts}
            </Heading6>
            <CaptionText $color="rgba(255,255,255,0.7)">
              Workouts
            </CaptionText>
          </StatCard>

          <StatCard>
            <Heading6 $color="#ed6c02" $fontWeight={600}>
              {feedStats.achievementPosts}
            </Heading6>
            <CaptionText $color="rgba(255,255,255,0.7)">
              Achievements
            </CaptionText>
          </StatCard>

          <StatCard>
            <Heading6 $color="#7851A9" $fontWeight={600}>
              {feedStats.transformationPosts}
            </Heading6>
            <CaptionText $color="rgba(255,255,255,0.7)">
              Transformations
            </CaptionText>
          </StatCard>

          <StatCard>
            <Heading6 $color="#d32f2f" $fontWeight={600}>
              {feedStats.totalLikes}
            </Heading6>
            <CaptionText $color="rgba(255,255,255,0.7)">
              Total Likes
            </CaptionText>
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
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? <Spinner $size={20} /> : <Clock size={20} />}
              {isLoadingMore ? 'Loading more posts...' : 'Load more posts'}
            </LoadMoreButton>
          )}
        </>
      ) : (
        <EmptyFeedMessage>
          <Heading6 $gutterBottom>
            Your feed is empty
          </Heading6>
          <BodyText2 $color="rgba(255,255,255,0.7)" $paragraph>
            Connect with friends or join challenges to see their activity here!
          </BodyText2>
          <ButtonGroup>
            <ContainedButton
              $color="primary"
              onClick={() => navigate('/social/friends')}
            >
              Find Friends
            </ContainedButton>
            <OutlinedButton
              $color="primary"
              onClick={() => navigate('/social/challenges')}
            >
              Browse Challenges
            </OutlinedButton>
          </ButtonGroup>
        </EmptyFeedMessage>
      )}
    </FeedContainer>
  );
};

export default SocialFeed;
