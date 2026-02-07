/**
 * useClientBillingOverview Hook
 * ==============================
 * P0: Fetches billing overview for admin client management
 *
 * Returns session credits, pending orders, upcoming sessions, and recent history
 * Used by BillingSessionsCard in the admin client detail panel
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminClientService, BillingOverviewData, ApplyPaymentData, BookSessionData, AddSessionCreditsData } from '../services/adminClientService';

export interface UseClientBillingOverviewResult {
  data: BillingOverviewData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch client billing overview
 * @param clientId - The client ID to fetch billing data for
 * @param enabled - Whether to enable the query (default: true)
 */
export const useClientBillingOverview = (
  clientId: string | number | undefined,
  enabled = true
): UseClientBillingOverviewResult => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['clientBillingOverview', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const response = await adminClientService.getBillingOverview(String(clientId));
      return response.data as BillingOverviewData;
    },
    enabled: !!clientId && enabled
  });

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
    refetch
  };
};

/**
 * Hook to apply payment to an order (idempotent)
 * Returns mutation for applying payment with success/error handling
 */
export const useApplyPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, paymentData }: { orderId: string | number; paymentData: ApplyPaymentData }) => {
      return adminClientService.applyPayment(orderId, paymentData);
    },
    onSuccess: (data, variables) => {
      // Invalidate billing overview to refresh data
      queryClient.invalidateQueries({ queryKey: ['clientBillingOverview'] });
      // Also invalidate any order-related queries
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
};

/**
 * Hook to book a session for a client (admin booking)
 */
export const useBookSessionForClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BookSessionData) => {
      return adminClientService.bookSessionForClient(data);
    },
    onSuccess: (data, variables) => {
      // Invalidate billing overview to refresh session data
      queryClient.invalidateQueries({ queryKey: ['clientBillingOverview', variables.clientId] });
      // Invalidate session-related queries
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    }
  });
};

/**
 * Hook to add session credits to a client (admin grant)
 */
export const useAddSessionCredits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, data }: { clientId: string | number; data: AddSessionCreditsData }) => {
      return adminClientService.addSessionCredits(clientId, data);
    },
    onSuccess: (result, variables) => {
      // Invalidate billing overview to refresh credit count
      queryClient.invalidateQueries({ queryKey: ['clientBillingOverview', variables.clientId] });
      // Invalidate session credits queries
      queryClient.invalidateQueries({ queryKey: ['sessionCredits'] });
    }
  });
};

export default useClientBillingOverview;
