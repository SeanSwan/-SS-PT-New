/** Shared public tier and current subscription state for storefront surfaces. */
import { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../services/api.service';
import { useAuth } from '../context/AuthContext';
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
  tier: 'free' | 'pro' | 'elite' | 'supporter' | 'premium';
  tierName: string;
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'paused';
  hasFullAIAccess: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number;
  trialEndDate: string | null;
  currentPeriodEnd: string | null;
  cancelledAt?: string | null;
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
type ActionResult = {
  success?: boolean;
  message?: string;
  checkoutUrl?: string;
  [key: string]: unknown;
};
const safeMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null) {
    const record = error as { response?: { data?: { message?: unknown } }; message?: unknown };
    if (typeof record.response?.data?.message === 'string') return record.response.data.message;
    if (typeof record.message === 'string') return record.message;
  }
  return fallback;
};
const resultMessage = (data: ActionResult | undefined, fallback: string): string => typeof data?.message === 'string' ? data.message : fallback;
let publicTiersRequest: Promise<TierDefinition[]> | null = null;
const requestPublicTiers = async (): Promise<TierDefinition[]> => {
  if (publicTiersRequest) return publicTiersRequest;
  publicTiersRequest = apiService.get('/api/subscriptions/tiers')
    .then(response => {
      const data = response.data as { success?: boolean; tiers?: unknown };
      if (!data.success || !Array.isArray(data.tiers)) {
        throw new Error('Membership tiers are unavailable right now.');
      }
      return data.tiers as TierDefinition[];
    })
    .finally(() => {
      publicTiersRequest = null;
    });
  return publicTiersRequest;
};
export function useSubscription(options: { withTiers?: boolean } = {}) {
  const { withTiers = true } = options;
  const { isAuthenticated, user } = useAuth();
  const identityKey = isAuthenticated ? `user:${user?.id ?? 'authenticated'}` : 'anonymous';
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [tiers, setTiers] = useState<TierDefinition[]>([]);
  const [tiersLoading, setTiersLoading] = useState(withTiers);
  const [statusLoading, setStatusLoading] = useState(isAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const generationRef = useRef(0);
  const identityRef = useRef(identityKey);
  const latestIdentityRef = useRef(identityKey);
  const subscriptionOwnerRef = useRef<string | null>(null);
  const usageOwnerRef = useRef<string | null>(null);
  const statusRequestRef = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const checkoutPendingRef = useRef(false);
  const trialPendingRef = useRef(false);
  const cancelPendingRef = useRef(false);
  latestIdentityRef.current = identityKey;
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
    };
  }, []);
  const fetchTiers = useCallback(async () => {
    if (!withTiers) return [] as TierDefinition[];
    setTiersLoading(true);
    try {
      const nextTiers = await requestPublicTiers();
      if (mountedRef.current) setTiers(nextTiers);
      return nextTiers;
    } catch (requestError) {
      if (mountedRef.current) setError(safeMessage(requestError, 'Membership tiers are unavailable right now.'));
      return [] as TierDefinition[];
    } finally {
      if (mountedRef.current) setTiersLoading(false);
    }
  }, [withTiers]);
  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    const requestKey = identityKey;
    const requestGeneration = generationRef.current;
    const existing = statusRequestRef.current;
    if (existing?.key === requestKey) return existing.promise;
    setStatusLoading(true);
    const promise = apiService.get('/api/subscriptions/status')
      .then(response => {
        const data = response.data as { success?: boolean; subscription?: SubscriptionStatus; usage?: UsageStatus | null };
        if (!mountedRef.current || latestIdentityRef.current !== requestKey || identityRef.current !== requestKey || generationRef.current !== requestGeneration) return;
        if (data.success) {
          subscriptionOwnerRef.current = requestKey;
          usageOwnerRef.current = requestKey;
          setSubscription(data.subscription ?? null);
          setUsage(data.usage ?? null);
          setError(null);
        } else {
          setError('Unable to load your membership status.');
        }
      })
      .catch(requestError => {
        if (mountedRef.current && latestIdentityRef.current === requestKey && identityRef.current === requestKey && generationRef.current === requestGeneration) {
          setError(safeMessage(requestError, 'Unable to load your membership status.'));
        }
      })
      .finally(() => {
        if (statusRequestRef.current?.promise === promise) statusRequestRef.current = null;
        if (mountedRef.current && latestIdentityRef.current === requestKey && identityRef.current === requestKey && generationRef.current === requestGeneration) {
          setStatusLoading(false);
        }
      });
    statusRequestRef.current = { key: requestKey, promise };
    return promise;
  }, [identityKey, isAuthenticated]);
  useEffect(() => {
    identityRef.current = identityKey;
    generationRef.current += 1;
    statusRequestRef.current = null;
    subscriptionOwnerRef.current = null;
    usageOwnerRef.current = null;
    setSubscription(null);
    setUsage(null);
    setError(null);
    setStatusLoading(isAuthenticated);
    if (isAuthenticated) void fetchStatus();
  }, [fetchStatus, identityKey, isAuthenticated]);
  useEffect(() => {
    if (withTiers) void fetchTiers();
    else setTiersLoading(false);
  }, [fetchTiers, withTiers]);
  const startTrial = useCallback(async (): Promise<ActionResult> => {
    if (trialPendingRef.current) return { success: false, code: 'DUPLICATE_ACTION', message: 'Trial is already starting.' };
    trialPendingRef.current = true;
    setError(null);
    const requestKey = identityKey;
    const requestGeneration = generationRef.current;
    try {
      const data = (await apiService.post('/api/subscriptions/start-trial')).data as ActionResult;
      if (!mountedRef.current || latestIdentityRef.current !== requestKey || identityRef.current !== requestKey || generationRef.current !== requestGeneration) {
        return { success: false, code: 'STALE_REQUEST', message: 'Trial request expired. Please try again.' };
      }
      if (!data.success) setError(resultMessage(data, 'Unable to start your trial.'));
      else await fetchStatus();
      return data;
    } catch (requestError) {
      if (!mountedRef.current || latestIdentityRef.current !== requestKey || identityRef.current !== requestKey || generationRef.current !== requestGeneration) {
        return { success: false, code: 'STALE_REQUEST', message: 'Trial request expired. Please try again.' };
      }
      const message = safeMessage(requestError, 'Unable to start your trial.');
      setError(message);
      return { success: false, message };
    } finally {
      trialPendingRef.current = false;
    }
  }, [fetchStatus, identityKey]);
