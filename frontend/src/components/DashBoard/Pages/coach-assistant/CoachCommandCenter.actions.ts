import type { Dispatch, FormEvent, MouseEvent, MutableRefObject, RefObject, SetStateAction } from 'react';
import type { ConversationSummary, useAIChat } from '../../../../hooks/useAIChat';
import { createQuickCoachCommandClient, type CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import {
  commandCancelledBody,
  commandLaneErrorBody,
  commandConfirmationResultBody,
  commandLaneConfirmation,
  commandLaneLogAttachments,
  commandLaneLogBody,
  commandLaneResult,
  confirmedCommandLogResult,
  shouldRouteToCommandLane,
  type CancelCoachCommand,
  type CommandConfirmationResult,
  type ConfirmCoachCommand,
  type ExecuteCoachCommand,
} from './CoachCommandCenter.commandLane';
import { INITIAL_COMMAND_LOGS, type CommandLogConfirmation, type CommandLogEntry } from './CoachCommandCenter.data';
import { buildCoachCommandTitle } from './CoachCommandCenter.commandTitle';
import { buildRouteScopedCoachPrompt, getConversationTitle } from './CoachCommandCenter.logic';
import type { CoachCommandRouteContext, CoachScheduledSessionRouteContext, DrawerSide } from './CoachCommandCenter.types';

type CoachCommandChat = Pick<ReturnType<typeof useAIChat>, 'listConversations' | 'loadConversation' | 'newChat' | 'sendMessageWithConversation'>;
type CoachCommandQueue = { refresh: () => unknown };

type CoachCommandActionProps = {
  activeThread: ConversationSummary | null;
  activeThreadTitle: string;
  chat: CoachCommandChat;
  coachQueue: CoachCommandQueue;
  clientFacing: boolean;
  commandLaneEnabled: boolean;
  cancelCommand: CancelCoachCommand;
  commandText: string;
  commandTextRef: RefObject<HTMLTextAreaElement>;
  confirmCommand: ConfirmCoachCommand;
  executeCommand: ExecuteCoachCommand;
  lastDrawerTriggerRef: MutableRefObject<HTMLButtonElement | null>;
  plaudReviewRef: RefObject<HTMLElement>;
  quickClientName: string;
  quickClientSource: CoachCommandClientSource;
  routeClientId: number | null;
  routeClientLabel: string | null;
  routeCommandContext: CoachCommandRouteContext;
  routeIntent: string | null;
  routeContextPrompt: string | null;
  routeRequestContext: CoachScheduledSessionRouteContext | null;
  speakCoachReply?: (text: string) => void;
  onThreadSelectRoute: (thread: ConversationSummary) => void;
  onNewThreadRoute: () => void;
  setActiveThreadId: Dispatch<SetStateAction<number | null>>;
  setAutoSelectSuppressed: Dispatch<SetStateAction<boolean>>;
  setCommandText: Dispatch<SetStateAction<string>>;
  setDrawer: Dispatch<SetStateAction<DrawerSide | null>>;
  setLogs: Dispatch<SetStateAction<CommandLogEntry[]>>;
  setQuickClientBusy: Dispatch<SetStateAction<boolean>>;
  setQuickClientError: Dispatch<SetStateAction<string | null>>;
  setQuickClientMessage: Dispatch<SetStateAction<string | null>>;
  setQuickClientName: Dispatch<SetStateAction<string>>;
  setSelectedStatus: Dispatch<SetStateAction<string>>;
};

export function createCoachCommandCenterActions(props: CoachCommandActionProps) {
  const addLog = (entry: Omit<CommandLogEntry, 'id'>) => {
    props.setLogs((current) => [{ ...entry, id: `log-${Date.now()}-${current.length}` }, ...current]);
  };
  const focusComposer = (value?: string, status?: string) => {
    if (value !== undefined) props.setCommandText(value);
    if (status) props.setSelectedStatus(status);
    window.setTimeout(() => props.commandTextRef.current?.focus(), 0);
  };
  const closeDrawer = (restoreFocus = true) => {
    props.setDrawer(null);
    if (restoreFocus) window.setTimeout(() => props.lastDrawerTriggerRef.current?.focus(), 0);
  };
  const openDrawer = (side: DrawerSide, event: MouseEvent<HTMLButtonElement>) => {
    props.lastDrawerTriggerRef.current = event.currentTarget;
    props.setDrawer(side);
  };

  const handleThreadSelect = (thread: ConversationSummary) => {
    const title = getConversationTitle(thread);
    const status = `${title} - thread loaded`;
    props.onThreadSelectRoute(thread);
    props.setAutoSelectSuppressed(false);
    props.setActiveThreadId(thread.id);
    props.setSelectedStatus(status);
    closeDrawer(false);
    void props.chat.loadConversation(thread.id);
  };

  const handleStartPlaudUpload = () => {
    closeDrawer(false);
    props.setSelectedStatus('Audio review lane ready');
    addLog({
      actor: 'system',
      label: 'audio review ready',
      body: 'Audio upload lane opened inside Swan Coach Command Center. Choose saved recorder clips, merge them, then review before any final write.',
      attachments: ['audio uploader ready', 'operator approval required'],
    });

    const panel = props.plaudReviewRef.current;
    panel?.querySelector<HTMLInputElement>('[data-plaud-uploader-input="true"]')?.click();
    panel?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    panel?.focus({ preventScroll: true });
  };

  const handleNewThread = () => {
    props.chat.newChat();
    props.onNewThreadRoute();
    props.setAutoSelectSuppressed(true);
    props.setActiveThreadId(null);
    closeDrawer(false);
    props.setCommandText('');
    props.setSelectedStatus(props.clientFacing ? 'New Coach Chat ready' : 'New Coach Thread ready');
    focusComposer();
  };

  const handleQuickClientSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const fullName = props.quickClientName.trim();
    if (!fullName) {
      props.setQuickClientError('Client name is required.');
      props.setQuickClientMessage(null);
      return;
    }

    props.setQuickClientBusy(true);
    props.setQuickClientError(null);
    props.setQuickClientMessage(null);
    try {
      const result = await createQuickCoachCommandClient({ fullName, clientSource: props.quickClientSource });
      const createdName = [result.client.firstName, result.client.lastName].filter(Boolean).join(' ') || fullName;
      const status = `${createdName} - client ready`;
      props.setQuickClientName('');
      props.setQuickClientMessage(`${createdName} is ready for review-gated follow-up. No workout log was written.`);
      addLog({
        actor: 'system',
        label: 'client added',
        body: `${createdName} is ready for staged audio/workout review. No workout log was written and final writes still require operator approval.`,
        attachments: result.claimUrl ? ['claim link ready'] : ['client profile ready'],
      });
      props.setSelectedStatus(status);
      void props.coachQueue.refresh();
    } catch (error: any) {
      props.setQuickClientError(error?.message || 'Client could not be added.');
      addLog({
        actor: 'system',
        label: 'client add failed',
        body: 'Quick client add failed. No client or workout write was completed from the command rail.',
      });
    } finally {
      props.setQuickClientBusy(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = props.commandText.trim();
    if (!trimmed) return;

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
      });
      if (commandResult.type === 'error') {
        addLog({
          actor: 'system',
          label: 'command lane failed',
          body: commandLaneErrorBody(commandResult),
          attachments: ['command lane error', 'No data was changed'],
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
          commandConfirmation: commandLaneConfirmation(commandResult),
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
    if (response && typeof response === 'object' && 'failed' in response) {
      props.setSelectedStatus('Swan Coach command failed');
      addLog({ actor: 'system', label: 'command failed', body: 'The command was not completed. No final write was made.' });
      return;
    }
    const responseBody = response && typeof response === 'object' && 'content' in response
      ? String(response.content)
      : 'Prepared a review package with blockers, source context, and approval steps. No final write is made until the operator approves it.';
    addLog({
      actor: 'coach',
      label: props.clientFacing ? 'coach response' : 'prepared draft',
      body: responseBody,
      attachments: props.clientFacing ? ['review before logging'] : ['draft_review_packet.md', 'approval gate remains locked'],
    });
    props.speakCoachReply?.(responseBody);
    props.setSelectedStatus(props.clientFacing ? 'Swan Coach response ready' : 'Prepared draft awaiting operator approval');
    void props.chat.listConversations('active', true);
  };

  const handleConfirmCommand = async (confirmation: CommandLogConfirmation): Promise<CommandConfirmationResult> => {
    if (!confirmation.operationId) return { success: false, error: 'No pending operation id was returned.' };
    const result = await props.confirmCommand(confirmation.operationId);
    if (!result.success) {
      props.setSelectedStatus('Command confirmation failed');
      addLog({
        actor: 'system',
        label: 'command confirmation failed',
        body: result.message || 'The command was not confirmed. No final write was made.',
        attachments: [confirmation.command, 'not confirmed'],
      });
      return { success: false, error: result.message || 'Confirmation failed.' };
    }
    const body = commandConfirmationResultBody(confirmation, result);
    props.setSelectedStatus('Command confirmed');
    addLog({
      actor: 'system',
      label: 'command confirmed',
      body,
      attachments: [confirmation.command, 'confirmed'],
      commandResult: confirmedCommandLogResult(confirmation, result),
    });
    return { success: true };
  };

  const handleCancelCommand = async (confirmation: CommandLogConfirmation): Promise<void> => {
    if (confirmation.operationId) await props.cancelCommand(confirmation.operationId);
    props.setSelectedStatus('Command cancelled');
    addLog({
      actor: 'system',
      label: 'command cancelled',
      body: commandCancelledBody(confirmation),
      attachments: [confirmation.command, 'cancelled'],
    });
  };

  const handleAttach = () => {
    props.setSelectedStatus('Attachment staged for transcript/audio review');
    addLog({
      actor: 'system',
      label: 'attachment staged',
      body: 'Attachment lane opened for audio, transcript, or note review. Parsed content remains blocked from final write until approved.',
      attachments: ['attachment pending'],
    });
    focusComposer();
  };

  const handleReadback = () => {
    props.setSelectedStatus('Voice replies read the next real Swan Coach response when enabled');
    addLog({
      actor: 'system',
      label: 'voice replies',
      body: 'Turn on Voice replies in More to hear live Swan Coach responses from the conversation API.',
      attachments: ['real response audio only'],
    });
    focusComposer();
  };

  return {
    closeDrawer,
    handleAttach,
    handleCancelCommand,
    handleConfirmCommand,
    handleNewThread,
    handleQuickClientSubmit,
    handleReadback,
    handleStartPlaudUpload,
    handleSubmit,
    handleThreadSelect,
    openDrawer,
    resetLogs: () => props.setLogs(INITIAL_COMMAND_LOGS),
  };
}
