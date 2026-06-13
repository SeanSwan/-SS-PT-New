import { useCallback, useMemo, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AI_CHAT_MESSAGE_MAX_CHARS } from '../../../../hooks/aiMessageLimits';
import { useCoachIntakeQueue } from '../../../../hooks/useCoachIntakeQueue';
import { useAIChat } from '../../../../hooks/useAIChat';
import { useCoachCommand } from '../../../../hooks/useCoachCommand';
import type { CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import { parsePlaudMergeRequestId } from '../../../../utils/plaudRouteGuards';
import { createCoachCommandCenterActions } from './CoachCommandCenter.actions';
import {
  useApplyRouteContextPrompt,
  useAutoSelectCoachThread,
  useLoadCoachConversations,
  usePlaudReviewScroll,
} from './CoachCommandCenter.controllerEffects';
import { INITIAL_COMMAND_LOGS, type CommandLogEntry } from './CoachCommandCenter.data';
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
import {
  buildCommandRouteContext,
  buildEffectiveRouteContext,
  buildRouteContext,
  buildRouteClientLabel,
  buildWorkflowReturnLabel,
  getScheduledSessionRouteContextFromSearchParams,
  normalizeCommandCenterReturnTo,
  parseRouteClientId,
  readHistoricalImportRouteDraft,
} from './CoachCommandCenter.routeContext';
import { useCoachBrowserSpeechInput } from './hooks/useCoachBrowserSpeechInput';
import type { DrawerSide } from './CoachCommandCenter.types';

function resolveVoiceCommandText(next: SetStateAction<string>, current: string): string {
  const nextValue = typeof next === 'function' ? next(current) : next;
  return nextValue === '' ? current : nextValue;
}

function capturedVoiceText(current: string, captured: string): string {
  return current.trim() ? current : captured;
}

export function useCoachCommandCenterController() {
  const [searchParams] = useSearchParams();
  const chat = useAIChat();
  const { cancelCommand, confirmCommand, executeCommand } = useCoachCommand();
  const coachQueue = useCoachIntakeQueue({ scope: 'actionable', limit: 12 });
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [commandText, setCommandText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('No coach thread selected');
  const [threadSearch, setThreadSearch] = useState('');
  const [logs, setLogs] = useState<CommandLogEntry[]>(INITIAL_COMMAND_LOGS);
  const [teachMode, setTeachMode] = useState(true);
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

  const activeThread = useMemo(
    () => coachThreads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, coachThreads],
  );
  const activeThreadTitle = getConversationTitle(activeThread);
  const searchKey = searchParams.toString();
  const routeClientId = useMemo(
    () => parseRouteClientId(searchParams.get('clientId')),
    [searchKey],
  );
  const routeIntent = searchParams.get('intent');
  const routeSource = searchParams.get('source');
  const routeDraftKey = searchParams.get('draftKey');
  const autoSelectedThread = useMemo(
    () => pickAutoSelectedThread(coachThreads, routeIntent, routeClientId, activeThreadId),
    [activeThreadId, coachThreads, routeClientId, routeIntent],
  );
  const workflowReturnTo = useMemo(
    () => normalizeCommandCenterReturnTo(searchParams.get('returnTo')),
    [searchKey],
  );
  const workflowReturnLabel = buildWorkflowReturnLabel(workflowReturnTo, routeSource);
  const routeClientLabel = buildRouteClientLabel(routeClientId);
  const scheduledSessionContext = useMemo(
    () => getScheduledSessionRouteContextFromSearchParams(searchParams),
    [searchKey],
  );
  const routeContext = useMemo(
    () => buildRouteContext(routeIntent, routeClientLabel, scheduledSessionContext),
    [routeClientLabel, routeIntent, scheduledSessionContext],
  );
  const storedRouteDraft = useMemo(
    () => readHistoricalImportRouteDraft(routeIntent, routeDraftKey),
    [routeDraftKey, routeIntent, searchKey],
  );
  const effectiveRouteContext = useMemo(
    () => buildEffectiveRouteContext(routeContext, storedRouteDraft, routeClientLabel),
    [routeClientLabel, routeContext, storedRouteDraft],
  );
  const commandRouteContext = useMemo(
    () => buildCommandRouteContext(routeIntent, scheduledSessionContext),
    [routeIntent, scheduledSessionContext],
  );
  const clientContextTiles = useMemo(
    () => buildClientContextTiles(Boolean(routeClientId), Boolean(activeThread)),
    [activeThread, routeClientId],
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
  const selectedClientLabel = buildSelectedClientLabel(routeClientLabel, activeThreadTitle, Boolean(activeThread));
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
  const setVoiceCommandText = useCallback((next: SetStateAction<string>) => {
    setCommandText((current) => resolveVoiceCommandText(next, current));
  }, []);
  const handleVoiceCaptured = useCallback((text: string) => {
    setCommandText((current) => capturedVoiceText(current, text));
    setSelectedStatus('Voice command captured - press Prepare to review');
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
    commandText,
    commandTextRef,
    confirmCommand,
    executeCommand,
    lastDrawerTriggerRef,
    plaudReviewRef,
    quickClientName,
    quickClientSource,
    routeClientId,
    routeClientLabel,
    routeCommandContext: commandRouteContext,
    routeContextPrompt: effectiveRouteContext.prompt,
    routeIntent,
    routeRequestContext: scheduledSessionContext,
    setActiveThreadId,
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
    activeThreadId,
    clientContextTiles,
    coachQueue,
    coachThreads,
    commandFormRef,
    commandText,
    commandTextRef,
    closeDrawer: actions.closeDrawer,
    dossierTiles,
    drawer,
    handleAttach: actions.handleAttach,
    handleCancelCommand: actions.handleCancelCommand,
    handleConfirmCommand: actions.handleConfirmCommand,
    handleNewThread: actions.handleNewThread,
    handleQuickClientSubmit: actions.handleQuickClientSubmit,
    handleReadback: actions.handleReadback,
    handleStartPlaudUpload: actions.handleStartPlaudUpload,
    handleSubmit: actions.handleSubmit,
    handleThreadSelect: actions.handleThreadSelect,
    handleVoice,
    handleWorkflowSelect: actions.handleWorkflowSelect,
    initialReviewMergeRequestId,
    intakeStates,
    leftRailRef,
    logs,
    openDrawer: actions.openDrawer,
    plaudReviewRef,
    queueHealthRows,
    quickClientBusy,
    quickClientError,
    quickClientMessage,
    quickClientName,
    quickClientSource,
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
