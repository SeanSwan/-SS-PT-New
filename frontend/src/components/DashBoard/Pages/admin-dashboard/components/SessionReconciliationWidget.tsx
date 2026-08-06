/**
 * ┌─── SUB-COMPONENT: SessionReconciliationWidget ─────────────┐
 * │ PARENT: AdminOverviewPanel (Business Lens band)             │
 * │ PURPOSE: Clients who PAID but never received their sessions │
 * │          — completed carts with sessionsGranted = false.    │
 * │          (SWA-138 S10b)                                     │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ ⚖ Session Reconciliation (2)           [↻] updated 3m  │  │
 * │ │  2 unfulfilled · 24 sessions owed · $1,750 collected   │  │
 * │ │ ─────────────────────────────────────────────────────  │  │
 * │ │ ▌ 8 owed · Cart #412 · Alex · $350 · Aug 2            │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ WHY: this is money already taken for value not delivered —  │
 * │ the highest-trust-risk gap in the ledger. Zero rows is the  │
 * │ healthy state and the widget says so plainly.               │
 * │ Shell: WidgetShell — loading/error/empty distinct, 60s poll │
 * │ PRIVACY: name + cart/user id only; no emails rendered.      │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Scale } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { usePolledFetch, WidgetShell } from '../shell';

interface UngrantedDetail {
  cartId: number;
  userId: number;
  userName: string;
  sessionsOwed: number;
  cartTotal: number;
  completedAt: string | null;
}

interface ReconciliationData {
  ungrantedCarts: number;
  grantedCarts: number;
  totalSessionsOwed: number;
  amountAffected: number;
  details: UngrantedDetail[];
}

const ERROR = 'var(--error, #EF4444)';
const SUCCESS = 'var(--success, #22C55E)';
const MUTED = 'var(--text-muted, #94A3B8)';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(Number.isFinite(value) ? value : 0);

const HeadlineRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 14px;
`;

const Stat = styled.div`
  min-width: 92px;
`;

const StatValue = styled.div<{ $tone?: string }>`
  color: ${({ $tone }) => $tone || 'var(--text-primary, #E0ECF4)'};
  font-family: 'Fira Code', monospace;
  font-size: 1.3rem;
  font-weight: 700;
`;

const StatLabel = styled.div`
  color: ${MUTED};
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  max-height: 190px;
  overflow-y: auto;
  padding: 0;
`;

const Row = styled.li`
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-tertiary, #4070C0) 12%, transparent);
  display: flex;
  gap: 10px;
  padding: 9px 0;
  &:last-child { border-bottom: none; }
`;

const OwedBadge = styled.span`
  background: color-mix(in srgb, ${ERROR} 16%, transparent);
  border: 1px solid color-mix(in srgb, ${ERROR} 38%, transparent);
  border-radius: 8px;
  color: ${ERROR};
  flex-shrink: 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 9px;
`;

const Facts = styled.div`
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  font-size: 0.82rem;
  min-width: 0;
`;

const Meta = styled.div`
  color: ${MUTED};
  font-size: 0.7rem;
`;

const SessionReconciliationWidget: React.FC = () => {
  const { authAxios } = useAuth();

  const fetchReport = useCallback(async (): Promise<ReconciliationData> => {
    const res = await authAxios.get('/api/admin/reconciliation/report');
    const payload = res.data?.data ?? {};
    const summary = payload.summary ?? {};
    const rawDetails = Array.isArray(payload.ungrantedDetails) ? payload.ungrantedDetails : [];
    const details: UngrantedDetail[] = rawDetails.map((d: any) => ({
      cartId: Number(d.cartId),
      userId: Number(d.userId ?? 0),
      userName: String(d.userName || '').trim() || 'Client',
      sessionsOwed: Number(d.sessionsOwed ?? 0),
      cartTotal: Number(d.cartTotal ?? 0),
      completedAt: d.completedAt ?? null,
    }));
    return {
      ungrantedCarts: Number(summary.ungrantedCarts ?? details.length),
      grantedCarts: Number(summary.grantedCarts ?? 0),
      totalSessionsOwed: Number(summary.totalSessionsOwed ?? 0),
      amountAffected: details.reduce((sum, d) => sum + d.cartTotal, 0),
      details,
    };
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } =
    usePolledFetch<ReconciliationData>(fetchReport);

  const unfulfilled = data?.ungrantedCarts ?? 0;

  return (
    <WidgetShell
      title={unfulfilled > 0 ? `Session Reconciliation (${unfulfilled})` : 'Session Reconciliation'}
      icon={<Scale size={20} />}
      loading={loading}
      error={error ? 'Reconciliation data unavailable' : null}
      empty={data !== null && unfulfilled === 0}
      emptyMessage="Every completed purchase has its sessions granted."
      hasData={data !== null && unfulfilled > 0}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
      skeletonCount={3}
    >
      {data && unfulfilled > 0 && (
        <>
          <HeadlineRow>
            <Stat>
              <StatValue $tone={ERROR}>{data.totalSessionsOwed}</StatValue>
              <StatLabel>Sessions owed</StatLabel>
            </Stat>
            <Stat>
              <StatValue $tone={ERROR}>{formatMoney(data.amountAffected)}</StatValue>
              <StatLabel>Paid, not granted</StatLabel>
            </Stat>
            <Stat>
              <StatValue $tone={SUCCESS}>{data.grantedCarts}</StatValue>
              <StatLabel>Reconciled</StatLabel>
            </Stat>
          </HeadlineRow>
          <List>
            {data.details.slice(0, 10).map((detail) => (
              <Row key={detail.cartId}>
                <OwedBadge>{detail.sessionsOwed} owed</OwedBadge>
                <Facts>
                  {detail.userName} · #{detail.userId}
                  <Meta>
                    Cart #{detail.cartId} · {formatMoney(detail.cartTotal)}
                    {detail.completedAt
                      ? ` · ${new Date(detail.completedAt).toLocaleDateString()}`
                      : ''}
                  </Meta>
                </Facts>
              </Row>
            ))}
          </List>
        </>
      )}
    </WidgetShell>
  );
};

export default SessionReconciliationWidget;
