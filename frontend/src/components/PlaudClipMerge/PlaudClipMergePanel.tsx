/**
 * PlaudClipMergePanel.tsx
 * ========================
 * Orchestrator: uploader + queue + client picker + merge action +
 * review handoff.
 *
 * Phase 3 Slice 3.11 (2026-05-04). Plan: PHASE-3-PLAUD-MERGE-INGESTION-PLAN-v3-2026-05-04.md.
 *
 * State machine:
 *   queue       — uploader + queue + Merge button visible
 *   merging     — merge in flight, button shows progress
 *   review      — TranscriptReviewCard rendered with parsed workout
 *   error       — banner + retry
 *
 * Sticky-footer "Merge selected (N) for {clientName}" on mobile
 * (CLAUDE.md Rule 22 premium UX, Rule 24 responsive).
 */
import { useCallback, useState } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { usePlaudClipQueue } from '../../hooks/usePlaudClipQueue';
import { submitMerge, type MergeResponse } from '../../services/plaudMergeService';
import { PlaudApiError } from '../../services/plaudClipService';
import { PlaudClientResolver, type PlaudResolvedClient } from './PlaudClientResolver';
import { PlaudClipUploader } from './PlaudClipUploader';
import { PlaudClipQueue } from './PlaudClipQueue';
import {
  ActionBar,
  ErrorBanner,
  MergeButton,
  PanelWrap,
  RejectedList,
  SectionHeader,
  SelectedCount,
  Sub,
  Title,
} from './PlaudClipMergePanel.styles';

export interface PlaudClipMergePanelProps {
  /** Optional pre-selected client; if omitted, trainer enters it manually. */
  initialClientId?: number;
  /** Optional display name for the pre-selected client context. */
  initialClientName?: string;
  /** Prevents changing the client when mounted from a selected-client surface. */
  lockClientId?: boolean;
  /** Called when merge succeeds. Parent renders the review surface. */
  onMergeReady: (response: MergeResponse, context: PlaudMergeReadyContext) => void;
}

export interface PlaudMergeReadyContext {
  clientId: number;
  clientName?: string;
}

export function PlaudClipMergePanel({
  initialClientId,
  initialClientName,
  lockClientId = false,
  onMergeReady,
}: PlaudClipMergePanelProps): JSX.Element {
  const queue = usePlaudClipQueue();
  const [resolvedClient, setResolvedClient] = useState<PlaudResolvedClient | null>(null);
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [mergeError, setMergeError] = useState<PlaudApiError | null>(null);

  const onMergeClick = useCallback(async () => {
    if (!queue.canMerge || !resolvedClient) return;
    setIsMerging(true);
    setMergeError(null);
    try {
      const response = await submitMerge({
        clipIds: queue.selectedClipIdsInTimelineOrder,
        clientId: resolvedClient.id,
        orderMode: 'uploaded_at_asc',
      });
      // Reset selection and refresh queue (consumed clips now status='merged')
      queue.clearSelection();
      await queue.refresh();
      onMergeReady(response, { clientId: resolvedClient.id, clientName: resolvedClient.fullName });
    } catch (err) {
      setMergeError(err as PlaudApiError);
    } finally {
      setIsMerging(false);
    }
  }, [queue, resolvedClient, onMergeReady]);

  const isDisabled = isMerging || queue.isUploading;

  return (
    <PanelWrap data-testid="plaud-merge-panel" tabIndex={-1} aria-label="PLAUD audio merge panel">
      <SectionHeader>
        <Title>PLAUD merge</Title>
        <Sub>Upload session clips, pick the ones for this client, click merge.</Sub>
      </SectionHeader>

      <PlaudClipUploader
        isUploading={queue.isUploading}
        disabled={isDisabled}
        onFiles={queue.upload}
      />

      {queue.uploadError ? (
        <ErrorBanner role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>{queue.uploadError.code}:</strong> {queue.uploadError.message}
          </div>
        </ErrorBanner>
      ) : null}

      {queue.rejectedClips.length > 0 ? (
        <ErrorBanner role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>{queue.rejectedClips.length} file(s) rejected</strong>
            <RejectedList>
              {queue.rejectedClips.map((r, idx) => (
                <li key={`${r.filename}-${idx}`}>
                  <strong>{r.filename}:</strong> {r.code} — {r.message}
                </li>
              ))}
            </RejectedList>
          </div>
        </ErrorBanner>
      ) : null}

      <PlaudClipQueue
        clips={queue.clips}
        selectedIds={queue.selectedIds}
        onToggleSelect={queue.toggleSelect}
        onDelete={queue.removeClip}
        isLoading={queue.isLoading}
      />

      {queue.timeline.hasLargeGap ? (
        <ErrorBanner role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>Chronology check:</strong> selected clips have a {queue.timeline.maxGapMinutes}-minute gap.
            Merge will run in upload-time order; split this into separate merges if these clips came from different sessions.
          </div>
        </ErrorBanner>
      ) : null}

      <PlaudClientResolver
        initialClientId={initialClientId}
        initialClientName={initialClientName}
        disabled={isDisabled}
        locked={lockClientId}
        onClientResolved={setResolvedClient}
      />

      <ActionBar>
        <SelectedCount aria-live="polite">
          {queue.selectedCount === 0
            ? 'Select 2-5 clips to merge.'
            : queue.canMerge
              ? `${queue.selectedCount} selected — ready to merge.`
              : `${queue.selectedCount} selected (need 2-5).`}
        </SelectedCount>
        <MergeButton
          type="button"
          onClick={onMergeClick}
          disabled={isDisabled || !queue.canMerge || !resolvedClient}
          aria-label={`Merge ${queue.selectedCount} selected clips`}
          $cyan
        >
          {isMerging ? 'Merging…' : `Merge selected (${queue.selectedCount})`}
          {!isMerging ? <ArrowRight size={18} aria-hidden="true" /> : null}
        </MergeButton>
      </ActionBar>

      {mergeError ? (
        <ErrorBanner role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div>
            <strong>{mergeError.code}:</strong> {mergeError.message}
          </div>
        </ErrorBanner>
      ) : null}

    </PanelWrap>
  );
}

export default PlaudClipMergePanel;
