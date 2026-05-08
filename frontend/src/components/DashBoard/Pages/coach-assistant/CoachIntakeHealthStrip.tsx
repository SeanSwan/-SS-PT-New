/**
 * CoachIntakeHealthStrip.tsx
 * ==========================
 * PII-safe operator health snapshot for Swan Coach intake.
 */
import { Activity, AlertTriangle, Brain, ShieldCheck } from 'lucide-react';
import type {
  CoachIntakeHealth,
  CoachIntakeQueueScope,
  CoachIntakeRetention,
  CoachIntakeRetentionPurgePlan as RetentionPurgePlan,
} from '../../../../services/coachIntakeService';
import { CoachIntakeRetentionCandidates } from './CoachIntakeRetentionCandidates';
import { CoachIntakeRetentionPurgePlan } from './CoachIntakeRetentionPurgePlan';
import {
  HealthActionButton,
  HealthBlock,
  HealthLabel,
  HealthPill,
  HealthScopeButton,
  HealthStatRow,
  HealthStrip,
  HealthValue,
} from './CoachIntakeHealthStrip.styles';

interface CoachIntakeHealthStripProps {
  health?: CoachIntakeHealth | null;
  retention?: CoachIntakeRetention | null;
  retentionPurgePlan?: RetentionPurgePlan | null;
  onCommandPrompt?: (message: string) => void;
  onScopeChange?: (scope: CoachIntakeQueueScope) => void;
}

function statusLabel(status: CoachIntakeHealth['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function promptForActionKey(key: string): string {
  if (key === 'review_ready_drafts' || key === 'review_next') return 'review next Coach intake';
  if (key === 'resolve_clients') return 'show my Coach intake queue';
  return 'show Coach intake health';
}

function scopeControl({
  label,
  ariaLabel,
  scope,
  tone,
  onScopeChange,
}: {
  label: string;
  ariaLabel: string;
  scope: CoachIntakeQueueScope;
  tone?: 'cyan' | 'gold' | 'red';
  onScopeChange?: (scope: CoachIntakeQueueScope) => void;
}): JSX.Element {
  if (!onScopeChange) return <HealthPill $tone={tone}>{label}</HealthPill>;
  return (
    <HealthScopeButton
      type="button"
      $tone={tone}
      aria-label={ariaLabel}
      onClick={() => onScopeChange(scope)}
    >
      {label}
    </HealthScopeButton>
  );
}

export function CoachIntakeHealthStrip({
  health,
  retention,
  retentionPurgePlan,
  onCommandPrompt,
  onScopeChange,
}: CoachIntakeHealthStripProps): JSX.Element | null {
  if (!health) return null;

  const counts = health.counts;
  const actionPrompt = promptForActionKey(health.nextOperatorAction.key);
  const attentionIcon = health.status === 'healthy'
    ? <ShieldCheck size={14} aria-hidden="true" />
    : <AlertTriangle size={14} aria-hidden="true" />;

  return (
    <HealthStrip aria-label="Coach intake health" $tone={health.status}>
      <HealthBlock>
        <HealthLabel>{attentionIcon} Queue health</HealthLabel>
        <HealthValue>{statusLabel(health.status)}</HealthValue>
      </HealthBlock>
      {retention && (
        <HealthBlock>
          <HealthLabel><ShieldCheck size={14} aria-hidden="true" /> Privacy retention</HealthLabel>
          <HealthStatRow>
            <HealthPill $tone={retention.summary.purgeReady > 0 ? 'gold' : 'cyan'}>
              {retention.summary.purgeReady} purge ready
            </HealthPill>
            <HealthPill $tone={retention.summary.reviewRequired > 0 ? 'gold' : 'cyan'}>
              {retention.summary.reviewRequired} review
            </HealthPill>
          </HealthStatRow>
          <CoachIntakeRetentionCandidates retention={retention} />
          <CoachIntakeRetentionPurgePlan plan={retentionPurgePlan} onCommandPrompt={onCommandPrompt} />
          {onCommandPrompt && (
            <HealthActionButton
              type="button"
              aria-label={`Ask Coach: ${retention.nextOperatorAction.label}`}
              onClick={() => onCommandPrompt('show Coach intake retention')}
            >
              <Brain size={14} aria-hidden="true" />
              Ask Coach
            </HealthActionButton>
          )}
        </HealthBlock>
      )}
      <HealthBlock>
        <HealthLabel><Activity size={14} aria-hidden="true" /> Workload</HealthLabel>
        <HealthStatRow>
          {scopeControl({ label: `${counts.actionable} active`, ariaLabel: 'Show actionable intake items', scope: 'actionable', onScopeChange })}
          {scopeControl({ label: `${counts.readyReview} ready`, ariaLabel: 'Show ready intake drafts', scope: 'ready_review', onScopeChange })}
          {scopeControl({ label: `${counts.needsClient} need client`, ariaLabel: 'Show client-resolution holds', scope: 'needs_client', tone: 'gold', onScopeChange })}
          {scopeControl({ label: `${counts.failed} failed`, ariaLabel: 'Show failed intake items', scope: 'failed', tone: counts.failed > 0 ? 'red' : 'cyan', onScopeChange })}
          {scopeControl({ label: `${counts.stuckProcessing} stuck`, ariaLabel: 'Show processing intake items', scope: 'processing', tone: counts.stuckProcessing > 0 ? 'red' : 'cyan', onScopeChange })}
        </HealthStatRow>
      </HealthBlock>
      <HealthBlock>
        <HealthLabel>Next operator action</HealthLabel>
        <HealthValue>{health.nextOperatorAction.label}</HealthValue>
        {onCommandPrompt && (
          <HealthActionButton
            type="button"
            aria-label={`Ask Coach: ${health.nextOperatorAction.label}`}
            onClick={() => onCommandPrompt(actionPrompt)}
          >
            <Brain size={14} aria-hidden="true" />
            Ask Coach
          </HealthActionButton>
        )}
      </HealthBlock>
    </HealthStrip>
  );
}

export default CoachIntakeHealthStrip;
