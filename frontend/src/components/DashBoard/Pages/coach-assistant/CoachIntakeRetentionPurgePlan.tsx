/**
 * CoachIntakeRetentionPurgePlan.tsx
 * =================================
 * PII-safe dry-run status for Coach intake raw artifact cleanup.
 */
import styled from 'styled-components';
import { ShieldCheck } from 'lucide-react';
import type { CoachIntakeRetentionPurgePlan as PurgePlan } from '../../../../services/coachIntakeService';
import { HealthPill, HealthStatRow } from './CoachIntakeHealthStrip.styles';

const PurgePlanWrap = styled.div`
  display: grid;
  gap: 6px;
  margin-top: 8px;
`;

const PurgePlanTitle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 800;
`;

function cleanupLabel(plan: PurgePlan): string {
  if (!plan.schemaReady) return 'Cleanup unavailable';
  return plan.enabled ? 'Cleanup enabled' : 'Cleanup disabled';
}

function cleanupTone(plan: PurgePlan): 'cyan' | 'gold' | 'red' {
  if (!plan.schemaReady) return 'red';
  if (plan.enabled || plan.purgeReady > 0) return 'gold';
  return 'cyan';
}

function skippedReasonLabel(reason?: string | null): string | null {
  if (reason === 'disabled') return 'Dry run only';
  if (reason === 'no_purge_candidates') return 'No purge candidates';
  return null;
}

export function CoachIntakeRetentionPurgePlan({ plan }: { plan?: PurgePlan | null }): JSX.Element | null {
  if (!plan) return null;
  const reason = skippedReasonLabel(plan.skippedReason);

  return (
    <PurgePlanWrap aria-label="Retention cleanup plan">
      <PurgePlanTitle><ShieldCheck size={13} aria-hidden="true" /> Cleanup plan</PurgePlanTitle>
      <HealthStatRow>
        <HealthPill $tone={cleanupTone(plan)}>{cleanupLabel(plan)}</HealthPill>
        <HealthPill $tone={plan.purgeReady > 0 ? 'gold' : 'cyan'}>{plan.purgeReady} would purge</HealthPill>
        {reason && <HealthPill>{reason}</HealthPill>}
      </HealthStatRow>
    </PurgePlanWrap>
  );
}

export default CoachIntakeRetentionPurgePlan;
