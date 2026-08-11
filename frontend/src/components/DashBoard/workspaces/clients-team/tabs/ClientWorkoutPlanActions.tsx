/**
 * Explicit, non-nested staff controls for one saved client plan.
 * PDF state is revision-aware; terminal lifecycle actions require confirmation.
 */
import React, { useState } from 'react';
import {
  Archive, CheckCircle2, Eye, FileText, MoreHorizontal,
  Pause, Pencil, Play, RefreshCw,
} from 'lucide-react';
import { buildClientWorkoutPlanEditRoute } from '../clientDailyTrainingRoutes';
import ConfirmActionDialog from '../../../../Shared/ConfirmActionDialog';
import type { ClientHubAudience } from '../clientHubAudience';
import { describeClientWorkoutPlanPdfState } from './ClientWorkoutPlanPdfState.logic';
import type { ClientPlanSummary } from './ClientWorkoutPlansPanel.types';
import {
  ActionButton,
  ActionLink,
  ActionMenu,
  ActionMenuPanel,
  ActionRow,
  DetailGrid,
  MenuButton,
  PdfStateCard,
  PdfStateDetail,
  PdfStateLabel,
  PlanDetails,
} from './ClientWorkoutPlanActions.styles';

export type ClientPlanLifecycleAction = 'activate' | 'pause' | 'complete' | 'archive';

interface ClientWorkoutPlanActionsProps {
  audience?: ClientHubAudience;
  busyActionKey?: string | null;
  clientId?: number | string;
  expanded: boolean;
  openingPdfId: string | null;
  plan: ClientPlanSummary;
  onGeneratePdf?: (plan: ClientPlanSummary) => void;
  onLifecycle?: (plan: ClientPlanSummary, action: ClientPlanLifecycleAction) => void;
  onOpenPdf: (plan: ClientPlanSummary) => void;
  onToggleDetails: () => void;
}

const actionKey = (plan: ClientPlanSummary, action: string) => `${plan.id}:${action}`;
const isBusy = (busyActionKey: string | null | undefined, plan: ClientPlanSummary, action: string) => (
  busyActionKey === actionKey(plan, action)
);

const PlanDetailsDisclosure: React.FC<{
  expanded: boolean;
  pdfDetail: string;
  plan: ClientPlanSummary;
}> = ({ expanded, pdfDetail, plan }) => {
  if (!expanded) return null;
  return (
    <PlanDetails role="region" aria-label={`${plan.name} plan details`}>
      <DetailGrid>
        <div><dt>Revision</dt><dd>{plan.contentRevision ?? 1}</dd></div>
        <div><dt>Plan arc</dt><dd>{plan.horizonLabel || plan.horizonKey}</dd></div>
        <div><dt>Cursor</dt><dd>Week {plan.currentWeek ?? 1}, day {plan.currentDay ?? 1}</dd></div>
        <div><dt>Goal</dt><dd>{plan.goal || 'Not set'}</dd></div>
      </DetailGrid>
      <PdfStateDetail>{pdfDetail}</PdfStateDetail>
    </PlanDetails>
  );
};

// Copy for the two terminal transitions. Kept as data so the dialog and any
// future surface read the same wording instead of drifting apart.
const TERMINAL_COPY = {
  archive: {
    title: 'Archive plan?',
    confirmLabel: 'Archive plan',
    tone: 'danger' as const,
    message: (plan: ClientPlanSummary) =>
      `Archive ${plan.name}? The plan will leave the active library.`,
  },
  complete: {
    title: 'Mark plan complete?',
    confirmLabel: 'Mark complete',
    tone: 'warning' as const,
    message: (plan: ClientPlanSummary) =>
      `Mark ${plan.name} complete? This records a terminal lifecycle transition.`,
  },
};

const LifecycleActions: React.FC<Pick<ClientWorkoutPlanActionsProps,
  'busyActionKey' | 'onLifecycle' | 'plan'
