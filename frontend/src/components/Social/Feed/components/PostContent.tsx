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
 * │ [Try This Workout] -> console.log (future: opens generator) │
 * │ GAMIFICATION: None directly (parent handles point awards)   │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import { Clock, Dumbbell, Weight, Flame, Zap, Trophy, Star, Play } from 'lucide-react';
import type { PostContentProps } from '../types/PostCardTypes';
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
  TryWorkoutButton,
  CenteredFlex,
  AchievementBadge,
  AchievementTextBlock,
  AchievementTitle,
  AchievementDescription,
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
  ].filter(stat => stat.value && stat.value.trim());

  if (stats.length === 0) return null;

  return (
    <WorkoutStatsContainer>
      {stats.map(({ icon: Icon, label, value, unit }) => (
        <WorkoutStatItem key={label}>
          <Icon size={20} color="#60C0F0" />
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

const AchievementBadgeBlock: React.FC<{ achievementData: NonNullable<PostContentProps['post']['achievementData']> }> = React.memo(({ achievementData }) => (
  <AchievementBadge>
    <Trophy size={24} color="#f7b32b" />
    <AchievementTextBlock>
      <AchievementTitle>
        {achievementData.title || 'Achievement Unlocked!'}
      </AchievementTitle>
      <AchievementDescription>
        {achievementData.description || 'Reached a new milestone'}
      </AchievementDescription>
    </AchievementTextBlock>
    {achievementData.points && (
      <PointsChip>
        <Star size={14} />
        +{achievementData.points} pts
      </PointsChip>
    )}
  </AchievementBadge>
));
AchievementBadgeBlock.displayName = 'AchievementBadgeBlock';

// ─────────────────────────────────────────────────────────────
// SECTION: Transformation Images Renderer
// ─────────────────────────────────────────────────────────────

const TransformationImages: React.FC<{
  transformationData: NonNullable<PostContentProps['post']['transformationData']>;
  sliderValue: number;
}> = React.memo(({ transformationData, sliderValue }) => (
  <TransformationImageContainer>
    {transformationData.beforeImageUrl && (
      <TransformationImage
        src={transformationData.beforeImageUrl}
        alt="Before transformation"
        style={{ opacity: sliderValue / 100 }}
      />
    )}
    {transformationData.afterImageUrl && (
      <TransformationImage
        src={transformationData.afterImageUrl}
        alt="After transformation"
        style={{ opacity: 1 - (sliderValue / 100) }}
      />
    )}
    <TransformationSlider>
      <Play size={16} />
    </TransformationSlider>
  </TransformationImageContainer>
));
TransformationImages.displayName = 'TransformationImages';

// ─────────────────────────────────────────────────────────────
// SECTION: PostContent Component
// ─────────────────────────────────────────────────────────────

const PostContent: React.FC<PostContentProps> = React.memo(({ post, transformationSliderValue }) => {
  const handleTryWorkout = () => {
    // Future: integrate with workout generator
    console.log('Opening workout generator with this workout as template...');
  };

  return (
    <PostContentArea>
      {/* Achievement Badge */}
      {post.type === 'achievement' && post.achievementData && (
        <AchievementBadgeBlock achievementData={post.achievementData} />
      )}

      <PostText>{post.content}</PostText>

      {/* Workout Stats */}
      {post.type === 'workout' && post.workoutData && (
        <WorkoutStats workoutData={post.workoutData} />
      )}

      {/* Transformation Images */}
      {post.type === 'transformation' && post.transformationData && (
        <TransformationImages
          transformationData={post.transformationData}
          sliderValue={transformationSliderValue}
        />
      )}

      {/* Try Workout CTA */}
      {post.type === 'workout' && (
        <CenteredFlex>
          <TryWorkoutButton onClick={handleTryWorkout}>
            <Zap size={16} />
            Try This Workout
          </TryWorkoutButton>
        </CenteredFlex>
      )}
    </PostContentArea>
  );
});

PostContent.displayName = 'PostContent';

export default PostContent;
