/**
 * useProfile Hook
 * ===============
 * React hook for managing user profile data and operations
 * Connects to SwanStudios backend PostgreSQL database
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import profileService, { UserProfile, UserStats, SocialPost, Achievement, FollowStats } from '../../services/profileService';
import { logger } from '@/utils/logger';

interface UseProfileReturn {
  /** True when the stats fetch failed and `stats` holds substituted zeros. */
  statsUnavailable: boolean;
  // Profile data
  profile: UserProfile | null;
  stats: UserStats | null;
  posts: SocialPost[];
  achievements: Achievement[];
  followStats: FollowStats | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingStats: boolean;
  isLoadingPosts: boolean;
  isLoadingAchievements: boolean;
  isLoadingFollowStats: boolean;
  isUploading: boolean;
  
  // Error states
  error: string | null;
  
  // Operations
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<void>;
  uploadBannerPhoto: (file: File) => Promise<string | null>;
  uploadBannerCollagePhoto: (file: File) => Promise<string | null>;
  loadUserPosts: (userId?: string, limit?: number, offset?: number) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshAchievements: () => Promise<void>;
  refreshFollowStats: () => Promise<void>;
  
  // Utility functions
  getDisplayName: () => string;
  getUsernameForDisplay: () => string;
  getUserInitials: () => string;
  
  // Pagination
  postsHasMore: boolean;
  postsOffset: number;
}

