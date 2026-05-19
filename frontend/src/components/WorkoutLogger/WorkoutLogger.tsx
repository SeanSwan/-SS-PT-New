/**
 * WorkoutLogger Component — Orchestrator
 * =======================================
 *
 * Revolutionary NASM Workout Logging Interface for Trainers.
 * Decomposed into sub-components for maintainability (<300 lines each).
 *
 * Sub-components:
 * - WorkoutLoggerCS.ts — Shared color palette + keyframes
 * - WorkoutLoggerHeader.tsx — Client info, date, stats
 * - CompactProtocolSection.tsx — Small rolodex-first warmup/balance/cooldown
 *   cards (2026-04-17 replacement for the always-rendered NASMProtocolSection
 *   checklists that used to dominate the page). Rolodex is now the primary
 *   add flow; recommended items render as phase-appropriate quick-add chips.
 * - NASMExerciseRolodex.tsx — Single shared exercise picker with
 *   sectionContext routing (main | warmup | balance_core | cooldown).
 * - ExerciseCardComponent.tsx — Exercise card with set table
 * - SessionSummaryForm.tsx — Intensity, notes, workout stats (Phase 16
 *   null-honest "Not rated" UI).
 * - WorkoutLoggerFooter.tsx — Action buttons
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { Plus, Download, Heart, Shield, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
// 2026-04-17 Codex round 2 fix: self-route default onComplete/onCancel
// now navigate to a real client route instead of being silent no-ops.
import { useNavigate } from 'react-router-dom';
import {
  dailyWorkoutFormService,
  ExerciseEntry,
  ExerciseSet,
  DailyWorkoutForm
} from '../../services/nasmApiService';
import { ApiService } from '../../services/api.service';
import EquipmentProfilePicker from '../Shared/EquipmentProfilePicker';
import AITerminalPanel from '../Shared/AITerminalPanel';
import {
  APPLY_WORKOUT_EVENT,
  PENDING_WORKOUT_KEY,
  type WorkoutPlanTransfer,
  type WorkoutExerciseTransfer,
} from '../../utils/parseAIWorkoutPlan';
import { exportWorkoutLoggerPDF, type PDFExerciseEntry } from '../../services/pdfExportService';

// Sub-components
import { CS, withAlpha, shimmer, getErrorMessage, MINUTES_PER_SET, MAX_WORKOUT_DURATION, reducedMotionSafe } from './WorkoutLoggerCS';
import WorkoutLoggerHeader from './WorkoutLoggerHeader';
import ExerciseCardComponent from './ExerciseCardComponent';
import SessionSummaryForm from './SessionSummaryForm';
import { buildWorkoutFormSubmitBody } from './workoutLoggerSubmitPayload';
import WorkoutLoggerFooter from './WorkoutLoggerFooter';
import NASMExerciseRolodex from './NASMExerciseRolodex';
import type { ExerciseSlim } from './useExerciseSearch';
// 2026-04-17: CompactProtocolSection replaces the always-rendered 25/20/15
// static NASMProtocolSection checklists that used to swallow the logger
// page. Rolodex is now the primary add flow; recommendations are chips.
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

// Phase 6: Speed optimization imports
import { useGhostPreFill } from './useGhostPreFill';
import { useSessionStats } from './useSessionStats';
import { useOfflineQueue } from './useOfflineQueue';
import SessionStatsBar from './SessionStatsBar';
import QuickLogMode from './QuickLogMode';
import { useRestTimer } from './useRestTimer';

// ==================== INTERFACES ====================

interface WorkoutLoggerProps {
  /**
   * The client whose workout is being logged. Optional because the
   * canonical client self-log route `/dashboard/client/log-workout`
   * mounts `<WorkoutLogger />` via the UniversalDashboardLayout role
   * router with no props — the component resolves the current client
   * from the authenticated session in that case (see
   * `effectiveClientId` below). Non-self callers (admin / trainer
   * via EnhancedWorkoutLogger) continue to pass an explicit `clientId`.
   */
  clientId?: number;
  /**
   * The admin/trainer-provided onComplete + onCancel callbacks. Optional
   * for the same self-route reason — when the role router mounts us
   * directly with no props, we supply safe defaults that navigate away
   * from the route after save/cancel.
   */
  onComplete?: (formData: DailyWorkoutForm) => void;
  onCancel?: () => void;
  initialData?: Partial<ExerciseEntry[]>;
}

interface Exercise {
  id: string;
  name: string;
  description?: string;
  exerciseType: string;
  difficulty: number;
  muscleGroups: string[];
}

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions: number | null;
  phone?: string;
}

interface PlannedExercise {
  exerciseId?: string | number;
  id?: string | number;
  exerciseName?: string;
  name?: string;
  sets?: unknown[] | number | string;
  weight?: number | string;
  targetReps?: number | string;
  reps?: number | string;
  tempo?: string;
  restTime?: number | string;
  restSeconds?: number | string;
}

interface PlannedSession {
  exercises?: PlannedExercise[];
  weekNumber?: number | string;
  dayLabel?: string;
  dayNumber?: number | string;
}

interface PlannedDay {
  dayName?: string;
  exercises?: PlannedExercise[];
}

