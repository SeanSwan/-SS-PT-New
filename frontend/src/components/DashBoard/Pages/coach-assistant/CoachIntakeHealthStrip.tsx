/**
 * CoachIntakeHealthStrip.tsx
 * ==========================
 * PII-safe operator health snapshot for Swan Coach intake.
 */
import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import type {
  CoachIntakeHealth,
  CoachIntakeQueueScope,
  CoachIntakeRetention,
  CoachIntakeRetentionPurgePlan as RetentionPurgePlan,
} from '../../../../services/coachIntakeService';
import { CoachIntakeRetentionCandidates } from './CoachIntakeRetentionCandidates';
import { CoachIntakeRetentionPurgePlan } from './CoachIntakeRetentionPurgePlan';
import { safeOperatorActionLabel } from './CoachIntakeOperationalText.logic';
import {
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
  onScopeChange?: (scope: CoachIntakeQueueScope) => void;
}

type HealthTone = 'healthy' | 'attention' | 'degraded' | 'unavailable';

function statusLabel(status?: CoachIntakeHealth['status'] | null): string {
  const safeStatus = String(status || '').trim();
  if (!safeStatus) return 'Healthy';
  return safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);
}

function normalizeHealthStatus(health: CoachIntakeHealth): HealthTone {
  const rawStatus = String(health.status || '').trim();
  if (['healthy', 'attention', 'degraded', 'unavailable'].includes(rawStatus)) {
    return rawStatus as HealthTone;
  }
  return (health as { healthy?: boolean }).healthy === false ? 'attention' : 'healthy';
}

function countValue(counts: CoachIntakeHealth['counts'] | undefined | null, key: string, fallbackKey?: string): number {
  const rawCounts = (counts || {}) as unknown as Record<string, unknown>;
  const rawValue = rawCounts[key] ?? (fallbackKey ? rawCounts[fallbackKey] : undefined) ?? 0;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : 0;
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
  onScopeChange,
}: CoachIntakeHealthStripProps): JSX.Element | null {
  if (!health) return null;

  const counts = health.counts;
  const healthStatus = normalizeHealthStatus(health);
  const actionableCount = countValue(counts, 'actionable', 'active');
  const readyReviewCount = countValue(counts, 'readyReview', 'ready');
  const needsClientCount = countValue(counts, 'needsClient');
  const needsClarificationCount = countValue(counts, 'needsClarification', 'clarify');
  const duplicateHoldCount = countValue(counts, 'duplicateHold', 'duplicate');
  const failedCount = countValue(counts, 'failed');
  const stuckProcessingCount = countValue(counts, 'stuckProcessing', 'stuck');
  const healthActionLabel = safeOperatorActionLabel(
    health.nextOperatorAction?.key,
    health.nextOperatorAction?.label,
  );
  const attentionIcon = healthStatus === 'healthy'
    ? <ShieldCheck size={14} aria-hidden="true" />
    : <AlertTriangle size={14} aria-hidden="true" />;

  return (
    <HealthStrip aria-label="Coach intake health" $tone={healthStatus}>
      <HealthBlock>
        <HealthLabel>{attentionIcon} Queue health</HealthLabel>
        <HealthValue>{statusLabel(healthStatus)}</HealthValue>
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
          <CoachIntakeRetentionPurgePlan plan={retentionPurgePlan} />
        </HealthBlock>
      )}
      <HealthBlock>
        <HealthLabel><Activity size={14} aria-hidden="true" /> Workload</HealthLabel>
        <HealthStatRow>
          {scopeControl({ label: `${actionableCount} active`, ariaLabel: 'Show actionable intake items', scope: 'actionable', onScopeChange })}
          {scopeControl({ label: `${readyReviewCount} ready`, ariaLabel: 'Show ready intake drafts', scope: 'ready_review', onScopeChange })}
          {scopeControl({ label: `${needsClientCount} need client`, ariaLabel: 'Show client-resolution holds', scope: 'needs_client', tone: 'gold', onScopeChange })}
          {scopeControl({ label: `${needsClarificationCount} clarify`, ariaLabel: 'Show clarification holds', scope: 'needs_clarification', tone: 'gold', onScopeChange })}
          {scopeControl({ label: `${duplicateHoldCount} duplicate`, ariaLabel: 'Show duplicate-risk holds', scope: 'duplicate_hold', tone: duplicateHoldCount > 0 ? 'red' : 'cyan', onScopeChange })}
          {scopeControl({ label: `${failedCount} failed`, ariaLabel: 'Show failed intake items', scope: 'failed', tone: failedCount > 0 ? 'red' : 'cyan', onScopeChange })}
          {scopeControl({ label: `${stuckProcessingCount} stuck`, ariaLabel: 'Show processing intake items', scope: 'processing', tone: stuckProcessingCount > 0 ? 'red' : 'cyan', onScopeChange })}
        </HealthStatRow>
      </HealthBlock>
      <HealthBlock>
        <HealthLabel>Next operator action</HealthLabel>
        <HealthValue>{healthActionLabel}</HealthValue>
      </HealthBlock>
    </HealthStrip>
  );
}

export default CoachIntakeHealthStrip;
