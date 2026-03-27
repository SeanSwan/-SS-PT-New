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
 * KEY DECISIONS: Hooks return { data, isLoading, error, refetch } matching
 * the TanStack Query API. Each hook uses the authAxios instance from AuthContext
 * and only enables when authAxios is available (prevents unauthenticated calls).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Query Key Factory
// Centralizes all query keys for cache invalidation
// ─────────────────────────────────────────────────────────────

export const queryKeys = {
  social: {
    feed: (params?: Record<string, unknown>) => ['social', 'feed', params] as const,
    challenges: () => ['social', 'challenges'] as const,
    posts: () => ['social', 'posts'] as const,
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

export function useSocialFeed(params: FeedParams = {}) {
  const { authAxios } = useAuth();
  const queryParams: Record<string, string | number> = { limit: params.limit || 10 };
  if (params.category && params.category !== 'all') queryParams.category = params.category;
  if (params.hashtag) queryParams.hashtag = params.hashtag;

  return useQuery({
    queryKey: queryKeys.social.feed(queryParams),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/social/posts/feed', { params: queryParams, signal });
      return res.data?.posts || res.data?.data || [];
    },
    enabled: !!authAxios,
  });
}

export function useSocialChallenges() {
  const { authAxios } = useAuth();
  return useQuery({
    queryKey: queryKeys.social.challenges(),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/social/challenges/active', { signal });
      return res.data?.data || res.data?.challenges || [];
    },
    enabled: !!authAxios,
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION: Social Post Mutation
// ─────────────────────────────────────────────────────────────

export function useCreatePost() {
  const { authAxios } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const res = await authAxios.post('/api/social/posts', {
        content: content.trim(),
        type: 'general',
      });
      return res.data;
    },
    onSuccess: () => {
      // Invalidate all feed queries to show the new post
      queryClient.invalidateQueries({ queryKey: ['social', 'feed'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION: Gamification Queries
// ─────────────────────────────────────────────────────────────

interface LeaderboardParams {
  limit?: number;
}

export function useLeaderboard(params: LeaderboardParams = {}) {
  const { authAxios } = useAuth();
  return useQuery({
    queryKey: queryKeys.gamification.leaderboard(params),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/v1/gamification/leaderboard', {
        params: { limit: params.limit || 5 },
        signal,
      });
      return res.data?.data || res.data?.leaderboard || [];
    },
    enabled: !!authAxios,
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
  const { authAxios } = useAuth();
  return useQuery({
    queryKey: queryKeys.workouts.sessions(params),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/workout/sessions', {
        params: { limit: params.limit || 50, page: params.page || 1 },
        signal,
      });
      const payload = res.data?.data;
      const list = Array.isArray(payload?.workouts)
        ? payload.workouts
        : Array.isArray(payload) ? payload : [];
      return list;
    },
    enabled: !!authAxios,
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION: Admin Queries
// ─────────────────────────────────────────────────────────────

export function useSystemHealth() {
  const { authAxios } = useAuth();
  return useQuery({
    queryKey: queryKeys.admin.systemHealth(),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/admin/system-health', { signal });
      return res.data?.data || res.data;
    },
    enabled: !!authAxios,
    staleTime: 30 * 1000, // System health: 30s stale
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

export function usePendingOrders() {
  const { authAxios } = useAuth();
  return useQuery({
    queryKey: queryKeys.admin.pendingOrders(),
    queryFn: async ({ signal }) => {
      const res = await authAxios.get('/api/admin/pending-orders', { signal });
      return res.data?.data || res.data?.orders || [];
    },
    enabled: !!authAxios,
  });
}
