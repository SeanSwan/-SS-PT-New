/**
 * ============================================================================
 * FILE: useSubscription.ts
 * PURPOSE: React hook for subscription status, usage tracking, and tier checks
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * ============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export interface DonationTier {
  minAmount: number;
  maxAmount: number;
  label: string;
  aiMessagesPerMonth?: number;
  aiGenerationsPerMonth?: number;
}

export interface TierDefinition {
  id: string;
  name: string;
  tagline: string;
  price: number;
  priceDisplay: string;
  annualPrice?: number;
  annualPriceDisplay?: string;
  donationBased?: boolean;
  payWhatYouWant?: boolean;
  minimumPrice?: number;
  maximumPrice?: number;
  suggestedPrice?: number;
  donationTiers?: DonationTier[];
  features: string[];
  limits: {
    aiMessagesPerMonth: number;
    aiGenerationsPerMonth: number;
  };
}

export interface SubscriptionStatus {
  tier: 'free' | 'pro' | 'elite' | 'supporter' | 'premium'; // supporter/premium kept for migration compat
  tierName: string;
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'paused';
  hasFullAIAccess: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number;
  trialEndDate: string | null;
  currentPeriodEnd: string | null;
  amount: number | null;
  paymentMethod: string | null;
  isAdmin?: boolean;
}

export interface UsageStatus {
  aiMessagesUsed: number;
  aiMessagesLimit: number;
  aiGenerationsUsed: number;
  aiGenerationsLimit: number;
  resetDate: string | null;
}

// ─────────────────────────────────────────────────────────────
// SECTION: API Helpers
// ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE || '';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [tiers, setTiers] = useState<TierDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  /** Fetch current subscription status + usage */
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/subscriptions/status`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch subscription status');
      const data = await res.json();
      if (data.success) {
        setSubscription(data.subscription);
        setUsage(data.usage);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Fetch available tiers */
  const fetchTiers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/subscriptions/tiers`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) setTiers(data.tiers);
    } catch {
      // Non-critical — tiers can be shown from cache
    }
  }, []);

  /** Start free trial */
  const startTrial = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/subscriptions/start-trial`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      await fetchStatus();
    }
    return data;
  }, [fetchStatus]);

  /** Create Stripe checkout session for subscription */
  const checkout = useCallback(async (tier: 'pro' | 'elite', amount?: number, billingInterval: 'month' | 'year' = 'month') => {
    const res = await fetch(`${API_BASE}/api/subscriptions/checkout`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tier, amount, billingInterval }),
    });
    const data = await res.json();
    if (data.success && data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    }
    return data;
  }, []);

  /** Cancel subscription */
  const cancel = useCallback(async (reason?: string) => {
    const res = await fetch(`${API_BASE}/api/subscriptions/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchStatus();
    }
    return data;
  }, [fetchStatus]);

  // ─────────────────────────────────────────────────────────────
  // SECTION: Computed Helpers
  // ─────────────────────────────────────────────────────────────

  const canUseAI = subscription?.hasFullAIAccess ||
    subscription?.isInTrial ||
    (usage && (usage.aiMessagesUsed < usage.aiMessagesLimit));

  const aiMessagesRemaining = usage
    ? Math.max(0, usage.aiMessagesLimit - usage.aiMessagesUsed)
    : 0;

  const aiGenerationsRemaining = usage
    ? Math.max(0, usage.aiGenerationsLimit - usage.aiGenerationsUsed)
    : 0;

  const isFreeTier = subscription?.tier === 'free' && !subscription?.isInTrial;
  const isTrial = subscription?.isInTrial || false;
  const isPaid = subscription?.tier === 'pro' || subscription?.tier === 'elite' ||
    subscription?.tier === 'supporter' || subscription?.tier === 'premium'; // migration compat
  const isElite = subscription?.tier === 'elite' || subscription?.tier === 'premium';
  const isPro = subscription?.tier === 'pro' || subscription?.tier === 'supporter';

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchStatus();
      fetchTiers();
    }
  }, [fetchStatus, fetchTiers]);

  return {
    subscription,
    usage,
    tiers,
    loading,
    error,
    // Actions
    fetchStatus,
    fetchTiers,
    startTrial,
    checkout,
    cancel,
    // Computed
    canUseAI,
    aiMessagesRemaining,
    aiGenerationsRemaining,
    isFreeTier,
    isTrial,
    isPaid,
    isPro,
    isElite,
  };
}

export default useSubscription;
