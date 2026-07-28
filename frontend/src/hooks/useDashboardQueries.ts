/**
 * ============================================================================
 * FILE: useDashboardQueries.ts
 * PURPOSE: TanStack Query hooks for dashboard API calls — replaces manual
 *          useEffect + axios patterns with automatic caching, deduplication,
 *          and request cancellation (AbortController built-in).
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides reusable query hooks that any dashboard page
 * can import instead of writing manual useEffect + useState + loading/error
 * boilerplate. TanStack Query handles caching, deduplication, background
 * refetch, abort on unmount, and retry automatically.
 *
 * HOW IT FITS IN THE APP: Any dashboard component can replace:
 *   const [data, setData] = useState([]);
 *   const [loading, setLoading] = useState(true);
 *   useEffect(() => { authAxios.get(...).then(...) }, []);
 * With:
 *   const { data, isLoading } = useSocialFeed({ limit: 10 });
 *
 * KEY DECISIONS: Hooks return { data, isLoading, error, refetch } shaped
 * objects. Auth-backed query hooks use the authAxios instance from AuthContext
 * and only enable when authAxios is available (prevents unauthenticated calls).
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useNotificationCenter } from './useNotificationCenter';

// ─────────────────────────────────────────────────────────────
// SECTION: Query Key Factory
// Centralizes all query keys for cache invalidation
// ─────────────────────────────────────────────────────────────

export const queryKeys = {
  social: {
    feed: (params?: Record<string, unknown>) => ['social', 'feed', params] as const,
    challenges: () => ['social', 'challenges'] as const,
    posts: () => ['social', 'posts'] as const,
    trendingTags: (params?: Record<string, unknown>) => ['social', 'trendingTags', params] as const,
  },
  messaging: {
    summary: () => ['messaging', 'summary'] as const,
  },
  gamification: {
    leaderboard: (params?: Record<string, unknown>) => ['gamification', 'leaderboard', params] as const,
    profile: (userId?: string) => ['gamification', 'profile', userId] as const,
  },
  workouts: {
    sessions: (params?: Record<string, unknown>) => ['workouts', 'sessions', params] as const,
    history: (userId?: string) => ['workouts', 'history', userId] as const,
  },
  clients: {
    list: (params?: Record<string, unknown>) => ['clients', 'list', params] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
    measurements: (id: string) => ['clients', 'measurements', id] as const,
  },
  admin: {
    systemHealth: () => ['admin', 'systemHealth'] as const,
    pendingOrders: () => ['admin', 'pendingOrders'] as const,
    analytics: (type: string) => ['admin', 'analytics', type] as const,
  },
} as const;

// ─────────────────────────────────────────────────────────────
// SECTION: Social Feed Queries
// ─────────────────────────────────────────────────────────────

interface FeedParams {
  limit?: number;
  category?: string;
  hashtag?: string | null;
}

interface DashboardCreatePostInput {
  content: string;
  type?: string;
  visibility?: 'public' | 'friends' | 'private';
  media?: File | null;
}

export function useSocialFeed(params: FeedParams = {}) {
  const { authAxios, user } = useAuth();
  const queryParams: Record<string, string | number> = { limit: params.limit || 10 };
  if (params.category && params.category !== 'all') queryParams.category = params.category;
  if (params.hashtag) queryParams.hashtag = params.hashtag;

  return useQuery({
    queryKey: queryKeys.social.feed(queryParams),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/social/posts/feed', { params: queryParams, signal });
      return res.data?.posts || res.data?.data || [];
    },
    enabled: !!authAxios && !!user,
  });
}

export function useSocialChallenges() {
  const { authAxios, user } = useAuth();
  return useQuery({
    queryKey: queryKeys.social.challenges(),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/social/challenges/active', { signal });
      return res.data?.data || res.data?.challenges || [];
    },
    enabled: !!authAxios && !!user,
  });
}

export function useTrendingHashtags(params: { limit?: number } = {}) {
  const { authAxios, user } = useAuth();
  const queryParams = { limit: params.limit || 5 };

  return useQuery({
    queryKey: queryKeys.social.trendingTags(queryParams),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/social/hashtags/trending', {
        params: queryParams,
        signal,
      });
      return res.data;
    },
    enabled: !!authAxios && !!user,
    staleTime: 60 * 1000,
    retry: false,
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION: Social Post Mutation
// ─────────────────────────────────────────────────────────────

export function useCreatePost() {
  const { authAxios } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: string | DashboardCreatePostInput) => {
      const payload: DashboardCreatePostInput = typeof input === 'string'
        ? { content: input, type: 'general', visibility: 'friends' }
        : input;
      const trimmedContent = payload.content.trim();

      if (payload.media) {
        const formData = new FormData();
        formData.append('content', trimmedContent);
        formData.append('type', payload.type || 'general');
        formData.append('visibility', payload.visibility || 'friends');
        formData.append('media', payload.media);

        const res = await authAxios.post('/api/social/posts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
      }

      const res = await authAxios.post('/api/social/posts', {
        content: trimmedContent,
        type: payload.type || 'general',
        visibility: payload.visibility || 'friends',
      });
      return res.data;
    },
    onSuccess: () => {
      // Invalidate all feed queries to show the new post
      queryClient.invalidateQueries({ queryKey: ['social', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['gamification'] });
      // Cross-surface contract (same event the Coach dock dispatches): the
      // stateful useSocialFeed instances (Home community feed) listen for
      // this and refetch — react-query invalidation can't reach them.
      window.dispatchEvent(new Event('swan:social-post-created'));
    },
  });
}

export function useNotificationSummary() {
  const { notifications, unreadCount, loading, error, refresh } = useNotificationCenter({
    fetchOnMount: true,
    subscribeToSocket: true,
  });

  return useMemo(() => ({
    data: { notifications, unreadCount },
    isLoading: loading,
    isFetching: loading,
    isError: !!error,
    loading,
    error,
    refetch: refresh,
  }), [error, loading, notifications, refresh, unreadCount]);
}

export function useMessageSummary(options: { enabled?: boolean } = {}) {
  const { authAxios, user } = useAuth();

  return useQuery({
    queryKey: queryKeys.messaging.summary(),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/messaging/conversations', { signal });
      return res.data;
    },
    // Messaging is tier-gated server-side (requireTier('elite') —
    // messagingRoutes.mjs); callers pass enabled=false for non-elite users
    // so free tiers never poll an endpoint that 402s by design.
    enabled: !!authAxios && !!user && (options.enabled ?? true),
    staleTime: 30 * 1000,
    retry: false,
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION: Gamification Queries
// ─────────────────────────────────────────────────────────────

interface LeaderboardParams {
  limit?: number;
}

export function useLeaderboard(params: LeaderboardParams = {}) {
  const { authAxios, user } = useAuth();
  return useQuery({
    queryKey: queryKeys.gamification.leaderboard(params as Record<string, unknown>),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/v1/gamification/leaderboard', {
        params: { limit: params.limit || 5 },
        signal,
      });
      return res.data?.data || res.data?.leaderboard || [];
    },
    enabled: !!authAxios && !!user,
    staleTime: 5 * 60 * 1000, // Leaderboard: 5 min stale (changes less frequently)
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION: Workout Queries
// ─────────────────────────────────────────────────────────────

interface WorkoutSessionParams {
  limit?: number;
  page?: number;
}

export function useWorkoutSessions(params: WorkoutSessionParams = {}) {
  const { authAxios, user } = useAuth();
  return useQuery({
    queryKey: queryKeys.workouts.sessions(params as Record<string, unknown>),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/workout/sessions', {
        params: { limit: params.limit || 50, page: params.page || 1 },
        signal,
      });
      const payload = res.data?.data || res.data;
      const list = Array.isArray(payload?.sessions)
        ? payload.sessions
        : Array.isArray(payload?.workouts)
        ? payload.workouts
        : Array.isArray(payload) ? payload : [];
      return list;
    },
    enabled: !!authAxios && !!user,
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION: Admin Queries
// ─────────────────────────────────────────────────────────────

export function useSystemHealth() {
  const { authAxios, user } = useAuth();
  return useQuery({
    queryKey: queryKeys.admin.systemHealth(),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/admin/system-health', { signal });
      return res.data?.data || res.data;
    },
    enabled: !!authAxios && !!user,
    staleTime: 30 * 1000, // System health: 30s stale
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

export function usePendingOrders() {
  const { authAxios, user } = useAuth();
  return useQuery({
    queryKey: queryKeys.admin.pendingOrders(),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/admin/pending-orders', { signal });
      return res.data?.data || res.data?.orders || [];
    },
    enabled: !!authAxios && !!user,
  });
}
