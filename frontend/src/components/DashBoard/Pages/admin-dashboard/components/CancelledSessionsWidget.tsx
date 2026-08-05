/**
 * CancelledSessionsWidget - admin review queue for cancelled-session billing decisions.
 * Keeps session-deduction truth server-owned while giving admins a fast review surface.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { logger } from '@/utils/logger';
import CancelledSessionCard from './CancelledSessionCard';
import type {
  CancelledSession,
  CancelledSessionsWidgetProps,
  ChargeType,
  DecisionFilter,
  OperationNoticeState,
  PackagePriceInfo,
} from './CancelledSessionsWidget.types';
import {
  EmptyState,
  ErrorState,
  FilterButton,
  FilterButtons,
  HeaderActions,
  HeaderTitle,
  LoadingState,
  OperationNotice,
  RefreshButton,
  SessionsList,
  WidgetContainer,
  WidgetHeader,
} from './CancelledSessionsWidget.styles';

const PRICING_UNAVAILABLE: PackagePriceInfo = {
  pricePerSession: null,
  packageName: null,
  fallbackPrice: null,
  defaultChargeAmount: null,
  lateFeeAmount: null,
  isPricingAvailable: false,
};

const normalizePackagePriceInfo = (raw: Partial<PackagePriceInfo>): PackagePriceInfo => ({
  pricePerSession: raw.pricePerSession ?? null,
  packageName: raw.packageName ?? null,
  fallbackPrice: raw.fallbackPrice ?? null,
  defaultChargeAmount: raw.defaultChargeAmount ?? null,
  lateFeeAmount: raw.lateFeeAmount ?? null,
  isPricingAvailable: true,
});

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const CancelledSessionsWidget: React.FC<CancelledSessionsWidgetProps> = ({
  maxItems = 10,
  showChargeButtons = true,
}) => {
  const { authAxios } = useAuth();
  const [sessions, setSessions] = useState<CancelledSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chargingId, setChargingId] = useState<number | null>(null);
  const [priceCache, setPriceCache] = useState<Record<number, PackagePriceInfo>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<number, string>>({});
  const [expandedSession, setExpandedSession] = useState<number | null>(null);
  const [waiveReasons, setWaiveReasons] = useState<Record<number, string>>({});
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('all');
  const [operationNotice, setOperationNotice] = useState<OperationNoticeState | null>(null);

  const fetchPricesForSessions = useCallback(async (targetSessions: CancelledSession[]) => {
    // SWA-138 S7: lookups run in PARALLEL (the sequential N+1 loop stalled the
    // widget when many late-cancels queued up); each item stays error-tolerant.
    const priceEntryPairs = await Promise.all(
      targetSessions.map(async (session): Promise<[number, PackagePriceInfo]> => {
        try {
          const response = await authAxios.get(`/api/sessions/${session.id}/client-package-price`);
          return [session.id, response.data.success
            ? normalizePackagePriceInfo(response.data.data)
            : PRICING_UNAVAILABLE];
        } catch (err) {
          logger.warn(`Could not fetch price for session ${session.id}`, err);
          return [session.id, PRICING_UNAVAILABLE];
        }
      })
    );
    const priceEntries: Record<number, PackagePriceInfo> = Object.fromEntries(priceEntryPairs);

    setPriceCache((prev) => ({ ...prev, ...priceEntries }));
  }, [authAxios]);

  const fetchCancelledSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authAxios.get('/api/sessions/admin/cancelled', {
        params: {
          limit: maxItems,
          decisionStatus: decisionFilter !== 'all' ? decisionFilter : undefined,
        },
      });

      if (response.data.success) {
        const nextSessions = response.data.data as CancelledSession[];
        setSessions(nextSessions);
        const uncharged = nextSessions.filter((s) => !s.cancellationChargedAt && s.isLateCancellation);
        await fetchPricesForSessions(uncharged);
      }
    } catch (err) {
      logger.error('Error fetching cancelled sessions:', err);
      setError('Failed to load cancelled sessions');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, decisionFilter, fetchPricesForSessions, maxItems]);

  useEffect(() => {
    fetchCancelledSessions();
  }, [fetchCancelledSessions]);

  const handleCharge = async (sessionId: number, chargeType: ChargeType, customAmount?: number) => {
    try {
      setChargingId(sessionId);
      setOperationNotice(null);

      const decision = chargeType === 'none' ? 'waived' : 'charged';
      const reason = chargeType === 'none' ? waiveReasons[sessionId] : undefined;
      if (chargeType === 'none' && !reason?.trim()) {
        setOperationNotice({ type: 'error', message: 'Add a waive reason before recording the decision.' });
        setChargingId(null);
        return;
      }

      const response = await authAxios.post(`/api/sessions/${sessionId}/charge-cancellation`, {
        chargeType,
        chargeAmount: chargeType === 'custom' ? customAmount : undefined,
        decision,
        reason,
      });

      if (response.data.success) {
        await fetchCancelledSessions();
        setOperationNotice({
          type: 'success',
          message: chargeType === 'none'
            ? 'Cancellation waiver recorded for billing review.'
            : `$${response.data.data.chargeAmount} cancellation fee recorded for billing review. No card charge was processed here.`,
        });
        setExpandedSession(null);
        setCustomAmounts((prev) => ({ ...prev, [sessionId]: '' }));
        setWaiveReasons((prev) => ({ ...prev, [sessionId]: '' }));
      }
    } catch (err: any) {
      logger.error('Error recording cancellation billing decision:', err);
      setOperationNotice({
        type: 'error',
        message: err.response?.data?.message || 'Failed to record cancellation billing decision.',
      });
    } finally {
      setChargingId(null);
    }
  };

  const updateCustomAmount = (sessionId: number, value: string) => {
    setCustomAmounts((prev) => ({ ...prev, [sessionId]: value }));
  };

  const updateWaiveReason = (sessionId: number, value: string) => {
    setWaiveReasons((prev) => ({ ...prev, [sessionId]: value }));
  };

  const renderFrame = (body: React.ReactNode) => (
    <WidgetContainer>
      <WidgetHeader>
        <HeaderTitle><X size={20} /> Cancelled Sessions</HeaderTitle>
      </WidgetHeader>
      {body}
    </WidgetContainer>
  );

  if (isLoading) return renderFrame(<LoadingState>Loading cancelled sessions...</LoadingState>);
  if (error) return renderFrame(<ErrorState role="alert">{error}</ErrorState>);

  return (
    <WidgetContainer>
      <WidgetHeader>
        <HeaderTitle><X size={20} /> Cancelled Sessions</HeaderTitle>
        <HeaderActions>
          <FilterButtons>
            {(['all', 'pending', 'charged', 'waived'] as DecisionFilter[]).map((filter) => (
              <FilterButton
                key={filter}
                $active={decisionFilter === filter}
                $variant={filter === 'all' ? undefined : filter}
                onClick={() => setDecisionFilter(filter)}
                type="button"
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </FilterButton>
            ))}
          </FilterButtons>
          <RefreshButton aria-label="Refresh cancelled sessions" onClick={fetchCancelledSessions} type="button">
            <RefreshCw size={16} />
          </RefreshButton>
        </HeaderActions>
      </WidgetHeader>

      {operationNotice && (
        <OperationNotice $type={operationNotice.type} role="status" aria-live="polite">
          {operationNotice.message}
        </OperationNotice>
      )}

      {sessions.length === 0 ? (
        <EmptyState>No cancelled sessions</EmptyState>
      ) : (
        <SessionsList>
          {sessions.map((session) => (
            <CancelledSessionCard
              key={session.id}
              session={session}
              priceInfo={priceCache[session.id] || PRICING_UNAVAILABLE}
              isExpanded={expandedSession === session.id}
              isCharging={chargingId === session.id}
              showChargeButtons={showChargeButtons}
              customAmount={customAmounts[session.id] || ''}
              waiveReason={waiveReasons[session.id] || ''}
              formatDate={formatDate}
              onCharge={handleCharge}
              onCustomAmountChange={updateCustomAmount}
              onExpand={setExpandedSession}
              onWaiveReasonChange={updateWaiveReason}
              onCollapse={() => setExpandedSession(null)}
            />
          ))}
        </SessionsList>
      )}
    </WidgetContainer>
  );
};

export default CancelledSessionsWidget;
