/**
 * CoachIntakeHealthStrip.tsx
 * ==========================
 * PII-safe operator health snapshot for Swan Coach intake.
 */
import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { CoachIntakeHealth } from '../../../../services/coachIntakeService';
import {
  HealthBlock,
  HealthLabel,
  HealthPill,
  HealthStatRow,
  HealthStrip,
  HealthValue,
} from './CoachIntakeHealthStrip.styles';

interface CoachIntakeHealthStripProps {
  health?: CoachIntakeHealth | null;
}

function statusLabel(status: CoachIntakeHealth['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function CoachIntakeHealthStrip({ health }: CoachIntakeHealthStripProps): JSX.Element | null {
  if (!health) return null;

  const counts = health.counts;
  const attentionIcon = health.status === 'healthy'
    ? <ShieldCheck size={14} aria-hidden="true" />
    : <AlertTriangle size={14} aria-hidden="true" />;

  return (
    <HealthStrip aria-label="Coach intake health" $tone={health.status}>
      <HealthBlock>
        <HealthLabel>{attentionIcon} Queue health</HealthLabel>
        <HealthValue>{statusLabel(health.status)}</HealthValue>
      </HealthBlock>
      <HealthBlock>
        <HealthLabel><Activity size={14} aria-hidden="true" /> Workload</HealthLabel>
        <HealthStatRow>
          <HealthPill>{counts.actionable} active</HealthPill>
          <HealthPill>{counts.readyReview} ready</HealthPill>
          <HealthPill $tone="gold">{counts.needsClient} need client</HealthPill>
          <HealthPill $tone={counts.failed > 0 ? 'red' : 'cyan'}>{counts.failed} failed</HealthPill>
          <HealthPill $tone={counts.stuckProcessing > 0 ? 'red' : 'cyan'}>{counts.stuckProcessing} stuck</HealthPill>
        </HealthStatRow>
      </HealthBlock>
      <HealthBlock>
        <HealthLabel>Next operator action</HealthLabel>
        <HealthValue>{health.nextOperatorAction.label}</HealthValue>
      </HealthBlock>
    </HealthStrip>
  );
}

export default CoachIntakeHealthStrip;
