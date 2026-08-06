/**
 * ┌─── SUB-COMPONENT: SessionLiabilityWidget ──────────────────┐
 * │ PARENT: AdminOverviewPanel (Revenue Integrity band)         │
 * │ PURPOSE: Unredeemed prepaid sessions — money already        │
 * │          collected against training not yet delivered.      │
 * │          The deferred-revenue number Sean gets asked about. │
 * │          (SWA-138 S11)                                      │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ 🎟 Session Liability                   [↻] updated 2m  │  │
 * │ │  142 sessions · ~$24,850 est · 18 clients holding      │  │
 * │ │  Estimated at $175/session — not a booked figure       │  │
 * │ │ ─────────────────────────────────────────────────────  │  │
 * │ │ 24  Alex · #128                                        │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ HONESTY: the dollar value is an ESTIMATE (sessions carry no │
 * │ per-unit price on the user row). The widget says so on the  │
 * │ surface — it must never read as a booked accounting figure. │
 * │ PRIVACY: first name + id only (Rule 8).                     │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Ticket } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { usePolledFetch, WidgetShell } from '../shell';

interface Holder {
  id: number;
  firstName: string;
  role: string;
  sessions: number;
}

interface LiabilityData {
  totalSessions: number;
  holderCount: number;
  estimatedValueUSD: number;
  rateUSD: number;
  topHolders: Holder[];
}

const MUTED = 'var(--text-muted, #94A3B8)';
const GOLD = 'var(--accent-gold, #C6A84B)';

const money = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(Number.isFinite(v) ? v : 0);

const HeadlineRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 6px;
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

/** The estimate disclaimer is part of the data, not fine print. */
const ValuationNote = styled.p`
  color: ${MUTED};
  font-size: 0.7rem;
  margin: 0 0 14px;
`;

const SectionLabel = styled.h4`
  color: ${MUTED};
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  margin: 0 0 8px;
  text-transform: uppercase;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  max-height: 170px;
  overflow-y: auto;
  padding: 0;
`;

const Row = styled.li`
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-tertiary, #4070C0) 12%, transparent);
  display: flex;
  gap: 10px;
  padding: 8px 0;
  &:last-child { border-bottom: none; }
`;

const Count = styled.span`
  background: color-mix(in srgb, ${GOLD} 16%, transparent);
  border: 1px solid color-mix(in srgb, ${GOLD} 38%, transparent);
  border-radius: 8px;
  color: ${GOLD};
  flex-shrink: 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 34px;
  padding: 3px 8px;
  text-align: center;
`;

const Who = styled.div`
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  font-size: 0.82rem;
  min-width: 0;
`;

const SessionLiabilityWidget: React.FC = () => {
  const { authAxios } = useAuth();

  const fetchLiability = useCallback(async (): Promise<LiabilityData> => {
    const res = await authAxios.get('/api/admin/session-liability');
    const d = res.data?.data;
    if (!d) throw new Error('Malformed liability payload');
    return {
      totalSessions: Number(d.totalSessions ?? 0),
      holderCount: Number(d.holderCount ?? 0),
      estimatedValueUSD: Number(d.estimatedValueUSD ?? 0),
      rateUSD: Number(d.rateUSD ?? 0),
      topHolders: Array.isArray(d.topHolders) ? d.topHolders : [],
    };
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } =
    usePolledFetch<LiabilityData>(fetchLiability);

  return (
    <WidgetShell
      title="Session Liability"
      icon={<Ticket size={20} />}
      loading={loading}
      error={error ? 'Session liability unavailable' : null}
      empty={data !== null && data.totalSessions === 0}
      emptyMessage="No unredeemed prepaid sessions outstanding."
      hasData={data !== null && data.totalSessions > 0}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
      skeletonCount={3}
    >
      {data && data.totalSessions > 0 && (
        <>
          <HeadlineRow>
            <Stat>
              <StatValue>{data.totalSessions}</StatValue>
              <StatLabel>Sessions owed</StatLabel>
            </Stat>
            <Stat>
              <StatValue $tone={GOLD}>~{money(data.estimatedValueUSD)}</StatValue>
              <StatLabel>Estimated value</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{data.holderCount}</StatValue>
              <StatLabel>Clients holding</StatLabel>
            </Stat>
          </HeadlineRow>
          <ValuationNote>
            Estimated at {money(data.rateUSD)}/session — an indication of exposure,
            not a booked accounting figure.
          </ValuationNote>
          <SectionLabel>Largest balances</SectionLabel>
          <List>
            {data.topHolders.map((h) => (
              <Row key={h.id}>
                <Count>{h.sessions}</Count>
                <Who>{h.firstName} · #{h.id}</Who>
              </Row>
            ))}
          </List>
        </>
      )}
    </WidgetShell>
  );
};

export default SessionLiabilityWidget;
