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

import React, { useState, useCallback, useMemo } from 'react';
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
import { useWorkoutPlannerClientState } from './useWorkoutPlannerClientState';
import { useWorkoutPlannerGenerationActions } from './useWorkoutPlannerGenerationActions';
import { useWorkoutPlannerPlanContentState } from './useWorkoutPlannerPlanContentState';
import { useWorkoutPlannerRolodexState } from './useWorkoutPlannerRolodexState';
import { useWorkoutPlannerLoadPlanActions } from './useWorkoutPlannerLoadPlanActions';
import { useWorkoutPlannerSaveActions } from './useWorkoutPlannerSaveActions';
import { useWorkoutPlannerSavedPlansState } from './useWorkoutPlannerSavedPlansState';
import WorkoutPlannerConfirmDialog, { type WorkoutPlannerConfirmRequest } from './WorkoutPlannerConfirmDialog';
import { parseWorkoutPlannerClientId } from './WorkoutPlannerClientIdentity';

import {
  type PlanExercise, type WorkoutCategory,
  type GeneratedPlan, type PlanDuration,
  OPT_PHASES,
  type PlanGoal,
} from './WorkoutPlannerTypes';
import { Page, ThreePanel } from './WorkoutPlannerStyles';

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

  const {
    clients,
    selectedClientId,
    clientsLoading,
    selectedClient,
    clientSelfGenStatus,
    isViewerClient,
    clientGenBlocked,
    handleClientSelectionChange,
  } = useWorkoutPlannerClientState({
    authAxios,
    user,
    requestedClientId,
    setPlanExercises,
    setGeneratedPlan,
    clearExplanations,
    resetLoadedPlanState,
  });

  const requestAIGenerateForSelectedClient = useCallback(() => {
    void handleAIGenerate(selectedClientId);
  }, [handleAIGenerate, selectedClientId]);

  const requestPlanGenerateForSelectedClient = useCallback(() => {
    void handleGeneratePlan(selectedClientId);
  }, [handleGeneratePlan, selectedClientId]);

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
        onGenerateSingle={requestAIGenerateForSelectedClient}
        onGeneratePlan={requestPlanGenerateForSelectedClient}
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
