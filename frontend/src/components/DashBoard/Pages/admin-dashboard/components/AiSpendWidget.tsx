/**
 * ┌─── SUB-COMPONENT: AiSpendWidget ───────────────────────────┐
 * │ PARENT: AdminOverviewPanel (Revenue Integrity band)         │
 * │ PURPOSE: What Swan Coach costs this month, and who is       │
 * │          driving it. Cost scales with usage, so this is the │
 * │          early-warning surface for AI spend. (SWA-138 S11)  │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ ⚡ AI Spend · 2026-08              [↻] updated 4m      │  │
 * │ │  ~$12.40 est · 4,210 msgs · 88 gens · 37 active users  │  │
 * │ │ ─────────────────────────────────────────────────────  │  │
 * │ │ ⚠ 2 flagged users                                      │  │
 * │ │ 412  Alex · client · crystalline                       │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ HONESTY: the backend derives cost from per-message and      │
 * │ per-generation rates, so it is an ESTIMATE — labeled as     │
 * │ such, never presented as an invoice total.                  │
 * │ PRIVACY: the API returns display names; this renders the    │
 * │ FIRST name + id only (Rule 8).                              │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Zap, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { usePolledFetch, WidgetShell } from '../shell';

interface AiUser {
  id: number;
  firstName: string;
  role: string;
  tier: string;
  messages: number;
  generations: number;
}

interface AiSpendData {
  period: string;
  messages: number;
  generations: number;
  activeAiUsers: number;
  estimatedCostUSD: number;
  topUsers: AiUser[];
  flaggedCount: number;
}

const MUTED = 'var(--text-muted, #94A3B8)';
const WARNING = 'var(--warning, #EAB308)';
const PRIMARY = 'var(--accent-primary, #60C0F0)';

const money = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
    .format(Number.isFinite(v) ? v : 0);

/** Only the first token of a display name reaches the DOM (Rule 8). */
const firstNameOf = (name: unknown) =>
  String(name ?? '').trim().split(/\s+/)[0] || 'User';

const HeadlineRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 6px;
`;

const Stat = styled.div`
  min-width: 88px;
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

const EstimateNote = styled.p`
  color: ${MUTED};
  font-size: 0.7rem;
  margin: 0 0 12px;
`;

const FlagBanner = styled.div`
  align-items: center;
  background: color-mix(in srgb, ${WARNING} 12%, transparent);
  border: 1px solid color-mix(in srgb, ${WARNING} 34%, transparent);
  border-radius: 10px;
  color: ${WARNING};
  display: flex;
  font-size: 0.76rem;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
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

const Usage = styled.span`
  background: color-mix(in srgb, ${PRIMARY} 14%, transparent);
  border: 1px solid color-mix(in srgb, ${PRIMARY} 34%, transparent);
  border-radius: 8px;
  color: ${PRIMARY};
  flex-shrink: 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 8px;
`;

const Who = styled.div`
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  font-size: 0.82rem;
  min-width: 0;
`;

const Meta = styled.div`
  color: ${MUTED};
  font-size: 0.7rem;
`;

const AiSpendWidget: React.FC = () => {
  const { authAxios } = useAuth();

  const fetchUsage = useCallback(async (): Promise<AiSpendData> => {
    const res = await authAxios.get('/api/admin/ai-usage');
    const d = res.data?.data;
    if (!d) throw new Error('Malformed AI usage payload');
    const totals = d.totals ?? {};
    return {
      period: String(d.period ?? ''),
      messages: Number(totals.messages ?? 0),
      generations: Number(totals.generations ?? 0),
      activeAiUsers: Number(totals.activeAiUsers ?? 0),
      estimatedCostUSD: Number(totals.estimatedCostUSD ?? 0),
      topUsers: (Array.isArray(d.topUsers) ? d.topUsers : []).map((u: any) => ({
        id: Number(u.id),
        firstName: firstNameOf(u.name),
        role: String(u.role ?? ''),
        tier: String(u.tier ?? ''),
        messages: Number(u.messages ?? 0),
        generations: Number(u.generations ?? 0),
      })),
      flaggedCount: Array.isArray(d.flaggedUsers) ? d.flaggedUsers.length : 0,
    };
  }, [authAxios]);

  const { data, loading, refreshing, error, lastUpdated, refresh } =
    usePolledFetch<AiSpendData>(fetchUsage);

  return (
    <WidgetShell
      title={data?.period ? `AI Spend · ${data.period}` : 'AI Spend'}
      icon={<Zap size={20} />}
      loading={loading}
      error={error ? 'AI usage data unavailable' : null}
      empty={data !== null && data.messages === 0 && data.generations === 0}
      emptyMessage="No AI usage recorded this period."
      hasData={data !== null && (data.messages > 0 || data.generations > 0)}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
      skeletonCount={3}
    >
      {data && (
        <>
          <HeadlineRow>
            <Stat>
              <StatValue $tone={WARNING}>~{money(data.estimatedCostUSD)}</StatValue>
              <StatLabel>Estimated cost</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{data.messages.toLocaleString()}</StatValue>
              <StatLabel>Messages</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{data.generations.toLocaleString()}</StatValue>
              <StatLabel>Generations</StatLabel>
            </Stat>
            <Stat>
              <StatValue>{data.activeAiUsers}</StatValue>
              <StatLabel>Active users</StatLabel>
            </Stat>
          </HeadlineRow>
          <EstimateNote>
            Estimated from per-message and per-generation rates — an indication of
            spend, not a provider invoice.
          </EstimateNote>

          {data.flaggedCount > 0 && (
            <FlagBanner role="status">
              <AlertTriangle size={15} aria-hidden="true" />
              {data.flaggedCount} user{data.flaggedCount === 1 ? '' : 's'} flagged for unusual usage
            </FlagBanner>
          )}

          <SectionLabel>Heaviest users</SectionLabel>
          <List>
            {data.topUsers.map((u) => (
              <Row key={u.id}>
                <Usage>{u.messages.toLocaleString()}m</Usage>
                <Who>
                  {u.firstName} · #{u.id}
                  <Meta>
                    {u.role}{u.tier ? ` · ${u.tier}` : ''}
                    {u.generations > 0 ? ` · ${u.generations} gens` : ''}
                  </Meta>
                </Who>
              </Row>
            ))}
          </List>
        </>
      )}
    </WidgetShell>
  );
};

export default AiSpendWidget;
