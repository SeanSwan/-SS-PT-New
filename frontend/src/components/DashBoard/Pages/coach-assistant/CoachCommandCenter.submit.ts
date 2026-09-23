/**
 * FILE: CoachCommandCenter.submit.ts
 * PURPOSE: The one send path for the Swan Coach composer (command lane first,
 * then chat lane), extracted from CoachCommandCenter.actions.ts (rule 4).
 *
 * Truth rules (SWAN-COACH-V1-SPEC non-negotiable #6): every outcome is visible.
 * A null chat result is only silent when a NEWER send or a thread switch really
 * superseded it (coachSendSequence.ts). A null with nothing newer is a refusal:
 * the operator sees "message not sent" and gets their words back, instead of the
 * message silently vanishing (brain-v4 hostile review C2).
 */
import { buildCoachCommandTitle } from './CoachCommandCenter.commandTitle';
import { buildRouteScopedCoachPrompt } from './CoachCommandCenter.logic';
import {
  commandLaneConfirmation,
  commandLaneErrorBody,
  commandLaneLogAttachments,
  commandLaneLogBody,
  commandLaneResult,
  shouldRouteToCommandLane,
} from './CoachCommandCenter.commandLane';
import { interpretCoachChatResponse } from './CoachCommandCenter.chatResponse';
import { beginCoachSend, isLatestCoachSend, REFUSED_SEND_NOTICE } from './coachSendSequence';
import type { AddCoachLog, CoachCommandActionProps } from './CoachCommandCenter.actions';

export function createCoachSubmit(props: CoachCommandActionProps, addLog: AddCoachLog) {
  const restoreText = (trimmed: string) => props.setCommandText((current) => (current.trim() ? current : trimmed));

  return async (trimmed: string, commandType?: string) => {
    const sendToken = beginCoachSend(props.commandTextRef);
    addLog({ actor: 'operator', label: props.clientFacing ? 'client request' : 'operator command', body: trimmed });
    props.setCommandText('');
    props.setSelectedStatus('Sending command to Swan Coach');
    const commandTitle = buildCoachCommandTitle({
      activeThreadTitle: props.activeThreadTitle,
      commandText: trimmed,
      hasActiveThread: Boolean(props.activeThread),
      routeClientLabel: props.routeClientLabel,
      routeIntent: props.routeIntent,
    });
    if (props.commandLaneEnabled && shouldRouteToCommandLane(trimmed)) {
      const commandResult = await props.executeCommand(trimmed, {
        selectedClientId: props.routeClientId,
        routeContext: props.routeCommandContext,
        inputMode: props.inputMode,
        commandType,
      });
      if (commandResult.type === 'error') {
        addLog({
          actor: 'system',
          label: 'command lane failed',
          body: commandLaneErrorBody(commandResult),
          attachments: ['command lane error', 'No data was changed'],
          retryMessage: trimmed,
        });
        props.setSelectedStatus('Command lane failed');
        return;
      }
      if (commandResult.type !== 'fallback_to_chat') {
        addLog({
          actor: 'system',
          label: commandResult.type === 'confirmation_required' ? 'approval required' : 'command lane result',
          body: commandLaneLogBody(commandResult),
          attachments: commandLaneLogAttachments(commandResult),
          commandConfirmation: commandLaneConfirmation(commandResult, trimmed, props.inputMode),
          commandResult: commandLaneResult(commandResult),
        });
        props.setSelectedStatus('Command lane handled');
        return;
      }
    }
    const chatPrompt = buildRouteScopedCoachPrompt(trimmed, props.routeContextPrompt);
    const response = props.routeRequestContext
      ? await props.chat.sendMessageWithConversation(chatPrompt, 'coach_assistant', commandTitle, props.routeClientId, 'both', null, props.routeRequestContext)
      : await props.chat.sendMessageWithConversation(chatPrompt, 'coach_assistant', commandTitle, props.routeClientId, 'both');
    const outcome = interpretCoachChatResponse(response, trimmed, typeof navigator !== 'undefined' && navigator.onLine === false);
    if (outcome.kind === 'superseded') {
      // Really superseded → the newer work speaks. Nothing newer → it was refused.
      if (!isLatestCoachSend(props.commandTextRef, sendToken)) return;
      addLog({ ...REFUSED_SEND_NOTICE, retryMessage: trimmed });
      props.setSelectedStatus('Message not sent');
      restoreText(trimmed);
      return;
    }
    if (outcome.kind !== 'reply') {
      props.setSelectedStatus(outcome.status);
      addLog({
        actor: 'system',
        label: outcome.label,
        body: outcome.body,
        attachments: outcome.attachments,
        ...(outcome.retryMessage ? { retryMessage: outcome.retryMessage } : {}),
      });
      // No retry button on non-retryable failures — hand the words back.
      if (outcome.kind === 'failed' && !outcome.retryMessage) restoreText(trimmed);
      return;
    }
    addLog({ actor: 'coach', label: props.clientFacing ? 'coach response' : 'coach reply', body: outcome.body, ...(outcome.proposals ? { proposals: outcome.proposals } : {}) });
    props.speakCoachReply?.(outcome.body);
    props.setSelectedStatus('Swan Coach response ready');
    void props.chat.listConversations('active', true);
  };
}
