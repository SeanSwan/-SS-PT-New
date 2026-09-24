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
import { useAIChat } from '../../../../hooks/useAIChat';
import { useCoachCommand } from '../../../../hooks/useCoachCommand';
import { commandInputMode, useCoachInputOrigin } from '../../../../hooks/useCoachInputOrigin';
import {
  commandCancelledBody,
  commandConfirmationResultBody,
  commandLaneConfirmation,
  commandLaneLogBody,
  shouldRouteToCommandLane,
} from '../../Pages/coach-assistant/CoachCommandCenter.commandLane';
import type { CommandLogConfirmation } from '../../Pages/coach-assistant/CoachCommandCenter.data';
import ConfirmationSheet from '../../../CoachConfirm/ConfirmationSheet';
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
import { buildClientTrainingCommandRouteContext, buildDailyCommandPrompt, selectedCommandClientId } from './clientTrainingCommandRouteContext';
import { normalizeSheetResult, proposalBelongsToClient, type ClientTrainingCommandBarProps } from './ClientTrainingCommandBar.helpers';
import { dispatchAIWorkoutEvent } from '../../../../utils/aiWorkoutEvents';

const ClientTrainingCommandBar: React.FC<ClientTrainingCommandBarProps> = ({
  clientId,
  clientName = 'selected client',
  scheduledSessionCreditHint = null,
  scheduledSessionDate = null,
  scheduledSessionId = null,
  onCommandLaneStart,
}) => {
  const [command, setCommand] = useState('');
  const { inputOrigin, setTrackedCommandText, setVoiceCommandText } = useCoachInputOrigin(setCommand);
  const [inputError, setInputError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<CommandLogConfirmation | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'error' | 'success'>('success');
  const { messages, sending, error, sendMessageWithConversation, clearError, newChat } = useAIChat();
  const { executeCommand, executingCommand } = useCoachCommand();
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
    setTrackedCommandText('');
    setPendingConfirmation(null);
    setStatus(null);
  }, [clientId, newChat, setTrackedCommandText]);

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
          routeContext: buildClientTrainingCommandRouteContext({
            scheduledSessionDate,
            scheduledSessionId,
            scheduledSessionCreditHint,
          }),
          inputMode: commandInputMode(inputOrigin),
        });
        if (commandResult.type === 'error') {
          setStatusTone('error');
          setStatus(commandResult.error || 'Swan command lane failed. No data was changed.');
          return;
        }
        if (commandResult.type !== 'fallback_to_chat') {
          if (commandResult.type === 'confirmation_required' && !commandResult.operationId?.trim()) {
            setStatusTone('error');
            setStatus('Confirmation is unavailable. Your draft is still here.');
            return;
          }
          setPendingConfirmation(commandLaneConfirmation(
            commandResult,
            trimmed,
            commandInputMode(inputOrigin),
          ) ?? null);
          setTrackedCommandText('');
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
        setStatus('Coach could not process that. Edit and resend.');
        return;
      }

      setTrackedCommandText('');
      setStatusTone('success');
      setStatus('Sent to Coach. Review before save.');
    },
    [
      busy,
      clearError,
      clientId,
      executeCommand,
      inputOrigin,
      onCommandLaneStart,
      scheduledSessionCreditHint,
      scheduledSessionDate,
      scheduledSessionId,
      sendMessageWithConversation,
      setTrackedCommandText,
    ]
  );

  // Dictation streams into the command input; the trainer reviews and
  // presses Send (no silence-triggered auto-submit — 2026-07-13 rework).
  const speech = useCoachBrowserSpeechInput({
    setInputError,
    setText: setVoiceCommandText,
  });

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submitCommandText(command);
    },
    [command, submitCommandText]
  );

  const handleSheetDone = useCallback((body: unknown) => {
    if (!pendingConfirmation) return;
    const result = normalizeSheetResult(body, pendingConfirmation);
    const handled = result.type === 'frontend_dispatch'
      ? (typeof result.event === 'string' && result.event.trim()
        ? dispatchAIWorkoutEvent(result.event, result.payload ?? {})
        : false)
      : true;
    const deliveredResult = result.type === 'frontend_dispatch'
      ? {
          ...result,
          dispatched: handled,
          success: handled,
          message: handled
            ? result.message
            : 'The active workout surface did not accept that action. No form was changed.',
        }
      : result;
    setPendingConfirmation(null);
    setStatusTone(deliveredResult.success === false ? 'error' : 'success');
    setStatus(commandConfirmationResultBody(pendingConfirmation, deliveredResult));
  }, [pendingConfirmation]);

  const handleSheetCancel = useCallback(() => {
      if (pendingConfirmation) {
        setStatusTone('success');
        setStatus(commandCancelledBody(pendingConfirmation));
      }
      setPendingConfirmation(null);
  }, [pendingConfirmation]);

  const handleSheetReissue = useCallback(() => {
    const source = pendingConfirmation?.sourceMessage;
    const sourceInputMode = pendingConfirmation?.sourceInputMode;
    setPendingConfirmation(null);
    if (!source) return;
    if (sourceInputMode === 'voice') setVoiceCommandText(source);
    else setTrackedCommandText(source);
  }, [pendingConfirmation, setTrackedCommandText, setVoiceCommandText]);

  const speechStatus = speech.interim
    ? `Listening: ${speech.interim}`
    : speech.listening
      ? 'Listening - tap the mic when you finish'
      : null;
  const displayedStatus = error || inputError || speechStatus || status;
  const displayedTone = error || inputError ? 'error' : statusTone;
  const voiceLabel = !speech.speechSupported
    ? 'Voice dictation unavailable'
    : speech.listening
      ? 'Stop voice dictation'
      : 'Start voice dictation';
  const handleVoiceClick = speech.toggleListening;

  return (
    <Shell aria-label={`${clientName} Swan Coach training command`}>
      <Badge>
        <Sparkles size={16} />
        Ask Coach
      </Badge>

      <Form onSubmit={handleSubmit}>
        <InputWrap>
          <LeadingIcon size={17} aria-hidden="true" />
          <Input
            value={command}
            onChange={(event) => setTrackedCommandText(event.target.value)}
            aria-label={`Ask Coach about ${clientName}`}
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

        <SubmitButton type="submit" disabled={!command.trim() || busy} aria-label="Send to Coach">
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
        <OutputPanel aria-label="Swan Coach training review output">
          {pendingConfirmation?.operationId && (
            <ConfirmationSheet
              operationId={pendingConfirmation.operationId}
              lockedClientId={pendingConfirmation.client?.id ?? null}
              presentation="region"
              input={{
                tier: pendingConfirmation.tier || (pendingConfirmation.isDestructive ? 'deliberate' : 'read_back'),
                isDestructive: pendingConfirmation.isDestructive,
                affectedCount: Number(pendingConfirmation.details?.affectedCount ?? 1),
                physical: Boolean(pendingConfirmation.physical),
                irreversible: Boolean(pendingConfirmation.details?.irreversible),
              }}
              onDone={handleSheetDone}
              onCancel={handleSheetCancel}
              onAcknowledge={() => { setPendingConfirmation(null); setStatus(null); }}
              onReissue={handleSheetReissue}
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
