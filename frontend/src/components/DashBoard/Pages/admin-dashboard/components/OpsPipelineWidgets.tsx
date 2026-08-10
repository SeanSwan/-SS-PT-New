/**
 * OPS PIPELINE WIDGETS (SWA-138 S16) — the last two S11 deferrals, now that
 * their aggregates exist:
 *   PlaudHealthWidget    voice-clip ingestion + R2 mirror health
 *   BootcampOpsWidget    class volume + whether attendance got recorded
 *
 * Both distinguish "self-healing" from "needs a human": retryable mirror jobs
 * recover on their own, terminal failures do not. Surfacing them as one blob
 * would send Sean chasing problems that fix themselves.
 * Shared chrome from ./OpsAggregateWidgets.styles (Rule 4).
 */

import React, { useCallback } from 'react';
import { Mic, Users2 } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { usePolledFetch, WidgetShell } from '../shell';
import {
  Bar, Basis, ERROR, Fill, List, Meta, PRIMARY, Pct, Row, SUCCESS,
  Stat, StatLabel, StatValue, Stats, WARNING, Who,
} from './OpsAggregateWidgets.styles';

// ── PLAUD ingestion health ──────────────────────────────────

interface PlaudHealth {
  basis: string;
  totalClips: number;
  merged: number;
  lost: number;
  stuckClips: number;
  mirror: { total: number; mirrored: number; retrying: number; terminalFailures: number };
  needsAttention: number;
}

export const PlaudHealthWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const fetchData = useCallback(async (): Promise<PlaudHealth> => {
    const res = await authAxios.get('/api/admin/ops/plaud-health', { params: { days: 30 } });
    const d = res.data?.data;
    if (!d) throw new Error('Malformed PLAUD health payload');
    return d as PlaudHealth;
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } = usePolledFetch(fetchData);
  const attention = data?.needsAttention ?? 0;

  return (
    <WidgetShell
      title={attention > 0 ? `Voice Ingestion (${attention} need attention)` : 'Voice Ingestion'}
      icon={<Mic size={20} />}
      loading={loading}
      error={error ? 'Voice ingestion health unavailable' : null}
      empty={data !== null && data.totalClips === 0}
      emptyMessage="No voice clips uploaded in this window."
      hasData={data !== null && data.totalClips > 0}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {data && data.totalClips > 0 && (
        <>
          <Stats>
            <Stat>
              <StatValue $tone={SUCCESS}>{data.merged}</StatValue>
              <StatLabel>Merged</StatLabel>
            </Stat>
            <Stat>
              <StatValue $tone={data.stuckClips > 0 ? WARNING : undefined}>{data.stuckClips}</StatValue>
              <StatLabel>In flight</StatLabel>
            </Stat>
            <Stat>
              {/* Retryable jobs self-heal — deliberately NOT alarmed. */}
              <StatValue>{data.mirror.retrying}</StatValue>
              <StatLabel>Mirror retrying</StatLabel>
            </Stat>
            <Stat>
              <StatValue $tone={data.mirror.terminalFailures > 0 ? ERROR : undefined}>
                {data.mirror.terminalFailures}
              </StatValue>
              <StatLabel>Mirror failed</StatLabel>
            </Stat>
          </Stats>
          {data.lost > 0 && (
            <Meta>{data.lost} clip{data.lost === 1 ? '' : 's'} marked lost</Meta>
          )}
          <Basis>{data.basis}</Basis>
        </>
      )}
    </WidgetShell>
  );
};

// ── Bootcamp ops ────────────────────────────────────────────

interface BootcampOps {
  basis: string;
  classes: number;
  logged: number;
  unlogged: number;
  loggedPct: number | null;
  byTrainer: Array<{ trainerId: number; classes: number; logged: number; unlogged: number }>;
}

export const BootcampOpsWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const fetchData = useCallback(async (): Promise<BootcampOps> => {
    const res = await authAxios.get('/api/admin/ops/bootcamp-ops', { params: { days: 30 } });
    const d = res.data?.data;
    if (!d) throw new Error('Malformed bootcamp payload');
    return { ...d, byTrainer: Array.isArray(d.byTrainer) ? d.byTrainer : [] } as BootcampOps;
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } = usePolledFetch(fetchData);
  const unlogged = data?.unlogged ?? 0;
  const gaps = (data?.byTrainer ?? []).filter((t) => t.unlogged > 0);

  return (
    <WidgetShell
      title={unlogged > 0 ? `Bootcamp Ops (${unlogged} unlogged)` : 'Bootcamp Ops'}
      icon={<Users2 size={20} />}
      loading={loading}
      error={error ? 'Bootcamp data unavailable' : null}
      empty={data !== null && data.classes === 0}
      emptyMessage="No bootcamp classes in this window."
      hasData={data !== null && data.classes > 0}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      {data && data.classes > 0 && (
        <>
          <Stats>
            <Stat>
              <StatValue>{data.classes}</StatValue>
              <StatLabel>Classes run</StatLabel>
            </Stat>
            <Stat>
              <StatValue $tone={SUCCESS}>{data.logged}</StatValue>
              <StatLabel>Attendance logged</StatLabel>
            </Stat>
            <Stat>
              <StatValue $tone={unlogged > 0 ? WARNING : undefined}>{unlogged}</StatValue>
              <StatLabel>Never recorded</StatLabel>
            </Stat>
          </Stats>
          <Bar>
            <Fill $pct={data.loggedPct ?? 0} $tone={data.loggedPct !== null && data.loggedPct >= 90 ? SUCCESS : WARNING} />
          </Bar>
          <Meta>
            {data.loggedPct === null ? 'No rate available' : `${data.loggedPct}% of classes have their attendance recorded`}
          </Meta>
          {gaps.length > 0 && (
            <List>
              {gaps.slice(0, 8).map((t) => (
                <Row key={t.trainerId}>
                  <Pct $tone={WARNING}>{t.unlogged}</Pct>
                  <Who>
                    Trainer #{t.trainerId}
                    <Meta>{t.unlogged} of {t.classes} classes unlogged</Meta>
                  </Who>
                </Row>
              ))}
            </List>
          )}
          <Basis>{data.basis}</Basis>
        </>
      )}
    </WidgetShell>
  );
};