const checkout = useCallback(async (tier: 'pro' | 'elite', amount?: number, billingInterval: 'month' | 'year' = 'month'): Promise<ActionResult> => {
    if (checkoutPendingRef.current) return { success: false, code: 'DUPLICATE_ACTION', message: 'Checkout is already starting.' };
    checkoutPendingRef.current = true;
    setError(null);
    const requestKey = identityKey;
    const requestGeneration = generationRef.current;
    try {
      const data = (await apiService.post('/api/subscriptions/checkout', { tier, amount, billingInterval })).data as ActionResult;
      if (!mountedRef.current || latestIdentityRef.current !== requestKey || identityRef.current !== requestKey || generationRef.current !== requestGeneration) {
        checkoutPendingRef.current = false;
        return { success: false, code: 'STALE_REQUEST', message: 'Checkout request expired. Please try again.' };
      }
      if (!data.success) {
        setError(resultMessage(data, 'Unable to start checkout.'));
        checkoutPendingRef.current = false;
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setError('Checkout did not return a payment session. Please try again.');
        checkoutPendingRef.current = false;
      }
      return data;
    } catch (requestError) {
      if (!mountedRef.current || latestIdentityRef.current !== requestKey || identityRef.current !== requestKey || generationRef.current !== requestGeneration) {
        checkoutPendingRef.current = false;
        return { success: false, code: 'STALE_REQUEST', message: 'Checkout request expired. Please try again.' };
      }
      const message = safeMessage(requestError, 'Unable to start checkout.');
      setError(message);
      checkoutPendingRef.current = false;
      return { success: false, message };
    }
  }, [identityKey]);
  const cancel = useCallback(async (reason?: string): Promise<ActionResult> => {
    if (cancelPendingRef.current) return { success: false, code: 'DUPLICATE_ACTION', message: 'Cancellation is already processing.' };
    cancelPendingRef.current = true;
    setError(null);
    const requestKey = identityKey;
    const requestGeneration = generationRef.current;
    try {
      const data = (await apiService.post('/api/subscriptions/cancel', { reason })).data as ActionResult;
      if (!mountedRef.current || latestIdentityRef.current !== requestKey || identityRef.current !== requestKey || generationRef.current !== requestGeneration) {
        return { success: false, code: 'STALE_REQUEST', message: 'Cancellation request expired. Please try again.' };
      }
      if (!data.success) setError(resultMessage(data, 'Unable to cancel your membership.'));
      else await fetchStatus();
      return data;
    } catch (requestError) {
      if (!mountedRef.current || latestIdentityRef.current !== requestKey || identityRef.current !== requestKey || generationRef.current !== requestGeneration) {
        return { success: false, code: 'STALE_REQUEST', message: 'Cancellation request expired. Please try again.' };
      }
      const message = safeMessage(requestError, 'Unable to cancel your membership.');
      setError(message);
      return { success: false, message };
    } finally {
      cancelPendingRef.current = false;
    }
  }, [fetchStatus, identityKey]);
  const visibleSubscription = subscriptionOwnerRef.current === identityKey ? subscription : null;
  const visibleUsage = usageOwnerRef.current === identityKey ? usage : null;
  const canUseAI = visibleSubscription?.hasFullAIAccess || visibleSubscription?.isInTrial || Boolean(visibleUsage && visibleUsage.aiMessagesUsed < visibleUsage.aiMessagesLimit);
  const aiMessagesRemaining = visibleUsage ? Math.max(0, visibleUsage.aiMessagesLimit - visibleUsage.aiMessagesUsed) : 0;
  const aiGenerationsRemaining = visibleUsage ? Math.max(0, visibleUsage.aiGenerationsLimit - visibleUsage.aiGenerationsUsed) : 0;
  const isFreeTier = visibleSubscription?.tier === 'free' && !visibleSubscription?.isInTrial;
  const isTrial = visibleSubscription?.isInTrial || false;
  const isPaid = visibleSubscription?.tier === 'pro' || visibleSubscription?.tier === 'elite' || visibleSubscription?.tier === 'supporter' || visibleSubscription?.tier === 'premium';
  const isElite = visibleSubscription?.tier === 'elite' || visibleSubscription?.tier === 'premium';
  const isPro = visibleSubscription?.tier === 'pro' || visibleSubscription?.tier === 'supporter';
  const hasGuardianAccess = isPro || isElite || isTrial;
  const hasCrystallineAccess = isElite || isTrial;
  return {
    subscription: visibleSubscription,
    usage: visibleUsage,
    tiers,
    loading: tiersLoading || statusLoading,
    tiersLoading,
    statusLoading,
    error,
    fetchStatus,
    fetchTiers,
    startTrial,
    checkout,
    cancel,
    canUseAI,
    aiMessagesRemaining,
    aiGenerationsRemaining,
    isFreeTier,
    isTrial,
    isPaid,
    isPro,
    isElite,
    hasGuardianAccess,
    hasCrystallineAccess,
  };
}
export default useSubscription;
