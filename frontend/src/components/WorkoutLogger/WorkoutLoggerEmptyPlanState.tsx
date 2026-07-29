/**
 * Blueprint: WorkoutLoggerEmptyPlanState
 * Parent: ActivePlanContextStrip (renders when the plan loader came back empty)
 * Purpose: C4b — the no-plan dead-end becomes a real state. Before this, every
 * empty outcome of `?loadPlan=today` was a transient toast + a bare "Add Your
 * First Exercise" button, indistinguishable from a deliberately blank logger.
 * Now the reason persists in-page with role-aware next moves (Ask Coach /
 * plan vault), and freestyle logging stays one gesture away below.
 */
import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { CalendarX2 } from 'lucide-react';
import { CS, withAlpha } from './WorkoutLoggerCS';

export type WorkoutLoggerPlanLoadOutcomeKind =
  | 'no_plan'
  | 'no_exercises_today'
  | 'assignment_changed'
  | 'not_loggable'
  | 'no_client';

export interface WorkoutLoggerPlanLoadOutcome {
  kind: WorkoutLoggerPlanLoadOutcomeKind;
  message: string;
}

const Panel = styled.section`
  display: flex;
  gap: 0.875rem;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
  background: ${withAlpha(CS.surfaceDark, 0.7)};
  border: 1px dashed ${withAlpha(CS.gaming, 0.3)};
  border-radius: 0.75rem;
  color: ${CS.text};
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
`;

const Title = styled.h3`
  margin: 0;
  font: 600 0.95rem 'Plus Jakarta Sans', sans-serif;
  color: ${CS.text};
`;

const Detail = styled.p`
  margin: 0;
  font-size: 0.8rem;
  color: ${CS.textMuted};
`;

const CtaRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.4rem;
`;

const CtaButton = styled.button`
  min-height: 44px;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid ${withAlpha(CS.gaming, 0.35)};
  background: ${withAlpha(CS.gaming, 0.1)};
  color: ${CS.text};
  font: 600 0.8rem 'Sora', sans-serif;
  cursor: pointer;

  &:hover { background: ${withAlpha(CS.gaming, 0.18)}; }
  &:focus-visible { outline: 2px solid ${CS.gaming}; outline-offset: 2px; }
`;

const TITLES: Record<WorkoutLoggerPlanLoadOutcomeKind, string> = {
  no_plan: 'No active plan yet',
  no_exercises_today: 'Nothing scheduled today',
  assignment_changed: "Today's assignment changed",
  not_loggable: 'This assignment is not loggable',
  no_client: 'No client selected',
};

interface WorkoutLoggerEmptyPlanStateProps {
  outcome: WorkoutLoggerPlanLoadOutcome;
  /** Client logging their own session → coach/vault CTAs make sense. */
  isClientSelfMode: boolean;
}

const WorkoutLoggerEmptyPlanState: React.FC<WorkoutLoggerEmptyPlanStateProps> = ({
  outcome,
  isClientSelfMode,
}) => {
  const navigate = useNavigate();
  return (
    <Panel role="status" aria-live="polite" data-testid="logger-empty-plan-state">
      <CalendarX2 size={22} aria-hidden="true" color={CS.textMuted} />
      <Body>
        <Title>{TITLES[outcome.kind]}</Title>
        <Detail>{outcome.message} You can still log freestyle — add exercises below and save as normal.</Detail>
        {isClientSelfMode && outcome.kind !== 'no_client' && (
          <CtaRow>
            <CtaButton type="button" onClick={() => navigate('/dashboard/client/coach-assistant')}>
              Ask Coach
            </CtaButton>
            <CtaButton type="button" onClick={() => navigate('/dashboard/client/workouts')}>
              My Workouts &amp; Plan Vault
            </CtaButton>
          </CtaRow>
        )}
      </Body>
    </Panel>
  );
};

export default WorkoutLoggerEmptyPlanState;
