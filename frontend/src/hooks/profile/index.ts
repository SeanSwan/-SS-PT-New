/**
 * Profile Hooks Index
 * ====================
 * Exports all profile-related React hooks
 */

export { useProfile, default as useProfileDefault } from './useProfile';

// Re-export types for convenience
export type {
  UserProfile,
  UserStats,
  SocialPost,
  Achievement,
  FollowStats
} from '../../services/profileService';
