import { type SetStateAction, useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AI_CHAT_MESSAGE_MAX_CHARS } from '../../../../hooks/aiMessageLimits';
import { useCoachIntakeQueue } from '../../../../hooks/useCoachIntakeQueue';
import { useAIChat } from '../../../../hooks/useAIChat';
import { useCoachCommand } from '../../../../hooks/useCoachCommand';
import type { CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import { parsePlaudMergeRequestId } from '../../../../utils/plaudRouteGuards';
import { createCoachCommandCenterActions } from './CoachCommandCenter.actions';
import { useApplyRouteContextPrompt, useAutoSelectCoachThread, useLoadCoachConversations, useLoadRoutedCoachThread, usePlaudReviewScroll } from './CoachCommandCenter.controllerEffects';
import { INITIAL_COMMAND_LOGS, type CommandLogEntry } from './CoachCommandCenter.data';
import { buildConversationLogs, mergeTranscriptLogs } from './CoachCommandCenter.chatLogs';
import {
  buildCoachThreads,
  buildClientContextTiles,
  buildDossierTiles,
  buildIntakeStates,
  buildQueueHealthRows,
  buildQueueSummary,
  buildRightRailItems,
  buildStatusMetrics,
  buildVoiceStatus,
  displaySelectedStatus,
  getConversationTitle,
  pickAutoSelectedThread,
  pickInitialReviewMergeRequestId,
  pickRouteReviewNextMergeRequestId,
  runCoachVoiceCommand,
  selectedClientLabel as buildSelectedClientLabel,
  shouldScrollPlaudReview,
  toggleBoolean,
} from './CoachCommandCenter.logic';
import { buildCommandRouteContext, buildEffectiveRouteContext, buildRouteClientLabel, buildRouteContext, buildThreadSelectionSearchParams, buildWorkflowReturnLabel, getScheduledSessionRouteContextFromSearchParams, normalizeCommandCenterReturnTo, parseRouteClientId, parseRouteThreadId, readHistoricalImportRouteDraft } from './CoachCommandCenter.routeContext';
import type { CoachCommandRole } from './CoachCommandCenter.roleConfig';
import { useCoachBrowserSpeechInput } from './hooks/useCoachBrowserSpeechInput';
import type { DrawerSide } from './CoachCommandCenter.types';
import { capturedVoiceText, resolveVoiceCommandText } from './CoachCommandCenter.voiceText';

export function useCoachCommandCenterController({
  userRole = 'admin',
}: { userRole?: CoachCommandRole } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const chat = useAIChat();
  const { cancelCommand, confirmCommand, executeCommand, executingCommand } = useCoachCommand();
  const operatorEnabled = userRole !== 'client';
  const coachQueue = useCoachIntakeQueue({ scope: 'actionable', limit: 12, enabled: operatorEnabled });
  const initialRouteThreadId = parseRouteThreadId(searchParams.get('threadId'));
  const [activeThreadId, setActiveThreadId] = useState<number | null>(initialRouteThreadId);
  const [autoSelectSuppressed, setAutoSelectSuppressed] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('No coach thread selected');
  const [threadSearch, setThreadSearch] = useState('');
  const [logs, setLogs] = useState<CommandLogEntry[]>(INITIAL_COMMAND_LOGS);
  const [teachMode, setTeachMode] = useState(false);
  const [drawer, setDrawer] = useState<DrawerSide | null>(null);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickClientSource, setQuickClientSource] = useState<CoachCommandClientSource>('move_fitness');
  const [quickClientBusy, setQuickClientBusy] = useState(false);
  const [quickClientMessage, setQuickClientMessage] = useState<string | null>(null);
  const [quickClientError, setQuickClientError] = useState<string | null>(null);
  const [voiceInputError, setVoiceInputError] = useState<string | null>(null);

  const shellRef = useRef<HTMLDivElement>(null);
  const commandFormRef = useRef<HTMLFormElement>(null);
  const commandTextRef = useRef<HTMLTextAreaElement>(null);
  const leftRailRef = useRef<HTMLElement>(null);
  const rightRailRef = useRef<HTMLElement>(null);
  const plaudReviewRef = useRef<HTMLElement>(null);
  const lastDrawerTriggerRef = useRef<HTMLButtonElement | null>(null);

  const coachThreads = useMemo(
    () => buildCoachThreads(chat.conversations, threadSearch),
    [chat.conversations, threadSearch],
  );
  const allCoachThreads = useMemo(
    () => buildCoachThreads(chat.conversations, ''),
    [chat.conversations],
  );

  const activeThread = useMemo(
    () => allCoachThreads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, allCoachThreads],
  );
  const activeThreadTitle = getConversationTitle(activeThread);
  const searchKey = searchParams.toString();
  const routeClientId = useMemo(() => parseRouteClientId(searchParams.get('clientId')), [searchKey]);
  const routeThreadId = useMemo(() => parseRouteThreadId(searchParams.get('threadId')), [searchKey]);
  const activeThreadClientId = useMemo(
    () => parseRouteClientId(activeThread?.targetUserId == null ? null : String(activeThread.targetUserId)),
    [activeThread?.targetUserId],
  );
  const effectiveClientId = routeClientId || activeThreadClientId;
  const routeIntent = searchParams.get('intent');
  const routeSource = searchParams.get('source');
  const routeDraftKey = searchParams.get('draftKey');
  const autoSelectedThread = useMemo(
    () => autoSelectSuppressed ? null : pickAutoSelectedThread(allCoachThreads, routeIntent, routeClientId, activeThreadId),
    [activeThreadId, allCoachThreads, autoSelectSuppressed, routeClientId, routeIntent],
  );
  const workflowReturnTo = useMemo(
    () => normalizeCommandCenterReturnTo(searchParams.get('returnTo') || searchParams.get('sourcePath')),
    [searchKey],
  );
  const workflowReturnSource = routeSource
    || (workflowReturnTo?.startsWith('/dashboard/client/') ? 'client-dashboard' : null);
  const workflowReturnLabel = buildWorkflowReturnLabel(workflowReturnTo, workflowReturnSource);
  const routeClientLabel = buildRouteClientLabel(routeClientId);
  const effectiveClientLabel = routeClientLabel || buildRouteClientLabel(activeThreadClientId);
  const routeTeachPrompt = searchParams.get('teachPrompt')?.trim().slice(0, AI_CHAT_MESSAGE_MAX_CHARS) || null;
  const scheduledSessionContext = useMemo(() => getScheduledSessionRouteContextFromSearchParams(searchParams), [searchKey]);
  const routeContext = useMemo(
    () => routeTeachPrompt
      ? {
        prompt: routeTeachPrompt,
        status: routeIntent === 'trainer_daily_command'
          ? 'Trainer day command context loaded'
          : routeIntent === 'plan_review'
            ? 'Build Plan review context loaded'
            : 'Coach route prompt loaded',
      }
      : buildRouteContext(routeIntent, routeClientLabel, scheduledSessionContext),
    [routeClientLabel, routeIntent, routeTeachPrompt, scheduledSessionContext],
  );
  const storedRouteDraft = useMemo(() => readHistoricalImportRouteDraft(routeIntent, routeDraftKey), [routeDraftKey, routeIntent, searchKey]);
  const effectiveRouteContext = useMemo(() => buildEffectiveRouteContext(routeContext, storedRouteDraft, routeClientLabel), [routeClientLabel, routeContext, storedRouteDraft]);
  const commandRouteContext = useMemo(() => buildCommandRouteContext(routeIntent, scheduledSessionContext), [routeIntent, scheduledSessionContext]);
  const clientContextTiles = useMemo(() => buildClientContextTiles(Boolean(effectiveClientId), Boolean(activeThread)), [activeThread, effectiveClientId]);
  const conversationLogs = useMemo(
    () => buildConversationLogs(chat.activeConversation?.id, chat.messages),
    [chat.activeConversation?.id, chat.messages],
  );
  const transcriptLogs = useMemo(
    () => mergeTranscriptLogs(logs, conversationLogs),
    [conversationLogs, logs],
  );

  const rawMergeRequestId = searchParams.get('mergeRequestId');
  const directMergeRequestId = parsePlaudMergeRequestId(rawMergeRequestId);
  const reviewNextRequested = searchParams.get('review') === 'next';
  const plaudWorkspaceRequested = searchParams.get('workspace') === 'plaud';
  const reviewNextMergeRequestId = pickRouteReviewNextMergeRequestId(
    reviewNextRequested,
    plaudWorkspaceRequested,
    coachQueue.items,
  );
  const initialReviewMergeRequestId = pickInitialReviewMergeRequestId(directMergeRequestId, reviewNextMergeRequestId);
  const summary = useMemo(() => buildQueueSummary(coachQueue.summary), [coachQueue.summary]);
  const selectedClientLabel = buildSelectedClientLabel(effectiveClientLabel, activeThreadTitle, Boolean(activeThread));
  const statusMetrics = useMemo(
    () => buildStatusMetrics(
      summary,
      coachQueue.health?.status,
      coachQueue.isLoading,
      coachQueue.health?.nextOperatorAction?.label,
    ),
    [coachQueue.health?.nextOperatorAction?.label, coachQueue.health?.status, coachQueue.isLoading, summary],
  );
  const intakeStates = useMemo(() => buildIntakeStates(summary), [summary]);
  const dossierTiles = useMemo(
    () => buildDossierTiles(initialReviewMergeRequestId, selectedClientLabel, summary),
    [initialReviewMergeRequestId, selectedClientLabel, summary],
  );
  const queueHealthRows = useMemo(() => buildQueueHealthRows(summary), [summary]);
  const rightRailItems = useMemo(() => buildRightRailItems(coachQueue.items), [coachQueue.items]);
  const commandBusy = chat.sending || executingCommand;
  const setVoiceCommandText = useCallback((next: SetStateAction<string>) => {
    setCommandText((current) => resolveVoiceCommandText(next, current));
  }, []);
  const handleVoiceCaptured = useCallback((text: string) => {
    setCommandText((current) => capturedVoiceText(current, text));
    setSelectedStatus('Voice command captured - press Prepare to review');
  }, []);
  const handleGuidePrompt = useCallback((prompt: string) => {
    const trimmed = prompt.trim().slice(0, AI_CHAT_MESSAGE_MAX_CHARS);
    if (!trimmed) return;
    setCommandText((current) => current.trim() ? current : trimmed);
    setSelectedStatus('Guide prompt staged for review');
    window.setTimeout(() => commandTextRef.current?.focus(), 0);
  }, []);
  const speech = useCoachBrowserSpeechInput({
    maxChars: AI_CHAT_MESSAGE_MAX_CHARS,
    onSend: handleVoiceCaptured,
    setInputError: setVoiceInputError,
    setText: setVoiceCommandText,
  });
  const actions = createCoachCommandCenterActions({
    activeThread,
    activeThreadTitle,
    cancelCommand,
    chat,
    coachQueue,
    clientFacing: userRole === 'client',
    commandBusy,
    commandLaneEnabled: operatorEnabled,
    commandText,
    commandTextRef,
    confirmCommand,
    executeCommand,
    lastDrawerTriggerRef,
    plaudReviewRef,
    quickClientName,
    quickClientSource,
    routeClientId: effectiveClientId,
    routeClientLabel: effectiveClientLabel,
    routeCommandContext: commandRouteContext,
    routeContextPrompt: effectiveRouteContext.prompt,
    routeIntent,
    routeRequestContext: scheduledSessionContext,
    onThreadSelectRoute: (thread) => setSearchParams(buildThreadSelectionSearchParams(searchParams, thread.targetUserId, thread.id), { replace: true }),
    onNewThreadRoute: () => setSearchParams(buildThreadSelectionSearchParams(searchParams, null, null), { replace: true }),
    setActiveThreadId,
    setAutoSelectSuppressed,
    setCommandText,
    setDrawer,
    setLogs,
    setQuickClientBusy,
    setQuickClientError,
    setQuickClientMessage,
    setQuickClientName,
    setSelectedStatus,
  });
  const handleVoice = useCallback(() => {
    runCoachVoiceCommand({
      cancelPillVisible: speech.cancelPillVisible,
      handleCancelSend: speech.handleCancelSend,
      speechSupported: speech.speechSupported,
      toggleListening: speech.toggleListening,
    }, setSelectedStatus);
  }, [speech.cancelPillVisible, speech.handleCancelSend, speech.speechSupported, speech.toggleListening]);

  useLoadCoachConversations(chat);
  useLoadRoutedCoachThread(routeThreadId, allCoachThreads, chat.loadConversation, setActiveThreadId, setSelectedStatus);
  useAutoSelectCoachThread(autoSelectedThread, setActiveThreadId, setSelectedStatus);
  useApplyRouteContextPrompt(effectiveRouteContext, searchKey, setActiveThreadId, setSelectedStatus, setCommandText);
  usePlaudReviewScroll(
    shouldScrollPlaudReview(plaudWorkspaceRequested, rawMergeRequestId, reviewNextRequested),
    searchKey,
    plaudReviewRef,
  );

  const voiceStatus = buildVoiceStatus(voiceInputError, speech.interim, speech.cancelPillVisible);

  return {
    activeIntakeId: searchParams.get('intake'),
    activeThread,
    activeThreadId,
    clientContextTiles,
    coachQueue,
    coachThreads,
    commandBusy,
    commandFormRef,
    commandText,
    commandTextRef,
    closeDrawer: actions.closeDrawer,
    dossierTiles,
    drawer,
    handleAttach: actions.handleAttach,
    handleCancelCommand: actions.handleCancelCommand,
    handleConfirmCommand: actions.handleConfirmCommand,
    handleGuidePrompt,
    handleNewThread: actions.handleNewThread,
    handleQuickClientSubmit: actions.handleQuickClientSubmit,
    handleReadback: actions.handleReadback,
    handleStartPlaudUpload: actions.handleStartPlaudUpload,
    handleSubmit: actions.handleSubmit,
    handleThreadSelect: actions.handleThreadSelect,
    handleVoice,
    initialReviewMergeRequestId,
    intakeStates,
    leftRailRef,
    logs: transcriptLogs,
    openDrawer: actions.openDrawer,
    plaudReviewRef,
    queueHealthRows,
    quickClientBusy,
    quickClientError,
    quickClientMessage,
    quickClientName,
    quickClientSource,
    routeClientId: effectiveClientId,
    resetLogs: actions.resetLogs,
    rightRailItems,
    rightRailRef,
    selectedClientLabel,
    selectedStatus: displaySelectedStatus(voiceStatus, selectedStatus),
    setCommandText,
    setQuickClientName,
    setQuickClientSource,
    setTeachMode,
    setThreadSearch,
    shellRef,
    statusMetrics,
    summary,
    teachMode,
    threadSearch,
    toggleTeachMode: () => setTeachMode(toggleBoolean),
    voiceActive: speech.listening,
    voiceSupported: speech.speechSupported,
    workflowReturnLabel,
    workflowReturnTo,
  };
}
