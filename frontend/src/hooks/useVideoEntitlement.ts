/**
 * useVideoEntitlement — Client-side entitlement state helper
 * ===========================================================
 * Interprets API error responses to determine what UI to show.
 */

import { useMemo } from 'react';

export type EntitlementStatus =
  | 'granted'       // User can watch
  | 'login_required' // 401 — show login prompt
  | 'access_denied'  // 403 — show upgrade/locked UI
  | 'not_found'      // 404 — show not found page
  | 'loading'
  | 'error';

export interface EntitlementResult {
  status: EntitlementStatus;
  canWatch: boolean;
  showLoginPrompt: boolean;
  showUpgradePrompt: boolean;
  showNotFound: boolean;
}

export function useVideoEntitlement(
  isLoading: boolean,
  error: any,
  data: any
): EntitlementResult {
  return useMemo(() => {
    if (isLoading) {
      return { status: 'loading' as const, canWatch: false, showLoginPrompt: false, showUpgradePrompt: false, showNotFound: false };
    }

    if (error) {
      const status = error.status || error.body?.status;
      if (status === 401) {
        return { status: 'login_required' as const, canWatch: false, showLoginPrompt: true, showUpgradePrompt: false, showNotFound: false };
      }
      if (status === 403) {
        return { status: 'access_denied' as const, canWatch: false, showLoginPrompt: false, showUpgradePrompt: true, showNotFound: false };
      }
      if (status === 404) {
        return { status: 'not_found' as const, canWatch: false, showLoginPrompt: false, showUpgradePrompt: false, showNotFound: true };
      }
      return { status: 'error' as const, canWatch: false, showLoginPrompt: false, showUpgradePrompt: false, showNotFound: false };
    }

    if (data?.video) {
      return { status: 'granted' as const, canWatch: true, showLoginPrompt: false, showUpgradePrompt: false, showNotFound: false };
    }

    return { status: 'loading' as const, canWatch: false, showLoginPrompt: false, showUpgradePrompt: false, showNotFound: false };
  }, [isLoading, error, data]);
}
