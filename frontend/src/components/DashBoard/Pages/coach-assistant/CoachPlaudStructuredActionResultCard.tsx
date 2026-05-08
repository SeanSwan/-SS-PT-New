/**
 * CoachPlaudStructuredActionResultCard.tsx
 * ========================================
 * Result renderer for structured PLAUD Swan Coach action proposals.
 *
 * Shows operator-safe status and next-action metadata without exposing raw
 * transport keys or implying that the reviewed workout-log path already wrote.
 */
import styled from 'styled-components';
import { CheckCircle, FileCheck2, ShieldCheck } from 'lucide-react';
import { CommandRouteAction } from './CommandRouteAction';
import { safeCommandResultMessage } from './CoachIntakeOperationalText.logic';

const STRUCTURED_PLAUD_COMMANDS = new Set([
  'plaud_list_intake_items',
  'plaud_analyze_clip_set',
  'plaud_propose_clip_order',
  'plaud_group_session_candidates',
  'plaud_merge_candidate_group',
  'plaud_request_confirmation',
]);

const TITLE_BY_COMMAND: Record<string, string> = {
  plaud_list_intake_items: 'PLAUD intake listed',
  plaud_analyze_clip_set: 'PLAUD clip set analyzed',
  plaud_propose_clip_order: 'PLAUD action proposed',
  plaud_group_session_candidates: 'PLAUD session groups proposed',
  plaud_merge_candidate_group: 'PLAUD merge review prepared',
  plaud_request_confirmation: 'PLAUD confirmation requested',
};

const PROPOSAL_LABELS: Record<string, string> = {
  clip_order: 'Clip order',
  session_grouping: 'Session grouping',
  merge_candidate_group: 'Merge candidate group',
};

const CONFIRMATION_LABELS: Record<string, string> = {
  audio_order: 'Confirm audio order',
  client: 'Confirm client',
  date: 'Confirm date',
  duplicate: 'Confirm duplicate status',
  merge_boundary: 'Confirm merge boundary',
};

const CardShell = styled.div`
  margin-top: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)
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

const Hint = styled.p`
  margin: 0 0 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.5;
`;

const StatusRail = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const StatusPill = styled.span<{ $tone?: 'gold' | 'purple' }>`
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid ${({ $tone }) =>
    $tone === 'gold'
      ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 38%, transparent)'
      : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)'};
  background: ${({ $tone }) =>
    $tone === 'gold'
      ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 10%, transparent)'
      : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)'};
  color: ${({ $tone }) =>
    $tone === 'gold'
      ? 'var(--accent-luxury, #C6A84B)'
      : 'var(--accent-secondary, #8B5CF6)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
`;

const SummaryPill = styled.div`
  min-height: 44px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #003080) 34%, transparent);
  padding: 8px 10px;
  font-family: 'Sora', sans-serif;
  color: var(--text-primary, #E0ECF4);
  font-size: 12px;
  font-weight: 700;
`;

function numberValue(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function plural(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function labelFromMap(value: unknown, labels: Record<string, string>): string | null {
  return typeof value === 'string' ? labels[value] || null : null;
}

function writeStatusLabel(value: unknown): string | null {
  if (value === 'read_only') return 'Read only';
  if (value === 'not_written') return 'No workout log written';
  return null;
}

export function isPlaudStructuredActionCommand(command: string): boolean {
  return STRUCTURED_PLAUD_COMMANDS.has(command);
}

interface CoachPlaudStructuredActionResultCardProps {
  command: string;
  result: Record<string, unknown>;
  message?: string;
}

export function CoachPlaudStructuredActionResultCard({
  command,
  result,
  message,
}: CoachPlaudStructuredActionResultCardProps) {
  const title = TITLE_BY_COMMAND[command] || 'PLAUD action proposed';
  const safeMessage = safeCommandResultMessage(message);
  const writeLabel = writeStatusLabel(result.writeStatus);
  const proposalLabel = labelFromMap(result.proposalType, PROPOSAL_LABELS);
  const confirmationLabel = labelFromMap(result.confirmationKind || result.confirmationType, CONFIRMATION_LABELS);
  const totalAudioItems = numberValue(result.totalAudioItems);
  const totalIntakeItems = numberValue(result.total);
  const actionableItems = numberValue(result.actionable);
  const needsOrderingReview = numberValue(result.needsOrderingReview);
  const lowConfidence = numberValue(result.lowConfidence);
  const candidateGroupCount = numberValue(result.candidateGroupCount);
  const targetMatched = result.targetMatched === true;

  return (
    <CardShell>
      <CardTitle><CheckCircle size={16} aria-hidden="true" /> {title}</CardTitle>
      <Hint>{safeMessage || 'Swan Coach prepared operator-visible review metadata without changing workout data.'}</Hint>
      <StatusRail aria-label="PLAUD action safety status">
        {writeLabel && (
          <StatusPill $tone={result.writeStatus === 'not_written' ? 'gold' : undefined}>
            <ShieldCheck size={13} aria-hidden="true" />
            {writeLabel}
          </StatusPill>
        )}
        {result.requiresManualConfirmation === true && (
          <StatusPill $tone="gold">
            <FileCheck2 size={13} aria-hidden="true" />
            Manual confirmation required
          </StatusPill>
        )}
        {targetMatched && <StatusPill>Selected intake matched</StatusPill>}
      </StatusRail>
      <SummaryGrid aria-label="PLAUD structured action summary">
        {proposalLabel && <SummaryPill>{proposalLabel}</SummaryPill>}
        {confirmationLabel && <SummaryPill>{confirmationLabel}</SummaryPill>}
        {totalAudioItems > 0 && <SummaryPill>{plural(totalAudioItems, 'audio item')}</SummaryPill>}
        {totalIntakeItems > 0 && <SummaryPill>{plural(totalIntakeItems, 'intake item')}</SummaryPill>}
        {actionableItems > 0 && <SummaryPill>{actionableItems} actionable</SummaryPill>}
        {needsOrderingReview > 0 && <SummaryPill>{needsOrderingReview} needs order review</SummaryPill>}
        {lowConfidence > 0 && <SummaryPill>{lowConfidence} low confidence</SummaryPill>}
        {candidateGroupCount > 0 && <SummaryPill>{plural(candidateGroupCount, 'candidate group')}</SummaryPill>}
      </SummaryGrid>
      <CommandRouteAction command={command} result={result} />
    </CardShell>
  );
}