>> = ({ busyActionKey, onLifecycle, plan }) => {
  if (!onLifecycle) return null;
  const active = plan.status.trim().toLowerCase() === 'active';
  const primaryAction: ClientPlanLifecycleAction = active ? 'pause' : 'activate';
  const primaryBusy = isBusy(busyActionKey, plan, primaryAction);
  const [pendingTerminal, setPendingTerminal] = useState<'complete' | 'archive' | null>(null);
  const requestTerminal = (action: 'complete' | 'archive') => setPendingTerminal(action);
  const copy = pendingTerminal ? TERMINAL_COPY[pendingTerminal] : null;

  return (
    <>
      {plan.status.toLowerCase() !== 'completed' && plan.status.toLowerCase() !== 'archived' && (
        <ActionButton
          type="button"
          $primary={!active}
          disabled={primaryBusy}
          aria-label={`${active ? 'Pause' : 'Activate'} ${plan.name}`}
          onClick={() => onLifecycle(plan, primaryAction)}
        >
          {active ? <Pause size={14} /> : <Play size={14} />}
          {primaryBusy ? 'Updating' : active ? 'Pause' : 'Activate'}
        </ActionButton>
      )}
      <ActionMenu>
        <summary aria-label={`More lifecycle actions for ${plan.name}`}>
          <MoreHorizontal size={14} /> More
        </summary>
        <ActionMenuPanel>
          {active && (
            <MenuButton type="button" onClick={() => requestTerminal('complete')}>
              <CheckCircle2 size={14} /> Mark complete
            </MenuButton>
          )}
          {plan.status.toLowerCase() !== 'archived' && (
            <MenuButton type="button" $danger onClick={() => requestTerminal('archive')}>
              <Archive size={14} /> Archive plan
            </MenuButton>
          )}
        </ActionMenuPanel>
      </ActionMenu>
      <ConfirmActionDialog
        open={pendingTerminal !== null}
        title={copy?.title ?? ''}
        message={copy ? copy.message(plan) : ''}
        confirmLabel={copy?.confirmLabel ?? ''}
        tone={copy?.tone ?? 'danger'}
        onCancel={() => setPendingTerminal(null)}
        onConfirm={() => {
          if (pendingTerminal) onLifecycle(plan, pendingTerminal);
          setPendingTerminal(null);
        }}
      />
    </>
  );
};

const ClientWorkoutPlanActions: React.FC<ClientWorkoutPlanActionsProps> = ({
  audience = 'admin',
  busyActionKey = null,
  clientId,
  expanded,
  openingPdfId,
  plan,
  onGeneratePdf,
  onLifecycle,
  onOpenPdf,
  onToggleDetails,
}) => {
  const pdfState = describeClientWorkoutPlanPdfState(plan);
  const editRoute = clientId === undefined
    ? null
    : buildClientWorkoutPlanEditRoute(clientId, plan.id, audience);
  const generating = isBusy(busyActionKey, plan, 'pdf') || !pdfState.canGenerate;

  return (
    <>
      <PdfStateCard $state={pdfState.key}>
        <PdfStateLabel>{pdfState.label}</PdfStateLabel>
        <PdfStateDetail>{pdfState.detail}</PdfStateDetail>
      </PdfStateCard>
      <ActionRow>
        <ActionButton
          type="button"
          aria-expanded={expanded}
          aria-label={`View ${plan.name} plan`}
          onClick={onToggleDetails}
        >
          <Eye size={14} /> View Plan
        </ActionButton>
        {editRoute && (
          <ActionLink href={editRoute} aria-label={`Edit ${plan.name} in Planner`}>
            <Pencil size={14} /> Edit in Planner
          </ActionLink>
        )}
        {plan.pdfFile && (
          <ActionButton
            type="button"
            disabled={openingPdfId === plan.id}
            aria-label={`View ${plan.name} PDF`}
            onClick={() => onOpenPdf(plan)}
          >
            <FileText size={14} /> {openingPdfId === plan.id ? 'Opening PDF' : 'View PDF'}
          </ActionButton>
        )}
        {onGeneratePdf && (
          <ActionButton
            type="button"
            disabled={generating}
            aria-label={`Generate current PDF for ${plan.name}`}
            onClick={() => onGeneratePdf(plan)}
          >
            <RefreshCw size={14} /> {generating ? 'Generating' : 'Generate Current PDF'}
          </ActionButton>
        )}
        <LifecycleActions busyActionKey={busyActionKey} onLifecycle={onLifecycle} plan={plan} />
      </ActionRow>
      <PlanDetailsDisclosure expanded={expanded} pdfDetail={pdfState.detail} plan={plan} />
    </>
  );
};

export default ClientWorkoutPlanActions;
