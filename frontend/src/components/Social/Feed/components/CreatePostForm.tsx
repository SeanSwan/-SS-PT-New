/**
 * ============================================================================
 * FILE: CreatePostForm.tsx
 * PURPOSE: Core text input, workout stats, history pull-in, and attachments
 * AUTHOR: Claude Opus 4.6 | UPDATED BY: Codex | LAST MODIFIED: 2026-06-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the main post textarea and, for workout posts,
 * the completed-workout history selector, summary stats, and Rolodex-backed
 * workout attachment builder.
 *
 * HOW IT FITS IN THE APP: CreatePostCard -> CreatePostForm -> optional workout
 * details panel. All mutable state is owned by useCreatePostForm.
 *
 * KEY DECISIONS: The workout builder stays visible only in expanded workout
 * mode so quick posts remain lightweight, while structured details are one tap
 * away for posts that should power Try This Workout.
 */

import React from 'react';
import { ChevronDown, Dumbbell, History } from 'lucide-react';
import {
  AvatarCircle,
  FlexColumn,
  InputLabel,
  PostInputWrapper,
  StyledInput,
  StyledInputGroup,
  StyledTextarea,
  WorkoutHistoryBtn,
  WorkoutHistoryBtnRow,
  WorkoutHistoryDate,
  WorkoutHistoryEmpty,
  WorkoutHistoryInfo,
  WorkoutHistoryItem,
  WorkoutHistoryList,
  WorkoutHistoryName,
  WorkoutStatsContainer,
} from '../styles/CreatePostStyles';
import type { CreatePostFormProps, WorkoutSession, WorkoutStats } from '../types/CreatePostTypes';
import CreateWorkoutAttachmentPanel from './CreateWorkoutAttachmentPanel';

const getPlaceholder = (postType: string, userName?: string): string => {
  switch (postType) {
    case 'workout':
      return 'Share your workout achievements...';
    case 'transformation':
      return 'Tell your transformation story...';
    case 'achievement':
      return 'What milestone did you reach?';
    case 'challenge':
      return 'Describe your challenge...';
    default:
      return `What's on your mind, ${userName || 'there'}?`;
  }
};

const workoutStatFields: Array<{
  field: keyof WorkoutStats;
  label: string;
  ariaLabel: string;
}> = [
  { field: 'duration', label: 'Duration (min)', ariaLabel: 'Workout duration in minutes' },
  { field: 'exerciseCount', label: 'Exercises', ariaLabel: 'Workout exercise count' },
  { field: 'totalWeight', label: 'Total Weight (lbs)', ariaLabel: 'Workout total weight in pounds' },
  { field: 'caloriesBurned', label: 'Calories Burned', ariaLabel: 'Workout calories burned' },
];

const workoutLabelId = (field: keyof WorkoutStats): string => `workout-stat-${field}`;

const WorkoutHistorySection: React.FC<{
  onFetch: () => void;
  isLoading: boolean;
  show: boolean;
  history: WorkoutSession[];
  onSelect: (workout: WorkoutSession) => void;
}> = ({ onFetch, isLoading, show, history, onSelect }) => (
  <>
    <WorkoutHistoryBtnRow>
      <WorkoutHistoryBtn type="button" onClick={onFetch} disabled={isLoading}>
        <History size={16} />
        {isLoading ? 'Loading...' : 'Pull from Workout History'}
      </WorkoutHistoryBtn>
    </WorkoutHistoryBtnRow>

    {show && (
      <WorkoutHistoryList>
        {history.length === 0 ? (
          <WorkoutHistoryEmpty>No completed workouts found</WorkoutHistoryEmpty>
        ) : (
          history.slice(0, 10).map((workout, index) => {
            const name = workout.name || workout.workoutName || workout.title || 'Workout Session';
            const date = workout.date || workout.sessionDate || workout.createdAt;
            const dateStr = date ? new Date(date).toLocaleDateString() : '';
            const handleSelect = () => onSelect(workout);

            return (
              <WorkoutHistoryItem
                key={workout.id || index}
                role="button"
                tabIndex={0}
                onClick={handleSelect}
                style={{ minHeight: 44 }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelect();
                  }
                }}
              >
                <Dumbbell size={16} style={{ flexShrink: 0 }} />
                <WorkoutHistoryInfo>
                  <WorkoutHistoryName>{name}</WorkoutHistoryName>
                  {dateStr && <WorkoutHistoryDate>{dateStr}</WorkoutHistoryDate>}
                </WorkoutHistoryInfo>
                <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
              </WorkoutHistoryItem>
            );
          })
        )}
      </WorkoutHistoryList>
    )}
  </>
);

const WorkoutStatsGrid: React.FC<{
  stats: WorkoutStats;
  onChange: (field: keyof WorkoutStats, value: string) => void;
}> = ({ stats, onChange }) => (
  <WorkoutStatsContainer>
    {workoutStatFields.map(({ field, label, ariaLabel }) => (
      <StyledInputGroup key={field}>
        <InputLabel htmlFor={workoutLabelId(field)}>{label}</InputLabel>
        <StyledInput
          id={workoutLabelId(field)}
          value={stats[field]}
          onChange={(event) => onChange(field, event.target.value)}
          type="number"
          placeholder="0"
          aria-label={ariaLabel}
        />
      </StyledInputGroup>
    ))}
  </WorkoutStatsContainer>
);

const CreatePostForm: React.FC<CreatePostFormProps> = ({
  postContent,
  onContentChange,
  postType,
  showCreateOptions,
  isCreatingPost,
  userName,
  userPhoto,
  workoutStats,
  onWorkoutStatsChange,
  workoutExercises,
  onAddWorkoutExercise,
  onAddCustomWorkoutExercise,
  onWorkoutExerciseChange,
  onRemoveWorkoutExercise,
  onFetchWorkoutHistory,
  isLoadingHistory,
  showWorkoutHistory,
  workoutHistory,
  onSelectWorkout,
}) => (
  <PostInputWrapper>
    <AvatarCircle>
      {userPhoto ? <img src={userPhoto} alt={userName || 'User'} /> : userName?.[0] || 'U'}
    </AvatarCircle>

    <FlexColumn>
      <StyledTextarea
        $rows={showCreateOptions ? 4 : 3}
        placeholder={getPlaceholder(postType, userName)}
        value={postContent}
        onChange={(event) => onContentChange(event.target.value)}
        disabled={isCreatingPost}
      />

      {showCreateOptions && postType === 'workout' && (
        <>
          <WorkoutHistorySection
            onFetch={onFetchWorkoutHistory}
            isLoading={isLoadingHistory}
            show={showWorkoutHistory}
            history={workoutHistory}
            onSelect={onSelectWorkout}
          />
          <WorkoutStatsGrid
            stats={workoutStats}
            onChange={onWorkoutStatsChange}
          />
          <CreateWorkoutAttachmentPanel
            exercises={workoutExercises}
            onAddExercise={onAddWorkoutExercise}
            onAddCustomExercise={onAddCustomWorkoutExercise}
            onExerciseChange={onWorkoutExerciseChange}
            onRemoveExercise={onRemoveWorkoutExercise}
          />
        </>
      )}
    </FlexColumn>
  </PostInputWrapper>
);

export default React.memo(CreatePostForm);
