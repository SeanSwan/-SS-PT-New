/**
 * ============================================================================
 * FILE: FeatureAccessContext.tsx
 * PURPOSE: Per-user feature flag context — controls visibility of premium features
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Fetches the current user's feature flags from the API
 * and provides a useFeatureAccess hook for conditional rendering.
 * HOW IT FITS IN THE APP: Wraps the app at root level. Sidebar, routes, and
 * components use useFeatureAccess('content-studio') to show/hide features.
 * KEY DECISIONS: Per-user flags (not per-role). Admin always has all features.
 * Cached in localStorage with 60s TTL to reduce API calls.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { ADMIN_ALWAYS_ENABLED_COACH_COMMAND_FLAGS } from '../config/coachCommandFlags';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface FeatureAccessState {
  flags: Record<string, boolean>;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
}

interface FeatureAccessContextValue extends FeatureAccessState {
  hasFeature: (featureKey: string) => boolean;
  refresh: () => Promise<void>;
  clearCache: () => void;
}

const CACHE_VERSION = 'v1';
const CACHE_KEY = `ss_feature_flags_${CACHE_VERSION}`;
const CACHE_TTL = 60_000; // 60 seconds

export const buildAdminFeatureFlags = (): Record<string, boolean> => ({
  'content-studio': true,
  'workout-planner-pro': true,
  ...Object.fromEntries(
    ADMIN_ALWAYS_ENABLED_COACH_COMMAND_FLAGS.map((featureKey) => [featureKey, true]),
  ),
});

// ─────────────────────────────────────────────────────────────
// SECTION: Context
// ─────────────────────────────────────────────────────────────
const FeatureAccessContext = createContext<FeatureAccessContextValue>({
  flags: {},
  isAdmin: false,
  loading: true,
  error: null,
  hasFeature: () => false,
  refresh: async () => {},
  clearCache: () => {},
});

// ─────────────────────────────────────────────────────────────
// SECTION: Provider
// ─────────────────────────────────────────────────────────────
export const FeatureAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authAxios } = useAuth();
  const [state, setState] = useState<FeatureAccessState>({
    flags: {},
    isAdmin: false,
    loading: true,
    error: null,
  });

  const fetchFlags = useCallback(async () => {
    if (!user?.id) {
      setState({ flags: {}, isAdmin: false, loading: false, error: null });
      return;
    }

    // Admin shortcut — always has everything
    if (user.role === 'admin') {
      const adminFlags = buildAdminFeatureFlags();
      setState({ flags: adminFlags, isAdmin: true, loading: false, error: null });
      return;
    }

    // Check localStorage cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setState({ flags: data, isAdmin: false, loading: false, error: null });
          return;
        }
      }
    } catch {
      // Cache read failed — continue to API
    }

    try {
      const res = await authAxios.get('/api/feature-flags/me');
      const { data: flags, isAdmin } = res.data;

      // Cache the result
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: flags,
          timestamp: Date.now(),
        }));
      } catch {
        // localStorage write failed — non-critical
      }

      setState({ flags: flags || {}, isAdmin: isAdmin || false, loading: false, error: null });
    } catch {
      // Non-fatal: if API fails, user just doesn't see premium features
      setState(prev => ({ ...prev, loading: false, error: null }));
    }
  }, [user?.id, user?.role, authAxios]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const hasFeature = useCallback((featureKey: string): boolean => {
    if (state.isAdmin) return true;
    return state.flags[featureKey] === true;
  }, [state.flags, state.isAdmin]);

  // Clear all feature flag caches (for logout / user switch)
  const clearCache = useCallback(() => {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('ss_feature_flags'))
        .forEach(key => localStorage.removeItem(key));
    } catch {
      // Non-critical
    }
  }, []);

  const value = useMemo(() => ({
    ...state,
    hasFeature,
    refresh: fetchFlags,
    clearCache,
  }), [state, hasFeature, fetchFlags, clearCache]);

  return (
    <FeatureAccessContext.Provider value={value}>
      {children}
    </FeatureAccessContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────
export const useFeatureAccess = (featureKey?: string) => {
  const context = useContext(FeatureAccessContext);

  if (featureKey) {
    return {
      ...context,
      enabled: context.hasFeature(featureKey),
    };
  }

  return context;
};

export default FeatureAccessContext;
