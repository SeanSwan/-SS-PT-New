/**
 * CoachReviewNextResultCard.tsx
 * =============================
 * Workflow-oriented renderer for Coach intake queue and review-next commands.
 *
 * Converts queue scalars into a short operational card so the assistant points
 * Sean directly at the next review action without exposing transport field names.
 */
import styled from 'styled-components';
import { CheckCircle, ListChecks, ShieldCheck } from 'lucide-react';
import { CommandRouteAction } from './CommandRouteAction';
import {
  holdReasonFacts,
  numberValue,
  pendingDraftLabel,
  safeCommandActionLabel,
  safeCommandGateValue,
  safeCommandHint,
  safeHoldReasonLabel,
  statusLabel,
} from './CoachIntakeOperationalText.logic';

interface CoachReviewNextResultCardProps {
  command: string;
  result: Record<string, unknown>;
  message?: string;
}

const CardShell = styled.div`
  margin-top: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent),
      color-mix(in srgb, var(--swan-lavender, #4070C0) 10%, transparent)
    ),
    var(--bg-surface, #1A1A24);
`;

const CardTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0 12px;
`;

const StatusPill = styled.span<{ $tone?: 'gold' | 'purple' }>`
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 10px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid ${({ $tone }) =>
    $tone === 'gold'
      ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 36%, transparent)'
      : $tone === 'purple'
        ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent)'};
  color: ${({ $tone }) =>
    $tone === 'gold'
      ? 'var(--accent-luxury, #C6A84B)'
      : $tone === 'purple'
        ? 'var(--accent-secondary, #8B5CF6)'
        : 'var(--accent-primary, #60C0F0)'};
  background: ${({ $tone }) =>
    $tone === 'gold'
      ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 10%, transparent)'
      : $tone === 'purple'
        ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)'};
`;

const NextPanel = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-radius: 8px;
  padding: 10px;
  background: color-mix(in srgb, var(--bg-base, #030712) 44%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.5;
`;

const GateStrip = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 10px 0 0;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const GateTile = styled.div`
  min-height: 54px;
  border-radius: 8px;
  padding: 9px 10px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent);
`;

const GateLabel = styled.span`
  display: block;
  margin-bottom: 4px;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

const GateValue = styled.strong`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.35;
`;

const Hint = styled.p`
  margin: 10px 0 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.5;
`;

export function isCoachReviewNextCommand(command: string): boolean {
  return command === 'review_next_coach_intake'
    || command === 'view_coach_intake_queue'
    || command === 'review_next_plaud_intake'
    || command === 'view_plaud_intake_queue';
}

export function CoachReviewNextResultCard({
  command,
  result,
  message,
}: CoachReviewNextResultCardProps) {
  const actionable = numberValue(result.actionable);
  const readyReview = numberValue(result.readyReview);
  const needsClient = numberValue(result.needsClient);
  const pendingDrafts = numberValue(result.pendingDrafts);
  const nextStatus = statusLabel(result.nextQueueStatus);
  const blockingGate = safeCommandGateValue(result.nextBlockingGate);
  const nextAction = safeCommandActionLabel(result.nextActionLabel);
  const holdReasonLabel = safeHoldReasonLabel(result.nextHoldReasonLabel);
  const holdFacts = holdReasonFacts(result);
  const proposalType = statusLabel(result.nextLatestProposalType);
  const proposalStatus = statusLabel(result.nextLatestProposalStatus);
  const preparedDraftStatus = proposalType || proposalStatus
    ? `${proposalType || 'draft'}${proposalStatus ? ` - ${proposalStatus}` : ''}`
    : null;
  const surfaceLabel = command.includes('_plaud_') ? 'PLAUD' : 'Coach';
  const workspaceLabel = surfaceLabel === 'PLAUD' ? 'PLAUD workspace' : 'Coach intake workspace';
  const hasDirectNext = Boolean(result.nextKind || result.nextEntityId || result.reviewRoute);
  const hasActionableQueue = actionable > 0 || readyReview > 0 || needsClient > 0;
  const directTargetLabel = surfaceLabel === 'PLAUD' ? 'PLAUD review item' : 'Coach intake item';
  const title = hasDirectNext
    ? 'Next intake ready'
    : hasActionableQueue
      ? `${surfaceLabel} intake queue ready`
      : `No ${surfaceLabel} intake needs action`;
  const nextSummary = hasDirectNext && nextStatus
    ? `Next review target is ${nextStatus}.`
    : hasDirectNext
      ? `Open the selected ${directTargetLabel}.`
    : hasActionableQueue
      ? `Open the ${workspaceLabel} to continue the next actionable item.`
      : `Your ${surfaceLabel} intake queue is clear.`;
  const hint = safeCommandHint(result.commandHint);

  return (
    <CardShell>
      <CardTitle><CheckCircle size={16} aria-hidden="true" /> {title}</CardTitle>
      {message && <Hint>{message}</Hint>}
      <StatusRow aria-label={`${surfaceLabel} intake queue summary`}>
        <StatusPill>{actionable} actionable</StatusPill>
        <StatusPill $tone="purple">{readyReview} ready</StatusPill>
        <StatusPill $tone="gold">{needsClient} needs client</StatusPill>
        {pendingDrafts > 0 && <StatusPill $tone="purple">{pendingDraftLabel(pendingDrafts)}</StatusPill>}
      </StatusRow>
      <NextPanel>
        <ListChecks size={15} aria-hidden="true" />
        <span>{nextSummary}</span>
      </NextPanel>
      {(blockingGate || nextAction || preparedDraftStatus) && (
        <GateStrip aria-label="Next intake gate, action, and draft status">
          {blockingGate && (
            <GateTile>
              <GateLabel>Blocking gate</GateLabel>
              <GateValue>{blockingGate}</GateValue>
            </GateTile>
          )}
          {nextAction && (
            <GateTile>
              <GateLabel>Next action</GateLabel>
              <GateValue>{nextAction}</GateValue>
            </GateTile>
          )}
          {preparedDraftStatus ? (
            <GateTile>
              <GateLabel>Prepared draft</GateLabel>
              <GateValue>{preparedDraftStatus}</GateValue>
            </GateTile>
          ) : null}
        </GateStrip>
      )}
      {holdReasonLabel && (
        <GateStrip aria-label="Next intake hold reason">
          <GateTile>
            <GateLabel>Hold reason</GateLabel>
            <GateValue>{holdReasonLabel}</GateValue>
          </GateTile>
          {holdFacts.length > 0 ? (
            <GateTile>
              <GateLabel>Hold facts</GateLabel>
              <GateValue>{holdFacts.join(' - ')}</GateValue>
            </GateTile>
          ) : null}
        </GateStrip>
      )}
      <Hint><ShieldCheck size={13} aria-hidden="true" /> Client, date, duplicate, and final write gates still require approval.</Hint>
      {hint && <Hint>{hint}</Hint>}
      <CommandRouteAction command={command} result={result} />
    </CardShell>
  );
}
