/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: CreatePostCard                                    ║
 * ║  PURPOSE: Orchestrator for creating social feed posts         ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────┐
 * │ [Quick Post / Create Post]          [+25 points chip]  │
 * │ [PostTypeSelector chips — 11 types]                    │
 * │ [CategoryOverrideSelector — AI suggestion + override]  │
 * │ [CreatePostForm — avatar + textarea + workout stats]   │
 * │ [CreatePostMediaUpload — images/video/transformation]  │
 * │ ┌──────────────────────────────────────────────────┐   │
 * │ │ [More Options] [Add Media] [Visibility ▼]        │   │
 * │ │                     [Simple Mode] [Post button]  │   │
 * │ └──────────────────────────────────────────────────┘   │
 * └────────────────────────────────────────────────────────┘
 * [FloatingCreateButton — fixed bottom-right FAB]
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[CreatePostCard] --> B[CreatePostTypeSelector]
 *   A --> C[CategoryOverrideSelector]
 *   A --> D[CreatePostForm]
 *   A --> E[CreatePostMediaUpload]
 *   A --> F[useCreatePostForm hook]
 *   D --> D1[WorkoutHistorySection]
 *   D --> D2[WorkoutStatsGrid]
 *   E --> E1[TransformationUpload]
 *   E --> E2[GeneralMediaPreview]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [FAB] -> scrolls to card + expands options
 * [More Options] -> shows type selector + extra fields
 * [Simple Mode] -> collapses back to quick post
 * [Add Media] -> opens file picker -> preview shows
 * [Visibility select] -> sets post privacy level
 * [Post button] -> validates -> POST /api/social/posts -> resets form
 * [Type chip] -> sets postType -> adjusts form fields + placeholder
 *
 * DATA FLOW:
 * Props In:  (none — uses auth context via useCreatePostForm hook)
 * State:     All state managed by useCreatePostForm hook
 * API Calls: POST /api/social/posts, GET /api/workout/sessions
 * Events:    createPost (via useSocialFeed), triggerFromResult (celebration)
 * Children:  CreatePostTypeSelector, CategoryOverrideSelector,
 *            CreatePostForm, CreatePostMediaUpload
 *
 * GAMIFICATION HOOKS:
 * - Post creation -> useSocialFeed.createPost -> backend awards points
 * - Points awarded -> triggerFromResult fires celebration animation
 * - Point preview chip shows expected XP before posting
 */

/**
 * ============================================================================
 * FILE: CreatePostCard.tsx
 * PURPOSE: Thin render shell for the multi-type social post creation card
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the create-post UI by composing sub-components
 * and wiring them to state/callbacks from the useCreatePostForm hook.
 *
 * HOW IT FITS IN THE APP: SocialFeed -> CreatePostCard -> sub-components
 * KEY DECISIONS: All state and handlers extracted to useCreatePostForm.ts
 * to satisfy the 300-line no-monolith rule. This file is render-only.
 */

import React from 'react';
import {
  User, Users, Globe, Plus, Dumbbell, Camera, Trophy, Target, Star, Image, Send,
  Music2, Mic2, Mic, Palette, Gamepad2, Laugh,
} from 'lucide-react';

// Sub-components
import CreatePostTypeSelector from './components/CreatePostTypeSelector';
import CategoryOverrideSelector from './components/CategoryOverrideSelector';
import CreatePostForm from './components/CreatePostForm';
import CreatePostHashtagAssist from './components/CreatePostHashtagAssist';
import CreatePostMediaUpload from './components/CreatePostMediaUpload';

// Hook
import { useCreatePostForm } from './hooks/useCreatePostForm';

// Styles
import {
  CreatePostCardWrapper, CardBody, CardHeader, Heading6,
  PointPreviewChip, FormFooter, FooterLeft, FooterRight,
  OutlinedButton, ContainedButton, Spinner,
  FloatingCreateButton, VisibilitySelectWrapper, NativeSelect,
  SelectHelperText, FlexColumn,
} from './styles/CreatePostStyles';

