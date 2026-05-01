/**
 * ============================================================================
 * FILE: WorkoutPlannerPage.tsx
 * PURPOSE: NASM Workout Planner with exercise rolodex, builder, teach mode, and AI generation
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Admin/Trainer workout planning page. Three-panel layout:
 *   Left: Exercise Rolodex (840+ exercises with search/filter)
 *   Center: Workout Builder (selected exercises with NASM parameters)
 *   Right: Teach Mode sidebar (educational content per selected exercise)
 * HOW IT FITS IN THE APP: Admin Dashboard → Workouts → Workout Planner
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: WorkoutPlannerPage                               ║
 * ║  PURPOSE: NASM OPT-based workout planning with Coach AI      ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-28                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ NASM Workout Planner  [Client▾] [Phase▾] [Category▾]     │
 * │                       [AI Generate] [Teach Mode]          │
 * ├──────────┬────────────────────────┬───────────────────────┤
 * │ Rolodex  │  Workout Builder       │  Teach Mode           │
 * │ [Search] │  Phase 2: Str. Endur.  │  "Why This Exercise?" │
 * │ [Chips]  │  1. Bench Press 4x8-12 │  [Wisdom text...]     │
 * │ ● Bench  │  2. DB Rows    4x8-12  │  ────────────────     │
 * │ ○ Squat  │  3. Squats     4x8-12  │  Exercise Data Card   │
 * │ ○ Rows   │  [+ Add Exercise]      │  OPT Phase Info       │
 * └──────────┴────────────────────────┴───────────────────────┘
 *
 * DATA FLOW:
 * Props In:  none (page-level)
 * State:     { clients, selectedClient, exercises, phase, planExercises, teachMode }
 * API Calls: GET /api/auth/clients, GET /api/exercises/all,
 *            POST /api/workout-builder/generate, POST /api/workout-builder/plan
 * Children:  TeachModeSidebar
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
import { List } from 'react-window';
import {
  Dumbbell, Search, Sparkles, BookOpen, Plus, X, Calendar, ClipboardList,
  Loader2, Save, Download, Zap, AlertTriangle, ChevronDown, ChevronUp, Info, Eye,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useExerciseSearch } from '../../../WorkoutLogger/useExerciseSearch';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import TeachModeSidebar from './TeachModeSidebar';

// AI Terminal — lazy since it's optional UI
const AITerminalPanel = lazy(() => import('../../../Shared/AITerminalPanel'));
import {
  type PlanExercise, type PlannerClient, type WorkoutCategory,
  type GeneratedWorkout, type GeneratedPlan, type PlanDuration,
  OPT_PHASES, WORKOUT_CATEGORIES, PLAN_GOALS, PLAN_DURATIONS,
  type PlanGoal,
} from './WorkoutPlannerTypes';
import {
  Page, Header, HeaderLeft, HeaderIcon, Title, Subtitle,
  ControlRow, Select, ActionBtn, ThreePanel,
  Panel, PanelHeader, PanelTitle, PanelBody,
  SearchWrapper, SearchInput, ChipRow, Chip,
  ExerciseItem, ExerciseAddBtn, ExerciseName, ExerciseMeta, MetaTag,
  BuilderRow, BuilderRowNumber, BuilderRowInfo, MiniInput, RemoveBtn,
  PhaseBadge, PhaseLabel, PhaseParams,
  SkeletonBlock, EmptyMessage, TeachToggle, StatusBanner, DegradedBanner,
  GeneratingSkeletonWrap, GeneratingSkeletonRow, SkeletonCircle, SkeletonBar,
  GeneratingLabel, ExplanationsPanel, ExplanationsToggle, ExplanationItem, ExplanationBadge,
  PlanModeBar, PlanModeLabel, SmallSelect,
  MesocycleSection, MesocycleSectionTitle, MesocycleGrid, MesocycleCard,
  MesocycleHeader, MesocycleTitle, MesocycleWeeks, MesocyclePhase,
  MesocycleParams, MesocycleParam, MesocycleOverload, DeloadBadge,
  ScheduleRow, ScheduleDay, ScheduleDayNumber, ScheduleDayFocus,
  RecommendationList, RecommendationItem,
} from './WorkoutPlannerStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Body Part Filter Categories
// ─────────────────────────────────────────────────────────────
const BODY_PARTS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs',
  'Core', 'Full Body', 'Cardio', 'Recovery',
];

const EXERCISE_TYPES = [
  'All Types', 'Compound', 'Isolation', 'Calisthenics',
  'Stability', 'Flexibility', 'Core',
];

const EQUIPMENT_FILTERS = [
  'All Equipment', 'Bodyweight', 'Dumbbell', 'Barbell', 'Machine',
  'Cable', 'Resistance Band', 'Kettlebell', 'Sliders',
  'Stability Ball', 'Medicine Ball', 'BOSU', 'TRX',
];

const SOURCE_FILTERS = ['All Programs', 'NASM', 'SwanStudios'] as const;

// Joint impact derived from exerciseType + difficulty
const IMPACT_LEVELS = ['All Impact', 'Low Impact', 'Medium Impact', 'High Impact'] as const;

function getJointImpact(ex: { exerciseType: string; difficulty: number }): string {
  const lowTypes = ['flexibility', 'stability', 'balance'];
  const highTypes = ['calisthenics', 'compound'];
  if (lowTypes.includes(ex.exerciseType) || ex.difficulty <= 200) return 'Low Impact';
  if (highTypes.includes(ex.exerciseType) && ex.difficulty >= 500) return 'High Impact';
  return 'Medium Impact';
}

/**
 * Parse equipment field — handles JSON strings, arrays, and null/empty.
 * DB stores equipment as JSON string '["Cable Machine"]' but some records have arrays.
 */
