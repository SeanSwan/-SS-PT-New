/**
 * ============================================================================
 * FILE: ClientWorkoutPlansPanel.tsx
 * PURPOSE: Selected-client saved plan receipt inside the Client Hub.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Loads the selected client's workout plans from the canonical workout-plan
 * list API and gives trainers/admins a quick proof that Plan Next saved.
 *
 * HOW IT FITS IN THE APP:
 * ClientsWorkspace -> TrainingTabContent -> ClientWorkoutPlansPanel.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { CheckCircle2, ClipboardList, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { getNumericClientId } from './clientTabId';

interface ClientWorkoutPlansPanelProps {
  clientId: number | string;
  clientName?: string;
}

interface PlanSummary {
  id: string;
  title: string;
  status: string;
  goal: string;
  nasmPhase?: number;
  durationWeeks?: number;
  updatedAt?: string;
}

const Panel = styled.section`
  display: grid;
  gap: 14px;
  padding: 18px;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  background: var(--bg-elevated, #1A1A24);
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;

const TitleBlock = styled.div`
  display: grid;
  gap: 4px;
`;

const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

const Title = styled.h3`
  margin: 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  line-height: 1.2;
`;

const Hint = styled.p`
  margin: 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.74));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;

const RefreshButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, var(--accent-primary, #60C0F0) 8%);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const PlanGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
`;

const PlanCard = styled.article`
  display: grid;
  gap: 10px;
  min-height: 132px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: var(--bg-surface, #141419);
`;

const PlanTitle = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
`;

const StatusBadge = styled.span<{ $active: boolean }>`
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 9px;
  border-radius: 8px;
  color: ${({ $active }) => ($active ? 'var(--accent-gold, #C6A84B)' : 'var(--text-muted, rgba(224,236,244,0.72))')};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 14%, transparent)'
      : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, var(--accent-primary, #60C0F0) 6%)'};
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

const StateCard = styled.div`
  min-height: 112px;
  display: grid;
  place-items: center;
  padding: 18px;
  border-radius: 12px;
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.16));
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  text-align: center;
`;

const normalizePlan = (plan: Record<string, unknown>): PlanSummary | null => {
  const rawId = plan.id;
  const id = typeof rawId === 'number' || typeof rawId === 'string' ? String(rawId) : '';
  const title = String(plan.title ?? plan.name ?? '').trim();
  if (!id || !title) return null;
  const metadata = plan.metadata && typeof plan.metadata === 'object'
    ? plan.metadata as Record<string, unknown>
    : {};

  return {
    id,
    title,
    status: String(plan.status ?? 'draft'),
    goal: String(plan.goal ?? metadata.goal ?? 'general').replace(/_/g, ' '),
    nasmPhase: typeof plan.nasmPhase === 'number' ? plan.nasmPhase : undefined,
    durationWeeks: typeof plan.durationWeeks === 'number' ? plan.durationWeeks : undefined,
    updatedAt: typeof plan.updatedAt === 'string' ? plan.updatedAt : undefined,
  };
};

const formatUpdated = (value?: string) => {
  if (!value) return 'Updated date unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Updated date unavailable';
  return `Updated ${parsed.toLocaleDateString()}`;
};

const ClientWorkoutPlansPanel: React.FC<ClientWorkoutPlansPanelProps> = ({ clientId, clientName }) => {
  const { authAxios } = useAuth() as {
    authAxios?: {
      get: (
        url: string,
        config?: { params?: Record<string, number> },
      ) => Promise<{ data?: { plans?: unknown[] } }>;
    };
  };
  const safeClientId = getNumericClientId(clientId);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(() => plans.filter((plan) => plan.status === 'active').length, [plans]);

  const loadPlans = useCallback(async () => {
    if (!authAxios || safeClientId === null) return;
    setLoading(true);
    setError(null);
    try {
      const response = await authAxios.get('/api/workout/plans', {
        params: { clientId: safeClientId },
      });
      const nextPlans = Array.isArray(response.data?.plans)
        ? response.data.plans
            .map((plan: unknown) => (
              plan && typeof plan === 'object'
                ? normalizePlan(plan as Record<string, unknown>)
                : null
            ))
            .filter((plan: PlanSummary | null): plan is PlanSummary => plan !== null)
        : [];
      setPlans(nextPlans);
    } catch {
      setError('Unable to load saved plans for this client.');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [authAxios, safeClientId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  if (safeClientId === null) {
    return <StateCard role="alert">Select a valid client before reviewing saved plans.</StateCard>;
  }

  return (
    <Panel aria-label={`${clientName || 'Client'} saved workout plans`}>
      <Header>
        <TitleBlock>
          <Eyebrow><ClipboardList size={14} /> Client plan library</Eyebrow>
          <Title>Training Plans</Title>
          <Hint>{activeCount} current plan{activeCount === 1 ? '' : 's'} for {clientName || `client #${safeClientId}`}</Hint>
        </TitleBlock>
        <RefreshButton type="button" onClick={loadPlans} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </RefreshButton>
      </Header>

      {loading ? (
        <StateCard role="status">Loading saved plans...</StateCard>
      ) : error ? (
        <StateCard role="alert">{error}</StateCard>
      ) : plans.length === 0 ? (
        <StateCard>No saved plans for this client yet. Use Plan Next to create the next block.</StateCard>
      ) : (
        <PlanGrid>
          {plans.map((plan) => {
            const active = plan.status === 'active';
            return (
              <PlanCard key={plan.id}>
                <StatusBadge $active={active}>
                  {active && <CheckCircle2 size={13} />}
                  {active ? 'Current' : plan.status}
                </StatusBadge>
                <PlanTitle>{plan.title}</PlanTitle>
                <Meta>
                  {plan.nasmPhase && <span>NASM phase {plan.nasmPhase}</span>}
                  {plan.durationWeeks && <span>{plan.durationWeeks} weeks</span>}
                  <span>{formatUpdated(plan.updatedAt)}</span>
                  <span>{plan.goal}</span>
                </Meta>
              </PlanCard>
            );
          })}
        </PlanGrid>
      )}
    </Panel>
  );
};

export default ClientWorkoutPlansPanel;
