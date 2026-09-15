/**
 * ============================================================================
 * FILE: TrainerInterventionQueue.tsx (Phase 1.5b, Fable Vision arc)
 * PURPOSE: The trainer home's answer to the Rule-62 north star — "which of
 *          MY clients needs coach intervention next." Renders the top at-risk
 *          clients from the EXISTING trainer-scoped compliance aggregate
 *          (GET /api/admin/compliance/at-risk: one GROUP-BY query over
 *          workout_sessions; the backend INNER JOINs the trainer's ACTIVE
 *          assignments when the caller is a trainer — no new engine, no
 *          per-client fan-out).
 * DATA TRUTH: risk level, reason, and days-since come straight from logged
 *          workout sessions; unavailable responses stay visible with retry,
 *          while a validated empty list says "everyone's on track."
 * ============================================================================
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { buildClientProfileRoute } from '../../workspaces/clients-team/clientDailyTrainingRoutes';

const QueueCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  background: var(--surface-dark, #1a1a24);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 20%, transparent);
`;

const QueueTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
`;

const RiskRow = styled.button`
  min-height: 44px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  text-align: left;
  cursor: pointer;
  background: var(--card-dark, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
`;

const RiskBadge = styled.span<{ $level: string }>`
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
  color: var(--text-primary, #e0ecf4);
  background: ${({ $level }) =>
    $level === 'critical'
      ? 'color-mix(in srgb, var(--danger, #e05260) 35%, transparent)'
      : $level === 'warning'
        ? 'color-mix(in srgb, var(--luxury-accent, #c6a84b) 30%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60c0f0) 25%, transparent)'};
`;

const RowBody = styled.span`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const RowName = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e0ecf4);
`;

const RowReason = styled.span`
  font-size: 12px;
  color: var(--text-secondary, #9fb6c8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AllClear = styled.p`
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, #9fb6c8);
`;

const Disclosure = styled.p`
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary, rgba(159, 182, 200, 0.75));
`;

interface AtRiskClient {
  id: number;
  firstName: string;
  lastName: string;
  riskLevel: 'critical' | 'warning' | 'watch';
  reason: string;
  daysSinceLastWorkout: number;
}

const MAX_ROWS = 4;

const QueueError = styled.p`
  margin: 0;
  color: var(--danger, #e05260);
`;

const RetryButton = styled.button`
  min-height: 44px;
  align-self: flex-start;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--accent-primary, #60c0f0);
  background: transparent;
  color: var(--text-primary, #e0ecf4);
  cursor: pointer;
`;

const isValidClient = (value: unknown): value is AtRiskClient => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const client = value as Partial<AtRiskClient>;
  return typeof client.id === 'number'
    && Number.isSafeInteger(client.id)
    && client.id > 0
    && typeof client.firstName === 'string'
    && typeof client.lastName === 'string'
    && ['critical', 'warning', 'watch'].includes(String(client.riskLevel))
    && typeof client.reason === 'string'
    && typeof client.daysSinceLastWorkout === 'number'
    && Number.isFinite(client.daysSinceLastWorkout);
};

const parseClients = (response: { data?: { clients?: unknown } }): AtRiskClient[] => {
  if (!response?.data || !Array.isArray(response.data.clients)) {
    throw new Error('Malformed intervention response');
  }
  if (!response.data.clients.every(isValidClient)) {
    throw new Error('Malformed intervention row');
  }
  return response.data.clients.map((client) => ({
    ...client,
    id: client.id,
    daysSinceLastWorkout: client.daysSinceLastWorkout,
  })).slice(0, MAX_ROWS);
};

const TrainerInterventionQueue: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<AtRiskClient[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const mounted = useRef(true);

  const fetchClients = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setClients(null);
    setError(null);
    if (typeof authAxios?.get !== 'function') {
      if (mounted.current && currentRequest === requestId.current) {
        setLoading(false);
        setError('Client intervention data could not be loaded.');
      }
      return;
    }
    try {
      const response = await authAxios.get('/api/admin/compliance/at-risk');
      if (!mounted.current || currentRequest !== requestId.current) return;
      setClients(parseClients(response));
    } catch {
      if (mounted.current && currentRequest === requestId.current) {
        setError('Client intervention data is temporarily unavailable.');
      }
    } finally {
      if (mounted.current && currentRequest === requestId.current) setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    mounted.current = true;
    fetchClients();
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [fetchClients]);

  if (loading && clients === null) {
    return (
      <QueueCard aria-label="Client interventions">
        <QueueTitle><UserCheck size={16} aria-hidden="true" />Client interventions</QueueTitle>
        <AllClear>Loading intervention data…</AllClear>
      </QueueCard>
    );
  }

  if (error) {
    return (
      <QueueCard aria-label="Client interventions">
        <QueueTitle><UserCheck size={16} aria-hidden="true" />Client interventions</QueueTitle>
        <QueueError role="alert" aria-live="polite">{error}</QueueError>
        <RetryButton type="button" onClick={fetchClients}>Retry</RetryButton>
      </QueueCard>
    );
  }

  if (clients === null) return null;

  return (
    <QueueCard aria-label="Client interventions">
      <QueueTitle>
        <UserCheck size={16} aria-hidden="true" />
        Client interventions
      </QueueTitle>
      {clients.length === 0 ? (
        <AllClear>No clients need intervention right now — everyone&apos;s on track.</AllClear>
      ) : (
        clients.map((c) => {
          const name = `${c.firstName} ${c.lastName}`.trim();
          const route = buildClientProfileRoute(c.id, 'trainer');
          return (
            <RiskRow
              key={c.id}
              type="button"
              onClick={() => { if (route) navigate(route); }}
              aria-label={`Open ${name} in the client hub`}
            >
              <RiskBadge $level={c.riskLevel}>{c.riskLevel}</RiskBadge>
              <RowBody>
                <RowName>{name}</RowName>
                <RowReason>{c.reason}</RowReason>
              </RowBody>
            </RiskRow>
          );
        })
      )}
      <Disclosure>From logged workout data — most overdue first.</Disclosure>
    </QueueCard>
  );
};

export default TrainerInterventionQueue;
