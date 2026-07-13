import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Download, Timer, History, UploadCloud } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  dailyWorkoutFormService,
  ExerciseEntry,
  ExerciseSet,
} from '../../services/nasmApiService';
import type { DailyWorkoutForm } from '../../services/nasmApiService';
import { ApiService } from '../../services/api.service';
import EquipmentProfilePicker from '../Shared/EquipmentProfilePicker';
import {
  AI_SUBMIT_WORKOUT,
  type AISubmitWorkoutEventDetail,
} from '../../utils/aiWorkoutEvents';
import { dispatchWorkoutLogged } from '../../utils/workoutLoggedEvent';
import { exportWorkoutLoggerPDF } from '../../services/pdfExportService';

import { getErrorMessage, MINUTES_PER_SET, MAX_WORKOUT_DURATION } from './WorkoutLoggerCS';
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
import ExerciseCardComponent from './ExerciseCardComponent';
import SessionSummaryForm from './SessionSummaryForm';
import ScheduledSessionStatusBanner from './ScheduledSessionStatusBanner';
import ActivePlanContextStrip from './ActivePlanContextStrip';
import WorkoutPlanAssignmentPicker from './WorkoutPlanAssignmentPicker';
import { buildWorkoutSubmitSuccessMessage } from './WorkoutLogger.submitReceipt';
import WorkoutLoggerChallengeReceipt from './WorkoutLoggerChallengeReceipt';
import SaveSuccessPanel from './SaveSuccessPanel';
import { buildWorkoutFormSubmitBody } from './workoutLoggerSubmitPayload';
import { shouldBlockWorkoutSubmitForSessionBalance } from './WorkoutLogger.submitGuard';
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
import { useWorkoutDraft, WorkoutDraftRestoreBanner } from './useWorkoutDraft';
import { toggleSupersetLink, isLinkedToPrevious, renumberSupersetGroups } from './WorkoutLogger.supersets';
import FloatingRestTimer from './FloatingRestTimer';
import { isNonDeductingClientSource } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import type {
  PlanAssignmentPickerItem,
  PlannedAssignment,
  WorkoutLoggerClient,
  WorkoutLoggerExerciseOption,
  WorkoutLoggerProps,
} from './WorkoutLogger.localTypes';
import {
  coerceToNumericId,
  ensureWorkoutLoggerExerciseRowIdentity,
  ensureWorkoutLoggerSetId,
  getExerciseEntryRowKey,
  hasIncompleteWorkoutSets,
  normalizeWorkoutDate,
  planAssignmentPickerItemToContext,
  planAssignmentPickerItemToEntries,
  planAssignmentPickerItemToSubmitAssignment,
  isSelfLoggingDashboardRole,
  isWorkoutSubmitCanceled,
} from './WorkoutLogger.helpers';
import { loadTodaysPlanIntoLogger } from './WorkoutLogger.loadTodaysPlan';
import { repeatLastSessionIntoLogger } from './WorkoutLogger.repeatLastSession';
import { buildWorkoutLoggerPdfPayload } from './WorkoutLogger.pdf';

