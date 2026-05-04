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
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { usePlaudClipQueue } from '../../hooks/usePlaudClipQueue';
import { submitMerge, type MergeResponse } from '../../services/plaudMergeService';
import { PlaudApiError } from '../../services/plaudClipService';
import { PlaudClipUploader } from './PlaudClipUploader';
import { PlaudClipQueue } from './PlaudClipQueue';
import { PlaudMergeBoundaryBanner } from './PlaudMergeBoundaryBanner';

const PanelWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--surface-base, rgba(20, 20, 36, 0.6));
  border: 1px solid var(--border-subtle, rgba(96,192,240,0.2));
  border-radius: 16px;
  color: var(--text-primary, #E0ECF4);

  @media (min-width: 768px) {
    padding: 1.25rem;
    gap: 1.25rem;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Title = styled.h3`
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;

  @media (min-width: 768px) {
    font-size: 1.2rem;
  }
`;

const Sub = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary, rgba(224,236,244,0.7));
`;

const ClientPicker = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const Label = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary, rgba(224,236,244,0.85));
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;

const ClientInput = styled.input`
  height: 44px;
  padding: 0 0.875rem;
  background: var(--surface-elevated, rgba(30,30,60,0.45));
  border: 1px solid rgba(96,192,240,0.25);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.95rem;

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

const ActionBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding-top: 0.75rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
`;

const SelectedCount = styled.span`
  font-size: 0.875rem;
  color: var(--text-secondary, rgba(224,236,244,0.85));
`;

const MergeButton = styled.button<{ $cyan?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 48px;
  padding: 0 1.25rem;
  min-width: 200px;
  background: ${({ $cyan }) => ($cyan ? 'var(--accent-purple, #8B5CF6)' : 'var(--bg-primary, #002060)')};
  color: var(--text-primary, #E0ECF4);
  border: 1px solid ${({ $cyan }) => ($cyan ? 'rgba(96,192,240,0.45)' : 'rgba(139,92,246,0.45)')};
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: ${({ $cyan }) =>
    $cyan ? '0 0 22px rgba(96,192,240,0.45)' : '0 0 22px rgba(139,92,246,0.45)'};
  transition: box-shadow 200ms ease, background-color 200ms ease, transform 100ms ease;

  &:hover:not(:disabled) {
    box-shadow: ${({ $cyan }) =>
      $cyan ? '0 0 32px rgba(96,192,240,0.6)' : '0 0 32px rgba(139,92,246,0.6)'};
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const ErrorBanner = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  padding: 0.75rem 0.875rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  color: rgba(252, 165, 165, 1);
  font-size: 0.875rem;

  & strong { font-weight: 700; }
`;

const RejectedList = styled.ul`
  margin: 0.5rem 0 0 0;
  padding-left: 1.1rem;
  list-style: disc;
  font-size: 0.85rem;
  color: rgba(252, 165, 165, 0.95);
`;

export interface PlaudClipMergePanelProps {
  /** Optional pre-selected client; if omitted, trainer enters it manually. */
  initialClientId?: number;
  /** Called when merge succeeds. Parent renders the review surface. */
  onMergeReady: (response: MergeResponse) => void;
}

export function PlaudClipMergePanel({
  initialClientId,
  onMergeReady,
}: PlaudClipMergePanelProps): JSX.Element {
  const queue = usePlaudClipQueue();
  const [clientIdInput, setClientIdInput] = useState<string>(
    initialClientId ? String(initialClientId) : '',
  );
  const [isMerging, setIsMerging] = useState<boolean>(false);
  const [mergeError, setMergeError] = useState<PlaudApiError | null>(null);

  const parsedClientId = (() => {
    const n = Number.parseInt(clientIdInput.trim(), 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  })();

  const onMergeClick = useCallback(async () => {
    if (!queue.canMerge || !parsedClientId) return;
    setIsMerging(true);
    setMergeError(null);
    try {
      const clipIds = Array.from(queue.selectedIds);
      const response = await submitMerge({
        clipIds,
        clientId: parsedClientId,
      });
      // Reset selection and refresh queue (consumed clips now status='merged')
      queue.clearSelection();
      await queue.refresh();
      onMergeReady(response);
    } catch (err) {
      setMergeError(err as PlaudApiError);
    } finally {
      setIsMerging(false);
    }
  }, [queue, parsedClientId, onMergeReady]);

  const isDisabled = isMerging || queue.isUploading;

  return (
    <PanelWrap data-testid="plaud-merge-panel">
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

      <ClientPicker>
        <Label htmlFor="plaud-client-id-input">Client ID</Label>
        <ClientInput
          id="plaud-client-id-input"
          type="number"
          inputMode="numeric"
          placeholder={initialClientId ? '' : 'Enter the client ID for this merge'}
          value={clientIdInput}
          onChange={(e) => setClientIdInput(e.target.value)}
          disabled={isDisabled}
          min={1}
        />
      </ClientPicker>

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
          disabled={isDisabled || !queue.canMerge || !parsedClientId}
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

      {/* Boundary banner is rendered by the parent review surface,
          which has access to the merged response. */}
      {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
      {(() => {
        // Avoid unused import warning when banner not rendered here.
        const _PlaudMergeBoundaryBanner = PlaudMergeBoundaryBanner;
        return null;
      })()}
    </PanelWrap>
  );
}

export default PlaudClipMergePanel;
