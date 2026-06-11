import React from 'react';
import { TrendingUp, Trophy, Users, Zap } from 'lucide-react';
import {
  ActivityIndicator,
  BodyText2,
  ButtonGroup,
  ContainedButton,
  Heading6,
  LiveActivityBadgeWrapper,
  LiveBadgeLabel,
  OutlinedButton,
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

/* Merge M1 (2026-06-11): FullGamificationHeader + FullFeedStats retired —
   the FeedCoverStudio metric rail owns the feed numbers on both variants,
   and identity/greeting facts live in the page sidebar + Coach dock. */

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
