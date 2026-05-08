/**
 * CoachProposalGateRail.tsx
 * =========================
 * Compact approval-boundary rail for Swan Coach proposal cards.
 */
import styled from 'styled-components';
import { DatabaseZap, FileCheck2, ShieldCheck } from 'lucide-react';
import type { CoachActionProposal } from './SwanCoachTypes';

const Rail = styled.div`
  margin-top: 12px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)
    ),
    color-mix(in srgb, var(--bg-base, #030712) 52%, transparent);
`;

const RailTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 850;
`;

const GateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(138px, 1fr));
  gap: 8px;
`;

const GatePill = styled.div`
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 9px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 78%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 760;
`;

function numberSummary(value: unknown): number {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function plural(count: number, singular: string, pluralLabel: string): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

export function CoachProposalGateRail({
  summary,
}: {
  summary: CoachActionProposal['summary'];
}) {
  const evidenceCount = numberSummary(summary.evidenceCount);
  const safetyFlagCount = numberSummary(summary.safetyFlagCount);

  return (
    <Rail aria-label="Coach proposal approval gates">
      <RailTitle><ShieldCheck size={14} aria-hidden="true" /> Approval gates</RailTitle>
      <GateGrid>
        <GatePill><ShieldCheck size={14} aria-hidden="true" /> Trainer approval required</GatePill>
        <GatePill><FileCheck2 size={14} aria-hidden="true" /> {plural(evidenceCount, 'evidence ref', 'evidence refs')}</GatePill>
        <GatePill><ShieldCheck size={14} aria-hidden="true" /> {plural(safetyFlagCount, 'safety flag', 'safety flags')}</GatePill>
        <GatePill><DatabaseZap size={14} aria-hidden="true" /> Deterministic writer</GatePill>
      </GateGrid>
    </Rail>
  );
}
