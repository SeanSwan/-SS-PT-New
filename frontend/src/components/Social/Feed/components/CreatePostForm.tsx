/**
 * ┌─── SUB-COMPONENT: CreatePostForm ──────────────────────────┐
 * │ PARENT: CreatePostCard                                      │
 * │ PURPOSE: Text input area, workout stats form, and workout   │
 * │          history pull-in feature                            │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────────────┐    │
 * │ │ (avatar) [ textarea: "What's on your mind?" ]        │    │
 * │ │          [Pull from Workout History]                  │    │
 * │ │          ┌───────────┐ ┌───────────┐                 │    │
 * │ │          │Duration   │ │Exercises  │                 │    │
 * │ │          │Weight     │ │Calories   │                 │    │
 * │ │          └───────────┘ └───────────┘                 │    │
 * │ └──────────────────────────────────────────────────────┘    │
 * │ Props: CreatePostFormProps                                  │
 * │ CLICK-OUTCOMES:                                             │
 * │ [textarea] -> updates postContent state                     │
 * │ [Pull History] -> GET /api/v1/workouts/sessions ->          │
 * │   shows history list -> click item auto-fills stats         │
 * │ [stat input] -> updates workoutStats on parent              │
 * │ GAMIFICATION: Workout posts earn 25pts                      │
 * └────────────────────────────────────────────────────────────┘
 */

/**
 * ============================================================================
 * FILE: CreatePostForm.tsx
 * PURPOSE: Core text input, workout stats grid, and workout history selector
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the main textarea, avatar, and — when post
 * type is "workout" — a 2x2 stats grid (duration, exercises, weight, calories)
 * plus a "Pull from Workout History" button that fetches recent sessions and
 * auto-fills the stats fields.
 *
 * HOW IT FITS IN THE APP: CreatePostCard -> CreatePostForm
 * KEY DECISIONS: Workout history list items are NOT wrapped in React.memo
 * because the list is capped at 10 items and re-renders only when toggled.
 */

import React from 'react';
import { Dumbbell, History, ChevronDown } from 'lucide-react';
import {
  AvatarCircle,
  PostInputWrapper,
  FlexColumn,
  StyledTextarea,
  StyledInput,
  StyledInputGroup,
  InputLabel,
  WorkoutHistoryBtnRow,
  WorkoutHistoryBtn,
  WorkoutHistoryList,
  WorkoutHistoryItem,
  WorkoutHistoryInfo,
  WorkoutHistoryName,
  WorkoutHistoryDate,
  WorkoutHistoryEmpty,
  WorkoutStatsContainer,
} from '../styles/CreatePostStyles';
import type { CreatePostFormProps, WorkoutSession } from '../types/CreatePostTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Placeholder text map
// PURPOSE: Returns context-aware placeholder for the textarea
// ─────────────────────────────────────────────────────────────

const getPlaceholder = (postType: string, userName?: string): string => {
  switch (postType) {
    case 'workout':      return 'Share your workout achievements...';
    case 'transformation': return 'Tell your transformation story...';
    case 'achievement':  return 'What milestone did you reach?';
    case 'challenge':    return 'Describe your challenge...';
    default:             return `What's on your mind, ${userName || 'there'}?`;
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION: Workout History Sub-Section
// PURPOSE: Button to fetch history + scrollable list of sessions
// ─────────────────────────────────────────────────────────────

const WorkoutHistorySection: React.FC<{
  onFetch: () => void;
  isLoading: boolean;
  show: boolean;
  history: WorkoutSession[];
  onSelect: (w: WorkoutSession) => void;
}> = ({ onFetch, isLoading, show, history, onSelect }) => (
  <>
    <WorkoutHistoryBtnRow>
      <WorkoutHistoryBtn onClick={onFetch} disabled={isLoading}>
        <History size={16} />
        {isLoading ? 'Loading...' : 'Pull from Workout History'}
      </WorkoutHistoryBtn>
    </WorkoutHistoryBtnRow>

    {show && (
      <WorkoutHistoryList>
        {history.length === 0 ? (
          <WorkoutHistoryEmpty>No completed workouts found</WorkoutHistoryEmpty>
        ) : (
          history.slice(0, 10).map((w, i) => {
            const name = w.name || w.workoutName || w.title || 'Workout Session';
            const date = w.date || w.sessionDate || w.createdAt;
            const dateStr = date ? new Date(date).toLocaleDateString() : '';
            return (
              <WorkoutHistoryItem key={w.id || i} onClick={() => onSelect(w)}>
                <Dumbbell size={16} style={{ flexShrink: 0, color: '#60C0F0' }} />
                <WorkoutHistoryInfo>
                  <WorkoutHistoryName>{name}</WorkoutHistoryName>
                  {dateStr && <WorkoutHistoryDate>{dateStr}</WorkoutHistoryDate>}
                </WorkoutHistoryInfo>
                <ChevronDown
                  size={14}
                  style={{ transform: 'rotate(-90deg)', color: 'rgba(255,255,255,0.3)' }}
                />
              </WorkoutHistoryItem>
            );
          })
        )}
      </WorkoutHistoryList>
    )}
  </>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Workout Stats Grid
// PURPOSE: 2x2 grid of numeric inputs for workout metadata
// ─────────────────────────────────────────────────────────────

const WorkoutStatsGrid: React.FC<{
  stats: CreatePostFormProps['workoutStats'];
  onChange: (field: string, value: string) => void;
}> = ({ stats, onChange }) => (
  <WorkoutStatsContainer>
    <StyledInputGroup>
      <InputLabel>Duration (min)</InputLabel>
      <StyledInput
        value={stats.duration}
        onChange={(e) => onChange('duration', e.target.value)}
        type="number"
        placeholder="0"
      />
    </StyledInputGroup>
    <StyledInputGroup>
      <InputLabel>Exercises</InputLabel>
      <StyledInput
        value={stats.exerciseCount}
        onChange={(e) => onChange('exerciseCount', e.target.value)}
        type="number"
        placeholder="0"
      />
    </StyledInputGroup>
    <StyledInputGroup>
      <InputLabel>Total Weight (lbs)</InputLabel>
      <StyledInput
        value={stats.totalWeight}
        onChange={(e) => onChange('totalWeight', e.target.value)}
        type="number"
        placeholder="0"
      />
    </StyledInputGroup>
    <StyledInputGroup>
      <InputLabel>Calories Burned</InputLabel>
      <StyledInput
        value={stats.caloriesBurned}
        onChange={(e) => onChange('caloriesBurned', e.target.value)}
        type="number"
        placeholder="0"
      />
    </StyledInputGroup>
  </WorkoutStatsContainer>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Main Export — CreatePostForm
// PURPOSE: Assembles avatar + textarea + conditional workout UI
// ─────────────────────────────────────────────────────────────

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
  onFetchWorkoutHistory,
  isLoadingHistory,
  showWorkoutHistory,
  workoutHistory,
  onSelectWorkout,
}) => {
  return (
    <PostInputWrapper>
      <AvatarCircle>
        {userPhoto ? (
          <img src={userPhoto} alt={userName || 'User'} />
        ) : (
          userName?.[0] || 'U'
        )}
      </AvatarCircle>

      <FlexColumn>
        <StyledTextarea
          $rows={showCreateOptions ? 4 : 3}
          placeholder={getPlaceholder(postType, userName)}
          value={postContent}
          onChange={(e) => onContentChange(e.target.value)}
          disabled={isCreatingPost}
        />

        {/* Workout-specific: history pull + stats grid */}
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
          </>
        )}
      </FlexColumn>
    </PostInputWrapper>
  );
};

export default React.memo(CreatePostForm);
