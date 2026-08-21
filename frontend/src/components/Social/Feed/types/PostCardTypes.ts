/**
 * ============================================================================
 * FILE: PostCardTypes.ts
 * PURPOSE: Shared type definitions for the PostCard component family
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines all TypeScript interfaces and type maps used
 * across PostCard sub-components (header, content, actions, comments, media).
 * HOW IT FITS IN THE APP: Imported by PostCard.tsx and all sub-components.
 * KEY DECISIONS: Centralized types prevent circular imports and duplication.
 */

import React from 'react';

// ─────────────────────────────────────────────────────────────
// SECTION: Data Interfaces
// PURPOSE: Core data shapes from the Social API
// ─────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  parentCommentId?: string | null;
  replies?: Comment[];
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photo?: string;
    role?: string;
  };
}

/** Coach presence: trainers AND the admin owner count as coaches in the
    community — their posts/comments carry the Gilded Fern coach marks. */
export const isCoachRole = (role?: string): boolean =>
  role === 'trainer' || role === 'admin';

export interface WorkoutPostExercise {
  name?: string;
  sourceExerciseId?: string;
  sets?: string;
  reps?: string;
  weight?: string;
  duration?: string;
  rest?: string;
  notes?: string;
}

export interface WorkoutPostData {
  title?: string;
  focus?: string;
  source?: 'manual' | 'logger' | 'plan' | 'pdf' | string;
  duration?: string;
  exerciseCount?: string;
  totalWeight?: string;
  caloriesBurned?: string;
  notes?: string;
  exercises?: WorkoutPostExercise[];
}

export interface TransformationPostData {
  hasBeforeImage?: boolean;
  hasAfterImage?: boolean;
  beforeImageUrl?: string;
  afterImageUrl?: string;
}

export interface AchievementPostData {
  title?: string;
  description?: string;
  points?: number;
}

export interface ChallengePostData {
  title?: string;
  difficulty?: string;
  duration?: string;
}

export interface ProgressProofPostData {
  proofLevel?: string;
  populatedCharts?: number;
  totalCharts?: number;
  nextUnlock?: string;
  headline?: string;
}

export interface Post {
  id: string;
  content: string;
  type:
    | 'general'
    | 'workout'
    | 'achievement'
    | 'challenge'
    | 'transformation'
    | 'milestone'
    | 'creative'
    | 'dance'
    | 'music'
    | 'singing'
    | 'art'
    | 'gaming'
    | 'comedy';
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    photo?: string;
    role?: string;
    clientSource?: 'swanstudios' | 'move_fitness' | 'external';
    level?: number;
    tier?: string;
    points?: number;
    jobClass?: string | null;
  };
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  reactionCounts?: { thumbs_up: number; heart: number; swan: number };
  userReactions?: string[];
  isRepost?: boolean;
  originalPostId?: string;
  repostCount?: number;
  isEdited?: boolean;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | null;
  comments?: Comment[];
  workoutData?: WorkoutPostData;
  transformationData?: TransformationPostData;
  achievementData?: AchievementPostData;
  challengeData?: ChallengePostData;
  progressProofData?: ProgressProofPostData;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component Prop Interfaces
// PURPOSE: Props for PostCard and each sub-component
// ─────────────────────────────────────────────────────────────

export interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onReact?: (postId: string, reactionType: string) => void;
  onRemoveReaction?: (postId: string, reactionType: string) => void;
  onComment: (postId: string, content: string) => void;
  onDelete?: (postId: string) => Promise<boolean>;
  onEdit?: (postId: string, content: string) => Promise<boolean>;
  onReport?: (postId: string, reason: string, description?: string) => Promise<boolean>;
  onRepost?: (postId: string, content?: string) => Promise<boolean>;
  /** Fetches the post's comment THREAD on first open — feed payloads carry
      counts only, so without this other members' (and coaches') comments
      would never render. */
  onLoadComments?: (postId: string) => Promise<unknown> | void;
  readOnly?: boolean;
  contextSlot?: React.ReactNode;
}

