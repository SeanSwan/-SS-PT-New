/**
 * OPS AGGREGATE WIDGETS (SWA-138 S15) — the three widgets S11 deferred, now
 * that server-side rollups exist behind them:
 *   TrainerUtilizationWidget · CancellationImpactWidget · ActivationFunnelWidget
 *
 * Each renders the backend's own `basis` string, because every one of these
 * numbers is easy to misread. A rate with no stated denominator is the same
 * class of lie as the synthetic KPI targets S6 removed.
 * PRIVACY: first name + id only (Rule 8).
 * Shared chrome + tones live in ./OpsAggregateWidgets.styles (Rule 4).
 */

import React, { useCallback } from 'react';
import { Gauge, CalendarX, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { usePolledFetch, WidgetShell } from '../shell';
import {
  Bar, Basis, ERROR, Fill, List, Meta, PRIMARY, Pct, Row, SUCCESS, Stat,
  StatLabel, StatValue, Stats, WARNING, Who, money, utilizationTone,
} from './OpsAggregateWidgets.styles';

export { utilizationTone } from './OpsAggregateWidgets.styles';

// ── Trainer utilization ─────────────────────────────────────

interface TrainerRow {
  trainerId: number;
  firstName: string;
  sessions: number;
  bookedHours: number;
  capacityHours: number;
  utilizationPct: number | null;
}

export const TrainerUtilizationWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const fetchData = useCallback(async () => {
    const res = await authAxios.get('/api/admin/ops/trainer-utilization', { params: { days: 30 } });
    const d = res.data?.data;
    if (!d) throw new Error('Malformed utilization payload');
    return { basis: String(d.basis ?? ''), trainers: (d.trainers ?? []) as TrainerRow[] };
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } = usePolledFetch(fetchData);
  const trainers = data?.trainers ?? [];

  return (
    <WidgetShell
      title="Trainer Utilization"
      icon={<Gauge size={20} />}
      loading={loading}
      error={error ? 'Trainer utilization unavailable' : null}
      empty={trainers.length === 0}
      emptyMessage="No trainers with sessions in this window."
      hasData={trainers.length > 0}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <Basis>{data?.basis}</Basis>
      <List>
        {trainers.map((t) => (
          <Row key={t.trainerId}>
            <Pct $tone={utilizationTone(t.utilizationPct)}>
              {t.utilizationPct === null ? '—' : `${t.utilizationPct}%`}
            </Pct>
            <Who>
              {t.firstName} · #{t.trainerId}
              <Meta>
                {t.bookedHours}h booked
                {t.capacityHours > 0 ? ` of ${t.capacityHours}h` : ' · no availability set'}
                {` · ${t.sessions} session${t.sessions === 1 ? '' : 's'}`}
              </Meta>
            </Who>
          </Row>
        ))}
      </List>
    </WidgetShell>
  );
};

// ── Cancellation impact ─────────────────────────────────────

export const CancellationImpactWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const fetchData = useCallback(async () => {
    const res = await authAxios.get('/api/admin/ops/cancellation-impact', { params: { days: 30 } });
    const d = res.data?.data;
    if (!d) throw new Error('Malformed cancellation payload');
    return d as {
      basis: string; totalCancellations: number;
      byDecision: { pending: number; charged: number; waived: number; undecided: number };
      chargedAmountUSD: number; waivedAmountUSD: number; leakageUSD: number;
    };
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } = usePolledFetch(fetchData);
  const pendingCount = data?.byDecision?.pending ?? 0;

  return (
    <WidgetShell
      title={pendingCount > 0 ? `Cancellation Impact (${pendingCount} pending)` : 'Cancellation Impact'}
      icon={<CalendarX size={20} />}
      loading={loading}
      error={error ? 'Cancellation data unavailable' : null}
      empty={data !== null && data.totalCancellations === 0}
      emptyMessage="No cancellations in this window."
      hasData={data !== null && data.totalCancellations > 0}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {data && data.totalCancellations > 0 && (
        <>
          <Stats>
            <Stat>
              <StatValue $tone={ERROR}>{money(data.leakageUSD)}</StatValue>
              <StatLabel>Waived (leakage)</StatLabel>
            </Stat>
            <Stat>
              <StatValue $tone={SUCCESS}>{money(data.chargedAmountUSD)}</StatValue>
              <StatLabel>Recovered</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{data.totalCancellations}</StatValue>
              <StatLabel>Cancellations</StatLabel>
            </Stat>
            <Stat>
              <StatValue $tone={pendingCount > 0 ? WARNING : undefined}>{pendingCount}</StatValue>
              <StatLabel>Awaiting decision</StatLabel>
            </Stat>
          </Stats>
          <Basis>{data.basis}</Basis>
        </>
      )}
    </WidgetShell>
  );
};

// ── Activation funnel ───────────────────────────────────────

export const ActivationFunnelWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const fetchData = useCallback(async () => {
    const res = await authAxios.get('/api/admin/ops/activation-funnel', { params: { days: 30 } });
    const d = res.data?.data;
    if (!d) throw new Error('Malformed funnel payload');
    return d as {
      basis: string; signups: number; booked: number; completed: number;
      bookedPct: number | null; completedPct: number | null;
    };
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } = usePolledFetch(fetchData);

  return (
    <WidgetShell
      title="Activation Funnel"
      icon={<TrendingUp size={20} />}
      loading={loading}
      error={error ? 'Activation funnel unavailable' : null}
      empty={data !== null && data.signups === 0}
      emptyMessage="No new clients signed up in this window."
      hasData={data !== null && data.signups > 0}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {data && data.signups > 0 && (
        <>
          <Stats>
            <Stat>
              <StatValue>{data.signups}</StatValue>
              <StatLabel>Signed up</StatLabel>
            </Stat>
            <Stat>
              <StatValue $tone={PRIMARY}>{data.booked}</StatValue>
              <StatLabel>Booked ({data.bookedPct}%)</StatLabel>
            </Stat>
            <Stat>
              <StatValue $tone={SUCCESS}>{data.completed}</StatValue>
              <StatLabel>Trained ({data.completedPct}%)</StatLabel>
            </Stat>
          </Stats>
          <Bar><Fill $pct={data.bookedPct ?? 0} $tone={PRIMARY} /></Bar>
          <Meta>Booked a first session</Meta>
          <Bar><Fill $pct={data.completedPct ?? 0} $tone={SUCCESS} /></Bar>
          <Meta>Completed a first session</Meta>
          <Basis>{data.basis}</Basis>
        </>
      )}
    </WidgetShell>
  );
};
