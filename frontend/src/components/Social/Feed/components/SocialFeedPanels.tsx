import React from 'react';
import { Star, TrendingUp, Trophy, Users, Zap } from 'lucide-react';
import {
  ActivityIndicator,
  BodyText2,
  ButtonGroup,
  CaptionText,
  ContainedButton,
  FeedStats,
  GamificationHeader,
  Heading6,
  LiveActivityBadgeWrapper,
  LiveBadgeLabel,
  OutlinedButton,
  PointsDisplay,
  StatCard,
  StreakDisplay,
  WelcomeCard,
  WelcomeTip,
} from '../styles/SocialFeedStyles';

export interface FeedStatsSummary {
  totalPosts: number;
  workoutPosts: number;
  achievementPosts: number;
  transformationPosts: number;
  totalLikes: number;
  totalComments: number;
}

interface FullGamificationHeaderProps {
  firstName?: string;
  streakDays?: number;
  points?: number;
}

export const FullGamificationHeader: React.FC<FullGamificationHeaderProps> = ({
  firstName,
  streakDays = 0,
  points = 0,
}) => (
  <GamificationHeader>
    <div>
      <Heading6 $fontWeight={600} $mb={0.5}>
        Welcome back, {firstName || 'athlete'}!
      </Heading6>
      <StreakDisplay>
        <Zap size={16} aria-hidden="true" />
        <BodyText2>{streakDays} day streak</BodyText2>
      </StreakDisplay>
    </div>

    <PointsDisplay>
      <Star size={18} aria-hidden="true" />
      <Heading6 $fontWeight={700}>{points.toLocaleString()}</Heading6>
      <BodyText2 $color="var(--text-primary, #E0ECF4)">points</BodyText2>
    </PointsDisplay>
  </GamificationHeader>
);

export const RecentActivityBanner: React.FC<{ message: string }> = ({ message }) => (
  <ActivityIndicator>
    <LiveActivityBadgeWrapper>
      <TrendingUp size={20} color="var(--accent-primary, #60C0F0)" aria-hidden="true" />
      <LiveBadgeLabel>LIVE</LiveBadgeLabel>
    </LiveActivityBadgeWrapper>
    <BodyText2 $color="var(--accent-primary, #60C0F0)" $fontWeight={500}>
      {message}
    </BodyText2>
  </ActivityIndicator>
);

export const FullFeedStats: React.FC<{ stats: FeedStatsSummary }> = ({ stats }) => (
  <FeedStats>
    <StatCard>
      <Heading6 $color="var(--accent-secondary, #8B5CF6)" $fontWeight={600}>
        {stats.workoutPosts}
      </Heading6>
      <CaptionText $color="var(--accent-data, #50A0F0)">Workouts</CaptionText>
    </StatCard>

    <StatCard>
      <Heading6 $color="var(--accent-gold, #C6A84B)" $fontWeight={600}>
        {stats.achievementPosts}
      </Heading6>
      <CaptionText $color="var(--accent-data, #50A0F0)">Achievements</CaptionText>
    </StatCard>

    <StatCard>
      <Heading6 $color="var(--accent-secondary, #8B5CF6)" $fontWeight={600}>
        {stats.transformationPosts}
      </Heading6>
      <CaptionText $color="var(--accent-data, #50A0F0)">Transformations</CaptionText>
    </StatCard>

    <StatCard>
      <Heading6 $color="var(--accent-primary, #60C0F0)" $fontWeight={600}>
        {stats.totalLikes}
      </Heading6>
      <CaptionText $color="var(--accent-data, #50A0F0)">Total Likes</CaptionText>
    </StatCard>
  </FeedStats>
);

interface EmptyFeedWelcomeProps {
  showActions: boolean;
  onBrowseChallenges: () => void;
  onFindFriends: () => void;
}

export const EmptyFeedWelcome: React.FC<EmptyFeedWelcomeProps> = ({
  showActions,
  onBrowseChallenges,
  onFindFriends,
}) => (
  <WelcomeCard>
    <Heading6 $gutterBottom $fontWeight={700}>
      Welcome to SwanStudios!
    </Heading6>
    <BodyText2
      $color="color-mix(in srgb, var(--text-primary, #E0ECF4) 85%, transparent)"
      $paragraph
    >
      Introduce yourself to the community and earn your first points.
    </BodyText2>
    {showActions && (
      <ButtonGroup>
        <ContainedButton type="button" onClick={onBrowseChallenges}>
          <Trophy size={16} aria-hidden="true" />
          Browse Challenges
        </ContainedButton>
        <OutlinedButton type="button" onClick={onFindFriends}>
          <Users size={16} aria-hidden="true" />
          Find Friends
        </OutlinedButton>
      </ButtonGroup>
    )}
    <WelcomeTip>
      <Zap size={14} aria-hidden="true" />
      Tip: Post publicly so everyone can see your journey
    </WelcomeTip>
  </WelcomeCard>
);