interface CurrentWorkoutPlanResponse {
  currentSession?: PlannedSession;
  data?: {
    currentSession?: PlannedSession;
  };
  plan?: {
    currentSession?: PlannedSession;
    days?: PlannedDay[];
  };
}

// ==================== MAIN COMPONENT ====================

const WorkoutLogger: React.FC<WorkoutLoggerProps> = ({
  clientId,
  onComplete,
  onCancel,
  initialData = []
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 2026-04-17: self-mode resolution for the client `/log-workout`
  // route. When the role router mounts <WorkoutLogger /> with no
  // `clientId` prop and the session is a client, the effective client
  // is the logged-in user themselves. When the prop is provided (admin
  // / trainer paths via EnhancedWorkoutLogger), that wins — unchanged
  // behavior. `undefined` in both positions means no valid client
  // context; the component renders a guarded fallback instead of
  // requesting `/api/workout-forms/client/undefined/info`.
  //
  // 2026-04-17 Codex round 2: coerce user.id via Number() before the
  // type check. AuthContext.tsx:17 types user.id as string, but the
  // rest of this component's URLs and hooks expect a numeric id. The
  // previous `typeof user?.id === 'number'` check would silently fail
  // to resolve self-mode when the backend returned a string-shaped id.
  const coerceToNumericId = (raw: unknown): number | undefined => {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string' && raw.trim() !== '') {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };
  const userNumericId = coerceToNumericId(user?.id);
  const effectiveClientId: number | undefined =
    typeof clientId === 'number' && Number.isFinite(clientId)
      ? clientId
      : (user?.role === 'client' ? userNumericId : undefined);
  const isClientSelfMode: boolean =
    user?.role === 'client' &&
    typeof effectiveClientId === 'number' &&
    effectiveClientId === userNumericId;

  // Default callbacks for the self-route mount (role router passes no
  // callbacks).
  //
  // 2026-04-17 Codex round 2 fix: the earlier no-op defaults meant
  // Cancel did nothing and a successful save silently left the user
  // on the logger page. When a caller (admin / trainer via
  // EnhancedWorkoutLogger) passes its own handlers, those win. On the
  // self-route mount we navigate back to the client home so the user
  // gets real feedback on action. Both targets are canonical client
  // routes (see UniversalDashboardLayout.tsx:598-615) so they will
  // always resolve for an authenticated client.
  const resolvedOnComplete = onComplete ?? (() => {
    navigate('/dashboard/client/workouts');
  });
  const resolvedOnCancel = onCancel ?? (() => {
    navigate('/dashboard/client/overview');
  });

  // ── Core State ──
  const [exercises, setExercises] = useState<ExerciseEntry[]>(() => {
    if (initialData && Array.isArray(initialData) && initialData.length > 0) {
      return initialData as ExerciseEntry[];
    }
    return [];
  });
  const [sessionNotes, setSessionNotes] = useState('');
  // Phase 16 (2026-04-16): null = "not rated", distinct from any 1-10
  // value the user explicitly picks. Previously `useState(5)` seeded a
  // phantom 5/10 onto every save, which dragged the canonical
  // IntensityRpeTrendLine toward a false 5.0 baseline. The save path
  // omits `overallIntensity` from the /api/workout-forms payload when
  // this is null, and the backend persists DB null.
  const [overallIntensity, setOverallIntensity] = useState<number | null>(null);
  const [equipmentProfileId, setEquipmentProfileId] = useState<number | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [showExerciseSearch, setShowExerciseSearch] = useState(false);
  const [showFloatingTimer, setShowFloatingTimer] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [submittedFormId, setSubmittedFormId] = useState<string | null>(null);
  const [, setIsLoadingClient] = useState(true);
  const [currentOPTPhase, setCurrentOPTPhase] = useState(1);
  const [isQuickLogMode, setIsQuickLogMode] = useState(false);

  // ── Phase 6: Speed Optimization Hooks ──
  // 2026-04-17: pass the resolved effective client id so hooks that
  // need the current client (ghost pre-fill, offline queue) work on
  // both the self-route mount and the admin/trainer mount. Coerce to
  // 0 when undefined — neither hook matches id=0 against real data,
  // so their internal queries become no-ops until the component
  // guards around `!effectiveClientId` render a fallback instead.
  //
  // 2026-04-18 Codex round 4: ghost pre-fill fetches from
  // /api/admin/clients/:id/workouts which is admin-only. On the client
  // self-route this would 403 on every exercise add. Skip the hook's
  // network path for client self-mode — ghost pre-fill is a speed
  // feature, not correctness, and skipping it keeps the happy path
  // free of forbidden requests. Trainer/admin mounts keep ghost
  // pre-fill working as before.
  const hookClientId = effectiveClientId ?? 0;
  const ghostPreFill = useGhostPreFill(hookClientId, { skip: isClientSelfMode });
  const sessionStats = useSessionStats(exercises);
  const offlineQueue = useOfflineQueue(hookClientId);
  const restTimer = useRestTimer({
    defaultSeconds: 60,
    onComplete: () => toast.info('Rest complete — next set!'),
  });

  // ── NASM Protocol State (2026-04-17 rolodex-first rebuild) ──
  //
  // Previously this held three arrays of 25/20/15 NASMItem objects that
  // were rendered as full-height checklists on every page load, pushing
  // the actual "Search & Add Exercise" rolodex below the fold. The new
  // model stores only items the user has actually selected (via rolodex
  // or via a quick-add chip), and the phase-appropriate recommendations
  // are computed on demand from `getRecommendedProtocolItems`.
  //
  // Selected items live here in separate arrays rather than in the main
  // `exercises` array because they are not logged as weight/reps/RPE
  // sets — they're coaching checklist items. The canonical submit
  // payload is unchanged; this is a pure logger-UX compaction.
  const [selectedWarmup, setSelectedWarmup] = useState<ProtocolSelection[]>([]);
  const [selectedBalanceCore, setSelectedBalanceCore] = useState<ProtocolSelection[]>([]);
  const [selectedCooldown, setSelectedCooldown] = useState<ProtocolSelection[]>([]);
  const [nasmSectionsOpen, setNasmSectionsOpen] = useState<Record<ProtocolSectionKey, boolean>>({
    warmup: false,
    balance_core: false,
    cooldown: false,
  });

  // When the rolodex is opened from a protocol section's Add button we
  // stash the section here so `onSelectExercise` knows where to route
  // the selected exercise. null = main exercises section.
  const [pendingSectionContext, setPendingSectionContext] = useState<ProtocolSectionKey | null>(null);

  // ── NASM Helpers ──
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
    // protocolSectionSetters is stable across renders (useState setters).
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

  // ── Load Phase Template ──
  const loadPhaseTemplate = useCallback((phase: number) => {
    const template = getPhaseTemplate(phase);
    if (!template) return;

    // Pre-fill exercises from template.
    //
    // Phase 16 (2026-04-16): rating fields (rpe, formQuality, formRating)
    // default to null = "not rated" instead of phantom neutral defaults
    // (was rpe: 5, formQuality: 3, formRating: 3). The wire contract
    // strips null keys on submit; the backend persists DB null; the
    // canonical charts exclude these rows from averages.
    const templateExercises: ExerciseEntry[] = template.exercises.map((ex, i) => ({
      exerciseId: `template-${phase}-${i}-${Date.now()}`,
      exerciseName: ex.name,
      sets: Array.from({ length: Array.isArray(ex.sets) ? ex.sets.length : (Number(ex.sets) || 3) }, (_, s) => ({
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

    // 2026-04-17 rolodex-first rebuild: translate template protocol id
    // lists into ProtocolSelection records on the compact sections.
    // Previously this "marked" items as completed on the giant static
    // checklist, which meant the user still had to visually parse 25
    // warmup rows to see which 5 were highlighted. Now phase templates
    // populate the compact selected-items list directly.
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
    toast.success(`Loaded Phase ${phase} template — ${templateExercises.length} exercises, ${templateExercises.reduce((s, e) => s + e.sets.length, 0)} sets`);
  }, []);

  // 2026-04-17 Codex round 3 fix: the earlier `loadClientData` wrapper
  // was pure indirection (an async useCallback that just awaited
  // `executeLoadClientData`). Its deps array referenced
  // `executeLoadClientData`, which is declared ~160 lines below this
  // point in the component body — accessing that identifier at render
  // time in the deps array tripped the TDZ and crashed the component
  // on mount: `ReferenceError: Cannot access 'executeLoadClientData'
  // before initialization`. The wrapper is deleted and the mount
  // effect moved adjacent to `executeLoadClientData` (below) so no
  // TDZ access is possible.

  // ── AI-to-Logger prefill ──
  const convertAIExercises = useCallback((incoming: WorkoutExerciseTransfer[]): ExerciseEntry[] => {
    return incoming.map(ex => {
      const setCount = Array.isArray(ex.sets) ? ex.sets.length : (Number(ex.sets) || 3);
      return {
      exerciseId: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      exerciseName: ex.exerciseName,
      sets: Array.from({ length: setCount }, (_, i) => ({
        setNumber: i + 1,
        weight: ex.weight || 0,
        reps: ex.reps || 10,
        // Phase 16: AI-prefilled sets default to null rating (not rated).
        rpe: null,
        tempo: ex.tempo || '',
        restTime: ex.restTime || 60,
        formQuality: null,
        notes: ex.notes || '',
      })),
      formRating: null,
      painLevel: 0,
      performanceNotes: '',
    };});
  }, []);

  // Listen for live custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<WorkoutPlanTransfer>).detail;
      if (detail?.exercises?.length) {
        const converted = convertAIExercises(detail.exercises);
        setExercises(prev => [...prev, ...converted]);
        toast.success(`Applied ${converted.length} exercises from AI plan`);
        try { sessionStorage.removeItem(PENDING_WORKOUT_KEY); } catch { /* ignore */ }
      }
    };
    window.addEventListener(APPLY_WORKOUT_EVENT, handler);
    return () => window.removeEventListener(APPLY_WORKOUT_EVENT, handler);
  }, [convertAIExercises]);

  // ── AI-as-Operator Event Listeners ──
  useEffect(() => {
    const onLoadTemplate = (e: Event) => {
      const { phase } = (e as CustomEvent).detail || {};
      if (phase >= 1 && phase <= 5) loadPhaseTemplate(phase);
    };
    const onAddExercise = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.exerciseName) return;
      const entry: ExerciseEntry = {
        exerciseId: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        exerciseName: d.exerciseName,
        sets: Array.from({ length: Array.isArray(d.sets) ? d.sets.length : (Number(d.sets) || 3) }, (_, i) => ({
          setNumber: i + 1,
          weight: d.weight || 0,
          reps: d.reps || 10,
          // Phase 16: AI-added exercises default to null rating.
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
    // 2026-04-17: rebuilt for the compact ProtocolSelection model that
    // replaced the old 25/20/15-row completed-checkbox lists. The
    // assistant-facing AI_TOGGLE_NASM_ITEM payload contract is unchanged
    // (`{ section, itemName, markAll, completed }` per
    // utils/aiWorkoutEvents.ts), so no backend / dispatcher update is
    // needed. Mapping:
    //   - markAll: true,  completed: true  → preselect every
    //                                        phase-appropriate recommendation
    //   - markAll: true,  completed: false → clear all selected for the section
    //   - itemName + completed: true       → find-by-name-fragment in the
    //                                        section's defaults, add to selected
    //   - itemName + completed: false      → remove matching selected item(s)
    const onToggleItem = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.section) return;
      const section = d.section as ProtocolSectionKey;
      if (section !== 'warmup' && section !== 'balance_core' && section !== 'cooldown') {
        return;
      }
      const setter = protocolSectionSetters[section];
      const shouldAdd = d.completed !== false; // undefined / true → add; false → remove

      if (d.markAll) {
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
    window.addEventListener('AI_TOGGLE_NASM_ITEM', onToggleItem);
    return () => {
      window.removeEventListener('AI_LOAD_TEMPLATE', onLoadTemplate);
      window.removeEventListener('AI_ADD_EXERCISE', onAddExercise);
      window.removeEventListener('AI_TOGGLE_NASM_ITEM', onToggleItem);
    };
    // currentOPTPhase is a dep because the `markAll` path uses it to
    // pick phase-appropriate recommendations — without it in deps the
    // listener closure would stale on phase change.
    // protocolSectionSetters is intentionally omitted: it's rebuilt
    // every render but its contained setState setters are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPhaseTemplate, currentOPTPhase]);

  // Check sessionStorage on mount for pending AI plan
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(PENDING_WORKOUT_KEY);
      if (pending) {
        const plan: WorkoutPlanTransfer = JSON.parse(pending);
        if (plan.exercises?.length) {
          const converted = convertAIExercises(plan.exercises);
          setExercises(prev => [...prev, ...converted]);
          toast.success(`Loaded ${converted.length} exercises from AI plan`);
          sessionStorage.removeItem(PENDING_WORKOUT_KEY);
        }
      }
    } catch { /* ignore parse errors */ }
  }, [convertAIExercises]);

  // ── Client Data ──
  const executeLoadClientData = useCallback(async () => {
    setIsLoadingClient(true);
    try {
      // 2026-04-17: guard against mounting without a resolvable client
      // context. Before this guard, the self-route mount hit
      // `/api/workout-forms/client/undefined/info` and 403'd.
      if (typeof effectiveClientId !== 'number') {
        setClient(null);
        return;
      }

      const api = new ApiService();
      // 2026-04-17: isClientSelfMode already resolved in the outer
      // scope. Use it instead of re-deriving here. When the logged-in
      // client is logging their own workout, hit the self endpoint
      // which does not require an explicit id in the URL.
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
          phone: data.client.phone
        });
        if (data.client.hasWorkoutToday) {
          toast.warning(`${data.client.firstName} already has a workout logged for today`);
        }
        if (data.client.availableSessions <= 1) {
          toast.warning(`${data.client.firstName} has only ${data.client.availableSessions} session(s) remaining`);
        }
      } else {
        throw new Error(data.message || 'Failed to load client data');
      }
    } catch (error: unknown) {
      console.error('Failed to load client data:', error);
      // Fail-closed: set sessions to 0 on network error to prevent unlimited submissions.
      // Admins bypass the session check (line 482), so they can still submit if needed.
      setClient({
        id: effectiveClientId ?? 0,
        firstName: 'Client',
        lastName: typeof effectiveClientId === 'number' ? `#${effectiveClientId}` : '',
        email: '',
        availableSessions: 0,
        phone: ''
      });
      toast.error(getErrorMessage(error, 'Failed to load client information'));
    } finally {
      setIsLoadingClient(false);
    }
  }, [effectiveClientId, isClientSelfMode]);

  // ── Load client on mount ──
  //
  // 2026-04-17 Codex round 3 fix: this effect used to live ~165 lines
  // above via a wrapper `loadClientData` that deps-referenced
  // `executeLoadClientData`, tripping the TDZ. Placing the effect
  // directly after the callback it depends on eliminates the ordering
  // hazard — `executeLoadClientData` is already initialized by the
  // time this `useEffect` registers its deps.
  useEffect(() => {
    executeLoadClientData();
  }, [executeLoadClientData]);

  // ── Load Today's Plan ──
  //
  // L4 (2026-05-02): primary source is `currentSession.exercises`, the
  // cursor-driven "what's next" the L1 backend computes from
  // planData.weeks[currentWeek-1].days[currentDay-1]. This respects
  // mid-week navigation (e.g. user is on Week 3 Day 2 — load THAT day,
  // not whichever day matches the calendar). We fall through to the
  // legacy day-of-week match against `plan.days[]` when no cursor is
  // present (legacy plans without weeks[] structure).
  //
  // Receipt §C4: the backend exposes currentSession at three levels
  // (body.currentSession, body.data.currentSession, body.plan.currentSession),
  // all deep-equal post-JSON. We read `data.currentSession` for symmetry
  // with the existing `data.plan.*` reads below.
  const loadTodaysPlan = useCallback(async () => {
    setIsLoadingPlan(true);
    try {
      const api = new ApiService();
      // 2026-04-17: use the effective (possibly-self) client id. If it
      // is undefined at this point, short-circuit — no plan to load.
      if (typeof effectiveClientId !== 'number') {
        toast.info('No client context — cannot load a plan');
        setIsLoadingPlan(false);
        return;
      }
      const response = await api.get(`/api/workouts/${effectiveClientId}/current`);
      const data = (response?.data ?? response) as CurrentWorkoutPlanResponse;

      const numberOr = (value: number | string | undefined, fallback: number) => {
        const parsed = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      const exerciseToEntry = (ex: PlannedExercise): ExerciseEntry => {
        const setCount = Array.isArray(ex.sets) ? ex.sets.length : numberOr(ex.sets, 3);
        return {
          exerciseId: String(ex.exerciseId || ex.id || `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
          exerciseName: ex.exerciseName || ex.name || 'Unknown Exercise',
          sets: Array.from({ length: setCount }, (_, i) => ({
            setNumber: i + 1,
            weight: numberOr(ex.weight, 0),
            reps: numberOr(ex.targetReps ?? ex.reps, 10),
            // Phase 16: today's-plan prefilled sets default to null rating.
            rpe: null,
            tempo: ex.tempo || '',
            restTime: numberOr(ex.restTime ?? ex.restSeconds, 60),
            formQuality: null,
            notes: '',
          })),
          formRating: null,
          painLevel: 0,
          performanceNotes: '',
        };
      };

      // ── L4 primary path: cursor-driven currentSession.exercises ──
      // L4 round-2 (Codex 2026-05-02 final review LOW): the backend
      // emits currentSession at THREE levels (top, data, plan) all
      // deep-equal post-JSON. Read top-level FIRST, then fall through
      // to `data.currentSession` and `plan.currentSession` so this
      // consumer survives if a future backend tweak drops the top-level
      // copy (defensive — the contract today guarantees all three).
      const cursorSession =
        data?.currentSession
        ?? data?.data?.currentSession
        ?? data?.plan?.currentSession
        ?? null;
      const cursorExercises = Array.isArray(cursorSession?.exercises) ? cursorSession.exercises : [];
      if (cursorSession && cursorExercises.length > 0) {
        const prefilled = cursorExercises.map(exerciseToEntry);
        setExercises(prev => [...prev, ...prefilled]);
        const weekNum = cursorSession.weekNumber ?? '?';
        const dayLabel = cursorSession.dayLabel || `Day ${cursorSession.dayNumber ?? '?'}`;
        toast.success(`Loaded ${prefilled.length} exercises from Week ${weekNum} — ${dayLabel}`);
        return;
      }

      // ── L4 fallback: legacy day-of-week match against plan.days[] ──
      if (!data?.plan?.days?.length) {
        toast.info('No active workout plan found for this client');
        return;
      }

      const dayOfWeek = new Date().getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayName = dayNames[dayOfWeek];

      const planDay = data.plan.days.find(
        (day) => day.dayName?.toLowerCase() === todayName.toLowerCase()
      ) || data.plan.days[dayOfWeek % data.plan.days.length];

      if (!planDay?.exercises?.length) {
        toast.info(`No exercises scheduled for ${todayName} in the active plan`);
        return;
      }

      const prefilled = planDay.exercises.map(exerciseToEntry);
      setExercises(prev => [...prev, ...prefilled]);
      toast.success(`Loaded ${prefilled.length} exercises from ${todayName}'s plan`);
    } catch (error: unknown) {
      console.error('Failed to load today\'s plan:', error);
      toast.error(getErrorMessage(error, 'Could not load today\'s workout plan'));
    } finally {
      setIsLoadingPlan(false);
    }
  }, [effectiveClientId]);

  // ── Exercise CRUD (Phase 6: pre-fill from last session) ──
  //
  // Phase 16 (2026-04-16): new exercise entries keep formRating null
  // instead of seeding a false rating. See Phase 16 debate summary for scope.
  const addExercise = useCallback((exercise: Exercise | ExerciseSlim) => {
    // Trigger ghost data fetch for pre-fill — but NEVER on client self-mode.
    // The underlying /api/admin/clients/:id/workouts endpoint is admin-only
    // and 403s for clients. The hook also guards internally (round 12
    // no-op return), this call-site guard is defense-in-depth: even if a
    // future refactor breaks the hook-side defense, client sessions still
    // cannot fire the admin request from here.
    // 2026-04-18 Phase 16.2 round 12 (Codex smoke finding).
    if (!isClientSelfMode) {
      ghostPreFill.fetchExerciseHistory(exercise.name);
    }
    const preFilled = ghostPreFill.createPreFilledSet(exercise.name, 1);

    setExercises(prev => [...prev, {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: [preFilled],
      formRating: null,
      painLevel: 0,
      performanceNotes: ''
    }]);
    setShowExerciseSearch(false);
    toast.success(`Added ${exercise.name} to workout`);
  }, [ghostPreFill, isClientSelfMode]);

  const addSet = useCallback((exerciseIndex: number) => {
    setExercises(prev => prev.map((exercise, i) => {
      if (i !== exerciseIndex) return exercise;
      const preFilled = ghostPreFill.createPreFilledSet(
        exercise.exerciseName,
        exercise.sets.length + 1
      );
      return { ...exercise, sets: [...exercise.sets, preFilled] };
    }));
  }, [ghostPreFill]);

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

  // ── Export PDF ──
  const handleExportPDF = useCallback(() => {
    if (exercises.length === 0) {
      toast.error('Add exercises before exporting');
      return;
    }
    const pdfExercises: PDFExerciseEntry[] = exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      sets: exercise.sets.map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        rpe: set.rpe ?? 0,
        tempo: set.tempo,
        restTime: set.restTime,
        formQuality: set.formQuality ?? 0,
        notes: set.notes,
      })),
      formRating: exercise.formRating ?? 0,
      painLevel: exercise.painLevel,
      performanceNotes: exercise.performanceNotes,
    }));

    exportWorkoutLoggerPDF({
      clientName: client ? `${client.firstName} ${client.lastName}` : 'Client',
      trainerName: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : undefined,
      date: new Date().toISOString().split('T')[0],
      exercises: pdfExercises,
      sessionNotes,
      overallIntensity: overallIntensity ?? undefined,
    });
    toast.success('PDF exported');
  }, [exercises, client, user, sessionNotes, overallIntensity]);

  // ── Submit with AbortSignal timeout (Phase 3 fix) ──
  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true; // Set IMMEDIATELY after check to close race window
    setIsSubmitting(true);

    if (exercises.length === 0) { toast.error('Please add at least one exercise'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    if (!client) { toast.error('Client information not loaded'); isSubmittingRef.current = false; setIsSubmitting(false); return; }
    // Strict === 0 check: null (unknown/error state) passes through, allowing submission
    if (client.availableSessions === 0 && user?.role !== 'admin') {
      toast.error('Client has no available sessions remaining'); isSubmittingRef.current = false; setIsSubmitting(false); return;
    }

    const hasIncompleteExercises = exercises.some(exercise =>
      exercise.sets.length === 0 ||
      exercise.sets.some(set => set.weight === 0 && set.reps === 0)
    );
    if (hasIncompleteExercises) {
      toast.error('Please complete all exercise sets before submitting'); isSubmittingRef.current = false; setIsSubmitting(false); return;
    }

    // Phase 16 (2026-04-16): wire contract = omit null rating fields.
    // Full docstring + unit tests live in
    // `./workoutLoggerSubmitPayload.ts`. The builder is extracted as a
    // pure function so the wire contract is independently testable
    // (see `WorkoutLogger.submitContract.test.tsx` / T10).
    //
    // 2026-04-17: submit blocked unless we have a real client id. The
    // UI disables the submit button upstream, but defend here too.
    if (typeof effectiveClientId !== 'number') {
      toast.error('No client context — unable to submit');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    const formData = buildWorkoutFormSubmitBody({
      clientId: effectiveClientId,
      date: new Date().toISOString().split('T')[0],
      exercises,
      sessionNotes,
      overallIntensity,
    });

    // Phase 6: Offline-first — queue if offline
    if (!offlineQueue.isOnline) {
      offlineQueue.queueSubmission(formData);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await dailyWorkoutFormService.submitWorkoutForm(
        formData as Parameters<typeof dailyWorkoutFormService.submitWorkoutForm>[0]
      );

      if (response.success && response.data) {
        toast.success('Workout logged successfully! Session deducted and points earned.');
        setSubmittedFormId(response.data.id || response.data.formId || null);
        resolvedOnComplete(response.data);
      } else {
        throw new Error(response.message || 'Failed to submit workout form');
      }
    } catch (error: unknown) {
      console.error('Error submitting workout form:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Workout submission timed out. Please try again.');
      } else {
        // Phase 6: Queue locally if submit fails due to network
        offlineQueue.queueSubmission(formData);
      }
    } finally {
      clearTimeout(timeoutId);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // ── Generate & Send Summary ──
  const handleGenerateSummary = useCallback(async () => {
    if (!submittedFormId && exercises.length === 0) {
      toast.error('Submit the workout first before generating a summary');
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

  // ── Computed Values ──
  const totalSets = useMemo(() =>
    exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0), [exercises]);

  const estimatedDuration = useMemo(() =>
    Math.min(totalSets * MINUTES_PER_SET, MAX_WORKOUT_DURATION), [totalSets]);

  // ── Loading State ──
  if (!client) {
    return (
      <WorkoutLoggerContainer>
        <CenteredLoader>
          <LoadingSpinner />
        </CenteredLoader>
      </WorkoutLoggerContainer>
    );
  }

  // ── Render ──
  return (
    <NASMLearningProvider>
      <WorkoutLoggerContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/*
          Equipment Profile Picker — 2026-04-17: hidden on the client
          self-log route. The underlying `/api/equipment-profiles`
          endpoint is trainer/admin gated (`equipmentRoutes.mjs:72`), so
          mounting this picker as a client would 403 on every fetch.
          Equipment profiles are trainer-authored training locations;
          they are not relevant to client self-logging. Trainer / admin
          paths (mounted via EnhancedWorkoutLogger) continue to render it.
        */}
        {!isClientSelfMode && (
          <EquipmentProfilePicker
            selectedProfileId={equipmentProfileId}
            onSelect={setEquipmentProfileId}
            label="Training Location"
          />
        )}

        {/* AI Assistant Panel */}
        <AITerminalPanel
          context="workout_generation"
          clientId={effectiveClientId}
          equipmentProfileId={equipmentProfileId}
          placeholder="Ask Swan Coach to suggest exercises for this client..."
        />

        {/* Header */}
        <WorkoutLoggerHeader
          clientFirstName={client.firstName}
          clientLastName={client.lastName}
          availableSessions={client.availableSessions ?? 0}
          totalSets={totalSets}
          estimatedDuration={estimatedDuration}
          currentOPTPhase={currentOPTPhase}
          onOPTPhaseChange={setCurrentOPTPhase}
        />

        {/* Phase 6: Session Stats Bar (sticky, live volume/sets/calories) */}
        {exercises.length > 0 && <SessionStatsBar stats={sessionStats} />}

        {/* Phase 6: Quick Log / Full Mode Toggle */}
        {exercises.length > 0 && (
          <ModeToggle>
            <ModeButton $active={!isQuickLogMode} onClick={() => setIsQuickLogMode(false)}>
              Full Mode
            </ModeButton>
            <ModeButton $active={isQuickLogMode} onClick={() => setIsQuickLogMode(true)}>
              Quick Log
            </ModeButton>
            {!offlineQueue.isOnline && (
              <OfflineBadge aria-label="Offline — workouts will be saved locally">
                Offline{offlineQueue.pendingCount > 0 ? ` (${offlineQueue.pendingCount})` : ''}
              </OfflineBadge>
            )}
            {restTimer.isRunning && (
              <RestTimerBadge aria-label={`Rest timer: ${restTimer.secondsLeft}s`}>
                ⏱ {restTimer.secondsLeft}s
              </RestTimerBadge>
            )}
          </ModeToggle>
        )}

        {/* Learning Mode Toggle */}
        <LearningModeToggle />

        {/* NASM Phase Guide — Education card with Load Template */}
        <NASMPhaseGuide
          phase={currentOPTPhase}
          onLoadTemplate={loadPhaseTemplate}
        />

        {/* NASM Warmup (2026-04-17: compact rolodex-first card) */}
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

        {/* Exercise Section */}
        <ExerciseSection>
          <LoadPlanRow>
            <LoadPlanButton onClick={loadTodaysPlan} disabled={isLoadingPlan}>
              <Download size={16} />
              {isLoadingPlan ? 'Loading...' : "Load Today's Plan"}
            </LoadPlanButton>
          </LoadPlanRow>

          <ExerciseSearchBar>
            <RolodexTrigger
              onClick={() => {
                // Main section add — clear any pending protocol context
                // so the next rolodex selection lands in `exercises`.
                setPendingSectionContext(null);
                setShowExerciseSearch(prev => !prev);
              }}
              aria-label="Search and add exercises"
              aria-expanded={showExerciseSearch}
            >
              <Plus size={18} />
              Search & Add Exercise
            </RolodexTrigger>
            {/*
              2026-04-17: The rolodex is the single shared picker across the
              main workout body AND all three protocol sections. When a
              protocol section's Add button is clicked, `pendingSectionContext`
              is set and the rolodex routes the selection into that section's
              compact selected-items list. When it's null, selections flow
              into the main `exercises` array (and through Phase 16's
              null-honest save path — untouched ratings stay null).
            */}
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
            /* Phase 6: Quick Log Mode — 3-tap streamlined view */
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
                key={exercise.exerciseId || exerciseIndex}
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
                // Round 12 (2026-04-18): suppress GhostDataRow's admin
                // fetch on the client self-log route. Ghost-prefill and
                // ghost-data are visible hints only; they shouldn't 403.
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

        {/* NASM Balance & Core (2026-04-17: compact rolodex-first card) */}
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

        {/* NASM Cooldown (2026-04-17: compact rolodex-first card) */}
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

        {/* Session Summary */}
        {exercises.length > 0 && (
          <SessionSummaryForm
            overallIntensity={overallIntensity}
            onIntensityChange={setOverallIntensity}
            sessionNotes={sessionNotes}
            onNotesChange={setSessionNotes}
            exerciseCount={exercises.length}
            totalSets={totalSets}
            estimatedDuration={estimatedDuration}
          />
        )}

        {/* ARIA Live Region for screen readers */}
        <LiveRegion role="status" aria-live="polite" aria-atomic="true">
          {exercises.length > 0 && `${exercises.length} exercise${exercises.length !== 1 ? 's' : ''} logged, ${totalSets} total sets`}
        </LiveRegion>

        {/* Footer Actions */}
        <WorkoutLoggerFooter
          onCancel={resolvedOnCancel}
          onExportPDF={handleExportPDF}
          onSubmit={handleSubmit}
          onGenerateSummary={handleGenerateSummary}
          hasExercises={exercises.length > 0}
          isSubmitting={isSubmitting}
          isGeneratingSummary={isGeneratingSummary}
          showGenerateSummary={!!submittedFormId}
        />
      </WorkoutLoggerContainer>

      {/* Floating PiP Rest Timer */}
      {showFloatingTimer && (
        <FloatingRestTimer onClose={() => setShowFloatingTimer(false)} />
      )}

      {/* Timer toggle FAB (only when exercises exist) */}
      {exercises.length > 0 && !showFloatingTimer && (
        <TimerFAB
          onClick={() => setShowFloatingTimer(true)}
          aria-label="Open floating rest timer"
          title="Rest Timer"
        >
          ⏱
        </TimerFAB>
      )}
    </NASMLearningProvider>
  );
};

export default WorkoutLogger;

// ==================== STYLED COMPONENTS (orchestrator-only) ====================

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const TimerFAB = styled.button`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 9989;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: var(--bg-elevated, ${CS.surface});
  border: 1px solid var(--accent-primary, rgba(96, 192, 240, 0.3));
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 0 16px rgba(96, 192, 240, 0.15);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 0 20px 4px rgba(139, 92, 246, 0.4);
  }

  @media (max-width: 430px) {
    bottom: 1rem;
    right: 1rem;
  }
`;

const WorkoutLoggerContainer = styled(motion.div)`
  min-height: 100vh;
  background: ${CS.bgDeep};
  background-image: radial-gradient(circle at 80% 20%, ${withAlpha(CS.secondary, 0.08)} 0%, transparent 40%),
                    radial-gradient(circle at 20% 80%, ${withAlpha(CS.glow, 0.04)} 0%, transparent 40%);
  padding: 2rem;
  color: ${CS.text};
  font-family: 'Sora', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;

  &::before {
    content: '';
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 256px 256px;
  }

  & > * { position: relative; }

  @media (max-width: 768px) { padding: 1rem; }
  @media (max-width: 430px) { padding: 0.75rem; }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: ${spin} 0.8s ease-in-out infinite;
`;

const CenteredLoader = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const WarmupProtocolIcon = styled(Heart)`
  color: ${CS.gaming};
`;

const BalanceProtocolIcon = styled(Shield)`
  color: var(--accent-secondary, #8B5CF6);
`;

const CooldownProtocolIcon = styled(RotateCcw)`
  color: ${CS.accent};
`;

const ExerciseSection = styled.div`
  margin-bottom: 2rem;
`;

const LoadPlanRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
`;

const LoadPlanButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  color: #8B5CF6;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover:not(:disabled) {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.5);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ExerciseSearchBar = styled.div`
  position: relative;
  z-index: 10;
  margin-bottom: 2rem;
`;

const RolodexTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 52px;
  padding: 1rem 1.25rem;
  background: ${CS.inputBgDark};
  backdrop-filter: blur(16px);
  border: 2px solid ${withAlpha(CS.glow, 0.12)};
  border-radius: 1rem;
  color: ${CS.textSecondary};
  font-size: 0.95rem;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, color 0.2s;

  &:hover {
    border-color: ${CS.glow};
    color: ${CS.text};
  }

  &:focus-visible {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 3px rgba(80, 160, 240, 0.15);
  }

  svg { color: ${CS.gaming}; flex-shrink: 0; }
`;

const AddExerciseButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 2rem;
  background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
  border: none;
  border-radius: 1rem;
  color: #ffffff;
  font-weight: 700;
  font-size: 1rem;
  font-family: 'Plus Jakarta Sans', sans-serif;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  margin-bottom: 2rem;
  min-height: 52px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(80, 160, 240, 0.25);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    background-size: 200% 100%;
    animation: ${shimmer} 3s ease-in-out infinite;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 36px rgba(80, 160, 240, 0.4);
  }
  &:active { transform: scale(0.98); }

  ${reducedMotionSafe}
`;

const LiveRegion = styled.div`
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
`;

// ── Phase 6: Quick Log Mode Toggle & Status Badges ──

const ModeToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const ModeButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  min-height: 44px;
  border-radius: 0.625rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${({ $active }) =>
    $active ? CS.glow : CS.glassBorder};
  background: ${({ $active }) =>
    $active ? withAlpha(CS.glow, 0.15) : 'transparent'};
  color: ${({ $active }) =>
    $active ? CS.gaming : CS.textMuted};

  &:hover {
    border-color: ${CS.glow};
    color: ${CS.text};
  }

  &:focus-visible {
    outline: 2px solid ${CS.glow};
    outline-offset: 2px;
  }
`;

const OfflineBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  background: ${CS.warningBg};
  border: 1px solid ${CS.warningBorder};
  color: ${CS.warningText};
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: auto;
`;

const RestTimerBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
  background: ${CS.infoBg};
  border: 1px solid ${CS.infoBorder};
  color: ${CS.gaming};
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;
