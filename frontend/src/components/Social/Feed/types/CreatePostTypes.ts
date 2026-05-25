/**
 * ============================================================================
 * FILE: CreatePostTypes.ts
 * PURPOSE: Shared TypeScript interfaces for the CreatePost feature
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines all interfaces and type literals used across
 * CreatePostCard and its sub-components (form, media upload, type selector,
 * category override).
 *
 * HOW IT FITS IN THE APP: Imported by CreatePostCard.tsx, CreatePostForm.tsx,
 * CreatePostMediaUpload.tsx, CreatePostTypeSelector.tsx, CategoryOverrideSelector.tsx.
 *
 * KEY DECISIONS: PostType union covers core and smart-inferred verticals. WorkoutSession
 * interface tolerates multiple API field name conventions (duration vs durationMinutes)
 * because the backend has not yet standardised response shapes.
 */

import { ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────
// SECTION: Post Type Definitions
// PURPOSE: Union type for all 11 supported post categories
// ─────────────────────────────────────────────────────────────

export type PostType =
  | 'general'
  | 'workout'
  | 'transformation'
  | 'achievement'
  | 'challenge'
  | 'dance'
  | 'music'
  | 'singing'
  | 'art'
  | 'gaming'
  | 'comedy';

export type Visibility = 'public' | 'friends' | 'private';

// ─────────────────────────────────────────────────────────────
// SECTION: Post Type Option Metadata
// PURPOSE: Config object driving the type selector chips
// ─────────────────────────────────────────────────────────────

export interface PostTypeOption {
  value: PostType;
  label: string;
  icon: ReactNode;
  points: number;
  description: string;
}

export interface VisibilityOption {
  value: Visibility;
  label: string;
  icon: ReactNode;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Workout Session (API response shape)
// PURPOSE: Strict interfaces for the workout sessions API
// WHY: Backend returns fields under multiple names (Issue #4);
//      this interface accepts all known variants so the UI
//      never crashes on missing fields.
// ─────────────────────────────────────────────────────────────

export interface WorkoutSession {
  id: string;
  name?: string;
  workoutName?: string;
  title?: string;
  duration?: number;
  durationMinutes?: number;
  exerciseCount?: number;
  exercises?: unknown[];
  totalWeight?: number;
  volumeLoad?: number;
  caloriesBurned?: number;
  calories?: number;
  date?: string;
  sessionDate?: string;
  createdAt?: string;
}

export interface WorkoutSessionsResponse {
  data: WorkoutSession[];
  meta?: { total: number; page: number };
}

export interface WorkoutStats {
  duration: string;
  exerciseCount: string;
  totalWeight: string;
  caloriesBurned: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Category Override (AI Village mandate)
// PURPOSE: AI suggests a category; user can manually override
// ─────────────────────────────────────────────────────────────

export interface CategorySuggestion {
  suggested: PostType;
  confidence: number;
  reason: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Sub-Component Prop Interfaces
// PURPOSE: Props for each decomposed sub-component
// ─────────────────────────────────────────────────────────────

export interface CreatePostFormProps {
  postContent: string;
  onContentChange: (value: string) => void;
  postType: PostType;
  showCreateOptions: boolean;
  isCreatingPost: boolean;
  userName?: string;
  userPhoto?: string;
  workoutStats: WorkoutStats;
  onWorkoutStatsChange: (field: string, value: string) => void;
  onFetchWorkoutHistory: () => void;
  isLoadingHistory: boolean;
  showWorkoutHistory: boolean;
  workoutHistory: WorkoutSession[];
  onSelectWorkout: (workout: WorkoutSession) => void;
}

export interface CreatePostMediaUploadProps {
  postType: PostType;
  showCreateOptions: boolean;
  isCreatingPost: boolean;
  /** General media */
  media: File | null;
  mediaPreview: string | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  /** Transformation before/after */
  beforePreview: string | null;
  afterPreview: string | null;
  beforeImageRef: React.RefObject<HTMLInputElement>;
  afterImageRef: React.RefObject<HTMLInputElement>;
  onBeforeImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAfterImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBeforeImage: () => void;
  onRemoveAfterImage: () => void;
}

export interface CreatePostTypeSelectorProps {
  postType: PostType;
  onPostTypeChange: (type: PostType) => void;
  postTypeOptions: PostTypeOption[];
  currentDescription: string;
}

export interface CategoryOverrideSelectorProps {
  suggestion: CategorySuggestion | null;
  currentType: PostType;
  onOverride: (type: PostType) => void;
  postTypeOptions: PostTypeOption[];
}
