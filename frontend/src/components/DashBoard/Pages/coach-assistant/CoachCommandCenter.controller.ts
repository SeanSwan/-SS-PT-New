import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AI_CHAT_MESSAGE_MAX_CHARS } from '../../../../hooks/aiMessageLimits';
import { useCoachIntakeQueue } from '../../../../hooks/useCoachIntakeQueue';
import { useAIChat } from '../../../../hooks/useAIChat';
import { useCoachCommand } from '../../../../hooks/useCoachCommand';
import type { CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import { parsePlaudMergeRequestId } from '../../../../utils/plaudRouteGuards';
import { createCoachCommandCenterActions } from './CoachCommandCenter.actions';
import { INITIAL_COMMAND_LOGS, type CommandLogEntry } from './CoachCommandCenter.data';
import {
  buildClientContextTiles,
  buildDossierTiles,
  buildIntakeStates,
  buildQueueHealthRows,
  buildQueueSummary,
  buildRightRailItems,
  buildRouteContext,
  buildStatusMetrics,
  getConversationTitle,
  parseRouteClientId,
  pickReviewNextMergeRequestId,
} from './CoachCommandCenter.logic';
import { useCoachBrowserSpeechInput } from './hooks/useCoachBrowserSpeechInput';
import type { DrawerSide } from './CoachCommandCenter.types';

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

  const coachThreads = useMemo(() => {
    const threads = Array.isArray(chat.conversations) ? chat.conversations : [];
    const query = threadSearch.trim().toLowerCase();
    const coachOnly = threads.filter((thread) => !thread.context || thread.context === 'coach_assistant');
    if (!query) return coachOnly;
    return coachOnly.filter((thread) => {
      const title = getConversationTitle(thread).toLowerCase();
      return title.includes(query) || thread.context?.toLowerCase().includes(query);
    });
  }, [chat.conversations, threadSearch]);

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
  const routeClientLabel = routeClientId ? `Client #${routeClientId}` : null;
  const routeContext = useMemo(
    () => buildRouteContext(routeIntent, routeClientLabel),
    [routeClientLabel, routeIntent],
  );
  const clientContextTiles = useMemo(
    () => buildClientContextTiles(Boolean(routeClientId), Boolean(activeThread)),
    [activeThread, routeClientId],
  );

  const rawMergeRequestId = searchParams.get('mergeRequestId');
  const directMergeRequestId = parsePlaudMergeRequestId(rawMergeRequestId);
  const reviewNextRequested = searchParams.get('review') === 'next';
  const plaudWorkspaceRequested = searchParams.get('workspace') === 'plaud';
  const reviewNextMergeRequestId = reviewNextRequested || plaudWorkspaceRequested
    ? pickReviewNextMergeRequestId(coachQueue.items)
    : null;
  const initialReviewMergeRequestId = directMergeRequestId || reviewNextMergeRequestId || undefined;
  const summary = useMemo(() => buildQueueSummary(coachQueue.summary), [coachQueue.summary]);
  const selectedClientLabel = routeClientLabel || (activeThread ? activeThreadTitle : 'Selected client');
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
    setCommandText((current) => {
      const nextValue = typeof next === 'function' ? next(current) : next;
      return nextValue === '' ? current : nextValue;
    });
  }, []);
  const handleVoiceCaptured = useCallback((text: string) => {
    setCommandText((current) => current.trim() ? current : text);
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
    routeIntent,
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
    if (!speech.speechSupported) {
      setSelectedStatus('Voice input is not available in this browser');
      return;
    }
    if (speech.cancelPillVisible) {
      speech.handleCancelSend();
      setSelectedStatus('Voice command cancelled');
      return;
    }
    speech.toggleListening();
  }, [speech.cancelPillVisible, speech.handleCancelSend, speech.speechSupported, speech.toggleListening]);

  useEffect(() => {
    void chat.listConversations('active', true);
    // Load once on route mount; the hook owns its cache afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (routeIntent || routeClientId || activeThreadId !== null || coachThreads.length === 0) return;
    const firstThread = coachThreads[0];
    setActiveThreadId(firstThread.id);
    setSelectedStatus(`${getConversationTitle(firstThread)} - thread ready`);
  }, [activeThreadId, coachThreads, routeClientId, routeIntent]);

  useEffect(() => {
    if (!routeContext.prompt || !routeContext.status) return;
    setActiveThreadId(null);
    setSelectedStatus(routeContext.status);
    setCommandText((current) => current.trim() ? current : routeContext.prompt || '');
  }, [routeContext.prompt, routeContext.status, searchKey]);

  useEffect(() => {
    if (!plaudWorkspaceRequested && !rawMergeRequestId && !reviewNextRequested) return undefined;
    const timer = window.setTimeout(() => {
      plaudReviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      plaudReviewRef.current?.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [plaudWorkspaceRequested, rawMergeRequestId, reviewNextRequested, searchKey]);

  const voiceStatus = voiceInputError
    || (speech.interim ? `Listening: ${speech.interim}` : null)
    || (speech.cancelPillVisible ? 'Voice command captured - tap Mic to cancel before it lands in the composer' : null);

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
    selectedStatus: voiceStatus || selectedStatus,
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
    toggleTeachMode: () => setTeachMode((current) => !current),
    voiceActive: speech.listening,
    voiceSupported: speech.speechSupported,
  };
}
