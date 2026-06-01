/**
 * CoachIntakeRetentionCandidates.tsx
 * ==================================
 * Sanitized read-only preview of raw-artifact retention candidates.
 */
import styled from 'styled-components';
import { ShieldCheck } from 'lucide-react';
import type { CoachIntakeRetention, CoachIntakeRetentionItem } from '../../../../services/coachIntakeService';

const SOURCE_LABELS: Record<string, string> = {
  audio_upload: 'Audio upload',
  chat_narrative: 'Long Coach note',
  pdf_transcript: 'PDF transcript',
  plaud_clip: 'PLAUD clip',
  transcript_file: 'Transcript file',
  typed_note: 'Typed note',
  voice_note: 'Voice note',
};

const STATUS_LABELS: Record<string, string> = {
  APPLIED: 'Applied',
  APPROVED: 'Approved',
  ARCHIVED: 'Archived',
  FAILED: 'Failed',
  READY_FOR_REVIEW: 'Ready for review',
  TRANSCRIBING: 'Transcribing',
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  purge_ready: 'Purge ready',
  review_required: 'Review required',
};

const REASON_LABELS: Record<string, string> = {
  archived_raw_artifact_grace_elapsed: 'Archived artifact grace elapsed',
  failed_raw_artifact_grace_elapsed: 'Failed artifact grace elapsed',
  stale_unapplied_raw_artifact: 'Stale unapplied artifact',
  within_retention_window: 'Inside retention window',
};

const CandidateWrap = styled.div`
  margin-top: 8px;
  display: grid;
  gap: 6px;
`;

const CandidateTitle = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 800;
`;

const CandidateRow = styled.div`
  display: grid;
  gap: 4px;
  padding: 8px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 24%, transparent);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 7%, transparent);
`;

const CandidateMeta = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Tag = styled.span<{ $tone?: 'gold' }>`
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 7px;
  border: 1px solid ${({ $tone }) =>
    $tone === 'gold'
      ? 'color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent)'};
  color: ${({ $tone }) => $tone === 'gold' ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)'};
  font-family: 'Fira Code', monospace;
  font-size: 9px;
  white-space: nowrap;
`;

const ReasonText = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  line-height: 1.35;
`;

function labelFromMap(value: unknown, labels: Record<string, string>, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  return labels[value] || fallback;
}

function keyText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function retentionCandidateKey(item: CoachIntakeRetentionItem): string {
  if (item.id) return item.id;
  const time = item.recordedAt || item.uploadedAt || item.updatedAt || item.archivedAt;
  return [
    'retention-candidate',
    keyText(item.sourceType, 'unknown-source'),
    keyText(item.status, 'unknown-status'),
    keyText(item.classification, 'unknown-classification'),
    keyText(item.reason, 'unknown-reason'),
    keyText(time, 'unknown-time'),
  ].join('-');
}

export function retentionCandidateItems(items: CoachIntakeRetentionItem[]) {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const baseKey = retentionCandidateKey(item);
    const occurrence = (seen.get(baseKey) || 0) + 1;
    seen.set(baseKey, occurrence);
    return { key: `${baseKey}-${occurrence}`, item };
  });
}

function relevantItems(items: CoachIntakeRetentionItem[] = []): CoachIntakeRetentionItem[] {
  return items
    .filter((item) => item.classification === 'purge_ready' || item.classification === 'review_required')
    .slice(0, 3);
}

export function CoachIntakeRetentionCandidates({ retention }: { retention?: CoachIntakeRetention | null }) {
  const items = relevantItems(retention?.items);
  if (items.length === 0) return null;

  return (
    <CandidateWrap aria-label="Retention review candidates">
      <CandidateTitle><ShieldCheck size={13} aria-hidden="true" /> Retention review candidates</CandidateTitle>
      {retentionCandidateItems(items).map((candidate) => {
        const { item } = candidate;
        const classification = labelFromMap(item.classification, CLASSIFICATION_LABELS, 'Review required');
        const source = labelFromMap(item.sourceType, SOURCE_LABELS, 'Unknown source');
        const status = labelFromMap(item.status, STATUS_LABELS, 'Unknown status');
        const reason = labelFromMap(item.reason, REASON_LABELS, 'Review required');
        return (
          <CandidateRow key={candidate.key}>
            <CandidateMeta>
              <Tag $tone={item.classification === 'purge_ready' ? 'gold' : undefined}>{classification}</Tag>
              <Tag>{source}</Tag>
              <Tag>{status}</Tag>
            </CandidateMeta>
            <ReasonText>{reason}</ReasonText>
          </CandidateRow>
        );
      })}
    </CandidateWrap>
  );
}

export default CoachIntakeRetentionCandidates;
