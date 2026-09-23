import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AI_CHAT_MESSAGE_MAX_CHARS } from '../../../../hooks/aiMessageLimits';
import { isAllowedRawRole } from '../../../../hooks/coachPublicationScope';
import { useCoachIntakeQueue } from '../../../../hooks/useCoachIntakeQueue';
import { useAIChat } from '../../../../hooks/useAIChat';
import { useCoachCommand } from '../../../../hooks/useCoachCommand';
import type { CoachCommandClientSource } from '../../../../services/coachCommandClientService';
import { parsePlaudMergeRequestId } from '../../../../utils/plaudRouteGuards';
import { createCoachCommandCenterActions } from './CoachCommandCenter.actions';
import { useSupersedeCoachSendsOnScope } from './coachSendSequence';
import { useApplyRouteContextPrompt, useAutoSelectCoachThread, useCoachGuidePrompt, useCoachWorkoutPlannerRoute, useLoadCoachConversations, useLoadRoutedCoachThread, usePlaudReviewScroll } from './CoachCommandCenter.controllerEffects';
import { useCoachCommandCenterSelection } from './hooks/useCoachCommandCenterSelection';
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
  displaySelectedStatus,
  getConversationTitle,
  pickAutoSelectedThread,
  pickInitialReviewMergeRequestId,
  pickRouteReviewNextMergeRequestId,
  selectedClientLabel as buildSelectedClientLabel,
  shouldScrollPlaudReview,
  toggleBoolean,
} from './CoachCommandCenter.logic';
import { buildChatRouteRequestContext, buildCommandRouteContext, buildEffectiveRouteContext, buildRouteClientLabel, buildRouteContext, buildTeachPromptRouteContext, buildThreadSelectionSearchParams, buildWorkflowReturnLabel, getScheduledSessionRouteContextFromSearchParams, normalizeCommandCenterReturnTo, parseRouteClientId, parseRouteThreadId, readHistoricalImportRouteDraft } from './CoachCommandCenter.routeContext';
import type { CoachCommandRole } from './CoachCommandCenter.roleConfig';
import { useCoachCommandCenterPendingFood } from './hooks/useCoachCommandCenterPendingFood';
import { useCoachComposerDraft } from './hooks/useCoachComposerDraft';
import { useCoachClientNotebook } from './hooks/useCoachClientNotebook';
import { useCoachPinnedClient } from './hooks/useCoachPinnedClient';
import type { DrawerSide } from './CoachCommandCenter.types';
import { useCoachCommandVoiceCapture } from './CoachCommandCenter.voiceCapture';
import { usePremiumTTS } from './hooks/usePremiumTTS';
import { commandInputMode, useCoachInputOrigin } from '../../../../hooks/useCoachInputOrigin';
export function useCoachCommandCenterController({
  actorId, userRole = 'admin', rawRole,
}: { actorId?: string | number | null; userRole?: CoachCommandRole; rawRole?: string | null } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRouteThreadId = parseRouteThreadId(searchParams.get('threadId'));
  const [activeThreadId, setActiveThreadId] = useState<number | null>(initialRouteThreadId);
  // Plan 55 §3 C3 — the metadata-only selection adapter is mounted BEFORE the
  // transports, so every one of them is constructed with the SAME live
  // publication binding. `rawRole` is the ACTUAL authenticated role, passed
  // separately from the `userRole` presentation/audience role.
  const { selection, binding } = useCoachCommandCenterSelection({ actorId, rawRole, audienceRole: userRole, setActiveThreadId });
  const chat = useAIChat(userRole, binding);
  const { cancelCommand, confirmCommand, executeCommand, executingCommand } = useCoachCommand(binding);
  const tts = usePremiumTTS(binding);
  // N5 (GLM round 2): the RAW role must be recognised too. Presentation alone let
  // an unrecognised actor ('ghost' -> 'admin') reach staff surfaces. The fence is
  // role-shaped, not publication-shaped: this queue is PRE-selection discovery, so
  // gating it on the binding borrows the wrong fence and would blink it off during
  // admission windows. Full reasoning in the register's N5 entry.
  const operatorEnabled = userRole !== 'client' && isAllowedRawRole(rawRole);
  const coachQueue = useCoachIntakeQueue({ scope: 'actionable', limit: 12, enabled: operatorEnabled });
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
  const shellRef = useRef<HTMLDivElement>(null);
  const commandFormRef = useRef<HTMLFormElement>(null); const commandTextRef = useRef<HTMLTextAreaElement>(null);
  const { inputOrigin, setInputOrigin, setTrackedCommandText } = useCoachInputOrigin(setCommandText); const leftRailRef = useRef<HTMLElement>(null);
  const rightRailRef = useRef<HTMLElement>(null);
  const plaudReviewRef = useRef<HTMLElement>(null);
  const lastDrawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const coachThreads = useMemo(
    () => buildCoachThreads(chat.conversations, threadSearch, userRole),
    [chat.conversations, threadSearch, userRole],
  );
  const allCoachThreads = useMemo(
    () => buildCoachThreads(chat.conversations, '', userRole),
    [chat.conversations, userRole],
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
  const clientPin = useCoachPinnedClient({ activeThreadClientId, chat, routeClientId, routeThreadId, searchParams,
    setActiveThreadId, setAutoSelectSuppressed, setSearchParams, setSelectedStatus, userRole });
  const effectiveClientId = clientPin.effectiveClientId;
  const rawRouteIntent = searchParams.get('intent');
  const routeIntent = rawRouteIntent === 'client_onboarding' && routeClientId
    ? 'client_profile_coverage_update'
    : rawRouteIntent;
  const routeSource = searchParams.get('source');
  const routeDraftKey = searchParams.get('draftKey');
  // Bound staff land on a new chat: an auto-picked thread is highlighted but refused (brain-v4 #3).
  const autoSelectedThread = useMemo(
    () => autoSelectSuppressed || binding ? null : pickAutoSelectedThread(allCoachThreads, routeIntent, effectiveClientId, activeThreadId),
    [activeThreadId, allCoachThreads, autoSelectSuppressed, binding, effectiveClientId, routeIntent],
  );
  const workflowReturnTo = useMemo(
    () => normalizeCommandCenterReturnTo(searchParams.get('returnTo') || searchParams.get('sourcePath'), userRole),
    [searchKey, userRole],
  );
  const workflowReturnSource = routeSource
    || (workflowReturnTo?.startsWith('/dashboard/client/') ? 'client-dashboard' : null);
  const workflowReturnLabel = buildWorkflowReturnLabel(workflowReturnTo, workflowReturnSource);
  const workoutPlannerRoute = useCoachWorkoutPlannerRoute({ userRole, selectedClientId: effectiveClientId, workflowReturnTo, searchParams });
  const routeClientLabel = buildRouteClientLabel(routeClientId);
  const effectiveClientLabel = clientPin.selectedClientName || routeClientLabel || buildRouteClientLabel(activeThreadClientId);
  const routeTeachPrompt = searchParams.get('teachPrompt')?.trim().slice(0, AI_CHAT_MESSAGE_MAX_CHARS) || null;
  const scheduledSessionContext = useMemo(() => getScheduledSessionRouteContextFromSearchParams(searchParams), [searchKey]);
  const routeContext = useMemo(
    () => routeTeachPrompt
      ? buildTeachPromptRouteContext(routeTeachPrompt, routeIntent)
      : buildRouteContext(routeIntent, routeClientLabel, scheduledSessionContext),
    [routeClientLabel, routeIntent, routeTeachPrompt, scheduledSessionContext],
  );
  const storedRouteDraft = useMemo(() => readHistoricalImportRouteDraft(routeIntent, routeDraftKey), [routeDraftKey, routeIntent, searchKey]);
  const effectiveRouteContext = useMemo(() => buildEffectiveRouteContext(routeContext, storedRouteDraft, routeClientLabel), [routeClientLabel, routeContext, storedRouteDraft]);
  const commandRouteContext = useMemo(() => buildCommandRouteContext(routeIntent, scheduledSessionContext), [routeIntent, scheduledSessionContext]);
  const chatRouteRequestContext = useMemo(
    () => buildChatRouteRequestContext(routeIntent, routeSource, scheduledSessionContext),
    [routeIntent, routeSource, scheduledSessionContext],
  );
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
    () => buildStatusMetrics(summary, coachQueue.health?.status, coachQueue.isLoading, coachQueue.health?.nextOperatorAction?.label),
    [coachQueue.health?.nextOperatorAction?.label, coachQueue.health?.status, coachQueue.isLoading, summary],
  );
  const intakeStates = useMemo(() => buildIntakeStates(summary), [summary]);
  const dossierTiles = useMemo(() => buildDossierTiles(initialReviewMergeRequestId, selectedClientLabel, summary), [initialReviewMergeRequestId, selectedClientLabel, summary]);
  const queueHealthRows = useMemo(() => buildQueueHealthRows(summary), [summary]);
  const rightRailItems = useMemo(() => buildRightRailItems(coachQueue.items), [coachQueue.items]);
  const handleGuidePrompt = useCoachGuidePrompt(setCommandText, setSelectedStatus, commandTextRef);
  const voiceCapture = useCoachCommandVoiceCapture({ commandTextRef, setCommandText, setInputOrigin, setSelectedStatus, speechOutputStop: tts.stop, binding });
  const notebook = useCoachClientNotebook({ actorId, clientId: effectiveClientId, clientLabel: selectedClientLabel,
    commandText, commandTextRef, setCommandText, setSelectedStatus, binding });
  const sendMessageWithFood = useCoachCommandCenterPendingFood({ chat, targetClientId: effectiveClientId, binding });
  useCoachComposerDraft(activeThreadId, commandText, setCommandText, { actorId, clientId: effectiveClientId, binding },
    !notebook.dockControls.active);
  const actions = createCoachCommandCenterActions({
    activeThread,
    activeThreadTitle,
    cancelCommand,
    chat,
    coachQueue,
    clientFacing: userRole === 'client',
    commandLaneEnabled: operatorEnabled,
    commandText,
    inputMode: commandInputMode(inputOrigin),
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
    routeRequestContext: chatRouteRequestContext,
    isBusy: () => chat.sending || executingCommand,
    speakCoachReply: tts.speak,
    workoutPlannerRoute,
    onThreadSelectRoute: (thread) => setSearchParams(buildThreadSelectionSearchParams(searchParams, thread.targetUserId, thread.id), { replace: true }),
    onNewThreadRoute: () => setSearchParams(buildThreadSelectionSearchParams(searchParams, effectiveClientId, null), { replace: true }),
    setActiveThreadId,
    setAutoSelectSuppressed,
    setCommandText: setTrackedCommandText,
    setDrawer,
    setLogs,
    setQuickClientBusy,
    setQuickClientError,
    setQuickClientMessage,
    setQuickClientName,
    setSelectedStatus,
  });
  useLoadCoachConversations(chat, selection.phase);
  useLoadRoutedCoachThread(routeThreadId, allCoachThreads, chat, setActiveThreadId, setSelectedStatus, selection, selection.accepted?.threadId ?? null);
  useAutoSelectCoachThread(autoSelectedThread, chat, setActiveThreadId, setSelectedStatus);
  useApplyRouteContextPrompt(effectiveRouteContext, searchKey, setActiveThreadId, setSelectedStatus, setTrackedCommandText);
  usePlaudReviewScroll(shouldScrollPlaudReview(plaudWorkspaceRequested, rawMergeRequestId, reviewNextRequested), searchKey, plaudReviewRef);
  // Review #4: a client switch or re-admission supersedes a send still in flight.
  useSupersedeCoachSendsOnScope(commandTextRef, `${effectiveClientId ?? ''}:${selection.accepted?.generation ?? ''}`);
  return {
    activeIntakeId: searchParams.get('intake'),
    activeThread,
    activeThreadId,
    allCoachThreads,
    chatLoading: chat.loading,
    clientContextTiles,
    clientPin: clientPin.barProps,
    coachQueue,
    coachThreads,
    commandBusy: chat.sending || executingCommand,
    commandFormRef,
    commandText,
    commandTextRef,
    closeDrawer: actions.closeDrawer,
    dossierTiles,
    drawer,
    publicationBinding: binding,
    handleReviewIntake: actions.handleReviewIntake,
    handleIntentSubmit: actions.handleIntentSubmit,
    handleCancelCommand: actions.handleCancelCommand,
    handleConfirmCommand: actions.handleConfirmCommand,
    handleGuidePrompt,
    handleNewThread: actions.handleNewThread,
    handleQuickClientSubmit: actions.handleQuickClientSubmit,
    handleReadback: actions.handleReadback,
    handleRetryMessage: actions.handleRetryMessage,
    handleStartPlaudUpload: actions.handleStartPlaudUpload,
    handleSubmit: notebook.dockControls.active ? notebook.handleSubmit : actions.handleSubmit,
    handleThreadSelect: actions.handleThreadSelect,
    handleVoice: voiceCapture.handleVoice,
    initialReviewMergeRequestId,
    intakeStates,
    leftRailRef,
    logs: transcriptLogs,
    notebook: notebook.dockControls,
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
    selection,
    selectionPhase: selection.phase,
    selectedStatus: displaySelectedStatus(voiceCapture.voiceStatus, selectedStatus),
    sendMessageWithFood,
    inputMode: commandInputMode(inputOrigin), setCommandText: setTrackedCommandText,
    setQuickClientName,
    setQuickClientSource,
    setTeachMode,
    setThreadSearch,
    shellRef,
    speakText: tts.speak,
    statusMetrics,
    summary,
    teachMode,
    threadSearch,
    toggleTeachMode: () => setTeachMode(toggleBoolean),
    toggleVoiceReplies: tts.toggleEnabled,
    voiceActive: voiceCapture.voiceActive,
    voiceCaptureMode: voiceCapture.voiceCaptureMode,
    voiceOverlay: voiceCapture.voiceOverlay,
    voiceReplyEnabled: tts.enabled,
    voiceReplySpeaking: tts.speaking,
    voiceSupported: voiceCapture.voiceSupported,
    workflowReturnLabel,
    workflowReturnTo,
  };
}