// Types
import type { PostTypeOption, VisibilityOption } from './types/CreatePostTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Static Config
// PURPOSE: Post type and visibility option definitions
// ─────────────────────────────────────────────────────────────

export const POST_TYPE_OPTIONS: PostTypeOption[] = [
  { value: 'general', label: 'Post', icon: <User size={16} />, points: 10, description: 'Share a quick update' },
  { value: 'workout', label: 'Workout', icon: <Dumbbell size={16} />, points: 25, description: 'Share your completed workout' },
  { value: 'transformation', label: 'Transformation', icon: <Camera size={16} />, points: 50, description: 'Before & after progress photos' },
  { value: 'achievement', label: 'Achievement', icon: <Trophy size={16} />, points: 30, description: 'Celebrate a fitness milestone' },
  { value: 'challenge', label: 'Challenge', icon: <Target size={16} />, points: 20, description: 'Create or complete a challenge' },
  // Merge M4: creative/expression types — the canonical composer must cover
  // the full feed-supported range (backend enum + the retiring Observatory
  // Quick Post offered these), so the M6 redirect loses no posting ability.
  // Icons match ChallengesView's category map for cross-surface consistency.
  { value: 'dance', label: 'Dance', icon: <Music2 size={16} />, points: 20, description: 'Share your moves' },
  { value: 'music', label: 'Music', icon: <Mic2 size={16} />, points: 20, description: 'Share a track or playlist' },
  { value: 'singing', label: 'Singing', icon: <Mic size={16} />, points: 20, description: 'Share your voice' },
  { value: 'art', label: 'Art', icon: <Palette size={16} />, points: 20, description: 'Share your creative work' },
  { value: 'gaming', label: 'Gaming', icon: <Gamepad2 size={16} />, points: 15, description: 'Share a gaming highlight' },
  { value: 'comedy', label: 'Comedy', icon: <Laugh size={16} />, points: 15, description: 'Make the community laugh' },
];

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  { value: 'public', label: 'Public', icon: <Globe size={16} /> },
  { value: 'friends', label: 'Friends', icon: <Users size={16} /> },
  { value: 'private', label: 'Only Me', icon: <User size={16} /> },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// PURPOSE: Render shell — all state lives in useCreatePostForm
// ─────────────────────────────────────────────────────────────