export const useProfile = (initialUserId?: string): UseProfileReturn => {
  // State management
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [followStats, setFollowStats] = useState<FollowStats | null>(null);

  // 2026-05-11 SLICE 1 (Codex round-6 race fix): banner-upload sequencer.
  // Each call to uploadBannerPhoto bumps this ref and captures the value.
  // After await, the call only commits its result to profile state if it
  // is still the latest banner upload for THIS hook instance. Older calls
  // that resolve out-of-order are dropped, so a stale earlier upload
  // cannot clobber the latest banner.
  const bannerUploadSeqRef = useRef(0);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsUnavailable, setStatsUnavailable] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(false);
  const [isLoadingFollowStats, setIsLoadingFollowStats] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [postsOffset, setPostsOffset] = useState(0);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(initialUserId);
  
  const { user } = useAuth();
  
  /**
   * Load profile data
   */
  const loadProfile = useCallback(async (userId?: string) => {
    if (!user && !userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let profileData: UserProfile;
      
      if (userId && userId !== user?.id) {
        // Loading another user's profile
        profileData = await profileService.getUserProfile(userId);
      } else {
        // Loading current user's profile
        profileData = await profileService.getCurrentProfile();
      }
      
      setProfile(profileData);
      setCurrentUserId(userId || user?.id);
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Load user statistics
   */
  const loadStats = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingStats(true);
    
    try {
      const statsData = await profileService.getUserStats();
      setStats(statsData);
      setStatsUnavailable(false);
    } catch (err: any) {
      logger.warn('Stats endpoint not available yet:', err.message);
      // Substituting zeros keeps the UI from crashing, but those zeros are NOT
      // the member's record. Flag it so consumers can omit the numbers instead
      // of asserting "0 workouts / 0 posts / Level 1 / bronze" as fact.
      setStatsUnavailable(true);
      setStats({
        posts: 0,
        followers: 0,
        following: 0,
        workouts: 0,
        streak: 0,
        points: 0,
        level: 1,
        tier: 'bronze'
      });
    } finally {
      setIsLoadingStats(false);
    }
  }, [user]);

  /**
   * Load user posts
   */
  const loadUserPosts = useCallback(async (userId?: string, limit: number = 20, offset: number = 0) => {
    setIsLoadingPosts(true);
    
    try {
      const postsData = await profileService.getUserPosts(userId, limit, offset);
      
      if (offset === 0) {
        // Fresh load
        setPosts(postsData.posts);
      } else {
        // Load more
        setPosts(prev => [...prev, ...postsData.posts]);
      }
      
      setPostsHasMore(postsData.posts.length === limit);
      setPostsOffset(offset + postsData.posts.length);
    } catch (err: any) {
      logger.warn('Posts endpoint not available yet:', err.message);
      // Set empty posts instead of showing error
      setPosts([]);
      setPostsHasMore(false);
      setPostsOffset(0);
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

  /**
   * Load more posts (pagination)
   */
  const loadMorePosts = useCallback(async () => {
    if (!postsHasMore || isLoadingPosts) return;
    
    await loadUserPosts(currentUserId, 20, postsOffset);
  }, [loadUserPosts, currentUserId, postsOffset, postsHasMore, isLoadingPosts]);

  /**
   * Load user achievements
   */
  const loadAchievements = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingAchievements(true);
    
    try {
      const achievementsData = await profileService.getUserAchievements();
      setAchievements(achievementsData.achievements);
    } catch (err: any) {
      logger.warn('Achievements endpoint not available yet:', err.message);
      // Set empty achievements instead of showing error
      setAchievements([]);
    } finally {
      setIsLoadingAchievements(false);
    }
  }, [user]);

  /**
   * Load follow statistics
   */
  const loadFollowStats = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingFollowStats(true);
    
    try {
      const followData = await profileService.getFollowStats();
      setFollowStats(followData);
    } catch (err: any) {
      logger.warn('Follow stats endpoint not available yet:', err.message);
      // Set default follow stats instead of showing error
      setFollowStats({
        followers: { count: 0, list: [] },
        following: { count: 0, list: [] },
        ratio: 0
      });
    } finally {
      setIsLoadingFollowStats(false);
    }
  }, [user]);

  /**
   * Refresh profile data
   */
  const refreshProfile = useCallback(async () => {
    await loadProfile(currentUserId);
  }, [loadProfile, currentUserId]);

  /**
   * Refresh stats
   */
  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  /**
   * Refresh achievements
   */
  const refreshAchievements = useCallback(async () => {
    await loadAchievements();
  }, [loadAchievements]);

  /**
   * Refresh follow stats
   */
  const refreshFollowStats = useCallback(async () => {
    await loadFollowStats();
  }, [loadFollowStats]);

  /**
   * Update profile
   */
  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedProfile = await profileService.updateProfile(data);
      setProfile(updatedProfile);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
      throw err; // Re-throw for component handling
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Upload profile photo
   */
  const uploadProfilePhoto = useCallback(async (file: File) => {
    if (!user) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      const result = await profileService.uploadProfilePhoto(file);
      setProfile(result.user);
    } catch (err: any) {
      console.error('Error uploading profile photo:', err);
      setError(err.message || 'Failed to upload profile photo');
      throw err; // Re-throw for component handling
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  /**
   * Upload banner/cover photo.
   *
   * 2026-05-11 SLICE 1 (Codex round-5): returns the server-confirmed banner
   * URL so callers can avoid round-tripping through profile state to get
   * it. This eliminates a concurrent-upload race in
   * useUserDashboardV3Controller where the success branch had to read
   * profileRef.current immediately after the await — which could be stale
   * because React effects don't run until after render commit.
   * Returns null if upload fails or no user is signed in.
   */
  const uploadBannerPhoto = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;

    setIsUploading(true);
    setError(null);

    // 2026-05-11 SLICE 1 (Codex round-6 race fix): capture this call's
    // sequence number and bump the counter. Only commit results to profile
    // state if this call is still the latest banner upload when it resolves.
    // Stale earlier uploads that resolve out-of-order do NOT setProfile,
    // so the controller's hydration effect cannot accidentally accept a
    // stale URL as a fresh external profile change.
    const mySeq = ++bannerUploadSeqRef.current;

    try {
      const result = await profileService.uploadBannerPhoto(file);
      if (mySeq !== bannerUploadSeqRef.current) {
        // A newer banner upload superseded this one; drop the result.
        return null;
      }
      if (result.user) {
        setProfile(result.user);
      } else {
        setProfile(prev => prev ? { ...prev, bannerPhoto: result.bannerPhoto } : prev);
      }
      return result.bannerPhoto ?? null;
    } catch (err: any) {
      console.error('Error uploading banner photo:', err);
      // Only surface the error if this is still the latest upload — a
      // stale rejection from a superseded upload would confuse the UI.
      if (mySeq === bannerUploadSeqRef.current) {
        setError(err.message || 'Failed to upload banner photo');
        throw err;
      }
      return null;
    } finally {
      if (mySeq === bannerUploadSeqRef.current) {
        setIsUploading(false);
      }
    }
  }, [user]);

  const uploadBannerCollagePhoto = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    setIsUploading(true);
    setError(null);

    try {
      const result = await profileService.uploadBannerCollagePhoto(file);
      return result.bannerPhoto ?? null;
    } catch (err: any) {
      console.error('Error uploading banner collage photo:', err);
      setError(err.message || 'Failed to upload collage photo');
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  /**
   * Utility function to get display name
   */
  const getDisplayName = useCallback(() => {
    if (!profile) return 'User';
    return profileService.getDisplayName(profile);
  }, [profile]);

  /**
   * Utility function to get username for display
   */
  const getUsernameForDisplay = useCallback(() => {
    if (!profile) return 'user';
    return profileService.getUsernameForDisplay(profile);
  }, [profile]);

  /**
   * Utility function to get user initials
   */
  const getUserInitials = useCallback(() => {
    if (!profile) return 'U';
    return profileService.getUserInitials(profile);
  }, [profile]);

  // Load initial data when component mounts or user changes
  useEffect(() => {
    if (user || initialUserId) {
      loadProfile(initialUserId);
      
      // Only load user-specific data for current user
      if (!initialUserId || initialUserId === user?.id) {
        loadStats();
        loadAchievements();
        loadFollowStats();
      }
      
      // Load posts for any user (current or specified)
      loadUserPosts(initialUserId, 20, 0);
    }
  }, [user, initialUserId, loadProfile, loadStats, loadAchievements, loadFollowStats, loadUserPosts]);

  return {
    // Profile data
    profile,
    stats,
    posts,
    achievements,
    followStats,
    
    // Loading states
    isLoading,
    isLoadingStats,
    isLoadingPosts,
    isLoadingAchievements,
    isLoadingFollowStats,
    isUploading,
    
    // Error states
    error,
    /** True when the stats fetch failed and `stats` holds substituted zeros. */
    statsUnavailable,
    
    // Operations
    refreshProfile,
    updateProfile,
    uploadProfilePhoto,
    uploadBannerPhoto,
    uploadBannerCollagePhoto,
    loadUserPosts,
    loadMorePosts,
    refreshStats,
    refreshAchievements,
    refreshFollowStats,
    
    // Utility functions
    getDisplayName,
    getUsernameForDisplay,
    getUserInitials,
    
    // Pagination
    postsHasMore,
    postsOffset,
  };
};

export default useProfile;
