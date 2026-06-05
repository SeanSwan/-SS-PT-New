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
import WorkoutPlannerRolodexPanel from './WorkoutPlannerRolodexPanel';
import WorkoutPlannerCommandPanel from './WorkoutPlannerCommandPanel';
import WorkoutPlannerBuilderPanel from './WorkoutPlannerBuilderPanel';
import WorkoutPlannerGeneratedPlanSection from './WorkoutPlannerGeneratedPlanSection';
import WorkoutPlannerSavedPlansSection from './WorkoutPlannerSavedPlansSection';
import WorkoutPlannerStatusAssistantStrip, {
  type WorkoutPlannerStatusMessage,
} from './WorkoutPlannerStatusAssistantStrip';
import { useWorkoutPlannerGenerationActions } from './useWorkoutPlannerGenerationActions';
import { useWorkoutPlannerPlanContentState } from './useWorkoutPlannerPlanContentState';
import { useWorkoutPlannerRolodexState } from './useWorkoutPlannerRolodexState';
import { useWorkoutPlannerLoadPlanActions } from './useWorkoutPlannerLoadPlanActions';
import { useWorkoutPlannerSaveActions } from './useWorkoutPlannerSaveActions';
import { useWorkoutPlannerSavedPlansState } from './useWorkoutPlannerSavedPlansState';
import WorkoutPlannerConfirmDialog, { type WorkoutPlannerConfirmRequest } from './WorkoutPlannerConfirmDialog';
import {
  normalizeWorkoutPlannerClients,
  parseWorkoutPlannerClientId,
  pickWorkoutPlannerClientId,
} from './WorkoutPlannerClientIdentity';

import {
  type PlanExercise, type PlannerClient, type WorkoutCategory,
  type GeneratedPlan, type PlanDuration,
  OPT_PHASES,
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
  const [selectedMesoDay, setSelectedMesoDay] = useState(1);

  // ── UI State ──
  const [teachModeOpen, setTeachModeOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<WorkoutPlannerStatusMessage | null>(null);

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

  const {
    loadedPlanId,
    loadedPlanName,
    categoryLabel,
    hasGeneratedHorizonPlan,
    currentExercisesSig,
    isDirty,
    buildPlanData,
    buildGeneratedSnapshot,
    buildManualSnapshot,
    setLoadedPlanId,
    setLoadedPlanName,
    setSavedSnapshot,
    resetLoadedPlanState,
  } = useWorkoutPlannerPlanContentState({
    phase,
    phaseNumber,
    category,
    goal,
    planExercises,
    generatedPlan,
  });

  const {
    savedPlans,
    savedPlansLoading,
    fetchSavedPlans,
    archiveBlockedFor,
    handleCardActivate,
    handleCardRename,
    handleCardDuplicate,
    handleCardArchive,
  } = useWorkoutPlannerSavedPlansState({
    authAxios,
    selectedClientId,
    loadedPlanId,
    currentExercisesSig,
    setSavedSnapshot,
    setLoadedPlanName,
    resetLoadedPlanState,
    setStatusMsg,
    setConfirmRequest,
  });

  const {
    saving,
    handleSaveDraft,
    handleSaveAndActivate,
    handleUpdateLoaded,
    handleUpdateAndActivate,
  } = useWorkoutPlannerSaveActions({
    authAxios,
    selectedClientId,
    planExercisesLength: planExercises.length,
    hasGeneratedHorizonPlan,
    loadedPlanId,
    phaseName: phase.name,
    phaseNumber,
    categoryLabel,
    goal,
    clients,
    buildPlanData,
    currentExercisesSig,
    fetchSavedPlans,
    setSavedSnapshot,
    setLoadedPlanId,
    setLoadedPlanName,
    setStatusMsg,
  });

  const { loadPlanIntoBuilder } = useWorkoutPlannerLoadPlanActions({
    authAxios,
    selectedClientId,
    phaseName: phase.name,
    phaseNumber,
    category,
    goal,
    buildGeneratedSnapshot,
    buildManualSnapshot,
    setPlanExercises,
    setGeneratedPlan,
    setPhaseNumber,
    setGoal,
    setCategory,
    setLoadedPlanId,
    setLoadedPlanName,
    setSavedSnapshot,
    setStatusMsg,
  });

  const {
    generating,
    generatingPlan,
    degradedIntelligence,
    explanations,
    showExplanations,
    clearExplanations,
    handleAIGenerate,
    handleGeneratePlan,
    handleToggleExplanations,
  } = useWorkoutPlannerGenerationActions({
    authAxios,
    selectedClientId,
    category,
    goal,
    phaseNumber,
    planDuration,
    sessionsPerWeek,
    setPlanExercises,
    setGeneratedPlan,
    setPhaseNumber,
    setStatusMsg,
    resetLoadedPlanState,
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
    clearExplanations();
    resetLoadedPlanState();
  }, [clearExplanations, resetLoadedPlanState]);

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
