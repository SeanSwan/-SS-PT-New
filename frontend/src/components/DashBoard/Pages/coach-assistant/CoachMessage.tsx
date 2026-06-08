/**
 * SUB-COMPONENT: CoachMessage
 * PARENT: SwanCoachAssistantPage
 * PURPOSE: Renders one assistant/user chat bubble plus delegated action cards.
 */

import React, { memo, useCallback, useState } from 'react';
import { Check, Copy, Dumbbell, UserPlus, Volume2 } from 'lucide-react';
import {
  MessageActionBtn,
  MessageActions,
  MessageBubbleAI,
  MessageBubbleUser,
  MessageTime,
} from './SwanCoachStyles';
import MarkdownRenderer from './MarkdownRenderer';
import ProviderBadge from './ProviderBadge';
import { ConfirmationCard, ExecutionResultCard } from './CoachCommandCards';
import CoachActionProposalCard from './CoachActionProposalCard';
import { CoachMessageTranscriptCards } from './CoachMessageTranscriptCards';
import type { CoachMessageData } from './SwanCoachTypes';
import {
  ActionCard,
  CardLabel,
  CardRow,
  CardTitle,
  CardValue,
  CriticalActionCard,
  ErrorActionCard,
  ErrorCardTitle,
  FailureCardValue,
  ProgressBar,
  SuccessCardValue,
} from './CoachMessage.styles';
import {
  safeClientCreateFailure,
  safeProposalPreparationFailure,
  safeWorkoutImportFailure,
} from './CoachIntakeOperationalText.logic';
import { workoutImportItems } from './CoachMessageWorkoutImportIdentity';
import { normalizeClientSource } from '../../../../utils/clientSource';

type LegacyClientCreateResult = NonNullable<NonNullable<CoachMessageData['metadata']>['clientCreateResult']>;

export function getLegacyClientCreateTypeLabel(clientCreate: LegacyClientCreateResult): string {
  const normalizedClientSource = normalizeClientSource(clientCreate.clientSource);
  if (normalizedClientSource === 'external') return 'External (free tracking)';
  if (normalizedClientSource === 'move_fitness' || clientCreate.isMoveFitness) {
    return 'Move Fitness (free tracking)';
  }
  return 'SwanStudios (paid)';
}

interface CoachMessageProps {
  message: CoachMessageData;
  onReadAloud?: (text: string) => void;
  onConfirmCommand?: (operationId: string) => Promise<{ success: boolean; error?: string }>;
  onCancelCommand?: (operationId: string | null) => Promise<void>;
  onConfirmTranscript?: (messageId: string) => Promise<void>;
  onCancelTranscript?: (messageId: string) => void;
  onAudioIntakeReviewNext?: () => void;
  audioIntakeReviewNextPending?: boolean;
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
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onTranscriptDateChange?.(message.id, event.target.value);
    },
    [onTranscriptDateChange, message.id],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in insecure contexts.
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

  return (
    <MessageBubbleAI>
      <MarkdownRenderer content={message.content} />

      {coachActionProposals?.map((proposal) => (
        <CoachActionProposalCard key={proposal.id} proposal={proposal} />
      ))}

      {coachActionProposalError && (
        <CriticalActionCard>
          <ErrorCardTitle>Proposal Preparation Failed</ErrorCardTitle>
          <CardRow><CardValue>{safeProposalPreparationFailure()}</CardValue></CardRow>
        </CriticalActionCard>
      )}

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
            <CardValue>{getLegacyClientCreateTypeLabel(clientCreate)}</CardValue>
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
        <ErrorActionCard>
          <ErrorCardTitle>Client Creation Failed</ErrorCardTitle>
          <CardRow><CardValue>{safeClientCreateFailure()}</CardValue></CardRow>
        </ErrorActionCard>
      )}

      {(workoutImports?.length ?? 0) > 0 && (
        <ActionCard>
          <CardTitle><Dumbbell size={16} /> Workout Import Results</CardTitle>
          {workoutImportItems(workoutImports).map(({ key, label, workout }) => (
            <CardRow key={key}>
              <CardLabel>{label}</CardLabel>
              {workout.success ? (
                <SuccessCardValue>
                  {workout.exerciseCount ?? 0} exercises - {workout.totalSets ?? 0} sets -{' '}
                  {(workout.totalWeight ?? 0) > 0
                    ? `${(workout.totalWeight ?? 0).toLocaleString()} lbs`
                    : 'bodyweight'}
                </SuccessCardValue>
              ) : (
                <FailureCardValue>Failed: {safeWorkoutImportFailure()}</FailureCardValue>
              )}
            </CardRow>
          ))}
        </ActionCard>
      )}

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

      {commandResult && (
        <ExecutionResultCard
          command={commandResult.command}
          result={commandResult.result}
          client={commandResult.client}
          message={commandResult.message}
        />
      )}

      <CoachMessageTranscriptCards
        transcriptReview={transcriptReview}
        transcriptResult={transcriptResult}
        transcriptError={transcriptError}
        audioIntakeReceipt={audioIntakeReceipt}
        localApplying={localApplying}
        onTranscriptConfirm={handleTranscriptConfirm}
        onTranscriptCancel={handleTranscriptCancel}
        onTranscriptDateChange={handleTranscriptDateChange}
        onAudioIntakeReviewNext={onAudioIntakeReviewNext}
        audioIntakeReviewNextPending={audioIntakeReviewNextPending}
      />

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
