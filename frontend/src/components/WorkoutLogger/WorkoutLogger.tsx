import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Download, Timer, History, UploadCloud, Mic } from 'lucide-react';
import LoggerDictationStrip from './LoggerDictationStrip';
import { useWorkoutLoggerDictation } from './useWorkoutLoggerDictation';
import { useLastWeightSuggestions } from './useLastWeightSuggestions';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExerciseEntry, ExerciseSet } from '../../services/nasmApiService';
import type { DailyWorkoutForm } from '../../services/nasmApiService';
import EquipmentProfilePicker from '../Shared/EquipmentProfilePicker';
import '../../utils/aiWorkoutEvents';
import '../../utils/workoutLoggedEvent';
import { exportWorkoutLoggerPDF } from '../../services/pdfExportService';

import { MINUTES_PER_SET, MAX_WORKOUT_DURATION } from './WorkoutLoggerCS';
import {
  AddExerciseButton,
  BalanceProtocolIcon,
  CenteredLoader,
  CooldownProtocolIcon,
  ExerciseSearchBar,
  ExerciseSection,
  LoadPlanButton,
  LoadPlanRow,
  LoadingSpinner,
  RolodexTrigger,
  TimerFAB,
  WarmupProtocolIcon,
  WorkoutLoggerContainer,
} from './WorkoutLogger.styles';
import { LiveRegion } from './WorkoutLoggerStatus.styles';
import WorkoutLoggerHeader from './WorkoutLoggerHeader';
import WorkoutLoggerModeBar from './WorkoutLoggerModeBar';
import WorkoutLoggerCoachTerminal from './WorkoutLoggerCoachTerminal';
import SessionSummaryForm from './SessionSummaryForm';
import ScheduledSessionStatusBanner from './ScheduledSessionStatusBanner';
import ActivePlanContextStrip from './ActivePlanContextStrip';
import WorkoutPlanAssignmentPicker from './WorkoutPlanAssignmentPicker';
import './WorkoutLogger.submitReceipt';
import WorkoutLoggerChallengeReceipt from './WorkoutLoggerChallengeReceipt';
import SaveSuccessPanel from './SaveSuccessPanel';
import WorkoutLoggerHandoffMount from './handoff/WorkoutLoggerHandoffMount';
import './workoutLoggerSubmitPayload';
import './WorkoutLogger.submitGuard';
import WorkoutLoggerFooter from './WorkoutLoggerFooter';
import WorkoutLoggerLensFrame from './WorkoutLoggerLensFrame';
import WorkoutLoggerConfirmDialog, { type WorkoutLoggerConfirmRequest } from './WorkoutLoggerConfirmDialog';
import WorkoutLoggerVoiceImportSection from './WorkoutLoggerVoiceImportSection';
import NASMExerciseRolodex from './NASMExerciseRolodex';
import type { ExerciseSlim } from './useExerciseSearch';
import CompactProtocolSection, {
  type ProtocolSectionKey,
  type ProtocolSelection,
} from './CompactProtocolSection';
import {
  getRecommendedProtocolItems,
  type NASMDefaultItem,
} from './NASMProtocolDefaults';
import { NASMLearningProvider, LearningModeToggle } from './NASMLearningMode';
import NASMPhaseGuide from './NASMPhaseGuide';
import { getPhaseTemplate } from './NASMPhaseTemplates';
import { buildPhaseTemplateEntries, templateIdsToSelections } from './WorkoutLogger.phaseTemplate';
import { useWorkoutDraft, hasStoredWorkoutDraft } from './useWorkoutDraft';
import WorkoutDraftGateBanner, { type WorkoutDraftGate } from './WorkoutDraftGateBanner';
import { toggleSupersetLink, renumberSupersetGroups } from './WorkoutLogger.supersets';
import FloatingRestTimer from './FloatingRestTimer';
import type {
  WorkoutLoggerExerciseOption,
  WorkoutLoggerProps,
} from './WorkoutLogger.localTypes';
import { coerceToNumericId, ensureWorkoutLoggerExerciseRowIdentity, ensureWorkoutLoggerSetId, hasIncompleteWorkoutSets, normalizeWorkoutDate, isSelfLoggingDashboardRole } from './WorkoutLogger.helpers';
import RunnerCollection from './runner/RunnerCollection';
import { useRunnerEngine } from './runner/useRunnerEngine';
import { writeRunnerStyle } from './runner/runnerStyles';
import { buildWorkoutLoggerPdfPayload } from './WorkoutLogger.pdf';

