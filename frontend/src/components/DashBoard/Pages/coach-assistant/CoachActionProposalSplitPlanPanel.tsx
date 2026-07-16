/**
 * CoachActionProposalSplitPlanPanel.tsx
 * =====================================
 * Readable split-plan candidate list for Swan Coach proposal review.
 */

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

function isRecord(value: Record<string, unknown> | null): value is Record<string, unknown> {
  return value !== null;
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function evidenceText(value: unknown) {
  if (!Array.isArray(value)) return null;
  const refs = value.map((item) => text(item)).filter(Boolean);
  if (!refs.length) return null;
  return `${refs.length} evidence ref${refs.length === 1 ? '' : 's'} available`;
}

function redactedEvidenceText(value: unknown) {
  const count = Number(value || 0);
  if (!Number.isFinite(count) || count <= 0) return null;
  return `${count} evidence ref${count === 1 ? '' : 's'} withheld`;
}

function splitReasonText(value: unknown) {
  return text(value) ? 'Split boundary proposed for trainer review' : null;
}

function safeDateText(value: unknown) {
  const date = text(value);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

function safeTimestampText(value: unknown) {
  const timestamp = text(value);
  if (
    !timestamp
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(timestamp)
  ) {
    return null;
  }

  return Number.isNaN(Date.parse(timestamp)) ? null : timestamp;
}

export function splitCandidateKey(split: Record<string, unknown>) {
  const date = safeDateText(split.date) || 'unknown-date';
  const start = safeTimestampText(split.recordedAtStart) || 'unknown-start';
  const end = safeTimestampText(split.recordedAtEnd) || 'unknown-end';
  const redactedCount = Number(split.redactedEvidenceRefCount || 0);
  const count = Number.isFinite(redactedCount) && redactedCount > 0 ? redactedCount : 0;
  return ['split-candidate', date, start, end, count].join('-');
}

export function splitCandidateItems(splits: Record<string, unknown>[]) {
  const seen = new Map<string, number>();
  return splits.map((split, index) => {
    const baseKey = splitCandidateKey(split);
    const occurrence = (seen.get(baseKey) || 0) + 1;
    seen.set(baseKey, occurrence);
    return { key: `${baseKey}-${occurrence}`, label: index + 1, split };
  });
}

function splitItems(detail: Record<string, unknown> | null) {
  const splitPlan = asRecord(detail?.splitPlan);
  const splits = splitPlan?.splits;
  return Array.isArray(splits) ? splits.map(asRecord).filter(isRecord) : [];
}

function renderSplitCandidate(item: ReturnType<typeof splitCandidateItems>[number]) {
  const { split } = item;
  const date = safeDateText(split.date);
  const start = safeTimestampText(split.recordedAtStart);
  const end = safeTimestampText(split.recordedAtEnd);
  const reason = splitReasonText(split.reason);
  const evidence = evidenceText(split.evidenceRefs);
  const redactedEvidence = redactedEvidenceText(split.redactedEvidenceRefCount);

  return (
    <SplitCard key={item.key}>
      <SplitTitle>{`Workout candidate ${item.label}`}</SplitTitle>
      <SplitMeta>
        {date && <div>Date: {date}</div>}
        {start && <div>Starts: {start}</div>}
        {end && <div>Ends: {end}</div>}
        {reason && <div>Reason: {reason}</div>}
        {evidence && <div>Evidence: {evidence}</div>}
        {redactedEvidence && <div>{redactedEvidence}</div>}
      </SplitMeta>
    </SplitCard>
  );
}

export function CoachActionProposalSplitPlanPanel({ detail }: { detail: Record<string, unknown> | null }) {
  const splits = splitItems(detail);
  if (!splits.length) return null;
  return (
    <Panel role="group" aria-label="Split plan workout candidates">
      {splitCandidateItems(splits).map(renderSplitCandidate)}
    </Panel>
  );
}

export default CoachActionProposalSplitPlanPanel;
