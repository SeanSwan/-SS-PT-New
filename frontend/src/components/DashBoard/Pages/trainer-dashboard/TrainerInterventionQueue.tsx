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
 *          workout sessions; the card self-hides on fetch failure and says
 *          "everyone's on track" honestly when the list is empty.
 * ============================================================================
 */
import React, { useEffect, useState } from 'react';
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

const TrainerInterventionQueue: React.FC = () => {
  const { authAxios } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<AtRiskClient[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Self-hiding is the contract: any auth/transport irregularity (including
    // harnesses without a real axios) resolves to "render nothing", never a
    // crash on the trainer's home.
    if (typeof authAxios?.get !== 'function') {
      setFailed(true);
      return undefined;
    }
    let mounted = true;
    Promise.resolve()
      .then(() => authAxios.get('/api/admin/compliance/at-risk'))
      .then((res: { data?: { clients?: AtRiskClient[] } }) => {
        if (!mounted) return;
        setClients(Array.isArray(res?.data?.clients) ? res.data.clients.slice(0, MAX_ROWS) : []);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });
    return () => { mounted = false; };
  }, [authAxios]);

  // Self-hide on failure/denial: a wrong guess about client risk is worse
  // than no card. Loading renders nothing (the queue appears when ready).
  if (failed || clients === null) return null;

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