export interface PostHeaderProps {
  post: Post;
  timeAgo: string;
  onMenuToggle: () => void;
  menuOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement>;
  onMenuClose: () => void;
  onReport: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onCopyLink: () => void;
  isOwnPost: boolean;
  readOnly?: boolean;
}

export interface PostContentProps {
  post: Post;
}

export interface PostActionsProps {
  post: Post;
  userReactions: string[];
  reactionCounts: { thumbs_up: number; heart: number; swan: number };
  onReaction: (reactionType: string, event?: React.MouseEvent) => void;
  showComments: boolean;
  onToggleComments: () => void;
  onShareClick: () => void;
}

export interface PostCommentsProps {
  comments: Comment[];
  currentUser?: {
    photo?: string;
    firstName?: string;
  };
  commentText: string;
  onCommentTextChange: (text: string) => void;
  onSubmitComment: () => void;
  onCommentKeyPress: (e: React.KeyboardEvent) => void;
}

export interface PostMediaDisplayProps {
  post: Post;
  gradient: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Constant Maps
// PURPOSE: Post type configuration (icons, labels, colors, gradients)
// WHY: Shared across PostHeader, PostMediaDisplay, PostContent
// ─────────────────────────────────────────────────────────────

/** Category gradient overlays (dark enough for text readability) */
export const CATEGORY_GRADIENTS: Record<string, string> = {
  workout: 'linear-gradient(135deg, rgba(96,192,240,0.5) 0%, rgba(0,32,96,0.85) 100%)',
  milestone: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-gold, #C6A84B) 58%, transparent) 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 38%, transparent) 45%, rgba(0,32,96,0.9) 100%)',
  transformation: 'linear-gradient(135deg, rgba(233,30,99,0.6) 0%, rgba(0,32,96,0.85) 100%)',
  achievement: 'linear-gradient(135deg, rgba(255,152,0,0.6) 0%, rgba(0,32,96,0.85) 100%)',
  challenge: 'linear-gradient(135deg, rgba(156,39,176,0.6) 0%, rgba(0,32,96,0.85) 100%)',
  dance: 'linear-gradient(135deg, rgba(236,72,153,0.6) 0%, rgba(0,32,96,0.85) 100%)',
  music: 'linear-gradient(135deg, rgba(168,85,247,0.6) 0%, rgba(0,32,96,0.85) 100%)',
  singing: 'linear-gradient(135deg, rgba(244,114,182,0.6) 0%, rgba(0,32,96,0.85) 100%)',
  art: 'linear-gradient(135deg, rgba(245,158,11,0.6) 0%, rgba(0,32,96,0.85) 100%)',
  gaming: 'linear-gradient(135deg, rgba(34,197,94,0.6) 0%, rgba(0,32,96,0.85) 100%)',
  comedy: 'linear-gradient(135deg, rgba(251,191,36,0.6) 0%, rgba(0,32,96,0.85) 100%)',
  creative: 'linear-gradient(135deg, rgba(139,92,246,0.6) 0%, rgba(0,32,96,0.85) 100%)',
  general: 'linear-gradient(135deg, rgba(139,92,246,0.5) 0%, rgba(0,32,96,0.9) 100%)',
};

/** Post type labels for display */
export const postTypeLabels: Record<string, string> = {
  general: 'Post',
  workout: 'Workout',
  milestone: 'Progress Proof',
  achievement: 'Achievement',
  challenge: 'Challenge',
  transformation: 'Transformation',
  dance: 'Dance',
  music: 'Music Production',
  singing: 'Singing',
  art: 'Art',
  gaming: 'Gaming',
  comedy: 'Comedy',
  creative: 'Creative',
};

/** Post type → chip color key mapping */
export const postTypeColors: Record<string, string> = {
  general: 'default',
  workout: 'primary',
  milestone: 'warning',
  achievement: 'warning',
  challenge: 'warning',
  transformation: 'secondary',
  dance: 'secondary',
  music: 'secondary',
  singing: 'secondary',
  art: 'warning',
  gaming: 'success',
  comedy: 'warning',
  creative: 'primary',
};

/** Default post background: SwanStudios Logo on Midnight Sapphire */
export const SWAN_LOGO_URL = '/Logo.png';
