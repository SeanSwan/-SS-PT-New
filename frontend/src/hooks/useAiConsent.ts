/**
 * ============================================================================
 * FILE: useAiConsent.ts
 * PURPOSE: Consent state management hook extracted from AiConsentScreen.
 *          Consumed by full-page consent settings and current Swan Coach surfaces.
 *
 * GATE MODEL: Consent-gated, NOT subscription-gated.
 *   All tiers (free / pro / elite) may use Swan Coach if consent is granted.
 *
 * PRIVACY: user ID only is sent to the backend — never names or PII.
 *   The consent endpoints are /api/ai/consent/* (aiConsentService handles auth).
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getConsentStatus,
  grantConsent,
  withdrawConsent,
  type ConsentStatusResponse,
} from '../services/aiConsentService';

export type ConsentState = 'granted' | 'withdrawn' | 'none';

export interface UseAiConsentReturn {
  /** Derived consent state: granted | withdrawn | none */
  status: ConsentState;
  /** Raw response object — used by AiConsentScreen for meta display */
  statusDetail: ConsentStatusResponse | null;
  /** True while the initial status fetch is in flight */
  loading: boolean;
  /** True while grant/withdraw mutation is in flight */
  actionLoading: boolean;
  /** Error message from last failed operation, null when clear */
  error: string | null;
  /** Grant consent. Refetches status on success. */
  grant: () => Promise<void>;
  /** Withdraw consent. Refetches status on success. */
  withdraw: () => Promise<void>;
  /** Force-refetch status (e.g. after returning from another page) */
  refetch: () => Promise<void>;
}

function deriveConsentState(detail: ConsentStatusResponse | null): ConsentState {
  if (!detail || !detail.profile) return 'none';
  if (detail.consentGranted) return 'granted';
  return 'withdrawn';
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

function getErrorStatus(err: unknown): number | undefined {
  return typeof err === 'object' && err !== null && 'status' in err
    ? Number((err as { status?: unknown }).status)
    : undefined;
}

export function useAiConsent(): UseAiConsentReturn {
  const [statusDetail, setStatusDetail] = useState<ConsentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getConsentStatus();
      setStatusDetail(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load consent status.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const grant = useCallback(async () => {
    try {
      setActionLoading(true);
      setError(null);
      await grantConsent();
      await fetchStatus();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to grant consent.'));
    } finally {
      setActionLoading(false);
    }
  }, [fetchStatus]);

  const withdraw = useCallback(async () => {
    try {
      setActionLoading(true);
      setError(null);
      await withdrawConsent();
      await fetchStatus();
    } catch (err: unknown) {
      if (getErrorStatus(err) === 404) {
        setError('No consent record found to withdraw.');
      } else {
        setError(getErrorMessage(err, 'Failed to withdraw consent.'));
      }
    } finally {
      setActionLoading(false);
    }
  }, [fetchStatus]);

  return {
    status: deriveConsentState(statusDetail),
    statusDetail,
    loading,
    actionLoading,
    error,
    grant,
    withdraw,
    refetch: fetchStatus,
  };
}