const CreatePostCard: React.FC = () => {
  const form = useCreatePostForm();
  const currentPostType = POST_TYPE_OPTIONS.find(t => t.value === form.postType) || POST_TYPE_OPTIONS[0];

  return (
    <>
      <CreatePostCardWrapper ref={form.createCardRef}>
        <CardBody>
          <CardHeader>
            <Heading6>{form.showCreateOptions ? 'Create Post' : 'Quick Post'}</Heading6>
            <PointPreviewChip>
              <Star size={14} />
              +{currentPostType.points} points
            </PointPreviewChip>
          </CardHeader>

          {form.showCreateOptions && (
            <CreatePostTypeSelector
              postType={form.postType}
              onPostTypeChange={form.setPostType}
              postTypeOptions={POST_TYPE_OPTIONS}
              currentDescription={currentPostType.description}
            />
          )}

          {form.showCreateOptions && (
            <CategoryOverrideSelector
              suggestion={form.categorySuggestion}
              currentType={form.postType}
              onOverride={form.setPostType}
              postTypeOptions={POST_TYPE_OPTIONS}
            />
          )}

          <CreatePostForm
            postContent={form.postContent}
            onContentChange={form.setPostContent}
            postType={form.postType}
            showCreateOptions={form.showCreateOptions}
            isCreatingPost={form.isCreatingPost}
            userName={form.user?.firstName}
            userPhoto={form.user?.photo}
            workoutStats={form.workoutStats}
            onWorkoutStatsChange={(field, value) => form.setWorkoutStats(prev => ({ ...prev, [field]: value }))}
            workoutExercises={form.workoutExercises}
            onAddWorkoutExercise={form.addWorkoutExercise}
            onAddCustomWorkoutExercise={form.addCustomWorkoutExercise}
            onWorkoutExerciseChange={form.updateWorkoutExercise}
            onRemoveWorkoutExercise={form.removeWorkoutExercise}
            onFetchWorkoutHistory={form.fetchWorkoutHistory}
            isLoadingHistory={form.isLoadingHistory}
            showWorkoutHistory={form.showWorkoutHistory}
            workoutHistory={form.workoutHistory}
            onSelectWorkout={form.selectWorkoutFromHistory}
          />

          <CreatePostHashtagAssist
            intent={form.smartIntent}
            onAddHashtag={form.addHashtagToContent}
          />

          <FlexColumn>
            <CreatePostMediaUpload
              postType={form.postType}
              showCreateOptions={form.showCreateOptions}
              isCreatingPost={form.isCreatingPost}
              media={form.media}
              mediaPreview={form.mediaPreview}
              onFileSelect={form.handleFileSelect}
              onRemoveMedia={form.handleRemoveMedia}
              fileInputRef={form.fileInputRef}
              beforePreview={form.beforePreview}
              afterPreview={form.afterPreview}
              beforeImageRef={form.beforeImageRef}
              afterImageRef={form.afterImageRef}
              onBeforeImageSelect={form.handleBeforeImageSelect}
              onAfterImageSelect={form.handleAfterImageSelect}
              onRemoveBeforeImage={form.handleRemoveBeforeImage}
              onRemoveAfterImage={form.handleRemoveAfterImage}
            />

            <FormFooter>
              <FooterLeft>
                {!form.showCreateOptions && (
                  <OutlinedButton onClick={() => form.setShowCreateOptions(true)} disabled={form.isCreatingPost}>
                    <Plus size={16} /> More Options
                  </OutlinedButton>
                )}
                {form.showCreateOptions && form.postType !== 'transformation' && (
                  <>
                    <input ref={form.fileInputRef} type="file" accept="image/*,video/mp4,video/mov,video/webm" style={{ display: 'none' }} onChange={form.handleFileSelect} />
                    <OutlinedButton onClick={() => form.fileInputRef.current?.click()} disabled={form.isCreatingPost}>
                      <Image size={16} /> Add Media
                    </OutlinedButton>
                  </>
                )}
                <VisibilitySelectWrapper>
                  <NativeSelect value={form.visibility} onChange={(e) => form.setVisibility(e.target.value as any)} disabled={form.isCreatingPost}>
                    {VISIBILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </NativeSelect>
                  <SelectHelperText>Who can see your post</SelectHelperText>
                </VisibilitySelectWrapper>
              </FooterLeft>
              <FooterRight>
                {form.showCreateOptions && (
                  <OutlinedButton onClick={() => form.setShowCreateOptions(false)} disabled={form.isCreatingPost}>Simple Mode</OutlinedButton>
                )}
                <ContainedButton onClick={form.handleCreatePost} disabled={form.isSubmitDisabled}>
                  {form.isCreatingPost ? 'Posting...' : `Post (+${currentPostType.points} pts)`}
                  {form.isCreatingPost ? <Spinner /> : <Send size={16} />}
                </ContainedButton>
              </FooterRight>
            </FormFooter>
          </FlexColumn>
        </CardBody>
      </CreatePostCardWrapper>

      {!form.showCreateOptions && (
        <FloatingCreateButton
          onClick={() => { form.setShowCreateOptions(true); setTimeout(() => form.createCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}
          disabled={form.isCreatingPost}
          title="Create an enhanced post with more options"
        >
          <Plus size={24} />
        </FloatingCreateButton>
      )}
    </>
  );
};

export default CreatePostCard;