import { useGhostPreFill } from './useGhostPreFill';
import { reapplyGhostPreFill } from './WorkoutLogger.ghostReapply';
import { useSessionStats } from './useSessionStats';
import { useOfflineQueue } from './useOfflineQueue';
import SessionStatsBar from './SessionStatsBar';
import StickyLogActionBar from './StickyLogActionBar';
import QuickLogMode from './QuickLogMode';
import { readQuickLogPreference, writeQuickLogPreference } from './WorkoutLogger.preferences';
import { useRestTimer } from './useRestTimer';
import { useWorkoutAiEvents } from './useWorkoutAiEvents';

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
  const isClientSelfMode: boolean =
    allowSelfMode &&
    typeof effectiveClientId === 'number' &&
    effectiveClientId === userNumericId;
  const workoutDateValue = scheduledSessionDate
    ? normalizeWorkoutDate(scheduledSessionDate)
    : normalizeWorkoutDate(null);

  const resolvedOnComplete = onComplete ?? ((formData: DailyWorkoutForm) => {
    navigate('/dashboard/client/workouts', {
      state: { workoutChallengeProgress: formData.challengeProgress ?? null },
    });
  });
  const resolvedOnCancel = onCancel ?? (() => {
    navigate('/dashboard/client/overview');
  });

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
  const [sessionNotes, setSessionNotes] = useState('');
  /* Phase 16: null overallIntensity means not rated; save omits untouched ratings. */
  const [overallIntensity, setOverallIntensity] = useState<number | null>(null);
  const [equipmentProfileId, setEquipmentProfileId] = useState<number | null>(null);
  const [client, setClient] = useState<WorkoutLoggerClient | null>(null);
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
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isRepeatingSession, setIsRepeatingSession] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [submittedFormId, setSubmittedFormId] = useState<string | null>(null);
  const [lastChallengeProgress, setLastChallengeProgress] = useState<DailyWorkoutForm['challengeProgress'] | null>(null);
  // Phase 2.1a: saved form powers SaveSuccessPanel; onComplete deferred to Done.
  const [lastSaveResponse, setLastSaveResponse] = useState<DailyWorkoutForm | null>(null);
  const [, setIsLoadingClient] = useState(true);
  const [currentOPTPhase, setCurrentOPTPhase] = useState(1);
  const [isQuickLogMode, setIsQuickLogMode] = useState(readQuickLogPreference);
  const [plannedAssignment, setPlannedAssignment] = useState<PlannedAssignment | null>(null);
  const [loadedPlanContext, setLoadedPlanContext] = useState<PlannedAssignment | null>(null);

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

  const executeLoadClientData = useCallback(async () => {
    setIsLoadingClient(true);
    try {
      if (typeof effectiveClientId !== 'number') {
        setClient(null);
        return;
      }

      const api = new ApiService();
      const infoUrl = isClientSelfMode
        ? '/api/workout-forms/my/info'
        : `/api/workout-forms/client/${effectiveClientId}/info`;
      const axiosResponse = await api.get(infoUrl);
      const data = axiosResponse?.data ?? axiosResponse;

      if (data.success && data.client) {
        setClient({
          id: data.client.id,
          firstName: data.client.firstName,
          lastName: data.client.lastName,
          email: data.client.email,
          availableSessions: data.client.availableSessions,
          clientSource: data.client.clientSource,
          phone: data.client.phone
        });
        if (data.client.hasWorkoutToday) {
          toast.warning(`${data.client.firstName} already has a workout logged for today`);
        }
        if (!isNonDeductingClientSource(data.client.clientSource) && data.client.availableSessions <= 1) {
          toast.warning(`${data.client.firstName} has only ${data.client.availableSessions} session(s) remaining`);
        }
      } else {
        throw new Error(data.message || 'Failed to load client data');
      }
    } catch (error: unknown) {
      console.error('Failed to load client data:', error);
      setClient({
        id: effectiveClientId ?? 0,
        firstName: 'Client',
        lastName: typeof effectiveClientId === 'number' ? `#${effectiveClientId}` : '',
        email: '',
        availableSessions: 0,
        clientSource: null,
        phone: ''
      });
      toast.error(getErrorMessage(error, 'Failed to load client information'));
    } finally {
      setIsLoadingClient(false);
    }
  }, [effectiveClientId, isClientSelfMode]);

  useEffect(() => {
    executeLoadClientData();
  }, [executeLoadClientData]);

  const loadTodaysPlan = useCallback(async () => {
    setLoadedPlanContext(null);
    await loadTodaysPlanIntoLogger({
      effectiveClientId,
      createWorkoutLoggerLocalId,
      routeAssignmentKey,
      routeAssignmentType,
      scheduledSessionId,
      setExercises,
      setIsLoadingPlan,
      setLoadedPlanContext,
      setPlannedAssignment,
    });
  }, [effectiveClientId, createWorkoutLoggerLocalId, routeAssignmentKey, routeAssignmentType, scheduledSessionId]);

  useEffect(() => {
    const todayPlanLoadSignal = loadTodayPlanSignal > 0
      ? `embedded:${loadTodayPlanSignal}`
      : autoLoadTodayPlan
        ? `route:${searchParams.toString()}`
        : null;

    if (!todayPlanLoadSignal || autoLoadTodayPlanRef.current === todayPlanLoadSignal || hasInitialExercises) return;
    if (pendingAiPlanPrefillLoadedRef.current && autoLoadTodayPlan && loadTodayPlanSignal <= 0) {
      autoLoadTodayPlanRef.current = todayPlanLoadSignal;
      pendingAiPlanPrefillLoadedRef.current = false;
      return;
    }
    if (typeof effectiveClientId !== 'number') return;

    autoLoadTodayPlanRef.current = todayPlanLoadSignal;
    void loadTodaysPlan();
  }, [autoLoadTodayPlan, effectiveClientId, hasInitialExercises, loadTodayPlanSignal, loadTodaysPlan, searchParams]);

  const handleApplyGeneratedPlanDay = useCallback((assignment: PlanAssignmentPickerItem) => {
    const prefilled = planAssignmentPickerItemToEntries(assignment, createWorkoutLoggerLocalId);
    if (prefilled.length === 0) {
      toast.info('That generated plan day has no exercises to load.');
      return;
    }

    setExercises((prev) => [...prev, ...prefilled]);
    const submitAssignment = planAssignmentPickerItemToSubmitAssignment(assignment);
    setPlannedAssignment(submitAssignment);
    setLoadedPlanContext(planAssignmentPickerItemToContext(assignment));
    const label = assignment.title || assignment.dayLabel || 'generated plan day';
    toast.success(`Loaded ${prefilled.length} exercise${prefilled.length === 1 ? '' : 's'} from ${label}${submitAssignment ? '' : ' as a draft'}.`);
  }, [createWorkoutLoggerLocalId]);

  const handleRepeatLastSession = useCallback(
    () => repeatLastSessionIntoLogger({
      effectiveClientId,
      isClientSelfMode,
      createWorkoutLoggerLocalId,
      setExercises,
      setIsRepeatingSession,
    }),
    [effectiveClientId, isClientSelfMode, createWorkoutLoggerLocalId],
  );

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

  const handleSubmit = async (submitOverrides?: { overallIntensity?: number | null; sessionNotes?: string }) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true; // Set IMMEDIATELY after check to close race window
    setIsSubmitting(true);
    const submitIntensity = typeof submitOverrides?.overallIntensity === 'number'
      ? submitOverrides.overallIntensity
      : overallIntensity;
    const submitSessionNotes = typeof submitOverrides?.sessionNotes === 'string'
      ? submitOverrides.sessionNotes
      : sessionNotes;

    if (exercises.length === 0) { toast.error('Please add at least one exercise'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    if (!client) { toast.error('Client information not loaded'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    // Null balances and linked scheduled sessions pass through to backend billing validation.
    if (shouldBlockWorkoutSubmitForSessionBalance({
      availableSessions: client.availableSessions,
      userRole: user?.role,
      clientSource: client.clientSource,
      scheduledSessionId,
    })) {
      toast.error('Client has no available sessions remaining'); isSubmittingRef.current = false; setIsSubmitting(false); return;
    }

    if (hasIncompleteWorkoutSets(exercises)) {
      toast.error('Please complete all exercise sets before submitting'); isSubmittingRef.current = false; setIsSubmitting(false); return;
    }

    if (typeof effectiveClientId !== 'number') {
      toast.error('No client context - unable to submit');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const formData = buildWorkoutFormSubmitBody({
      clientId: effectiveClientId,
      date: workoutDateValue,
      exercises,
      sessionNotes: submitSessionNotes,
      overallIntensity: submitIntensity,
      scheduledSessionId,
      equipmentProfileId,
      plannedAssignment,
    });

    if (!offlineQueue.isOnline) {
      offlineQueue.queueSubmission(formData);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    setLastChallengeProgress(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await dailyWorkoutFormService.submitWorkoutForm(
        formData,
        { signal: controller.signal }
      );

      if (response.success && response.data) {
        setLastChallengeProgress(response.data.challengeProgress ?? null);
        toast.success(buildWorkoutSubmitSuccessMessage(response.data, response.message));
        setSubmittedFormId(response.data.id || response.data.formId || null);
        dispatchWorkoutLogged({
          clientId: response.data.clientId ?? effectiveClientId,
          formId: response.data.id || response.data.formId || null,
          date: response.data.date || workoutDateValue,
        });
        // Phase 2.1a: onComplete deferred to SaveSuccessPanel's Done action.
        setLastSaveResponse(response.data);
        workoutDraft.clear();
      } else {
        setLastChallengeProgress(null);
        const existingFormId = response.data?.id || response.data?.formId || null;
        if (existingFormId) {
          setSubmittedFormId(existingFormId);
          workoutDraft.clear();
          toast.warning(response.message || 'Workout already exists for this date. Summary tools are unlocked.');
        } else {
          toast.error(response.message || 'Workout was not saved. Please review and try again.');
        }
      }
    } catch (error: unknown) {
      console.error('Error submitting workout form:', error);
      if (isWorkoutSubmitCanceled(error)) {
        toast.error('Workout submission timed out. Please try again.');
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { status?: number } }).response?.status === 'number' &&
        (error as { response?: { status?: number } }).response!.status! >= 400 &&
        (error as { response?: { status?: number } }).response!.status! < 500
      ) {
        const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
        toast.error(message || 'Workout was not saved. Please review and try again.');
      } else {
        offlineQueue.queueSubmission(formData);
      }
    } finally {
      clearTimeout(timeoutId);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const onSubmitWorkout = (event: Event) => {
      const detail = (event as CustomEvent<AISubmitWorkoutEventDetail>).detail || {};
      const nextIntensity = typeof detail.intensity === 'number' ? detail.intensity : overallIntensity;
      const nextNotes = typeof detail.notes === 'string' ? detail.notes : sessionNotes;

      if (typeof detail.intensity === 'number') setOverallIntensity(detail.intensity);
      if (typeof detail.notes === 'string') setSessionNotes(detail.notes);

      detail.acknowledgeAIWorkoutEvent?.();
      void handleSubmit({ overallIntensity: nextIntensity, sessionNotes: nextNotes });
    };

    window.addEventListener(AI_SUBMIT_WORKOUT, onSubmitWorkout);
    return () => window.removeEventListener(AI_SUBMIT_WORKOUT, onSubmitWorkout);
  }, [handleSubmit, overallIntensity, sessionNotes]);

  const handleGenerateSummary = useCallback(async () => {
    if (!submittedFormId) {
      toast.error('Complete and save the workout before sending a summary');
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const api = new ApiService();
      const payload = {
        clientId: effectiveClientId,
        formId: submittedFormId,
        exercises: exercises.map(ex => ({
          exerciseName: ex.exerciseName,
          sets: ex.sets.map(s => ({ weight: s.weight, reps: s.reps, rpe: s.rpe, tempo: s.tempo })),
          formRating: ex.formRating,
          painLevel: ex.painLevel,
        })),
        sessionNotes,
        overallIntensity,
        sendEmail: true,
      };

      const response = await api.post('/api/workout-summaries', payload);
      const data = response?.data ?? response;

      if (data.success) {
        toast.success(data.emailSent ? 'Summary generated and sent to client!' : 'Summary generated successfully!');
      } else {
        throw new Error(data.message || 'Failed to generate summary');
      }
    } catch (error: unknown) {
      console.error('Failed to generate summary:', error);
      toast.error(getErrorMessage(error, 'Failed to generate workout summary'));
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [effectiveClientId, submittedFormId, exercises, sessionNotes, overallIntensity]);

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
        <ActivePlanContextStrip assignment={plannedAssignment || loadedPlanContext} />

        {workoutDraft.pendingDraft && exercises.length === 0 && !sessionNotes && !autoLoadTodayPlan && (
          <WorkoutDraftRestoreBanner
            draft={workoutDraft.pendingDraft}
            onRestore={() => {
              const draft = workoutDraft.restore();
              if (!draft) return;
              setExercises(draft.exercises.map((entry) => ensureWorkoutLoggerExerciseRowIdentity(entry)));
              setSessionNotes(draft.sessionNotes);
              setOverallIntensity(draft.overallIntensity);
            }}
            onDiscard={workoutDraft.discard}
          />
        )}

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
            onChangeMode={(quick) => { setIsQuickLogMode(quick); writeQuickLogPreference(quick); }}
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

          {exercises.length === 0 ? (
            <AddExerciseButton
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExerciseSearch(true)}
            >
              <Plus size={20} />
              Add Your First Exercise
            </AddExerciseButton>
          ) : isQuickLogMode ? (
            /* Phase 6: Quick Log Mode - 3-tap streamlined view */
            <QuickLogMode
              exercises={exercises}
              onUpdateSet={updateSet}
              onAddSet={addSet}
              ghostPreFill={ghostPreFill}
              onSetLogged={handleSetLogged}
            />
          ) : (
            <div className="lens2-collection">
              {exercises.map((exercise, exerciseIndex) => (
                <ExerciseCardComponent
                  key={getExerciseEntryRowKey(exercise)}
                  exercise={exercise}
                  exerciseIndex={exerciseIndex}
                  clientId={effectiveClientId}
                  supersetGroup={exercise.supersetGroup ?? undefined}
                  linkedToPrevious={isLinkedToPrevious(exercises, exerciseIndex)}
                  showSetDetails={showSetDetails}
                  onToggleSetDetails={handleToggleSetDetails}
                  onToggleSupersetLink={exerciseIndex > 0 ? () => toggleSuperset(exerciseIndex) : undefined}
                  onUpdateExercise={updateExercise}
                  onUpdateSet={updateSet}
                  onAddSet={addSet}
                  onRemoveSet={removeSet}
                  onRemoveExercise={removeExercise}
                  getOverload={ghostPreFill.getOverload}
                  onSetLogged={handleSetLogged}
                  ghostSkip={isClientSelfMode}
                />
              ))}
            </div>
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
