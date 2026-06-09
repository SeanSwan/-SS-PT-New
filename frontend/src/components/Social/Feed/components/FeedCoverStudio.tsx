import React from 'react';
import { Activity, Dumbbell, Image, Radio, Send, Sparkles, Trophy } from 'lucide-react';
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

interface FeedCoverStudioProps {
  stats: FeedCoverStats;
  isLive: boolean;
  onCreatePostFocus: () => void;
}

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const formatMetric = (value: number) => compactNumber.format(Math.max(0, value));

const FeedCoverStudio: React.FC<FeedCoverStudioProps> = ({
  stats,
  isLive,
  onCreatePostFocus,
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
          <StatusPill $live={isLive}>
            <Radio size={15} aria-hidden="true" />
            {isLive ? 'Live feed' : 'Feed ready'}
          </StatusPill>
        </ActionRow>
      </StudioCopy>

      <Stage aria-hidden="true">
        <CoverFrame>
          <StageHeader>
            <StageBadge>
              <Activity size={14} />
              Community signal
            </StageBadge>
          </StageHeader>
          <CoverGrid>
            <CoverPanel $tone="primary" />
            <CoverPanel $tone="accent" />
            <CoverPanel $tone="gold" />
          </CoverGrid>
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
