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
  isClientPlanActiveStatus,
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

const assignmentKeyFor = (assignment: ClientTodayAssignmentSummary) => {
  if (assignment.assignmentKey) return assignment.assignmentKey;
  if (assignment.assignmentId) return assignment.assignmentId;
  return '';
};

const isPrimaryLogPlan = (
  plan: ClientPlanSummary,
  active: boolean,
  onLogToday?: () => void,
) => {
  if (!active) return false;
  if (!plan.isPrimary) return false;
  return Boolean(onLogToday);
};

const isAssignmentLoggableForPlan = (
  todayAssignment?: ClientTodayAssignmentSummary | null,
  matchedTodayAssignment?: ClientTodayAssignmentSummary | null,
) => {
  if (!todayAssignment) return true;
  if (!matchedTodayAssignment) return false;
  return matchedTodayAssignment.isLoggable !== false;
};

const canLogTodayFromPlan = (
  plan: ClientPlanSummary,
  active: boolean,
  todayAssignment?: ClientTodayAssignmentSummary | null,
  matchedTodayAssignment?: ClientTodayAssignmentSummary | null,
  onLogToday?: () => void,
) => {
  if (!isPrimaryLogPlan(plan, active, onLogToday)) return false;
  return isAssignmentLoggableForPlan(todayAssignment, matchedTodayAssignment);
};

const todayAssignmentForPlan = (
  plan: ClientPlanSummary,
  todayAssignment?: ClientTodayAssignmentSummary | null,
) => {
  if (!todayAssignment) return null;
  const assignmentKey = assignmentKeyFor(todayAssignment);
  if (!assignmentKey) return todayAssignment;
  if (!assignmentKey.startsWith(`${plan.id}:`)) return null;
  return todayAssignment;
};

const ClientWorkoutPlanMeta: React.FC<{ plan: ClientPlanSummary }> = ({ plan }) => {
  const metaItems = [
    plan.nasmPhase ? `NASM phase ${plan.nasmPhase}` : null,
    plan.horizonLabel || null,
    plan.durationWeeks ? `${plan.durationWeeks} weeks` : null,
    formatClientPlanUpdated(plan.createdAt),
    formatPlanUseLabel(plan.assignmentDefault),
    plan.goal,
  ].filter((item): item is string => Boolean(item));

  return (
    <Meta>
      {metaItems.map((item) => <span key={item}>{item}</span>)}
    </Meta>
  );
};

const TodayAssignmentAction: React.FC<{
  active: boolean;
  matchedTodayAssignment: ClientTodayAssignmentSummary | null;
  onLogToday?: () => void;
  plan: ClientPlanSummary;
  todayAssignment?: ClientTodayAssignmentSummary | null;
}> = ({ active, matchedTodayAssignment, onLogToday, plan, todayAssignment }) => {
  const matchedAction = renderMatchedAssignmentAction(matchedTodayAssignment, plan);
  if (matchedAction) return matchedAction;
  return renderLogTodayAction({ active, matchedTodayAssignment, onLogToday, plan, todayAssignment });
};

const renderMatchedAssignmentAction = (
  assignment: ClientTodayAssignmentSummary | null,
  plan: ClientPlanSummary,
) => {
  if (!assignment) return null;

  if (assignment.status === 'completed') {
    return (
      <StatusBadge $active aria-label={`Completed today from ${plan.name}`}>
        <CheckCircle2 size={13} /> {assignment.ctaLabel || 'Review Workout'}
      </StatusBadge>
    );
  }

  return renderBlockedAssignmentAction(assignment, plan);
};

const renderBlockedAssignmentAction = (
  assignment: ClientTodayAssignmentSummary,
  plan: ClientPlanSummary,
) => {
  if (assignment.isLoggable !== false) return null;

  return (
    <StatusBadge $active={false} aria-label={`Not loggable today from ${plan.name}`}>
      {assignment.ctaLabel || 'Not Loggable'}
    </StatusBadge>
  );
};

const LogTodayActionButton: React.FC<{
  label: string;
  onLogToday?: () => void;
  plan: ClientPlanSummary;
}> = ({ label, onLogToday, plan }) => (
  <PlanActionButton
    type="button"
    $variant="primary"
    aria-label={`${label} from ${plan.name}`}
    onClick={onLogToday}
  >
    <Dumbbell size={14} /> {label}
  </PlanActionButton>
);

const renderLogTodayAction = ({
  active,
  matchedTodayAssignment,
  onLogToday,
  plan,
  todayAssignment,
}: {
  active: boolean;
  matchedTodayAssignment: ClientTodayAssignmentSummary | null;
  onLogToday?: () => void;
  plan: ClientPlanSummary;
  todayAssignment?: ClientTodayAssignmentSummary | null;
}) => {
  if (!canLogTodayFromPlan(plan, active, todayAssignment, matchedTodayAssignment, onLogToday)) return null;

  return (
    <LogTodayActionButton
      label={matchedTodayAssignment?.ctaLabel || 'Log Today'}
      onLogToday={onLogToday}
      plan={plan}
    />
  );
};

const PlanPdfAction: React.FC<{
  openingPdfId: string | null;
  onOpenPdf: (plan: ClientPlanSummary) => void;
  plan: ClientPlanSummary;
}> = ({ openingPdfId, onOpenPdf, plan }) => {
  if (!plan.pdfFile) return null;

  return (
    <PlanActionButton
      type="button"
      disabled={openingPdfId === plan.id}
      aria-label={`Open ${plan.name} PDF`}
      onClick={() => onOpenPdf(plan)}
    >
      <ExternalLink size={14} /> {openingPdfId === plan.id ? 'Opening PDF' : 'Open PDF'}
    </PlanActionButton>
  );
};

const ClientWorkoutPlanCard: React.FC<{
  openingPdfId: string | null;
  plan: ClientPlanSummary;
  todayAssignment?: ClientTodayAssignmentSummary | null;
  onLogToday?: () => void;
  onOpenPdf: (plan: ClientPlanSummary) => void;
}> = ({ openingPdfId, plan, todayAssignment, onLogToday, onOpenPdf }) => {
  const active = isClientPlanActiveStatus(plan.status);
  const matchedTodayAssignment = todayAssignmentForPlan(plan, todayAssignment);

  return (
    <PlanCard>
      <StatusBadge $active={active}>
        {active && <CheckCircle2 size={13} />}
        {statusText(plan, active)}
      </StatusBadge>
      <PlanTitle>{plan.name}</PlanTitle>
      <ClientWorkoutPlanMeta plan={plan} />
      <PlanActions>
        <TodayAssignmentAction
          active={active}
          matchedTodayAssignment={matchedTodayAssignment}
          onLogToday={onLogToday}
          plan={plan}
          todayAssignment={todayAssignment}
        />
        <PlanPdfAction openingPdfId={openingPdfId} onOpenPdf={onOpenPdf} plan={plan} />
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
