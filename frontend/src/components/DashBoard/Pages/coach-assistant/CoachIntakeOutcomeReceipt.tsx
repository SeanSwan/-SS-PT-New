/**
 * CoachIntakeOutcomeReceipt.tsx
 * =============================
 * Read-only receipt shown after deterministic Coach proposal actions.
 */
import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import type { CoachActionProposal } from './SwanCoachTypes';
import {
  OutcomeContext,
  OutcomeDismiss,
  OutcomeReceiptWrap,
  OutcomeText,
} from './CoachIntakeOutcomeReceipt.styles';

export interface CoachIntakeOutcome {
  title: string;
  detail: string;
}

export function outcomeFromProposal(
  proposal: Pick<CoachActionProposal, 'status' | 'type'>,
  advanced: boolean,
): CoachIntakeOutcome {
  const status = String(proposal.status || '').toUpperCase();
  const actionDetail = advanced
    ? 'Advanced to the next actionable intake.'
    : 'Queue refreshed; no next actionable intake was found.';

  if (status === 'APPLIED' && proposal.type === 'workout_log') {
    return { title: 'Workout log applied', detail: actionDetail };
  }
  if (status === 'APPLIED') return { title: 'Draft applied', detail: actionDetail };
  if (status === 'REJECTED') return { title: 'Proposal rejected', detail: actionDetail };
  if (proposal.type === 'clarification' && status === 'APPROVED') {
    return { title: 'Clarification recorded', detail: actionDetail };
  }
  return { title: 'Draft action recorded', detail: actionDetail };
}

interface CoachIntakeOutcomeReceiptProps {
  outcome: CoachIntakeOutcome;
  activeTargetLabel?: string | null;
  onDismiss: () => void;
}

export function CoachIntakeOutcomeReceipt({
  outcome,
  activeTargetLabel = null,
  onDismiss,
}: CoachIntakeOutcomeReceiptProps): JSX.Element {
  const receiptRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const receipt = receiptRef.current;
    if (!receipt) return undefined;
    const timer = window.setTimeout(() => {
      if (typeof receipt.scrollIntoView === 'function') {
        receipt.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      receipt.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [outcome]);

  return (
    <OutcomeReceiptWrap ref={receiptRef} role="status" aria-live="polite" tabIndex={-1}>
      <OutcomeText>
        <strong><CheckCircle2 size={14} aria-hidden="true" /> {outcome.title}</strong>
        <span>{outcome.detail}</span>
        {activeTargetLabel ? <OutcomeContext>Active intake: {activeTargetLabel}</OutcomeContext> : null}
      </OutcomeText>
      <OutcomeDismiss type="button" onClick={onDismiss}>
        <X size={14} aria-hidden="true" />
        Dismiss
      </OutcomeDismiss>
    </OutcomeReceiptWrap>
  );
}

export default CoachIntakeOutcomeReceipt;
