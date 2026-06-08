/**
 * Client Hub saved-plan card list.
 * =================================
 *
 * BLUEPRINT: Saved workout-plan cards for Client Hub Plan Vault.
 * Parent: ClientWorkoutPlansPanel. Children: repeated plan cards with log/PDF
 * actions. Data is already normalized by ClientWorkoutPlansPanel.logic.
 *
 * Presents the selected client's saved workout-plan rows below the seven-slot
 * vault. Logging stays opt-in and only appears for the active primary arc.
 */

import React from 'react';
import { CheckCircle2, Dumbbell, ExternalLink } from 'lucide-react';
import { formatPlanUseLabel } from './ClientWorkoutPlanUse.logic';
import {
  formatClientPlanUpdated,
  type ClientPlanSummary,
  type ClientTodayAssignmentSummary,
} from './ClientWorkoutPlansPanel.logic';
import {
  Meta,
  PlanActionButton,
  PlanActions,
  PlanCard,
  PlanGrid,
  PlanTitle,
  StateCard,
  StatusBadge,
} from './ClientWorkoutPlansPanel.styles';

interface ClientWorkoutPlanCardsProps {
  openingPdfId: string | null;
  plans: ClientPlanSummary[];
  todayAssignment?: ClientTodayAssignmentSummary | null;
  onLogToday?: () => void;
  onOpenPdf: (plan: ClientPlanSummary) => void;
}

const statusText = (plan: ClientPlanSummary, active: boolean) => (
  plan.isPrimary ? 'Primary Arc' : active ? 'Current' : plan.status
);

const canLogTodayFromPlan = (
  plan: ClientPlanSummary,
  active: boolean,
  todayAssignment?: ClientTodayAssignmentSummary | null,
  onLogToday?: () => void,
) => Boolean(active && plan.isPrimary && onLogToday && todayAssignment?.isLoggable !== false);

const todayAssignmentForPlan = (
  plan: ClientPlanSummary,
  todayAssignment?: ClientTodayAssignmentSummary | null,
) => {
  const assignmentKey = todayAssignment?.assignmentKey || todayAssignment?.assignmentId || '';
  return assignmentKey.startsWith(`${plan.id}:`) ? todayAssignment : null;
};

const ClientWorkoutPlanCard: React.FC<{
  openingPdfId: string | null;
  plan: ClientPlanSummary;
  todayAssignment?: ClientTodayAssignmentSummary | null;
  onLogToday?: () => void;
  onOpenPdf: (plan: ClientPlanSummary) => void;
}> = ({ openingPdfId, plan, todayAssignment, onLogToday, onOpenPdf }) => {
  const active = plan.status === 'active';
  const matchedTodayAssignment = todayAssignmentForPlan(plan, todayAssignment);
  const todayCtaLabel = matchedTodayAssignment?.ctaLabel || 'Log Today';
  const todayCompleted = matchedTodayAssignment?.status === 'completed';
  const todayNotLoggable = Boolean(matchedTodayAssignment && matchedTodayAssignment.isLoggable === false);

  return (
    <PlanCard>
      <StatusBadge $active={active}>
        {active && <CheckCircle2 size={13} />}
        {statusText(plan, active)}
      </StatusBadge>
      <PlanTitle>{plan.name}</PlanTitle>
      <Meta>
        {plan.nasmPhase && <span>NASM phase {plan.nasmPhase}</span>}
        {plan.horizonLabel && <span>{plan.horizonLabel}</span>}
        {plan.durationWeeks && <span>{plan.durationWeeks} weeks</span>}
        <span>{formatClientPlanUpdated(plan.createdAt)}</span>
        <span>{formatPlanUseLabel(plan.assignmentDefault)}</span>
        <span>{plan.goal}</span>
      </Meta>
      <PlanActions>
        {todayCompleted ? (
          <StatusBadge $active aria-label={`Completed today from ${plan.name}`}>
            <CheckCircle2 size={13} /> {matchedTodayAssignment?.ctaLabel || 'Review Workout'}
          </StatusBadge>
        ) : todayNotLoggable ? (
          <StatusBadge $active={false} aria-label={`Not loggable today from ${plan.name}`}>
            {matchedTodayAssignment?.ctaLabel || 'Not Loggable'}
          </StatusBadge>
        ) : canLogTodayFromPlan(plan, active, matchedTodayAssignment, onLogToday) && (
          <PlanActionButton
            type="button"
            $variant="primary"
            aria-label={`${todayCtaLabel} from ${plan.name}`}
            onClick={onLogToday}
          >
            <Dumbbell size={14} /> {todayCtaLabel}
          </PlanActionButton>
        )}
        {plan.pdfFile && (
          <PlanActionButton
            type="button"
            disabled={openingPdfId === plan.id}
            aria-label={`Open ${plan.name} PDF`}
            onClick={() => onOpenPdf(plan)}
          >
            <ExternalLink size={14} /> {openingPdfId === plan.id ? 'Opening PDF' : 'Open PDF'}
          </PlanActionButton>
        )}
      </PlanActions>
    </PlanCard>
  );
};

const ClientWorkoutPlanCards: React.FC<ClientWorkoutPlanCardsProps> = ({
  openingPdfId,
  plans,
  todayAssignment,
  onLogToday,
  onOpenPdf,
}) => {
  if (plans.length === 0) {
    return <StateCard>No saved plans for this client yet. Use Plan Next to create the next block.</StateCard>;
  }

  return (
    <PlanGrid>
      {plans.map((plan) => (
        <ClientWorkoutPlanCard
          key={plan.id}
          openingPdfId={openingPdfId}
          plan={plan}
          todayAssignment={todayAssignment}
          onLogToday={onLogToday}
          onOpenPdf={onOpenPdf}
        />
      ))}
    </PlanGrid>
  );
};

export default ClientWorkoutPlanCards;
