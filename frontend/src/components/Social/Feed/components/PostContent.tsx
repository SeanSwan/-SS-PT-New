/**
 * ┌─── SUB-COMPONENT: PostContent ─────────────────────────────┐
 * │ PARENT: PostCard                                            │
 * │ PURPOSE: Renders post text body, workout stats grid,        │
 * │          transformation before/after images, achievement    │
 * │          badge, and "Try This Workout" CTA.                 │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ [Achievement Badge — if achievement type]              │  │
 * │ │ Post text content...                                   │  │
 * │ │ ┌──────┬──────┬──────┬──────┐ (workout stats grid)    │  │
 * │ │ │ 45m  │ 12ex │ 5000 │ 420  │                         │  │
 * │ │ └──────┴──────┴──────┴──────┘                         │  │
 * │ │ [Before] [Slider] [After] (transformation images)     │  │
 * │ │        [Try This Workout] (workout CTA)               │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: PostContentProps                                     │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Try This Workout] -> opens workout details modal              │
 * │ GAMIFICATION: None directly (parent handles point awards)   │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { Clock, Dumbbell, Weight, Flame, Zap, Trophy, Star } from 'lucide-react';
import { useBeforeAfterSlider } from '../../../../hooks/useBeforeAfterSlider';
import type { PostContentProps } from '../types/PostCardTypes';
import PostWorkoutDetailsModal from './PostWorkoutDetailsModal';
import ProofFeedCard from './ProofFeedCard';
import {
  PostContentArea,
  PostText,
  WorkoutStatsContainer,
  WorkoutStatItem,
  StatValue,
  StatLabel,
  TransformationImageContainer,
  TransformationImage,
  TransformationSlider,
  TransformationAfterImage,
  TransformationSingleImageFrame,
  TransformationEdgeLabel,
  TryWorkoutButton,
  CenteredFlex,
  AchievementBadge,
  AchievementTextBlock,
  AchievementTitle,
  AchievementDescription,
  AchievementSummaryDetails,
  PointsChip,
} from '../styles/PostCardStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Workout Stats Renderer
// PURPOSE: Grid display of duration, exercises, weight, calories
// ─────────────────────────────────────────────────────────────

const WorkoutStats: React.FC<{ workoutData: NonNullable<PostContentProps['post']['workoutData']> }> = React.memo(({ workoutData }) => {
  const stats = [
    { icon: Clock, label: 'Duration', value: workoutData.duration, unit: 'min' },
    { icon: Dumbbell, label: 'Exercises', value: workoutData.exerciseCount, unit: '' },
    { icon: Weight, label: 'Total Weight', value: workoutData.totalWeight, unit: 'lbs' },
    { icon: Flame, label: 'Calories', value: workoutData.caloriesBurned, unit: '' },
  ].filter(stat => stat.value && String(stat.value).trim());

  if (stats.length === 0) return null;

  return (
    <WorkoutStatsContainer>
      {stats.map(({ icon: Icon, label, value, unit }) => (
        <WorkoutStatItem key={label}>
          <Icon size={20} color="var(--accent-primary, #60C0F0)" />
          <StatValue>{value}{unit}</StatValue>
          <StatLabel>{label}</StatLabel>
        </WorkoutStatItem>
      ))}
    </WorkoutStatsContainer>
  );
});
WorkoutStats.displayName = 'WorkoutStats';

// ─────────────────────────────────────────────────────────────
// SECTION: Achievement Badge Renderer
// ─────────────────────────────────────────────────────────────

const AchievementBadgeBlock: React.FC<{ achievementData: NonNullable<PostContentProps['post']['achievementData']> }> = React.memo(({ achievementData }) => {
  const [open, setOpen] = React.useState(false);
  const detailId = React.useId();
  const title = achievementData.title || 'Achievement Unlocked!';
  const description = achievementData.description || 'Reached a new SwanStudios milestone.';

  return (
    <>
      <AchievementBadge
        type="button"
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={`${title} achievement summary`}
        onClick={() => setOpen(value => !value)}
      >
        <Trophy size={24} />
        <AchievementTextBlock>
          <AchievementTitle>{title}</AchievementTitle>
          <AchievementDescription>Tap for why you earned it</AchievementDescription>
        </AchievementTextBlock>
        {achievementData.points && (
          <PointsChip>
            <Star size={14} />
            +{achievementData.points} pts
          </PointsChip>
        )}
      </AchievementBadge>

      {open && (
        <AchievementSummaryDetails id={detailId} role="status">
          {description} Unlocked for reaching this SwanStudios milestone.
        </AchievementSummaryDetails>
      )}
    </>
  );
});
AchievementBadgeBlock.displayName = 'AchievementBadgeBlock';

// ─────────────────────────────────────────────────────────────
// SECTION: Transformation Images Renderer
// ─────────────────────────────────────────────────────────────

const TransformationImages: React.FC<{
  transformationData: NonNullable<PostContentProps['post']['transformationData']>;
}> = React.memo(({ transformationData }) => {
  const { containerRef, containerProps } = useBeforeAfterSlider({
    label: 'Before and after transformation comparison slider',
  });

  const hasBoth = Boolean(
    transformationData.beforeImageUrl && transformationData.afterImageUrl
  );

  // Without both halves there is nothing to compare — render the single image
  // plainly rather than a comparison control that cannot do anything.
  if (!hasBoth) {
    const soleUrl =
      transformationData.beforeImageUrl || transformationData.afterImageUrl;
    if (!soleUrl) return null;
    return (
      <TransformationSingleImageFrame as="div">
        <TransformationImage
          src={soleUrl}
          alt={
            transformationData.beforeImageUrl
              ? 'Before transformation'
              : 'After transformation'
          }
        />
      </TransformationSingleImageFrame>
    );
  }

  return (
    <TransformationImageContainer ref={containerRef} {...containerProps}>
      <TransformationImage
        src={transformationData.beforeImageUrl}
        alt="Before transformation"
      />
      <TransformationAfterImage
        src={transformationData.afterImageUrl}
        alt="After transformation"
      />
      <TransformationSlider />
      <TransformationEdgeLabel $side="left">Before</TransformationEdgeLabel>
      <TransformationEdgeLabel $side="right">After</TransformationEdgeLabel>
    </TransformationImageContainer>
  );
});
TransformationImages.displayName = 'TransformationImages';

// ─────────────────────────────────────────────────────────────
// SECTION: PostContent Component
// ─────────────────────────────────────────────────────────────

const PostContent: React.FC<PostContentProps> = React.memo(({ post }) => {
  const [workoutDetailsOpen, setWorkoutDetailsOpen] = React.useState(false);

  const handleTryWorkout = () => {
    setWorkoutDetailsOpen(true);
  };

  return (
    <>
      <PostContentArea>
        {/* Achievement Badge */}
        {post.type === 'achievement' && post.achievementData && (
          <AchievementBadgeBlock achievementData={post.achievementData} />
        )}

        {post.type === 'milestone' ? (
          <ProofFeedCard post={post} />
        ) : (
          <PostText>{post.content}</PostText>
        )}

        {/* Workout Stats */}
        {post.type === 'workout' && post.workoutData && (
          <WorkoutStats workoutData={post.workoutData} />
        )}

        {/* Transformation Images */}
        {post.type === 'transformation' && post.transformationData && (
          <TransformationImages transformationData={post.transformationData} />
        )}

        {/* Try Workout CTA */}
        {post.type === 'workout' && (
          <CenteredFlex>
            <TryWorkoutButton type="button" aria-haspopup="dialog" onClick={handleTryWorkout}>
              <Zap size={16} />
              Try This Workout
            </TryWorkoutButton>
          </CenteredFlex>
        )}
      </PostContentArea>

      {post.type === 'workout' && (
        <PostWorkoutDetailsModal
          open={workoutDetailsOpen}
          workoutData={post.workoutData}
          postContent={post.content}
          onClose={() => setWorkoutDetailsOpen(false)}
        />
      )}
    </>
  );
});
PostContent.displayName = 'PostContent';

export default PostContent;
