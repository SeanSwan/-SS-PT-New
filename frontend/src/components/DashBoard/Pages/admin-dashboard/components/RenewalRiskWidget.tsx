/**
 * ┌─── SUB-COMPONENT: RenewalRiskWidget ───────────────────────┐
 * │ PARENT: AdminOverviewPanel (Work Queues band)               │
 * │ PURPOSE: Clients approaching a renewal cliff — low sessions │
 * │          remaining and/or long inactivity — ranked by the   │
 * │          backend's urgency score so the admin sees who is   │
 * │          about to churn BEFORE they lapse. (SWA-138 S10)    │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────────────────────────────────┐  │
 * │ │ ⚠ Renewal Risk (4)                     [↻] updated 2m  │  │
 * │ │ ─────────────────────────────────────────────────────  │  │
 * │ │ ▌9  Client #128 · 1 left · 24d since        [URGENT]   │  │
 * │ │      [Contacted]  [Renewed]  [Dismiss]                 │  │
 * │ └────────────────────────────────────────────────────────┘  │
 * │ Props: maxItems (default 6)                                 │
 * │ CLICK-OUTCOMES (all persisted, model lifecycle already      │
 * │ existed — S10 only wired the routes):                       │
 * │ [Contacted] -> PATCH /api/renewal-alerts/:id/contacted      │
 * │ [Renewed]   -> PATCH /api/renewal-alerts/:id/renewed        │
 * │ [Dismiss]   -> PATCH /api/renewal-alerts/:id/dismissed      │
 * │ Shell: WidgetShell — loading/error/empty distinct, 60s poll │
 * │ PRIVACY: renders client id + first name only (Rule 8).      │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { AlertOctagon } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { usePolledFetch, WidgetShell } from '../shell';

interface RenewalAlert {
  id: number;
  userId: number;
  firstName: string;
  sessionsRemaining: number;
  daysSinceLastSession: number;
  urgencyScore: number;
}

const ERROR_TOKEN = 'var(--error, #EF4444)';
const WARN_TOKEN = 'var(--warning, #EAB308)';
const MUTED_TOKEN = 'var(--text-muted, #94A3B8)';

const urgencyToken = (score: number) =>
  score >= 8 ? ERROR_TOKEN : score >= 5 ? WARN_TOKEN : MUTED_TOKEN;

const Row = styled.li`
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-tertiary, #4070C0) 12%, transparent);
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 0;
  &:last-child { border-bottom: none; }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Score = styled.span<{ $score: number }>`
  align-items: center;
  background: color-mix(in srgb, ${({ $score }) => urgencyToken($score)} 18%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $score }) => urgencyToken($score)} 40%, transparent);
  border-radius: 8px;
  color: ${({ $score }) => urgencyToken($score)};
  display: inline-flex;
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 700;
  height: 28px;
  justify-content: center;
  width: 28px;
`;

const Facts = styled.div`
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  font-size: 0.85rem;
  min-width: 140px;
`;

const SubFacts = styled.div`
  color: ${MUTED_TOKEN};
  font-size: 0.72rem;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ActionButton = styled.button<{ $tone: 'contact' | 'win' | 'mute' }>`
  background: ${({ $tone }) => ($tone === 'win'
    ? 'color-mix(in srgb, var(--success, #22C55E) 12%, transparent)'
    : $tone === 'contact'
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
      : 'var(--surface-muted, rgba(255, 255, 255, 0.08))')};
  border: 1px solid ${({ $tone }) => ($tone === 'win'
    ? 'color-mix(in srgb, var(--success, #22C55E) 35%, transparent)'
    : $tone === 'contact'
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent)'
      : 'var(--border-soft, rgba(255, 255, 255, 0.12))')};
  border-radius: 10px;
  color: ${({ $tone }) => ($tone === 'win'
    ? 'var(--success, #22C55E)'
    : $tone === 'contact'
      ? 'var(--accent-primary, #60C0F0)'
      : MUTED_TOKEN)};
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  min-height: 44px;
  padding: 0 14px;
  &:hover:not(:disabled) { filter: brightness(1.15); }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
  &:disabled { cursor: default; opacity: 0.55; }
`;

const RowError = styled.div`
  color: ${ERROR_TOKEN};
  font-size: 0.72rem;
  width: 100%;
`;

const normalize = (raw: any): RenewalAlert => ({
  id: Number(raw.id),
  userId: Number(raw.userId ?? raw.user?.id ?? 0),
  firstName: raw.user?.firstName || 'Client',
  sessionsRemaining: Number(raw.sessionsRemaining ?? 0),
  daysSinceLastSession: Number(raw.daysSinceLastSession ?? 0),
  urgencyScore: Number(raw.urgencyScore ?? 0),
});

interface RenewalRiskWidgetProps {
  maxItems?: number;
}

const RenewalRiskWidget: React.FC<RenewalRiskWidgetProps> = ({ maxItems = 6 }) => {
  const { authAxios } = useAuth();
  const [resolvedIds, setResolvedIds] = useState<Set<number>>(new Set());
  const [actingId, setActingId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);

  const fetchAlerts = useCallback(async (): Promise<RenewalAlert[]> => {
    const res = await authAxios.get('/api/renewal-alerts', { params: { limit: maxItems } });
    const rows = res.data?.data ?? res.data?.alerts ?? [];
    return (Array.isArray(rows) ? rows : []).map(normalize);
  }, [authAxios, maxItems]);

  const { data, loading, refreshing, error, lastUpdated, refresh } =
    usePolledFetch<RenewalAlert[]>(fetchAlerts);

  const alerts = (data ?? []).filter((a) => !resolvedIds.has(a.id));

  const act = async (id: number, verb: 'contacted' | 'renewed' | 'dismissed') => {
    setActingId(id);
    setRowError(null);
    try {
      await authAxios.patch(`/api/renewal-alerts/${id}/${verb}`);
      setResolvedIds((prev) => new Set(prev).add(id));
    } catch {
      setRowError({ id, message: `Could not mark ${verb} — try again.` });
    } finally {
      setActingId(null);
    }
  };

  return (
    <WidgetShell
      title={alerts.length > 0 ? `Renewal Risk (${alerts.length})` : 'Renewal Risk'}
      icon={<AlertOctagon size={20} />}
      loading={loading}
      error={error ? 'Renewal risk data unavailable' : null}
      empty={alerts.length === 0}
      emptyMessage="No clients at renewal risk"
      hasData={data !== null && alerts.length > 0}
      lastUpdated={lastUpdated}
      refreshing={refreshing}
      onRefresh={refresh}
    >
      <List>
        {alerts.map((alert) => (
          <Row key={alert.id}>
            <Score $score={alert.urgencyScore} title={`Urgency ${alert.urgencyScore} of 10`}>
              {alert.urgencyScore}
            </Score>
            <Facts>
              {alert.firstName} · #{alert.userId}
              <SubFacts>
                {alert.sessionsRemaining} session{alert.sessionsRemaining === 1 ? '' : 's'} left
                {' · '}
                {alert.daysSinceLastSession}d since last session
              </SubFacts>
            </Facts>
            <Actions>
              <ActionButton
                type="button" $tone="contact" disabled={actingId === alert.id}
                aria-label={`Mark ${alert.firstName} as contacted`}
                onClick={() => act(alert.id, 'contacted')}
              >
                Contacted
              </ActionButton>
              <ActionButton
                type="button" $tone="win" disabled={actingId === alert.id}
                aria-label={`Mark ${alert.firstName} as renewed`}
                onClick={() => act(alert.id, 'renewed')}
              >
                Renewed
              </ActionButton>
              <ActionButton
                type="button" $tone="mute" disabled={actingId === alert.id}
                aria-label={`Dismiss renewal alert for ${alert.firstName}`}
                onClick={() => act(alert.id, 'dismissed')}
              >
                Dismiss
              </ActionButton>
            </Actions>
            {rowError?.id === alert.id && <RowError role="alert">{rowError.message}</RowError>}
          </Row>
        ))}
      </List>
    </WidgetShell>
  );
};

export default RenewalRiskWidget;
