/**
 * COMPONENT: WorkoutPlannerPage
 * PURPOSE: Admin/trainer NASM OPT workout planning with rolodex, builder,
 * teach mode, AI generation, saved plans, and Client Hub return flows.
 *
 * Runtime flow: dashboard route -> selected client -> AI/manual plan build ->
 * save/activate -> saved-plan library -> optional return to Client Hub.
 * Keep this page behavior-focused; extract styles/helpers/components when it
 * approaches the file cap.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import TeachModeSidebar from './TeachModeSidebar';
// W1A-4 (2026-05-01): replace bare console.error(err) with sanitized helper
// that strips Axios error.config.headers (JWT) before logging.
import { logApiError } from '../../../../utils/logApiError';
import WorkoutPlannerRolodexPanel from './WorkoutPlannerRolodexPanel';
import WorkoutPlannerCommandPanel from './WorkoutPlannerCommandPanel';
import WorkoutPlannerBuilderPanel, {
  type WorkoutPlannerBuilderExplanation,
} from './WorkoutPlannerBuilderPanel';
import WorkoutPlannerGeneratedPlanSection from './WorkoutPlannerGeneratedPlanSection';
import WorkoutPlannerSavedPlansSection, { type SavedPlanSummary } from './WorkoutPlannerSavedPlansSection';
import WorkoutPlannerStatusAssistantStrip, {
  type WorkoutPlannerStatusMessage,
} from './WorkoutPlannerStatusAssistantStrip';
import { useWorkoutPlannerRolodexState } from './useWorkoutPlannerRolodexState';
// AI Village CRITICAL-4 fix (2026-05-02): extracted plan-data builder.
// Persists generatedPlan.weeks[] when present instead of flattening to a
// one-week shape, so V2 long-horizon work survives save.
import { buildPlanData as composePlanData, buildContentSignature } from './planDataBuilder';
import WorkoutPlannerConfirmDialog, { type WorkoutPlannerConfirmRequest } from './WorkoutPlannerConfirmDialog';
import {
  normalizeWorkoutPlannerClients,
  parseWorkoutPlannerClientId,
  pickWorkoutPlannerClientId,
  resolveWorkoutPlannerPlanClientId,
} from './WorkoutPlannerClientIdentity';

import {
  type PlanExercise, type PlannerClient, type WorkoutCategory,
  type GeneratedWorkout, type GeneratedPlan, type PlanDuration,
  OPT_PHASES, WORKOUT_CATEGORIES,
  type PlanGoal,
} from './WorkoutPlannerTypes';
import { Page, ThreePanel } from './WorkoutPlannerStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Body Part Filter Categories
// ─────────────────────────────────────────────────────────────
interface TrainerAssignmentResponse {
  client?: PlannerClient;
  Client?: PlannerClient;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const WorkoutPlannerPage: React.FC = () => {
  const { authAxios, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [confirmRequest, setConfirmRequest] = useState<WorkoutPlannerConfirmRequest | null>(null);
  const closeConfirmDialog = useCallback(() => setConfirmRequest(null), []);

  const requestedClientId = useMemo(() => parseWorkoutPlannerClientId(searchParams.get('clientId')), [searchParams]);
  const plannerReturnTo = useMemo(() => {
    const rawReturnTo = searchParams.get('returnTo');
    if (!rawReturnTo || !rawReturnTo.startsWith('/dashboard/') || /[\r\n\t\\]/.test(rawReturnTo)) return null;
    return rawReturnTo;
  }, [searchParams]);

  const [clients, setClients] = useState<PlannerClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);

  // L5 (2026-05-02): per-client self-service flag derived from the
  // currently-selected client. Admins / trainers stay unblocked - they
  // generate plans for clients regardless of this flag. The flag matters
  // only for the (currently dormant) client-self-service path: a client
  // viewing their OWN planner with the flag off must see a disabled
  // generate button. Today the planner is admin-only so the disable
  // branch is defensive; the visible pill below gives admins a quick
  // read on whether the client could self-generate if exposed.
  const selectedClient = useMemo(
    () => clients.find(c => c.id === selectedClientId) || null,
    [clients, selectedClientId],
  );
  const clientSelfGenStatus: 'enabled' | 'disabled' | 'unknown' =
    selectedClient
      ? (selectedClient.canGenerateWorkoutPlans ? 'enabled' : 'disabled')
      : 'unknown';
  const isViewerClient = user?.role === 'client';
  const viewerClientId = parseWorkoutPlannerClientId(user?.id);
  const clientGenBlocked = isViewerClient
    && viewerClientId === selectedClientId
    && !selectedClient?.canGenerateWorkoutPlans;

  const [phaseNumber, setPhaseNumber] = useState(2);
  const [category, setCategory] = useState<WorkoutCategory>('full_body');
  const [goal, setGoal] = useState<PlanGoal>('general_fitness');
  const [planDuration, setPlanDuration] = useState<PlanDuration>('single');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [selectedMesoDay, setSelectedMesoDay] = useState(1);

  const [savedPlans, setSavedPlans] = useState<SavedPlanSummary[]>([]);
  const [savedPlansLoading, setSavedPlansLoading] = useState(false);


  // ── UI State ──
  const [teachModeOpen, setTeachModeOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<WorkoutPlannerStatusMessage | null>(null);
  const [degradedIntelligence, setDegradedIntelligence] = useState(false);
  const [explanations, setExplanations] = useState<WorkoutPlannerBuilderExplanation[]>([]);
  const [showExplanations, setShowExplanations] = useState(false);

  const phase = useMemo(
    () => OPT_PHASES.find(p => p.phase === phaseNumber) || OPT_PHASES[1],
    [phaseNumber]
  );

  const {
    selectedExercise,
    setSelectedExercise,
    filteredExerciseCount,
    exercisesLoading,
    searchQuery,
    filterCategory,
    sourceFilter,
    exerciseTypeFilter,
    equipmentFilter,
    impactFilter,
    exerciseRowRenderer,
    setSearchQuery,
    setFilterCategory,
    setSourceFilter,
    setExerciseTypeFilter,
    setEquipmentFilter,
    setImpactFilter,
    clearSearchForBrowse,
  } = useWorkoutPlannerRolodexState({
    phase,
    setPlanExercises,
  });

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
          const assignmentClients = (Array.isArray(assignments) ? assignments : []).map((a: TrainerAssignmentResponse) => a.client || a.Client);
          const clients = normalizeWorkoutPlannerClients(assignmentClients);
          setClients(clients);
          setSelectedClientId(pickWorkoutPlannerClientId(clients, requestedClientId));
        } else {
          const res = await authAxios.get('/api/auth/clients');
          if (res.data?.success && Array.isArray(res.data.clients)) {
            const clients = normalizeWorkoutPlannerClients(res.data.clients);
            setClients(clients);
            setSelectedClientId(pickWorkoutPlannerClientId(clients, requestedClientId));
          }
        }
      } catch {
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };
    fetchClients();
  }, [authAxios, requestedClientId, user?.role, user?.id]);

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
        // W1A-2: AI-generated workouts haven't been saved yet — clear
        // saved-snapshot AND loadedPlanId so isDirty correctly reflects
        // "newly built, not yet saved." Prevents stale comparison against
        // a previously-loaded plan.
        setSavedSnapshot(null);
        setLoadedPlanId(null);
        setLoadedPlanName(null);

        // Store explanations from the AI reasoning pipeline
        if (workout.explanations && workout.explanations.length > 0) {
          setExplanations(workout.explanations);
          setShowExplanations(true);
        }
      }
    } catch (err: unknown) {
      logApiError('AI generation failed', err);
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
      logApiError('Plan generation failed', err);
      const errData = (err as { response?: { data?: { error?: string; details?: string } } })?.response?.data;
      const specificMsg = errData?.details || errData?.error;
      setStatusMsg({ type: 'error', text: specificMsg ? `Plan generation failed: ${specificMsg}` : 'Failed to generate training plan. Check client data and try again.' });
    } finally {
      setGeneratingPlan(false);
    }
  }, [authAxios, selectedClientId, planDuration, sessionsPerWeek, goal, phaseNumber]);

  // ── Plan Library helpers ──
  // buildPlanData: compose the JSONB payload from current builder state.
  // Reused by Save Draft, Save & Make Current, Update Plan, Update & Make Current.
  //
  // AI Village CRITICAL-4 fix (2026-05-02): when a multi-month plan was
  // generated via POST /api/workout-builder/plan, persist the FULL
  // generatedPlan.weeks[] structure (and every L1 additive field) so
  // long-horizon work survives save. Manual one-day Plan Builder mode
  // is preserved when no generatedPlan is present. Logic lives in the
  // tested planDataBuilder module so the persistence contract has
  // Tier-A coverage.
  const hasGeneratedHorizonPlan = !!(
    generatedPlan
    && Array.isArray(generatedPlan.weeks)
    && generatedPlan.weeks.length > 0
  );

  const buildPlanData = useCallback(() => {
    const categoryLabel = WORKOUT_CATEGORIES.find(c => c.value === category)?.label || 'Full Body';
    if (hasGeneratedHorizonPlan && generatedPlan) {
      return composePlanData({
        mode: 'generated',
        generatedPlan,
        category,
        goal,
      });
    }
    return composePlanData({
      mode: 'manual',
      phaseName: phase.name,
      phaseNumber,
      category,
      categoryLabel,
      goal,
      planExercises,
    });
  }, [phase.name, phaseNumber, category, planExercises, goal, hasGeneratedHorizonPlan, generatedPlan]);

  // ── Phase B: Saved-plan click-to-load hydration ──
  // 2026-05-01 hoisted from below the save handlers to fix TDZ
  // (handleSaveDraft etc. reference loadedPlanId / currentExercisesSig in
  // their dep arrays; declarations must precede those handlers).
  const [loadedPlanId, setLoadedPlanId] = useState<string | null>(null);
  const [loadedPlanName, setLoadedPlanName] = useState<string | null>(null);

  // W1A-2 (2026-05-01): track the planExercises snapshot at the last
  // "saved/loaded" point so editing a loaded plan is correctly detected
  // as dirty. Prior `isDirty = exercises.length > 0 && !loadedPlanId`
  // never went dirty after load → clicking another saved plan silently
  // overwrote unsaved edits to the first one. Snapshot resets on:
  //   - successful load (snapshot = the exercises just hydrated)
  //   - successful save (snapshot = the exercises just persisted)
  //   - clear / reset (snapshot = null)
  // AI-generated workouts that haven't been saved yet leave snapshot null,
  // matching the prior "newly built, not yet saved" dirty semantic.
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  // Stable serialization of the current builder state for diff comparison.
  // Only the fields that round-trip through save/load are compared; UI-only
  // fields like `id` (which is a render-time ephemeral) are excluded so a
  // freshly-loaded plan is byte-equal to its snapshot.
  // AI Village CRITICAL-4 fix (2026-05-02): when a generated multi-month
  // plan is loaded, the dirty signature must change with the generated
  // content (not the manual planExercises which may be empty in that
  // mode). Otherwise the Update Plan button never lights up after a
  // long-horizon generate. The shared signature builder also makes
  // manual ↔ generated mode transitions visible to dirty tracking.
  const currentExercisesSig = useMemo(() => {
    const categoryLabel = WORKOUT_CATEGORIES.find(c => c.value === category)?.label || 'Full Body';
    if (hasGeneratedHorizonPlan && generatedPlan) {
      return buildContentSignature({ mode: 'generated', generatedPlan, category, goal });
    }
    return buildContentSignature({
      mode: 'manual',
      phaseName: phase.name,
      phaseNumber,
      category,
      categoryLabel,
      goal,
      planExercises,
    });
  }, [planExercises, hasGeneratedHorizonPlan, generatedPlan, category, goal, phase.name, phaseNumber]);

  const isDirty = useMemo(() => {
    // Codex 2026-05-03 round-2 MED-1: dirty-state must consider
    // `hasGeneratedHorizonPlan` so swapping a 4×/wk plan for a 6×/wk plan
    // in the same loaded-plan session enables Update Plan even when
    // `planExercises` is empty.
    if (planExercises.length === 0 && !hasGeneratedHorizonPlan) return false;
    // No snapshot → freshly built or generated, treat as dirty.
    if (savedSnapshot === null) return true;
    // Snapshot exists → dirty iff current state differs from snapshot.
    return currentExercisesSig !== savedSnapshot;
  }, [planExercises.length, savedSnapshot, currentExercisesSig, hasGeneratedHorizonPlan]);

  // ── Save Draft ── (Plan Library §5.1, no-loaded-plan path)
  // POSTs as status='draft' so the new partial unique index never trips.
  // Trainer can promote to current later via Activate.
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

  const handleSaveDraft = useCallback(async () => {
    // AI Village CRITICAL-4 fix: a generated multi-month plan with no
    // manual planExercises is still saveable — the generatedPlan.weeks[]
    // is the source of truth in that mode.
    if (!selectedClientId || (planExercises.length === 0 && !hasGeneratedHorizonPlan)) return;
    setSaving(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const categoryLabel = WORKOUT_CATEGORIES.find(c => c.value === category)?.label || 'Full Body';
      const res = await authAxios.post('/api/workout-plans', {
        userId: selectedClientId,
        title: `${client?.firstName || 'Client'}'s ${phase.name} Plan`,
        description: `${categoryLabel} — ${goal}`,
        nasmPhase: phaseNumber,
        status: 'draft',
        planData: buildPlanData(),
      });
      setStatusMsg({ type: 'success', text: 'Plan saved as draft.' });
      setSavedSnapshot(currentExercisesSig);
      // Capture the new id so subsequent edits become "Update Plan" mode
      const newId = res.data?.plan?.id ? String(res.data.plan.id) : null;
      if (newId) {
        setLoadedPlanId(newId);
        setLoadedPlanName(res.data?.plan?.title || null);
      }
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Save draft failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to save plan. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, selectedClientId, planExercises.length, phase.name, category, goal, phaseNumber, clients, buildPlanData, currentExercisesSig, hasGeneratedHorizonPlan, fetchSavedPlans]);

  // ── Save & Make Current ── (Plan Library §5.1, no-loaded-plan path)
  // POSTs as draft, then activates. Two requests; backend invariant on activate
  // ensures any existing active plan is demoted atomically.
  const handleSaveAndActivate = useCallback(async () => {
    // AI Village CRITICAL-4 fix: a generated multi-month plan with no
    // manual planExercises is still saveable — the generatedPlan.weeks[]
    // is the source of truth in that mode.
    if (!selectedClientId || (planExercises.length === 0 && !hasGeneratedHorizonPlan)) return;
    setSaving(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      const categoryLabel = WORKOUT_CATEGORIES.find(c => c.value === category)?.label || 'Full Body';
      const res = await authAxios.post('/api/workout-plans', {
        userId: selectedClientId,
        title: `${client?.firstName || 'Client'}'s ${phase.name} Plan`,
        description: `${categoryLabel} — ${goal}`,
        nasmPhase: phaseNumber,
        status: 'draft',
        planData: buildPlanData(),
      });
      const newId = res.data?.plan?.id;
      if (!newId) throw new Error('Backend returned no plan id');
      await authAxios.put(`/api/workout-plans/${newId}/activate`);
      setStatusMsg({ type: 'success', text: 'Plan saved and made current.' });
      setSavedSnapshot(currentExercisesSig);
      setLoadedPlanId(String(newId));
      setLoadedPlanName(res.data?.plan?.title || null);
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Save & activate failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to save & activate plan.' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, selectedClientId, planExercises.length, phase.name, category, goal, phaseNumber, clients, buildPlanData, currentExercisesSig, hasGeneratedHorizonPlan, fetchSavedPlans]);

  // ── Update Loaded Plan ── (Plan Library §5.1, loaded-plan path)
  // PUT /:id with the new planData. Does NOT change activation state.
  const handleUpdateLoaded = useCallback(async () => {
    if (!selectedClientId || !loadedPlanId || (planExercises.length === 0 && !hasGeneratedHorizonPlan)) return;
    setSaving(true);
    try {
      await authAxios.put(`/api/workout-plans/${loadedPlanId}`, {
        nasmPhase: phaseNumber,
        planData: buildPlanData(),
      });
      setStatusMsg({ type: 'success', text: 'Plan updated.' });
      setSavedSnapshot(currentExercisesSig);
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Update plan failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to update plan.' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, selectedClientId, loadedPlanId, planExercises.length, phaseNumber, buildPlanData, currentExercisesSig, hasGeneratedHorizonPlan, fetchSavedPlans]);

  // ── Update & Make Current ── (Plan Library §5.1, loaded-non-current path)
  // PUT /:id then PUT /:id/activate.
  const handleUpdateAndActivate = useCallback(async () => {
    if (!selectedClientId || !loadedPlanId || (planExercises.length === 0 && !hasGeneratedHorizonPlan)) return;
    setSaving(true);
    try {
      await authAxios.put(`/api/workout-plans/${loadedPlanId}`, {
        nasmPhase: phaseNumber,
        planData: buildPlanData(),
      });
      await authAxios.put(`/api/workout-plans/${loadedPlanId}/activate`);
      setStatusMsg({ type: 'success', text: 'Plan updated and made current.' });
      setSavedSnapshot(currentExercisesSig);
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Update & activate failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to update & activate plan.' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, selectedClientId, loadedPlanId, planExercises.length, phaseNumber, buildPlanData, currentExercisesSig, hasGeneratedHorizonPlan, fetchSavedPlans]);

  // ── Plan Library card-action handlers (§5.2) ──

  // Activate (Make Current). Backend transactionally demotes siblings.
  const handleCardActivate = useCallback(async (planId: string, planName: string) => {
    if (!selectedClientId) return;
    try {
      await authAxios.put(`/api/workout-plans/${planId}/activate`);
      setStatusMsg({ type: 'success', text: `${planName} is now the current plan.` });
      // If we have this plan loaded in the builder, update savedSnapshot — the
      // builder state was identical to the activated plan's persisted state.
      if (loadedPlanId === planId) {
        setSavedSnapshot(currentExercisesSig);
      }
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Activate plan failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to make plan current. Please try again.' });
    }
  }, [authAxios, selectedClientId, loadedPlanId, currentExercisesSig, fetchSavedPlans]);

  // Rename — PUT /:id with title only; planData untouched.
  const handleCardRename = useCallback(async (planId: string, newName: string) => {
    if (!selectedClientId) return;
    try {
      await authAxios.put(`/api/workout-plans/${planId}`, { title: newName });
      setStatusMsg({ type: 'success', text: `Renamed to "${newName}".` });
      // If we have this plan loaded, update the displayed name
      if (loadedPlanId === planId) {
        setLoadedPlanName(newName);
      }
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Rename plan failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to rename plan.' });
    }
  }, [authAxios, selectedClientId, loadedPlanId, fetchSavedPlans]);

  // Duplicate — server-side clone via POST /:id/duplicate. Always status='draft'.
  const handleCardDuplicate = useCallback(async (planId: string, planName: string) => {
    if (!selectedClientId) return;
    try {
      await authAxios.post(`/api/workout-plans/${planId}/duplicate`, {});
      setStatusMsg({ type: 'success', text: `Duplicated "${planName}" as draft.` });
      fetchSavedPlans(selectedClientId);
    } catch (err) {
      logApiError('Duplicate plan failed', err);
      setStatusMsg({ type: 'error', text: 'Failed to duplicate plan.' });
    }
  }, [authAxios, selectedClientId, fetchSavedPlans]);

  // Archive — DELETE /:id (soft delete; sets status='completed').
  const handleCardArchive = useCallback((planId: string, planName: string) => {
    if (!selectedClientId) return;
    setConfirmRequest({
      title: `Archive "${planName}"?`,
      message: 'This moves the plan to the archive while keeping client history available.',
      confirmLabel: 'Archive plan',
      tone: 'warning',
      onConfirm: async () => {
        try {
          await authAxios.delete(`/api/workout-plans/${planId}`);
          setStatusMsg({ type: 'success', text: `Archived "${planName}".` });
          // If the archived plan was loaded, clear the builder's loaded reference
          // so the next save acts as a fresh draft instead of trying to PUT a
          // soft-deleted plan.
          if (loadedPlanId === planId) {
            setLoadedPlanId(null);
            setLoadedPlanName(null);
            setSavedSnapshot(null);
          }
          fetchSavedPlans(selectedClientId);
        } catch (err) {
          logApiError('Archive plan failed', err);
          setStatusMsg({ type: 'error', text: 'Failed to archive plan.' });
        }
      }
    });
  }, [authAxios, selectedClientId, loadedPlanId, fetchSavedPlans]);

  // Compute archive-blocked state per card. Per §5.4: block archive of the
  // currently-active plan when it's the ONLY active plan, to avoid leaving
  // the client with zero active plans (the strict "exactly one active" rule).
  const activePlanCount = savedPlans.filter(p => p.status === 'active').length;
  const archiveBlockedFor = useCallback((planStatus: string) =>
    planStatus === 'active' && activePlanCount <= 1,
    [activePlanCount],
  );

  // ── Fetch Saved Plans for Client ──
  // Fetch saved plans when client changes
  useEffect(() => {
    fetchSavedPlans(selectedClientId);
  }, [selectedClientId, fetchSavedPlans]);

  // (loadedPlanId / loadedPlanName / savedSnapshot / currentExercisesSig /
  // isDirty are now declared earlier in the component, before the save
  // matrix handlers, to avoid TDZ.)

  const loadPlanIntoBuilder = useCallback(async (planId: string, planName: string) => {
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

      // Build PlanExercise[] from saved structure (used for the manual
      // builder hydration AND for the manual-mode signature baseline).
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

      // Codex 2026-05-03 round-2 HIGH-2: a saved long-horizon plan must
      // restore generatedPlan state on load - otherwise Update Plan
      // would persist a flattened one-week manual-mode payload that
      // overwrites the saved 48×6 weeks[].
      //
      // Codex 2026-05-03 round-3 HIGH-3: weeks.length > 1 was too strict.
      // The 1-week trial duration ('1') generates a 1-week × N-day plan
      // through the same /api/workout-builder/plan generator, which still
      // emits planSummary + mesocycles + every L1 additive field. A
      // weeks.length === 1 save was getting falsely tagged as manual on
      // load, then collapsed to one-day on Update. The reliable "this was
      // generated" signal is the presence of `planSummary` (manual-mode
      // saves do NOT emit it - see planDataBuilder.ts manual branch),
      // optionally tightened by also requiring a populated `weeks[]`.
      const wasGenerated =
        Array.isArray(planData.weeks)
        && planData.weeks.length > 0
        && (
          planData.planSummary
          || (Array.isArray(planData.mesocycles) && planData.mesocycles.length > 0)
        );
      const restoredPlanClientId = wasGenerated
        ? resolveWorkoutPlannerPlanClientId(plan.userId, selectedClientId)
        : null;

      if (wasGenerated && restoredPlanClientId === null) {
        setGeneratedPlan(null);
        setStatusMsg({
          type: 'error',
          text: 'Unable to load generated plan because it is missing a valid client id.',
        });
        return;
      }

      setPlanExercises(hydrated);
      if (plan.nasmPhase) setPhaseNumber(plan.nasmPhase);
      if (planData.goal) setGoal(planData.goal as PlanGoal);
      if (planData.category) setCategory(planData.category as WorkoutCategory);
      setLoadedPlanId(String(planId));
      setLoadedPlanName(planName);

      if (wasGenerated) {
        // Reconstruct the generatedPlan shape from the saved JSONB. The
        // JSONB carries every L1 additive field by construction (the save
        // path uses planDataBuilder generated mode), so this is a faithful
        // rehydration.
        const restored: GeneratedPlan = {
          clientId: restoredPlanClientId!,
          clientName: planData.clientName || '',
          planSummary: planData.planSummary || {
            durationWeeks: planData.weeks.length,
            sessionsPerWeek: firstWeek?.days?.length || firstWeek?.sessions?.length || 0,
            totalSessions: 0,
            primaryGoal: planData.goal || 'general_fitness',
            startingPhase: plan.nasmPhase || 2,
          },
          mesocycles: planData.mesocycles || [],
          weeklySchedule: planData.weeklySchedule || [],
          recommendations: planData.recommendations || [],
          recommendationDetails: planData.recommendationDetails,
          rationale: planData.rationale,
          weeks: planData.weeks,
        };
        setGeneratedPlan(restored);
        // Codex 2026-05-03 round-2 MED-2: snapshot baseline must use the
        // shared signature builder so dirty-comparison shapes match. Use
        // the generated branch since we just restored a long-horizon plan.
        setSavedSnapshot(buildContentSignature({
          mode: 'generated',
          generatedPlan: restored,
          category: (planData.category as WorkoutCategory) || category,
          goal: (planData.goal as PlanGoal) || goal,
        }));
      } else {
        // Single-week / manual-mode load. Clear any stale generatedPlan
        // so the persistence path stays in manual mode for subsequent
        // saves.
        setGeneratedPlan(null);
        // MED-2: same shared-signature snapshot, manual branch.
        const categoryLabel = WORKOUT_CATEGORIES.find(c => c.value === (planData.category || category))?.label || 'Full Body';
        setSavedSnapshot(buildContentSignature({
          mode: 'manual',
          phaseName: phase.name,
          phaseNumber: plan.nasmPhase || phaseNumber,
          category: (planData.category as WorkoutCategory) || category,
          categoryLabel,
          goal: (planData.goal as PlanGoal) || goal,
          planExercises: hydrated,
        }));
      }
      setStatusMsg({ type: 'success', text: `Loaded plan: ${planName}` });
    } catch (err: unknown) {
      const errData = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (errData?.status === 404) {
        setStatusMsg({ type: 'error', text: 'Plan not found or not authorized.' });
      } else {
        setStatusMsg({ type: 'error', text: 'Failed to load plan. Please try again.' });
      }
    }
  }, [authAxios, category, goal, phase.name, phaseNumber, selectedClientId]);

  const handleLoadPlan = useCallback((planId: string, planName: string) => {
    if (isDirty) {
      setConfirmRequest({
        title: 'Discard unsaved builder changes?',
        message: `Load "${planName}" and replace the exercises currently in the builder.`,
        confirmLabel: 'Load plan',
        tone: 'warning',
        onConfirm: () => loadPlanIntoBuilder(planId, planName),
      });
      return;
    }

    void loadPlanIntoBuilder(planId, planName);
  }, [isDirty, loadPlanIntoBuilder]);

  const handleReturnToClientHub = useCallback(() => {
    if (plannerReturnTo) navigate(plannerReturnTo);
  }, [navigate, plannerReturnTo]);

  const handleTeachModeToggle = useCallback(() => {
    setTeachModeOpen(value => !value);
  }, []);

  const handleClientSelectionChange = useCallback((rawClientId: string) => {
    const nextClientId = parseWorkoutPlannerClientId(rawClientId);
    if (!nextClientId) return;
    // Codex 2026-05-03 round-3 HIGH-4: switching clients is a hard
    // reset of loaded-plan identity to prevent cross-client plan updates.
    setSelectedClientId(nextClientId);
    setPlanExercises([]);
    setGeneratedPlan(null);
    setExplanations([]);
    setLoadedPlanId(null);
    setLoadedPlanName(null);
    setSavedSnapshot(null);
  }, []);

  const handlePlanDurationChange = useCallback((nextDuration: PlanDuration) => {
    setPlanDuration(nextDuration);
    setGeneratedPlan(null);
    setPlanExercises([]);
  }, []);

  const handleDuplicateLoadedPlan = useCallback(() => {
    if (!loadedPlanId) return;
    handleCardDuplicate(loadedPlanId, loadedPlanName || 'plan');
  }, [handleCardDuplicate, loadedPlanId, loadedPlanName]);

  const handleBrowseAddExercise = useCallback(() => {
    clearSearchForBrowse();
  }, [clearSearchForBrowse]);

  const handleToggleExplanations = useCallback(() => {
    setShowExplanations(value => !value);
  }, []);

  return (
    <Page>
      <WorkoutPlannerCommandPanel
        plannerReturnTo={plannerReturnTo}
        teachModeOpen={teachModeOpen}
        clients={clients}
        clientsLoading={clientsLoading}
        selectedClientId={selectedClientId}
        selectedClient={selectedClient}
        phaseNumber={phaseNumber}
        category={category}
        goal={goal}
        planDuration={planDuration}
        sessionsPerWeek={sessionsPerWeek}
        generating={generating}
        generatingPlan={generatingPlan}
        clientGenBlocked={clientGenBlocked}
        clientSelfGenStatus={clientSelfGenStatus}
        isViewerClient={isViewerClient}
        onReturnToClientHub={handleReturnToClientHub}
        onTeachModeToggle={handleTeachModeToggle}
        onClientSelectionChange={handleClientSelectionChange}
        onPhaseNumberChange={setPhaseNumber}
        onCategoryChange={setCategory}
        onGoalChange={setGoal}
        onPlanDurationChange={handlePlanDurationChange}
        onSessionsPerWeekChange={setSessionsPerWeek}
        onGenerateSingle={handleAIGenerate}
        onGeneratePlan={handleGeneratePlan}
      />

      <WorkoutPlannerStatusAssistantStrip
        statusMsg={statusMsg}
        plannerReturnTo={plannerReturnTo}
        selectedClientId={selectedClientId}
        degradedIntelligence={degradedIntelligence}
        hasPlanExercises={planExercises.length > 0}
        onReturnToClientHub={handleReturnToClientHub}
        onDismissStatus={() => setStatusMsg(null)}
      />

      {/* Three-Panel Layout */}
      <ThreePanel $teachModeOpen={teachModeOpen}>
        <WorkoutPlannerRolodexPanel
          filteredExerciseCount={filteredExerciseCount}
          exercisesLoading={exercisesLoading}
          searchQuery={searchQuery}
          filterCategory={filterCategory}
          sourceFilter={sourceFilter}
          exerciseTypeFilter={exerciseTypeFilter}
          equipmentFilter={equipmentFilter}
          impactFilter={impactFilter}
          exerciseRowRenderer={exerciseRowRenderer}
          onSearchQueryChange={setSearchQuery}
          onFilterCategoryChange={setFilterCategory}
          onSourceFilterChange={setSourceFilter}
          onExerciseTypeFilterChange={setExerciseTypeFilter}
          onEquipmentFilterChange={setEquipmentFilter}
          onImpactFilterChange={setImpactFilter}
        />
        {/* Center: Workout Builder */}
        <WorkoutPlannerBuilderPanel
          degradedIntelligence={degradedIntelligence}
          saving={saving}
          planExercises={planExercises}
          hasGeneratedHorizonPlan={hasGeneratedHorizonPlan}
          loadedPlanId={loadedPlanId}
          savedPlans={savedPlans}
          isDirty={isDirty}
          generating={generating}
          phase={phase}
          explanations={explanations}
          showExplanations={showExplanations}
          onSaveDraft={handleSaveDraft}
          onSaveAndActivate={handleSaveAndActivate}
          onUpdateLoaded={handleUpdateLoaded}
          onUpdateAndActivate={handleUpdateAndActivate}
          onDuplicateLoadedPlan={handleDuplicateLoadedPlan}
          onSelectExercise={setSelectedExercise}
          onUpdateExercise={updateExercise}
          onRemoveExercise={removeExercise}
          onBrowseAddExercise={handleBrowseAddExercise}
          onToggleExplanations={handleToggleExplanations}
        />

        {/* Right: Teach Mode (conditional) */}
        {teachModeOpen && (
          <TeachModeSidebar
            exercise={selectedExercise}
            phaseNumber={phaseNumber}
            onPhaseChange={setPhaseNumber}
          />
        )}
      </ThreePanel>

      <WorkoutPlannerGeneratedPlanSection
        generatedPlan={generatedPlan}
        selectedMesoDay={selectedMesoDay}
        phaseNumber={phaseNumber}
        selectedClient={selectedClient}
        onSelectedMesoDayChange={setSelectedMesoDay}
        onPhaseNumberChange={setPhaseNumber}
      />
      <WorkoutPlannerSavedPlansSection
        selectedClientId={selectedClientId}
        savedPlans={savedPlans}
        savedPlansLoading={savedPlansLoading}
        loadedPlanId={loadedPlanId}
        archiveBlockedFor={archiveBlockedFor}
        onLoad={handleLoadPlan}
        onActivate={handleCardActivate}
        onRename={handleCardRename}
        onDuplicate={handleCardDuplicate}
        onArchive={handleCardArchive}
      />
      <WorkoutPlannerConfirmDialog
        request={confirmRequest}
        onClose={closeConfirmDialog}
      />
    </Page>
  );
};

export default WorkoutPlannerPage;
