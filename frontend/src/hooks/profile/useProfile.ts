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
  }, [user]);\n\n  /**\n   * Load user statistics\n   */\n  const loadStats = useCallback(async () => {\n    if (!user) return;\n    \n    setIsLoadingStats(true);\n    setError(null);\n    \n    try {\n      const statsData = await profileService.getUserStats();\n      setStats(statsData);\n    } catch (err: any) {\n      console.error('Error loading stats:', err);\n      setError(err.message || 'Failed to load stats');\n    } finally {\n      setIsLoadingStats(false);\n    }\n  }, [user]);\n\n  /**\n   * Load user posts\n   */\n  const loadUserPosts = useCallback(async (userId?: string, limit: number = 20, offset: number = 0) => {\n    setIsLoadingPosts(true);\n    setError(null);\n    \n    try {\n      const postsData = await profileService.getUserPosts(userId, limit, offset);\n      \n      if (offset === 0) {\n        // Fresh load\n        setPosts(postsData.posts);\n      } else {\n        // Load more\n        setPosts(prev => [...prev, ...postsData.posts]);\n      }\n      \n      setPostsHasMore(postsData.posts.length === limit);\n      setPostsOffset(offset + postsData.posts.length);\n    } catch (err: any) {\n      console.error('Error loading posts:', err);\n      setError(err.message || 'Failed to load posts');\n    } finally {\n      setIsLoadingPosts(false);\n    }\n  }, []);\n\n  /**\n   * Load more posts (pagination)\n   */\n  const loadMorePosts = useCallback(async () => {\n    if (!postsHasMore || isLoadingPosts) return;\n    \n    await loadUserPosts(currentUserId, 20, postsOffset);\n  }, [loadUserPosts, currentUserId, postsOffset, postsHasMore, isLoadingPosts]);\n\n  /**\n   * Load user achievements\n   */\n  const loadAchievements = useCallback(async () => {\n    if (!user) return;\n    \n    setIsLoadingAchievements(true);\n    setError(null);\n    \n    try {\n      const achievementsData = await profileService.getUserAchievements();\n      setAchievements(achievementsData.achievements);\n    } catch (err: any) {\n      console.error('Error loading achievements:', err);\n      setError(err.message || 'Failed to load achievements');\n    } finally {\n      setIsLoadingAchievements(false);\n    }\n  }, [user]);\n\n  /**\n   * Load follow statistics\n   */\n  const loadFollowStats = useCallback(async () => {\n    if (!user) return;\n    \n    setIsLoadingFollowStats(true);\n    setError(null);\n    \n    try {\n      const followData = await profileService.getFollowStats();\n      setFollowStats(followData);\n    } catch (err: any) {\n      console.error('Error loading follow stats:', err);\n      setError(err.message || 'Failed to load follow stats');\n    } finally {\n      setIsLoadingFollowStats(false);\n    }\n  }, [user]);\n\n  /**\n   * Refresh profile data\n   */\n  const refreshProfile = useCallback(async () => {\n    await loadProfile(currentUserId);\n  }, [loadProfile, currentUserId]);\n\n  /**\n   * Refresh stats\n   */\n  const refreshStats = useCallback(async () => {\n    await loadStats();\n  }, [loadStats]);\n\n  /**\n   * Refresh achievements\n   */\n  const refreshAchievements = useCallback(async () => {\n    await loadAchievements();\n  }, [loadAchievements]);\n\n  /**\n   * Refresh follow stats\n   */\n  const refreshFollowStats = useCallback(async () => {\n    await loadFollowStats();\n  }, [loadFollowStats]);\n\n  /**\n   * Update profile\n   */\n  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {\n    if (!user) return;\n    \n    setIsLoading(true);\n    setError(null);\n    \n    try {\n      const updatedProfile = await profileService.updateProfile(data);\n      setProfile(updatedProfile);\n    } catch (err: any) {\n      console.error('Error updating profile:', err);\n      setError(err.message || 'Failed to update profile');\n      throw err; // Re-throw for component handling\n    } finally {\n      setIsLoading(false);\n    }\n  }, [user]);\n\n  /**\n   * Upload profile photo\n   */\n  const uploadProfilePhoto = useCallback(async (file: File) => {\n    if (!user) return;\n    \n    setIsUploading(true);\n    setError(null);\n    \n    try {\n      const result = await profileService.uploadProfilePhoto(file);\n      setProfile(result.user);\n    } catch (err: any) {\n      console.error('Error uploading profile photo:', err);\n      setError(err.message || 'Failed to upload profile photo');\n      throw err; // Re-throw for component handling\n    } finally {\n      setIsUploading(false);\n    }\n  }, [user]);\n\n  /**\n   * Utility function to get display name\n   */\n  const getDisplayName = useCallback(() => {\n    if (!profile) return 'User';\n    return profileService.getDisplayName(profile);\n  }, [profile]);\n\n  /**\n   * Utility function to get username for display\n   */\n  const getUsernameForDisplay = useCallback(() => {\n    if (!profile) return 'user';\n    return profileService.getUsernameForDisplay(profile);\n  }, [profile]);\n\n  /**\n   * Utility function to get user initials\n   */\n  const getUserInitials = useCallback(() => {\n    if (!profile) return 'U';\n    return profileService.getUserInitials(profile);\n  }, [profile]);\n\n  // Load initial data when component mounts or user changes\n  useEffect(() => {\n    if (user || initialUserId) {\n      loadProfile(initialUserId);\n      \n      // Only load user-specific data for current user\n      if (!initialUserId || initialUserId === user?.id) {\n        loadStats();\n        loadAchievements();\n        loadFollowStats();\n      }\n      \n      // Load posts for any user (current or specified)\n      loadUserPosts(initialUserId, 20, 0);\n    }\n  }, [user, initialUserId, loadProfile, loadStats, loadAchievements, loadFollowStats, loadUserPosts]);\n\n  return {\n    // Profile data\n    profile,\n    stats,\n    posts,\n    achievements,\n    followStats,\n    \n    // Loading states\n    isLoading,\n    isLoadingStats,\n    isLoadingPosts,\n    isLoadingAchievements,\n    isLoadingFollowStats,\n    isUploading,\n    \n    // Error states\n    error,\n    \n    // Operations\n    refreshProfile,\n    updateProfile,\n    uploadProfilePhoto,\n    loadUserPosts,\n    loadMorePosts,\n    refreshStats,\n    refreshAchievements,\n    refreshFollowStats,\n    \n    // Utility functions\n    getDisplayName,\n    getUsernameForDisplay,\n    getUserInitials,\n    \n    // Pagination\n    postsHasMore,\n    postsOffset,\n  };\n};\n\nexport default useProfile;"