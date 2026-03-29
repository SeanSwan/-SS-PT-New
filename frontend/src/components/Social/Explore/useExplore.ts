/**
 * ============================================================================
 * FILE: useExplore.ts
 * PURPOSE: Data hook for Social Explore tab — trending posts, discover users, challenges
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import type { TrendingPost, DiscoverUser, FeaturedChallenge } from './ExploreTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useExplore() {
  const { authAxios } = useAuth();
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverUser[]>([]);
  const [challenges, setChallenges] = useState<FeaturedChallenge[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchTrendingPosts = useCallback(async () => {
    if (!authAxios) return;
    setLoadingPosts(true);
    try {
      const res = await authAxios.get('/api/social/posts/trending', {
        params: { limit: 12, timeframe: '7d' },
      });
      if (mountedRef.current) setTrendingPosts(res.data?.posts || []);
    } catch (err: any) {
      if (mountedRef.current) console.warn('[Explore] trending posts fetch failed:', err.message);
    } finally {
      if (mountedRef.current) setLoadingPosts(false);
    }
  }, [authAxios]);

  const fetchDiscoverUsers = useCallback(async () => {
    if (!authAxios) return;
    setLoadingUsers(true);
    try {
      const res = await authAxios.get('/api/v1/gamification/discover-users', {
        params: { limit: 8 },
      });
      if (mountedRef.current) setDiscoverUsers(res.data?.users || []);
    } catch (err: any) {
      if (mountedRef.current) console.warn('[Explore] discover users fetch failed:', err.message);
    } finally {
      if (mountedRef.current) setLoadingUsers(false);
    }
  }, [authAxios]);

  const fetchChallenges = useCallback(async () => {
    if (!authAxios) return;
    setLoadingChallenges(true);
    try {
      const res = await authAxios.get('/api/v1/gamification/challenges', {
        params: { status: 'active', limit: 6 },
      });
      if (mountedRef.current) {
        const data = res.data?.challenges || res.data?.data || [];
        setChallenges(data);
      }
    } catch (err: any) {
      if (mountedRef.current) console.warn('[Explore] challenges fetch failed:', err.message);
    } finally {
      if (mountedRef.current) setLoadingChallenges(false);
    }
  }, [authAxios]);

  useEffect(() => {
    mountedRef.current = true;
    fetchTrendingPosts();
    fetchDiscoverUsers();
    fetchChallenges();
    return () => { mountedRef.current = false; };
  }, [fetchTrendingPosts, fetchDiscoverUsers, fetchChallenges]);

  const followUser = useCallback(async (targetUserId: number) => {
    if (!authAxios) return;
    try {
      await authAxios.post(`/api/v1/gamification/users/${targetUserId}/follow`);
      if (mountedRef.current) {
        setDiscoverUsers(prev => prev.filter(u => u.id !== targetUserId));
      }
    } catch (err: any) {
      if (mountedRef.current) setError(err.response?.data?.error || 'Failed to follow user');
    }
  }, [authAxios]);

  return {
    trendingPosts,
    discoverUsers,
    challenges,
    loadingPosts,
    loadingUsers,
    loadingChallenges,
    error,
    followUser,
    refreshAll: () => {
      setError(null);
      fetchTrendingPosts();
      fetchDiscoverUsers();
      fetchChallenges();
    },
  };
}
