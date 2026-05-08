/**
 * CoachRetentionResultCard.tsx
 * ============================
 * Operator-grade renderer for Coach intake raw-artifact retention summaries.
 *
 * Shows scalar privacy/retention facts without exposing raw artifact rows,
 * transcripts, client names, or command transport keys.
 */
import styled from 'styled-components';
import { Archive, AlertTriangle, CheckCircle, ShieldCheck, TimerReset } from 'lucide-react';
import { CommandRouteAction } from './CommandRouteAction';

interface CoachRetentionResultCardProps {
  command: string;
  result: Record<string, unknown>;
  message?: string;
}

const ACTION_LABELS: Record<string, string> = {
  auth_required: 'Sign in again',
  schema_unavailable: 'Run Coach intake migration',
  review_purge_candidates: 'Review raw artifact purge candidates',
  review_stale_intake: 'Review stale intake artifacts',
  none: 'No retention work',
};

const CardShell = styled.div`
  margin-top: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-luxury, #C6A84B) 24%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-luxury, #C6A84B) 8%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)
    ),
    var(--bg-surface, #1A1A24);
`;

const CardTitle = styled.div<{ $tone: 'ok' | 'warn' | 'offline' }>`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 800;
  color: ${({ $tone }) =>
    $tone === 'ok'
      ? 'var(--accent-primary, #60C0F0)'
      : $tone === 'offline'
        ? 'var(--text-muted, rgba(224, 236, 244, 0.72))'
        : 'var(--accent-luxury, #C6A84B)'};
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
  gap: 8px;
  margin: 12px 0;
`;

const SummaryTile = styled.div<{ $tone?: 'gold' | 'purple' }>`
  min-height: 54px;
  border-radius: 8px;
  padding: 9px 10px;
  border: 1px solid ${({ $tone }) =>
    $tone === 'gold'
      ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 36%, transparent)'
      : $tone === 'purple'
        ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)'
        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)'};
  background: ${({ $tone }) =>
    $tone === 'gold'
      ? 'color-mix(in srgb, var(--accent-luxury, #C6A84B) 10%, transparent)'
      : $tone === 'purple'
        ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)'
        : 'color-mix(in srgb, var(--bg-elevated, #003080) 34%, transparent)'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
`;

const PolicyRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0;
`;

const PolicyPill = styled.span`
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
`;

const ActionPanel = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-luxury, #C6A84B) 22%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 44%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.5;
`;

const Hint = styled.p`
  margin: 10px 0 0;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.5;
`;

function numberValue(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function compactText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\r\n\t`\\]/g, ' ').trim();
  return text ? text.slice(0, 120) : null;
}

function actionLabel(value: unknown): string {
  const key = compactText(value)?.toLowerCase().replace(/[^a-z0-9_:\-]/g, '') || '';
  return ACTION_LABELS[key] || 'Review Coach intake retention';
}

function statusTone(status: string, purgeReady: number, reviewRequired: number): 'ok' | 'warn' | 'offline' {
  if (status === 'unavailable' || status === 'degraded') return 'offline';
  if (status === 'attention' || purgeReady > 0 || reviewRequired > 0) return 'warn';
  return 'ok';
}

function titleFor(tone: 'ok' | 'warn' | 'offline'): string {
  if (tone === 'warn') return 'Privacy retention needs review';
  if (tone === 'offline') return 'Privacy retention unavailable';
  return 'Privacy retention clear';
}

export function isCoachRetentionCommand(command: string): boolean {
  return command === 'view_coach_intake_retention';
}

export function CoachRetentionResultCard({
  command,
  result,
  message,
}: CoachRetentionResultCardProps) {
  const total = numberValue(result.totalWithRawArtifacts);
  const purgeReady = numberValue(result.purgeReady);
  const reviewRequired = numberValue(result.reviewRequired);
  const retained = numberValue(result.retained);
  const appliedHours = numberValue(result.appliedRawArtifactGraceHours);
  const failedDays = numberValue(result.failedRawArtifactGraceDays);
  const staleDays = numberValue(result.staleReviewQueueDays);
  const nextAction = actionLabel(result.nextActionKey);
  const hint = compactText(result.commandHint);
  const tone = statusTone(compactText(result.retentionStatus) || 'unavailable', purgeReady, reviewRequired);
  const TitleIcon = tone === 'ok' ? CheckCircle : tone === 'offline' ? AlertTriangle : ShieldCheck;

  return (
    <CardShell>
      <CardTitle $tone={tone}>
        <TitleIcon size={16} aria-hidden="true" /> {titleFor(tone)}
      </CardTitle>
      {message && <Hint>{message}</Hint>}
      <SummaryGrid aria-label="Coach intake retention summary">
        <SummaryTile>{total} raw artifacts</SummaryTile>
        <SummaryTile $tone={purgeReady > 0 ? 'gold' : undefined}>{purgeReady} purge ready</SummaryTile>
        <SummaryTile $tone={reviewRequired > 0 ? 'gold' : undefined}>{reviewRequired} review required</SummaryTile>
        <SummaryTile $tone="purple">{retained} retained</SummaryTile>
      </SummaryGrid>
      <PolicyRow aria-label="Retention policy windows">
        <PolicyPill><TimerReset size={13} aria-hidden="true" /> {appliedHours}h applied grace</PolicyPill>
        <PolicyPill><TimerReset size={13} aria-hidden="true" /> {failedDays}d failed grace</PolicyPill>
        <PolicyPill><Archive size={13} aria-hidden="true" /> {staleDays}d stale review</PolicyPill>
      </PolicyRow>
      <ActionPanel>
        <ShieldCheck size={15} aria-hidden="true" />
        <span>{nextAction}</span>
      </ActionPanel>
      <Hint>No purge job is enabled from this card; review candidates before turning on any destructive retention worker.</Hint>
      {hint && <Hint>{hint}</Hint>}
      <CommandRouteAction command={command} result={result} />
    </CardShell>
  );
}
