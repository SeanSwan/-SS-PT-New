/**
 * Client Hub saved-plan card list.
 * =================================
 *
 * BLUEPRINT: Non-interactive plan containers with explicit staff commands.
 * Parent: ClientWorkoutPlansPanel. Cards expose today, view, edit, protected
 * PDF, recovery, and audited lifecycle controls without nested interactions.
 */

import React, { useState } from 'react';
import { CheckCircle2, Dumbbell } from 'lucide-react';
import type { ClientHubAudience } from '../clientHubAudience';
import ClientWorkoutPlanActions, {
  type ClientPlanLifecycleAction,
} from './ClientWorkoutPlanActions';
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
  audience?: ClientHubAudience;
  busyActionKey?: string | null;
  clientId?: number | string;
  openingPdfId: string | null;
  plans: ClientPlanSummary[];
  todayAssignment?: ClientTodayAssignmentSummary | null;
  onGeneratePdf?: (plan: ClientPlanSummary) => void;
  onLifecycle?: (plan: ClientPlanSummary, action: ClientPlanLifecycleAction) => void;
  onLogToday?: () => void;
  onOpenPdf: (plan: ClientPlanSummary) => void;
}

const statusText = (plan: ClientPlanSummary, active: boolean) => (
  plan.isPrimary ? 'Primary Arc' : active ? 'Current' : plan.status
);

const assignmentKeyFor = (assignment: ClientTodayAssignmentSummary) => (
  assignment.assignmentKey || assignment.assignmentId || ''
);

const todayAssignmentForPlan = (
  plan: ClientPlanSummary,
  todayAssignment?: ClientTodayAssignmentSummary | null,
) => {
  if (!todayAssignment) return null;
  const assignmentKey = assignmentKeyFor(todayAssignment);
  if (!assignmentKey) return todayAssignment;
  return assignmentKey.startsWith(`${plan.id}:`) ? todayAssignment : null;
};

const canLogTodayFromPlan = ({
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
  if (!active || !plan.isPrimary || !onLogToday) return false;
  if (!todayAssignment) return true;
  return Boolean(matchedTodayAssignment && matchedTodayAssignment.isLoggable !== false);
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

  return <Meta>{metaItems.map((item) => <span key={item}>{item}</span>)}</Meta>;
};

const CompletedAssignmentBadge: React.FC<{
  assignment: ClientTodayAssignmentSummary;
  plan: ClientPlanSummary;
}> = ({ assignment, plan }) => (
  <StatusBadge $active aria-label={`Completed today from ${plan.name}`}>
    <CheckCircle2 size={13} /> {assignment.ctaLabel || 'Review Workout'}
  </StatusBadge>
);

const BlockedAssignmentBadge: React.FC<{
  assignment: ClientTodayAssignmentSummary;
  plan: ClientPlanSummary;
}> = ({ assignment, plan }) => (
  <StatusBadge $active={false} aria-label={`Not loggable today from ${plan.name}`}>
    {assignment.ctaLabel || 'Not Loggable'}
  </StatusBadge>
);

const TodayAssignmentAction: React.FC<{
  active: boolean;
  matchedTodayAssignment: ClientTodayAssignmentSummary | null;
  onLogToday?: () => void;
  plan: ClientPlanSummary;
  todayAssignment?: ClientTodayAssignmentSummary | null;
}> = ({ active, matchedTodayAssignment, onLogToday, plan, todayAssignment }) => {
  if (matchedTodayAssignment?.status === 'completed') {
    return <CompletedAssignmentBadge assignment={matchedTodayAssignment} plan={plan} />;
  }
  if (matchedTodayAssignment?.isLoggable === false) {
    return <BlockedAssignmentBadge assignment={matchedTodayAssignment} plan={plan} />;
  }
  if (!canLogTodayFromPlan({
    active, matchedTodayAssignment, onLogToday, plan, todayAssignment,
  })) return null;

  const label = matchedTodayAssignment?.ctaLabel || 'Log Today';
  return (
    <PlanActionButton
      type="button"
      $variant="primary"
      aria-label={`${label} from ${plan.name}`}
      onClick={onLogToday}
    >
      <Dumbbell size={14} /> {label}
    </PlanActionButton>
  );
};

interface ClientWorkoutPlanCardProps extends Omit<ClientWorkoutPlanCardsProps, 'plans'> {
  expanded: boolean;
  onToggleDetails: () => void;
  plan: ClientPlanSummary;
}

const ClientWorkoutPlanCard: React.FC<ClientWorkoutPlanCardProps> = ({
  audience,
  busyActionKey,
  clientId,
  expanded,
  openingPdfId,
  plan,
  todayAssignment,
  onGeneratePdf,
  onLifecycle,
  onLogToday,
  onOpenPdf,
  onToggleDetails,
}) => {
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
      </PlanActions>
      <ClientWorkoutPlanActions
        audience={audience}
        busyActionKey={busyActionKey}
        clientId={clientId}
        expanded={expanded}
        openingPdfId={openingPdfId}
        plan={plan}
        onGeneratePdf={onGeneratePdf}
        onLifecycle={onLifecycle}
        onOpenPdf={onOpenPdf}
        onToggleDetails={onToggleDetails}
      />
    </PlanCard>
  );
};

const ClientWorkoutPlanCards: React.FC<ClientWorkoutPlanCardsProps> = ({
  audience = 'admin',
  busyActionKey = null,
  clientId,
  openingPdfId,
  plans,
  todayAssignment,
  onGeneratePdf,
  onLifecycle,
  onLogToday,
  onOpenPdf,
}) => {
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  if (plans.length === 0) {
    return <StateCard>No saved plans for this client yet. Use Plan Next to create the next block.</StateCard>;
  }

  return (
    <PlanGrid>
      {plans.map((plan) => (
        <ClientWorkoutPlanCard
          key={plan.id}
          audience={audience}
          busyActionKey={busyActionKey}
          clientId={clientId}
          expanded={expandedPlanId === plan.id}
          openingPdfId={openingPdfId}
          plan={plan}
          todayAssignment={todayAssignment}
          onGeneratePdf={onGeneratePdf}
          onLifecycle={onLifecycle}
          onLogToday={onLogToday}
          onOpenPdf={onOpenPdf}
          onToggleDetails={() => setExpandedPlanId((current) => (
            current === plan.id ? null : plan.id
          ))}
        />
      ))}
    </PlanGrid>
  );
};

export default ClientWorkoutPlanCards;