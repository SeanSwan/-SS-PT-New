/**
 * COMPONENT: SwanCoachMessagesPanel
 * PURPOSE: Owns the Swan Coach conversation log, prompt starters, processing
 * status, retry banner, and scroll anchor for SwanCoachAssistantPage.
 * DATA: Receives message state and handlers from the page; performs no API
 * calls directly.
 */

import React from 'react';
import { CoachMessage } from './CoachMessage';
import { safeAttachmentSourceLabel } from './CoachIntakeOperationalText.logic';
import CoachSuggestionChips from './CoachSuggestionChips';
import SuggestedPrompts from './SuggestedPrompts';
import ThinkingIndicator from './ThinkingIndicator';
import { MessagesArea } from './SwanCoachStyles';
import type { CoachContext, CoachMessageData } from './SwanCoachTypes';
import {
  ErrorBannerAction,
  ErrorBannerActions,
  ErrorBanner,
  ProcessingBody,
  ProcessingDot,
  ProcessingDots,
  ProcessingFileName,
  ProcessingStage,
  TranscriptProcessingCard,
} from './SwanCoachAssistantPage.styles';
import type { TranscriptProcessingState } from './hooks/useSwanCoachTranscriptReview';

type ConfirmCommand = (operationId: string) => Promise<{ success: boolean; error?: string }>;
type CancelCommand = (operationId: string | null) => Promise<void>;
type SendMessage = (text: string) => Promise<unknown> | unknown;

interface SwanCoachMessagesPanelProps {
  audioReviewNextPending: boolean;
  context: CoachContext;
  error: string | null;
  lastAttempt: string | null;
  lastErrorRetryable?: boolean;
  messages: CoachMessageData[];
  messagesEndRef: React.Ref<HTMLDivElement>;
  onAudioIntakeReviewNext: () => void;
  onCancelCommand: CancelCommand;
  onCancelTranscript: (messageId: string) => void;
  onClearError: () => void;
  onConfirmCommand: ConfirmCommand;
  onConfirmTranscript: (messageId: string) => Promise<void>;
  onReadAloud: (text: string) => void;
  onSend: SendMessage;
  onTranscriptDateChange: (messageId: string, nextDate: string) => void;
  sending: boolean;
  /** B1a: role-aware next-action chips shown after a Coach reply. */
  suggestionChips: string[];
  suggestionChipsVisible: boolean;
  transcriptProcessing: TranscriptProcessingState;
  workoutLoggerRoute?: string | null;
}

const SwanCoachMessagesPanel: React.FC<SwanCoachMessagesPanelProps> = ({
  audioReviewNextPending,
  context,
  error,
  lastAttempt,
  lastErrorRetryable,
  messages,
  messagesEndRef,
  onAudioIntakeReviewNext,
  onCancelCommand,
  onCancelTranscript,
  onClearError,
  onConfirmCommand,
  onConfirmTranscript,
  onReadAloud,
  onSend,
  onTranscriptDateChange,
  sending,
  suggestionChips,
  suggestionChipsVisible,
  transcriptProcessing,
  workoutLoggerRoute,
}) => (
  <MessagesArea role="log" aria-live="polite" aria-label="Conversation">
    <SuggestedPrompts
      context={context}
      onSelect={(prompt) => {
        void onSend(prompt);
      }}
      visible={messages.length === 0 && !sending}
    />

    {messages.map(message => (
      <CoachMessage
        key={message.id}
        message={message}
        onReadAloud={message.role === 'assistant' ? onReadAloud : undefined}
        onConfirmCommand={onConfirmCommand}
        onCancelCommand={onCancelCommand}
        onConfirmTranscript={onConfirmTranscript}
        onCancelTranscript={onCancelTranscript}
        onAudioIntakeReviewNext={onAudioIntakeReviewNext}
        audioIntakeReviewNextPending={audioReviewNextPending}
        onTranscriptDateChange={onTranscriptDateChange}
        workoutLoggerRoute={workoutLoggerRoute}
      />
    ))}

    <CoachSuggestionChips
      chips={suggestionChips}
      visible={suggestionChipsVisible}
      onSelect={(chip) => {
        void onSend(chip);
      }}
    />

    <ThinkingIndicator isThinking={sending} />

    {transcriptProcessing && (
      <TranscriptProcessingCard
        data-testid="transcript-processing-card"
        role="status"
        aria-live="polite"
      >
        <ProcessingDots aria-hidden="true">
          <ProcessingDot $delay="0s" />
          <ProcessingDot $delay="0.2s" />
          <ProcessingDot $delay="0.4s" />
        </ProcessingDots>
        <ProcessingBody>
          <ProcessingStage data-testid="transcript-processing-stage">
            {transcriptProcessing.stage === 'uploading'
              ? 'Uploading and transcribing...'
              : 'Parsing workout and building review...'}
          </ProcessingStage>
          <ProcessingFileName>
            {safeAttachmentSourceLabel(transcriptProcessing.fileName, 'Transcript file')}
          </ProcessingFileName>
        </ProcessingBody>
      </TranscriptProcessingCard>
    )}

    {error && !sending && (
      <ErrorBanner>
        <span>{error}</span>
        <ErrorBannerActions>
          {lastErrorRetryable && lastAttempt && (
            <ErrorBannerAction
              type="button"
              $primary
              aria-label="Retry last Swan Coach request"
              onClick={() => { void onSend(lastAttempt); }}
            >
              Retry
            </ErrorBannerAction>
          )}
          <ErrorBannerAction
            type="button"
            aria-label="Dismiss Swan Coach error"
            onClick={onClearError}
          >
            Dismiss
          </ErrorBannerAction>
        </ErrorBannerActions>
      </ErrorBanner>
    )}

    <div ref={messagesEndRef} />
  </MessagesArea>
);

export default SwanCoachMessagesPanel;
