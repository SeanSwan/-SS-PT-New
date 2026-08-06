/**
 * ┌─── SUB-COMPONENT: LeadSpeedWidget ─────────────────────────┐
 * │ PARENT: AdminOverviewPanel (Business Lens band)             │
 * │ PURPOSE: Speed-to-lead — how fast new leads get their first │
 * │          contact, and which are STILL waiting with the      │
 * │          clock running. (SWA-138 S10b)                      │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ ⏱ Speed to Lead                        [↻] updated 1m  │  │
 * │ │  4m median · 62% within the hour · 38 answered (30d)   │  │
 * │ │ ─────────────────────────────────────────────────────  │  │
 * │ │ Waiting now (3)                                        │  │
 * │ │ ▌ 2h 14m · Alex · referral · score 82                  │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ WHY: response speed is the strongest predictor of lead      │
 * │ conversion, so the widget reports performance AND live      │
 * │ exposure — a good median means nothing if 3 leads are cold. │
 * │ Shell: WidgetShell — loading/error/empty distinct, 60s poll │
 * │ PRIVACY: first name + id only (Rule 8).                     │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Timer } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { usePolledFetch, WidgetShell } from '../shell';

interface WaitingLead {
  id: number;
  firstName: string;
  source: string;
  score: number;
  waitingMinutes: number;
}

interface LeadSla {
  windowDays: number;
  answeredCount: number;
  medianMinutes: number | null;
  averageMinutes: number | null;
  withinFiveMin: number;
  withinHour: number;
  waitingCount: number;
  waiting: WaitingLead[];
}

const SUCCESS = 'var(--success, #22C55E)';
const WARNING = 'var(--warning, #EAB308)';
const ERROR = 'var(--error, #EF4444)';
const MUTED = 'var(--text-muted, #94A3B8)';

/** Industry benchmark: <5m elite, <60m acceptable, beyond that the lead cools. */
export const waitTone = (minutes: number) =>
  minutes <= 5 ? SUCCESS : minutes <= 60 ? WARNING : ERROR;

export const formatDuration = (minutes: number | null): string => {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
};

const HeadlineRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 14px;
`;

const Stat = styled.div`
  min-width: 96px;
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

const SectionLabel = styled.h4`
  color: ${MUTED};
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  margin: 0 0 8px;
  text-transform: uppercase;
`;

const WaitList = styled.ul`
  list-style: none;
  margin: 0;
  max-height: 190px;
  overflow-y: auto;
  padding: 0;
`;

const WaitRow = styled.li`
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-tertiary, #4070C0) 12%, transparent);
  display: flex;
  gap: 10px;
  padding: 9px 0;
  &:last-child { border-bottom: none; }
`;

const WaitClock = styled.span<{ $minutes: number }>`
  background: color-mix(in srgb, ${({ $minutes }) => waitTone($minutes)} 16%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $minutes }) => waitTone($minutes)} 38%, transparent);
  border-radius: 8px;
  color: ${({ $minutes }) => waitTone($minutes)};
  flex-shrink: 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 9px;
`;

const WaitFacts = styled.div`
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  font-size: 0.82rem;
  min-width: 0;
`;

const WaitMeta = styled.div`
  color: ${MUTED};
  font-size: 0.7rem;
`;

const AllClear = styled.div`
  color: ${SUCCESS};
  font-size: 0.8rem;
  padding: 6px 0;
`;

const LeadSpeedWidget: React.FC = () => {
  const { authAxios } = useAuth();

  const fetchSla = useCallback(async (): Promise<LeadSla> => {
    const res = await authAxios.get('/api/leads/sla', { params: { days: 30 } });
    const sla = res.data?.sla;
    if (!sla) throw new Error('Malformed SLA payload');
    return { ...sla, waiting: Array.isArray(sla.waiting) ? sla.waiting : [] };
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } =
    usePolledFetch<LeadSla>(fetchSla);

  const hourPct = data && data.answeredCount > 0
    ? Math.round((data.withinHour / data.answeredCount) * 100)
    : null;

  return (
    <WidgetShell
      title={data && data.waitingCount > 0 ? `Speed to Lead (${data.waitingCount} waiting)` : 'Speed to Lead'}
      icon={<Timer size={20} />}
      loading={loading}
      error={error ? 'Lead response data unavailable' : null}
      empty={data !== null && data.answeredCount === 0 && data.waitingCount === 0}
      emptyMessage="No leads captured in this window"
      hasData={data !== null}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
      skeletonCount={3}
    >
      {data && (
        <>
          <HeadlineRow>
            <Stat>
              <StatValue $tone={data.medianMinutes === null ? undefined : waitTone(data.medianMinutes)}>
                {formatDuration(data.medianMinutes)}
              </StatValue>
              <StatLabel>Median response</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{hourPct === null ? '—' : `${hourPct}%`}</StatValue>
              <StatLabel>Within 1 hour</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{data.withinFiveMin}</StatValue>
              <StatLabel>Under 5 min</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{data.answeredCount}</StatValue>
              <StatLabel>Answered ({data.windowDays}d)</StatLabel>
            </Stat>
          </HeadlineRow>

          <SectionLabel>Waiting now</SectionLabel>
          {data.waiting.length === 0 ? (
            <AllClear>Every lead has been contacted.</AllClear>
          ) : (
            <WaitList>
              {data.waiting.map((lead) => (
                <WaitRow key={lead.id}>
                  <WaitClock $minutes={lead.waitingMinutes}>
                    {formatDuration(lead.waitingMinutes)}
                  </WaitClock>
                  <WaitFacts>
                    {lead.firstName || 'Lead'} · #{lead.id}
                    <WaitMeta>
                      {lead.source || 'unknown source'}
                      {typeof lead.score === 'number' ? ` · score ${lead.score}` : ''}
                    </WaitMeta>
                  </WaitFacts>
                </WaitRow>
              ))}
            </WaitList>
          )}
        </>
      )}
    </WidgetShell>
  );
};

export default LeadSpeedWidget;
