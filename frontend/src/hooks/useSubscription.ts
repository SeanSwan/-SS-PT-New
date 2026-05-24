/**
 * ============================================================================
 * FILE: useSubscription.ts
 * PURPOSE: React hook for subscription status, usage tracking, and tier checks
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * ============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../services/api.service';

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
  cumulativeDonationAmount?: number;
  crystallinePromoEligible?: boolean;
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
      const response = await apiService.get('/api/subscriptions/status');
      const data = response.data;
      if (data.success) {
        setSubscription(data.subscription);
        setUsage(data.usage);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Fetch available tiers */
  const fetchTiers = useCallback(async () => {
    try {
      const response = await apiService.get('/api/subscriptions/tiers');
      const data = response.data;
      if (data.success) setTiers(data.tiers);
    } catch {
      // Non-critical — tiers can be shown from cache
    }
  }, []);

  /** Start free trial */
  const startTrial = useCallback(async () => {
    try {
      const response = await apiService.post('/api/subscriptions/start-trial');
      const data = response.data;
      if (data.success) {
        await fetchStatus();
      }
      return data;
    } catch (err: any) {
      return err?.response?.data || { success: false, message: err.message || 'Failed to start trial' };
    }
  }, [fetchStatus]);

  /** Create Stripe checkout session for subscription */
  const checkout = useCallback(async (tier: 'pro' | 'elite', amount?: number, billingInterval: 'month' | 'year' = 'month') => {
    try {
      const response = await apiService.post('/api/subscriptions/checkout', { tier, amount, billingInterval });
      const data = response.data;
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
      return data;
    } catch (err: any) {
      return err?.response?.data || { success: false, message: err.message || 'Failed to start checkout' };
    }
  }, []);

  /** Cancel subscription */
  const cancel = useCallback(async (reason?: string) => {
    try {
      const response = await apiService.post('/api/subscriptions/cancel', { reason });
      const data = response.data;
      if (data.success) {
        await fetchStatus();
      }
      return data;
    } catch (err: any) {
      return err?.response?.data || { success: false, message: err.message || 'Failed to cancel subscription' };
    }
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
