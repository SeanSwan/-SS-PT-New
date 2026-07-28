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
  APPLY_WORKOUT_EVENT,
  drainPendingWorkoutPlans,
  type WorkoutPlanTransfer,
  type WorkoutExerciseTransfer,
} from '../../utils/parseAIWorkoutPlan';
import {
  AI_SUBMIT_WORKOUT,
  AI_UPDATE_SET,
  type AIWorkoutEventAck,
  type AISubmitWorkoutEventDetail,
  type AIUpdateSetPayload,
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
  VoiceImportHeader,
  VoiceImportPanel,
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
import { buildWorkoutFormSubmitBody } from './workoutLoggerSubmitPayload';
import WorkoutLoggerFooter from './WorkoutLoggerFooter';
import WorkoutLoggerConfirmDialog, { type WorkoutLoggerConfirmRequest } from './WorkoutLoggerConfirmDialog';
import VoiceMemoUpload, { type ParsedWorkout } from './VoiceMemoUpload';
import NASMExerciseRolodex from './NASMExerciseRolodex';
import type { ExerciseSlim } from './useExerciseSearch';
import {
  appendImportedSessionNotes,
  parsedWorkoutToExerciseEntries,
} from './workoutLoggerVoiceImport';
import { applyAIUpdateSet } from './aiWorkoutEventReducers';
import CompactProtocolSection, {
  type ProtocolSectionKey,
  type ProtocolSelection,
} from './CompactProtocolSection';
import {
  getRecommendedProtocolItems,
  findProtocolDefaultById,
  findProtocolDefaultByName,
  type NASMDefaultItem,
} from './NASMProtocolDefaults';
import { NASMLearningProvider, LearningModeToggle } from './NASMLearningMode';
import NASMPhaseGuide from './NASMPhaseGuide';
import { getPhaseTemplate } from './NASMPhaseTemplates';
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
  convertAIWorkoutExercisesToEntries,
  ensureWorkoutLoggerExerciseRowIdentity,
  ensureWorkoutLoggerSetId,
  getExerciseEntryRowKey,
  hasIncompleteWorkoutSets,
  normalizeWorkoutDate,
  planAssignmentPickerItemToContext,
  planAssignmentPickerItemToEntries,
  planAssignmentPickerItemToSubmitAssignment,
} from './WorkoutLogger.helpers';
import { loadTodaysPlanIntoLogger } from './WorkoutLogger.loadTodaysPlan';
import { repeatLastSessionIntoLogger } from './WorkoutLogger.repeatLastSession';
import { buildWorkoutLoggerPdfPayload } from './WorkoutLogger.pdf';

import { useGhostPreFill } from './useGhostPreFill';
import { useSessionStats } from './useSessionStats';
import { useOfflineQueue } from './useOfflineQueue';
import SessionStatsBar from './SessionStatsBar';
import StickyLogActionBar from './StickyLogActionBar';
import QuickLogMode from './QuickLogMode';
import { readQuickLogPreference, writeQuickLogPreference } from './WorkoutLogger.preferences';
import { useRestTimer } from './useRestTimer';

const SELF_LOGGING_DASHBOARD_ROLES = new Set(['client', 'user']);

const isSelfLoggingDashboardRole = (role?: string | null): boolean =>
  typeof role === 'string' && SELF_LOGGING_DASHBOARD_ROLES.has(role.toLowerCase());

const getWorkoutSubmitErrorSignal = (error: unknown): { code?: unknown; name?: unknown } =>
  typeof error === 'object' && error !== null ? error as { code?: unknown; name?: unknown } : {};

