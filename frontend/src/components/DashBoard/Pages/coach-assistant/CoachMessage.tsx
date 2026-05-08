/**
 * ┌─── SUB-COMPONENT: CoachMessage ────────────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Renders a single AI or user message bubble         │
 * │ WIREFRAME:                                                  │
 * │ ┌─────────────────────────────────┐                         │
 * │ │ Message text (16px mobile min)  │                         │
 * │ │ [🔊 Read] [📋 Copy]            │  ← AI messages only     │
 * │ │ 2:34 PM                         │                         │
 * │ └─────────────────────────────────┘                         │
 * │ Props: { message, onReadAloud }                             │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useCallback, useState } from 'react';
import styled from 'styled-components';
import {
  Volume2, Copy, Check, UserPlus, Dumbbell,
  FileAudio, AlertTriangle, X, Loader2, CheckCircle2,
  ListChecks,
} from 'lucide-react';
import {
  MessageBubbleAI,
  MessageBubbleUser,
  MessageTime,
  MessageActions,
  MessageActionBtn,
} from './SwanCoachStyles';
import MarkdownRenderer from './MarkdownRenderer';
import ProviderBadge from './ProviderBadge';
import { ConfirmationCard, ExecutionResultCard } from './CoachCommandCards';
import CoachActionProposalCard from './CoachActionProposalCard';
import type { CoachMessageData } from './SwanCoachTypes';
import { getLocalIsoDate } from '../../../../utils/localDate';
import {
  safeAudioRejectedSummary,
  safeCommandActionLabel,
  safeTranscriptFailureReason,
} from './CoachIntakeOperationalText.logic';

// ─────────────────────────────────────────────────────────────
// SECTION: Action Result Cards (client creation, workout import)
// ─────────────────────────────────────────────────────────────
const ActionCard = styled.div`
  margin-top: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 4%, var(--bg-surface, #1A1A24));
`;

const CardTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

const CardRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const CardLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  min-width: 100px;
`;

const CardValue = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  word-break: break-all;
`;

const ProgressBar = styled.div<{ $pct: number }>`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(96, 192, 240, 0.1);
  overflow: hidden;
  max-width: 120px;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $pct }) => $pct}%;
    background: var(--accent-secondary, #8B5CF6);
    border-radius: 3px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Transcript intake card styles (Swan-first transcript flow)
// ─────────────────────────────────────────────────────────────
const TranscriptCard = styled(ActionCard)`
  border-color: rgba(96, 192, 240, 0.25);
`;

const TranscriptDetails = styled.details`
  margin: 10px 0 6px;
  & > summary {
    cursor: pointer;
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    color: var(--accent-primary, #60C0F0);
    padding: 4px 0;
    list-style: none;
    user-select: none;
  }
  & > summary::-webkit-details-marker { display: none; }
  & > pre {
    margin-top: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.25);
    color: var(--text-secondary, rgba(224, 236, 244, 0.7));
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    line-height: 1.5;
    white-space: pre-wrap;
    max-height: 240px;
    overflow-y: auto;
  }
`;

const PainFlagBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  margin-right: 6px;
  margin-bottom: 4px;
  border-radius: 999px;
  background: rgba(201, 42, 84, 0.15);
  border: 1px solid rgba(201, 42, 84, 0.3);
  color: #ff8fa3;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
`;

const ConfidenceBadge = styled.span<{ $level: 'high' | 'medium' | 'low' }>`
  display: inline-block;
  padding: 2px 8px;
  margin-left: 8px;
  border-radius: 999px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  background: ${({ $level }) =>
    $level === 'high'
      ? 'rgba(16, 185, 129, 0.18)'
      : $level === 'medium'
        ? 'rgba(96, 192, 240, 0.18)'
        : 'rgba(201, 42, 84, 0.18)'};
  color: ${({ $level }) =>
    $level === 'high' ? '#10B981' : $level === 'medium' ? '#60C0F0' : '#ff8fa3'};
`;

const TranscriptActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
`;

const TranscriptBtn = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  min-height: 36px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: ${({ $primary, $danger }) =>
    $primary
      ? 'none'
      : $danger
        ? '1px solid rgba(201, 42, 84, 0.4)'
        : '1px solid rgba(255, 255, 255, 0.15)'};
  background: ${({ $primary, $danger }) =>
    $primary
      ? 'linear-gradient(135deg, #60C0F0, #50A0F0)'
      : $danger
        ? 'rgba(201, 42, 84, 0.12)'
        : 'rgba(255, 255, 255, 0.04)'};
  color: ${({ $primary, $danger }) =>
    $primary ? '#0A0A0F' : $danger ? '#ff8fa3' : '#e2e8f0'};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ReceiptActionButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--primary, #002060) 82%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, var(--bg-surface, #1A1A24))
    );
  color: var(--text-primary, #E0ECF4);
  padding: 0 14px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.72;
  }
`;

const TranscriptError = styled.div<{ $kind?: 'duplicate_date' | 'future_date' | 'warning' | 'other' }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${({ $kind }) =>
    $kind === 'duplicate_date' || $kind === 'future_date' || $kind === 'warning'
      ? 'rgba(198, 168, 75, 0.12)'
      : 'rgba(201, 42, 84, 0.12)'};
  border: 1px solid
    ${({ $kind }) =>
      $kind === 'duplicate_date' || $kind === 'future_date' || $kind === 'warning'
        ? 'rgba(198, 168, 75, 0.4)'
        : 'rgba(201, 42, 84, 0.3)'};
  color: ${({ $kind }) =>
    $kind === 'duplicate_date' || $kind === 'future_date' || $kind === 'warning' ? '#F5D678' : '#ff8fa3'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.45;
`;

/**
 * Phase 13 (2026-04-15): editable workout date on the transcript review card.
 * The parser's date is a suggestion; the user's edit is the truth. Wired to
 * the page via `onTranscriptDateChange`, which updates both the metadata and
 * the page-level ref so the value reaches `applyParsedWorkout` on confirm.
 */