function parseEquipment(eq: unknown): string[] {
  if (!eq) return [];
  if (Array.isArray(eq)) return eq.filter(Boolean);
  if (typeof eq === 'string') {
    if (eq === '[]' || eq === '') return [];
    try {
      const parsed = JSON.parse(eq);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      // Not JSON — treat as single equipment name
      return [eq];
    }
  }
  return [];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const WorkoutPlannerPage: React.FC = () => {
  const { authAxios, user } = useAuth();

  // ── Client State ──
  const [clients, setClients] = useState<PlannerClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);

  // ── Planner State ──
  const [phaseNumber, setPhaseNumber] = useState(2);
  const [category, setCategory] = useState<WorkoutCategory>('full_body');
  const [goal, setGoal] = useState<PlanGoal>('general_fitness');
  const [planDuration, setPlanDuration] = useState<PlanDuration>('single');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseSlim | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [selectedMesoDay, setSelectedMesoDay] = useState(1);

  // ── Saved Plans State ──
  const [savedPlans, setSavedPlans] = useState<{ id: string; name: string; status: string; createdAt: string; goal: string }[]>([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);

  // ── Advanced Filter State ──
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [impactFilter, setImpactFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  // ── UI State ──
  const [teachModeOpen, setTeachModeOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [degradedIntelligence, setDegradedIntelligence] = useState(false);
  const [explanations, setExplanations] = useState<{ type: string; message: string; details?: string | string[] }[]>([]);
  const [showExplanations, setShowExplanations] = useState(false);

  // ── Exercise Search ──
  const {
    results: exerciseResults,
    isLoading: exercisesLoading,
    setQuery: setSearchQuery,
    setCategory: setFilterCategory,
    query: searchQuery,
    category: filterCategory,
  } = useExerciseSearch();

  const phase = useMemo(
    () => OPT_PHASES.find(p => p.phase === phaseNumber) || OPT_PHASES[1],
    [phaseNumber]
  );

  // ── Apply advanced filters on top of search results ──
  const filteredExercises = useMemo(() => {
    let pool = exerciseResults;
    // Filter by exercise type
    if (exerciseTypeFilter) {
      const norm = exerciseTypeFilter.toLowerCase();
      pool = pool.filter(ex => (ex.exerciseType || '').toLowerCase() === norm);
    }
    // Filter by equipment
    if (equipmentFilter) {
      const norm = equipmentFilter.toLowerCase();
      if (norm === 'bodyweight') {
        pool = pool.filter(ex => {
          const eqArr = parseEquipment(ex.equipment);
          return eqArr.length === 0
            || eqArr.some(e => e.toLowerCase().includes('body') || e.toLowerCase() === 'none');
        });
      } else {
        pool = pool.filter(ex => {
          const eqArr = parseEquipment(ex.equipment);
          return eqArr.length > 0 && eqArr.some(e => e.toLowerCase().includes(norm));
        });
      }
    }
    // Filter by source/program
    if (sourceFilter) {
      pool = pool.filter(ex => {
        const src = (ex.source || 'swanstudios').toLowerCase();
        if (sourceFilter === 'nasm') return src.startsWith('nasm');
        if (sourceFilter === 'swanstudios') return src === 'swanstudios';
        return true;
      });
    }
    // Filter by joint impact
    if (impactFilter) {
      pool = pool.filter(ex => getJointImpact(ex) === impactFilter);
    }
    return pool;
  }, [exerciseResults, exerciseTypeFilter, equipmentFilter, sourceFilter, impactFilter]);

  // ── Add Exercise to Plan ──
  // canonical-surface-audit 2026-04-13 (Phase 6 production hotfix):
  // This declaration MUST live above ExerciseRowRenderer because line 262's
  // useCallback dep array references `addExercise`. When the dep array is
  // evaluated during the initial render, addExercise must already be
  // initialized — otherwise it is in the Temporal Dead Zone and the entire
  // WorkoutPlannerPage component crashes with
  // "ReferenceError: Cannot access 'addExercise' before initialization".
  // The crash was masked by minifier ordering before commit 8d5ab1aa
  // forced a Vite rebundle.
  const addExercise = useCallback((ex: ExerciseSlim) => {
    setPlanExercises(prev => {
      if (prev.some(p => p.exerciseSlim.id === ex.id)) return prev;
      const defaultSets = parseInt(phase.sets.split('-')[0]) || 3;
      // Parse rest: "3-5min" → 180s (use low end of range in seconds)
      const restStr = phase.rest.toLowerCase();
      let restSec = 60;
      if (restStr.includes('min')) {
        const minVal = parseInt(restStr) || 3;
        restSec = minVal * 60;
      } else {
        restSec = parseInt(restStr.replace(/[^0-9]/g, '')) || 60;
      }
      return [...prev, {
        id: `${ex.id}-${Date.now()}`,
        exerciseSlim: ex,
        sets: defaultSets,
        reps: phase.reps,
        tempo: phase.tempo,
        restSeconds: restSec,
        intensityPercent: parseInt(phase.intensity.split('-')[0]) || 70,
        notes: '',
      }];
    });
    setSelectedExercise(ex);
  }, [phase]);

  // ── Virtualized row renderer (react-window v2 List API) ──
  const ExerciseRowRenderer = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const ex = filteredExercises[index];
    if (!ex) return null;
    return (
      <div style={style}>
        <ExerciseItem
          role="button"
          tabIndex={0}
          $selected={selectedExercise?.id === ex.id}
          onClick={() => { setSelectedExercise(ex); }}
          onDoubleClick={() => addExercise(ex)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addExercise(ex); } }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <ExerciseName>{ex.name}</ExerciseName>
            <ExerciseMeta>
              <MetaTag>{ex.bodyPartCategory}</MetaTag>
              <MetaTag>{ex.exerciseType}</MetaTag>
              <MetaTag>{(() => { const eqArr = parseEquipment(ex.equipment); return eqArr.length > 0 ? eqArr.slice(0, 2).join(', ') : 'Bodyweight'; })()}</MetaTag>
              <MetaTag $impact={getJointImpact(ex)}>{getJointImpact(ex)}</MetaTag>
            </ExerciseMeta>
          </div>
          <ExerciseAddBtn
            onClick={(e) => { e.stopPropagation(); addExercise(ex); }}
            aria-label={`Add ${ex.name}`}
          >
            <Plus size={18} />
          </ExerciseAddBtn>
        </ExerciseItem>
      </div>
    );
  }, [filteredExercises, selectedExercise, addExercise, setSelectedExercise]);

  // ── Fetch Clients ──
  // 2026-05-01 role-aware fix: /api/auth/clients is adminOnly. Trainers
  // (now landing on the workout planner with active assignments) must
  // hit /api/client-trainer-assignments/trainer/:id instead. Admins keep
  // the global /api/auth/clients path. Same routing pattern as
  // GlobalClientContext provider.
  useEffect(() => {
    const fetchClients = async () => {
      try {
        if (user?.role === 'trainer' && user.id) {
          const res = await authAxios.get(`/api/client-trainer-assignments/trainer/${user.id}`);
          const assignments = res.data?.assignments || res.data?.data?.assignments || [];
          const clients = (Array.isArray(assignments) ? assignments : [])
            .map((a: any) => a.client || a.Client)
            .filter(Boolean);
          setClients(clients);
          if (clients.length > 0) setSelectedClientId(clients[0].id);
        } else {
          const res = await authAxios.get('/api/auth/clients');
          if (res.data?.success && Array.isArray(res.data.clients)) {
            setClients(res.data.clients);
            if (res.data.clients.length > 0) {
              setSelectedClientId(res.data.clients[0].id);
            }
          }
        }
      } catch {
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };
    fetchClients();
  }, [authAxios, user?.role, user?.id]);

  // ── Remove Exercise ──
  const removeExercise = useCallback((id: string) => {
    setPlanExercises(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Update Exercise Params ──
  const updateExercise = useCallback((id: string, field: keyof PlanExercise, value: unknown) => {
    setPlanExercises(prev =>
      prev.map(p => p.id === id ? { ...p, [field]: value } : p)
    );
  }, []);

  // ── Coach AI: Generate Workout ──
  const handleAIGenerate = useCallback(async () => {
    if (!selectedClientId) return;
    setGenerating(true);
    setDegradedIntelligence(false);
    setStatusMsg(null);
    setExplanations([]);
    setShowExplanations(false);
    try {
      const res = await authAxios.post('/api/workout-builder/generate', {
        clientId: selectedClientId,
        category,
        exerciseCount: 6,
        rotationPattern: 'standard',
        primaryGoal: goal,
        nasmPhase: phaseNumber,
      });
      if (res.data?.success && res.data.workout) {
        const workout: GeneratedWorkout = res.data.workout;
        // Check for degraded intelligence (pain data unavailable)
        const isDegraded = res.data.workout.context?.criticalDataUnavailable === true;
        setDegradedIntelligence(isDegraded);
        if (isDegraded) {
          const safetyWarning = workout.explanations?.find(
            (e: { type: string; message: string }) => e.type === 'safety_warning'
          );
          setStatusMsg({
            type: 'error',
            text: safetyWarning?.message || 'Pain/injury data unavailable — review this workout carefully before assigning.',
          });
        }
        // Set phase from generated workout
        if (workout.nasmPhase) setPhaseNumber(workout.nasmPhase);
        // Convert generated exercises to plan exercises
        const generated: PlanExercise[] = workout.exercises.map((ex, i) => ({
          id: `gen-${i}-${Date.now()}`,
          exerciseSlim: {
            id: ex.exerciseKey,
            name: ex.exerciseName,
            exerciseKey: ex.exerciseKey,
            exerciseType: ex.category || 'compound',
            bodyPartCategory: ex.muscles?.[0] || 'Full Body',
            primaryMuscles: ex.muscles || [],
            difficulty: 300,
          },
          sets: ex.sets,
          reps: String(ex.reps),
          tempo: ex.tempo,
          // Parse rest: backend may return number (seconds) or string like "3-5min"
          restSeconds: (() => {
            if (typeof ex.rest === 'number') return ex.rest;
            const s = String(ex.rest || '60').toLowerCase();
            if (s.includes('min')) return (parseInt(s) || 3) * 60;
            return parseInt(s.replace(/[^0-9]/g, '')) || 60;
          })(),
          intensityPercent: typeof ex.intensity === 'number' ? ex.intensity : (parseInt(String(ex.intensity).replace(/[^0-9]/g, '')) || 70),
          notes: ex.recommendedWeightMin
            ? `Recommended: ${ex.recommendedWeightMin}-${ex.recommendedWeightMax} lbs (based on ${ex.basedOn1RM} lb 1RM)`
            : '',
        }));
        setPlanExercises(generated);

        // Store explanations from the AI reasoning pipeline
        if (workout.explanations && workout.explanations.length > 0) {
          setExplanations(workout.explanations);
          setShowExplanations(true);
        }
      }
    } catch (err: unknown) {
      console.error('AI generation failed:', err);
      // Surface specific failure reason from backend error response
      const errData = (err as { response?: { data?: { error?: string; details?: string } } })?.response?.data;
      const specificMsg = errData?.details || errData?.error;
      if (specificMsg?.includes('client context unavailable')) {
        setStatusMsg({ type: 'error', text: 'Unable to generate workout: Client data could not be loaded. Verify the client has an active profile with pain entries and equipment profile.' });
      } else if (specificMsg?.includes('equipment')) {
        setStatusMsg({ type: 'error', text: `Unable to generate workout: ${specificMsg}. Please verify the client's equipment profile.` });
      } else if (specificMsg) {
        setStatusMsg({ type: 'error', text: `Workout generation failed: ${specificMsg}` });
      } else {
        setStatusMsg({ type: 'error', text: 'Swan Coach generation failed. Check client data and try again.' });
      }
    } finally {
      setGenerating(false);
    }
  }, [authAxios, selectedClientId, category, goal, phaseNumber]);

  // ── Coach AI: Generate Multi-Week Plan ──
  const handleGeneratePlan = useCallback(async () => {
    if (!selectedClientId || planDuration === 'single') return;
    setGeneratingPlan(true);
    setStatusMsg(null);
    setGeneratedPlan(null);
    try {
      const res = await authAxios.post('/api/workout-builder/plan', {
        clientId: selectedClientId,
        durationWeeks: Number(planDuration),
        sessionsPerWeek,
        primaryGoal: goal,
        startingPhaseOverride: phaseNumber,
      });
      if (res.data?.success && res.data.plan) {
        setGeneratedPlan(res.data.plan);
        setStatusMsg({ type: 'success', text: `${res.data.plan.planSummary.durationWeeks}-week periodized plan generated successfully!` });
      }
    } catch (err: unknown) {
      console.error('Plan generation failed:', err);
      const errData = (err as { response?: { data?: { error?: string; details?: string } } })?.response?.data;
      const specificMsg = errData?.details || errData?.error;
      setStatusMsg({ type: 'error', text: specificMsg ? `Plan generation failed: ${specificMsg}` : 'Failed to generate training plan. Check client data and try again.' });
    } finally {
      setGeneratingPlan(false);
    }
  }, [authAxios, selectedClientId, planDuration, sessionsPerWeek, goal, phaseNumber]);

  // ── Save Plan ──
  const handleSave = useCallback(async () => {
    if (!selectedClientId || planExercises.length === 0) return;
    setSaving(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      // Map to backend WorkoutPlan model schema:
      // { userId, title, description, nasmPhase, status, planData }
      const phaseToOpt: Record<number, string> = {
        1: 'stabilization_endurance', 2: 'strength_endurance',
        3: 'hypertrophy', 4: 'maximal_strength', 5: 'power',
      };
      const categoryLabel = WORKOUT_CATEGORIES.find(c => c.value === category)?.label || 'Full Body';
      await authAxios.post('/api/workout/plans', {
        userId: selectedClientId,
        title: `${client?.firstName || 'Client'}'s ${phase.name} Plan`,
        description: `${categoryLabel} — ${goal}`,
        nasmPhase: phaseNumber,
        planData: {
          weeks: [{
            weekNumber: 1,
            days: [{
              dayNumber: 1,
              name: `${phase.name} Workout`,
              focus: categoryLabel,
              dayType: 'training',
              optPhase: phaseToOpt[phaseNumber] || 'strength_endurance',
              exercises: planExercises.map((p, i) => ({
                exerciseId: p.exerciseSlim.id,
                exerciseName: p.exerciseSlim.name,
                orderInWorkout: i + 1,
                sets: p.sets,
                reps: p.reps,
                setScheme: `${p.sets}x${p.reps}`,
                repGoal: p.reps,
                restPeriod: typeof p.restSeconds === 'number' ? p.restSeconds : parseInt(String(p.restSeconds)) || 60,
                tempo: p.tempo,
                intensityGuideline: `${p.intensityPercent}% 1RM`,
                notes: p.notes || '',
              })),
            }],
          }],
          goal,
          category,
        },
      });
      setStatusMsg({ type: 'success', text: 'Workout plan saved successfully!' });
      // Refresh saved plans list
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      console.error('Save failed:', err);
      setStatusMsg({ type: 'error', text: 'Failed to save plan. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, selectedClientId, planExercises, phase, category, goal, clients, planDuration]);

  // ── Fetch Saved Plans for Client ──
  const fetchSavedPlans = useCallback(async (clientId: number | null) => {
    if (!clientId) { setSavedPlans([]); return; }
    setSavedPlansLoading(true);
    try {
      const res = await authAxios.get(`/api/workout/plans?clientId=${clientId}`);
      const data = res.data;
      if (data?.success && Array.isArray(data.plans)) {
        setSavedPlans(data.plans.map((p: Record<string, unknown>) => ({
          id: String(p.id || ''),
          name: String(p.title || p.name || 'Untitled Plan'),
          status: String(p.status || 'draft'),
          createdAt: String(p.createdAt || ''),
          goal: String((p.planData as Record<string, unknown>)?.goal || p.goal || ''),
        })));
      } else {
        setSavedPlans([]);
      }
    } catch {
      setSavedPlans([]);
    } finally {
      setSavedPlansLoading(false);
    }
  }, [authAxios]);

  // Fetch saved plans when client changes
  useEffect(() => {
    fetchSavedPlans(selectedClientId);
  }, [selectedClientId, fetchSavedPlans]);

  // ── Phase B: Saved-plan click-to-load hydration ──
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(null);
  const [loadedPlanName, setLoadedPlanName] = useState<string | null>(null);
  const isDirty = planExercises.length > 0 && !loadedPlanId;

  const handleLoadPlan = useCallback(async (planId: string, planName: string) => {
    // Dirty-state confirm: if user has unsaved exercises in builder, warn before overwrite.
    if (isDirty) {
      const proceed = window.confirm(
        `You have unsaved changes in the builder. Load "${planName}" and discard them?`
      );
      if (!proceed) return;
    }
    try {
      const res = await authAxios.get(`/api/workout-plans/${planId}`);
      const plan = res.data?.plan;
      if (!plan) {
        setStatusMsg({ type: 'error', text: 'Plan not found or not authorized.' });
        return;
      }
      // Hydrate builder state from plan.planData JSONB structure.
      const planData = plan.planData || {};
      const firstWeek = planData.weeks?.[0];
      const firstDay = firstWeek?.days?.[0] || firstWeek?.sessions?.[0];
      const exercises = firstDay?.exercises || [];

      // Build PlanExercise[] from saved structure.
      const hydrated: PlanExercise[] = exercises.map((ex: Record<string, unknown>, i: number) => ({
        id: `loaded-${planId}-${i}-${Date.now()}`,
        exerciseSlim: {
          id: String(ex.exerciseId || ''),
          name: String(ex.exerciseName || ex.name || 'Unknown'),
          exerciseKey: String(ex.exerciseId || ''),
          exerciseType: 'compound',
          bodyPartCategory: 'Full Body',
          primaryMuscles: [],
          difficulty: 300,
        },
        sets: Number(ex.sets) || 3,
        reps: String(ex.reps || ex.repGoal || '8-12'),
        tempo: String(ex.tempo || ''),
        restSeconds: typeof ex.restPeriod === 'number' ? ex.restPeriod : 60,
        intensityPercent: 70,
        notes: String(ex.notes || ''),
      }));

      setPlanExercises(hydrated);
      if (plan.nasmPhase) setPhaseNumber(plan.nasmPhase);
      if (planData.goal) setGoal(planData.goal as PlanGoal);
      if (planData.category) setCategory(planData.category as WorkoutCategory);
      setLoadedPlanId(String(planId));
      setLoadedPlanName(planName);
      setStatusMsg({ type: 'success', text: `Loaded plan: ${planName}` });
    } catch (err: unknown) {
      const errData = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (errData?.status === 404) {
        setStatusMsg({ type: 'error', text: 'Plan not found or not authorized.' });
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to load plan. Please try again.' });
      }
    }
  }, [authAxios, isDirty]);

  // ── Filter chip handler ──
  const handleChipClick = useCallback((bodyPart: string) => {
    setFilterCategory(bodyPart === 'All' ? null : bodyPart);
  }, [setFilterCategory]);

  return (
    <Page>
      {/* Header */}
      <Header>
        <HeaderLeft>
          <HeaderIcon><Dumbbell size={22} /></HeaderIcon>
          <div>
            <Title>Swan Studios Workout Planner</Title>
            <Subtitle>Build intelligent, periodized training programs with 880+ exercises</Subtitle>
          </div>
        </HeaderLeft>
        <TeachToggle $active={teachModeOpen} onClick={() => setTeachModeOpen(v => !v)}>
          <BookOpen size={16} />
          Teach Mode {teachModeOpen ? 'On' : 'Off'}
        </TeachToggle>
      </Header>

      {/* Controls */}
      <ControlRow>
        <Select
          value={selectedClientId ?? ''}
          onChange={e => {
            setSelectedClientId(Number(e.target.value));
            setPlanExercises([]);
            setGeneratedPlan(null);
            setExplanations([]);
          }}
          aria-label="Select client"
        >
          {clientsLoading ? (
            <option>Loading clients...</option>
          ) : clients.length === 0 ? (
            <option>No clients found</option>
          ) : (
            clients.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))
          )}
        </Select>
        <Select
          value={phaseNumber}
          onChange={e => setPhaseNumber(Number(e.target.value))}
          aria-label="Select OPT phase"
        >
          {OPT_PHASES.map(p => (
            <option key={p.phase} value={p.phase}>Phase {p.phase}: {p.name}</option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={e => setCategory(e.target.value as WorkoutCategory)}
          aria-label="Select workout category"
        >
          {WORKOUT_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
        <Select
          value={goal}
          onChange={e => setGoal(e.target.value as PlanGoal)}
          aria-label="Select training goal"
        >
          {PLAN_GOALS.map(g => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </Select>
        <ActionBtn
          $variant="cosmic"
          onClick={planDuration === 'single' ? handleAIGenerate : handleGeneratePlan}
          disabled={generating || generatingPlan || !selectedClientId}
        >
          {generating || generatingPlan ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating || generatingPlan ? 'Generating...' : planDuration === 'single' ? 'Swan Coach Generate' : 'Generate Plan'}
        </ActionBtn>
      </ControlRow>

      {/* Plan Duration Controls */}
      <PlanModeBar>
        <PlanModeLabel><Calendar size={14} /> Plan Duration</PlanModeLabel>
        <SmallSelect
          value={planDuration}
          onChange={e => {
            setPlanDuration(e.target.value as PlanDuration);
            setGeneratedPlan(null);
            setPlanExercises([]);
          }}
          aria-label="Select plan duration"
        >
          {PLAN_DURATIONS.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </SmallSelect>
        {planDuration !== 'single' && (
          <>
            <PlanModeLabel>Sessions/Week</PlanModeLabel>
            <SmallSelect
              value={sessionsPerWeek}
              onChange={e => setSessionsPerWeek(Number(e.target.value))}
              aria-label="Sessions per week"
            >
              {[1, 2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n}×/week</option>
              ))}
            </SmallSelect>
          </>
        )}
      </PlanModeBar>

      {/* Status Message */}
      {statusMsg && (
        <StatusBanner $type={statusMsg.type} role="alert">
          {statusMsg.text}
          <button onClick={() => setStatusMsg(null)} aria-label="Dismiss">&times;</button>
        </StatusBanner>
      )}

      {/* Degraded Intelligence Warning */}
      {degradedIntelligence && planExercises.length > 0 && (
        <DegradedBanner role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Limited Context Mode</strong> — Pain/injury data could not be loaded for this client.
            This workout was generated without injury exclusions. Review each exercise carefully before assigning.
          </div>
        </DegradedBanner>
      )}

      {/* Embedded AI Terminal — workout generation context */}
      <Suspense fallback={null}>
        <AITerminalPanel
          context="workout_generation"
          clientId={selectedClientId ?? undefined}
          label="Workout Swan Coach Assistant"
          placeholder="Ask me about exercise selection, periodization, NASM protocols..."
          compact
          defaultOpen={false}
        />
      </Suspense>

      {/* Three-Panel Layout */}
      <ThreePanel $teachModeOpen={teachModeOpen}>
        {/* Left: Exercise Rolodex */}
        <Panel>
          <PanelHeader>
            <PanelTitle><Search size={16} /> Exercise Rolodex</PanelTitle>
            <span style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: '0.7rem',
              color: 'rgba(224, 236, 244, 0.5)',
            }}>
              {filteredExercises.length} results
            </span>
          </PanelHeader>
          {/* Filters section — fixed height, does not scroll */}
          <div style={{ flexShrink: 0, padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <SearchWrapper>
              <Search size={14} />
              <SearchInput
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search exercises..."
                aria-label="Search exercises"
              />
            </SearchWrapper>
            {/* Body Part filter */}
            <ChipRow>
              {BODY_PARTS.map(bp => (
                <Chip
                  key={bp}
                  $active={filterCategory === null ? bp === 'All' : filterCategory === bp}
                  onClick={() => handleChipClick(bp)}
                >
                  {bp}
                </Chip>
              ))}
            </ChipRow>
            {/* Program/Source filter */}
            <ChipRow>
              {SOURCE_FILTERS.map(sf => (
                <Chip
                  key={sf}
                  $active={sourceFilter === null ? sf === 'All Programs' : sourceFilter === sf.toLowerCase()}
                  onClick={() => setSourceFilter(sf === 'All Programs' ? null : sf.toLowerCase())}
                >
                  {sf}
                </Chip>
              ))}
            </ChipRow>
            {/* Exercise Type filter */}
            <ChipRow>
              {EXERCISE_TYPES.map(et => (
                <Chip
                  key={et}
                  $active={exerciseTypeFilter === null ? et === 'All Types' : exerciseTypeFilter === et.toLowerCase()}
                  onClick={() => setExerciseTypeFilter(et === 'All Types' ? null : et.toLowerCase())}
                >
                  {et}
                </Chip>
              ))}
            </ChipRow>
            {/* Equipment filter */}
            <ChipRow>
              {EQUIPMENT_FILTERS.map(eq => (
                <Chip
                  key={eq}
                  $active={equipmentFilter === null ? eq === 'All Equipment' : equipmentFilter === eq.toLowerCase()}
                  onClick={() => setEquipmentFilter(eq === 'All Equipment' ? null : eq.toLowerCase())}
                >
                  {eq}
                </Chip>
              ))}
            </ChipRow>
            {/* Joint Impact filter */}
            <ChipRow>
              {IMPACT_LEVELS.map(il => (
                <Chip
                  key={il}
                  $active={impactFilter === null ? il === 'All Impact' : impactFilter === il}
                  onClick={() => setImpactFilter(il === 'All Impact' ? null : il)}
                >
                  {il}
                </Chip>
              ))}
            </ChipRow>
          </div>
          {/* Exercise list — flex: 1, own scroll via FixedSizeList. No outer scroll conflict. */}
          <div style={{ flex: 1, minHeight: 0, padding: '0 16px 8px' }}>
            {exercisesLoading ? (
              Array.from({ length: 6 }, (_, i) => <SkeletonBlock key={i} />)
            ) : filteredExercises.length === 0 ? (
              <EmptyMessage>No exercises match your filters.</EmptyMessage>
            ) : (
              <List
                rowComponent={ExerciseRowRenderer}
                rowCount={filteredExercises.length}
                rowHeight={64}
                rowProps={{}}
                style={{ height: 420, overflowX: 'hidden' }}
              />
            )}
          </div>
        </Panel>

        {/* Center: Workout Builder */}
        <Panel style={degradedIntelligence ? { border: '1px solid #C6A84B' } : undefined}>
          <PanelHeader>
            <PanelTitle><Zap size={16} /> Workout Builder</PanelTitle>
            <div style={{ display: 'flex', gap: 8 }}>
              <ActionBtn onClick={handleSave} disabled={saving || planExercises.length === 0}>
                {saving ? <Loader2 size={14} /> : <Save size={14} />}
                Save Plan
              </ActionBtn>
            </div>
          </PanelHeader>
          <PanelBody>
            {/* OPT Phase Indicator */}
            <PhaseBadge>
              <PhaseLabel>Phase {phase.phase}</PhaseLabel>
              <PhaseParams>
                {phase.name} — {phase.sets} sets × {phase.reps} reps — {phase.tempo} — {phase.rest}
              </PhaseParams>
            </PhaseBadge>

            {generating ? (
              <GeneratingSkeletonWrap role="status" aria-live="polite" aria-label="Generating workout">
                <GeneratingLabel>Swan Coach is analyzing client data and building your workout...</GeneratingLabel>
                {Array.from({ length: 6 }, (_, i) => (
                  <GeneratingSkeletonRow key={i} style={{ animationDelay: `${i * 100}ms` }}>
                    <SkeletonCircle />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <SkeletonBar $width={`${60 + Math.random() * 30}%`} />
                      <SkeletonBar $width={`${30 + Math.random() * 20}%`} />
                    </div>
                  </GeneratingSkeletonRow>
                ))}
              </GeneratingSkeletonWrap>
            ) : planExercises.length === 0 ? (
              <EmptyMessage>
                Click exercises in the Rolodex to add them, or use Swan Coach Generate for an intelligent program.
              </EmptyMessage>
            ) : (
              planExercises.map((pe, idx) => (
                <BuilderRow key={pe.id}>
                  <BuilderRowNumber>{idx + 1}</BuilderRowNumber>
                  <BuilderRowInfo>
                    <ExerciseName
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedExercise(pe.exerciseSlim)}
                    >
                      {pe.exerciseSlim.name}
                    </ExerciseName>
                    <ExerciseMeta>
                      {pe.exerciseSlim.primaryMuscles.slice(0, 2).join(', ') || pe.exerciseSlim.bodyPartCategory}
                    </ExerciseMeta>
                  </BuilderRowInfo>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(224,236,244,0.4)', marginBottom: 2 }}>Sets</div>
                      <MiniInput
                        type="number"
                        value={pe.sets}
                        onChange={e => updateExercise(pe.id, 'sets', parseInt(e.target.value) || 1)}
                        min={1}
                        max={10}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(224,236,244,0.4)', marginBottom: 2 }}>Reps</div>
                      <MiniInput
                        value={pe.reps}
                        onChange={e => updateExercise(pe.id, 'reps', e.target.value)}
                        style={{ width: 64 }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(224,236,244,0.4)', marginBottom: 2 }}>Tempo</div>
                      <MiniInput
                        value={pe.tempo}
                        onChange={e => updateExercise(pe.id, 'tempo', e.target.value)}
                        style={{ width: 56 }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(224,236,244,0.4)', marginBottom: 2 }}>Rest(s)</div>
                      <MiniInput
                        type="number"
                        value={pe.restSeconds}
                        onChange={e => updateExercise(pe.id, 'restSeconds', parseInt(e.target.value) || 0)}
                        min={0}
                        max={600}
                      />
                    </div>
                  </div>
                  <RemoveBtn onClick={() => removeExercise(pe.id)} aria-label={`Remove ${pe.exerciseSlim.name}`}>
                    <X size={14} />
                  </RemoveBtn>
                </BuilderRow>
              ))
            )}

            {planExercises.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <ActionBtn
                  onClick={() => {
                    // Quick add prompt — clear search to browse
                    setSearchQuery('');
                    setFilterCategory(null);
                  }}
                >
                  <Plus size={14} />
                  Add Exercise
                </ActionBtn>
              </div>
            )}

            {/* AI Explanations Panel — shows reasoning, pain exclusions, safety warnings */}
            {explanations.length > 0 && (
              <ExplanationsPanel>
                <ExplanationsToggle onClick={() => setShowExplanations(v => !v)}>
                  <Info size={16} />
                  Swan Coach Reasoning ({explanations.length} insight{explanations.length !== 1 ? 's' : ''})
                  {showExplanations ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </ExplanationsToggle>
                {showExplanations && explanations.map((exp, i) => (
                  <ExplanationItem key={i} $type={exp.type}>
                    <ExplanationBadge $type={exp.type}>
                      {exp.type.replace(/_/g, ' ')}
                    </ExplanationBadge>
                    <div>
                      <div>{exp.message}</div>
                      {exp.details && (
                        <div style={{
                          marginTop: 4,
                          fontSize: '0.7rem',
                          color: 'var(--text-muted, rgba(224, 236, 244, 0.5))',
                          fontFamily: "'Fira Code', monospace",
                        }}>
                          {Array.isArray(exp.details)
                            ? exp.details.join(' · ')
                            : exp.details}
                        </div>
                      )}
                    </div>
                  </ExplanationItem>
                ))}
              </ExplanationsPanel>
            )}
          </PanelBody>
        </Panel>

        {/* Right: Teach Mode (conditional) */}
        {teachModeOpen && (
          <TeachModeSidebar
            exercise={selectedExercise}
            phaseNumber={phaseNumber}
            onPhaseChange={setPhaseNumber}
          />
        )}
      </ThreePanel>

      {/* Mesocycle Plan Display — shown after multi-week plan generation */}
      {generatedPlan && (
        <MesocycleSection>
          <MesocycleSectionTitle>
            <Calendar size={18} />
            {generatedPlan.planSummary.durationWeeks}-Week Periodized Plan
            — {generatedPlan.planSummary.totalSessions} Total Sessions
          </MesocycleSectionTitle>

          {/* Weekly Schedule — clickable day tabs */}
          <PlanModeLabel style={{ marginBottom: 8, display: 'block' }}>Weekly Schedule</PlanModeLabel>
          <ScheduleRow>
            {generatedPlan.weeklySchedule.map(day => (
              <ScheduleDay
                key={day.dayNumber}
                as="button"
                type="button"
                onClick={() => setSelectedMesoDay(day.dayNumber)}
                style={{
                  cursor: 'pointer',
                  outline: selectedMesoDay === day.dayNumber
                    ? '2px solid var(--accent-secondary, #8B5CF6)'
                    : 'none',
                  background: selectedMesoDay === day.dayNumber
                    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, var(--bg-elevated, #1A1A24))'
                    : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                <ScheduleDayNumber
                  style={selectedMesoDay === day.dayNumber
                    ? { color: 'var(--accent-secondary, #8B5CF6)' }
                    : undefined}
                >
                  Day {day.dayNumber}
                </ScheduleDayNumber>
                <ScheduleDayFocus>{day.focus}</ScheduleDayFocus>
              </ScheduleDay>
            ))}
          </ScheduleRow>

          {/* Active Day Detail */}
          {(() => {
            const activeDay = generatedPlan.weeklySchedule.find(d => d.dayNumber === selectedMesoDay);
            if (!activeDay) return null;
            return (
              <div style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, var(--bg-surface, #141419))',
                border: '1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)',
                marginBottom: 16,
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.8rem',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--accent-secondary, #8B5CF6)' }}>
                  Day {activeDay.dayNumber}: {activeDay.focus}
                </div>
                <div style={{ color: 'var(--text-muted, rgba(224,236,244,0.5))', fontSize: '0.7rem' }}>
                  Category: {activeDay.category} — Click exercises in the Rolodex to populate this day
                </div>
              </div>
            );
          })()}

          {/* Mesocycle Cards — clickable to switch OPT phase */}
          <PlanModeLabel style={{ marginBottom: 8, display: 'block' }}>Mesocycles (4-Week Blocks)</PlanModeLabel>
          <MesocycleGrid>
            {generatedPlan.mesocycles.map(mc => (
              <MesocycleCard
                key={mc.mesocycle}
                $phase={mc.nasmPhase}
                as="button"
                type="button"
                onClick={() => setPhaseNumber(mc.nasmPhase)}
                style={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  outline: mc.nasmPhase === phaseNumber
                    ? '2px solid var(--accent-secondary, #8B5CF6)'
                    : 'none',
                  transition: 'all 0.2s ease',
                }}
                title={`Click to switch to Phase ${mc.nasmPhase}: ${mc.phaseName}`}
              >
                <MesocycleHeader>
                  <MesocycleTitle>Block {mc.mesocycle}</MesocycleTitle>
                  <MesocycleWeeks>Wk {mc.weeks}</MesocycleWeeks>
                </MesocycleHeader>
                <MesocyclePhase $phase={mc.nasmPhase}>
                  Phase {mc.nasmPhase}: {mc.phaseName}
                </MesocyclePhase>
                <MesocycleParams>
                  <MesocycleParam>Sets: <span>{mc.params.sets}</span></MesocycleParam>
                  <MesocycleParam>Reps: <span>{mc.params.reps}</span></MesocycleParam>
                  <MesocycleParam>Tempo: <span>{mc.params.tempo}</span></MesocycleParam>
                  <MesocycleParam>Rest: <span>{mc.params.rest}</span></MesocycleParam>
                  <MesocycleParam>Intensity: <span>{mc.params.intensity}</span></MesocycleParam>
                </MesocycleParams>
                <MesocycleOverload>
                  {mc.overloadStrategy}
                  {mc.deloadWeek && <DeloadBadge>Deload Wk {mc.deloadWeek}</DeloadBadge>}
                </MesocycleOverload>
              </MesocycleCard>
            ))}
          </MesocycleGrid>

          {/* Recommendations */}
          {generatedPlan.recommendations.length > 0 && (
            <>
              <PlanModeLabel style={{ marginTop: 20, marginBottom: 8, display: 'block' }}>
                AI Recommendations
              </PlanModeLabel>
              <RecommendationList>
                {generatedPlan.recommendations.map((rec, i) => (
                  <RecommendationItem key={i}>{rec}</RecommendationItem>
                ))}
              </RecommendationList>
            </>
          )}
        </MesocycleSection>
      )}

      {/* Saved Plans for Selected Client */}
      {selectedClientId && (
        <MesocycleSection>
          <MesocycleSectionTitle>
            <ClipboardList size={18} />
            Saved Plans
            {savedPlans.length > 0 && (
              <span style={{
                marginLeft: 8,
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.75rem',
                color: 'var(--text-muted, rgba(224,236,244,0.5))',
              }}>
                ({savedPlans.length} plan{savedPlans.length !== 1 ? 's' : ''})
              </span>
            )}
          </MesocycleSectionTitle>
          {savedPlansLoading ? (
            <div style={{ padding: 16 }}>
              {Array.from({ length: 2 }, (_, i) => <SkeletonBlock key={i} />)}
            </div>
          ) : savedPlans.length === 0 ? (
            <EmptyMessage style={{ padding: 16 }}>
              No saved plans for this client yet. Generate and save a workout plan above.
            </EmptyMessage>
          ) : (
            <MesocycleGrid>
              {savedPlans.map(plan => (
                <MesocycleCard
                  key={plan.id}
                  $phase={1}
                  style={{
                    cursor: 'pointer',
                    outline: loadedPlanId === plan.id ? '2px solid var(--accent-primary, #60C0F0)' : undefined,
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Load plan: ${plan.name}`}
                  onClick={() => handleLoadPlan(plan.id, plan.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleLoadPlan(plan.id, plan.name);
                    }
                  }}
                >
                  <MesocycleHeader>
                    <MesocycleTitle style={{ fontSize: '0.85rem' }}>{plan.name}</MesocycleTitle>
                    <MesocycleWeeks style={{
                      background: plan.status === 'active'
                        ? 'color-mix(in srgb, #22c55e 20%, transparent)'
                        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)',
                      color: plan.status === 'active' ? '#22c55e' : undefined,
                    }}>
                      {plan.status}
                    </MesocycleWeeks>
                  </MesocycleHeader>
                  {plan.goal && (
                    <div style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted, rgba(224,236,244,0.5))',
                      fontFamily: "'Fira Code', monospace",
                      marginBottom: 4,
                    }}>
                      Goal: {plan.goal.replace(/_/g, ' ')}
                    </div>
                  )}
                  <div style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-muted, rgba(224,236,244,0.4))',
                    fontFamily: "'Fira Code', monospace",
                  }}>
                    Created: {new Date(plan.createdAt).toLocaleDateString()}
                  </div>
                </MesocycleCard>
              ))}
            </MesocycleGrid>
          )}
        </MesocycleSection>
      )}
    </Page>
  );
};

export default WorkoutPlannerPage;
