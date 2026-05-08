/**
 * CoachPreparedDraftResultCard.tsx
 * ================================
 * Workflow card for read-only prepared-draft command results.
 */
import styled from 'styled-components';
import { CheckCircle, FileCheck2, ShieldCheck } from 'lucide-react';
import { CommandRouteAction } from './CommandRouteAction';
import { safeCommandActionLabel, safeCommandHint } from './CoachIntakeOperationalText.logic';

interface CoachPreparedDraftResultCardProps {
  command: string;
  result: Record<string, unknown>;
  message?: string;
}

const CardShell = styled.div`
  margin-top: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 9%, transparent),
      color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)
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

const DraftPanel = styled.div`
  display: grid;
  gap: 10px;
  border-radius: 8px;
  padding: 10px;
  background: color-mix(in srgb, var(--bg-base, #030712) 44%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
`;

const DraftTitle = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.35;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const MetaPill = styled.span<{ $tone?: 'gold' | 'purple' }>`
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 10px;
  border: 1px solid ${({ $tone }) =>
    $tone === 'gold'
      ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 38%, transparent)'
      : $tone === 'purple'
        ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent)'};
  background: ${({ $tone }) =>
    $tone === 'gold'
      ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 10%, transparent)'
      : $tone === 'purple'
        ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)'};
  color: ${({ $tone }) =>
    $tone === 'gold'
      ? 'var(--accent-luxury, #C6A84B)'
      : $tone === 'purple'
        ? 'var(--accent-secondary, #8B5CF6)'
        : 'var(--accent-primary, #60C0F0)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
`;

const NextPanel = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 10px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.5;

  svg {
    flex: 0 0 auto;
    color: var(--accent-primary, #60C0F0);
  }
`;

const Hint = styled.p`
  margin: 10px 0 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.5;
`;

function boolValue(value: unknown): boolean {
  return value === true || value === 'true';
}

function compactText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const text = value.replace(/[\r\n\t`\\]/g, ' ').trim();
  return text ? text.slice(0, 96) : fallback;
}

function labelText(value: unknown, fallback: string): string {
  return compactText(value, fallback)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isPreparedDraftCommand(command: string): boolean {
  return command === 'view_coach_intake_prepared_draft';
}

export function CoachPreparedDraftResultCard({
  command,
  result,
  message,
}: CoachPreparedDraftResultCardProps) {
  const hasPreparedDraft = boolValue(result.hasPreparedDraft);
  const title = hasPreparedDraft ? 'Prepared draft waiting' : 'No prepared draft yet';
  const proposalTitle = compactText(result.proposalTitle, hasPreparedDraft ? 'Review Coach proposal' : 'Draft review not prepared');
  const proposalType = labelText(result.proposalType, 'Coach Draft');
  const proposalStatus = labelText(result.proposalStatus, hasPreparedDraft ? 'Pending' : 'Not Prepared');
  const nextAction = safeCommandActionLabel(result.nextActionLabel)
    || (hasPreparedDraft ? 'Review prepared draft' : 'Prepare draft review');
  const hint = safeCommandHint(result.commandHint);

  return (
    <CardShell>
      <CardTitle>
        <CheckCircle size={16} aria-hidden="true" />
        {title}
      </CardTitle>
      {message && <Hint>{message}</Hint>}
      <DraftPanel>
        <DraftTitle>{proposalTitle}</DraftTitle>
        <MetaRow aria-label="Prepared draft summary">
          <MetaPill>{proposalType}</MetaPill>
          <MetaPill $tone={hasPreparedDraft ? 'gold' : 'purple'}>{proposalStatus}</MetaPill>
        </MetaRow>
      </DraftPanel>
      <NextPanel aria-label="Prepared draft next action">
        <FileCheck2 size={15} aria-hidden="true" />
        <span>{nextAction}</span>
      </NextPanel>
      <Hint><ShieldCheck size={13} aria-hidden="true" /> Client, date, duplicate, and final writes still require approval.</Hint>
      {hint && <Hint>{hint}</Hint>}
      <CommandRouteAction command={command} result={result} />
    </CardShell>
  );
}

export default CoachPreparedDraftResultCard;
