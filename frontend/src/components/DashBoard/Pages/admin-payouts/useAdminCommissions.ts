/**
 * ============================================================================
 * FILE: useAdminCommissions.ts (Dashboard batch 2026-07-13, P1-2)
 * PURPOSE: Data layer for the admin Trainer Payouts console. Consumes the
 *          EXISTING commission endpoints (commissionRoutes.mjs):
 *            GET  /api/commissions/summary            — totals + per-trainer
 *            GET  /api/commissions/trainer/:trainerId — one trainer's ledger
 *            POST /api/commissions/mark-paid          — settle unpaid rows
 * DATA TRUTH: every number comes from TrainerCommission records; errors are
 *          explicit states, never fabricated zeros.
 * ============================================================================
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import type { TrainerCommissionRow } from '../trainer-dashboard/useTrainerEarnings';

export interface CommissionSummaryTotals {
  totalGross: number;
  totalBusinessCut: number;
  totalTrainerCut: number;
  totalUnpaid: number;
  totalPaid: number;
  commissionCount: number;
}

export interface TrainerCommissionSummary {
  trainerId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  totalEarned: number;
  unpaid: number;
  paid: number;
  commissionCount: number;
}

interface SummaryState {
  loading: boolean;
  error: string | null;
  totals: CommissionSummaryTotals | null;
  trainers: TrainerCommissionSummary[];
}

export const PAYOUT_METHODS = ['zelle', 'venmo', 'check', 'direct_deposit', 'stripe_connect'] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export const useAdminCommissions = () => {
  const { authAxios } = useAuth();
  const [state, setState] = useState<SummaryState>({ loading: true, error: null, totals: null, trainers: [] });
  const [refetchTick, setRefetchTick] = useState(0);

  useEffect(() => {
    if (typeof authAxios?.get !== 'function') {
      setState({ loading: false, error: 'Payout data is unavailable right now.', totals: null, trainers: [] });
      return undefined;
    }
    let mounted = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    Promise.resolve()
      .then(() => authAxios.get('/api/commissions/summary'))
      .then((res: { data?: { success?: boolean; summary?: CommissionSummaryTotals; trainers?: TrainerCommissionSummary[] } }) => {
        if (!mounted) return;
        const data = res?.data;
        if (!data?.success || !data.summary) {
          setState({ loading: false, error: 'Payout data is unavailable right now.', totals: null, trainers: [] });
          return;
        }
        const trainers = (Array.isArray(data.trainers) ? data.trainers : [])
          .slice()
          .sort((a, b) => b.unpaid - a.unpaid);
        setState({ loading: false, error: null, totals: data.summary, trainers });
      })
      .catch(() => {
        if (mounted) {
          setState({ loading: false, error: 'Could not load commission data. Try again shortly.', totals: null, trainers: [] });
        }
      });
    return () => { mounted = false; };
  }, [authAxios, refetchTick]);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  const fetchTrainerLedger = useCallback(async (trainerId: number): Promise<TrainerCommissionRow[]> => {
    const res = await authAxios.get(`/api/commissions/trainer/${trainerId}`);
    const rows = res?.data?.commissions;
    if (!res?.data?.success || !Array.isArray(rows)) {
      throw new Error('ledger_unavailable');
    }
    return rows as TrainerCommissionRow[];
  }, [authAxios]);

  const markPaid = useCallback(async (
    commissionIds: number[],
    payoutMethod: PayoutMethod,
    payoutReference?: string,
  ): Promise<number> => {
    const res = await authAxios.post('/api/commissions/mark-paid', {
      commissionIds,
      payoutMethod,
      payoutReference: payoutReference || undefined,
    });
    if (!res?.data?.success) {
      throw new Error('mark_paid_failed');
    }
    return Number(res.data.updatedCount) || 0;
  }, [authAxios]);

  return { ...state, refetch, fetchTrainerLedger, markPaid };
};

export default useAdminCommissions;
