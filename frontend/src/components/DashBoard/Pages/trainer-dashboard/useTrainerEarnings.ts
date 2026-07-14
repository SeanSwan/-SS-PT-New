/**
 * ============================================================================
 * FILE: useTrainerEarnings.ts (Dashboard batch 2026-07-13, P1-1)
 * PURPOSE: Data hook for the trainer "My Earnings" page. Consumes the
 *          EXISTING commission ledger endpoint
 *          GET /api/commissions/trainer/:trainerId (commissionRoutes.mjs),
 *          which is already self-authorized for trainers (a trainer can only
 *          read their own id; admins can read any).
 * DATA TRUTH: every row is a real TrainerCommission record created at
 *          purchase time by CommissionService — nothing is synthesized
 *          client-side. Errors surface as an explicit error state, never
 *          as fabricated zeros.
 * ============================================================================
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';

export interface TrainerCommissionRow {
  id: number;
  orderId: number;
  clientId: number;
  clientName: string;
  leadSource: 'platform' | 'trainer_brought' | 'resign' | null;
  isLoyaltyBump: boolean;
  sessionsGranted: number;
  sessionsConsumed: number;
  grossAmount: number;
  trainerCut: number;
  businessCut: number;
  commissionRateTrainer: number;
  commissionRateBusiness: number;
  paidToTrainerAt: string | null;
  payoutMethod: string | null;
  payoutReference: string | null;
  createdAt: string;
}

export interface TrainerEarnings {
  trainerId: number;
  totalEarned: number;
  unpaid: number;
  paid: number;
  commissions: TrainerCommissionRow[];
}

interface TrainerEarningsState {
  loading: boolean;
  error: string | null;
  earnings: TrainerEarnings | null;
}

const INITIAL_STATE: TrainerEarningsState = { loading: true, error: null, earnings: null };

export const useTrainerEarnings = (): TrainerEarningsState & { refetch: () => void } => {
  const { user, authAxios } = useAuth();
  const [state, setState] = useState<TrainerEarningsState>(INITIAL_STATE);
  const [refetchTick, setRefetchTick] = useState(0);

  const trainerId = Number(user?.id);

  useEffect(() => {
    if (!Number.isSafeInteger(trainerId) || trainerId <= 0 || typeof authAxios?.get !== 'function') {
      setState({ loading: false, error: 'Earnings are unavailable right now.', earnings: null });
      return undefined;
    }
    let mounted = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    Promise.resolve()
      .then(() => authAxios.get(`/api/commissions/trainer/${trainerId}`))
      .then((res: { data?: { success?: boolean; totalEarned?: number; unpaid?: number; commissions?: TrainerCommissionRow[] } }) => {
        if (!mounted) return;
        const data = res?.data;
        if (!data?.success || !Array.isArray(data.commissions)) {
          setState({ loading: false, error: 'Earnings are unavailable right now.', earnings: null });
          return;
        }
        const totalEarned = Number(data.totalEarned) || 0;
        const unpaid = Number(data.unpaid) || 0;
        setState({
          loading: false,
          error: null,
          earnings: {
            trainerId,
            totalEarned,
            unpaid,
            paid: Math.max(0, Number((totalEarned - unpaid).toFixed(2))),
            commissions: data.commissions,
          },
        });
      })
      .catch(() => {
        if (mounted) {
          setState({ loading: false, error: 'Could not load your earnings. Pull to retry or check back shortly.', earnings: null });
        }
      });
    return () => { mounted = false; };
  }, [authAxios, trainerId, refetchTick]);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  return { ...state, refetch };
};

export default useTrainerEarnings;