const DateRow = styled(CardRow)`
  margin-top: 4px;
`;

const DateInput = styled.input.attrs({ type: 'date' })`
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 6px;
  padding: 6px 10px;
  min-height: 36px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  color-scheme: dark;
  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 1px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

function confidenceLevel(c?: number): 'high' | 'medium' | 'low' {
  if (typeof c !== 'number') return 'low';
  if (c >= 0.8) return 'high';
  if (c >= 0.6) return 'medium';
  return 'low';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface CoachMessageProps {
  message: CoachMessageData;
  onReadAloud?: (text: string) => void;
  onConfirmCommand?: (operationId: string) => Promise<{ success: boolean; error?: string }>;
  onCancelCommand?: (operationId: string | null) => Promise<void>;
  /** Swan-first transcript intake — confirm the parsed workout */
  onConfirmTranscript?: (messageId: string) => Promise<void>;
  /** Swan-first transcript intake — discard the review */
  onCancelTranscript?: (messageId: string) => void;
  onAudioIntakeReviewNext?: () => void;
  audioIntakeReviewNextPending?: boolean;
  /**
   * Phase 13 (2026-04-15): propagate a user-edited workout date back to the
   * page so the next `applyParsedWorkout` call uses it. Fire on every change
   * — the page is responsible for debouncing / coalescing if needed.
   */
  onTranscriptDateChange?: (messageId: string, nextDate: string) => void;
}

const CoachMessageComponent: React.FC<CoachMessageProps> = ({
  message,
  onReadAloud,
  onConfirmCommand,
  onCancelCommand,
  onConfirmTranscript,
  onCancelTranscript,
  onAudioIntakeReviewNext,
  audioIntakeReviewNextPending,
  onTranscriptDateChange,
}) => {
  const [copied, setCopied] = React.useState(false);
  // Local "user clicked confirm" lock — prevents double-fire while the
  // applying flag in metadata propagates back through the parent.
  const [localApplying, setLocalApplying] = useState(false);

  const handleTranscriptConfirm = useCallback(async () => {
    if (!onConfirmTranscript || localApplying) return;
    setLocalApplying(true);
    try {
      await onConfirmTranscript(message.id);
    } finally {
      setLocalApplying(false);
    }
  }, [onConfirmTranscript, message.id, localApplying]);

  const handleTranscriptCancel = useCallback(() => {
    onCancelTranscript?.(message.id);
  }, [onCancelTranscript, message.id]);

  const handleTranscriptDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onTranscriptDateChange?.(message.id, e.target.value);
    },
    [onTranscriptDateChange, message.id],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in insecure contexts
    }
  }, [message.content]);

  const handleReadAloud = useCallback(() => {
    onReadAloud?.(message.content);
  }, [message.content, onReadAloud]);

  const timeStr = new Date(message.timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (message.role === 'user') {
    return (
      <MessageBubbleUser>
        {message.content}
        <MessageTime>{timeStr}</MessageTime>
      </MessageBubbleUser>
    );
  }

  const clientCreate = message.metadata?.clientCreateResult;
  const workoutImports = message.metadata?.workoutImportResults;
  const coachActionProposals = message.metadata?.coachActionProposals;
  const coachActionProposalError = message.metadata?.coachActionProposalError;
  const commandConfirmation = message.metadata?.commandConfirmation;
  const commandResult = message.metadata?.commandResult;
  const transcriptReview = message.metadata?.transcriptReview;
  const transcriptResult = message.metadata?.transcriptResult;
  const transcriptError = message.metadata?.transcriptError;
  const audioIntakeReceipt = message.metadata?.audioIntakeReceipt;
  const audioIntakeNextAction = audioIntakeReceipt
    ? safeCommandActionLabel(audioIntakeReceipt.nextActionLabel) || 'Review next intake'
    : null;
  const transcriptErrorReason = transcriptError
    ? safeTranscriptFailureReason(transcriptError.kind, transcriptError.reason)
    : null;
  const audioRejectedSummary = audioIntakeReceipt
    ? safeAudioRejectedSummary(audioIntakeReceipt.rejectedCount)
    : undefined;

  return (
    <MessageBubbleAI>
      <MarkdownRenderer content={message.content} />

      {coachActionProposals?.map((proposal) => (
        <CoachActionProposalCard key={proposal.id} proposal={proposal} />
      ))}

      {coachActionProposalError && (
        <ActionCard style={{ borderColor: 'var(--error, #C92A54)' }}>
          <CardTitle style={{ color: 'var(--error, #C92A54)' }}>Proposal Preparation Failed</CardTitle>
          <CardRow><CardValue>{coachActionProposalError.message}</CardValue></CardRow>
        </ActionCard>
      )}

      {/* Legacy client creation result. New replies use proposal cards above. */}
      {clientCreate?.success && (
        <ActionCard>
          <CardTitle><UserPlus size={16} /> Legacy Client Create Result</CardTitle>
          <CardRow>
            <CardLabel>Name</CardLabel>
            <CardValue>{clientCreate.firstName} {clientCreate.lastName}</CardValue>
          </CardRow>
          <CardRow>
            <CardLabel>Client ID</CardLabel>
            <CardValue>{clientCreate.clientId}</CardValue>
          </CardRow>
          <CardRow>
            <CardLabel>Type</CardLabel>
            <CardValue>{clientCreate.isMoveFitness ? 'Move Fitness (free)' : 'SwanStudios (paid)'}</CardValue>
          </CardRow>
          <CardRow>
            <CardLabel>Access</CardLabel>
            <CardValue>Credentials are no longer shown in Coach chat.</CardValue>
          </CardRow>
          <CardRow>
            <CardLabel>Onboarding</CardLabel>
            <CardValue>{clientCreate.sectionsPreFilled}/{clientCreate.totalSections} pre-filled</CardValue>
            <ProgressBar $pct={clientCreate.completionPercentage || 0} />
          </CardRow>
        </ActionCard>
      )}

      {clientCreate && !clientCreate.success && (
        <ActionCard style={{ borderColor: 'rgba(201, 42, 84, 0.3)' }}>
          <CardTitle style={{ color: '#C92A54' }}>Client Creation Failed</CardTitle>
          <CardRow><CardValue>{clientCreate.reason}</CardValue></CardRow>
        </ActionCard>
      )}

      {/* Workout Import Results Card */}
      {workoutImports?.length > 0 && (
        <ActionCard>
          <CardTitle><Dumbbell size={16} /> Workout Import Results</CardTitle>
          {workoutImports.map((w: any, i: number) => (
            <CardRow key={i}>
              <CardLabel>{w.date || `Workout ${i + 1}`}</CardLabel>
              {w.success ? (
                <CardValue style={{ color: '#10B981' }}>
                  {w.exerciseCount} exercises · {w.totalSets} sets · {w.totalWeight > 0 ? `${w.totalWeight.toLocaleString()} lbs` : 'bodyweight'}
                </CardValue>
              ) : (
                <CardValue style={{ color: '#C92A54' }}>Failed: {w.reason}</CardValue>
              )}
            </CardRow>
          ))}
        </ActionCard>
      )}

      {/* Command Confirmation Card */}
      {commandConfirmation && onConfirmCommand && onCancelCommand && (
        <ConfirmationCard
          operationId={commandConfirmation.operationId}
          command={commandConfirmation.command}
          params={commandConfirmation.params}
          client={commandConfirmation.client}
          details={commandConfirmation.details}
          isDestructive={commandConfirmation.isDestructive}
          onConfirm={onConfirmCommand}
          onCancel={onCancelCommand}
        />
      )}

      {/* Command Execution Result Card */}
      {commandResult && (
        <ExecutionResultCard
          command={commandResult.command}
          result={commandResult.result}
          client={commandResult.client}
          message={commandResult.message}
        />
      )}

      {/* ─── Swan-first transcript intake — Review Card ─────────────── */}
      {transcriptReview && (
        <TranscriptCard data-testid="transcript-review-card">
          <CardTitle>
            <FileAudio size={16} />
            Transcript parsed — review &amp; apply
            {typeof transcriptReview.parsedWorkout?.confidence === 'number' && (
              <ConfidenceBadge $level={confidenceLevel(transcriptReview.parsedWorkout.confidence)}>
                {Math.round(transcriptReview.parsedWorkout.confidence * 100)}% confidence
              </ConfidenceBadge>
            )}
          </CardTitle>

          <CardRow>
            <CardLabel>File</CardLabel>
            <CardValue>{transcriptReview.fileName} ({formatBytes(transcriptReview.fileSize)})</CardValue>
          </CardRow>
          {transcriptReview.clientName && (
            <CardRow>
              <CardLabel>Client</CardLabel>
              <CardValue>{transcriptReview.clientName}</CardValue>
            </CardRow>
          )}
          <CardRow>
            <CardLabel>Exercises</CardLabel>
            <CardValue>{transcriptReview.parsedWorkout?.exercises?.length ?? 0} parsed</CardValue>
          </CardRow>
          {typeof transcriptReview.parsedWorkout?.overallIntensity === 'number' && (
            <CardRow>
              <CardLabel>Intensity</CardLabel>
              <CardValue>{transcriptReview.parsedWorkout.overallIntensity}/10</CardValue>
            </CardRow>
          )}
          {/* Phase 13: editable workout date. Initialized from targetWorkoutDate
              if already set (preserves edits across re-renders), else parser
              date, else today. max=today enforces the "no future" rule at the
              picker level as a UX hint; the apply path validates server-side
              and also client-side in useTranscriptIntake.
              Phase 13.1 (2026-04-15): both default and max use LOCAL calendar
              day (via getLocalIsoDate), not UTC day — otherwise the picker
              offers tomorrow as default for PDT users after ~5pm local. */}
          <DateRow data-testid="transcript-date-row">
            <CardLabel>Workout date</CardLabel>
            <DateInput
              data-testid="transcript-date-input"
              value={
                transcriptReview.targetWorkoutDate ||
                transcriptReview.parsedWorkout?.date ||
                getLocalIsoDate()
              }
              max={getLocalIsoDate()}
              disabled={transcriptReview.applying || localApplying}
              onChange={handleTranscriptDateChange}
              aria-label="Workout date (required)"
            />
          </DateRow>

          {transcriptReview.parsedWorkout?.painFlags &&
            transcriptReview.parsedWorkout.painFlags.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {transcriptReview.parsedWorkout.painFlags.map((flag, i) => (
                  <PainFlagBadge key={i}>
                    <AlertTriangle size={11} />
                    {flag.side ? `${flag.side} ` : ''}{flag.bodyRegion}
                  </PainFlagBadge>
                ))}
              </div>
            )}

          <TranscriptDetails>
            <summary>View transcript</summary>
            <pre>{transcriptReview.transcript}</pre>
          </TranscriptDetails>

          {transcriptReview.applyError && (
            <TranscriptError
              data-testid="transcript-apply-error"
              $kind={
                transcriptReview.applyErrorKind === 'duplicate_date'
                  ? 'duplicate_date'
                  : transcriptReview.applyErrorKind === 'future_date'
                    ? 'future_date'
                    : 'other'
              }
            >
              <AlertTriangle size={14} />
              <span>{transcriptReview.applyError}</span>
            </TranscriptError>
          )}

          <TranscriptActions>
            <TranscriptBtn
              type="button"
              $danger
              onClick={handleTranscriptCancel}
              disabled={transcriptReview.applying || localApplying}
              data-testid="transcript-cancel-btn"
            >
              <X size={14} /> Discard
            </TranscriptBtn>
            <TranscriptBtn
              type="button"
              $primary
              onClick={handleTranscriptConfirm}
              disabled={transcriptReview.applying || localApplying}
              data-testid="transcript-confirm-btn"
            >
              {transcriptReview.applying || localApplying ? (
                <>
                  <Loader2 size={14} /> Applying…
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} /> Apply to workout log
                </>
              )}
            </TranscriptBtn>
          </TranscriptActions>
        </TranscriptCard>
      )}

      {/* ─── Swan-first transcript intake — Error Card ─────────────── */}
      {/* Phase 9.1 hotfix: pre-upload validation + upload-stage failures
          render as a simple dismissible error, NOT a fake review card with
          "0 parsed" and an active Apply button. Apply-stage failures on a
          REAL parsed review still use transcriptReview.applyError so the
          user can retry without losing the parsed data. */}
      {transcriptError && (
        <TranscriptCard
          data-testid="transcript-error-card"
          style={{ borderColor: 'rgba(201, 42, 84, 0.3)' }}
        >
          <CardTitle style={{ color: '#ff8fa3' }}>
            <AlertTriangle size={16} />
            {transcriptError.kind === 'no_client'
              ? 'Client required'
              : 'Upload failed'}
          </CardTitle>
          <CardRow>
            <CardLabel>File</CardLabel>
            <CardValue>
              {transcriptError.fileName}
              {typeof transcriptError.fileSize === 'number'
                ? ` (${formatBytes(transcriptError.fileSize)})`
                : ''}
            </CardValue>
          </CardRow>
          <TranscriptError>
            <AlertTriangle size={14} />
            {transcriptErrorReason}
          </TranscriptError>
          <TranscriptActions>
            <TranscriptBtn
              type="button"
              $danger
              onClick={handleTranscriptCancel}
              data-testid="transcript-error-dismiss-btn"
            >
              <X size={14} /> Dismiss
            </TranscriptBtn>
          </TranscriptActions>
        </TranscriptCard>
      )}

      {audioIntakeReceipt && (
        <TranscriptCard data-testid="audio-intake-receipt-card">
          <CardTitle>
            <CheckCircle2 size={16} />
            Audio pieces queued
          </CardTitle>
          <CardRow>
            <CardLabel>Source</CardLabel>
            <CardValue>{audioIntakeReceipt.fileName}</CardValue>
          </CardRow>
          <CardRow>
            <CardLabel>Accepted</CardLabel>
            <CardValue>
              {audioIntakeReceipt.acceptedCount} piece{audioIntakeReceipt.acceptedCount !== 1 ? 's' : ''}
              {typeof audioIntakeReceipt.fileSize === 'number'
                ? ` (${formatBytes(audioIntakeReceipt.fileSize)})`
                : ''}
            </CardValue>
          </CardRow>
          {audioIntakeReceipt.rejectedCount > 0 && (
            <CardRow>
              <CardLabel>Rejected</CardLabel>
              <CardValue>{audioIntakeReceipt.rejectedCount} file{audioIntakeReceipt.rejectedCount !== 1 ? 's' : ''}</CardValue>
            </CardRow>
          )}
          {audioRejectedSummary && (
            <TranscriptError $kind="warning">
              <AlertTriangle size={14} />
              {audioRejectedSummary}
            </TranscriptError>
          )}
          <CardRow>
            <CardLabel>Next</CardLabel>
            <CardValue>{audioIntakeNextAction}</CardValue>
          </CardRow>
          {audioIntakeReceipt && onAudioIntakeReviewNext && (
            <TranscriptActions>
              <ReceiptActionButton
                type="button"
                onClick={onAudioIntakeReviewNext}
                disabled={audioIntakeReviewNextPending}
                aria-busy={audioIntakeReviewNextPending ? 'true' : undefined}
              >
                {audioIntakeReviewNextPending ? <Loader2 size={15} /> : <ListChecks size={15} />}
                {audioIntakeReviewNextPending ? 'Opening intake...' : 'Review next intake'}
              </ReceiptActionButton>
            </TranscriptActions>
          )}
        </TranscriptCard>
      )}

      {/* ─── Swan-first transcript intake — Result Card ─────────────── */}
      {transcriptResult && (
        <TranscriptCard data-testid="transcript-result-card">
          <CardTitle>
            <CheckCircle2 size={16} />
            Workout logged
          </CardTitle>
          <CardRow>
            <CardLabel>Source</CardLabel>
            <CardValue>{transcriptResult.fileName}</CardValue>
          </CardRow>
          {transcriptResult.clientName && (
            <CardRow>
              <CardLabel>Client</CardLabel>
              <CardValue>{transcriptResult.clientName}</CardValue>
            </CardRow>
          )}
          <CardRow>
            <CardLabel>Logged</CardLabel>
            <CardValue>
              {transcriptResult.exerciseCount} exercise{transcriptResult.exerciseCount !== 1 ? 's' : ''} ·{' '}
              {transcriptResult.totalSets} set{transcriptResult.totalSets !== 1 ? 's' : ''}
            </CardValue>
          </CardRow>
          {typeof transcriptResult.xpAwarded === 'number' && (
            <CardRow>
              <CardLabel>XP awarded</CardLabel>
              <CardValue style={{ color: '#10B981' }}>+{transcriptResult.xpAwarded} XP</CardValue>
            </CardRow>
          )}
          {typeof transcriptResult.streakDays === 'number' && (
            <CardRow>
              <CardLabel>Streak</CardLabel>
              <CardValue>{transcriptResult.streakDays} day{transcriptResult.streakDays !== 1 ? 's' : ''}</CardValue>
            </CardRow>
          )}
        </TranscriptCard>
      )}

      <MessageActions>
        {onReadAloud && (
          <MessageActionBtn type="button" onClick={handleReadAloud} aria-label="Read aloud">
            <Volume2 size={14} /> Read
          </MessageActionBtn>
        )}
        <MessageActionBtn type="button" onClick={handleCopy} aria-label="Copy message">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </MessageActionBtn>
      </MessageActions>
      <MessageTime>
        {timeStr}
        {message.metadata?.model && (
          <ProviderBadge provider={message.metadata.provider} model={message.metadata.model} />
        )}
      </MessageTime>
    </MessageBubbleAI>
  );
};

export const CoachMessage = memo(CoachMessageComponent);
