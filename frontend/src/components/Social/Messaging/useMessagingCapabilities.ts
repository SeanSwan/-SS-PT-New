/**
 * FILE: useMessagingCapabilities.ts
 * PURPOSE: Read messaging access from the server instead of recomputing it.
 * CREATED: 2026-08-22 · Wave 1 Slice 2 (client-dashboard remediation)
 *
 * WHY THIS EXISTS
 * MessagingView computed `isStaffRole || isElite` locally. That expression is a
 * SUBSCRIPTION test standing in for a COACHING relationship, and it disagreed
 * with the server in both directions:
 *
 *   - a client on a training package has tier 'free' (no purchase controller
 *     writes `tier`), so the UI hid messaging from the people paying most;
 *   - `requireTier` treats a live trial as elite-equivalent, but the local
 *     expression excluded `isTrial`, so trials were allowed by the API and
 *     blocked by the UI.
 *
 * Two oracles will always drift. There is now one: the server. This hook reads
 * `GET /api/messaging/capabilities`, which is computed by the same code that
 * enforces the gate.
 *
 * FAIL-CLOSED: on error, both capabilities are false. A user who should have
 * access sees the upsell rather than a broken composer, and the API would have
 * refused the write anyway.
 */
import { useCallback, useEffect, useState } from 'react';
import apiService from '../../../services/api.service';

export interface MessagingCapabilities {
  /** Reach the assigned trainer. True via relationship OR community access. */
  canMessageAssignedCoach: boolean;
  /** Message other members. Subscription-gated; unchanged monetization rule. */
  canUseCommunityDirectMessages: boolean;
}

const DENY_ALL: MessagingCapabilities = {
  canMessageAssignedCoach: false,
  canUseCommunityDirectMessages: false,
};

export function useMessagingCapabilities(enabled: boolean = true) {
  const [capabilities, setCapabilities] = useState<MessagingCapabilities>(DENY_ALL);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setCapabilities(DENY_ALL);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.get('/api/messaging/capabilities');
      const data = response?.data ?? {};
      setCapabilities({
        canMessageAssignedCoach: data.canMessageAssignedCoach === true,
        canUseCommunityDirectMessages: data.canUseCommunityDirectMessages === true,
      });
      setError(null);
    } catch (err: any) {
      setCapabilities(DENY_ALL);
      setError(err?.message || 'Could not load messaging access.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { load(); }, [load]);

  return { capabilities, loading, error, refresh: load };
}

export default useMessagingCapabilities;
