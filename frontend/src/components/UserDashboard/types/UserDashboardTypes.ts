/**
 * ============================================================================
 * FILE: UserDashboardTypes.ts
 * PURPOSE: Shared TypeScript interfaces for the UserDashboard component tree
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines all shared types, interfaces, and enums used
 * across the decomposed UserDashboard component family.
 * HOW IT FITS IN THE APP: Imported by all UserDashboard sub-components
 * KEY DECISIONS: Centralized types prevent circular deps and duplication
 */

import type { LucideIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Profile Data Types
// PURPOSE: Types for profile data returned by useProfile hook
// ─────────────────────────────────────────────────────────────

export interface ProfileData {
  id?: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  photo?: string;
  bannerPhoto?: string;
  bio?: string;
  role?: string;
  location?: string;
  website?: string;
  phone?: string;
  fitnessGoal?: string;
  city?: string;
  state?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    custom?: { label: string; url: string };
  };
  chartVisibility?: {
    weightProgression?: boolean;
    workoutHeatmap?: boolean;
    muscleRadar?: boolean;
    goalProgress?: boolean;
    bodyFatTrend?: boolean;
    strength1RM?: boolean;
    calorieBurn?: boolean;
    sessionFrequency?: boolean;
    trainingLoad?: boolean;
    weeklyVolume?: boolean;
    exerciseComparison?: boolean;
    cardioEndurance?: boolean;
  };
  [key: string]: unknown;
}

export interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
  workouts: number;
  points: number;
  level: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Tab Configuration
// PURPOSE: Tab definition for the tab navigation bar
// ─────────────────────────────────────────────────────────────

export interface TabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
}

export type TabId =
  | 'home'
  | 'feed'
  | 'reels'
  | 'friends'
  | 'challenges'
  | 'notifications'
  | 'creative'
  | 'photos'
  | 'about'
  | 'activity'
  | 'nutrition'
  | 'progress'
  | 'community'
  | 'profile';

/**
 * Workstream N5 (tab compaction): the Creative group — four media/identity
 * lenses that share ONE visible nav entry. Each remains a real tab with its
 * own URL; an in-panel lens strip switches between them.
 */
// Profile is included for grouped nav active state; it is not shown in the lens strip.
export const STUDIO_TAB_IDS: readonly TabId[] = ['creative', 'photos', 'about', 'activity', 'profile'];

/**
 * Canonical tab list — used for /user-dashboard/:tab URL validation (merge N1).
 * 'community' stays in the TabId union for legacy types but is NOT routable —
 * its launcher panel was unmounted in N5 (cards duplicated first-class tabs);
 * /user-dashboard/community falls back to home.
 * 'feed' was unmounted in workstream O (the panel duplicated Home; Faction War
 * moved to the Home right rail) — /user-dashboard/feed falls back to home.
 */
export const USER_DASHBOARD_TAB_IDS: readonly TabId[] = [
  'home',
  'reels',
  'friends',
  'challenges',
  'notifications',
  'creative',
  'photos',
  'about',
  'activity',
  'nutrition',
  'progress',
  'profile',
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component Props
// PURPOSE: Props interfaces for each sub-component
// ─────────────────────────────────────────────────────────────

export interface ProfileBannerProps {
  backgroundImage: string | null;
  profilePhoto?: string;
  userInitials: string;
  onBannerClick: () => void;
  onProfileImageClick: () => void;
}

export interface ProfileSocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  custom?: { label: string; url: string };
}

export interface ProfileHeaderInfoProps {
  displayName: string;
  username: string;
  role: string;
  bio: string;
  stats: ProfileStats;
  socialLinks?: ProfileSocialLinks;
  onEditProfile: () => void;
  onSettings: () => void;
  onShare: () => void;
}

export interface TabNavigationProps {
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export interface QuickStatsSidebarProps {
  stats: ProfileStats;
  themeColors?: {
    primary?: string;
  };
}

export interface TabContentProps {
  activeTab: string;
}

export interface EditProfileModalProps {
  profile: ProfileData | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}
