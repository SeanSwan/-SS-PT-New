import React from 'react';
import { Activity, Dumbbell, Flame, Image, Pencil, Radio, Send, Sparkles, Star, Trophy } from 'lucide-react';
import { EditCoverButton } from './SocialCoverEditor.styles';
import {
  IdentityAvatar,
  IdentityAvatarFallback,
  IdentityChips,
  IdentityHandle,
  IdentityName,
  IdentityRow,
  IdentityStat,
  IdentityText,
  TierChip,
} from './FeedCoverIdentity.styles';
import {
  ActionRow,
  CoverFrame,
  CoverGrid,
  CoverPanel,
  Kicker,
  MetricLabel,
  MetricRail,
  MetricTile,
  MetricValue,
  ModeChip,
  ModeRail,
  PrimaryButton,
  Stage,
  StageBadge,
  StageHeader,
  StatusPill,
  StudioCopy,
  StudioShell,
  Subtitle,
  Title,
} from './FeedCoverStudio.styles';

interface FeedCoverStats {
  totalPosts: number;
  workoutPosts: number;
  achievementPosts: number;
  transformationPosts: number;
  totalLikes: number;
  totalComments: number;
}

export interface CoverIdentity {
  photo: string | null;
  displayName: string;
  username: string;
  tier: string | null;
  points: number | null;
  streakDays: number | null;
}

interface FeedCoverStudioProps {
  stats: FeedCoverStats;
  isLive: boolean;
  onCreatePostFocus: () => void;
  /** Merge M2: real-data identity strip; null renders the anonymous cover. */
  identity?: CoverIdentity | null;
  /** Merge M5b: the user's REAL banner media (crossfade/mosaic/photo) rendered
   *  inside the stage in place of the decorative panels; null keeps them. */
  bannerLayer?: React.ReactNode;
  /** Merge M6a: opens the embedded cover editor (edit where you see it). */
  onEditCover?: () => void;
}

const formatTier = (tier: string) =>
  tier.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const formatMetric = (value: number) => compactNumber.format(Math.max(0, value));

const FeedCoverStudio: React.FC<FeedCoverStudioProps> = ({
  stats,
  isLive,
  onCreatePostFocus,
  identity = null,
  bannerLayer = null,
  onEditCover,
}) => {
  const milestoneCount = stats.achievementPosts + stats.transformationPosts;
  const engagementCount = stats.totalLikes + stats.totalComments;

  const metrics = [
    { label: 'Posts', value: stats.totalPosts },
    { label: 'Workouts', value: stats.workoutPosts },
    { label: 'Milestones', value: milestoneCount },
    { label: 'Signals', value: engagementCount },
  ];

  return (
    <StudioShell aria-label="Feed cover studio">
      {identity && (
        <IdentityRow>
          {identity.photo ? (
            <IdentityAvatar src={identity.photo} alt="" />
          ) : (
            <IdentityAvatarFallback aria-hidden="true">
              {identity.displayName.charAt(0).toUpperCase()}
            </IdentityAvatarFallback>
          )}
          <IdentityText>
            <IdentityName>{identity.displayName}</IdentityName>
            {identity.username && <IdentityHandle>@{identity.username}</IdentityHandle>}
          </IdentityText>
          <IdentityChips>
            {identity.tier && (
              <TierChip>
                <Sparkles size={13} aria-hidden="true" />
                {formatTier(identity.tier)}
              </TierChip>
            )}
            {identity.points != null && (
              <IdentityStat>
                <Star size={13} aria-hidden="true" />
                <strong>{formatMetric(identity.points)}</strong> XP
              </IdentityStat>
            )}
            {identity.streakDays != null && (
              <IdentityStat>
                <Flame size={13} aria-hidden="true" />
                <strong>{identity.streakDays}</strong> day streak
              </IdentityStat>
            )}
          </IdentityChips>
        </IdentityRow>
      )}

      <StudioCopy>
        <Kicker>
          <Sparkles size={16} aria-hidden="true" />
          Feed Cover Studio
        </Kicker>
        <Title>Make the proof visible.</Title>
        <Subtitle>
          Workout wins, transformation notes, and community signals in one focused feed.
        </Subtitle>

        <ModeRail aria-label="Feed post lanes">
          <ModeChip>
            <Dumbbell size={15} aria-hidden="true" />
            Workout
          </ModeChip>
          <ModeChip>
            <Trophy size={15} aria-hidden="true" />
            Milestone
          </ModeChip>
          <ModeChip>
            <Image size={15} aria-hidden="true" />
            Photo
          </ModeChip>
        </ModeRail>

        <ActionRow>
          <PrimaryButton type="button" onClick={onCreatePostFocus}>
            <Send size={17} aria-hidden="true" />
            Create post
          </PrimaryButton>
          {/* M6a: edit the cover where you see it (Sean's least-clicks call). */}
          {onEditCover && (
            <EditCoverButton type="button" onClick={onEditCover}>
              <Pencil size={15} aria-hidden="true" />
              {bannerLayer ? 'Edit cover' : 'Design your cover'}
            </EditCoverButton>
          )}
          <StatusPill $live={isLive}>
            <Radio size={15} aria-hidden="true" />
            {isLive ? 'Live feed' : 'Feed ready'}
          </StatusPill>
        </ActionRow>
      </StudioCopy>

      <Stage aria-hidden="true">
        <CoverFrame>
          {/* M5b: the user's real banner media leads when it exists; the
              decorative panels remain the anonymous/empty fallback. */}
          {bannerLayer}
          <StageHeader>
            <StageBadge>
              <Activity size={14} />
              {bannerLayer ? 'Your cover' : 'Community signal'}
            </StageBadge>
          </StageHeader>
          {!bannerLayer && (
            <CoverGrid>
              <CoverPanel $tone="primary" />
              <CoverPanel $tone="accent" />
              <CoverPanel $tone="gold" />
            </CoverGrid>
          )}
        </CoverFrame>
      </Stage>

      <MetricRail aria-label="Feed summary">
        {metrics.map((metric) => (
          <MetricTile key={metric.label}>
            <MetricValue>{formatMetric(metric.value)}</MetricValue>
            <MetricLabel>{metric.label}</MetricLabel>
          </MetricTile>
        ))}
      </MetricRail>
    </StudioShell>
  );
};

export default FeedCoverStudio;
