/**
 * ============================================================================
 * FILE: ExploreTypes.ts
 * PURPOSE: Type definitions for the Social Explore tab
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 */

export interface TrendingPost {
  id: number | string;
  userId: number | string;
  content: string;
  type: string;
  visibility: string;
  mediaUrl: string | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
    photo: string | null;
    role: string;
  } | null;
}

export interface DiscoverUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  photo: string | null;
  points: number;
  level: number;
  tier: string;
  streakDays: number;
  totalWorkouts: number;
  recommendationReason?: string;
}

export interface FeaturedChallenge {
  id: number | string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  participantCount: number;
  startDate: string;
  endDate: string;
  reward: { xp: number; badge?: string } | null;
  status: string;
}

export type ExploreSection = 'all' | 'trending' | 'people' | 'oracle' | 'challenges';