import { useGhostPreFill } from './useGhostPreFill';
import { reapplyGhostPreFill } from './WorkoutLogger.ghostReapply';
import { useSessionStats } from './useSessionStats';
import { useOfflineQueue } from './useOfflineQueue';
import SessionStatsBar from './SessionStatsBar';
import StickyLogActionBar from './StickyLogActionBar';
import { readQuickLogPreference, writeQuickLogPreference } from './WorkoutLogger.preferences';
import { useRestTimer } from './useRestTimer';
import { useWorkoutAiEvents } from './useWorkoutAiEvents';
import { useWorkoutSubmit } from './useWorkoutSubmit';
import { useWorkoutPlanLoading } from './useWorkoutPlanLoading';

const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({
  clientId,
  onComplete,
  onCancel,
  forceSelfMode = false,
  initialData = [],
  loadTodayPlanSignal = 0,
  scheduledSessionCreditHint = null,
  scheduledSessionId = null,
  scheduledSessionDate = null,
  onOpenHistoryImport,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoLoadTodayPlan = searchParams.get('loadPlan') === 'today';
  const routeAssignmentKey = searchParams.get('assignmentKey');
  const routeAssignmentType = searchParams.get('assignmentType');
  // Slice 11 deep-link: /progress smart targets land here with the exercise
  // pre-queried; an exact match auto-adds (see useRolodexDeepLink).
  const routeExercise = searchParams.get('exercise');
  const hasInitialExercises = Array.isArray(initialData) && initialData.length > 0;

  const userNumericId = coerceToNumericId(user?.id);
  const allowSelfMode = isSelfLoggingDashboardRole(user?.role) || forceSelfMode;
  const effectiveClientId: number | undefined =
    typeof clientId === 'number' && Number.isFinite(clientId)
      ? clientId
      : (allowSelfMode ? userNumericId : undefined);
  // AI_* logger commands are admin/trainer only — no Dictate surface for client/user roles (R1).
  const canDictate = user?.role === 'admin' || user?.role === 'trainer';
  const dictation = useWorkoutLoggerDictation({ clientId: effectiveClientId ?? null });
  const isClientSelfMode: boolean =
    allowSelfMode &&
    typeof effectiveClientId === 'number' &&
    effectiveClientId === userNumericId;
  const workoutDateValue = scheduledSessionDate
    ? normalizeWorkoutDate(scheduledSessionDate)
    : normalizeWorkoutDate(null);

  // C4a: a stored draft BEATS ?loadPlan=today — synchronous peek (no effect-
  // order race); the plan auto-loads only after an explicit discard.
  const [draftGate, setDraftGate] = useState<WorkoutDraftGate>(() => (
    hasStoredWorkoutDraft(userNumericId, effectiveClientId, workoutDateValue) ? 'pending' : 'none'
  ));

  const resolvedOnComplete = onComplete ?? ((formData: DailyWorkoutForm) => {
    navigate('/dashboard/client/workouts', {
      state: { workoutChallengeProgress: formData.challengeProgress ?? null },
    });
  });
  const resolvedOnCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate('/dashboard/client/overview');
  }, [navigate, onCancel]);

  const [confirmRequest, setConfirmRequest] = useState<WorkoutLoggerConfirmRequest | null>(null);
  const [exercises, setExercises] = useState<ExerciseEntry[]>(() => {
    if (initialData && Array.isArray(initialData) && initialData.length > 0) {
      return (initialData as ExerciseEntry[]).map((exercise) =>
        ensureWorkoutLoggerExerciseRowIdentity(exercise)
      );
    }
    return [];
  });
  const exercisesRef = useRef<ExerciseEntry[]>(exercises);
  const { getLastWeight } = useLastWeightSuggestions({ clientId: effectiveClientId ?? null, exercises });
  const [sessionNotes, setSessionNotes] = useState('');
  /* Phase 16: null overallIntensity means not rated; save omits untouched ratings. */
  const [overallIntensity, setOverallIntensity] = useState<number | null>(null);
  const [equipmentProfileId, setEquipmentProfileId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const autoLoadTodayPlanRef = useRef<string | null>(null);
  const pendingAiPlanPrefillLoadedRef = useRef(false);
  const workoutLoggerLocalIdCounterRef = useRef(0);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  // One-shot deep link: consumed by the first select OR the first close, so
  // manual re-opens never surprise-add while ?exercise= lingers in the URL.
  const [deepLinkExercise, setDeepLinkExercise] = useState<string | null>(routeExercise);
  const routeExerciseOpenedRef = useRef(false);
  useEffect(() => {
    if (routeExercise && !routeExerciseOpenedRef.current) {
      routeExerciseOpenedRef.current = true;
      setShowExerciseSearch(true);
    }
  }, [routeExercise]);
  const [showFloatingTimer, setShowFloatingTimer] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [submittedFormId, setSubmittedFormId] = useState<string | null>(null);
  const [lastChallengeProgress, setLastChallengeProgress] = useState<DailyWorkoutForm['challengeProgress'] | null>(null);
  // Phase 2.1a: saved form powers SaveSuccessPanel; onComplete deferred to Done.
  const [lastSaveResponse, setLastSaveResponse] = useState<DailyWorkoutForm | null>(null);
  const [currentOPTPhase, setCurrentOPTPhase] = useState(1);
  const [isQuickLogMode, setIsQuickLogMode] = useState(readQuickLogPreference);

  const hookClientId = effectiveClientId ?? 0;
  const ghostPreFill = useGhostPreFill(hookClientId, { skip: isClientSelfMode });
  const sessionStats = useSessionStats(exercises);
  const offlineQueue = useOfflineQueue(hookClientId);
  const restTimer = useRestTimer({
    defaultSeconds: 60,
    onComplete: () => toast.info('Rest complete - next set!'),
  });

  const [selectedWarmup, setSelectedWarmup] = useState<ProtocolSelection[]>([]);
  const [selectedBalanceCore, setSelectedBalanceCore] = useState<ProtocolSelection[]>([]);
  const [selectedCooldown, setSelectedCooldown] = useState<ProtocolSelection[]>([]);
  const [nasmSectionsOpen, setNasmSectionsOpen] = useState<Record<ProtocolSectionKey, boolean>>({
    warmup: false,
    balance_core: false,
    cooldown: false,
  });

  const [pendingSectionContext, setPendingSectionContext] = useState<ProtocolSectionKey | null>(null);

  // Phase 3c.1: in-gym autosave — draft persists per user+client+date, restored on remount.
  const workoutDraft = useWorkoutDraft({
    userId: userNumericId,
    clientId: effectiveClientId,
    date: workoutDateValue,
    exercises,
    sessionNotes,
    overallIntensity,
    enabled: !hasInitialExercises && !lastSaveResponse,
  });

  useEffect(() => {
    exercisesRef.current = exercises;
  }, [exercises]);

  const createWorkoutLoggerLocalId = useCallback((prefix: string) => {
    const nextId = workoutLoggerLocalIdCounterRef.current;
    workoutLoggerLocalIdCounterRef.current += 1;
    return `${prefix}-local-${Date.now()}-${nextId}`;
  }, []);

  const toggleNasmSection = useCallback((key: ProtocolSectionKey) =>
    setNasmSectionsOpen(prev => ({ ...prev, [key]: !prev[key] })), []);

  const protocolSectionSetters: Record<
    ProtocolSectionKey,
    React.Dispatch<React.SetStateAction<ProtocolSelection[]>>
  > = {
    warmup: setSelectedWarmup,
    balance_core: setSelectedBalanceCore,
    cooldown: setSelectedCooldown,
  };

  const addProtocolPreset = useCallback(
    (section: ProtocolSectionKey, item: NASMDefaultItem) => {
      const setter = protocolSectionSetters[section];
      const entry: ProtocolSelection = {
        id: item.id,
        name: item.name,
        source: 'preset',
        category: item.category,
      };
      setter((prev) => (prev.some((p) => p.id === entry.id) ? prev : [...prev, entry]));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const addProtocolFromRolodex = useCallback(
    (section: ProtocolSectionKey, exercise: ExerciseSlim) => {
      const setter = protocolSectionSetters[section];
      const id = `rolodex-${exercise.id}`;
      const entry: ProtocolSelection = {
        id,
        name: exercise.name,
        source: 'rolodex',
      };
      setter((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, entry]));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const removeProtocolItem = useCallback(
    (section: ProtocolSectionKey, id: string) => {
      const setter = protocolSectionSetters[section];
      setter((prev) => prev.filter((p) => p.id !== id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const requestAddForSection = useCallback((section: ProtocolSectionKey) => {
    setPendingSectionContext(section);
    setShowExerciseSearch(true);
    setNasmSectionsOpen((prev) => ({ ...prev, [section]: true }));
  }, []);

  const loadPhaseTemplate = useCallback((phase: number) => {
    const template = getPhaseTemplate(phase);
    if (!template) return;

    const templateExercises = buildPhaseTemplateEntries(template, phase, createWorkoutLoggerLocalId);
    setSelectedWarmup(templateIdsToSelections(template.warmupIds));
    setSelectedBalanceCore(templateIdsToSelections(template.balanceCoreIds));
    setSelectedCooldown(templateIdsToSelections(template.cooldownIds));

    setExercises(templateExercises);
    setCurrentOPTPhase(phase);
    toast.success(`Loaded Phase ${phase} template - ${templateExercises.length} exercises, ${templateExercises.reduce((s, e) => s + e.sets.length, 0)} sets`);
  }, [createWorkoutLoggerLocalId]);

  const { handleVoiceMemoParsed } = useWorkoutAiEvents({
    effectiveClientId,
    createWorkoutLoggerLocalId,
    exercisesRef,
    setExercises,
    setSessionNotes,
    setOverallIntensity,
    loadPhaseTemplate,
    currentOPTPhase,
    protocolSectionSetters,
    pendingAiPlanPrefillLoadedRef,
  });

  const {
    client,
    handleApplyGeneratedPlanDay,
    handleRepeatLastSession,
    isLoadingPlan,
    isRepeatingSession,
    loadTodaysPlan,
    loadedPlanContext,
    planLoadOutcome,
    plannedAssignment,
  } = useWorkoutPlanLoading({
    autoLoadTodayPlan,
    autoLoadTodayPlanRef,
    blockTodayPlanForDraft: draftGate === 'pending' || draftGate === 'restored',
    createWorkoutLoggerLocalId,
    effectiveClientId,
    hasInitialExercises,
    isClientSelfMode,
    loadTodayPlanSignal,
    pendingAiPlanPrefillLoadedRef,
    routeAssignmentKey,
    routeAssignmentType,
    scheduledSessionId,
    searchParams,
    setExercises,
  });

  const addExercise = useCallback((exercise: WorkoutLoggerExerciseOption | ExerciseSlim) => {
    const loggerExerciseId = createWorkoutLoggerLocalId('exercise');
    if (!isClientSelfMode) {
      Promise.resolve(ghostPreFill.fetchExerciseHistory(exercise.name)).then(() => {
        setExercises(prev => reapplyGhostPreFill(prev, loggerExerciseId, ghostPreFill.getPreFill(exercise.name, 0)));
      });
    }
    const preFilled = ensureWorkoutLoggerSetId(
      ghostPreFill.createPreFilledSet(exercise.name, 1),
      () => createWorkoutLoggerLocalId('set')
    );
    const source = exercise as Partial<ExerciseSlim>;
    const movementPattern = source.nasmMovementPattern?.trim() || undefined;
    const bodyPartCategory = source.bodyPartCategory?.trim() || undefined;
    const exerciseType = source.exerciseType?.trim() || undefined;
    const muscleGroups = [
      ...(Array.isArray(source.primaryMuscles) ? source.primaryMuscles : []),
      ...(Array.isArray(source.secondaryMuscles) ? source.secondaryMuscles : []),
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    const tags = [exerciseType, bodyPartCategory, movementPattern]
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    setExercises(prev => [...prev, {
      loggerExerciseId,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: [preFilled],
      formRating: null,
      painLevel: 0,
      performanceNotes: '',
      ...(movementPattern ? {
        category: movementPattern,
        exerciseFamily: movementPattern,
        movementPattern,
        nasmMovementPattern: movementPattern,
      } : {}),
      ...(bodyPartCategory ? { bodyPartCategory } : {}),
      ...(muscleGroups.length > 0 ? { muscleGroups } : {}),
      ...(tags.length > 0 ? { tags } : {}),
    }]);
    setShowExerciseSearch(false);
    toast.success(`Added ${exercise.name} to workout`);
  }, [createWorkoutLoggerLocalId, ghostPreFill, isClientSelfMode]);

  const addSet = useCallback((exerciseIndex: number) => {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      const preFilled = ensureWorkoutLoggerSetId(
        ghostPreFill.createPreFilledSet(
          exercise.exerciseName,
          exercise.sets.length + 1
        ),
        () => createWorkoutLoggerLocalId('set')
      );
      return { ...exercise, sets: [...exercise.sets, preFilled] };
    }));
  }, [createWorkoutLoggerLocalId, ghostPreFill]);

  /** Phase 6: When a set is logged/confirmed, auto-start rest timer */
  // Reads through exercisesRef so the callback identity survives keystrokes (keeps card memos alive).
  const handleSetLogged = useCallback((exerciseIndex: number, setIndex: number) => {
    restTimer.start(exercisesRef.current[exerciseIndex]?.sets[setIndex]?.restTime || 60);
  }, [restTimer]);
  const [showSetDetails, setShowSetDetails] = useState(false);
  const handleToggleSetDetails = useCallback(() => setShowSetDetails(previous => !previous), []);

  const removeSet = useCallback((exerciseIndex: number, setIndex: number) => {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex || exercise.sets.length <= 1) return exercise;
      const newSets = exercise.sets
        .filter((_, si) => si !== setIndex)
        .map((set, idx) => ({ ...set, setNumber: idx + 1 }));
      return { ...exercise, sets: newSets };
    }));
  }, []);

  const updateSet = useCallback(<K extends keyof ExerciseSet,>(
    exerciseIndex: number,
    setIndex: number,
    field: K,
    value: ExerciseSet[K]
  ) => {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      return {
        ...exercise,
        sets: exercise.sets.map((set, si) =>
          si !== setIndex ? set : { ...set, [field]: value }
        ),
      };
    }));
  }, []);

  const updateExercise = useCallback(<K extends keyof ExerciseEntry,>(
    exerciseIndex: number,
    field: K,
    value: ExerciseEntry[K]
  ) => {
    setExercises(prev => prev.map((exercise, i) =>
      i !== exerciseIndex ? exercise : { ...exercise, [field]: value }
    ));
  }, []);

  const removeExercise = useCallback((exerciseIndex: number) => {
    setExercises(prev => renumberSupersetGroups(prev.filter((_, index) => index !== exerciseIndex)));
    toast.info('Exercise removed from workout');
  }, []);

  const toggleSuperset = useCallback((exerciseIndex: number) =>
    setExercises(prev => toggleSupersetLink(prev, exerciseIndex)), []);

  const handleExportPDF = useCallback(() => {
    if (exercises.length === 0) {
      toast.error('Add exercises before exporting');
      return;
    }
    exportWorkoutLoggerPDF(buildWorkoutLoggerPdfPayload({
      client,
      trainer: user,
      date: workoutDateValue,
      exercises,
      sessionNotes,
      overallIntensity,
    }));
    toast.success('PDF exported');
  }, [exercises, client, user, workoutDateValue, sessionNotes, overallIntensity]);

  // Runner Styles (Swan Lens dimension): one engine, switchable skins.
  const openRolodexForMain = useCallback(() => { setPendingSectionContext(null); setShowExerciseSearch(true); }, []);
  const { engine: runnerEngine, renderClassicList, renderQuickLog } = useRunnerEngine({
    exercises,
    effectiveClientId,
    showSetDetails,
    onToggleSetDetails: handleToggleSetDetails,
    onToggleSuperset: toggleSuperset,
    onUpdateExercise: updateExercise,
    onUpdateSet: updateSet,
    onAddSet: addSet,
    onRemoveSet: removeSet,
    onRemoveExercise: removeExercise,
    ghostPreFill,
    getLastWeight,
    onSetLogged: handleSetLogged,
    ghostSkip: isClientSelfMode,
    stats: sessionStats,
    restTimer,
    openRolodex: openRolodexForMain,
  });

  const { handleGenerateSummary, handleSubmit } = useWorkoutSubmit({
    client,
    effectiveClientId,
    equipmentProfileId,
    exercises,
    isSubmittingRef,
    offlineQueue,
    overallIntensity,
    plannedAssignment,
    scheduledSessionId,
    sessionNotes,
    setIsGeneratingSummary,
    setIsSubmitting,
    setLastChallengeProgress,
    setLastSaveResponse,
    setOverallIntensity,
    setSessionNotes,
    setSubmittedFormId,
    submittedFormId,
    userRole: user?.role,
    workoutDateValue,
    workoutDraft,
  });

  const hasUnsavedWorkout = useMemo(() => (
    exercises.length > 0 ||
    selectedWarmup.length > 0 ||
    selectedBalanceCore.length > 0 ||
    selectedCooldown.length > 0 ||
    sessionNotes.trim().length > 0 ||
    overallIntensity !== null
  ), [exercises.length, selectedWarmup.length, selectedBalanceCore.length, selectedCooldown.length, sessionNotes, overallIntensity]);

  const summaryLockedReason = useMemo(() => {
    if (exercises.length === 0 || submittedFormId) return undefined;
    return hasIncompleteWorkoutSets(exercises)
      ? 'Enter reps or weight, then save'
      : 'Save Workout to Send Summary';
  }, [exercises, submittedFormId]);

  const handleCancel = useCallback(() => {
    if (hasUnsavedWorkout && !submittedFormId) {
      setConfirmRequest({
        title: 'Discard unsaved workout?',
        message: 'Your exercise entries, notes, and protocol selections have not been saved yet.',
        confirmLabel: 'Discard workout',
        cancelLabel: 'Keep logging',
        tone: 'warning',
        onConfirm: resolvedOnCancel,
      });
      return;
    }
    resolvedOnCancel();
  }, [hasUnsavedWorkout, submittedFormId, resolvedOnCancel]);

  const totalSets = useMemo(() =>
    exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0), [exercises]);

  const estimatedDuration = useMemo(() =>
    Math.min(totalSets * MINUTES_PER_SET, MAX_WORKOUT_DURATION), [totalSets]);

  if (!client) {
    return (
      <WorkoutLoggerContainer>
        <CenteredLoader>
          <LoadingSpinner />
        </CenteredLoader>
      </WorkoutLoggerContainer>
    );
  }

  return (
    <NASMLearningProvider>
      <WorkoutLoggerLensFrame>
      <WorkoutLoggerContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {!isClientSelfMode && (
          <EquipmentProfilePicker
            selectedProfileId={equipmentProfileId}
            onSelect={setEquipmentProfileId}
            label="Training Location"
          />
        )}

        <WorkoutLoggerCoachTerminal
          clientId={effectiveClientId}
          equipmentProfileId={equipmentProfileId}
          workoutDate={workoutDateValue}
          scheduledSessionId={scheduledSessionId}
          scheduledSessionDate={scheduledSessionDate}
          scheduledSessionCreditHint={scheduledSessionCreditHint}
          exerciseCount={exercises.length}
          selfMode={isClientSelfMode}
        />
        <WorkoutLoggerHeader
          clientFirstName={client.firstName}
          clientLastName={client.lastName}
          availableSessions={client.availableSessions ?? 0}
          clientSource={client.clientSource}
          totalSets={totalSets}
          estimatedDuration={estimatedDuration}
          currentOPTPhase={currentOPTPhase}
          onOPTPhaseChange={setCurrentOPTPhase}
          workoutDate={workoutDateValue}
        />

        <ScheduledSessionStatusBanner
          clientSource={client.clientSource}
          scheduledSessionCreditHint={scheduledSessionCreditHint}
          scheduledSessionDate={scheduledSessionDate}
          scheduledSessionId={scheduledSessionId}
        />
        <ActivePlanContextStrip assignment={plannedAssignment || loadedPlanContext} planLoadOutcome={exercises.length === 0 ? planLoadOutcome : null} isClientSelfMode={isClientSelfMode} clientId={effectiveClientId} onAddExercise={addExercise} />

        <WorkoutDraftGateBanner
          workoutDraft={workoutDraft}
          visible={exercises.length === 0 && !sessionNotes}
          setDraftGate={setDraftGate}
          setExercises={setExercises}
          setSessionNotes={setSessionNotes}
          setOverallIntensity={setOverallIntensity}
        />


        {typeof effectiveClientId === 'number' && (
          <WorkoutLoggerVoiceImportSection
            clientId={effectiveClientId}
            isSelfMode={isClientSelfMode}
            clientName={`${client.firstName} ${client.lastName}`}
            onParsed={handleVoiceMemoParsed}
          />
        )}
        {exercises.length > 0 && <SessionStatsBar stats={sessionStats} />}
        {exercises.length > 0 && (
          <WorkoutLoggerModeBar
            isQuickLogMode={isQuickLogMode}
            onChangeMode={(quick) => {
              setIsQuickLogMode(quick);
              writeQuickLogPreference(quick);
              // Quick Log lives under Classic — picking it while a Runner skin
              // is active switches back so the toggle is never a silent no-op.
              if (quick) writeRunnerStyle('classic-ledger');
            }}
            isOffline={!offlineQueue.isOnline}
            pendingCount={offlineQueue.pendingCount}
            restRunning={restTimer.isRunning}
            restSecondsLeft={restTimer.secondsLeft}
          />
        )}
        <LearningModeToggle />
        <NASMPhaseGuide
          phase={currentOPTPhase}
          onLoadTemplate={loadPhaseTemplate}
        />
        <CompactProtocolSection
          title="Warmup & Corrective"
          icon={<WarmupProtocolIcon size={18} />}
          sectionKey="warmup"
          selectedItems={selectedWarmup}
          recommendedItems={getRecommendedProtocolItems('warmup', currentOPTPhase)}
          isOpen={nasmSectionsOpen.warmup}
          onToggleOpen={() => toggleNasmSection('warmup')}
          onAddFromRolodex={() => requestAddForSection('warmup')}
          onQuickAddPreset={(item) => addProtocolPreset('warmup', item)}
          onRemoveSelected={(id) => removeProtocolItem('warmup', id)}
        />
        <ExerciseSection>
          {!isClientSelfMode && typeof effectiveClientId === 'number' && (
            <WorkoutPlanAssignmentPicker
              clientId={effectiveClientId}
              disabled={isLoadingPlan || isRepeatingSession}
              onApplyAssignment={handleApplyGeneratedPlanDay}
            />
          )}
          <LoadPlanRow>
            {!isClientSelfMode && (
              <LoadPlanButton
                onClick={handleRepeatLastSession}
                disabled={isRepeatingSession || isLoadingPlan}
                title="Copy the client's most recent workout as a starting draft"
              >
                <History size={16} />
                {isRepeatingSession ? 'Loading...' : 'Repeat Last Session'}
              </LoadPlanButton>
            )}
            <LoadPlanButton onClick={loadTodaysPlan} disabled={isLoadingPlan || isRepeatingSession}>
              <Download size={16} />
              {isLoadingPlan ? 'Loading...' : "Load Today's Plan"}
            </LoadPlanButton>
            {!isClientSelfMode && onOpenHistoryImport && (
              <LoadPlanButton
                onClick={onOpenHistoryImport}
                disabled={isLoadingPlan || isRepeatingSession}
                title="Open historical workout import"
              >
                <UploadCloud size={16} />
                History Import
              </LoadPlanButton>
            )}
          </LoadPlanRow>

          <ExerciseSearchBar>
            <RolodexTrigger
              onClick={() => {
                setPendingSectionContext(null);
                setShowExerciseSearch(prev => !prev);
              }}
              aria-label="Search and add exercises"
              aria-expanded={showExerciseSearch}
            >
              <Plus size={18} />
              Search & Add Exercise
            </RolodexTrigger>
            {canDictate && (
              <RolodexTrigger onClick={dictation.toggle} aria-pressed={dictation.active} aria-label="Dictate workout log entries">
                <Mic size={18} />
                Dictate
              </RolodexTrigger>
            )}
            <NASMExerciseRolodex
              isOpen={showExerciseSearch}
              initialQuery={deepLinkExercise}
              autoSelectExact={Boolean(deepLinkExercise)}
              onClose={() => {
                setShowExerciseSearch(false);
                setPendingSectionContext(null);
                setDeepLinkExercise(null);
              }}
              sectionContext={pendingSectionContext ?? 'main'}
              onSelectExercise={(exercise) => {
                if (pendingSectionContext) {
                  addProtocolFromRolodex(pendingSectionContext, exercise);
                  setPendingSectionContext(null);
                  setShowExerciseSearch(false);
                } else {
                  addExercise(exercise);
                }
              }}
            />
          </ExerciseSearchBar>
          {canDictate && <LoggerDictationStrip {...dictation} />}

          {exercises.length === 0 ? (
            <AddExerciseButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExerciseSearch(true)}
            >
              <Plus size={20} />
              Add Your First Exercise
            </AddExerciseButton>
          ) : (
            <RunnerCollection
              engine={runnerEngine}
              renderClassicList={renderClassicList}
              quickLogActive={isQuickLogMode}
              renderQuickLog={renderQuickLog}
            />
          )}

          {exercises.length > 0 && (
            <AddExerciseButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExerciseSearch(true)}
            >
              <Plus size={20} />
              Add Another Exercise
            </AddExerciseButton>
          )}
        </ExerciseSection>
        <CompactProtocolSection
          title="Balance, Core & Stability"
          icon={<BalanceProtocolIcon size={18} />}
          sectionKey="balance_core"
          selectedItems={selectedBalanceCore}
          recommendedItems={getRecommendedProtocolItems('balance_core', currentOPTPhase)}
          isOpen={nasmSectionsOpen.balance_core}
          onToggleOpen={() => toggleNasmSection('balance_core')}
          onAddFromRolodex={() => requestAddForSection('balance_core')}
          onQuickAddPreset={(item) => addProtocolPreset('balance_core', item)}
          onRemoveSelected={(id) => removeProtocolItem('balance_core', id)}
        />
        <CompactProtocolSection
          title="Cooldown & Recovery"
          icon={<CooldownProtocolIcon size={18} />}
          sectionKey="cooldown"
          selectedItems={selectedCooldown}
          recommendedItems={getRecommendedProtocolItems('cooldown', currentOPTPhase)}
          isOpen={nasmSectionsOpen.cooldown}
          onToggleOpen={() => toggleNasmSection('cooldown')}
          onAddFromRolodex={() => requestAddForSection('cooldown')}
          onQuickAddPreset={(item) => addProtocolPreset('cooldown', item)}
          onRemoveSelected={(id) => removeProtocolItem('cooldown', id)}
        />
        {exercises.length > 0 && (
          <SessionSummaryForm
            overallIntensity={overallIntensity}
            onIntensityChange={setOverallIntensity}
            sessionNotes={sessionNotes}
            onNotesChange={setSessionNotes}
            exerciseCount={exercises.length}
            totalSets={totalSets}
            estimatedDuration={estimatedDuration}
            clientSource={client?.clientSource}
            scheduledSessionCreditHint={scheduledSessionCreditHint}
          />
        )}

        {lastSaveResponse ? (
          <SaveSuccessPanel
            form={lastSaveResponse}
            completedSets={sessionStats.completedSets}
            formattedVolume={sessionStats.formattedVolume}
            isSelfMode={isClientSelfMode}
            challengeProgress={lastChallengeProgress}
            onDone={() => resolvedOnComplete(lastSaveResponse)}
            onBuyMore={() => navigate('/store')}
            onBookNext={isClientSelfMode ? () => navigate('/dashboard/client/schedule') : null}
            exercisesForShare={isClientSelfMode ? exercises : null}
          />
        ) : (
          <WorkoutLoggerChallengeReceipt progress={lastChallengeProgress} />
        )}
        {/* Post-Save Handoff (Slice-2, Chunk C): terminal proof moment, portaled OVER the panel above. */}
        <WorkoutLoggerHandoffMount
          handoff={lastSaveResponse?.handoff}
          saveKey={lastSaveResponse?.id ?? lastSaveResponse?.formId ?? null}
          userRole={user?.role}
          isOnline={offlineQueue.isOnline}
          onNavigate={navigate}
          viewerFirstName={user?.firstName ?? null}
          viewerHandle={user?.username ?? null}
        />
        <LiveRegion role="status" aria-live="polite" aria-atomic="true">
          {exercises.length > 0 && `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''} logged, ${totalSets} total sets`}
        </LiveRegion>
        {exercises.length > 0 && !submittedFormId && (
          <StickyLogActionBar
            completedSets={sessionStats.completedSets}
            totalSets={sessionStats.totalSets}
            onSubmit={() => handleSubmit()}
            isSubmitting={isSubmitting}
          />
        )}
        <WorkoutLoggerFooter
          onCancel={handleCancel}
          onExportPDF={handleExportPDF}
          onSubmit={handleSubmit}
          onGenerateSummary={handleGenerateSummary}
          hasExercises={exercises.length > 0}
          isSubmitting={isSubmitting}
          isGeneratingSummary={isGeneratingSummary}
          showGenerateSummary={!!submittedFormId}
          summaryLockedReason={summaryLockedReason}
        />
      </WorkoutLoggerContainer>
      {showFloatingTimer && (
        <FloatingRestTimer onClose={() => setShowFloatingTimer(false)} />
      )}

      <WorkoutLoggerConfirmDialog
        request={confirmRequest}
        onClose={() => setConfirmRequest(null)}
      />
      {exercises.length > 0 && !showFloatingTimer && (
        <TimerFAB
          $lift={!submittedFormId}
          onClick={() => setShowFloatingTimer(true)}
          aria-label="Open floating rest timer"
          title="Rest Timer"
        >
          <Timer size={18} aria-hidden="true" />
        </TimerFAB>
      )}
      </WorkoutLoggerLensFrame>
    </NASMLearningProvider>
  );
};

export default WorkoutLogger;
