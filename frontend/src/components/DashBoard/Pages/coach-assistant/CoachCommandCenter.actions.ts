import type { Dispatch, FormEvent, MouseEvent, MutableRefObject, RefObject, SetStateAction } from 'react';
import type { ConversationSummary, useAIChat } from '../../../../hooks/useAIChat';
import {
  createQuickCoachCommandClient,
  type CoachCommandClientSource,
} from '../../../../services/coachCommandClientService';
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
import { getConversationTitle } from './CoachCommandCenter.logic';
import type { DrawerSide } from './CoachCommandCenter.types';

type CoachCommandChat = Pick<
  ReturnType<typeof useAIChat>,
  'listConversations' | 'loadConversation' | 'newChat' | 'sendMessageWithConversation'
>;

type CoachCommandQueue = { refresh: () => unknown };

type CoachCommandActionProps = {
  activeThread: ConversationSummary | null;
  activeThreadTitle: string;
  chat: CoachCommandChat;
  coachQueue: CoachCommandQueue;
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
  routeIntent: string | null;
  setActiveThreadId: Dispatch<SetStateAction<number | null>>;
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
    props.setActiveThreadId(thread.id);
    props.setSelectedStatus(status);
    closeDrawer(false);
    void props.chat.loadConversation(thread.id);
    focusComposer(`Continue ${title} with review-gated context.`, status);
  };

  const handleWorkflowSelect = (prompt: string) => {
    closeDrawer(false);
    focusComposer(prompt, `${props.activeThreadTitle} - command staged`);
  };

  const handleStartPlaudUpload = () => {
    closeDrawer(false);
    props.setSelectedStatus('PLAUD upload lane ready');
    addLog({
      actor: 'system',
      label: 'PLAUD upload ready',
      body: 'PLAUD recorder upload lane opened inside Swan Coach Command Center. Choose saved recorder clips, merge them, then review before any final write.',
      attachments: ['PLAUD uploader ready', 'operator approval required'],
    });

    const panel = props.plaudReviewRef.current;
    panel?.querySelector<HTMLInputElement>('[data-plaud-uploader-input="true"]')?.click();
    panel?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    panel?.focus({ preventScroll: true });
  };

  const handleNewThread = () => {
    props.chat.newChat();
    props.setActiveThreadId(null);
    closeDrawer(false);
    focusComposer('Start a new review-gated coach thread for the selected client.', 'New Coach Thread ready');
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
      const status = `${createdName} - client stub ready`;
      props.setQuickClientName('');
      props.setQuickClientMessage(`${createdName} created as a minimal client stub. No workout log was written.`);
      addLog({
        actor: 'system',
        label: 'client stub created',
        body: `${createdName} is ready for staged PLAUD/workout review. No workout log was written and final writes still require operator approval.`,
        attachments: result.claimUrl ? ['claim link ready'] : ['client profile stub ready'],
      });
      focusComposer(`Continue ${createdName} with review-gated context.`, status);
      void props.coachQueue.refresh();
    } catch (error: any) {
      props.setQuickClientError(error?.message || 'Client stub could not be created.');
      addLog({
        actor: 'system',
        label: 'client stub failed',
        body: 'Quick client capture failed. No client or workout write was completed from the command rail.',
      });
    } finally {
      props.setQuickClientBusy(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = props.commandText.trim();
    if (!trimmed) return;

    addLog({ actor: 'operator', label: 'operator command', body: trimmed });
    props.setCommandText('');
    props.setSelectedStatus('Sending command to Swan Coach');
    const commandTitle = props.activeThread
      ? props.activeThreadTitle
      : props.routeIntent === 'client_onboarding'
        ? 'New client onboarding'
        : props.routeClientLabel
          ? `${props.routeClientLabel} daily workout log`
          : trimmed.slice(0, 60);
    if (shouldRouteToCommandLane(trimmed)) {
      const commandResult = await props.executeCommand(trimmed, {
        selectedClientId: props.routeClientId,
        routeContext: {
          source: 'coach-command-center',
          intent: props.routeIntent,
        },
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
    const response = await props.chat.sendMessageWithConversation(
      trimmed,
      'coach_assistant',
      commandTitle,
      props.routeClientId,
      'both',
    );
    if (response && typeof response === 'object' && 'failed' in response) {
      props.setSelectedStatus('Swan Coach command failed');
      addLog({ actor: 'system', label: 'command failed', body: 'The command was not completed. No final write was made.' });
      return;
    }
    addLog({
      actor: 'coach',
      label: 'prepared draft',
      body: response && typeof response === 'object' && 'content' in response
        ? String(response.content)
        : 'Prepared a review package with blockers, source context, and approval steps. No final write is made until the operator approves it.',
      attachments: ['draft_review_packet.md', 'approval gate remains locked'],
    });
    props.setSelectedStatus('Prepared draft awaiting operator approval');
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
    props.setSelectedStatus('Readback prepared for operator review');
    addLog({
      actor: 'coach',
      label: 'readback',
      body: 'Readback prepared from the active intake dossier, queue state, and selected client context.',
      attachments: ['readback pending operator review'],
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
    handleWorkflowSelect,
    openDrawer,
    resetLogs: () => props.setLogs(INITIAL_COMMAND_LOGS),
  };
}
