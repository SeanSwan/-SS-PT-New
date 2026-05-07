/**
 * CoachActionProposalSplitPlanPanel.tsx
 * =====================================
 * Readable split-plan candidate list for Swan Coach proposal review.
 */
import React from 'react';
import styled from 'styled-components';

const Panel = styled.div`
  margin-top: 12px;
  display: grid;
  gap: 10px;
`;

const SplitCard = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 72%, var(--primary, #002060));
`;

const SplitTitle = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 850;
`;

const SplitMeta = styled.div`
  margin-top: 6px;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1.5;
`;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function evidenceText(value: unknown) {
  if (!Array.isArray(value)) return null;
  const refs = value.map((item) => text(item)).filter(Boolean);
  return refs.length ? refs.join(', ') : null;
}

function redactedEvidenceText(value: unknown) {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return null;
  return `${count} evidence ref${count === 1 ? '' : 's'} withheld`;
}

function splitItems(detail: Record<string, unknown> | null) {
  const splitPlan = asRecord(detail?.splitPlan);
  const splits = splitPlan?.splits;
  return Array.isArray(splits) ? splits.map(asRecord).filter(Boolean) : [];
}

export function CoachActionProposalSplitPlanPanel({ detail }: { detail: Record<string, unknown> | null }) {
  const splits = splitItems(detail);
  if (!splits.length) return null;
  return (
    <Panel role="group" aria-label="Split plan workout candidates">
      {splits.map((split, index) => (
        <SplitCard key={`${text(split.title) || 'split'}-${index + 1}`}>
          <SplitTitle>{text(split.title) || `Workout candidate ${index + 1}`}</SplitTitle>
          <SplitMeta>
            {text(split.date) && <div>Date: {text(split.date)}</div>}
            {text(split.recordedAtStart) && <div>Starts: {text(split.recordedAtStart)}</div>}
            {text(split.recordedAtEnd) && <div>Ends: {text(split.recordedAtEnd)}</div>}
            {text(split.reason) && <div>Reason: {text(split.reason)}</div>}
            {evidenceText(split.evidenceRefs) && <div>Evidence: {evidenceText(split.evidenceRefs)}</div>}
            {redactedEvidenceText(split.redactedEvidenceRefCount) && (
              <div>{redactedEvidenceText(split.redactedEvidenceRefCount)}</div>
            )}
          </SplitMeta>
        </SplitCard>
      ))}
    </Panel>
  );
}

export default CoachActionProposalSplitPlanPanel;
