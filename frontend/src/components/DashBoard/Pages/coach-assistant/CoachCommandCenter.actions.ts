import type { Dispatch, FormEvent, MouseEvent, MutableRefObject, RefObject, SetStateAction } from 'react';
import type { ConversationSummary, useAIChat } from '../../../../hooks/useAIChat';
import type { CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import { createQuickClientSubmitAction } from './CoachCommandCenter.quickClientAction';
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
import { interpretCoachChatResponse } from './CoachCommandCenter.chatResponse';
import { INITIAL_COMMAND_LOGS, type CommandLogConfirmation, type CommandLogEntry } from './CoachCommandCenter.data';
import { buildCoachCommandTitle } from './CoachCommandCenter.commandTitle';
import { buildRouteScopedCoachPrompt, getConversationTitle } from './CoachCommandCenter.logic';
import type { CoachChatRouteRequestContext, CoachCommandRouteContext, DrawerSide } from './CoachCommandCenter.types';
import type { CoachCommandInputMode } from '../../../../hooks/coachInputOrigin';
import type { ConfirmResult } from '../../../../hooks/useCoachCommand';

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
  inputMode: CoachCommandInputMode;
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
  routeRequestContext: CoachChatRouteRequestContext | null;
  isBusy?: () => boolean;
  speakCoachReply?: (text: string) => void;
  workoutPlannerRoute?: string | null;
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
  const addLog = (entry: Omit<CommandLogEntry, 'id' | 'at'>) => {
    props.setLogs((current) => [
      { ...entry, id: `log-${Date.now()}-${current.length}`, at: new Date().toISOString() },
      ...current,
    ]);
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
    // Session bubbles and half-typed text belong to their thread — never
    // carry X's into Y (the per-thread draft restores each side).
    props.setLogs(INITIAL_COMMAND_LOGS);
    props.setCommandText('');
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
    props.setLogs(INITIAL_COMMAND_LOGS);
    closeDrawer(false);
    props.setCommandText('');
    props.setSelectedStatus(props.clientFacing ? 'New Coach Chat ready' : 'New Coach Thread ready');
    focusComposer();
  };
  const handleQuickClientSubmit = createQuickClientSubmitAction({
    addLog,
    coachQueue: props.coachQueue,
    quickClientName: props.quickClientName,
    quickClientSource: props.quickClientSource,
    setQuickClientBusy: props.setQuickClientBusy,
    setQuickClientError: props.setQuickClientError,
    setQuickClientMessage: props.setQuickClientMessage,
    setQuickClientName: props.setQuickClientName,
    setSelectedStatus: props.setSelectedStatus,
  });
  const submitCoachMessage = async (trimmed: string, commandType?: string) => {
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
    if (outcome.kind === 'superseded') return;
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
      if (outcome.kind === 'failed' && !outcome.retryMessage) {
        props.setCommandText((current) => (current.trim() ? current : trimmed));
      }
      return;
    }
    addLog({ actor: 'coach', label: props.clientFacing ? 'coach response' : 'coach reply', body: outcome.body, ...(outcome.proposals ? { proposals: outcome.proposals } : {}) });
    props.speakCoachReply?.(outcome.body);
    props.setSelectedStatus('Swan Coach response ready');
    void props.chat.listConversations('active', true);
  };
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = props.commandText.trim();
    if (!trimmed) return;
    await submitCoachMessage(trimmed);
  };
  const handleIntentSubmit = async (message: string, commandType?: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    await submitCoachMessage(trimmed, commandType);
  };
  const handleRetryMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    // A second send aborts the first inside useAIChat — refuse while busy.
    if (props.isBusy?.()) return props.setSelectedStatus('Wait for the current message to finish, then retry');
    await submitCoachMessage(trimmed);
  };
  const handleConfirmCommand = async (confirmation: CommandLogConfirmation, sheetResult?: ConfirmResult): Promise<CommandConfirmationResult> => {
    if (!confirmation.operationId) return { success: false, error: 'No pending operation id was returned.' };
    // ConfirmationSheet owns the signed transport; this records its result without confirming twice.
    const result = sheetResult || await props.confirmCommand(confirmation.operationId, undefined, 'tap');
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
      commandResult: confirmedCommandLogResult(confirmation, result, { workoutPlannerRoute: props.workoutPlannerRoute }),
    });
    return { success: true };
  };
  const handleCancelCommand = async (confirmation: CommandLogConfirmation, options?: { alreadyCancelled?: boolean }): Promise<void> => {
    if (confirmation.operationId && !options?.alreadyCancelled) await props.cancelCommand(confirmation.operationId);
    props.setSelectedStatus('Command cancelled');
    addLog({
      actor: 'system',
      label: 'command cancelled',
      body: commandCancelledBody(confirmation),
      attachments: [confirmation.command, 'cancelled'],
    });
  };
  const handleReviewIntake = () => {
    props.setSelectedStatus('Intake review lane ready');
    addLog({
      actor: 'system',
      label: 'intake review ready',
      body: 'Intake review lane opened for notes, transcript uploads, holds, and prepared drafts. Use Import audio for saved recorder clips; final writes remain blocked until approval.',
      attachments: ['intake queue open', 'operator approval required'],
    });
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
    handleReviewIntake,
    handleIntentSubmit,
    handleCancelCommand,
    handleConfirmCommand,
    handleNewThread,
    handleQuickClientSubmit,
    handleReadback,
    handleRetryMessage,
    handleStartPlaudUpload,
    handleSubmit,
    handleThreadSelect,
    openDrawer,
    resetLogs: () => props.setLogs(INITIAL_COMMAND_LOGS),
  };
}
