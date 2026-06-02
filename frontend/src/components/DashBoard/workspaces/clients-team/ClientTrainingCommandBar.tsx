/**
 * ============================================================================
 * FILE: ClientTrainingCommandBar.tsx
 * PURPOSE: Selected-client inline Swan command bar for daily training work.
 * OWNER: Codex | LAST MODIFIED: 2026-05-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Lets an admin/trainer dictate or type a client-scoped
 * workout instruction without leaving Clients & Team.
 *
 * HOW IT FITS IN THE APP: TrainingTabContent -> command bar -> useAIChat.
 * It sends client IDs only; display names stay local to the UI.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic2, Send, Sparkles } from 'lucide-react';
import { AI_CHAT_MESSAGE_MAX_CHARS } from '../../../../hooks/aiMessageLimits';
import { useAIChat } from '../../../../hooks/useAIChat';
import { useCoachCommand } from '../../../../hooks/useCoachCommand';
import {
  commandCancelledBody,
  commandConfirmationResultBody,
  commandLaneConfirmation,
  commandLaneLogBody,
  shouldRouteToCommandLane,
} from '../../Pages/coach-assistant/CoachCommandCenter.commandLane';
import type { CommandLogConfirmation } from '../../Pages/coach-assistant/CoachCommandCenter.data';
import { ConfirmationCard } from '../../Pages/coach-assistant/CoachCommandCards';
import { useCoachBrowserSpeechInput } from '../../Pages/coach-assistant/hooks/useCoachBrowserSpeechInput';
import CoachActionProposalCard from '../../Pages/coach-assistant/CoachActionProposalCard';
import type { CoachActionProposal } from '../../Pages/coach-assistant/SwanCoachTypes';
import {
  AssistantNote,
  Badge,
  Form,
  Input,
  InputWrap,
  LeadingIcon,
  OutputPanel,
  Shell,
  StatusLine,
  SubmitButton,
  VoiceButton,
} from './ClientTrainingCommandBar.styles';

interface ClientTrainingCommandBarProps {
  clientId: number | string;
  clientName?: string;
  onCommandLaneStart?: (message: string) => void | Promise<void>;
}

function buildDailyCommandPrompt(clientId: number | string, command: string): string {
  return [
    `Client-scoped daily training command for clientId=${clientId}.`,
    'Use client ID only. Do not require or echo client display names.',
    'Intent: daily workout logging, set updates, workout review, and next-session readiness.',
    'Prepare a review-gated workout_log proposal when enough detail exists.',
    'Do not directly submit workout forms or bypass trainer review.',
    `Operator command: ${command}`,
  ].join('\n');
}

function proposalBelongsToClient(proposal: CoachActionProposal, clientId: number | string): boolean {
  const proposalClientId = proposal.summary?.clientId;
  return proposalClientId != null && String(proposalClientId) === String(clientId);
}

function selectedCommandClientId(clientId: number | string): number | null {
  const numericClientId = Number(clientId);
  return Number.isSafeInteger(numericClientId) && numericClientId > 0 ? numericClientId : null;
}

const ClientTrainingCommandBar: React.FC<ClientTrainingCommandBarProps> = ({
  clientId,
  clientName = 'selected client',
  onCommandLaneStart,
}) => {
  const [command, setCommand] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<CommandLogConfirmation | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'error' | 'success'>('success');
  const { messages, sending, error, sendMessageWithConversation, clearError, newChat } = useAIChat();
  const { cancelCommand, confirmCommand, executeCommand, executingCommand } = useCoachCommand();
  const busy = sending || executingCommand;
  const previousClientIdRef = useRef(String(clientId));
  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
  const latestAssistantContent = typeof latestAssistantMessage?.content === 'string'
    ? latestAssistantMessage.content
    : '';
  const latestProposals = (
    (latestAssistantMessage?.metadata?.coachActionProposals || []) as CoachActionProposal[]
  );
  const latestClientProposals = latestProposals.filter((proposal) =>
    proposalBelongsToClient(proposal, clientId)
  );
  const shouldShowAssistantContent =
    !!latestAssistantContent && (latestProposals.length === 0 || latestClientProposals.length > 0);

  useEffect(() => {
    const currentClientId = String(clientId);
    if (previousClientIdRef.current === currentClientId) return;

    previousClientIdRef.current = currentClientId;
    newChat();
    setCommand('');
    setPendingConfirmation(null);
    setStatus(null);
  }, [clientId, newChat]);

  const submitCommandText = useCallback(
    async (rawCommand: string) => {
      const trimmed = rawCommand.trim();
      if (!trimmed || busy) return;

      clearError();
      setInputError(null);
      setStatus(null);
      setPendingConfirmation(null);
      if (shouldRouteToCommandLane(trimmed)) {
        await onCommandLaneStart?.(trimmed);
        const commandResult = await executeCommand(trimmed, {
          selectedClientId: selectedCommandClientId(clientId),
          routeContext: {
            source: 'clients-team',
            intent: 'daily_training_command',
            surface: 'client-training-command-bar',
          },
        });
        if (commandResult.type === 'error') {
          setStatusTone('error');
          setStatus(commandResult.error || 'Swan command lane failed. No data was changed.');
          return;
        }
        if (commandResult.type !== 'fallback_to_chat') {
          setPendingConfirmation(commandLaneConfirmation(commandResult) ?? null);
          setCommand('');
          setStatusTone('success');
          setStatus(commandLaneLogBody(commandResult));
          return;
        }
      }

      const result = await sendMessageWithConversation(
        buildDailyCommandPrompt(clientId, trimmed),
        'workout_generation',
        `Client #${clientId} daily training`,
        clientId,
        'both'
      );

      if (result && (result as { paywallRequired?: boolean }).paywallRequired) {
        setStatusTone('error');
        setStatus('Swan Coach requires an active subscription.');
        return;
      }

      if (!result || (result as { failed?: boolean }).failed) {
        setStatusTone('error');
        setStatus('Swan could not process that. Edit and resend.');
        return;
      }

      setCommand('');
      setStatusTone('success');
      setStatus('Sent to Swan. Review before save.');
    },
    [busy, clearError, clientId, executeCommand, onCommandLaneStart, sendMessageWithConversation]
  );

  const speech = useCoachBrowserSpeechInput({
    maxChars: AI_CHAT_MESSAGE_MAX_CHARS,
    onSend: submitCommandText,
    setInputError,
    setText: setCommand,
  });

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submitCommandText(command);
    },
    [command, submitCommandText]
  );

  const handleConfirmCommand = useCallback(
    async (operationId: string) => {
      if (!pendingConfirmation) return { success: false, error: 'No pending command to confirm.' };
      const result = await confirmCommand(operationId);
      if (!result.success) {
        setStatusTone('error');
        setStatus(result.message || 'Swan could not confirm that action.');
        return { success: false, error: result.message || 'Confirm failed.' };
      }

      setPendingConfirmation(null);
      setStatusTone('success');
      setStatus(commandConfirmationResultBody(pendingConfirmation, result));
      return { success: true };
    },
    [confirmCommand, pendingConfirmation]
  );

  const handleCancelCommand = useCallback(
    async (operationId: string | null) => {
      if (operationId) await cancelCommand(operationId);
      if (pendingConfirmation) {
        setStatusTone('success');
        setStatus(commandCancelledBody(pendingConfirmation));
      }
      setPendingConfirmation(null);
    },
    [cancelCommand, pendingConfirmation]
  );

  const speechStatus = speech.interim
    ? `Listening: ${speech.interim}`
    : speech.cancelPillVisible
      ? 'Voice command captured. Sending unless cancelled.'
      : null;
  const displayedStatus = error || inputError || speechStatus || status;
  const displayedTone = error || inputError ? 'error' : statusTone;
  const voiceLabel = !speech.speechSupported
    ? 'Voice dictation unavailable'
    : speech.cancelPillVisible
      ? 'Cancel voice send'
      : speech.listening
        ? 'Stop voice dictation'
        : 'Start voice dictation';
  const handleVoiceClick = speech.cancelPillVisible ? speech.handleCancelSend : speech.toggleListening;

  return (
    <Shell aria-label={`${clientName} Swan daily training command`}>
      <Badge>
        <Sparkles size={16} />
        Tell Swan
      </Badge>

      <Form onSubmit={handleSubmit}>
        <InputWrap>
          <LeadingIcon size={17} aria-hidden="true" />
          <Input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            aria-label={`Tell Swan about ${clientName}`}
            placeholder="Dictate sets, reps, load, pain, notes..."
          />
        </InputWrap>

        <VoiceButton
          type="button"
          onClick={handleVoiceClick}
          disabled={!speech.speechSupported || busy}
          aria-pressed={speech.listening}
          aria-label={voiceLabel}
          title={voiceLabel}
        >
          <Mic2 size={16} />
          <span>{speech.listening ? 'Listening' : 'Voice'}</span>
        </VoiceButton>

        <SubmitButton type="submit" disabled={!command.trim() || busy} aria-label="Send to Swan">
          <Send size={16} />
          Send
        </SubmitButton>
      </Form>

      {displayedStatus && (
        <StatusLine role={displayedTone === 'error' ? 'alert' : 'status'} $tone={displayedTone}>
          {displayedStatus}
        </StatusLine>
      )}

      {(pendingConfirmation || shouldShowAssistantContent || latestClientProposals.length > 0) && (
        <OutputPanel aria-label="Swan daily training review output">
          {pendingConfirmation && (
            <ConfirmationCard
              operationId={pendingConfirmation.operationId}
              command={pendingConfirmation.command}
              params={pendingConfirmation.params}
              client={pendingConfirmation.client}
              details={pendingConfirmation.details}
              isDestructive={pendingConfirmation.isDestructive}
              onConfirm={handleConfirmCommand}
              onCancel={handleCancelCommand}
            />
          )}
          {shouldShowAssistantContent && <AssistantNote>{latestAssistantContent}</AssistantNote>}
          {latestClientProposals.map((proposal) => (
            <CoachActionProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </OutputPanel>
      )}
    </Shell>
  );
};

export default ClientTrainingCommandBar;