const isWorkoutSubmitCanceled = (error: unknown): boolean => {
  const { code, name } = getWorkoutSubmitErrorSignal(error);
  return name === 'AbortError' || name === 'CanceledError' || code === 'ERR_CANCELED';
};

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
  const workoutLoggerLocalIdCounterRef = useRef(0);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showFloatingTimer, setShowFloatingTimer] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isRepeatingSession, setIsRepeatingSession] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [submittedFormId, setSubmittedFormId] = useState<string | null>(null);
  const [lastChallengeProgress, setLastChallengeProgress] = useState<DailyWorkoutForm['challengeProgress'] | null>(null);
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

    const templateExercises: ExerciseEntry[] = template.exercises.map((ex, i) => ({
      loggerExerciseId: createWorkoutLoggerLocalId('exercise'),
      exerciseId: `template-${phase}-${i}-${Date.now()}`,
      exerciseName: ex.name,
      sets: Array.from({ length: Array.isArray(ex.sets) ? ex.sets.length : (Number(ex.sets) || 3) }, (_, s) => ({
        loggerSetId: createWorkoutLoggerLocalId('set'),
        setNumber: s + 1,
        weight: 0,
        reps: ex.reps,
        rpe: null,
        tempo: ex.tempo,
        restTime: ex.restSeconds,
        formQuality: null,
        notes: ex.notes || '',
      })),
      formRating: null,
      painLevel: 0,
      performanceNotes: '',
    }));

    const toSelections = (ids: string[]): ProtocolSelection[] => {
      const out: ProtocolSelection[] = [];
      for (const id of ids) {
        const item = findProtocolDefaultById(id);
        if (item) {
          out.push({
            id: item.id,
            name: item.name,
            source: 'template',
            category: item.category,
          });
        }
      }
      return out;
    };

    setSelectedWarmup(toSelections(template.warmupIds));
    setSelectedBalanceCore(toSelections(template.balanceCoreIds));
    setSelectedCooldown(toSelections(template.cooldownIds));

    setExercises(templateExercises);
    setCurrentOPTPhase(phase);
    toast.success(`Loaded Phase ${phase} template - ${templateExercises.length} exercises, ${templateExercises.reduce((s, e) => s + e.sets.length, 0)} sets`);
  }, [createWorkoutLoggerLocalId]);

  const convertAIExercises = useCallback((incoming: WorkoutExerciseTransfer[]): ExerciseEntry[] => {
    return convertAIWorkoutExercisesToEntries(incoming, createWorkoutLoggerLocalId);
  }, [createWorkoutLoggerLocalId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<WorkoutPlanTransfer>).detail;
      const pendingPlans = drainPendingWorkoutPlans();
      const plans = pendingPlans.length ? pendingPlans : (detail?.exercises?.length ? [detail] : []);
      const pendingExercises = plans.flatMap((plan) => plan.exercises ?? []);
      if (pendingExercises.length) {
        const converted = convertAIExercises(pendingExercises);
        const planLabel = plans.length === 1 ? 'AI plan' : `${plans.length} AI plans`;
        setExercises(prev => [...prev, ...converted]);
        toast.success(`Applied ${converted.length} exercises from ${planLabel}`);
      }
    };
    window.addEventListener(APPLY_WORKOUT_EVENT, handler);
    return () => window.removeEventListener(APPLY_WORKOUT_EVENT, handler);
  }, [convertAIExercises]);

  const handleVoiceMemoParsed = useCallback((workout: ParsedWorkout) => {
    const parsedExercises = parsedWorkoutToExerciseEntries(workout).map((exercise) =>
      ensureWorkoutLoggerExerciseRowIdentity(
        exercise,
        () => createWorkoutLoggerLocalId('exercise'),
        () => createWorkoutLoggerLocalId('set'),
      )
    );
    if (parsedExercises.length === 0) {
      toast.error('No usable exercises found in upload');
      return;
    }

    setExercises(prev => [...prev, ...parsedExercises]);
    setSessionNotes(prev => appendImportedSessionNotes(prev, workout.sessionNotes));
    if (typeof workout.overallIntensity === 'number' && Number.isFinite(workout.overallIntensity)) {
      setOverallIntensity(workout.overallIntensity);
    }
    toast.success(`Applied ${parsedExercises.length} parsed exercise${parsedExercises.length === 1 ? '' : 's'}`);
  }, [createWorkoutLoggerLocalId]);

  useEffect(() => {
    const acknowledgeAIWorkoutEvent = (event: Event, handled = true) => {
      const detail = (event as CustomEvent<AIWorkoutEventAck>).detail;
      detail?.acknowledgeAIWorkoutEvent?.(handled);
    };

    const onLoadTemplate = (e: Event) => {
      const { phase } = (e as CustomEvent).detail || {};
      if (phase >= 1 && phase <= 5) {
        acknowledgeAIWorkoutEvent(e);
        loadPhaseTemplate(phase);
      }
    };
    const onAddExercise = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.exerciseName) return;
      acknowledgeAIWorkoutEvent(e);
      const entry: ExerciseEntry = {
        loggerExerciseId: createWorkoutLoggerLocalId('exercise'),
        exerciseId: createWorkoutLoggerLocalId('ai'),
        exerciseName: d.exerciseName,
        sets: Array.from({ length: Array.isArray(d.sets) ? d.sets.length : (Number(d.sets) || 3) }, (_, i) => ({
          loggerSetId: createWorkoutLoggerLocalId('set'),
          setNumber: i + 1,
          weight: d.weight || 0,
          reps: d.reps || 10,
          rpe: null,
          tempo: d.tempo || '',
          restTime: d.restSeconds || 60,
          formQuality: null,
          notes: d.notes || '',
        })),
        formRating: null,
        painLevel: 0,
        performanceNotes: '',
      };
      setExercises(prev => [...prev, entry]);
      toast.success(`Added ${d.exerciseName}`);
    };
    const onUpdateSet = (e: Event) => {
      const detail = (e as CustomEvent<AIUpdateSetPayload>).detail;
      if (!detail?.exerciseName) return;

      const prev = exercisesRef.current;
      const next = applyAIUpdateSet(prev, detail);
      acknowledgeAIWorkoutEvent(e, next !== prev);
      if (next !== prev) {
        exercisesRef.current = next;
        setExercises(next);
        toast.success(`Updated ${detail.exerciseName}`);
      }
    };
    const onToggleItem = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.section) return;
      const section = d.section as ProtocolSectionKey;
      if (section !== 'warmup' && section !== 'balance_core' && section !== 'cooldown') {
        return;
      }
      const setter = protocolSectionSetters[section];
      const shouldAdd = d.completed !== false; // undefined / true - add; false - remove

      if (d.markAll) {
        acknowledgeAIWorkoutEvent(e);
        if (shouldAdd) {
          const recs = getRecommendedProtocolItems(section, currentOPTPhase, 12);
          setter(recs.map((item) => ({
            id: item.id,
            name: item.name,
            source: 'preset' as const,
            category: item.category,
          })));
          toast.success(`Preselected ${recs.length} ${section} items`);
        } else {
          setter([]);
          toast.success(`Cleared ${section} selections`);
        }
        return;
      }

      if (!d.itemName) return;
      acknowledgeAIWorkoutEvent(e);

      if (shouldAdd) {
        const match = findProtocolDefaultByName(section, d.itemName);
        if (match) {
          setter((prev) => (prev.some((p) => p.id === match.id)
            ? prev
            : [...prev, { id: match.id, name: match.name, source: 'preset' as const, category: match.category }]
          ));
        }
      } else {
        const needle = d.itemName.toLowerCase();
        setter((prev) => prev.filter((p) => !p.name.toLowerCase().includes(needle)));
      }
    };
    window.addEventListener('AI_LOAD_TEMPLATE', onLoadTemplate);
    window.addEventListener('AI_ADD_EXERCISE', onAddExercise);
    window.addEventListener(AI_UPDATE_SET, onUpdateSet);
    window.addEventListener('AI_TOGGLE_NASM_ITEM', onToggleItem);
    return () => {
      window.removeEventListener('AI_LOAD_TEMPLATE', onLoadTemplate);
      window.removeEventListener('AI_ADD_EXERCISE', onAddExercise);
      window.removeEventListener(AI_UPDATE_SET, onUpdateSet);
      window.removeEventListener('AI_TOGGLE_NASM_ITEM', onToggleItem);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPhaseTemplate, currentOPTPhase, createWorkoutLoggerLocalId]);

  useEffect(() => {
    const pendingPlans = drainPendingWorkoutPlans();
    const pendingExercises = pendingPlans.flatMap((plan) => plan.exercises ?? []);
    if (pendingExercises.length) {
      const converted = convertAIExercises(pendingExercises);
      const planLabel = pendingPlans.length === 1 ? 'AI plan' : `${pendingPlans.length} AI plans`;
      setExercises(prev => [...prev, ...converted]);
      toast.success(`Loaded ${converted.length} exercises from ${planLabel}`);
    }
  }, [convertAIExercises]);

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
    if (!isClientSelfMode) {
      ghostPreFill.fetchExerciseHistory(exercise.name);
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
      loggerExerciseId: createWorkoutLoggerLocalId('exercise'),
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
  const handleSetLogged = useCallback((exerciseIndex: number, setIndex: number) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise) return;
    const set = exercise.sets[setIndex];
    const restSeconds = set?.restTime || 60;
    restTimer.start(restSeconds);
  }, [exercises, restTimer]);

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
    setExercises(prev => prev.filter((_, index) => index !== exerciseIndex));
    toast.info('Exercise removed from workout');
  }, []);

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
    if (
      client.availableSessions === 0 &&
      user?.role !== 'admin' &&
      !isNonDeductingClientSource(client.clientSource)
    ) {
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
        resolvedOnComplete(response.data);
      } else {
        setLastChallengeProgress(null);
        const existingFormId = response.data?.id || response.data?.formId || null;
        if (existingFormId) {
          setSubmittedFormId(existingFormId);
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

        {!isClientSelfMode && typeof effectiveClientId === 'number' && (
          <VoiceImportPanel aria-label="Voice and file workout import">
            <VoiceImportHeader>
              <h2>Voice or file import</h2>
              <p>Upload audio, text, CSV, or PDF. Review parsed exercises before applying.</p>
            </VoiceImportHeader>
            <VoiceMemoUpload
              clientId={effectiveClientId}
              clientName={`${client.firstName} ${client.lastName}`}
              onParsed={handleVoiceMemoParsed}
            />
          </VoiceImportPanel>
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
              onClose={() => {
                setShowExerciseSearch(false);
                setPendingSectionContext(null);
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
            exercises.map((exercise, exerciseIndex) => (
              <ExerciseCardComponent
                key={getExerciseEntryRowKey(exercise)}
                exercise={exercise}
                exerciseIndex={exerciseIndex}
                clientId={effectiveClientId}
                onUpdateExercise={updateExercise}
                onUpdateSet={updateSet}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                onRemoveExercise={removeExercise}
                getOverload={ghostPreFill.getOverload}
                onSetLogged={handleSetLogged}
                ghostSkip={isClientSelfMode}
              />
            ))
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

        <WorkoutLoggerChallengeReceipt progress={lastChallengeProgress} />
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
    </NASMLearningProvider>
  );
};

export default WorkoutLogger;
