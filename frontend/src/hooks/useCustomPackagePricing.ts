/**
 * useCustomPackagePricing Hook
 * ==============================
 * Real-time pricing calculation hook for CustomPackageBuilder wizard
 *
 * Features:
 * - Debounced API calls (300ms) to prevent excessive requests
 * - Automatic pricing updates as user adjusts session slider
 * - Volume discount tier detection
 * - Error handling and loading states
 * - Type-safe response handling
 *
 * Gemini's Enhancement: Enables interactive wizard with instant pricing feedback
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.service';

interface PricingMetadata {
  nextTierSessions: number | null;
  nextTierDiscount: number | null;
  nextTierMessage: string;
}

interface PricingResponse {
  sessions: number;
  pricePerSession: number;
  volumeDiscount: number;
  discountPercentage: number;
  discountTier: 'bronze' | 'silver' | 'gold';
  subtotal: number;
  totalDiscount: number;
  finalTotal: number;
  savingsMessage: string;
  metadata: PricingMetadata;
}

interface UseCustomPackagePricingReturn {
  pricing: PricingResponse | null;
  loading: boolean;
  error: string | null;
  calculatePricing: (sessions: number) => void;
}

/**
 * Custom hook for calculating package pricing with debouncing
 *
 * @param initialSessions - Initial number of sessions (default: 10)
 * @param debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns Pricing state, loading state, error state, and calculate function
 *
 * @example
 * const { pricing, loading, error, calculatePricing } = useCustomPackagePricing(25);
 *
 * // User adjusts slider
 * calculatePricing(35); // Debounced API call after 300ms
 *
 * // Display pricing
 * {pricing && (
 *   <div>
 *     <p>{pricing.sessions} sessions × ${pricing.pricePerSession} = ${pricing.finalTotal}</p>
 *     <p>{pricing.savingsMessage}</p>
 *   </div>
 * )}
 */
export const useCustomPackagePricing = (
  initialSessions: number = 10,
  debounceMs: number = 300
): UseCustomPackagePricingReturn => {
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<number>(initialSessions);

  // Fetch pricing from API
  const fetchPricing = useCallback(async (sessionCount: number) => {
    // Validate session count
    if (sessionCount < 10 || sessionCount > 100) {
      setError('Sessions must be between 10 and 100');
      setPricing(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/storefront/calculate-price?sessions=${sessionCount}`);

      if (response.data.success) {
        setPricing(response.data.pricing);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to calculate pricing');
        setPricing(null);
      }
    } catch (err: any) {
      console.error('Error calculating custom package pricing:', err);

      // Extract error message from API response
      const errorMessage = err.response?.data?.message ||
                          err.response?.data?.businessRule ||
                          'Failed to calculate pricing. Please try again.';

      setError(errorMessage);
      setPricing(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced pricing calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sessions >= 10 && sessions <= 100) {
        fetchPricing(sessions);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [sessions, debounceMs, fetchPricing]);

  // Calculate pricing function (exposed to component)
  const calculatePricing = useCallback((newSessions: number) => {
    setSessions(newSessions);
  }, []);

  // Initial load
  useEffect(() => {
    if (initialSessions >= 10 && initialSessions <= 100) {
      fetchPricing(initialSessions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return {
    pricing,
    loading,
    error,
    calculatePricing
  };
};

export default useCustomPackagePricing;
