/**
 * PlaudPendingReviewsList.tsx
 * ============================
 * Failsafe-resume surface: lists trainer's pending merge_requests so
 * they can recover after browser-close / power-outage / server restart.
 *
 * Phase 3 Slice 3.12 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md §5.5.
 *
 * Mobile-first responsive (Rule 24); 44px touch targets (Rule 2);
 * styled-components + Crystalline Swan tokens (Rules 1 + 6).
 *
 * Interactions:
 *   - Click "Open" on a 'completed' row → invokes onOpen(mergeRequestId)
 *     so parent loads detail + renders TranscriptReviewCard
 *   - Click "Discard" → optimistic remove + cipher purge
 *   - Failed merges show error_code + retry instruction
 *   - Processing rows show "in flight" pill (server may have stalled,
 *     but the staleMerge cron will sweep at 20min)
 */
import React from 'react';
import styled from 'styled-components';
import { RefreshCw, Trash2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { usePlaudPendingReviews } from '../../hooks/usePlaudPendingReviews';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;

  @media (min-width: 768px) {
    font-size: 1.125rem;
  }
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 44px;
  padding: 0 0.75rem;
  background: transparent;
  border: 1px solid rgba(96,192,240,0.3);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 150ms ease, box-shadow 150ms ease;

  &:hover { border-color: var(--accent-primary, #60C0F0); box-shadow: 0 0 14px rgba(96,192,240,0.2); }
  &:focus-visible { outline: 2px solid var(--glow-accent, #8B5CF6); outline-offset: 2px; }
`;

const Empty = styled.div`
  padding: 1.25rem 1rem;
  text-align: center;
  color: var(--text-secondary, rgba(224,236,244,0.7));
  font-size: 0.9rem;
  background: var(--surface-elevated, rgba(30,30,60,0.2));
  border: 1px dashed rgba(96,192,240,0.2);
  border-radius: 12px;
`;

const Row = styled.div<{ $statusColor: string }>`
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 0.75rem;
  padding: 0.875rem 0.875rem;
  background: var(--surface-elevated, rgba(30,30,60,0.3));
  border-left: 3px solid ${({ $statusColor }) => $statusColor};
  border-top: 1px solid rgba(96,192,240,0.18);
  border-right: 1px solid rgba(96,192,240,0.18);
  border-bottom: 1px solid rgba(96,192,240,0.18);
  border-radius: 12px;

  @media (min-width: 768px) {
    grid-template-columns: 28px 1fr auto;
    align-items: center;
  }
`;

const StatusIcon = styled.div`
  display: flex;
  align-items: flex-start;
  padding-top: 0.125rem;
`;

const Body = styled.div`
  min-width: 0;
`;

const TopLine = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const Meta = styled.div`
  margin-top: 0.25rem;
  font-size: 0.78rem;
  color: var(--text-secondary, rgba(224,236,244,0.7));
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Pill = styled.span<{ $tone: 'cyan' | 'gold' | 'red' | 'purple' }>`
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 999px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: ${({ $tone }) => {
    if ($tone === 'gold') return 'rgba(198,168,75,0.2)';
    if ($tone === 'red') return 'rgba(239,68,68,0.18)';
    if ($tone === 'purple') return 'rgba(139,92,246,0.2)';
    return 'rgba(96,192,240,0.18)';
  }};
  color: ${({ $tone }) => {
    if ($tone === 'red') return 'rgba(252,165,165,1)';
    if ($tone === 'gold') return '#E5C97E';
    if ($tone === 'purple') return '#C4B5FD';
    return 'var(--text-primary, #E0ECF4)';
  }};
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.625rem;

  @media (min-width: 768px) {
    margin-top: 0;
  }
`;

const ActionButton = styled.button<{ $primary?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  height: 44px;
  padding: 0 0.875rem;
  background: ${({ $primary }) => ($primary ? 'var(--bg-primary, #002060)' : 'transparent')};
  color: var(--text-primary, #E0ECF4);
  border: 1px solid ${({ $primary }) => ($primary ? 'rgba(139,92,246,0.45)' : 'rgba(96,192,240,0.3)')};
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  box-shadow: ${({ $primary }) => ($primary ? '0 0 14px rgba(139,92,246,0.35)' : 'none')};
  transition: box-shadow 150ms ease, border-color 150ms ease;

  &:hover {
    box-shadow: ${({ $primary }) => ($primary ? '0 0 22px rgba(139,92,246,0.55)' : '0 0 12px rgba(239,68,68,0.18)')};
    border-color: ${({ $primary }) => ($primary ? 'rgba(96,192,240,0.6)' : 'rgba(239,68,68,0.4)')};
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

const ErrorBanner = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 10px;
  color: rgba(252,165,165,1);
  font-size: 0.85rem;
`;

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

function statusToTone(status: string): 'cyan' | 'gold' | 'red' | 'purple' {
  if (status === 'completed') return 'cyan';
  if (status === 'processing') return 'gold';
  if (status === 'failed' || status === 'expired') return 'red';
  if (status === 'approved') return 'purple';
  return 'cyan';
}

function statusToColor(status: string): string {
  if (status === 'completed') return 'rgba(96,192,240,0.7)';
  if (status === 'processing') return 'rgba(198,168,75,0.7)';
  if (status === 'failed' || status === 'expired') return 'rgba(239,68,68,0.7)';
  if (status === 'approved') return 'rgba(139,92,246,0.7)';
  return 'rgba(96,192,240,0.5)';
}

function statusToIcon(status: string): JSX.Element {
  if (status === 'completed') return <CheckCircle2 size={20} aria-hidden="true" color="#60C0F0" />;
  if (status === 'processing') return <Clock size={20} aria-hidden="true" color="#C6A84B" />;
  if (status === 'failed' || status === 'expired') return <AlertTriangle size={20} aria-hidden="true" color="#FCA5A5" />;
  return <CheckCircle2 size={20} aria-hidden="true" color="#8B5CF6" />;
}

export interface PlaudPendingReviewsListProps {
  onOpen: (mergeRequestId: string) => void;
}

export function PlaudPendingReviewsList({ onOpen }: PlaudPendingReviewsListProps): JSX.Element {
  const { reviews, isLoading, error, refresh, discard } = usePlaudPendingReviews();

  return (
    <Wrap data-testid="plaud-pending-reviews">
      <HeaderRow>
        <Title>Pending PLAUD reviews</Title>
        <RefreshButton type="button" onClick={refresh} aria-label="Refresh pending reviews">
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </RefreshButton>
      </HeaderRow>

      {error ? (
        <ErrorBanner role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          {error.code}: {error.message}
        </ErrorBanner>
      ) : null}

      {isLoading && reviews.length === 0 ? (
        <Empty>Loading pending reviews…</Empty>
      ) : reviews.length === 0 ? (
        <Empty>No pending reviews. Merged workouts you haven't approved yet will appear here.</Empty>
      ) : (
        reviews.map((r) => (
          <Row key={r.mergeRequestId} $statusColor={statusToColor(r.status)}>
            <StatusIcon>{statusToIcon(r.status)}</StatusIcon>
            <Body>
              <TopLine>
                {r.clientName || `Client #${r.clientId}`}
                {r.parsedExerciseCount != null ? ` · ${r.parsedExerciseCount} exercises` : ''}
              </TopLine>
              <Meta>
                <Pill $tone={statusToTone(r.status)}>{r.status}</Pill>
                {r.errorCode ? <Pill $tone="red">{r.errorCode}</Pill> : null}
                {r.cipherPurged ? <Pill $tone="red">CIPHER PURGED</Pill> : null}
                {r.boundaryWarning?.warning ? <Pill $tone="gold">multi-client</Pill> : null}
                <span>{r.clipCount ?? '?'} clips</span>
                <span>· {formatRelative(r.completedAt || r.createdAt)}</span>
              </Meta>
              <Actions>
                {r.status === 'completed' && !r.cipherPurged ? (
                  <ActionButton type="button" $primary onClick={() => onOpen(r.mergeRequestId)}>
                    Open review
                  </ActionButton>
                ) : null}
                {r.status === 'failed' ? (
                  <ActionButton type="button" disabled aria-label="Interrupted merge — retry by re-uploading clips">
                    Interrupted
                  </ActionButton>
                ) : null}
                <ActionButton
                  type="button"
                  onClick={() => discard(r.mergeRequestId)}
                  aria-label={`Discard merge for ${r.clientName || `client ${r.clientId}`}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Discard
                </ActionButton>
              </Actions>
            </Body>
          </Row>
        ))
      )}
    </Wrap>
  );
}

export default PlaudPendingReviewsList;
