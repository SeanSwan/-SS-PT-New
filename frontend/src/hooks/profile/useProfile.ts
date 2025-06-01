/**
 * useProfile Hook
 * ===============
 * React hook for managing user profile data and operations
 * Connects to SwanStudios backend PostgreSQL database
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import profileService, { UserProfile, UserStats, SocialPost, Achievement, FollowStats } from '../../services/profileService';

interface UseProfileReturn {
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
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
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
    setError(null);
    
    try {
      const statsData = await profileService.getUserStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError(err.message || 'Failed to load stats');
    } finally {
      setIsLoadingStats(false);
    }
  }, [user]);

  /**
   * Load user posts
   */
  const loadUserPosts = useCallback(async (userId?: string, limit: number = 20, offset: number = 0) => {
    setIsLoadingPosts(true);
    setError(null);
    
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
      console.error('Error loading posts:', err);
      setError(err.message || 'Failed to load posts');
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
    setError(null);
    
    try {
      const achievementsData = await profileService.getUserAchievements();
      setAchievements(achievementsData.achievements);
    } catch (err: any) {
      console.error('Error loading achievements:', err);
      setError(err.message || 'Failed to load achievements');
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
    setError(null);
    
    try {
      const followData = await profileService.getFollowStats();
      setFollowStats(followData);
    } catch (err: any) {
      console.error('Error loading follow stats:', err);
      setError(err.message || 'Failed to load follow stats');
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
    
    // Operations
    refreshProfile,
    updateProfile,
    uploadProfilePhoto,
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